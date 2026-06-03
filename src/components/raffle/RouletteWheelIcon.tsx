/** 輪盤圖示（抽獎入口） */
export function RouletteWheelIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path
        d="M12 2v10M12 12l8.66-5M12 12L3.34 7M12 12l8.66 5M12 12L3.34 17"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M12 2 A10 10 0 0 1 20.66 7 L12 12 Z"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <path
        d="M12 12 L20.66 7 A10 10 0 0 1 20.66 17 Z"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <path
        d="M12 12 L20.66 17 A10 10 0 0 1 3.34 17 Z"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <path
        d="M12 12 L3.34 17 A10 10 0 0 1 3.34 7 Z"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path
        d="M12 12 L3.34 7 A10 10 0 0 1 12 2 Z"
        fill="currentColor"
        fillOpacity="0.25"
      />
    </svg>
  )
}
