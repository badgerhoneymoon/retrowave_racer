let ostAudio: HTMLAudioElement | null = null
let hasStarted: boolean = false
let isMuted: boolean = false
let fadeIntervalId: number | null = null
let currentIndex: number | null = null
let targetVolumeGlobal: number = 0.4

// Static playlist sourced from public/ost
const PLAYLIST: string[] = [
  "/ost/000_Full_Mix_110bpm_Bb_Minor_-_80SCYBERPUNK_Zenhiser.mp3",
  "/ost/000_Full__Mix_122bpm_Bb_Minor_-_80SCYBERPUNK_Zenhiser.mp3",
  "/ost/000_Full_Mix_119bpm_D_Minor_-_80SCYBERPUNK_Zenhiser.mp3",
  "/ost/000_Full_Mix_128bpm_Bb_Minor_-_80SCYBERPUNK_Zenhiser.mp3",
  "/ost/000_Full_Mix_130bpm_D_Minor_-_80SCYBERPUNK_Zenhiser.mp3",
]

function clearFadeInterval() {
  if (fadeIntervalId !== null) {
    window.clearInterval(fadeIntervalId)
    fadeIntervalId = null
  }
}

function selectRandomIndex(except?: number | null): number {
  if (PLAYLIST.length === 1) return 0
  let idx = Math.floor(Math.random() * PLAYLIST.length)
  if (except !== null && except !== undefined) {
    while (idx === except) {
      idx = Math.floor(Math.random() * PLAYLIST.length)
    }
  }
  return idx
}

function attachEndedHandler() {
  if (!ostAudio) return
  ostAudio.onended = () => {
    if (isMuted) return
    const nextIdx = selectRandomIndex(currentIndex)
    currentIndex = nextIdx
    if (!ostAudio) return
    ostAudio.src = PLAYLIST[nextIdx]
    ostAudio.currentTime = 0
    // keep current volume; no fade between tracks by default
    ostAudio.play().catch(() => {})
  }
}

function ensureAudio(index?: number) {
  if (!ostAudio) {
    ostAudio = new Audio()
    ostAudio.loop = false
    ostAudio.volume = 0
    attachEndedHandler()
  }
  if (typeof index === 'number') {
    currentIndex = index
  } else if (currentIndex === null) {
    currentIndex = selectRandomIndex(null)
  }
  // Only set src if not already set, to avoid unintended restarts
  if (!ostAudio.src) {
    ostAudio.src = PLAYLIST[currentIndex]
  }
}

export async function startOSTFadeIn(targetVolume: number = 0.4, durationMs: number = 2000): Promise<void> {
  targetVolumeGlobal = targetVolume

  try {
    ensureAudio()
    if (!ostAudio) return
    // Respect user mute: do not auto-unmute
    if (isMuted) return
    // If already playing and not muted, do nothing
    if (hasStarted && !ostAudio.paused && !isMuted) {
      return
    }
    if (!hasStarted) hasStarted = true
    clearFadeInterval()
    // Start from 0 for a proper fade when resuming or first play
    ostAudio.volume = 0
    // Do not reset src here; keep current track and position if possible
    if (ostAudio.paused) {
      await ostAudio.play()
    }

    const stepIntervalMs = 50
    const totalSteps = Math.max(1, Math.floor(durationMs / stepIntervalMs))
    const volumeIncrement = targetVolume / totalSteps

    let currentStep = 0
    fadeIntervalId = window.setInterval(() => {
      if (!ostAudio) {
        clearFadeInterval()
        return
      }
      currentStep += 1
      const nextVolume = Math.min(targetVolume, (ostAudio.volume || 0) + volumeIncrement)
      ostAudio.volume = nextVolume
      if (currentStep >= totalSteps || ostAudio.volume >= targetVolume) {
        ostAudio.volume = targetVolume
        clearFadeInterval()
      }
    }, stepIntervalMs)
  } catch (err) {
    // Allow another attempt on next user gesture
    hasStarted = false
    // eslint-disable-next-line no-console
    console.warn("OST play failed on first attempt:", err)
  }
}

export function stopOSTFadeOut(durationMs: number = 1000): void {
  if (!ostAudio) return
  clearFadeInterval()

  const startVolume = ostAudio.volume
  const stepIntervalMs = 50
  const totalSteps = Math.max(1, Math.floor(durationMs / stepIntervalMs))
  const volumeDecrement = startVolume / totalSteps

  let currentStep = 0
  fadeIntervalId = window.setInterval(() => {
    if (!ostAudio) {
      clearFadeInterval()
      return
    }
    currentStep += 1
    const nextVolume = Math.max(0, ostAudio.volume - volumeDecrement)
    ostAudio.volume = nextVolume
    if (currentStep >= totalSteps || ostAudio.volume <= 0) {
      ostAudio.volume = 0
      ostAudio.pause()
      clearFadeInterval()
    }
  }, stepIntervalMs)
}

export function toggleSound(): void {
  if (!hasStarted || !ostAudio) {
    // If never started or audio not ready, start then toggle to on
    void startOSTFadeIn(targetVolumeGlobal, 600)
    return
  }

  if (isMuted || ostAudio.paused) {
    isMuted = false
    void startOSTFadeIn(targetVolumeGlobal, 300)
  } else {
    isMuted = true
    stopOSTFadeOut(300)
  }
}

export function initAutoStartOnUserGesture(options?: { targetVolume?: number; durationMs?: number }): void {
  if (hasStarted) return
  const handler = () => {
    // attempt to start, respecting user mute
    void startOSTFadeIn(options?.targetVolume ?? targetVolumeGlobal, options?.durationMs ?? 600)
    window.removeEventListener('pointerdown', handler)
    window.removeEventListener('keydown', handler)
  }
  window.addEventListener('pointerdown', handler, { once: false })
  window.addEventListener('keydown', handler, { once: false })
}



