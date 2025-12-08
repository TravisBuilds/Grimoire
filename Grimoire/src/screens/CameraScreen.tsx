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
import * as FileSystem from "expo-file-system";
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
  const [locked, setLocked] = useState(false); // once we detect a book, lock to avoid double nav

  const cameraRef = useRef<Camera | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ask for camera permission
  useEffect(() => {
    if (hasPermission == null) return;
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const scanOnce = useCallback(async () => {
    if (locked) return;
    if (!cameraRef.current) return;
    if (isScanning) return;
    if (!device) return;

    try {
      setIsScanning(true);

      // Take a quick photo for OCR
      const photo = await cameraRef.current.takePhoto({
        flash: "off",
      });

      // photo.path is something like "/var/mobile/Containers/Data/.../image.jpg"
      const fileUri = `file://${photo.path}`;
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: "base64",
      });

      if (!base64) {
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/grimoire/identify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (!res.ok) {
        console.warn("Identify error:", await res.text());
        return;
      }

      const data = (await res.json()) as {
        title: string | null;
        author: string | null;
      };

      if (!data.title) {
        // no confident detection yet; just let the loop continue
        return;
      }

      // We have a title -> lock and navigate straight to chat
      setLocked(true);
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }

      const book: Book = {
        id: nanoid(),
        title: data.title,
        author: data.author ?? undefined,
        coverImageUri: fileUri,
      };

      const session = createSessionForBook(book);
      navigation.navigate("Chat", { bookId: session.id });
    } catch (e) {
      console.warn("Scan/identify failed", e);
    } finally {
      setIsScanning(false);
    }
  }, [locked, isScanning, device, navigation]);

  // Start auto-scan loop when permission is granted and device is available
  useEffect(() => {
    if (!hasPermission || !device) return;

    const startTimeout = setTimeout(() => {
      if (scanTimerRef.current) return;
      scanTimerRef.current = setInterval(() => {
        void scanOnce();
      }, 2500); // every 2.5s
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
        <Text style={styles.text}>No access to camera</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={!locked}      // stop preview once we’ve locked onto a book
        photo={true}            // enable photo capture
      />

      <View style={styles.overlayBottom}>
        <Text style={styles.title}>Summon a Grimoire</Text>
        <Text style={styles.subtitle}>
          Point your camera at a book. We’ll detect it and start the
          conversation automatically.
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
