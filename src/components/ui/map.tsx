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

// Geocode address using Nominatim (OpenStreetMap)
async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    const encodedAddress = encodeURIComponent(address + ', Brasil');
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          'User-Agent': 'PlataformaSAMA/1.0',
        },
      }
    );
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
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

  // Geocode the address
  useEffect(() => {
    async function loadCoordinates() {
      setLoading(true);
      setError(null);

      const coords = await geocodeAddress(address);
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
  }, [address]);

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
