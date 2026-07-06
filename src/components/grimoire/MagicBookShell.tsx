import type { ReactNode } from 'react'
import type { CrystalMagicStatus } from '../../constants/grimoire'

interface MagicBookShellProps {
  children: ReactNode
  title?: string
  subtitle?: string
  tier?: CrystalMagicStatus
  className?: string
}

/** 魔法書外框：深色燙金身分證（階級越高視覺越華麗） */
export function MagicBookShell({
  children,
  title,
  subtitle,
  tier = 'dormant',
  className = '',
}: MagicBookShellProps) {
  return (
    <div className={`magic-book-outer magic-book-outer--tier-${tier} ${className}`}>
      <div className="magic-book-aura" aria-hidden />
      {tier === 'resonating' && (
        <>
          <div className="magic-book-particles" aria-hidden />
          <div className="magic-book-crown" aria-hidden>✧</div>
        </>
      )}
      <div className="magic-book-spine" aria-hidden />
      <div className="magic-book-cover">
        <div className="magic-book-foil-border" aria-hidden />
        {(title || subtitle) && (
          <header className="magic-book-cover-header">
            <p className="magic-id-ribbon">
              <span className="magic-foil-ribbon">水晶魔法身分證</span>
            </p>
            {subtitle && (
              <p className={`magic-book-eyebrow ${!title ? 'magic-foil-heading magic-book-eyebrow--prominent' : ''}`}>
                {subtitle}
              </p>
            )}
            {title && <h2 className="magic-book-cover-title magic-foil-heading">{title}</h2>}
          </header>
        )}
        {!title && !subtitle && (
          <header className="magic-book-cover-header magic-book-cover-header--solo">
            <p className="magic-id-ribbon">
              <span className="magic-foil-ribbon">水晶魔法身分證</span>
            </p>
          </header>
        )}
        <div className="magic-book-page">{children}</div>
        <div className="magic-book-corner magic-book-corner-tl" aria-hidden>✦</div>
        <div className="magic-book-corner magic-book-corner-tr" aria-hidden>✦</div>
        <div className="magic-book-corner magic-book-corner-bl" aria-hidden>⟡</div>
        <div className="magic-book-corner magic-book-corner-br" aria-hidden>⟡</div>
      </div>
    </div>
  )
}
