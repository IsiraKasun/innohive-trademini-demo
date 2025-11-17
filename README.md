# Trading Mini Competition Dashboard

Monorepo with separate **frontend** and **backend** folders implementing a live trading competition dashboard with authentication, competitions, and real-time leaderboards.

---

## 1. Project Structure & Architecture

- **Root**
  - `backend/` – Node/Express API + WebSocket server, dummy data in JSON files.
  - `frontend/` – React + Vite SPA consuming the API and WebSocket.

### 1.1 Frontend folder organization

`frontend/src`

- **`App.tsx`**
  - Root layout: header, theme toggle, auth-aware nav, main content, footer.
  - Wraps routed pages via `Outlet`.

- **`router.tsx`**
  - Defines routes using `react-router-dom`:
    - `/login`, `/register` – public.
    - `/dashboard`, `/dashboard/leaderboard/:id` – behind a `ProtectedRoute` that checks auth token.

- **`pages/`**
  - `Login.tsx` – background + layout; renders `LoginForm`.
  - `Register.tsx` – background + layout; renders `RegisterForm`.
  - `Dashboard.tsx` – competitions list, join flow, live mini-leaderboards.
  - `CompetitionLeaderboard.tsx` – full leaderboard for a specific competition.

- **`components/`**
  - `LoginForm.tsx` – login form, calls `/login`, stores token via `useAuth`, redirects to dashboard.
  - `RegisterForm.tsx` – registration form with validation and password strength meter, calls `/register`.
  - `CompetitionCard.tsx` – summary card for each competition (entry fee, participants, prize breakdown).
  - `CompetitionModal.tsx` – detailed competition view + join button + current top 5 traders.
  - `Leaderboard.tsx` – top 3 cards + paginated table, updated by WebSocket.
  - `StatusCountdown.tsx` – “Starts in / Ends in” countdown badge.
  - `Loader.tsx` – loading spinner for buttons and pages.

- **`hooks/`**
  - `useAuth.tsx` – auth context: stores JWT token and username in `localStorage`, exposes `login` / `logout` / current `token` / `username`.
  - `useTheme.tsx` – theme context: `light` / `dark` theme, persisted in `localStorage`, toggles a `theme-dark` class on `<html>`.
  - `useWebSocket.ts` – shared WebSocket connection to the backend, broadcasts score updates to subscribers.

- **`services/`**
  - `api.ts` – Axios client pointing to `VITE_API_BASE` (or `http://localhost:4000` by default). Wraps auth and competition endpoints.
  - `ws.ts` – WebSocket URL factory and types for score update messages.

- **Styling & assets**
  - `index.css` – Tailwind base + custom CSS variables for light/dark themes, layout helpers, and utility classes (`.app-header`, `.app-main`, `.card`, `.input`, `.menu-title`, etc.).
  - `assets/img/background-light.png`, `background-dark.png` – background images for auth pages, chosen based on theme.

### 1.2 Backend folder organization

`backend/src`

- **`server.js`**
  - Express app with JSON body parsing and CORS.
  - REST API endpoints (auth, competitions, join, leaderboard).
  - WebSocket server (via `ws`) pushing regular score updates.
  - In-memory store of competitions loaded from JSON, with scheduling relative to server start time.

`backend/data`

- `competitions.json` – dummy competitions and initial traders with scores.
- `users.json` – registered users with hashed passwords and profile metadata.

---

## 2. Setup Instructions

### 2.1 Backend – Development

```bash
cd backend
npm install
npm start
```

- Starts an Express server on **http://localhost:4000**.
- REST API is available on `http://localhost:4000`.
- WebSocket server listens on `ws://localhost:4000`.

Environment variables (optional):

- `PORT` – server port (default: `4000`).
- `JWT_SECRET` – secret for signing JWTs (default: `innohive`).

### 2.2 Backend – Production

Typical Node production run:

```bash
cd backend
npm install --production
PORT=4000 JWT_SECRET="your-strong-secret" node src/server.js
```

You can run the backend behind a reverse proxy (Nginx/Traefik) and configure HTTPS there. Persistent data is stored in `backend/data` (see section 5).

### 2.3 Frontend – Development

```bash
cd frontend
npm install
npm run dev
```

- Runs the Vite dev server on **http://localhost:5173**.
- Expects the backend at `http://localhost:4000` by default.

Configurable via `.env` in `frontend`:

```bash
VITE_API_BASE=http://localhost:4000
```

### 2.4 Frontend – Production

Build the static assets:

```bash
cd frontend
npm install
npm run build
```

This generates a production bundle in `frontend/dist`. Serve it using:

- `npm run preview` (Vite preview server), **or**
- Any static file server (Nginx, Netlify, Vercel, S3, etc.).

Ensure the frontend can reach the backend by setting `VITE_API_BASE` to your deployed API URL before building.

---

## 3. Application Flow

### 3.1 Auth flow

1. **Registration**
   - User opens `/register`.
   - Fills personal details, email, username, password, and date of birth.
   - Frontend validates fields, password strength, and confirm-password match.
   - On submit, `RegisterForm` calls `register()` from `services/api.ts` (`POST /register`).
   - On success, backend returns `{ token, username }`. `useAuth` stores token + username in `localStorage` and navigates to `/dashboard`.

2. **Login**
   - User opens `/login`.
   - `LoginForm` calls `login()` from `services/api.ts` (`POST /login`).
   - On success, `useAuth` stores token + username and redirects to `/dashboard`.

3. **Protected routes**
   - `router.tsx` wraps `Dashboard` and `CompetitionLeaderboard` with `ProtectedRoute`.
   - `ProtectedRoute` checks for a non-null `token` from `useAuth`.
   - If not authenticated, user is `Navigate`d to `/login`.

4. **Logout**
   - In `App.tsx`, clicking **Logout** calls `logout()` from `useAuth`, which clears token/username from state and `localStorage`, then navigates back to `/login`.

> Note: Authentication tokens are used mainly for client-side gating; the backend endpoints do not yet enforce JWT validation. This keeps the focus on UX and real-time behaviour rather than full access control.

### 3.2 Dashboard and competitions flow

1. **Dashboard initial load**
   - `Dashboard.tsx` fetches competitions via `fetchCompetitions()` (`GET /competitions`).
   - Also calls `fetchJoinedCompetitions(username)` (`POST /my-competitions`) to show which competitions the current user joined.
   - User can filter competitions using a search input on the dashboard.

2. **Joining a competition**
   - From `CompetitionCard` or `CompetitionModal`, user triggers a join action.
   - A small join flow is implemented:
     - If unauthenticated, a toast prompts login.
     - Otherwise, a “joining” popup with a progress bar simulates processing.
     - Then `joinCompetition(id, username)` (`POST /join`) is called.
   - Backend adds the user to the competition’s `traders` array and persists it back to `competitions.json`.

3. **Viewing a leaderboard**
   - From a competition, user can open the **Leaderboard** page: `/dashboard/leaderboard/:id`.
   - `CompetitionLeaderboard.tsx` loads the initial leaderboard via `GET /competitions/:id/leaderboard`.
   - `useWebSocket` subscribes to the shared WebSocket and updates the leaderboard in real time.
   - `Leaderboard.tsx` renders:
     - A highlighted **Champion** card for rank 1.
     - Smaller cards for ranks 2 and 3.
     - A paginated table for ranks 4+.

### 3.3 Theme and layout

- `useTheme` stores the current theme (`light` / `dark`) in `localStorage` and toggles a `theme-dark` class on `<html>`.
- `index.css` defines CSS variables for both light and dark themes (backgrounds, card colors, menu titles, etc.).
- Login/Register pages choose `background-light.png` or `background-dark.png` based on the current theme.

---

## 4. Frontend–Backend Communication

### 4.1 REST API (HTTP)

The frontend uses Axios (`services/api.ts`) with a base URL `API_BASE` to call the backend.

- All requests are JSON (`Content-Type: application/json`).
- Primary flows:
  - Auth (`/login`, `/register`).
  - Competitions listing (`/competitions`).
  - Join competition (`/join`).
  - Fetch competitions joined by user (`/my-competitions`).
  - Fetch specific leaderboard (`/competitions/:id/leaderboard`).

### 4.2 WebSocket (real-time)

- `useWebSocket` creates a single shared `WebSocket` connection per browser session to `ws://<API_HOST>:<PORT>`.
- On connection, backend sends **snapshot** messages for each competition:
  - `{ type: 'snapshot', competitionId, traders: [{ name, score }, ...] }`.
- Every few seconds, backend randomly adjusts trader scores and broadcasts **score_update** messages:
  - `{ type: 'score_update', competitionId, updates: [{ name, score }, ...] }`.
- `useWebSocket` fans out each parsed `ScoreUpdate` to all subscribers.
- `Dashboard.tsx` and `CompetitionLeaderboard.tsx` subscribe and update local state to keep leaderboards in sync.

---

## 5. API Endpoints

All endpoints are relative to the backend base URL, e.g. `http://localhost:4000` in development.

### 5.1 Auth

- **POST `/register`**
  - **Body**: `{ username, password, firstName, lastName, email, dob }`.
  - **Validations**:
    - Required fields: `username`, `password`, `firstName`, `lastName`, `email`, `dob`.
    - Email format.
    - Min password length 6.
    - Unique username and email.
  - **Response (success)**: `{ token, username }` (JWT signed with `JWT_SECRET`).
  - **Response (error)**: `{ errors: { field: message, ... } }` with status 400.

- **POST `/login`**
  - **Body**: `{ username, password }`.
  - Validates credentials against `users.json` (bcrypt password hash).
  - **Response (success)**: `{ token, username }`.
  - **Response (error)**: `{ message: 'invalid credentials' }` (401) or `{ message: 'username and password required' }` (400).

### 5.2 Competitions & leaderboards

- **GET `/competitions`**
  - Returns a list of competitions:
    - `{ competitions: [{ id, name, entryFee, prizePool, participants, startAt, endAt }] }`.
  - `participants` is derived from the number of traders.

- **POST `/my-competitions`**
  - **Body**: `{ username }`.
  - Returns IDs of competitions the user has joined:
    - `{ competitionIds: string[] }`.

- **POST `/join`**
  - **Body**: `{ competitionId, username }`.
  - Adds the user as a trader with initial score `0` if not already present.
  - Persists updated competitions back to `backend/data/competitions.json`.
  - **Response**: `{ success: true, participants: number }`.

- **GET `/competitions/:id/leaderboard`**
  - Returns the sorted leaderboard for a competition:
  - `{ id, name, traders: [{ name, score }, ...] }` sorted by `score` descending.

---

## 6. Dummy Data & Persistence

### 6.1 Competitions and traders (`backend/data/competitions.json`)

- Contains an array of competitions with:
  - `id`, `name`, `entryFee`, `prizePool`.
  - `traders`: list of dummy traders with initial scores (positive/negative) for realistic leaderboards.
- On backend startup:
  - File is loaded into an in-memory `store`.
  - Each competition gets `startAt` and `endAt` computed relative to server start time (some start immediately, others start in 1 hour or 1 day).
- When a user joins a competition:
  - Backend pushes `{ name: username, score: 0 }` into the competition’s `traders` array.
  - Entire `store` is written back to `competitions.json` so progress survives restarts.

### 6.2 Users (`backend/data/users.json`)

- Created if it does not exist, with structure:
  - `{ users: [{ username, passwordHash, firstName, lastName, email, dob, createdAt }, ...] }`.
- Passwords are hashed using **bcrypt** before being saved.
- Login validates the provided password with `bcrypt.compareSync`.

> This project deliberately uses JSON files as a lightweight persistence layer instead of a database to simplify setup and keep the focus on API design, auth flow, and real-time UI.

---

## 7. Technologies & Libraries

### 7.1 Frontend

- **Framework & tooling**
  - React (with TypeScript).
  - Vite – dev server and bundler.
  - React Router (`react-router-dom`) – SPA routing and protected routes.

- **Styling & UI**
  - Tailwind CSS – utility-first styling.
  - Custom CSS variables for theming (light/dark) and layout (`index.css`).

- **State & context**
  - React Context + hooks for auth (`useAuth`) and theme (`useTheme`).
  - Local component state via React hooks for forms, leaderboards, pagination.

- **Networking & real-time**
  - Axios – HTTP client for REST API (`services/api.ts`).
  - Native `WebSocket` + custom hook (`useWebSocket`) – shared connection and pub/sub for live score updates.

- **UX helpers**
  - `react-hot-toast` – toast notifications for success/error feedback.
  - `framer-motion` – smooth row animation in the leaderboard table.

### 7.2 Backend

- **Runtime & framework**
  - Node.js.
  - Express – HTTP server and routing.

- **Real-time**
  - `ws` – WebSocket server, broadcasting snapshots and score updates.

- **Auth & security**
  - `jsonwebtoken` – JWT creation for login/registration.
  - `bcryptjs` – password hashing and verification.

- **Dev & utilities**
  - `cors` – Cross-Origin Resource Sharing.
  - Node core libs: `fs`, `path`, `http`, `url` – JSON data persistence and server wiring.

---

## 8. Notes on the Implementation Approach

- **Monorepo structure** keeps frontend and backend together while still clearly separated into `frontend/` and `backend/` folders.
- **Frontend approach** focuses on:
  - Clean separation of pages vs. reusable components.
  - Hooks (`useAuth`, `useTheme`, `useWebSocket`) to isolate cross-cutting concerns.
  - A themed layout with shared header/footer and consistent styling across pages.
- **Backend approach** focuses on:
  - Clear, small set of REST endpoints that match the frontend flows.
  - Lightweight JSON-based persistence (`competitions.json`, `users.json`) suitable for demos.
  - A simple WebSocket broadcaster that continuously drives a dynamic leaderboard.
- **Communication design** keeps the REST API responsible for CRUD-style operations and initial data, while WebSocket is used exclusively for live score streaming, making the UI feel responsive and “trading-like” without complex infrastructure.
