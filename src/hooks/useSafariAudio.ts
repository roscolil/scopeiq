/**
 * Hook for handling mobile audio restrictions
 * Provides utilities to check and enable audio playback on Safari/iOS and Android Chrome
 */

import { useState, useEffect } from 'react'
import { novaSonic } from '@/services/api/nova-sonic'

export interface MobileAudioStatus {
  isAvailable: boolean
  needsInteraction: boolean
  message: string
  isMobileBrowser: boolean
  platform: 'safari' | 'android-chrome' | 'other'
}

export function useSafariAudio() {
  const [status, setStatus] = useState<MobileAudioStatus>({
    isAvailable: false,
    needsInteraction: false,
    message: 'Checking audio availability...',
    isMobileBrowser: false,
    platform: 'other',
  })

  // Check browser type
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/i.test(navigator.userAgent)
  const isChrome = /Chrome/i.test(navigator.userAgent)
  const isAndroidChrome = isAndroid && isChrome

  // Update status when component mounts or novaSonic state changes
  useEffect(() => {
    const updateStatus = () => {
      const audioStatus = novaSonic.getAudioStatus()

      let platform: 'safari' | 'android-chrome' | 'other' = 'other'
      if (isSafari || isIOS) platform = 'safari'
      else if (isAndroidChrome) platform = 'android-chrome'

      setStatus({
        isAvailable: audioStatus.available,
        needsInteraction: audioStatus.needsInteraction,
        message: audioStatus.message,
        isMobileBrowser: isSafari || isIOS || isAndroidChrome,
        platform,
      })
    }

    updateStatus()

    // Check periodically for changes (e.g., user interaction)
    const interval = setInterval(updateStatus, 1000)

    return () => clearInterval(interval)
  }, [isSafari, isIOS, isAndroidChrome])

  /**
   * Enable audio for Safari by triggering user interaction
   * Call this in response to a button click
   */
  const enableAudio = async (): Promise<boolean> => {
    try {
      let success = await novaSonic.enableAudioForSafari()
      if (!success) {
        type UnlockCapable = typeof novaSonic & {
          forceUnlockAudio?: () => Promise<boolean>
        }
        const maybeUnlock = novaSonic as UnlockCapable
        if (maybeUnlock.forceUnlockAudio) {
          try {
            success = await maybeUnlock.forceUnlockAudio()
          } catch {
            /* noop */
          }
        }
      }

      // Update status after attempting to enable
      const audioStatus = novaSonic.getAudioStatus()

      let platform: 'safari' | 'android-chrome' | 'other' = 'other'
      if (isSafari || isIOS) platform = 'safari'
      else if (isAndroidChrome) platform = 'android-chrome'

      setStatus({
        isAvailable: audioStatus.available,
        needsInteraction: audioStatus.needsInteraction,
        message: audioStatus.message,
        isMobileBrowser: isSafari || isIOS || isAndroidChrome,
        platform,
      })

      return success
    } catch (error) {
      console.error('Failed to enable audio:', error)
      return false
    }
  }

  /**
   * Speak text with automatic mobile browser handling
   */
  const speak = async (text: string): Promise<boolean> => {
    try {
      // If mobile browser needs interaction, show warning but still attempt
      if (status.needsInteraction) {
        const platformEmoji = status.platform === 'android-chrome' ? '🤖' : '🍎'
        const platformName =
          status.platform === 'android-chrome' ? 'Android Chrome' : 'Safari'
        console.warn(
          `${platformEmoji} ${platformName}: Audio requires user interaction first`,
        )
      }

      return await novaSonic.speak(text)
    } catch (error) {
      console.error('Speech failed:', error)
      return false
    }
  }

  /**
   * Get a user-friendly message for audio status
   */
  const getStatusMessage = (): string => {
    if (!status.isMobileBrowser) {
      return status.isAvailable ? 'Audio ready' : 'Audio not available'
    }

    if (status.needsInteraction) {
      const platformName =
        status.platform === 'android-chrome' ? 'Android Chrome' : 'Safari'
      return `Click any button to enable audio on ${platformName}`
    }

    return status.isAvailable ? 'Audio enabled' : 'Audio not available'
  }

  return {
    status,
    enableAudio,
    speak,
    getStatusMessage,
    isMobileBrowser: status.isMobileBrowser,
    platform: status.platform,
    needsUserInteraction: status.needsInteraction,
    isAudioAvailable: status.isAvailable,
  }
}
