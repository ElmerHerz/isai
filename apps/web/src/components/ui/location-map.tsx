import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search } from 'lucide-react';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Input } from './input';
import { Button } from './button';
import { toast } from '@/lib/toast';

// Vite no resuelve las rutas relativas por defecto que usa el ícono de
// Leaflet — hay que apuntarlas a mano a los assets importados, si no el
// marcador sale invisible/roto.
const markerIconDefault = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationMapProps {
  latitude?: number;
  longitude?: number;
  onChange: (coords: { latitude: number; longitude: number }) => void;
}

interface GeocodeResult {
  lat: string;
  lon: string;
  display_name: string;
}

// Centro por defecto cuando todavía no hay coordenadas: San Salvador.
const DEFAULT_CENTER: [number, number] = [13.6929, -89.2182];

// Nominatim (geocoder gratis de OpenStreetMap, sin API key) — solo se llama
// al buscar explícitamente (botón/Enter), nunca en cada tecla, para respetar
// su política de uso (~1 req/seg, sin autocompletado agresivo).
async function geocodeSearch(query: string): Promise<GeocodeResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

function ClickHandler({ onChange }: { onChange: LocationMapProps['onChange'] }) {
  useMapEvents({
    click(e) {
      onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

export function LocationMap({ latitude, longitude, onChange }: LocationMapProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);

  // Number.isFinite (no != null) porque un input numérico a medio escribir
  // (ej. Longitud vacía mientras Latitud ya tiene valor) llega como NaN, no
  // undefined — Leaflet lanza una excepción no capturada con NaN y tumba
  // toda la app si esto no lo filtra antes de renderizar el Marker.
  const hasPosition = Number.isFinite(latitude) && Number.isFinite(longitude);
  const position: [number, number] = useMemo(
    () => (hasPosition ? [latitude!, longitude!] : DEFAULT_CENTER),
    [latitude, longitude, hasPosition],
  );

  const runSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchError(false);

    const searchPromise = geocodeSearch(query);
    toast.promise(searchPromise, {
      loading: 'Buscando dirección...',
      success: (found) =>
        found.length > 0 ? `${found.length} resultado(s) encontrado(s).` : 'No se encontraron resultados.',
      error: 'No se pudo buscar la dirección.',
    });

    try {
      const found = await searchPromise;
      setResults(found);
      if (found.length === 0) setSearchError(true);
    } catch {
      setSearchError(true);
    } finally {
      setIsSearching(false);
    }
  };

  const pickResult = (result: GeocodeResult) => {
    onChange({ latitude: Number(result.lat), longitude: Number(result.lon) });
    setResults([]);
    setQuery(result.display_name);
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="relative border-b p-2">
        <div className="flex gap-2">
          <Input
            className="flex-1"
            placeholder="Buscar dirección (ej. 5a avenida, San Salvador)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runSearch();
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={runSearch} disabled={isSearching}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {searchError && (
          <p className="mt-1 text-xs text-destructive">No se encontraron resultados.</p>
        )}
        {results.length > 0 && (
          <ul className="absolute left-2 right-2 top-full z-[1050] mt-1 max-h-48 overflow-auto rounded-md border bg-popover shadow-md">
            {results.map((result, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => pickResult(result)}
                >
                  {result.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MapContainer
        center={position}
        zoom={hasPosition ? 16 : 12}
        style={{ height: '220px', width: '100%' }}
        // key fuerza a Leaflet a re-centrar cuando el registro cargado trae
        // coordenadas distintas a las del render inicial (ej. al abrir un
        // branch que ya tenía ubicación guardada, o al buscar una dirección).
        key={hasPosition ? `${latitude}-${longitude}` : 'default'}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        {hasPosition && (
          <Marker
            position={position}
            icon={markerIconDefault}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target as L.Marker;
                const { lat, lng } = marker.getLatLng();
                onChange({ latitude: lat, longitude: lng });
              },
            }}
          />
        )}
      </MapContainer>
      <p className="border-t bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
        Busca una dirección, haz clic en el mapa, o arrastra el marcador para ajustarla.
      </p>
    </div>
  );
}
