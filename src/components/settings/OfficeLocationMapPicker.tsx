import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, Loader2, MapPin, Navigation, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

export type OfficeMapLocation = {
  office_lat: number;
  office_lng: number;
  office_radius_m: number;
  office_label: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: OfficeMapLocation;
  onApply: (next: OfficeMapLocation) => void;
};

type NominatimHit = {
  display_name: string;
  lat: string;
  lon: string;
};

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function clampRadius(n: number) {
  if (!Number.isFinite(n)) return 500;
  return Math.min(5000, Math.max(50, Math.round(n)));
}

function MapClickSetter({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapViewSync({
  lat,
  lng,
  radiusM,
}: {
  lat: number;
  lng: number;
  radiusM: number;
}) {
  const map = useMap();
  const last = useRef({ lat, lng, radiusM });

  useEffect(() => {
    const t = window.setTimeout(() => {
      map.invalidateSize();
    }, 80);
    return () => window.clearTimeout(t);
  }, [map]);

  useEffect(() => {
    const moved =
      Math.abs(last.current.lat - lat) > 0.00001 ||
      Math.abs(last.current.lng - lng) > 0.00001 ||
      last.current.radiusM !== radiusM;
    if (!moved) return;
    last.current = { lat, lng, radiusM };
    const zoom = radiusM <= 150 ? 18 : radiusM <= 400 ? 17 : radiusM <= 1000 ? 16 : 15;
    map.setView([lat, lng], Math.max(map.getZoom(), zoom), { animate: true });
  }, [lat, lng, radiusM, map]);

  return null;
}

/**
 * Why: Admins should pick office geofence visually (pin + radius) instead of
 * pasting raw coordinates — fewer errors, clearer check-in boundary.
 */
export function OfficeLocationMapPicker({ open, onOpenChange, value, onApply }: Props) {
  const [draft, setDraft] = useState<OfficeMapLocation>(value);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<NominatimHit[]>([]);
  const [locating, setLocating] = useState(false);
  const searchAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    setSearch(value.office_label || '');
    setHits([]);
  }, [open, value]);

  useEffect(() => {
    return () => {
      searchAbort.current?.abort();
    };
  }, []);

  const center = useMemo(
    () =>
      [
        Number.isFinite(draft.office_lat) ? draft.office_lat : 10.9873855,
        Number.isFinite(draft.office_lng) ? draft.office_lng : 75.9761216,
      ] as [number, number],
    [draft.office_lat, draft.office_lng]
  );

  const setCoords = useCallback((lat: number, lng: number) => {
    setDraft((prev) => ({
      ...prev,
      office_lat: Number(lat.toFixed(8)),
      office_lng: Number(lng.toFixed(8)),
    }));
  }, []);

  async function runSearch(query: string) {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    searchAbort.current?.abort();
    const ac = new AbortController();
    searchAbort.current = ac;
    setSearching(true);
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('format', 'json');
      url.searchParams.set('q', q);
      url.searchParams.set('limit', '6');
      url.searchParams.set('addressdetails', '0');
      const res = await fetch(url.toString(), {
        signal: ac.signal,
        headers: {
          Accept: 'application/json',
        },
      });
      if (!res.ok) throw new Error('Search failed');
      const data = (await res.json()) as NominatimHit[];
      setHits(Array.isArray(data) ? data : []);
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      toast({
        title: 'Place search failed',
        description: 'Try again in a moment, or click the map to drop a pin.',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast({
        title: 'Location unavailable',
        description: 'This browser does not support GPS.',
        variant: 'destructive',
      });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        toast({
          title: 'Location found',
          description: 'Pin moved to your current GPS position.',
        });
      },
      () => {
        setLocating(false);
        toast({
          title: 'Could not get GPS',
          description: 'Allow location access, or pick a point on the map.',
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  function handleApply() {
    const lat = Number(draft.office_lat);
    const lng = Number(draft.office_lng);
    const radius = clampRadius(Number(draft.office_radius_m));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      toast({
        title: 'Invalid coordinates',
        description: 'Pick a valid point on the map.',
        variant: 'destructive',
      });
      return;
    }
    onApply({
      office_lat: Number(lat.toFixed(8)),
      office_lng: Number(lng.toFixed(8)),
      office_radius_m: radius,
      office_label: (draft.office_label || '').trim().slice(0, 120),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[950px] w-[min(95vw,950px)] rounded-2xl p-0 gap-0 overflow-hidden"
        showCloseButton
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            Choose office on map
          </DialogTitle>
          <DialogDescription>
            Search a place, use your GPS, or click the map to drop the check-in pin. The blue
            circle is the allowed Office radius.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-0">
          <div className="col-span-12 lg:col-span-4 border-b lg:border-b-0 lg:border-r border-border/60 p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="map-office-label">Office name</Label>
              <Input
                id="map-office-label"
                value={draft.office_label}
                maxLength={120}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    office_label: e.target.value.slice(0, 120),
                  }))
                }
                placeholder="Wired In Coworks, Kottakkal"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="map-search">Find place</Label>
              <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="map-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void runSearch(search);
                      }
                    }}
                    placeholder="Search address or landmark"
                    className="h-11 rounded-xl pl-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl shrink-0"
                  disabled={searching || search.trim().length < 2}
                  onClick={() => void runSearch(search)}
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
              {hits.length > 0 ? (
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto rounded-xl border border-border/60 p-1">
                  {hits.map((hit) => (
                    <button
                      key={`${hit.lat}-${hit.lon}-${hit.display_name}`}
                      type="button"
                      className="text-left rounded-lg px-2.5 py-2 text-xs hover:bg-muted/70 transition-colors"
                      onClick={() => {
                        const lat = Number(hit.lat);
                        const lng = Number(hit.lon);
                        setCoords(lat, lng);
                        setDraft((prev) => ({
                          ...prev,
                          office_label:
                            prev.office_label.trim() ||
                            hit.display_name.split(',').slice(0, 2).join(',').trim().slice(0, 120),
                        }));
                        setHits([]);
                        setSearch(hit.display_name.split(',').slice(0, 2).join(',').trim());
                      }}
                    >
                      {hit.display_name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-6 space-y-1.5">
                <Label className="text-xs">Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={draft.office_lat}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      office_lat: Number(e.target.value),
                    }))
                  }
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="col-span-6 space-y-1.5">
                <Label className="text-xs">Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={draft.office_lng}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      office_lng: Number(e.target.value),
                    }))
                  }
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="col-span-12 space-y-1.5">
                <Label className="text-xs">Radius (meters)</Label>
                <Input
                  type="number"
                  min={50}
                  max={5000}
                  step={10}
                  inputMode="numeric"
                  value={draft.office_radius_m}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    const next = digits === '' ? 0 : Number(digits.slice(0, 4));
                    setDraft((prev) => ({
                      ...prev,
                      office_radius_m: Math.min(5000, next),
                    }));
                  }}
                  className="h-10 rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">
                  Recommended 200–500 m · Range 50–5000 m
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-xl"
              disabled={locating}
              onClick={useMyLocation}
            >
              {locating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4 mr-2" />
              )}
              Use my current location
            </Button>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Tip: click anywhere on the map to move the pin. Drag the marker for fine
              adjustments.
            </p>
          </div>

          <div className="col-span-12 lg:col-span-8 relative min-h-[360px] h-[min(58vh,520px)] bg-muted/30">
            {open ? (
              <MapContainer
                center={center}
                zoom={17}
                className="h-full w-full z-0"
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapViewSync
                  lat={center[0]}
                  lng={center[1]}
                  radiusM={clampRadius(draft.office_radius_m)}
                />
                <MapClickSetter onPick={setCoords} />
                <Circle
                  center={center}
                  radius={clampRadius(draft.office_radius_m)}
                  pathOptions={{
                    color: '#0284c7',
                    fillColor: '#38bdf8',
                    fillOpacity: 0.18,
                    weight: 2,
                  }}
                />
                <Marker
                  position={center}
                  icon={markerIcon}
                  draggable
                  eventHandlers={{
                    dragend: (e) => {
                      const m = e.target as L.Marker;
                      const { lat, lng } = m.getLatLng();
                      setCoords(lat, lng);
                    },
                  }}
                />
              </MapContainer>
            ) : null}
            <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-xl border border-border/60 bg-background/90 backdrop-blur px-3 py-1.5 text-[11px] font-medium shadow-sm flex items-center gap-1.5">
              <Crosshair className="h-3.5 w-3.5 text-sky-600" />
              {center[0].toFixed(5)}, {center[1].toFixed(5)} · {clampRadius(draft.office_radius_m)} m
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-4 border-t border-border/60 gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" className="rounded-xl h-11" onClick={handleApply}>
            Use this location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type PreviewProps = {
  lat: number;
  lng: number;
  radiusM: number;
  className?: string;
};

/** Compact read-only map preview for the Settings card. */
export function OfficeLocationMapPreview({ lat, lng, radiusM, className }: PreviewProps) {
  const center = useMemo(
    () =>
      [
        Number.isFinite(lat) ? lat : 10.9873855,
        Number.isFinite(lng) ? lng : 75.9761216,
      ] as [number, number],
    [lat, lng]
  );
  const radius = clampRadius(radiusM);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border/60 h-44 sm:h-52',
        className
      )}
    >
      <MapContainer
        key={`preview-${center[0].toFixed(5)}-${center[1].toFixed(5)}-${radius}`}
        center={center}
        zoom={radius <= 200 ? 17 : 16}
        className="h-full w-full z-0"
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Circle
          center={center}
          radius={radius}
          pathOptions={{
            color: '#0284c7',
            fillColor: '#38bdf8',
            fillOpacity: 0.2,
            weight: 2,
          }}
        />
        <Marker position={center} icon={markerIcon} />
      </MapContainer>
    </div>
  );
}
