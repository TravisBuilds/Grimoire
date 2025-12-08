// src/lib/sessionStore.ts
import { Book, BookSession, ChatMessage } from "../types/book";
import { nanoid } from "nanoid/non-secure";

let sessions: Record<string, BookSession> = {};

export function createSessionForBook(book: Book): BookSession {
  const sessionId = nanoid();
  const session: BookSession = {
    id: sessionId,
    book,
    messages: [
      {
        id: nanoid(),
        role: "book",
        createdAt: Date.now(),
        content: `Hi, I'm "${book.title}". Ask me anything about my themes, ideas, or what I'm trying to teach.`,
      },
    ],
  };
  sessions[sessionId] = session;
  return session;
}

export function getSession(sessionId: string): BookSession | undefined {
  return sessions[sessionId];
}

export function appendMessage(
  sessionId: string,
  message: Omit<ChatMessage, "id" | "createdAt">
): BookSession | undefined {
  const session = sessions[sessionId];
  if (!session) return undefined;

  const newMessage: ChatMessage = {
    ...message,
    id: nanoid(),
    createdAt: Date.now(),
  };

  const updated: BookSession = {
    ...session,
    messages: [...session.messages, newMessage],
  };

  sessions[sessionId] = updated;
  return updated;
}
