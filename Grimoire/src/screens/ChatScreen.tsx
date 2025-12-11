// src/screens/ChatScreen.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { BACKEND_URL } from "@lib/config";
import { getSession, appendMessage } from "@lib/sessionStore";
import type { Book } from "../types/book";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

type Turn = {
  id: string;
  role: "user" | "book";
  content: string;
};

type PersonaGender = "male" | "female" | "unknown";

type Persona = {
  isFiction: boolean;
  personaRole: "protagonist" | "author";
  personaName: string;
  gender: PersonaGender;
};

const ChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const { bookId } = route.params;

  const [book, setBook] = useState<Book | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [currentGender, setCurrentGender] =
    useState<PersonaGender>("unknown");

  const [playingSound, setPlayingSound] = useState<Audio.Sound | null>(
    null
  );

  // ---- Load session + book ----
  useEffect(() => {
    const session = getSession(bookId);
    if (!session) {
      console.warn("No session found for id", bookId);
      navigation.goBack();
      return;
    }

    setBook(session.book);
    navigation.setOptions({
      title: session.book.title || "Grimoire",
    });

    if (session.messages?.length) {
      const mapped: Turn[] = session.messages.map((m: any) => ({
        id: m.id,
        role: m.role === "assistant" ? "book" : "user",
        content: m.content,
      }));
      setTurns(mapped);
    }
  }, [bookId, navigation]);

  // Cleanup playing sound when unmounting
  useEffect(() => {
    return () => {
      if (playingSound) {
        playingSound.unloadAsync().catch(() => {});
      }
    };
  }, [playingSound]);

  // ---- Helper: add turn ----
  const addTurn = useCallback(
    (turn: Turn) => {
      setTurns((prev) => [...prev, turn]);
      appendMessage(bookId, {
        role: turn.role === "book" ? "book" : "user",
        content: turn.content,
      });
    },
    [bookId]
  );

  // ---- Recording logic ----
  const startRecording = useCallback(async () => {
    try {
      if (!book) return;

      console.log("🎙️ startRecording");
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        console.warn("Microphone permission not granted");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error("startRecording error", err);
    }
  }, [book]);

  const stopRecording = useCallback(async () => {
    try {
      if (!recording || !book) return;

      console.log("🛑 stopRecording");
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);
      setRecording(null);

      if (!uri) {
        console.warn("No URI from recording");
        return;
      }

      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const history = turns.map((t) => ({
        role: t.role === "book" ? "book" : "user",
        content: t.content,
      }));

      setIsThinking(true);

      const res = await fetch(`${BACKEND_URL}/api/grimoire/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64,
          bookTitle: book.title,
          author: book.author,
          history,
        }),
      });

      if (!res.ok) {
        console.warn("voice route error", await res.text());
        setIsThinking(false);
        return;
      }

      const data = (await res.json()) as {
        transcript: string;
        answer: string;
        persona?: Persona | null;
        audioBase64?: string | null;
        audioMimeType?: string | null;
      };

      console.log("VOICE result", data);

      if (data.transcript) {
        addTurn({
          id: `u-${Date.now()}`,
          role: "user",
          content: data.transcript,
        });
      }

      const answerTurn: Turn = {
        id: `b-${Date.now()}`,
        role: "book",
        content: data.answer,
      };
      addTurn(answerTurn);

      if (data.persona?.gender) {
        setCurrentGender(data.persona.gender);
      }

      // ---- Play high-quality TTS audio if present ----
      if (data.audioBase64) {
        try {
          const fileName = `grimoire-answer-${Date.now()}.mp3`;
          const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

          await FileSystem.writeAsStringAsync(fileUri, data.audioBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });

          if (playingSound) {
            await playingSound.unloadAsync();
          }

          const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
          setPlayingSound(sound);
          await sound.playAsync();
        } catch (e) {
          console.warn("Failed to play TTS audio", e);
        }
      }

      setIsThinking(false);
    } catch (err) {
      console.error("stopRecording/send error", err);
      setIsThinking(false);
      setIsRecording(false);
      setRecording(null);
    }
  }, [recording, book, turns, addTurn, playingSound]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      void stopRecording();
    } else {
      void startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  if (!book) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Loading grimoire…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Transcript log */}
      <FlatList
        data={turns}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === "user" ? styles.bubbleUser : styles.bubbleBook,
            ]}
          >
            <Text style={styles.bubbleLabel}>
              {item.role === "user" ? "You" : book.title || "Grimoire"}
            </Text>
            <Text style={styles.bubbleText}>{item.content}</Text>
          </View>
        )}
      />

      {/* Status + mic */}
      <View style={styles.bottomBar}>
        <Text style={styles.statusText}>
          {isThinking
            ? "Your grimoire is thinking…"
            : isRecording
            ? "Listening… tap again to send"
            : "Tap to speak with your grimoire"}
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Camera")}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Scan another book</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleRecording}
            style={[
              styles.micButton,
              isRecording ? styles.micButtonActive : null,
            ]}
          >
            <Text style={styles.micText}>{isRecording ? "●" : "🎙️"}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.genderHint}>
          Persona voice: {currentGender}
        </Text>
      </View>
    </View>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050510" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050510",
  },
  text: { color: "#fff" },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubble: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: "90%",
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: "#2b6cb0",
  },
  bubbleBook: {
    alignSelf: "flex-start",
    backgroundColor: "#1a202c",
  },
  bubbleLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#cbd5f5",
    marginBottom: 2,
  },
  bubbleText: {
    color: "#f7fafc",
    fontSize: 14,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#2d3748",
    alignItems: "center",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#4a5568",
    backgroundColor: "#1a202c",
  },
  secondaryButtonText: {
    color: "#cbd5f5",
    textAlign: "center",
    fontWeight: "600",
  },
  statusText: {
    color: "#a0aec0",
    marginBottom: 8,
    fontSize: 13,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4a5568",
    marginBottom: 4,
  },
  micButtonActive: {
    backgroundColor: "#e53e3e",
  },
  micText: {
    fontSize: 32,
    color: "#f7fafc",
  },
  genderHint: {
    color: "#718096",
    fontSize: 11,
    marginTop: 2,
  },
});
