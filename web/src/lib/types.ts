export type Role = 'passenger' | 'rider';
export type LatLngT = [number, number];

export type Vehicle = { model: string; plate: string; color: string };

export type User = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: Role;
  rating: number;
  ratingCount: number;
  vehicle: Vehicle | null;
  isOnline: boolean;
  completedRides: number;
  trustedContacts: { name: string; phone: string }[];
};

export type Place = { label: string; lat: number; lng: number };

export type RideStatus = 'searching' | 'accepted' | 'arrived' | 'ongoing' | 'completed' | 'cancelled' | 'no_riders';

export type ChatMessage = { from: Role; text: string; at: string };

export type Ride = {
  id: string;
  status: RideStatus;
  pickup: Place;
  dropoff: Place;
  distanceKm: number;
  durationMin: number;
  fare: number;
  serviceFee: number;
  riderEarning: number;
  paymentMethod: 'cash' | 'online';
  geometry: LatLngT[];
  approach: { geometry: LatLngT[]; distanceKm: number; durationMin: number } | null;
  pin?: string;
  shareToken?: string;
  passenger: { id: string; name: string; rating: number; phone?: string } | null;
  rider: { id: string; name: string; rating: number; phone?: string; vehicle: Vehicle | null; completedRides: number } | null;
  riderLocation: { lat: number; lng: number } | null;
  messages: ChatMessage[];
  times: { requested?: string; accepted?: string; arrived?: string; started?: string; completed?: string; cancelled?: string };
  cancelledBy?: 'passenger' | 'rider' | 'system';
  rated: { passenger: boolean; rider: boolean };
};

export type Offer = {
  rideId: string;
  expiresAt: number;
  receivedAt: number;
  passenger: { name: string; rating: number };
  pickup: Place;
  dropoff: Place;
  distanceKm: number;
  durationMin: number;
  fare: number;
  riderEarning: number;
  toPickupKm: number;
  geometry: LatLngT[];
};

export type Quote = { distanceKm: number; durationMin: number; fare: number; geometry: LatLngT[]; source: 'osrm' | 'estimate' };

export type Earnings = {
  today: { earnings: number; trips: number };
  week: { date: string; label: string; earnings: number; trips: number }[];
  recent: { id: string; at: string; pickup: string; dropoff: string; distanceKm: number; fare: number; earning: number }[];
};

export type Trip = {
  status: RideStatus;
  pickup: Place;
  dropoff: Place;
  geometry: LatLngT[];
  approach: LatLngT[];
  rider: { firstName: string; vehicle: Vehicle | null } | null;
  riderLocation: { lat: number; lng: number } | null;
  startedAt: string | null;
};
