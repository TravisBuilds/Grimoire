// src/screens/CameraScreen.tsx
import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { createSessionForBook } from "@lib/sessionStore";
import { Book } from "../types/book";
import { nanoid } from "nanoid/non-secure";

type Props = NativeStackScreenProps<RootStackParamList, "Camera">;

const CameraScreen: React.FC<Props> = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<React.ComponentRef<typeof CameraView>>(null);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [authorInput, setAuthorInput] = useState("");

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>No access to camera</Text>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync();
    setCapturedUri(photo.uri);
  };

  const handleStartChat = () => {
    if (!titleInput.trim()) return;

    const book: Book = {
      id: nanoid(),
      title: titleInput.trim(),
      author: authorInput.trim() || undefined,
      coverImageUri: capturedUri ?? undefined,
    };

    const session = createSessionForBook(book);
    navigation.navigate("Chat", { bookId: session.id });
  };

  const handleRetake = () => {
    setCapturedUri(null);
    setTitleInput("");
    setAuthorInput("");
  };

  return (
    <View style={styles.container}>
      {!capturedUri ? (
        <>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
          />
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
              <Text style={styles.captureText}>Capture Book</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.confirmContainer}>
          {capturedUri && (
            <Image source={{ uri: capturedUri }} style={styles.previewImage} />
          )}
          <Text style={styles.label}>Book title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sapiens"
            value={titleInput}
            onChangeText={setTitleInput}
          />
          <Text style={styles.label}>Author (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Yuval Noah Harari"
            value={authorInput}
            onChangeText={setAuthorInput}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.smallButton, styles.secondary]} onPress={handleRetake}>
              <Text>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallButton, titleInput ? styles.primary : styles.disabled]}
              onPress={handleStartChat}
              disabled={!titleInput}
            >
              <Text style={styles.primaryText}>Chat with this book</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default CameraScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  camera: { flex: 1 },
  bottomBar: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  captureButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  captureText: {
    fontWeight: "600",
  },
  confirmContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: "#111",
  },
  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },
  label: {
    color: "#eee",
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 10,
    color: "#fff",
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 24,
    justifyContent: "space-between",
  },
  smallButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  primary: {
    backgroundColor: "#4CAF50",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondary: {
    backgroundColor: "#eee",
  },
  disabled: {
    backgroundColor: "#555",
  },
});
