// src/lib/llm.ts
import { ChatMessage, BookSession } from "../types/book";
import { BACKEND_URL } from "./config";

// const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://192.168.86.95:4000";

export async function askBook(
    session: BookSession,
    userMessage: string
  ): Promise<string> {
    const history = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  
    const payload = {
      bookTitle: session.book.title,
      author: session.book.author,
      history,
      question: userMessage,
    };
  
    const res = await fetch(`${BACKEND_URL}/api/grimoire/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  
    if (!res.ok) {
      console.error("Backend error:", await res.text());
      throw new Error("Failed to get answer from Grimoire backend");
    }
  
    const data = (await res.json()) as { answer: string };
    return data.answer;
  }