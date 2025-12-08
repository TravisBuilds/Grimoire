import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

// ⭐ IMPORTANT: Increase body size limits BEFORE routes run
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/* -------------------------------------------------------
   ROUTE: Chat with book (text → text)
------------------------------------------------------- */
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
Speak as this book itself. Reference themes, ideas, lessons.
If the reader asks something outside the scope of the book, say so.

Conversation so far:
${historyText}

Reader: ${question}
Grimoire:`.trim();

    const response = await client.responses.create({
      model: "gpt-4o", // Reliable text model
      input: prompt,
      temperature: 0.7,
    });

    // @ts-ignore - output_text exists as a convenience field
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

/* -------------------------------------------------------
   ROUTE: Identify book from image (image → JSON {title, author})
------------------------------------------------------- */
app.post("/api/grimoire/identify", async (req, res) => {
  try {
    const { imageBase64 } = req.body as { imageBase64?: string };

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", // Supports image input
      messages: [
        {
          role: "system",
          content:
            "You are a book recognition assistant. When given a book cover image, identify the book title and author. Respond ONLY in valid JSON like: {\"title\": \"...\", \"author\": \"...\"}. If unsure, return null values.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Identify the book in this image. JSON only." },
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

    const raw = completion.choices[0]?.message?.content ?? "{}";

    // Try to extract JSON object from the model output
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    let parsed: any = { title: null, author: null };
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }

    res.json({
      title: parsed.title ?? null,
      author: parsed.author ?? null,
    });
  } catch (err: any) {
    console.error("identify error:", err?.response?.data ?? err);
    res.status(500).json({
      error: "identify_failed",
      detail: err?.message ?? "unknown error",
    });
  }
});

const port = process.env.PORT ?? 4000;
app.listen(port, () => {
  console.log(`Grimoire backend listening on http://localhost:${port}`);
});
