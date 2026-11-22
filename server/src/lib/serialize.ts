import { ratingOf } from '../models/User';

type View = 'passenger' | 'rider';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Shape a populated, lean ride document for one side of the trip. Passengers see the PIN, riders do not. */
export function serializeRide(r: any, view: View) {
  const live = ['accepted', 'arrived', 'ongoing'].includes(r.status);
  const p = r.passenger;
  const d = r.rider;
  return {
    id: String(r._id),
    status: r.status,
    pickup: r.pickup,
    dropoff: r.dropoff,
    distanceKm: r.distanceKm,
    durationMin: r.durationMin,
    fare: r.fare,
    serviceFee: r.serviceFee,
    riderEarning: r.riderEarning,
    paymentMethod: r.paymentMethod,
    geometry: r.geometry ?? [],
    approach:
      r.approach && r.approach.geometry && r.approach.geometry.length
        ? { geometry: r.approach.geometry, distanceKm: r.approach.distanceKm, durationMin: r.approach.durationMin }
        : null,
    pin: view === 'passenger' && ['accepted', 'arrived'].includes(r.status) ? r.pin : undefined,
    shareToken: view === 'passenger' ? r.shareToken : undefined,
    passenger: p
      ? { id: String(p._id), name: p.name, rating: ratingOf(p), phone: view === 'rider' && live ? p.phone : undefined }
      : null,
    rider: d
      ? {
          id: String(d._id),
          name: d.name,
          rating: ratingOf(d),
          phone: view === 'passenger' && live ? d.phone : undefined,
          vehicle: d.vehicle ? { model: d.vehicle.model, plate: d.vehicle.plate, color: d.vehicle.color } : null,
          completedRides: d.completedRides ?? 0,
        }
      : null,
    riderLocation: view === 'passenger' && live && d && d.lat != null && d.lng != null ? { lat: d.lat, lng: d.lng } : null,
    messages: (r.messages ?? []).map((m: any) => ({ from: m.from, text: m.text, at: m.at })),
    times: {
      requested: r.times?.requested,
      accepted: r.times?.accepted,
      arrived: r.times?.arrived,
      started: r.times?.started,
      completed: r.times?.completed,
      cancelled: r.times?.cancelled,
    },
    cancelledBy: r.cancelledBy,
    rated: { passenger: !!r.ratings?.byPassenger?.stars, rider: !!r.ratings?.byRider?.stars },
  };
}

/** Public subset for the shareable trip link. No names beyond the rider's first name, no phone numbers. */
export function serializeTrack(r: any, loc?: { lat: number; lng: number }) {
  const d = r.rider;
  return {
    status: r.status,
    pickup: r.pickup,
    dropoff: r.dropoff,
    geometry: r.geometry ?? [],
    approach: r.approach && r.approach.geometry ? r.approach.geometry : [],
    rider: d
      ? {
          firstName: String(d.name).split(' ')[0],
          vehicle: d.vehicle ? { model: d.vehicle.model, plate: d.vehicle.plate, color: d.vehicle.color } : null,
        }
      : null,
    riderLocation: loc ?? (d && d.lat != null && d.lng != null ? { lat: d.lat, lng: d.lng } : null),
    startedAt: r.times?.started ?? null,
  };
}
