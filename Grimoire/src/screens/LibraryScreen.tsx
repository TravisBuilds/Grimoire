// src/screens/LibraryScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { getAllSessions, Session } from "@lib/sessionStore";

type Props = NativeStackScreenProps<RootStackParamList, "Library">;

const GAP = 10;
const NUM_COLS = 3;
const SCREEN_W = Dimensions.get("window").width;
const CELL = Math.floor((SCREEN_W - GAP * (NUM_COLS + 1)) / NUM_COLS);

type LibraryItem =
  | { type: "session"; session: Session }
  | { type: "add" };

const LibraryScreen: React.FC<Props> = ({ navigation }) => {
  const [sessions, setSessions] = useState<Session[]>([]);

  const load = useCallback(async () => {
    const all = await getAllSessions();
    setSessions(all);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      void load();
    });
    return unsub;
  }, [navigation, load]);

  const data: LibraryItem[] = useMemo(() => {
    return [...sessions.map((s) => ({ type: "session" as const, session: s })), { type: "add" as const }];
  }, [sessions]);

  const renderItem = ({ item }: { item: LibraryItem }) => {
    if (item.type === "add") {
      return (
        <TouchableOpacity
          style={[styles.cell, styles.addCell]}
          onPress={() => navigation.navigate("Camera")}
          activeOpacity={0.85}
        >
          <Text style={styles.plus}>＋</Text>
          <Text style={styles.addText}>Scan</Text>
        </TouchableOpacity>
      );
    }

    const s = item.session;
    const cover = s.book.coverImageUri;

    return (
      <TouchableOpacity
        style={styles.cell}
        onPress={() => navigation.navigate("Chat", { bookId: s.id })}
        activeOpacity={0.85}
      >
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} />
        ) : (
          <View style={styles.coverFallback}>
            <Text style={styles.coverFallbackText}>
              {(s.book.title || "Grimoire").slice(0, 18)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Library</Text>

      <FlatList
        data={data}
        keyExtractor={(item, idx) =>
          item.type === "add" ? "add" : item.session.id
        }
        numColumns={NUM_COLS}
        renderItem={renderItem}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

export default LibraryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050510" },
  header: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    paddingHorizontal: GAP,
    paddingTop: 18,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: GAP,
    paddingBottom: 24,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  cell: {
    width: CELL,
    height: Math.floor(CELL * 1.45),
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  cover: { width: "100%", height: "100%" },
  coverFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  coverFallbackText: { color: "#cbd5f5", fontSize: 12, textAlign: "center" },

  addCell: {
    borderWidth: 1,
    borderColor: "#2d3748",
    backgroundColor: "rgba(17,24,39,0.35)",
  },
  plus: { color: "#fff", fontSize: 40, fontWeight: "300", marginBottom: 4 },
  addText: { color: "#9ca3af", fontSize: 12 },
});
