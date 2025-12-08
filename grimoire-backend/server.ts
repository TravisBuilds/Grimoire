// src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

app.post("/api/grimoire/chat", async (req, res) => {
  try {
    const { bookTitle, author, history, question } = req.body as {
      bookTitle: string;
      author?: string;
      history?: { role: "user" | "book"; content: string }[];
      question: string;
    };

    // Build a simple conversation string for now
    const historyText =
      history && history.length
        ? history
            .map(
              (m) =>
                `${m.role === "user" ? "Reader" : "Grimoire"}: ${m.content}`
            )
            .join("\n")
        : "";

    const prompt = `
You are the manifested essence of the book "${bookTitle}"${
      author ? ` by ${author}` : ""
    }.

Speak as if you are this book itself: wise, focused, and grounded in its themes and ideas.
Keep answers concise but insightful. If you don't know something because the reader is asking
outside the scope of the book, say so.

Conversation so far:
${historyText}

Reader: ${question}
Grimoire:`.trim();

    const response = await client.responses.create({
      model: "gpt-4o-mini", // fast + cheap, supports text in/out :contentReference[oaicite:0]{index=0}
      input: prompt,
      temperature: 0.7,
    });

    // JS SDK exposes a convenience field `output_text` with the full text. :contentReference[oaicite:1]{index=1}
    const answer =
      // @ts-ignore - typing for output_text is SDK-only
      (response as any).output_text ??
      // fallback: try to dig into output items if needed
      "";

    res.json({ answer });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "OpenAI error", detail: err?.message });
  }
});

const port = process.env.PORT ?? 4000;
app.listen(port, () => {
  console.log(`Grimoire backend listening on http://localhost:${port}`);
});
