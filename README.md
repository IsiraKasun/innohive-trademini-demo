# Trading Mini Competition Dashboard

Monorepo with separate **frontend** and **backend** folders implementing a live trading competition dashboard with authentication, competitions, and real-time leaderboards.

---

## 1. Project Structure & Architecture

- **Root**
  - `backend/` – Java Spring Boot API + WebSocket server, backed by a relational database.
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

`backend/src/main/java/com/innohive/backendjava`

- **`TradeMiniBackend.java`**
  - Spring Boot main application class.
  - Enables scheduling for background tasks.

- **`web/`**
  - `AuthController.java` – `/api/auth/register`, `/api/auth/login` endpoints for registration and login.
  - `CompetitionController.java` – `/api/competitions` listing, `/api/competitions/{id}/join`, `/api/competitions/{id}/participants`, `/api/competitions/joined`.

- **`security/`**
  - JWT-based authentication and authorization (filters, security configuration, token service).

- **`model/`, `repository/`**
  - JPA entities and Spring Data repositories for users, competitions, and participants.

- **`websocket/`**
  - `WebSocketConfig.java` and handlers exposing `/ws` for real-time leaderboard updates.

`backend/src/main/resources`

- Spring Boot configuration (e.g. database connection, JWT secret, CORS) and any other resource files.

## 2. Setup Instructions

### 2.1 Backend – Development (Java)

```bash
cd backend
mvn spring-boot:run
```

- Starts the Spring Boot server on **http://localhost:4000** by default (or the port configured in `application.properties`).
- REST API is available under `http://localhost:4000/api`.
- WebSocket endpoint is exposed at `ws://localhost:4000/ws`.

Typical configuration properties (via `backend/src/main/resources/application.properties` or environment variables):

- `server.port` – server port (default: `4000`).
- Database URL/credentials (e.g. PostgreSQL).
- JWT secret key for token signing.
  
> **Important:** Before starting the backend in development, ensure your local `application.yml` (or `application.properties`) points to the correct database (e.g. Supabase) with valid credentials. Do not commit real secrets to the repository.

### 2.2 Backend – Production (Java)

Build and run the Spring Boot jar:

```bash
cd backend
mvn clean package
java -jar target/backend-java-0.0.1-SNAPSHOT.jar
```

You can run the backend behind a reverse proxy (Nginx/Traefik) and configure HTTPS there.
When deploying to production, configure database credentials and other sensitive values via environment variables or a secure configuration mechanism rather than committing them directly to `application.yml`.

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

3. **Protected routes (frontend + backend)**
   - `router.tsx` wraps `Dashboard` and `CompetitionLeaderboard` with `ProtectedRoute`.
   - `ProtectedRoute` checks for a non-null `token` from `useAuth` and redirects unauthenticated users to `/login`.
   - On the backend, competition-related endpoints now require a valid JWT in the `Authorization: Bearer <token>` header (see section 5).

4. **Logout**
   - In `App.tsx`, clicking **Logout** calls `logout()` from `useAuth`, which clears token/username from state and `localStorage`, then navigates back to `/login`.

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

## 4. Frontend–Backend Communication

### 4.1 REST API (HTTP)

The frontend uses Axios (`services/api.ts`) with a base URL `API_BASE` to call the backend.

- All requests are JSON (`Content-Type: application/json`).
- Primary flows (Java backend):
  - Auth (`POST /api/auth/register`, `POST /api/auth/login`).
  - Competitions listing (`GET /api/competitions`).
  - Join competition (`POST /api/competitions/{id}/join`).
  - Fetch competitions joined by user (`GET /api/competitions/joined`).
  - Fetch participants for a competition (`GET /api/competitions/{id}/participants`).

### 4.2 WebSocket (real-time)

- `useWebSocket` creates a single shared `WebSocket` connection per browser session to `ws://<API_HOST>:<PORT>/ws`.
- The Spring WebSocket handler pushes leaderboard updates for competitions to all connected clients.
- `Dashboard.tsx` and `CompetitionLeaderboard.tsx` subscribe and update local state to keep leaderboards in sync.

---

## 5. API Endpoints

All endpoints are relative to the backend base URL, e.g. `http://localhost:4000` in development.

### 5.1 Auth

- **POST `/api/auth/register`**
  - **Body**: `{ username, password, firstName, lastName }`.
  - **Validations**:
    - Required fields: `username`, `password`, `firstName`, `lastName`.
    - Unique username.
  - **Response (success)**: `{ token, username, firstName, lastName }` (JWT signed by the backend).
  - **Response (error)**: `{ errors: { field: message, ... } }` with status 400.

- **POST `/api/auth/login`**
  - **Body**: `{ username, password }`.
  - Validates credentials against the database (hashed passwords).
  - **Response (success)**: `{ token, username, firstName, lastName }`.
  - **Response (error)**: `{ message: 'invalid credentials' }` (401) or `{ message: 'username and password required' }` (400).

### 5.2 Competitions & participants

- **GET `/api/competitions`**
  - Returns a list of competitions:
  - `{ competitions: [{ id, name, entryFee, prizePool, participants, startAt, endAt }] }`.
  - `participants` is derived from the number of participants in the database.

- **POST `/api/competitions/{id}/join`**
  - **Auth**: requires a valid JWT (`Authorization: Bearer <token>`).
  - Adds the authenticated user as a participant in the competition if not already present.
  - **Response**: `{ success: true, participants: number }`.

- **GET `/api/competitions/{id}/participants`**
  - Returns participants of a competition:
  - `{ id, name, participants: [{ username, firstName, lastName, roi, joinedAt }, ...] }`.

- **GET `/api/competitions/joined`**
  - **Auth**: requires a valid JWT (`Authorization: Bearer <token>`).
  - Returns IDs of competitions the authenticated user has joined:
    - `{ competitionIds: string[] }`.

## 6. Data & Persistence

The Java backend uses a relational database (e.g. PostgreSQL) via Spring Data JPA.

- **Competitions**
  - Stored as `Competition` entities with fields such as `id`, `name`, `entryFee`, `prizePool`, `startDate`, `endDate`.
- **Users**
  - Stored as `User` entities with hashed passwords and profile metadata.
- **Participants**
  - Stored as `Participant` entities linking users to competitions with fields like `roi` and `joinedAt`.

Database connection and credentials are configured via Spring Boot properties.

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
  - Java 21.
  - Spring Boot – HTTP server, routing, application configuration.

- **Data & persistence**
  - Spring Data JPA – repositories and entity mapping.
  - Relational database such as PostgreSQL.

- **Real-time**
  - Spring WebSocket – WebSocket endpoint at `/ws` for leaderboard updates.

- **Auth & security**
  - Spring Security – authentication and authorization.
  - JWT-based tokens for stateless auth.

- **Scheduling**
  - Spring’s scheduling support for background tasks.

## 8. Notes on the Implementation Approach

- **Monorepo structure** keeps frontend and backend together while still clearly separated into `frontend/` and `backend/` folders.
- **Frontend approach** focuses on:
  - Clean separation of pages vs. reusable components.
  - Hooks (`useAuth`, `useTheme`, `useWebSocket`) to isolate and reusing concerns.
  - A themed layout with shared header/footer and consistent styling across pages.
  - A mobile-responsive layout leveraging Tailwind’s responsive utilities to adapt dashboards and tables across screen sizes.
- **Backend approach** focuses on:
  - Clear, small set of REST endpoints that match the frontend flows, implemented with Spring Boot.
  - A relational data model for users, competitions, and participants via Spring Data JPA.
  - A WebSocket endpoint that continuously drives a dynamic leaderboard.
  - Supabase is used as the backing PostgreSQL database, managed via Spring Data JPA.
  - Spring’s scheduling abstraction is used to periodically evaluate and update competition status based on the current time.
- **Communication design** keeps the REST API responsible for CRUD operations and initial data, while WebSocket is used exclusively for live score streaming, making the UI feel responsive.
