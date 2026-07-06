import { useEffect, useRef, useState, type CSSProperties } from 'react'

interface SealUnlockOverlayProps {
  elementPrimary: string
  onComplete: () => void
}

const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ']

/** 封印解鎖：水晶光暈散開、符文閃爍 */
export function SealUnlockOverlay({ elementPrimary, onComplete }: SealUnlockOverlayProps) {
  const [phase, setPhase] = useState<'sealed' | 'breaking' | 'done'>('sealed')
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const breakTimer = window.setTimeout(() => setPhase('breaking'), 600)
    const doneTimer = window.setTimeout(() => {
      setPhase('done')
      onCompleteRef.current()
    }, 3200)
    return () => {
      window.clearTimeout(breakTimer)
      window.clearTimeout(doneTimer)
    }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      className={`magic-seal-overlay ${phase === 'breaking' ? 'magic-seal-breaking' : ''}`}
      role="presentation"
      onClick={() => {
        if (phase === 'sealed') setPhase('breaking')
      }}
    >
      <div className="magic-seal-glow" />
      <div className="magic-seal-ring magic-seal-ring-1" />
      <div className="magic-seal-ring magic-seal-ring-2" />
      <div className="magic-seal-crystal">
        <span className="magic-seal-element">{elementPrimary}</span>
      </div>
      <div className="magic-seal-runes" aria-hidden>
        {RUNES.map((rune, i) => (
          <span
            key={rune}
            className="magic-seal-rune"
            style={{ '--rune-i': i } as CSSProperties}
          >
            {rune}
          </span>
        ))}
      </div>
      <p className="magic-seal-caption">
        {phase === 'sealed' ? '古老封印守護中…' : '封印解除，魔導書正在開啟…'}
      </p>
      {phase === 'sealed' && (
        <p className="magic-seal-hint">輕觸以感應水晶</p>
      )}
    </div>
  )
}
