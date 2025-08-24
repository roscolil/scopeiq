import { useState, useEffect } from 'react'
import { VoiceInput } from '@/components/voice/VoiceInput'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, MapPin, Mic, Building2, Truck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Supplier {
  id: string
  name: string
  address: string
  products: string[]
  lat: number
  lng: number
  distance?: number
}

interface Coordinates {
  latitude: number
  longitude: number
}

export const SearchProducts = () => {
  const [query, setQuery] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null)
  const { toast } = useToast()

  // Toggle voice input
  const toggleListening = () => {
    setIsListening(!isListening)
  }

  // Handle voice transcript
  const handleTranscript = (text: string) => {
    console.log('SearchProducts received transcript:', text)
    setQuery(text)
    // Automatically trigger search when voice transcript is received
    if (text.trim()) {
      setTimeout(() => {
        searchSuppliers()
      }, 100)
    }
  }

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        error => {
          console.error('Error getting location:', error)
          toast({
            title: 'Location Error',
            description:
              'Unable to get your location. Some features may be limited.',
            variant: 'destructive',
          })
        },
      )
    } else {
      toast({
        title: 'Geolocation Not Supported',
        description:
          "Your browser doesn't support geolocation. Some features may be limited.",
        variant: 'destructive',
      })
    }
  }, [toast])

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const R = 6371 // Radius of the earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c // Distance in km
    return parseFloat(distance.toFixed(1))
  }

  // Search for products and suppliers
  const searchSuppliers = () => {
    if (!query.trim()) return

    setIsLoading(true)

    // Simulated API call - in a real application, this would be a fetch to your backend
    setTimeout(() => {
      // Mock data for demonstration
      const mockSuppliers: Supplier[] = [
        {
          id: 'sup1',
          name: 'ABC Building Supplies',
          address: '123 Construction Ave, Builder City',
          products: ['Cement', 'Bricks', 'Lumber'],
          lat: userLocation ? userLocation.latitude + 0.01 : 40.7128,
          lng: userLocation ? userLocation.longitude - 0.02 : -74.006,
        },
        {
          id: 'sup2',
          name: 'XYZ Hardware & Tools',
          address: '456 Contractor Road, Builder City',
          products: ['Power Tools', 'Hardware', 'Safety Equipment'],
          lat: userLocation ? userLocation.latitude - 0.03 : 40.7328,
          lng: userLocation ? userLocation.longitude + 0.01 : -74.026,
        },
        {
          id: 'sup3',
          name: 'BuildRight Materials',
          address: '789 Framework Street, Builder City',
          products: ['Steel', 'Insulation', 'Drywall'],
          lat: userLocation ? userLocation.latitude + 0.05 : 40.7528,
          lng: userLocation ? userLocation.longitude + 0.03 : -73.986,
        },
      ]

      // Filter suppliers based on the search query
      const filteredSuppliers = mockSuppliers.filter(supplier => {
        const matchesName = supplier.name
          .toLowerCase()
          .includes(query.toLowerCase())
        const matchesProduct = supplier.products.some(product =>
          product.toLowerCase().includes(query.toLowerCase()),
        )
        return matchesName || matchesProduct
      })

      // Calculate distance if user location is available
      if (userLocation) {
        filteredSuppliers.forEach(supplier => {
          supplier.distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            supplier.lat,
            supplier.lng,
          )
        })

        // Sort by distance
        filteredSuppliers.sort(
          (a, b) => (a.distance || Infinity) - (b.distance || Infinity),
        )
      }

      setSuppliers(filteredSuppliers)
      setIsLoading(false)

      if (filteredSuppliers.length === 0) {
        toast({
          title: 'No Results',
          description: `No suppliers found for "${query}"`,
        })
      }
    }, 1000)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    searchSuppliers()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Building Products & Suppliers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Search for products or suppliers..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pr-10"
              />
              <VoiceInput
                onTranscript={handleTranscript}
                isListening={isListening}
                toggleListening={toggleListening}
              />
            </div>
            <Button type="submit" disabled={isLoading || !query.trim()}>
              {isLoading ? 'Asking AI...' : 'Ask AI'}
            </Button>
          </form>

          {userLocation ? (
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Location available - search will
              show distances
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Enable location for distance
              information
            </p>
          )}
        </CardContent>
      </Card>

      {suppliers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Results ({suppliers.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suppliers.map(supplier => (
              <Card key={supplier.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium flex items-center gap-1">
                        <Building2 className="h-4 w-4 text-primary" />{' '}
                        {supplier.name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {supplier.address}
                      </p>
                    </div>
                    {supplier.distance !== undefined && (
                      <div className="bg-muted text-gray-400 px-2 py-1 rounded-md text-sm flex items-center">
                        <MapPin className="h-3 w-3 mr-1" /> {supplier.distance}{' '}
                        km
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-medium mb-1 flex items-center gap-1">
                      <Truck className="h-3 w-3" /> Available Products:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {supplier.products.map((product, idx) => (
                        <span
                          key={idx}
                          className="bg-secondary/50 text-secondary-foreground text-xs px-2 py-0.5 rounded-full"
                        >
                          {product}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
