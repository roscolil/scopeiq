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
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_PLACES_API_KEY,
    libraries,
  })

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
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

  if (loadError) return <div>Error loading maps</div>
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
