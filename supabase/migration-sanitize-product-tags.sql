-- 移除舊版材質標籤（粉晶、黃水晶等），只保留功效 + 水晶色
UPDATE products
SET tags = (
  SELECT COALESCE(array_agg(tag ORDER BY tag), '{}')
  FROM unnest(tags) AS tag
  WHERE tag IN (
    '財運', '事業', '人緣', '情感', '舒緩', '守護', '智慧', '靈性',
    '紅', '橙', '黃', '綠', '藍', '紫', '黑', '白'
  )
)
WHERE tags && ARRAY[
  '招財', '鈦晶', '黃水晶', '粉晶', '紫鋰輝', '桃花',
  '紫水晶', '白水晶', '黑曜石', '虎眼石', '黑碧玺', '黑碧璽'
]::text[];
