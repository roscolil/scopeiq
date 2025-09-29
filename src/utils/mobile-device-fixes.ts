/**
 * Utility functions for fixing mobile device differences from Chrome dev tools
 */

/**
 * Apply consistent mobile input styling to prevent zoom on focus
 */
export function applyMobileInputFixes() {
  if (typeof window === 'undefined') return

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  if (!isMobile) return

  // Create a style element for mobile-specific fixes
  const styleId = 'mobile-device-fixes'
  let existingStyle = document.getElementById(styleId)

  if (existingStyle) {
    existingStyle.remove()
  }

  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    /* Prevent zoom on input focus - must be exactly 16px */
    input[type="text"],
    input[type="email"],
    input[type="password"],
    input[type="search"],
    input[type="url"],
    input[type="tel"],
    input[type="number"],
    textarea,
    select {
      font-size: 16px !important;
      -webkit-appearance: none !important;
      border-radius: 0 !important;
      transform: translateZ(0);
    }

    /* Fix iOS Safari input styling */
    @supports (-webkit-appearance: none) {
      input,
      textarea,
      select {
        -webkit-appearance: none;
        background-clip: padding-box;
      }
    }

    /* Improve button touch targets */
    button,
    [role="button"],
    [type="button"],
    [type="submit"] {
      min-height: 44px;
      min-width: 44px;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    /* Fix viewport units on mobile Safari */
    .mobile-vh-fix {
      height: calc(var(--vh, 1vh) * 100);
      min-height: calc(var(--vh, 1vh) * 100);
    }

    /* Prevent horizontal scroll on mobile */
    body {
      overflow-x: hidden !important;
      -webkit-overflow-scrolling: touch;
    }

    /* Fix fixed positioning on mobile */
    .mobile-fixed {
      position: fixed;
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
    }

    /* Optimize scrolling performance */
    .mobile-scroll {
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      scroll-behavior: smooth;
    }
  `

  document.head.appendChild(style)
}

/**
 * Set CSS custom properties for consistent viewport handling
 */
export function setMobileViewportProperties() {
  if (typeof window === 'undefined') return

  const setVH = () => {
    const vh = window.innerHeight * 0.01
    document.documentElement.style.setProperty('--vh', `${vh}px`)
  }

  const setDPR = () => {
    const dpr = window.devicePixelRatio || 1
    document.documentElement.style.setProperty(
      '--device-pixel-ratio',
      dpr.toString(),
    )
  }

  const setSafeArea = () => {
    // Set safe area fallbacks for older browsers
    if (!CSS.supports('padding: env(safe-area-inset-top)')) {
      document.documentElement.style.setProperty('--safe-area-inset-top', '0px')
      document.documentElement.style.setProperty(
        '--safe-area-inset-right',
        '0px',
      )
      document.documentElement.style.setProperty(
        '--safe-area-inset-bottom',
        '0px',
      )
      document.documentElement.style.setProperty(
        '--safe-area-inset-left',
        '0px',
      )
    }
  }

  setVH()
  setDPR()
  setSafeArea()

  // Update on resize and orientation change
  window.addEventListener('resize', () => {
    setVH()
    setDPR()
  })

  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      setVH()
      setDPR()
    }, 100)
  })
}

/**
 * Fix common mobile device quirks that differ from Chrome dev tools
 */
export function fixMobileDeviceQuirks() {
  if (typeof window === 'undefined') return

  // Detect device type
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  const isAndroid = /Android/.test(navigator.userAgent)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  // iOS specific fixes
  if (isIOS) {
    // Fix iOS Safari viewport jumping
    const fixIOSViewport = () => {
      const viewport = document.querySelector(
        'meta[name="viewport"]',
      ) as HTMLMetaElement
      if (viewport) {
        viewport.content =
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      }
    }

    fixIOSViewport()

    // Fix iOS input focus issues
    document.addEventListener('focusin', e => {
      const target = e.target as HTMLElement
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 300)
      }
    })

    // Prevent iOS bounce scrolling where not wanted
    document.addEventListener(
      'touchmove',
      e => {
        if ((e.target as HTMLElement)?.tagName === 'BODY') {
          e.preventDefault()
        }
      },
      { passive: false },
    )
  }

  // Android specific fixes
  if (isAndroid) {
    // Fix Android keyboard behavior
    let originalHeight = window.innerHeight

    const handleAndroidKeyboard = () => {
      const currentHeight = window.innerHeight
      const heightDiff = originalHeight - currentHeight

      if (heightDiff > 150) {
        // Keyboard is open
        document.body.style.height = `${currentHeight}px`
        document.documentElement.style.setProperty('--keyboard-open', 'true')
      } else {
        // Keyboard is closed
        document.body.style.height = 'auto'
        document.documentElement.style.setProperty('--keyboard-open', 'false')
      }
    }

    window.addEventListener('resize', handleAndroidKeyboard)
  }

  // Safari specific fixes (mobile and desktop)
  if (isSafari) {
    // Fix Safari hover states on touch devices
    document.addEventListener('touchstart', () => {}, { passive: true })

    // Fix Safari transform/translate issues
    const fixSafariTransforms = () => {
      const elements = document.querySelectorAll('[style*="transform"]')
      elements.forEach(el => {
        const element = el as HTMLElement
        element.style.webkitTransform = element.style.transform
      })
    }

    // Run on DOM changes
    const observer = new MutationObserver(fixSafariTransforms)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
    })
  }
}

/**
 * Initialize all mobile device fixes
 */
export function initializeMobileDeviceFixes() {
  applyMobileInputFixes()
  setMobileViewportProperties()
  fixMobileDeviceQuirks()
}
