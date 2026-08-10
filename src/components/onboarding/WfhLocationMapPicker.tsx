import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { Loader2, MapPin, Navigation, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import "leaflet/dist/leaflet.css";

export type WfhMapPoint = {
  latitude: number;
  longitude: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: WfhMapPoint | null;
  onApply: (next: WfhMapPoint) => void;
};

type NominatimHit = {
  display_name: string;
  lat: string;
  lon: string;
};

const DEFAULT_CENTER: [number, number] = [10.9873855, 75.9761216];

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapClickSetter({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapViewSync({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const last = useRef({ lat, lng });

  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(t);
  }, [map]);

  useEffect(() => {
    const moved =
      Math.abs(last.current.lat - lat) > 0.00001 ||
      Math.abs(last.current.lng - lng) > 0.00001;
    if (!moved) return;
    last.current = { lat, lng };
    map.setView([lat, lng], Math.max(map.getZoom(), 16), { animate: true });
  }, [lat, lng, map]);

  return null;
}

/**
 * Why: Employees may set WFH from a map pin (not only GPS) so verification
 * matches their actual home even when geolocation is denied or inaccurate.
 */
export function WfhLocationMapPicker({ open, onOpenChange, value, onApply }: Props) {
  const [draft, setDraft] = useState<WfhMapPoint>(
    value ?? { latitude: DEFAULT_CENTER[0], longitude: DEFAULT_CENTER[1] }
  );
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<NominatimHit[]>([]);
  const [locating, setLocating] = useState(false);
  const searchAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(
      value ?? { latitude: DEFAULT_CENTER[0], longitude: DEFAULT_CENTER[1] }
    );
    setSearch("");
    setHits([]);
  }, [open, value]);

  useEffect(() => {
    return () => searchAbort.current?.abort();
  }, []);

  const center = useMemo(
    () =>
      [
        Number.isFinite(draft.latitude) ? draft.latitude : DEFAULT_CENTER[0],
        Number.isFinite(draft.longitude) ? draft.longitude : DEFAULT_CENTER[1],
      ] as [number, number],
    [draft.latitude, draft.longitude]
  );

  const setCoords = useCallback((lat: number, lng: number) => {
    setDraft({
      latitude: Number(lat.toFixed(8)),
      longitude: Number(lng.toFixed(8)),
    });
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
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "json");
      url.searchParams.set("q", q);
      url.searchParams.set("limit", "6");
      url.searchParams.set("addressdetails", "0");
      const res = await fetch(url.toString(), {
        signal: ac.signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Search failed");
      const data = (await res.json()) as NominatimHit[];
      setHits(Array.isArray(data) ? data : []);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      toast({
        title: "Place search failed",
        description: "Try again, or click the map to drop a pin.",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast({
        title: "Location unavailable",
        description: "This browser does not support GPS.",
        variant: "destructive",
      });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        toast({ title: "Location found", description: "Pin moved to your GPS position." });
      },
      () => {
        setLocating(false);
        toast({
          title: "Could not get GPS",
          description: "Allow location access, or pick a point on the map.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  function handleApply() {
    const lat = Number(draft.latitude);
    const lng = Number(draft.longitude);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      toast({
        title: "Invalid coordinates",
        description: "Pick a valid point on the map.",
        variant: "destructive",
      });
      return;
    }
    onApply({
      latitude: Number(lat.toFixed(8)),
      longitude: Number(lng.toFixed(8)),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[950px] w-[min(95vw,950px)] rounded-2xl p-0 gap-0 overflow-hidden z-[1100]"
        overlayClassName="z-[1100]"
        showCloseButton
        onInteractOutside={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Choose WFH location on map
          </DialogTitle>
          <DialogDescription>
            Search a place, use GPS, or click the map to drop your home pin.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-0">
          <div className="col-span-12 lg:col-span-4 border-b lg:border-b-0 lg:border-r border-border/60 p-4 flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="wfh-map-search">Find place</Label>
              <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="wfh-map-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
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
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
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
                        setCoords(Number(hit.lat), Number(hit.lon));
                        setHits([]);
                        setSearch(hit.display_name.split(",").slice(0, 2).join(",").trim());
                      }}
                    >
                      {hit.display_name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <Button
              type="button"
              variant="secondary"
              className="rounded-xl w-full"
              onClick={useMyLocation}
              disabled={locating}
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Navigation className="h-4 w-4 mr-2" />
              )}
              Use my current location
            </Button>

            <div className="rounded-xl border bg-muted/30 p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Selected coordinates</p>
              <p className="font-medium text-foreground break-all">
                {draft.latitude.toFixed(6)}, {draft.longitude.toFixed(6)}
              </p>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8 h-[320px] sm:h-[420px]">
            {open ? (
              <MapContainer
                center={center}
                zoom={15}
                className="h-full w-full"
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickSetter onPick={setCoords} />
                <MapViewSync lat={center[0]} lng={center[1]} />
                <Marker position={center} icon={markerIcon} />
              </MapContainer>
            ) : null}
          </div>
        </div>

        <DialogFooter className="px-5 py-4 border-t border-border/60 gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" className="rounded-xl" onClick={handleApply}>
            Use this location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
