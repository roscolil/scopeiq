// Service Worker Registration for Performance Optimization

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none', // Always fetch fresh service worker
      })

      console.log('Service Worker registered successfully:', registration)

      // Check for updates immediately
      registration.update()

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New service worker available - reload to activate
              console.log('New version available, reloading...')
              window.location.reload()
            }
          })
        }
      })

      // Check for updates every 60 seconds
      setInterval(() => {
        registration.update()
      }, 60000)

      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return null
    }
  } else {
    console.log('Service Worker not supported')
    return null
  }
}

export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.unregister()
        console.log('Service Worker unregistered')
        return true
      }
    } catch (error) {
      console.error('Service Worker unregistration failed:', error)
    }
  }
  return false
}

// Initialize service worker on app load
export const initializeServiceWorker = () => {
  // Register in production and staging environments
  if (import.meta.env.MODE === 'production') {
    window.addEventListener('load', () => {
      registerServiceWorker()
    })
  } else {
    // In development, ensure no service worker is active
    unregisterServiceWorker()
  }
}
