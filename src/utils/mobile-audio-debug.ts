/**
 * Mobile Audio Debugging Utility
 * Helps diagnose TTS issues on mobile devices
 */

export const logMobileAudioState = () => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  console.group('📱 Mobile Audio Diagnostic')
  console.log('Device Info:', {
    isMobile,
    isSafari,
    isIOS,
    userAgent: navigator.userAgent,
  })

  // Check AudioContext support
  const AudioContextClass =
    window.AudioContext || (window as any).webkitAudioContext
  if (AudioContextClass) {
    try {
      const ctx = new AudioContextClass()
      console.log('AudioContext State:', {
        state: ctx.state,
        sampleRate: ctx.sampleRate,
        suspended: ctx.state === 'suspended',
      })
      ctx.close()
    } catch (e) {
      console.error('AudioContext creation failed:', e)
    }
  } else {
    console.error('❌ AudioContext not supported!')
  }

  // Check HTML5 Audio support
  const audio = new Audio()
  console.log('HTML5 Audio Support:', {
    canPlayMP3: audio.canPlayType('audio/mpeg'),
    canPlayOGG: audio.canPlayType('audio/ogg'),
    canPlayWAV: audio.canPlayType('audio/wav'),
  })

  // Check autoplay policy
  if ('getAutoplayPolicy' in navigator) {
    console.log(
      'Autoplay Policy:',
      (navigator as any).getAutoplayPolicy('mediaelement'),
    )
  }

  console.groupEnd()
}

// Auto-run on mobile
if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
  // Run after a short delay to avoid blocking page load
  setTimeout(() => logMobileAudioState(), 1000)
}
