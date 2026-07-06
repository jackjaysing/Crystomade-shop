import { useState } from 'react'
import { ENERGY_CONTRACT_TEXT, ENERGY_CONTRACT_TITLE } from '../../constants/grimoire'

interface EnergyContractPanelProps {
  signerName?: string
  busy?: boolean
  intro?: string
  signButtonLabel?: string
  onSign: () => Promise<void>
}

/** 數位能量契約簽署 */
export function EnergyContractPanel({
  signerName,
  busy = false,
  intro,
  signButtonLabel = '以指尖輕觸符文，完成簽署',
  onSign,
}: EnergyContractPanelProps) {
  const [agreed, setAgreed] = useState(false)
  const [signing, setSigning] = useState(false)
  const [inkVisible, setInkVisible] = useState(false)

  const handleSign = async () => {
    if (!agreed || busy || signing) return
    setSigning(true)
    setInkVisible(true)
    await new Promise((r) => window.setTimeout(r, 900))
    try {
      await onSign()
    } finally {
      setSigning(false)
    }
  }

  return (
    <div className="magic-contract">
      <p className="magic-contract-eyebrow">CHAPTER I · 締結</p>
      <h3 className="magic-contract-title magic-foil-heading">{ENERGY_CONTRACT_TITLE}</h3>
      {intro && <p className="magic-contract-intro">{intro}</p>}
      <div className="magic-contract-body">
        <p className="magic-contract-text">{ENERGY_CONTRACT_TEXT}</p>
        <label className="magic-contract-check">
          <input
            type="checkbox"
            checked={agreed}
            disabled={busy || signing}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span>我已閱讀並願以誠意守護這份連結</span>
        </label>
      </div>
      <div className="magic-contract-signature">
        <p className="magic-contract-sign-label">契約人</p>
        <p
          className={`magic-contract-sign-name ${inkVisible ? 'magic-contract-ink' : ''}`}
        >
          {signerName?.trim() || '　　　　　　'}
        </p>
      </div>
      <button
        type="button"
        disabled={!agreed || busy || signing}
        onClick={() => void handleSign()}
        className="magic-contract-button"
      >
        {signing ? '符文烙印中…' : signButtonLabel}
      </button>
    </div>
  )
}
