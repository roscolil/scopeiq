import { useRef, forwardRef } from 'react'
import { useLoadScript, Autocomplete } from '@react-google-maps/api'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

const libraries = ['places'] as (
  | 'drawing'
  | 'geometry'
  | 'places'
  | 'visualization'
)[]

interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  name?: string
}

export const AutocompleteInput = forwardRef<
  HTMLInputElement,
  AutocompleteInputProps
>(({ value, onChange, onBlur, name }, ref) => {
  const isMobile = useIsMobile()
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY

  console.log('🗺️ Google Places: API Key present?', !!apiKey)
  console.log(
    '🗺️ Google Places: API Key (first 10 chars):',
    apiKey?.substring(0, 10),
  )

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  })

  console.log(
    '🗺️ Google Places: isLoaded =',
    isLoaded,
    'loadError =',
    loadError,
  )

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    console.log('✅ Google Places: Autocomplete loaded successfully')
    autocompleteRef.current = autocomplete

    // Configure autocomplete options for better mobile experience
    autocomplete.setOptions({
      fields: ['formatted_address', 'geometry', 'name'],
      types: ['address'],
      componentRestrictions: { country: 'au' }, // Adjust for your region
    })
  }

  const onPlaceChanged = () => {
    const place = autocompleteRef.current!.getPlace()
    if (!place.geometry) {
      console.warn('No geometry for selected place')
      return
    }

    // Use formatted_address which is more reliable for autocomplete
    const selectedAddress = place.formatted_address || place.name || ''
    console.log('Google Places selected:', selectedAddress)

    // Update the value immediately to prevent form validation issues
    onChange(selectedAddress)

    // On mobile, prevent focus issues by ensuring proper event handling
    if (isMobile) {
      setTimeout(() => {
        // Trigger a blur event to ensure form validation runs properly
        if (onBlur) {
          onBlur()
        }
      }, 150)
    }
  }

  if (loadError) {
    console.error('❌ Google Places: Load error:', loadError)
    return (
      <div className="text-red-500 text-sm p-2 border border-red-300 rounded">
        Error loading Google Maps: {loadError.message}
      </div>
    )
  }
  if (!isLoaded)
    return (
      <div className="flex justify-center items-center py-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-gray-400">Loading maps...</span>
      </div>
    )

  return (
    <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
      <Input
        type="text"
        placeholder="Search Address"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        name={name}
        ref={ref}
        // Improve mobile experience
        autoComplete="off"
        // Prevent form submission on Enter key
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
          }
        }}
        // Handle mobile touch events better
        onTouchStart={
          isMobile
            ? e => {
                // Ensure the input gets proper focus on mobile
                const target = e.currentTarget
                setTimeout(() => {
                  target.focus()
                }, 0)
              }
            : undefined
        }
      />
    </Autocomplete>
  )
})
