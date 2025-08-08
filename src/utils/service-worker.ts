// Service Worker Registration for Performance Optimization

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })

      console.log('Service Worker registered successfully:', registration)

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New service worker is available, prompt user to refresh
              console.log('New service worker available, consider refreshing')
              // You could show a toast notification here
            }
          })
        }
      })

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
  // Only register in production
  if (import.meta.env.MODE === 'production') {
    window.addEventListener('load', () => {
      registerServiceWorker()
    })
  }
}
