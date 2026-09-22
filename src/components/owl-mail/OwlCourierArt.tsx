/** 神秘魔法信使：飛向鏡頭的白貓頭鷹（透明底） */
export function OwlCourierArt({ className = '' }: { className?: string }) {
  return (
    <img
      src="/owl-mail/owl-courier.png"
      alt=""
      aria-hidden
      draggable={false}
      className={`pointer-events-none select-none object-contain ${className}`}
    />
  )
}
