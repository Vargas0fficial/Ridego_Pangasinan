# RideGo Pangasinan

*Your Ride. Your Way. Pangasinan.* — a real-time, Angkas-style motorcycle ride-hailing web app for Pangasinan.

- **`web/`** — Next.js 15 (App Router) + React 19 + TypeScript + Tailwind. Passenger app, rider app, public live trip link. Leaflet + OpenStreetMap map.
- **`server/`** — Express 4 + Socket.IO 4 + Mongoose 8 (MongoDB) + JWT + zod. REST API, real-time dispatch, chat, live tracking.

Green UI, mobile-first, light/dark. Red is used only for emergency and cancel.

## Run it locally

You need Node 20+ and MongoDB (Docker or Atlas).

```bash
docker compose up -d                 # MongoDB on :27017 (skip if you use Atlas)

# 1) server
cd server
cp .env.example .env                 # set JWT_SECRET; defaults work for local
npm install
npm run seed                         # demo accounts
npm run dev                          # http://localhost:4000

# 2) web (new terminal)
cd web
cp .env.example .env.local           # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                          # http://localhost:3000
```

Demo accounts (password `demo1234`): passenger **09170000001**, riders **09170000002** (Juan Dela Cruz, Honda Click 125) and **09170000003**.

### Try the full real-time flow
1. Window A: log in as the demo rider → **Go Online** (allow location, or pick your town).
2. Window B (incognito): log in as the demo passenger → Book → pick a destination → **Confirm ride**.
3. Window A gets the **New Ride Request** (15 s countdown) → **Accept Ride**.
4. Rider: **Simulate driving (demo)** moves the marker; the passenger sees it live. Then *I've arrived* → enter the passenger's **trip PIN** → *Start trip* → simulate again → *Complete trip*.
5. Both sides rate. Passenger can tap the shield → **Share trip** and open the link in a third window (`/track/<token>`).

## How it works

**Ride states:** `searching → accepted → arrived → ongoing → completed` (also `cancelled`, `no_riders`). A 4-digit trip PIN is shown to the passenger and required to start.

**Fare:** ₱40 base + ₱11.50/km, minimum ₱50, rounded to the nearest ₱5. Service fee 15%; the rider keeps the rest. Service area is limited to Pangasinan; max trip 80 km.

**Dispatch:** riders are offered the ride in waves (5 → 10 → 20 km, up to 10 riders per wave, 15 s per offer). Acceptance is atomic (`findOneAndUpdate`), so only one rider gets it. If a rider cancels, the ride returns to searching and is re-dispatched without them.

**Routing:** server calls the OSRM public demo server, with a straight-line×1.3 estimate as fallback (`source: "estimate"`).

### REST API (all under `/api`, JWT `Authorization: Bearer`)
| | |
|---|---|
| `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /auth/contacts` | accounts, trusted contacts |
| `POST /rides/quote`, `POST /rides` | fare quote, book |
| `GET /rides/active`, `GET /rides/history`, `GET /rides/nearby-riders` | state, history, anonymized nearby riders |
| `POST /rides/:id/accept` · `decline` · `cancel` · `status` · `rate` | ride actions |
| `POST /rider/online`, `GET /rider/offers`, `GET /rider/earnings` | rider |
| `POST /safety/emergency`, `/safety/emergency/:id/cancel`, `/safety/report` | Safety Center |
| `GET /track/:token` | public trip snapshot (no auth) |

### Socket.IO
Auth with `auth: { token }`. Server → client: `ride:update`, `ride:request`, `ride:request:expired`, `ride:request:closed`, `ride:released`, `rider:location`, `chat:message`. Client → server: `rider:location`, `chat:send` (with ack). Public namespace `/track`: `track:join` → `track:update`, `track:location`.

## Deploy
- **Database:** MongoDB Atlas (free tier is fine). Allow your server's IPs.
- **Server → Render / Railway** (needs a long-lived process for WebSockets; Vercel will not work for this part). Root dir `server`, build `npm install && npm run build`, start `npm start`. Env: `MONGODB_URI`, `JWT_SECRET` (long random string), `CLIENT_ORIGIN` (your Vercel URL, comma-separated for several), optional `OSRM_URL`. Health check: `/health`.
- **Web → Vercel.** Root dir `web`. Env: `NEXT_PUBLIC_API_URL` = your server URL (https).

## Honest limitations (read before going live)
- **Not verified against a real database.** The sandbox this was built in had no MongoDB. Server typecheck, unit tests and socket smoke tests pass and the web app builds, but the full booking flow (book → accept → ride → rate) needs a real run on your machine. Expect to fix small bugs.
- **Dispatch state is in memory.** A server restart forgets pending offers; on boot stale `searching` rides are closed. Run a single server instance (scaling out needs Redis or a queue).
- **OSRM demo server** is for light use only. Self-host OSRM or switch to a paid routing API for production.
- **Trusted-contact SMS is a stub** (`server/src/lib/notify.ts` only logs). Plug in an SMS provider (Semaphore, Twilio) before relying on it.
- **Payments are cash only.** No GCash/Maya integration yet.
- Place coordinates for Pangasinan towns/landmarks are approximate; verify before launch. Pinned map locations show as "Pinned location" (no reverse geocoding).
- No admin dashboard, driver verification (license/OR-CR/NBI) or KYC. Those are required for a real ride-hailing service, and LTFRB/local regulations apply.
- Basic hardening only (helmet, CORS, rate-limited auth, zod validation). Do a proper security review before real users.
