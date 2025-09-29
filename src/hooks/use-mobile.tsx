import * as React from 'react'

// Define breakpoints
const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

// Enhanced mobile detection that considers real device characteristics
function getIsRealMobileDevice(): boolean {
  if (typeof window === 'undefined') return false

  // Check user agent for mobile devices
  const userAgent = navigator.userAgent.toLowerCase()
  const isMobileUA =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent,
    )

  // Check for touch capability (more reliable than user agent)
  const hasTouchScreen =
    'ontouchstart' in window || navigator.maxTouchPoints > 0

  // Check screen dimensions - real mobile devices typically have specific characteristics
  const screenWidth = screen.width
  const screenHeight = screen.height
  const isNarrowScreen = Math.min(screenWidth, screenHeight) < MOBILE_BREAKPOINT

  // Check device pixel ratio - mobile devices often have higher DPR
  const hasMobileDPR = window.devicePixelRatio >= 1.5

  // Check orientation API availability (mostly on mobile)
  const hasOrientationAPI =
    'orientation' in window || 'onorientationchange' in window

  // Combine factors for better mobile detection
  const mobileScore = [
    isMobileUA,
    hasTouchScreen && isNarrowScreen,
    hasMobileDPR && isNarrowScreen,
    hasOrientationAPI && isNarrowScreen,
  ].filter(Boolean).length

  return mobileScore >= 2
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkMobile = () => {
      const viewportMobile = window.innerWidth < MOBILE_BREAKPOINT
      const realMobileDevice = getIsRealMobileDevice()

      // If it's a real mobile device, always consider it mobile regardless of viewport width
      // This handles cases where Chrome dev tools might report different viewport than real device
      setIsMobile(realMobileDevice || viewportMobile)
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    mql.addEventListener('change', checkMobile)

    // Check immediately and on resize for device characteristics that might change
    checkMobile()
    window.addEventListener('resize', checkMobile)
    window.addEventListener('orientationchange', checkMobile)

    return () => {
      mql.removeEventListener('change', checkMobile)
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('orientationchange', checkMobile)
    }
  }, [])

  return !!isMobile
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(
      `(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`,
    )
    const onChange = () => {
      setIsTablet(
        window.innerWidth >= MOBILE_BREAKPOINT &&
          window.innerWidth < TABLET_BREAKPOINT,
      )
    }
    mql.addEventListener('change', onChange)
    setIsTablet(
      window.innerWidth >= MOBILE_BREAKPOINT &&
        window.innerWidth < TABLET_BREAKPOINT,
    )
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return !!isTablet
}

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState<boolean | undefined>(
    undefined,
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${TABLET_BREAKPOINT}px)`)
    const onChange = () => {
      setIsDesktop(window.innerWidth >= TABLET_BREAKPOINT)
    }
    mql.addEventListener('change', onChange)
    setIsDesktop(window.innerWidth >= TABLET_BREAKPOINT)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return !!isDesktop
}

export function useBreakpoint() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const isDesktop = useIsDesktop()

  return { isMobile, isTablet, isDesktop }
}
