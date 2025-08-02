import { useRef, forwardRef } from 'react'
import { useLoadScript, Autocomplete } from '@react-google-maps/api'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/Spinner'

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
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey:
      import.meta.env.VITE_GOOGLE_PLACES_API_KEY ||
      import.meta.env.GOOGLE_PLACES_API_KEY,
    libraries,
  })

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete
  }

  const onPlaceChanged = () => {
    const place = autocompleteRef.current!.getPlace()
    if (!place.geometry) {
      console.warn('No geometry for selected place')
      return
    }
    // Prevent form submission by stopping event propagation
    onChange(place.formatted_address || '')
  }

  if (loadError) return <div>Error loading maps</div>
  if (!isLoaded)
    return (
      <div className="flex justify-center py-4">
        <Spinner size="sm" text="Loading maps..." />
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
        // Prevent form submission on Enter key
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
          }
        }}
      />
    </Autocomplete>
  )
})
