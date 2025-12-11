// src/screens/CameraScreen.tsx
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import * as FileSystem from "expo-file-system/legacy";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { createSessionForBook } from "@lib/sessionStore";
import { Book } from "../types/book";
import { nanoid } from "nanoid/non-secure";
import { BACKEND_URL } from "@lib/config";

type Props = NativeStackScreenProps<RootStackParamList, "Camera">;

const CameraScreen: React.FC<Props> = ({ navigation }) => {
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();

  const [isScanning, setIsScanning] = useState(false);
  const [locked, setLocked] = useState(false);

  const cameraRef = useRef<Camera | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ask for camera permission
  useEffect(() => {
    if (hasPermission == null) return;
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  const scanOnce = useCallback(async () => {
    console.log("BACKEND_URL in app:", BACKEND_URL);

    if (locked) return;
    if (!cameraRef.current) return;
    if (isScanning) return;
    if (!device) return;

    try {
      setIsScanning(true);
      console.log("🔁 scanOnce start");

      // 1) Quick internet sanity check
      try {
        const ping = await fetch("https://www.google.com", { method: "HEAD" });
        console.log("🌐 Internet OK:", ping.status);
      } catch (e) {
        console.log("❌ No internet connection detected:", e);
        return;
      }

      // 2) Capture a photo
      const photo = await cameraRef.current.takePhoto({
        flash: "off",
      });

      const fileUri = `file://${photo.path}`;
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (!base64) {
        console.log("⚠️ No base64 data from photo");
        return;
      }

      // 3) Call backend identify
      let data: { title: string | null; author: string | null } = {
        title: null,
        author: null,
      };

      try {
        const res = await fetch(`${BACKEND_URL}/api/grimoire/identify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64 }),
        });

        console.log("🔍 Identify status:", res.status);

        if (!res.ok) {
          const text = await res.text();
          console.warn("Identify HTTP error:", text);
          // Even if identify fails, we’ll still fall back to a generic Grimoire below
        } else {
          data = (await res.json()) as {
            title: string | null;
            author: string | null;
          };
          console.log("🔍 Identify result:", data);
        }
      } catch (e) {
        console.warn("Identify request failed:", e);
        // Don't navigate if we can't identify the book
        return;
      }

      // 4) Only navigate if we successfully identified a book
      if (!data.title) {
        console.log("❌ No title identified, continuing scan…");
        return;
      }

      const title = data.title;
      const author = data.author ?? undefined;

      console.log("✅ Locking and navigating with title:", title);

      setLocked(true);
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }

      const book: Book = {
        id: nanoid(),
        title,
        author,
        coverImageUri: fileUri,
      };

      const session = createSessionForBook(book);
      navigation.navigate("Chat", { bookId: session.id });
    } catch (err) {
      console.warn("Scan/identify failed:", err);
    } finally {
      setIsScanning(false);
    }
  }, [locked, isScanning, device, navigation]);

  // Start auto-scan loop
  useEffect(() => {
    if (!hasPermission || !device) return;

    const startTimeout = setTimeout(() => {
      if (scanTimerRef.current) return;
      scanTimerRef.current = setInterval(() => {
        void scanOnce();
      }, 3000); // every 3 seconds
    }, 800);

    return () => {
      clearTimeout(startTimeout);
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
    };
  }, [hasPermission, device, scanOnce]);

  if (hasPermission == null || !device) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Preparing camera…</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera permission required</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={!locked}
        photo={true}
      />

      <View style={styles.overlayBottom}>
        <Text style={styles.title}>Summon a Grimoire</Text>
        <Text style={styles.subtitle}>
          Point your camera at a book. Detection is automatic.
        </Text>
        <View style={styles.statusRow}>
          {isScanning && !locked ? (
            <>
              <ActivityIndicator size="small" />
              <Text style={styles.statusText}>Scanning… hold steady</Text>
            </>
          ) : locked ? (
            <Text style={styles.statusText}>Grimoire found — opening…</Text>
          ) : (
            <Text style={styles.statusText}>
              Align the book cover or spine in the frame
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default CameraScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  text: { color: "#fff" },
  overlayBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  title: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 18,
    marginBottom: 4,
  },
  subtitle: {
    color: "#ccc",
    fontSize: 13,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    color: "#eee",
    fontSize: 13,
    marginLeft: 6,
  },
});
