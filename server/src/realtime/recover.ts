import { Ride, WITH_RIDER_STATUSES } from '../models/Ride';
import { riderRides } from './hub';

/** Run once on boot: close searches that lost their in-memory dispatch and rebuild the rider -> ride map. */
export async function recoverState(): Promise<void> {
  const res = await Ride.updateMany(
    { status: 'searching' },
    { $set: { status: 'no_riders', cancelledBy: 'system', 'times.cancelled': new Date() } },
  );
  if (res.modifiedCount) console.log(`[recover] closed ${res.modifiedCount} stale searching ride(s)`);
  const live = await Ride.find({ status: { $in: WITH_RIDER_STATUSES } }).select('rider shareToken');
  for (const r of live) {
    if (r.rider) riderRides.set(String(r.rider), { rideId: String(r._id), token: r.shareToken });
  }
}
