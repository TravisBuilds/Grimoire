# 📘 **Grimoire --- Project Specification**

**Working Title:** *Grimoire*\
**Purpose:** An augmented reality app where users point their phone at
any book---fiction, nonfiction, or textbook---and a "spirit" emerges
from the book to speak with them as if the book itself were alive and
knowledgeable.

------------------------------------------------------------------------

# ✨ **1. Vision**

Grimoire transforms reading into a dynamic, interactive experience. By
anchoring a simple character above the book in AR, users can converse
naturally with an AI agent that embodies the book's "spirit,"
personality, and knowledge.

The "spirit": - floats above the book like an apparition, - speaks in
real-time with natural voice, - answers questions about themes, plots,
arguments, or exercises, - adapts tone and personality based on the
book, - becomes smarter over time as it learns what the reader enjoys.

------------------------------------------------------------------------

# 🧰 **2. Tech Stack Overview**

## **2.1 Client (Android App)**

-   **Language:** Kotlin\
-   **UI:** Jetpack Compose\
-   **AR Framework:** ARCore\
-   **Rendering:** 2D overlay in Compose (V1)\
-   **Voice I/O:** OpenAI Realtime API\
-   **State Management:** Kotlin StateFlow\
-   **Build System:** Gradle\
-   **Development Environment:** Cursor

------------------------------------------------------------------------

## **2.2 Backend**

-   **Framework:** Node.js (Express) or Python FastAPI\
-   **AI Orchestration:** OpenAI Realtime\
-   **Book Metadata:** Google Books API, ISBN recognition\
-   **Vector Search (Future):** pgvector or Pinecone\
-   **Authentication:** Google OAuth or native device auth\
-   **Caching:** Redis

------------------------------------------------------------------------

## **2.3 AI**

### **Primary model:**

**OpenAI Realtime (GPT‑4o / GPT‑4.1 Realtime)**\
- full‑duplex voice\
- low‑latency TTS\
- interruptible audio\
- multimodal support

### **Future expansions:**

-   Gemini 3 for multimodal reasoning\
-   Grok for personality variants\
-   Lightweight on-device models for offline mode

------------------------------------------------------------------------

# 👁️ **3. Core User Experience**

1.  **User points phone at a book.**\
    ARCore detects a surface or user taps to anchor.

2.  **Grimoire's spirit appears above the book.**\
    A soft 2D animated blob or wisp hovers in AR.

3.  **User begins speaking.**\
    Microphone audio streams directly to OpenAI.

4.  **Spirit responds instantly in voice.**\
    Tone and style match book genre and personality.

5.  **Conversation becomes contextual.**\
    Backend supplements with book metadata or page text snapshots.

------------------------------------------------------------------------

# 🛠️ **4. Minimal V1 Architecture**

    Android App
    │
    ├── ARCoreController (anchors + camera tracking)
    │
    ├── Compose UI (2D character overlay)
    │
    └── Realtime Voice Agent
           ├── mic → OpenAI stream
           ├── receive streaming TTS
           └── persona + book context

Backend (optional V1):

    Backend
    │
    ├── Book Metadata Service
    └── Persona Engine

------------------------------------------------------------------------

# 🧩 **5. Core Components**

### **ARCoreController**

-   Manages session, surface, anchors\
-   Converts anchor pose → screen coordinates\
-   Emits UI-friendly state

### **Compose UI**

-   Renders the spirit at (x, y)\
-   Renders chat tools\
-   Handles mic button & streaming

### **Voice Interaction**

-   Barge-in interruption\
-   Streaming voice out\
-   Persona maintenance

### **Book Intelligence**

-   Identify book via cover or ISBN\
-   Fetch metadata\
-   Build persona prompt\
-   Provide chapter summaries, themes, reasoning

------------------------------------------------------------------------

# 🔮 **6. Future Expansions**

## **6.1 Unity Upgrade Path**

Once V1 works: - Build a Unity version for **iOS + Android**\
- Use AR Foundation for cross-platform parity\
- Introduce stylized 3D character with: - glow shaders\
- particle effects\
- expression/lipsync animations\
- Integrate TTS-driven mouth movement\
- Add interaction gestures (tap, drag, orbit)

## **6.2 Offline Mode**

-   On-device whisper\
-   Small LLM for Q&A\
-   Cached embeddings

## **6.3 Social Features**

-   Record conversations\
-   Share "Grimoire Summaries"\
-   Save notes and quotes

## **6.4 Study / Academic Tools**

-   Step-by-step explanations\
-   Flashcard generation\
-   Quiz creation\
-   Homework helpers

## **6.5 Children's Mode**

-   Friendly, cute animations\
-   Read-aloud capabilities\
-   Vocabulary teaching

------------------------------------------------------------------------

# 🏁 **7. Milestones**

1.  **M1:** AR anchor + 2D spirit\
2.  **M2:** Realtime voice\
3.  **M3:** Book-aware persona\
4.  **M4:** Live-page OCR + context\
5.  **M5:** Unity 3D character upgrade

------------------------------------------------------------------------

# 📎 **8. Suggested Repo Structure**

    /grimoire
      /android-client
        /app/src/main/java/com/grimoire
          /ar
          /ui
          /voice
          /data
      /backend
        /metadata
        /agent
      /docs
        architecture.md
        roadmap.md
        personas.md

------------------------------------------------------------------------

# ✔️ **9. Summary**

Grimoire aims to be the **magical AI companion** that brings books
alive---whether a fantasy novel, a dense philosophy text, or a physics
textbook.\
The V1 Android + ARCore + OpenAI Realtime stack provides the fastest
path to a functional prototype, with Unity reserved for richer future 3D
embodiments.
