import type { Place } from './types';

export type KnownPlace = Place & { id: string; sub: string; kind: 'town' | 'poi' };

export const DEFAULT_CENTER = { lat: 16.043, lng: 120.333 };

/** Curated Pangasinan pickup towns and popular destinations. Coordinates are approximate. */
export const PLACES: KnownPlace[] = [
  { id: 'dagupan', label: 'Dagupan City', sub: 'City', lat: 16.043, lng: 120.333, kind: 'town' },
  { id: 'urdaneta', label: 'Urdaneta City', sub: 'City', lat: 15.976, lng: 120.571, kind: 'town' },
  { id: 'alaminos', label: 'Alaminos City', sub: 'City', lat: 16.155, lng: 119.981, kind: 'town' },
  { id: 'lingayen', label: 'Lingayen', sub: 'Provincial capital', lat: 16.022, lng: 120.232, kind: 'town' },
  { id: 'calasiao', label: 'Calasiao', sub: 'Town', lat: 16.011, lng: 120.355, kind: 'town' },
  { id: 'binmaley', label: 'Binmaley', sub: 'Town', lat: 16.034, lng: 120.272, kind: 'town' },
  { id: 'sancarlos', label: 'San Carlos City', sub: 'City', lat: 15.928, lng: 120.349, kind: 'town' },
  { id: 'malasiqui', label: 'Malasiqui', sub: 'Town', lat: 15.919, lng: 120.413, kind: 'town' },
  { id: 'bayambang', label: 'Bayambang', sub: 'Town', lat: 15.811, lng: 120.455, kind: 'town' },
  { id: 'pozorrubio', label: 'Pozorrubio', sub: 'Town', lat: 16.113, lng: 120.541, kind: 'town' },
  { id: 'rosales', label: 'Rosales', sub: 'Town', lat: 15.893, lng: 120.632, kind: 'town' },
  { id: 'smrosales', label: 'SM City Rosales', sub: 'Rosales', lat: 15.8985, lng: 120.6395, kind: 'poi' },
  { id: 'smdagupan', label: 'SM Center Dagupan', sub: 'Dagupan City', lat: 16.0369, lng: 120.3405, kind: 'poi' },
  { id: 'csi', label: 'CSI City Mall Dagupan', sub: 'Dagupan City', lat: 16.0455, lng: 120.3465, kind: 'poi' },
  { id: 'capitol', label: 'Lingayen Capitol', sub: 'Lingayen', lat: 16.0212, lng: 120.2316, kind: 'poi' },
  { id: 'upang', label: 'University of Pangasinan', sub: 'Dagupan City', lat: 16.0462, lng: 120.3398, kind: 'poi' },
  { id: 'downtown', label: 'Dagupan Downtown', sub: 'Dagupan City', lat: 16.0432, lng: 120.3338, kind: 'poi' },
  { id: 'hundred', label: 'Hundred Islands, Alaminos', sub: 'Alaminos City', lat: 16.1946, lng: 119.9807, kind: 'poi' },
];

export const QUICK_DESTINATIONS = ['smdagupan', 'capitol', 'hundred', 'smrosales', 'upang', 'csi']
  .map((id) => PLACES.find((p) => p.id === id))
  .filter((p): p is KnownPlace => !!p);

export const toPlace = (p: KnownPlace): Place => ({ label: p.label, lat: p.lat, lng: p.lng });
