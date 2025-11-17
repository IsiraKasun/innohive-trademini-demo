import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import fs from "fs";
import path from "path";
import http from "http";
import url from "url";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Basic in-memory store loaded from JSON. In real apps, use a DB.
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "../data/competitions.json");
let raw = fs.readFileSync(dataPath, "utf-8");
let store = JSON.parse(raw);

// Competition scheduling based on server start time
const serverStartMs = Date.now();
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

store.competitions = store.competitions.map((c, index) => {
  let offset = 0;
  if (index === 1) offset = HOUR_MS; // 2nd competition starts after 1 hour
  if (index === 2) offset = DAY_MS; // 3rd competition starts after 1 day

  const startAt = new Date(serverStartMs + offset).toISOString();
  const endAt = new Date(serverStartMs + offset + DAY_MS).toISOString(); // each runs for 1 day

  return { ...c, startAt, endAt };
});

// Users persistence file
const usersPath = path.join(__dirname, "../data/users.json");
if (!fs.existsSync(usersPath)) {
  fs.writeFileSync(usersPath, JSON.stringify({ users: [] }, null, 2));
}

function loadUsers() {
  try {
    const txt = fs.readFileSync(usersPath, "utf-8");
    const parsed = JSON.parse(txt);
    return Array.isArray(parsed.users) ? parsed.users : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify({ users }, null, 2));
}

const app = express();
app.use(cors());
app.use(express.json());

// JWT secret (use environment vars in production)
const JWT_SECRET = process.env.JWT_SECRET || "innohive";

// -------- Auth Endpoints --------
// Register a user and return a mock token
app.post("/register", (req, res) => {
  const { username, password, firstName, lastName, email, dob } =
    req.body || {};

  const errors = {};

  // Basic required field validation
  if (!username) errors.username = "username is required";
  if (!password) errors.password = "password is required";
  if (!firstName) errors.firstName = "first name is required";
  if (!lastName) errors.lastName = "last name is required";
  if (!email) errors.email = "email is required";
  if (!dob) errors.dob = "date of birth is required";

  // Simple email format check
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.email = "email is not valid";
    }
  }

  // Simple password strength rule
  if (password && password.length < 6) {
    errors.password = "password must be at least 6 characters";
  }

  const users = loadUsers();

  // Username uniqueness
  if (username && users.find((u) => u.username === username)) {
    errors.username = "username is already registered";
  }

  // Email uniqueness (case insensitive)
  if (
    email &&
    users.find(
      (u) => u.email && u.email.toLowerCase() === String(email).toLowerCase()
    )
  ) {
    errors.email = "email is already registered";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const user = {
    username,
    passwordHash,
    firstName: firstName || "",
    lastName: lastName || "",
    email: email || "",
    dob: dob || "",
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  saveUsers(users);

  const token = jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, username });
});

// Login a user and return a mock token
app.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ message: "username and password required" });
  const users = loadUsers();
  const u = users.find((x) => x.username === username);
  if (!u) return res.status(401).json({ message: "invalid credentials" });
  const ok = bcrypt.compareSync(password, u.passwordHash);
  if (!ok) return res.status(401).json({ message: "invalid credentials" });
  const token = jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, username });
});

// -------- Competitions Endpoints --------
// Return competitions list with participant counts and timing
app.get("/competitions", (req, res) => {
  const list = store.competitions.map((c) => ({
    id: c.id,
    name: c.name,
    entryFee: c.entryFee,
    prizePool: c.prizePool,
    participants: c.traders.length,
    startAt: c.startAt,
    endAt: c.endAt,
  }));
  res.json({ competitions: list });
});

// Return competition IDs that the given user has joined
app.post("/my-competitions", (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ message: "username required" });

  const joinedIds = store.competitions
    .filter(
      (c) =>
        Array.isArray(c.traders) && c.traders.some((t) => t.name === username)
    )
    .map((c) => c.id);

  res.json({ competitionIds: joinedIds });
});

// Join a competition (simulate). Adds user to traders if not already present.
app.post("/join", (req, res) => {
  const { competitionId, username } = req.body || {};
  if (!competitionId || !username)
    return res
      .status(400)
      .json({ message: "competitionId and username required" });
  const comp = store.competitions.find((c) => c.id === competitionId);
  if (!comp) return res.status(404).json({ message: "competition not found" });
  if (!comp.traders.find((t) => t.name === username)) {
    comp.traders.push({ name: username, score: 0 });
    // persist updated competitions to disk so joins survive restarts
    try {
      fs.writeFileSync(dataPath, JSON.stringify(store, null, 2));
    } catch (e) {
      console.error("Failed to persist competitions data", e);
    }
  }
  res.json({ success: true, participants: comp.traders.length });
});

// Optional: endpoint to get a competition leaderboard
app.get("/competitions/:id/leaderboard", (req, res) => {
  const id = req.params.id;
  const comp = store.competitions.find((c) => c.id === id);
  if (!comp) return res.status(404).json({ message: "competition not found" });
  // sort by score desc
  const leaderboard = [...comp.traders].sort((a, b) => b.score - a.score);
  res.json({ id: comp.id, name: comp.name, traders: leaderboard });
});

// Create HTTP server and attach WS server
const server = http.createServer(app);

// WebSocket server pushes randomized score updates regularly
const wss = new WebSocketServer({ server });

function broadcast(json) {
  const data = JSON.stringify(json);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(data);
  });
}

// On connection, send initial leaderboards
wss.on("connection", (socket) => {
  // Send initial snapshot for all competitions
  store.competitions.forEach((c) => {
    const leaderboard = [...c.traders].sort((a, b) => b.score - a.score);
    socket.send(
      JSON.stringify({
        type: "snapshot",
        competitionId: c.id,
        traders: leaderboard,
      })
    );
  });
});

// Periodically update random trader scores and broadcast deltas
setInterval(() => {
  // Pick a random competition
  const comp =
    store.competitions[Math.floor(Math.random() * store.competitions.length)];
  if (!comp || comp.traders.length === 0) return;

  // Pick 1-3 traders to update
  const updates = [];
  const count = Math.max(1, Math.min(3, comp.traders.length));
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * comp.traders.length);
    const trader = comp.traders[idx];
    const delta = parseFloat((Math.random() * 10 - 5).toFixed(2)); // -5 to +5
    trader.score = parseFloat((trader.score + delta).toFixed(2));
    updates.push({ name: trader.name, score: trader.score });
  }

  broadcast({ type: "score_update", competitionId: comp.id, updates });
}, 2000);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
