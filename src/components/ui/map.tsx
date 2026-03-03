import { useEffect, useState } from 'react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

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

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Geocode address using Google Maps API (via Vercel proxy) + BrasilAPI direct GPS
async function geocodeAddress(address: string, cep?: string): Promise<Coordinates | null> {

  async function fetchGoogleMaps(query: string): Promise<Coordinates | null> {
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.lat !== undefined && data.lng !== undefined) return { lat: data.lat, lng: data.lng };
    } catch { /* silent */ }
    return null;
  }

  // Extract CEP from prop or embedded in address string ("CEP: 71732-040")
  let cleanCep: string | undefined;
  if (cep) {
    const c = cep.replace(/\D/g, '');
    if (c.length === 8) cleanCep = c;
  }
  if (!cleanCep) {
    const m = address.match(/CEP[:\s]+(\d{5}-?\d{3})/i);
    if (m) {
      const c = m[1].replace(/\D/g, '');
      if (c.length === 8) cleanCep = c;
    }
  }

  // Strip CEP suffix before sending to geocoder
  const addressNoCep = address.replace(/,?\s*CEP[:\s]+\d{5}-?\d{3}/i, '').trim();

  // 1. BrasilAPI → GPS direto quando disponível (gratuito, sem chamar Google)
  if (cleanCep) {
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
      if (res.ok) {
        const d = await res.json();
        const lat = parseFloat(d.location?.coordinates?.latitude);
        const lng = parseFloat(d.location?.coordinates?.longitude);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      }
    } catch { /* ignore */ }
  }

  // 2. Google Maps com endereço completo
  return fetchGoogleMaps(addressNoCep);
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

// SVG marker icon as data URI
function markerIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
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
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <Map
            defaultCenter={coordinates}
            defaultZoom={15}
            style={{ height: '100%', width: '100%' }}
            gestureHandling="cooperative"
            disableDefaultUI={false}
            zoomControl={true}
            streetViewControl={false}
            mapTypeControl={false}
            fullscreenControl={false}
          >
            <Marker
              position={coordinates}
              icon={{
                url: markerIcon('#10b981'),
                scaledSize: { width: 32, height: 32, equals: () => false },
                anchor: { x: 16, y: 32, equals: () => false },
              }}
              title={title || address}
            />

            {userCoordinates && (
              <Marker
                position={userCoordinates}
                icon={{
                  url: markerIcon('#3b82f6'),
                  scaledSize: { width: 32, height: 32, equals: () => false },
                  anchor: { x: 16, y: 32, equals: () => false },
                }}
                title="Sua localização"
              />
            )}
          </Map>
        </APIProvider>
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

// Simple static badge for listing cards (no map, just distance)
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
