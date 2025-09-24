/**
 * Hook for handling Safari audio restrictions
 * Provides utilities to check and enable audio playback on Safari/iOS
 * 
 * Note: This hook is Safari-specific and should only be used when needed
 * to avoid potential hook conflicts on other browsers.
 */

import { useState, useEffect } from 'react'
import { novaSonic } from '@/services/api/nova-sonic'

export interface SafariAudioStatus {
  isAvailable: boolean
  needsInteraction: boolean
  message: string
  isSafari: boolean
}

export function useSafariAudio() {
  const [status, setStatus] = useState<SafariAudioStatus>({
    isAvailable: false,
    needsInteraction: false,
    message: 'Checking audio availability...',
    isSafari: false,
  })

  // Check if we're on Safari
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  
  // Early return for non-Safari browsers to prevent unnecessary hook execution
  const isSafariOrIOS = isSafari || isIOS

  // Update status when component mounts or novaSonic state changes
  useEffect(() => {
    // Only run Safari-specific logic on Safari/iOS
    if (!isSafariOrIOS) {
      setStatus({
        isAvailable: true,
        needsInteraction: false,
        message: 'Audio ready (non-Safari browser)',
        isSafari: false,
      })
      return
    }

    const updateStatus = () => {
      const audioStatus = novaSonic.getAudioStatus()
      setStatus({
        isAvailable: audioStatus.available, // Map 'available' to 'isAvailable'
        needsInteraction: audioStatus.needsInteraction,
        message: audioStatus.message,
        isSafari: isSafariOrIOS,
      })
    }

    updateStatus()

    // Check periodically for changes (e.g., user interaction)
    const interval = setInterval(updateStatus, 1000)

    return () => clearInterval(interval)
  }, [isSafariOrIOS])

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
      setStatus({
        isAvailable: audioStatus.available, // Map 'available' to 'isAvailable'
        needsInteraction: audioStatus.needsInteraction,
        message: audioStatus.message,
        isSafari: isSafari || isIOS,
      })

      return success
    } catch (error) {
      console.error('Failed to enable audio:', error)
      return false
    }
  }

  /**
   * Speak text with automatic Safari handling
   */
  const speak = async (text: string): Promise<boolean> => {
    try {
      // If Safari needs interaction, show warning but still attempt
      if (status.needsInteraction) {
        console.warn('🍎 Safari: Audio requires user interaction first')
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
    if (!status.isSafari) {
      return status.isAvailable ? 'Audio ready' : 'Audio not available'
    }

    if (status.needsInteraction) {
      return 'Click any button to enable audio on Safari'
    }

    return status.isAvailable ? 'Audio enabled' : 'Audio not available'
  }

  return {
    status,
    enableAudio,
    speak,
    getStatusMessage,
    isSafari: isSafariOrIOS,
    needsUserInteraction: status.needsInteraction,
    isAudioAvailable: status.isAvailable,
  }
}
