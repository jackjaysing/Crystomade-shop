interface RaffleListedCodeProps {
  code: string
}

/** 抽獎上架編號（顯示於禮物名稱上方） */
export function RaffleListedCode({ code }: RaffleListedCodeProps) {
  return (
    <p className="text-base font-medium tracking-wide text-amber-glow tabular-nums sm:text-lg">
      {code}
    </p>
  )
}
