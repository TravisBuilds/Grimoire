import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import fs from "fs";
import os from "os";
import path from "path";
import { File as NodeFile } from "node:buffer";

// Polyfill File global for OpenAI SDK (required for file uploads on Node < 20)
if (typeof globalThis.File === "undefined") {
  globalThis.File = NodeFile as any;
}

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

//helper types

type PersonaRole = "protagonist" | "author";
type PersonaGender = "male" | "female" | "unknown";

type PersonaInfo = {
  isFiction: boolean;
  personaRole: PersonaRole;
  personaName: string;
  gender: PersonaGender;
};

const personaCache = new Map<string, PersonaInfo>();

async function resolveBookPersona(
  bookTitle: string,
  author?: string
): Promise<PersonaInfo> {
  const key = `${bookTitle}|${author ?? ""}`.toLowerCase();
  if (personaCache.has(key)) return personaCache.get(key)!;

  const systemPrompt = `
You classify books and choose a speaking persona.
Given a book title (and optional author), determine:

- Whether the book is fiction or non-fiction.
- For fiction: who is the main protagonist (by name) and their gender (male/female/unknown).
- For non-fiction: the persona should be the author of the book. Use the provided author name if available; otherwise infer it. Also provide gender if reasonably known, else "unknown".

Respond ONLY as compact JSON in this exact shape:
{
  "isFiction": true | false,
  "personaRole": "protagonist" | "author",
  "personaName": "string",
  "gender": "male" | "female" | "unknown"
}
`.trim();

  const userText = `Book title: "${bookTitle}"${
    author ? `\nAuthor: "${author}"` : ""
  }`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText },
    ],
  });

  let content = completion.choices[0]?.message?.content ?? "{}";
  if (Array.isArray(content)) {
    content = content.map((p: any) => p.text ?? "").join("\n");
  }

  let parsed: PersonaInfo = {
    isFiction: true,
    personaRole: "protagonist",
    personaName: bookTitle,
    gender: "unknown",
  };

  try {
    const match = String(content).match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    }
  } catch (e) {
    console.warn("Persona JSON parse failed, using default", e);
  }

  // Basic safety/defaults
  if (parsed.personaRole !== "author" && parsed.personaRole !== "protagonist") {
    parsed.personaRole = parsed.isFiction ? "protagonist" : "author";
  }
  if (!parsed.personaName) {
    parsed.personaName =
      parsed.personaRole === "protagonist"
        ? bookTitle
        : author || bookTitle;
  }
  if (!["male", "female", "unknown"].includes(parsed.gender)) {
    parsed.gender = "unknown";
  }

  personaCache.set(key, parsed);
  return parsed;
}


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

    const persona = await resolveBookPersona(bookTitle, author);

    const historyText =
      history && history.length
        ? history
            .map(
              (m) =>
                `${m.role === "user" ? "Reader" : persona.personaName}: ${
                  m.content
                }`
            )
            .join("\n")
        : "";

    const personaLine =
      persona.personaRole === "protagonist"
        ? `You are ${persona.personaName}, the main protagonist of the fiction book "${bookTitle}"${
            author ? ` by ${author}` : ""
          }. Speak in first person as ${persona.personaName}.`
        : `You are ${persona.personaName}, the author of the non-fiction book "${bookTitle}"${
            author ? ` by ${author}` : ""
          }. Speak as the author, explaining and expanding on the ideas of the book.`;

    const prompt = `
${personaLine}
If the reader asks something outside the scope of the book, say so, but stay in character.

Conversation so far:
${historyText}

Reader: ${question}
${persona.personaName}:`.trim();

    const response = await client.responses.create({
      model: "gpt-4o",
      input: prompt,
      temperature: 0.7,
    });

    // @ts-ignore
    const answer = response.output_text ?? "I'm not sure how to answer that.";

    res.json({ answer, persona });
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

app.post("/api/grimoire/voice", async (req, res) => {
  try {
    const {
      audioBase64: inputAudioBase64,
      bookTitle,
      author,
      history,
    } = req.body as {
      audioBase64: string;
      bookTitle: string;
      author?: string;
      history?: { role: "user" | "book"; content: string }[];
    };

    if (!inputAudioBase64) {
      return res.status(400).json({ error: "missing_audio" });
    }

    // 1) temp file
    const buffer = Buffer.from(inputAudioBase64, "base64");
    const tmpPath = path.join(os.tmpdir(), `grimoire-voice-${Date.now()}.m4a`);
    await fs.promises.writeFile(tmpPath, buffer);

    // 2) transcribe
    const transcription = await client.audio.transcriptions.create({
      model: "whisper-1",
      file: fs.createReadStream(tmpPath),
    });

    const transcriptText = (transcription as any).text?.trim() ?? "";
    fs.promises
      .unlink(tmpPath)
      .catch(() => {}); // cleanup best-effort

    console.log("VOICE transcript:", transcriptText);

    if (!transcriptText) {
      return res.status(200).json({
        transcript: "",
        answer: "I couldn't quite hear that. Try asking again?",
        persona: null,
      });
    }

    // 3) persona resolution
    const persona = await resolveBookPersona(bookTitle, author);

    const historyText =
      history && history.length
        ? history
            .map(
              (m) =>
                `${m.role === "user" ? "Reader" : persona.personaName}: ${
                  m.content
                }`
            )
            .join("\n")
        : "";

    const personaLine =
      persona.personaRole === "protagonist"
        ? `You are ${persona.personaName}, the main protagonist of the fiction book "${bookTitle}"${
            author ? ` by ${author}` : ""
          }. Speak in first person as ${persona.personaName}.`
        : `You are ${persona.personaName}, the author of the non-fiction book "${bookTitle}"${
            author ? ` by ${author}` : ""
          }. Speak as the author, explaining and expanding on the ideas of the book.`;

    const prompt = `
${personaLine}
If the reader asks something outside the scope of the book, say so, but stay in character.

Conversation so far:
${historyText}

Reader: ${transcriptText}
${persona.personaName}:`.trim();

    const response = await client.responses.create({
      model: "gpt-4o",
      input: prompt,
      temperature: 0.7,
    });

    // @ts-ignore
    const answer: string =
      (response as any).output_text ??
      "I'm not sure how to answer that, but we can keep exploring together.";

    console.log("VOICE answer:", answer, "persona:", persona);

    // 5) Generate TTS audio with OpenAI if possible
    let ttsAudioBase64: string | null = null;
    let audioMimeType: string | null = null;
    try {
      const tts = await client.audio.speech.create({
        model: "gpt-4o-mini-tts", // OpenAI TTS
        voice: "alloy",
        input: answer,
      });

      const audioBuffer = Buffer.from(await tts.arrayBuffer());
      ttsAudioBase64 = audioBuffer.toString("base64");
      audioMimeType = "audio/mpeg";
    } catch (e) {
      console.warn("TTS generation failed, falling back to text only", e);
    }

    return res.json({
      transcript: transcriptText,
      answer,
      persona,
      audioBase64: ttsAudioBase64,
      audioMimeType,
    });
  } catch (err: any) {
    console.error("VOICE route error:", err?.response?.data ?? err);
    res.status(500).json({
      error: "voice_failed",
      detail: err?.message ?? "unknown error",
    });
  }
});

/* ---------------- START SERVER ---------------- */

const port = Number(process.env.PORT) || 4000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Grimoire backend listening on port ${port}`);
});

