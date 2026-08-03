-- 修復：軟刪除訂單必須退還／收回點數，並寫入「訂單已刪除」點數紀錄
-- 原因：migration-grimoire-delete-order-removes-card.sql 曾覆寫 soft_delete_order_group，
--       拿掉點數處理，導致點數紀錄只剩原本的「消費贈送 +N」，沒有「訂單已刪除 -N」
-- 於 Supabase SQL Editor 執行（可重複執行）

CREATE OR REPLACE FUNCTION soft_delete_order_group(p_order_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
  v_group RECORD;
  v_user_id UUID;
  v_checkout_id UUID;
  v_order_number TEXT;
  v_award_key TEXT;
  v_refund_spent INTEGER;
  v_clawback INTEGER;
  v_referral_clawback INTEGER;
  v_balance INTEGER;
  v_active_left INTEGER;
  v_order_label TEXT;
BEGIN
  IF p_order_ids IS NULL OR array_length(p_order_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- ------------------------------------------------------------
  -- 先依結帳批次處理點數（整批刪完才退／扣）
  -- ------------------------------------------------------------
  FOR v_group IN
    SELECT DISTINCT
      o.user_id,
      o.checkout_id,
      NULLIF(trim(o.order_number), '') AS order_number
    FROM orders o
    WHERE o.id = ANY(p_order_ids)
      AND o.deleted_at IS NULL
      AND o.user_id IS NOT NULL
  LOOP
    v_user_id := v_group.user_id;
    v_checkout_id := v_group.checkout_id;
    v_order_number := v_group.order_number;
    v_award_key := COALESCE(v_checkout_id::text, v_order_number);
    IF v_award_key IS NULL THEN
      CONTINUE;
    END IF;

    v_order_label := COALESCE(v_order_number, left(v_award_key, 8));

    IF v_checkout_id IS NOT NULL THEN
      SELECT COUNT(*)::INTEGER INTO v_active_left
      FROM orders o
      WHERE o.checkout_id = v_checkout_id
        AND o.deleted_at IS NULL
        AND NOT (o.id = ANY(p_order_ids));
    ELSE
      SELECT COUNT(*)::INTEGER INTO v_active_left
      FROM orders o
      WHERE o.order_number = v_order_number
        AND o.deleted_at IS NULL
        AND NOT (o.id = ANY(p_order_ids));
    END IF;

    IF v_active_left > 0 THEN
      SELECT COALESCE(SUM(COALESCE(o.redemption_points, 0)), 0)::INTEGER
      INTO v_refund_spent
      FROM orders o
      WHERE o.id = ANY(p_order_ids)
        AND o.deleted_at IS NULL
        AND o.user_id = v_user_id
        AND (
          (v_checkout_id IS NOT NULL AND o.checkout_id = v_checkout_id)
          OR (v_checkout_id IS NULL AND NULLIF(trim(o.order_number), '') = v_order_number)
        );

      IF v_refund_spent > 0 THEN
        UPDATE member_profiles
        SET points = points + v_refund_spent, updated_at = now()
        WHERE id = v_user_id
        RETURNING points INTO v_balance;

        INSERT INTO points_history (user_id, delta, balance_after, description, checkout_id, order_number)
        VALUES (
          v_user_id,
          v_refund_spent,
          v_balance,
          '訂單已刪除 ' || v_order_label || '，退還兌換點數 +' || v_refund_spent::text || ' 點',
          v_checkout_id,
          v_order_number
        );
      END IF;

      CONTINUE;
    END IF;

    SELECT
      COALESCE(SUM(COALESCE(o.checkout_points_discount, 0)), 0)::INTEGER
        + COALESCE(SUM(COALESCE(o.redemption_points, 0)), 0)::INTEGER
    INTO v_refund_spent
    FROM orders o
    WHERE o.deleted_at IS NULL
      AND o.user_id = v_user_id
      AND (
        (v_checkout_id IS NOT NULL AND o.checkout_id = v_checkout_id)
        OR (v_checkout_id IS NULL AND NULLIF(trim(o.order_number), '') = v_order_number)
      );

    SELECT COALESCE(pa.points, 0)::INTEGER
    INTO v_clawback
    FROM point_awards pa
    WHERE pa.award_key = v_award_key
      AND pa.user_id = v_user_id;

    v_clawback := COALESCE(v_clawback, 0);

    SELECT COALESCE(SUM(ra.points), 0)::INTEGER
    INTO v_referral_clawback
    FROM referral_awards ra
    WHERE ra.referred_user_id = v_user_id
      AND (
        (v_checkout_id IS NOT NULL AND ra.checkout_id = v_checkout_id)
        OR (
          v_checkout_id IS NULL
          AND v_order_number IS NOT NULL
          AND ra.order_number = v_order_number
        )
      );

    PERFORM 1 FROM member_profiles WHERE id = v_user_id FOR UPDATE;

    IF v_refund_spent > 0 THEN
      UPDATE member_profiles
      SET points = points + v_refund_spent, updated_at = now()
      WHERE id = v_user_id
      RETURNING points INTO v_balance;

      INSERT INTO points_history (user_id, delta, balance_after, description, checkout_id, order_number)
      VALUES (
        v_user_id,
        v_refund_spent,
        v_balance,
        '訂單已刪除 ' || v_order_label || '，退還點數 +' || v_refund_spent::text || ' 點（折抵／兌換）',
        v_checkout_id,
        v_order_number
      );
    END IF;

    IF v_clawback > 0 THEN
      UPDATE member_profiles
      SET points = GREATEST(0, points - v_clawback), updated_at = now()
      WHERE id = v_user_id
      RETURNING points INTO v_balance;

      INSERT INTO points_history (user_id, delta, balance_after, description, checkout_id, order_number)
      VALUES (
        v_user_id,
        -v_clawback,
        v_balance,
        '訂單已刪除 ' || v_order_label || '，收回消費贈點 -' || v_clawback::text || ' 點',
        v_checkout_id,
        v_order_number
      );

      UPDATE points_history
      SET description = CASE
        WHEN description LIKE '%（訂單已刪除）%' THEN description
        ELSE description || '（訂單已刪除）'
      END
      WHERE user_id = v_user_id
        AND delta > 0
        AND description LIKE '%消費贈送%'
        AND (
          (v_checkout_id IS NOT NULL AND checkout_id = v_checkout_id)
          OR (
            v_checkout_id IS NULL
            AND v_order_number IS NOT NULL
            AND order_number = v_order_number
          )
        );

      DELETE FROM point_awards
      WHERE award_key = v_award_key
        AND user_id = v_user_id;
    END IF;

    IF v_referral_clawback > 0 THEN
      FOR r IN
        SELECT ra.id, ra.referrer_user_id, ra.points
        FROM referral_awards ra
        WHERE ra.referred_user_id = v_user_id
          AND (
            (v_checkout_id IS NOT NULL AND ra.checkout_id = v_checkout_id)
            OR (
              v_checkout_id IS NULL
              AND v_order_number IS NOT NULL
              AND ra.order_number = v_order_number
            )
          )
      LOOP
        UPDATE member_profiles
        SET points = GREATEST(0, points - r.points), updated_at = now()
        WHERE id = r.referrer_user_id
        RETURNING points INTO v_balance;

        INSERT INTO points_history (user_id, delta, balance_after, description, checkout_id, order_number)
        VALUES (
          r.referrer_user_id,
          -r.points,
          v_balance,
          '訂單已刪除 ' || v_order_label || '，收回推薦獎勵 -' || r.points::text || ' 點',
          v_checkout_id,
          v_order_number
        );

        DELETE FROM referral_awards WHERE id = r.id;
      END LOOP;
    END IF;
  END LOOP;

  -- ------------------------------------------------------------
  -- 軟刪訂單本體 + 魔導書 + 庫存
  -- ------------------------------------------------------------
  FOR r IN
    SELECT
      id,
      product_id,
      variant_id,
      status,
      deleted_at,
      point_product_id,
      COALESCE(is_point_redemption, false) AS is_point_redemption
    FROM orders
    WHERE id = ANY(p_order_ids)
    ORDER BY id
    FOR UPDATE
  LOOP
    IF r.deleted_at IS NOT NULL THEN
      CONTINUE;
    END IF;

    DELETE FROM crystal_soul_cards WHERE order_id = r.id;

    IF r.is_point_redemption AND r.point_product_id IS NOT NULL THEN
      UPDATE point_products
      SET stock = stock + 1, updated_at = now()
      WHERE id = r.point_product_id;
    END IF;

    IF r.status = 'pending'::order_status THEN
      IF r.product_id IS NOT NULL AND NOT r.is_point_redemption THEN
        IF to_regprocedure('public.increment_product_purchase_stock(uuid,uuid)') IS NOT NULL THEN
          PERFORM increment_product_purchase_stock(r.product_id, r.variant_id);
        ELSE
          UPDATE products
          SET
            stock = stock + 1,
            status = CASE
              WHEN stock + 1 > 0 THEN 'available'::product_status
              ELSE status
            END
          WHERE id = r.product_id;
        END IF;
      END IF;

      UPDATE orders
      SET
        deleted_from_status = r.status,
        status = 'cancelled'::order_status,
        deleted_at = now()
      WHERE id = r.id;
    ELSE
      UPDATE orders
      SET
        deleted_from_status = r.status,
        deleted_at = now()
      WHERE id = r.id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION '沒有可刪除的訂單（可能已刪除）';
  END IF;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_order_group(UUID[]) TO anon, authenticated;

COMMENT ON FUNCTION soft_delete_order_group IS
  '後台軟刪除訂單：退還折抵／兌換點數、收回贈點並寫入「訂單已刪除」點數紀錄、移除魔導書、還庫存';

-- ------------------------------------------------------------
-- 回補：已刪訂單仍留在 point_awards 的消費贈點
-- ------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_checkout_id UUID;
  v_order_number TEXT;
  v_active_left INTEGER;
  v_deleted_count INTEGER;
  v_balance INTEGER;
  v_order_label TEXT;
  v_refund_spent INTEGER;
  v_has_delete_history BOOLEAN;
BEGIN
  FOR r IN
    SELECT pa.user_id, pa.award_key, pa.points
    FROM point_awards pa
  LOOP
    v_checkout_id := NULL;
    v_order_number := NULL;

    BEGIN
      v_checkout_id := r.award_key::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        v_checkout_id := NULL;
        v_order_number := NULLIF(trim(r.award_key), '');
    END;

    IF v_checkout_id IS NOT NULL THEN
      SELECT
        COUNT(*) FILTER (WHERE o.deleted_at IS NULL)::INTEGER,
        COUNT(*) FILTER (WHERE o.deleted_at IS NOT NULL)::INTEGER
      INTO v_active_left, v_deleted_count
      FROM orders o
      WHERE o.checkout_id = v_checkout_id
        AND o.user_id = r.user_id;

      SELECT COALESCE(NULLIF(trim(o.order_number), ''), left(v_checkout_id::text, 8))
      INTO v_order_label
      FROM orders o
      WHERE o.checkout_id = v_checkout_id
      ORDER BY o.created_at
      LIMIT 1;
    ELSIF v_order_number IS NOT NULL THEN
      SELECT
        COUNT(*) FILTER (WHERE o.deleted_at IS NULL)::INTEGER,
        COUNT(*) FILTER (WHERE o.deleted_at IS NOT NULL)::INTEGER
      INTO v_active_left, v_deleted_count
      FROM orders o
      WHERE o.order_number = v_order_number
        AND o.user_id = r.user_id;

      v_order_label := v_order_number;
    ELSE
      CONTINUE;
    END IF;

    IF COALESCE(v_active_left, 0) > 0 OR COALESCE(v_deleted_count, 0) = 0 THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM points_history h
      WHERE h.user_id = r.user_id
        AND h.delta < 0
        AND (
          h.description LIKE '訂單已刪除%'
          OR h.description LIKE '訂單刪除%'
        )
        AND (
          (v_checkout_id IS NOT NULL AND h.checkout_id = v_checkout_id)
          OR (v_order_number IS NOT NULL AND h.order_number = v_order_number)
        )
    )
    INTO v_has_delete_history;

    IF v_has_delete_history THEN
      DELETE FROM point_awards
      WHERE user_id = r.user_id
        AND award_key = r.award_key;
      CONTINUE;
    END IF;

    UPDATE member_profiles
    SET points = GREATEST(0, points - r.points), updated_at = now()
    WHERE id = r.user_id
    RETURNING points INTO v_balance;

    INSERT INTO points_history (user_id, delta, balance_after, description, checkout_id, order_number)
    VALUES (
      r.user_id,
      -r.points,
      v_balance,
      '訂單已刪除 ' || COALESCE(v_order_label, left(r.award_key, 8))
        || '，收回消費贈點 -' || r.points::text || ' 點',
      v_checkout_id,
      v_order_number
    );

    UPDATE points_history
    SET description = CASE
      WHEN description LIKE '%（訂單已刪除）%' THEN description
      ELSE description || '（訂單已刪除）'
    END
    WHERE user_id = r.user_id
      AND delta > 0
      AND description LIKE '%消費贈送%'
      AND (
        (v_checkout_id IS NOT NULL AND checkout_id = v_checkout_id)
        OR (v_order_number IS NOT NULL AND order_number = v_order_number)
      );

    DELETE FROM point_awards
    WHERE user_id = r.user_id
      AND award_key = r.award_key;
  END LOOP;

  -- 回補：已整批刪除但未退還的折抵／兌換點
  FOR r IN
    SELECT
      o.user_id,
      o.checkout_id,
      NULLIF(trim(o.order_number), '') AS order_number,
      SUM(COALESCE(o.checkout_points_discount, 0) + COALESCE(o.redemption_points, 0))::INTEGER AS refund_spent
    FROM orders o
    WHERE o.deleted_at IS NOT NULL
      AND o.user_id IS NOT NULL
    GROUP BY o.user_id, o.checkout_id, NULLIF(trim(o.order_number), '')
    HAVING SUM(COALESCE(o.checkout_points_discount, 0) + COALESCE(o.redemption_points, 0)) > 0
  LOOP
    IF r.checkout_id IS NOT NULL THEN
      SELECT COUNT(*)::INTEGER INTO v_active_left
      FROM orders o
      WHERE o.checkout_id = r.checkout_id
        AND o.deleted_at IS NULL;
    ELSE
      SELECT COUNT(*)::INTEGER INTO v_active_left
      FROM orders o
      WHERE o.order_number = r.order_number
        AND o.deleted_at IS NULL;
    END IF;

    IF v_active_left > 0 THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM points_history h
      WHERE h.user_id = r.user_id
        AND h.delta > 0
        AND (
          h.description LIKE '訂單已刪除%退還%'
          OR h.description LIKE '訂單刪除%退還%'
        )
        AND (
          (r.checkout_id IS NOT NULL AND h.checkout_id = r.checkout_id)
          OR (r.order_number IS NOT NULL AND h.order_number = r.order_number)
        )
    )
    INTO v_has_delete_history;

    IF v_has_delete_history THEN
      CONTINUE;
    END IF;

    v_refund_spent := r.refund_spent;
    v_order_label := COALESCE(r.order_number, left(COALESCE(r.checkout_id::text, 'order'), 8));

    UPDATE member_profiles
    SET points = points + v_refund_spent, updated_at = now()
    WHERE id = r.user_id
    RETURNING points INTO v_balance;

    INSERT INTO points_history (user_id, delta, balance_after, description, checkout_id, order_number)
    VALUES (
      r.user_id,
      v_refund_spent,
      v_balance,
      '訂單已刪除 ' || v_order_label || '，退還點數 +' || v_refund_spent::text || ' 點（折抵／兌換）',
      r.checkout_id,
      r.order_number
    );
  END LOOP;
END;
$$;
