import { seedSimulations } from "./derive";
import type { Role, Session, Simulation } from "./types";

const SIM_KEY = "cc.simulations.v1";
const SESSION_KEY = "cc.sessions.v1";
const ROLE_KEY = "cc.role.v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("cc:store"));
}

export function loadSimulations(): Simulation[] {
  const existing = read<Simulation[] | null>(SIM_KEY, null);
  if (existing && existing.length) return existing;
  const seeded = seedSimulations();
  write(SIM_KEY, seeded);
  return seeded;
}

export function saveSimulations(sims: Simulation[]) {
  write(SIM_KEY, sims);
}

export function upsertSimulation(sim: Simulation) {
  const sims = loadSimulations();
  const idx = sims.findIndex((s) => s.id === sim.id);
  if (idx >= 0) sims[idx] = sim;
  else sims.unshift(sim);
  saveSimulations(sims);
}

export function deleteSimulation(id: string) {
  saveSimulations(loadSimulations().filter((s) => s.id !== id));
}

export function loadSessions(): Session[] {
  return read<Session[]>(SESSION_KEY, []);
}

export function saveSession(session: Session) {
  const all = loadSessions();
  const idx = all.findIndex((s) => s.id === session.id);
  if (idx >= 0) all[idx] = session;
  else all.unshift(session);
  write(SESSION_KEY, all);
}

export function loadRole(): Role {
  return read<Role>(ROLE_KEY, "Designer / Educator");
}

export function saveRole(role: Role) {
  write(ROLE_KEY, role);
}

export function resetAll() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SIM_KEY);
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  window.dispatchEvent(new Event("cc:store"));
}
