/** 卷軸圖示（簡潔線條，對齊抽獎 FAB；斜放捲軸＋綁繩＋封印） */
export function ScrollLetterIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="rotate(-28 12 12)">
        {/* 捲軸身 */}
        <rect
          x="4"
          y="8.25"
          width="16"
          height="7.5"
          rx="3.75"
          fill="currentColor"
          fillOpacity="0.2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        {/* 左端剖面（螺旋感） */}
        <ellipse
          cx="4.6"
          cy="12"
          rx="2"
          ry="3.75"
          fill="currentColor"
          fillOpacity="0.12"
          stroke="currentColor"
          strokeWidth="1.45"
        />
        <path
          d="M4.55 9.6c.7.25 1.1 1 1.05 1.85M4.5 12.15c.65.2 1 .9.9 1.7"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
        />
        {/* 右端收口 */}
        <ellipse
          cx="19.5"
          cy="12"
          rx="1.55"
          ry="3.75"
          fill="currentColor"
          fillOpacity="0.25"
          stroke="currentColor"
          strokeWidth="1.45"
        />
        {/* 綁繩 */}
        <path
          d="M10.2 8.4v7.2M13.8 8.4v7.2"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        {/* 封印 */}
        <circle
          cx="12"
          cy="12"
          r="2.4"
          fill="currentColor"
          fillOpacity="0.42"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <circle cx="12" cy="12" r="0.75" fill="currentColor" />
      </g>
    </svg>
  )
}
