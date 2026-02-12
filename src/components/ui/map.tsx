import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom icons
const workIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10b981" width="32" height="32">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" width="32" height="32">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationMapProps {
  address: string;
  cep?: string;
  title?: string;
  showUserLocation?: boolean;
  height?: string;
  className?: string;
  onDistanceCalculated?: (distance: number) => void;
}

// Component to recenter map when coordinates change
function RecenterMap({ coords }: { coords: Coordinates }) {
  const map = useMap();
  useEffect(() => {
    map.setView([coords.lat, coords.lng], 15);
  }, [coords, map]);
  return null;
}

// Geocode address using our API proxy (avoids CORS issues)
// Tries multiple search strategies from most specific to least specific
async function geocodeAddress(address: string, cep?: string): Promise<Coordinates | null> {
  // Get city info from ViaCEP if we have a CEP
  let cityInfo: { city: string; state: string; street?: string; neighborhood?: string } | null = null;

  if (cep) {
    try {
      const cleanCep = cep.replace(/\D/g, '');
      if (cleanCep.length === 8) {
        const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const viaCepData = await viaCepResponse.json();
        if (viaCepData && !viaCepData.erro && viaCepData.localidade) {
          cityInfo = {
            city: viaCepData.localidade,
            state: viaCepData.uf,
            street: viaCepData.logradouro,
            neighborhood: viaCepData.bairro
          };
        }
      }
    } catch (error) {
      console.error('ViaCEP error:', error);
    }
  }

  const searchStrategies: string[] = [];

  // Clean address - remove "- complemento" parts and extra spaces
  const cleanAddress = address
    .replace(/\s*-\s*[^,]*(?=,)/g, '') // Remove "- complemento" before commas
    .replace(/\s+/g, ' ')
    .trim();

  // Parse address parts: "Rua X, 123, Bairro, Cidade - UF"
  const parts = cleanAddress.split(',').map(p => p.trim()).filter(p => p && !p.includes('CEP:'));

  // Extract city and state from "Cidade - UF" pattern at the end
  const cityStateMatch = cleanAddress.match(/,\s*([^,]+)\s*-\s*([A-Z]{2})\s*$/i);
  const city = cityStateMatch ? cityStateMatch[1].trim() : cityInfo?.city;
  const state = cityStateMatch ? cityStateMatch[2].trim() : cityInfo?.state;

  // First part is usually the street with number: "Rua X, 123" or "Rua X 123"
  const firstPart = parts[0] || '';

  // Try to extract street name and number
  let street: string | null = null;
  let number: string | null = null;

  // Check if number is in the second part
  if (parts.length > 1 && /^\d+/.test(parts[1])) {
    street = firstPart;
    number = parts[1].match(/^\d+/)?.[0] || null;
  } else {
    // Number might be in the first part: "Rua X, 123" or "Rua X 123"
    const streetNumberMatch = firstPart.match(/^(.+?)\s*,?\s*(\d+)\s*$/);
    if (streetNumberMatch) {
      street = streetNumberMatch[1].trim();
      number = streetNumberMatch[2];
    } else {
      street = firstPart;
    }
  }

  // Extract neighborhood (part before "Cidade - UF")
  let neighborhood: string | null = null;
  if (parts.length >= 3) {
    // Second to last part is usually the neighborhood
    const potentialNeighborhood = parts[parts.length - 2];
    if (potentialNeighborhood && !/^\d+/.test(potentialNeighborhood)) {
      neighborhood = potentialNeighborhood;
    }
  }

  // Use ViaCEP data as fallback
  if (!neighborhood && cityInfo?.neighborhood) {
    neighborhood = cityInfo.neighborhood;
  }
  const finalStreet = street || cityInfo?.street;

  // Special handling for DF addresses (quadras format: Q CSG 20, LOTE 2, etc.)
  const isDF = state === 'DF';
  let quadra: string | null = null;

  if (isDF && finalStreet) {
    // Extract quadra from formats like "Q CSG 20", "QS 01", "QNL 15", etc.
    const quadraMatch = finalStreet.match(/Q\s*([A-Z]{1,4})\s*(\d+)/i);
    if (quadraMatch) {
      quadra = `Quadra ${quadraMatch[1]} ${quadraMatch[2]}`;
    }
  }

  // Strategy 1: For DF - try quadra + neighborhood + city
  if (isDF && quadra && neighborhood) {
    searchStrategies.push(`${quadra}, ${neighborhood}, Brasília, DF, Brasil`);
    // Also try just the quadra identifier
    const simpleQuadra = finalStreet?.match(/Q\s*[A-Z]{1,4}\s*\d+/i)?.[0];
    if (simpleQuadra) {
      searchStrategies.push(`${simpleQuadra}, ${neighborhood}, Brasília, Brasil`);
    }
  }

  // Strategy 2: Full address from ViaCEP (most reliable)
  if (cityInfo?.street && cityInfo.neighborhood && city && state) {
    searchStrategies.push(`${cityInfo.street}, ${cityInfo.neighborhood}, ${city}, ${state}, Brasil`);
  }

  // Strategy 3: Street + neighborhood + city + state
  if (finalStreet && neighborhood && city && state) {
    searchStrategies.push(`${finalStreet}, ${neighborhood}, ${city}, ${state}, Brasil`);
  }

  // Strategy 4: Street + number + city + state
  if (finalStreet && number && city && state) {
    searchStrategies.push(`${finalStreet}, ${number}, ${city}, ${state}, Brasil`);
  }

  // Strategy 5: Street + city + state
  if (finalStreet && city && state) {
    searchStrategies.push(`${finalStreet}, ${city}, ${state}, Brasil`);
  }

  // Strategy 6: Neighborhood + City + State
  if (neighborhood && city && state) {
    searchStrategies.push(`${neighborhood}, ${city}, ${state}, Brasil`);
  }

  // Strategy 7: For DF - try neighborhood as region
  if (isDF && neighborhood) {
    // Remove parentheses content for cleaner search
    const cleanNeighborhood = neighborhood.replace(/\s*\([^)]*\)/g, '').trim();
    if (cleanNeighborhood !== neighborhood) {
      searchStrategies.push(`${cleanNeighborhood}, Brasília, DF, Brasil`);
    }
  }

  // Strategy 8: Just City + State (last resort)
  if (city && state) {
    searchStrategies.push(`${city}, ${state}, Brasil`);
  }

  // Remove duplicates while preserving order
  const uniqueStrategies = [...new Set(searchStrategies)];

  console.log('Geocoding strategies:', uniqueStrategies);
  console.log('Parsed address:', { street: finalStreet, number, neighborhood, city, state });

  for (const searchQuery of uniqueStrategies) {
    try {
      // Use our API proxy to avoid CORS issues
      const encodedQuery = encodeURIComponent(searchQuery);
      const response = await fetch(`/api/geocode?q=${encodedQuery}`);

      if (!response.ok) {
        console.error('Geocoding response not ok:', response.status);
        continue;
      }

      const data = await response.json();

      if (data?.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          console.log('Geocoding success with query:', searchQuery, '-> lat:', lat, 'lon:', lon);
          return { lat, lng: lon };
        }
      } else {
        console.log('No results for query:', searchQuery);
      }
    } catch (error) {
      console.error('Geocoding error for query:', searchQuery, error);
    }
  }

  console.log('Geocoding failed for all strategies');
  return null;
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function LocationMap({
  address,
  cep,
  title,
  showUserLocation = true,
  height = '300px',
  className = '',
  onDistanceCalculated,
}: LocationMapProps) {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  // Normalize CEP to avoid useEffect array size changes
  const normalizedCep = cep || '';

  // Geocode the address
  useEffect(() => {
    async function loadCoordinates() {
      setLoading(true);
      setError(null);

      const coords = await geocodeAddress(address, normalizedCep || undefined);
      if (coords) {
        setCoordinates(coords);
      } else {
        setError('Não foi possível localizar o endereço');
      }
      setLoading(false);
    }

    if (address) {
      loadCoordinates();
    }
  }, [address, normalizedCep]);

  // Get user location
  useEffect(() => {
    if (showUserLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.log('Geolocation error:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [showUserLocation]);

  // Calculate distance when both coordinates are available
  useEffect(() => {
    if (coordinates && userCoordinates) {
      const dist = calculateDistance(userCoordinates, coordinates);
      setDistance(dist);
      if (onDistanceCalculated) {
        onDistanceCalculated(dist);
      }
    }
  }, [coordinates, userCoordinates, onDistanceCalculated]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-sm text-muted-foreground">Carregando mapa...</span>
        </div>
      </div>
    );
  }

  if (error || !coordinates) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center p-4">
          <p className="text-sm text-muted-foreground">{error || 'Localização não disponível'}</p>
          <p className="text-xs text-slate-400 mt-1">{address}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {distance !== null && (
        <div className="mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm text-blue-700">
            <strong>{distance < 1 ? `${Math.round(distance * 1000)} metros` : `${distance.toFixed(1)} km`}</strong> de distância de você
          </span>
        </div>
      )}
      <div className="rounded-lg overflow-hidden border border-slate-200" style={{ height }}>
        <MapContainer
          center={[coordinates.lat, coordinates.lng]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap coords={coordinates} />

          {/* Work location marker */}
          <Marker position={[coordinates.lat, coordinates.lng]} icon={workIcon}>
            <Popup>
              <div className="text-sm">
                {title && <strong className="block mb-1">{title}</strong>}
                <span className="text-muted-foreground">{address}</span>
              </div>
            </Popup>
          </Marker>

          {/* User location marker */}
          {userCoordinates && (
            <Marker position={[userCoordinates.lat, userCoordinates.lng]} icon={userIcon}>
              <Popup>
                <div className="text-sm">
                  <strong>Sua localização</strong>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
        <span className="inline-block w-3 h-3 bg-emerald-500 rounded-full"></span>
        Local de trabalho
        {userCoordinates && (
          <>
            <span className="mx-2">•</span>
            <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
            Sua localização
          </>
        )}
      </p>
    </div>
  );
}

// Simple static map for listing cards
export function StaticLocationBadge({
  address,
  className = ''
}: {
  address: string;
  className?: string;
}) {
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function calculateUserDistance() {
      if (!navigator.geolocation) {
        setLoading(false);
        return;
      }

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 5000,
          });
        });

        const userCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        const workCoords = await geocodeAddress(address);
        if (workCoords) {
          const dist = calculateDistance(userCoords, workCoords);
          setDistance(dist);
        }
      } catch (err) {
        console.log('Could not calculate distance:', err);
      } finally {
        setLoading(false);
      }
    }

    calculateUserDistance();
  }, [address]);

  if (loading) {
    return null;
  }

  if (distance === null) {
    return null;
  }

  return (
    <span className={`text-xs text-blue-600 flex items-center gap-1 ${className}`}>
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      </svg>
      {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
    </span>
  );
}
