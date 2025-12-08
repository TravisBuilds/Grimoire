// src/types/book.ts

export type MessageRole = "user" | "book";

export interface Book {
  id: string;
  title: string;
  author?: string;
  coverImageUri?: string; // local uri for now
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
}

export interface BookSession {
  id: string;
  book: Book;
  messages: ChatMessage[];
}
