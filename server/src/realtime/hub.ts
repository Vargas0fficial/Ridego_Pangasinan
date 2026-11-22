import type { Server } from 'socket.io';

let io: Server | null = null;

export const setIO = (server: Server): void => {
  io = server;
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket server is not ready yet');
  return io;
};

/** riderId -> the ride they are currently driving. Used to relay GPS pings without touching the database. */
export const riderRides = new Map<string, { rideId: string; token: string }>();

export const joinRideRoom = (userId: string, rideId: string): void => {
  getIO().in('user:' + userId).socketsJoin('ride:' + rideId);
};

export const leaveRideRoom = (userId: string, rideId: string): void => {
  getIO().in('user:' + userId).socketsLeave('ride:' + rideId);
};
