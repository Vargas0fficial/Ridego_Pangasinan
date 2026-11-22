'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngT } from '@/lib/types';
import { DEFAULT_CENTER } from '@/lib/places';

export type MapPoint = { lat: number; lng: number };

export type MapViewProps = {
  pickup?: MapPoint | null;
  dropoff?: MapPoint | null;
  route?: LatLngT[] | null;
  approach?: LatLngT[] | null;
  /** Anonymous nearby riders shown to the passenger while booking. */
  riders?: MapPoint[];
  /** The one rider the user is following, or the rider themselves. The camera follows this marker. */
  rider?: MapPoint | null;
  me?: MapPoint | null;
  /** When this changes the map re-fits to the visible points and follow mode turns back on. */
  fitKey?: string;
  /** Extra bottom padding so a sheet does not cover the route or the followed rider. */
  padBottom?: number;
  onTap?: (p: MapPoint) => void;
  interactive?: boolean;
};

const pinIcon = (drop: boolean) => L.divIcon({ className: '', html: `<div class="rg-pin${drop ? ' drop' : ''}"></div>`, iconSize: [30, 30], iconAnchor: [15, 28] });

const SCOOTER =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/><path d="M8 17.5h5l3-9h-3"/><path d="M13 8.5H9"/><path d="M16 8.5l2.5 9"/></svg>';

const riderIcon = (small: boolean) =>
  L.divIcon({ className: 'rg-live', html: `<div class="rg-rider${small ? ' small' : ''}">${SCOOTER}</div>`, iconSize: small ? [28, 28] : [36, 36], iconAnchor: small ? [14, 14] : [18, 18] });

const meIcon = L.divIcon({ className: '', html: '<div class="rg-me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

function Fit({ points, fitKey, padBottom }: { points: MapPoint[]; fitKey: string; padBottom: number }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], Math.max(map.getZoom(), 14), { animate: false });
      // shift the point up so a bottom sheet does not cover it
      if (padBottom > 0) map.panBy([0, padBottom / 2], { animate: false });
      return;
    }
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), {
      paddingTopLeft: [36, 36],
      paddingBottomRight: [36, padBottom + 24],
      maxZoom: 16,
      animate: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);
  return null;
}

/**
 * Keeps the camera on the moving rider. Dragging the map by hand pauses it (see the Recenter button).
 * The first move after follow turns on zooms in to street level; later moves only pan.
 */
function Follow({ pos, active, padBottom, onUserMove }: { pos: MapPoint; active: boolean; padBottom: number; onUserMove: () => void }) {
  const map = useMap();
  const wasActive = useRef(false);
  useMapEvents({ dragstart: onUserMove });

  useEffect(() => {
    if (!active) {
      wasActive.current = false;
      return;
    }
    const justOn = !wasActive.current;
    wasActive.current = true;
    const zoom = justOn ? Math.max(map.getZoom(), 15) : map.getZoom();
    // Aim slightly below the rider so the marker sits in the visible part above the bottom sheet.
    const target = map.unproject(map.project([pos.lat, pos.lng], zoom).add([0, padBottom / 2]), zoom);
    if (justOn) map.setView(target, zoom, { animate: true });
    else map.panTo(target, { animate: true, duration: 0.9, easeLinearity: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos.lat, pos.lng, active, padBottom]);

  return null;
}

/** Keeps Leaflet sized correctly when its container changes (sheet open/close, rotation). */
function Resize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function Taps({ onTap }: { onTap: (p: MapPoint) => void }) {
  useMapEvents({ click: (e) => onTap({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export default function MapView({ pickup, dropoff, route, approach, riders = [], rider, me, fitKey = 'init', padBottom = 0, onTap, interactive = true }: MapViewProps) {
  const [following, setFollowing] = useState(true);
  useEffect(() => setFollowing(true), [fitKey]);

  const points = useMemo(() => {
    const p: MapPoint[] = [];
    if (pickup) p.push(pickup);
    if (dropoff) p.push(dropoff);
    if (rider && (pickup || dropoff)) p.push(rider);
    if (p.length === 0 && me) p.push(me);
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  const smallRider = useMemo(() => riderIcon(true), []);
  const bigRider = useMemo(() => riderIcon(false), []);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
        zoom={13}
        zoomControl={false}
        attributionControl
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        <Resize />
        <Fit points={points} fitKey={fitKey} padBottom={padBottom} />
        {rider && <Follow pos={rider} active={following} padBottom={padBottom} onUserMove={() => setFollowing(false)} />}
        {onTap && <Taps onTap={onTap} />}
        {route && route.length > 1 && (
          <>
            <Polyline positions={route} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.9, lineCap: 'round' }} />
            <Polyline positions={route} pathOptions={{ color: '#0B9A55', weight: 5, opacity: 1, lineCap: 'round' }} />
          </>
        )}
        {approach && approach.length > 1 && <Polyline positions={approach} pathOptions={{ color: '#0A2130', weight: 4, opacity: 0.75, dashArray: '2 9', lineCap: 'round' }} />}
        {riders.map((r, i) => (
          <Marker key={`${r.lat}-${r.lng}-${i}`} position={[r.lat, r.lng]} icon={smallRider} interactive={false} />
        ))}
        {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pinIcon(false)} interactive={false} />}
        {dropoff && <Marker position={[dropoff.lat, dropoff.lng]} icon={pinIcon(true)} interactive={false} />}
        {rider && <Marker position={[rider.lat, rider.lng]} icon={bigRider} zIndexOffset={1000} interactive={false} />}
        {me && <Marker position={[me.lat, me.lng]} icon={meIcon} zIndexOffset={500} interactive={false} />}
      </MapContainer>

      {rider && !following && (
        <button
          className="absolute right-3 top-3 z-[600] flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-bold text-primary-strong shadow-lg"
          onClick={() => setFollowing(true)}
        >
          <LocateFixed size={18} /> Recenter
        </button>
      )}
    </div>
  );
}