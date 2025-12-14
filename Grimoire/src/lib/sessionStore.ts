// src/lib/sessionStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { nanoid } from "nanoid/non-secure";
import type { Book } from "../types/book";

export type SessionMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export type Session = {
  id: string; // session id
  book: Book;
  messages: SessionMessage[];
  createdAt: number;
  lastActiveAt: number;
};

const STORAGE_KEY = "grimoire:sessions:v1";

// In-memory cache for fast reads
let sessions: Record<string, Session> = {};
let loaded = false;

async function ensureLoaded() {
  if (loaded) return;
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      sessions = JSON.parse(raw);
    } catch {
      sessions = {};
    }
  }
  loaded = true;
}

async function persist() {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export async function getAllSessions(): Promise<Session[]> {
  await ensureLoaded();
  return Object.values(sessions).sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}

export async function getSession(sessionId: string): Promise<Session | null> {
  await ensureLoaded();
  return sessions[sessionId] ?? null;
}

export async function createSessionForBook(book: Book): Promise<Session> {
  await ensureLoaded();

  const id = nanoid();
  const now = Date.now();
  const session: Session = {
    id,
    book,
    messages: [],
    createdAt: now,
    lastActiveAt: now,
  };

  sessions[id] = session;
  await persist();
  return session;
}

export async function appendMessage(
  sessionId: string,
  msg: { id?: string; role: "user" | "assistant"; content: string }
): Promise<void> {
  await ensureLoaded();

  const s = sessions[sessionId];
  if (!s) return;

  const now = Date.now();
  s.messages.push({
    id: msg.id ?? nanoid(),
    role: msg.role,
    content: msg.content,
    createdAt: now,
  });
  s.lastActiveAt = now;

  sessions[sessionId] = s;
  await persist();
}

export async function upsertBookCover(
  sessionId: string,
  coverImageUri?: string
): Promise<void> {
  await ensureLoaded();
  const s = sessions[sessionId];
  if (!s) return;
  if (coverImageUri) s.book.coverImageUri = coverImageUri;
  s.lastActiveAt = Date.now();
  sessions[sessionId] = s;
  await persist();
}
