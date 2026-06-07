let audioContext: AudioContext | null = null

/** 短促提示音（後台新消息） */
export function playAdminNotificationSound() {
  try {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    if (!audioContext) audioContext = new Ctx()
    if (audioContext.state === 'suspended') {
      void audioContext.resume()
    }

    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.value = 0.0001
    oscillator.connect(gain)
    gain.connect(audioContext.destination)

    const now = audioContext.currentTime
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
    oscillator.start(now)
    oscillator.stop(now + 0.36)
  } catch {
    // 靜默略過（部分瀏覽器需使用者互動後才能播音）
  }
}
