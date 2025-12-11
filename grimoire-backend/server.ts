import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Simple health check
app.get("/health", (_req, res) => {
  res.send("OK");
});

/* ---------------- CHAT ROUTE ---------------- */

app.post("/api/grimoire/chat", async (req, res) => {
  try {
    const { bookTitle, author, history, question } = req.body as {
      bookTitle: string;
      author?: string;
      history?: { role: "user" | "book"; content: string }[];
      question: string;
    };

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
Speak as this book itself. Reference its themes, ideas, and tone.
If the reader asks something outside the scope of the book, say so.

Conversation so far:
${historyText}

Reader: ${question}
Grimoire:`.trim();

    const response = await client.responses.create({
      model: "gpt-4o",
      input: prompt,
      temperature: 0.7,
    });

    // @ts-ignore
    const answer = response.output_text ?? "I'm not sure how to answer that.";

    res.json({ answer });
  } catch (err: any) {
    console.error("OpenAI chat error:", err?.response?.data ?? err);
    res.status(500).json({
      error: "chat_failed",
      detail: err?.message ?? "unknown error",
    });
  }
});

/* ---------------- IDENTIFY ROUTE ---------------- */

app.post("/api/grimoire/identify", async (req, res) => {
  try {
    const { imageBase64 } = req.body as { imageBase64?: string };

    if (!imageBase64) {
      console.log("IDENTIFY: missing imageBase64");
      return res.json({ title: null, author: null });
    }

    console.log("IDENTIFY: got image, len =", imageBase64.length);

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            'You are a book recognition assistant. When given a photo of a book cover or spine, identify the main book title and author. Respond ONLY in compact JSON like {"title":"...","author":"..."} . If unsure, use null values.',
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Identify the main book in this image." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
    });

    let content = completion.choices[0]?.message?.content;

    let raw = "";
    if (typeof content === "string") {
      raw = content;
    } else if (Array.isArray(content)) {
      raw = (content as any[])
        .map((part: any) => (typeof part.text === "string" ? part.text : ""))
        .join("\n");
    } else {
      raw = JSON.stringify(content ?? {});
    }

    console.log("IDENTIFY raw:", raw);

    let parsed: any = { title: null, author: null };

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn("IDENTIFY JSON parse error:", e);
      }
    } else {
      // Fallback loose parsing: "Title by Author" or "Title - Author"
      const bySplit = raw.split(/by/i);
      if (bySplit.length >= 2 && bySplit[0] && bySplit[1]) {
        parsed.title = bySplit[0].trim().replace(/^["']|["']$/g, "");
        parsed.author = bySplit[1].trim().replace(/^["']|["']$/g, "");
      } else {
        const dashSplit = raw.split(" - ");
        parsed.title = dashSplit[0]?.trim() || null;
        parsed.author = dashSplit[1]?.trim() || null;
      }
    }

    const title = parsed.title ?? null;
    const author = parsed.author ?? null;

    console.log("IDENTIFY parsed:", { title, author });

    return res.json({ title, author });
  } catch (err: any) {
    console.error("OpenAI identify error:", err?.response?.data ?? err);
    res.status(500).json({
      title: null,
      author: null,
      error: "identify_failed",
      detail: err?.message ?? "unknown error",
    });
  }
});

/* ---------------- START SERVER ---------------- */

const port = Number(process.env.PORT) || 4000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Grimoire backend listening at http://0.0.0.0:${port}`);
  console.log(`Accessible from network at http://192.168.86.112:${port}`);
});
