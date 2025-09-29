import { useEffect } from 'react'

/**
 * Hook that applies device-specific fixes to ensure mobile behavior matches desktop dev tools
 */
export function useDeviceFixes() {
  useEffect(() => {
    // iOS Safari specific fixes
    const isIOSSafari =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream &&
      /Safari/.test(navigator.userAgent)

    // Android Chrome specific fixes
    const isAndroidChrome =
      /Android/.test(navigator.userAgent) && /Chrome/.test(navigator.userAgent)

    if (isIOSSafari) {
      // Fix iOS Safari viewport unit issues
      const setVH = () => {
        const vh = window.innerHeight * 0.01
        document.documentElement.style.setProperty('--vh', `${vh}px`)
      }

      setVH()
      window.addEventListener('resize', setVH)
      window.addEventListener('orientationchange', () => {
        setTimeout(setVH, 100) // Delay to ensure orientation change is complete
      })

      // Prevent iOS Safari from zooming on input focus
      const preventZoom = (e: FocusEvent) => {
        const target = e.target as HTMLElement
        if (
          target &&
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
        ) {
          target.style.fontSize = '16px'
        }
      }

      document.addEventListener('focusin', preventZoom)

      // Fix iOS Safari address bar height changes
      const resizeHandler = () => {
        document.documentElement.style.setProperty(
          '--viewport-height',
          `${window.innerHeight}px`,
        )
      }

      window.addEventListener('resize', resizeHandler)
      resizeHandler()

      return () => {
        window.removeEventListener('resize', setVH)
        window.removeEventListener('resize', resizeHandler)
        document.removeEventListener('focusin', preventZoom)
      }
    }

    if (isAndroidChrome) {
      // Fix Android Chrome viewport behavior
      const setAndroidVH = () => {
        const vh = window.innerHeight * 0.01
        document.documentElement.style.setProperty('--vh', `${vh}px`)
      }

      setAndroidVH()
      window.addEventListener('resize', setAndroidVH)

      // Fix Android Chrome keyboard behavior
      const originalHeight = window.innerHeight

      const keyboardHandler = () => {
        const currentHeight = window.innerHeight
        const heightDiff = originalHeight - currentHeight

        if (heightDiff > 150) {
          // Keyboard is likely open
          document.documentElement.style.setProperty('--keyboard-open', 'true')
          document.body.style.height = `${currentHeight}px`
        } else {
          // Keyboard is likely closed
          document.documentElement.style.setProperty('--keyboard-open', 'false')
          document.body.style.height = 'auto'
        }
      }

      window.addEventListener('resize', keyboardHandler)

      return () => {
        window.removeEventListener('resize', setAndroidVH)
        window.removeEventListener('resize', keyboardHandler)
      }
    }

    // General mobile fixes
    if (
      /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      )
    ) {
      // Prevent horizontal scrolling on mobile
      document.body.style.overflowX = 'hidden'

      // Fix touch scroll momentum
      document.body.style.webkitOverflowScrolling = 'touch'

      // Improve touch responsiveness
      document.body.style.touchAction = 'manipulation'

      // Fix click delay on mobile
      let fastClickStyle = document.getElementById('fast-click-style')
      if (!fastClickStyle) {
        fastClickStyle = document.createElement('style')
        fastClickStyle.id = 'fast-click-style'
        fastClickStyle.textContent = `
          * {
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
          }
          
          button, input, select, textarea, [role="button"] {
            touch-action: manipulation;
          }
        `
        document.head.appendChild(fastClickStyle)
      }

      return () => {
        document.body.style.overflowX = ''
        document.body.style.webkitOverflowScrolling = ''
        document.body.style.touchAction = ''
        if (fastClickStyle) {
          fastClickStyle.remove()
        }
      }
    }
  }, [])
}

/**
 * Hook that detects and handles device-specific layout differences
 */
export function useDeviceLayoutFixes() {
  useEffect(() => {
    // Handle device pixel ratio differences
    const dpr = window.devicePixelRatio || 1
    document.documentElement.style.setProperty(
      '--device-pixel-ratio',
      dpr.toString(),
    )

    // Handle orientation changes more reliably
    const handleOrientationChange = () => {
      // Force a reflow after orientation change to fix layout issues
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'))
      }, 100)
    }

    window.addEventListener('orientationchange', handleOrientationChange)

    // Handle safe area insets for devices with notches
    if (CSS.supports('padding: env(safe-area-inset-top)')) {
      document.documentElement.classList.add('safe-area-supported')
    }

    // Fix viewport meta tag issues on real devices
    const viewportMeta = document.querySelector(
      'meta[name="viewport"]',
    ) as HTMLMetaElement
    if (viewportMeta) {
      // Ensure viewport meta tag is exactly what we expect for real devices
      viewportMeta.content =
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    }

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])
}

/**
 * Hook that provides device-specific scroll behavior fixes
 */
export function useDeviceScrollFixes() {
  useEffect(() => {
    // Fix iOS momentum scrolling issues
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    if (isIOS) {
      // Add momentum scrolling to all scrollable elements
      const scrollElements = document.querySelectorAll(
        'div, main, section, article, aside, nav, [data-scroll]',
      )

      scrollElements.forEach(element => {
        const el = element as HTMLElement
        if (
          el.scrollHeight > el.clientHeight ||
          el.scrollWidth > el.clientWidth
        ) {
          el.style.webkitOverflowScrolling = 'touch'
          el.style.overscrollBehavior = 'contain'
        }
      })

      // Fix iOS scroll bounce in specific containers
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement
              if (element.scrollHeight > element.clientHeight) {
                element.style.webkitOverflowScrolling = 'touch'
                element.style.overscrollBehavior = 'contain'
              }
            }
          })
        })
      })

      observer.observe(document.body, { childList: true, subtree: true })

      return () => {
        observer.disconnect()
      }
    }
  }, [])
}
