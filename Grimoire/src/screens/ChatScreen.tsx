// src/screens/ChatScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { getSession, appendMessage } from "@lib/sessionStore";
import { BookSession, ChatMessage } from "../types/book";
import { askBook } from "@lib/llm";

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

const ChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const { bookId } = route.params;
  const [session, setSession] = useState<BookSession | undefined>();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const s = getSession(bookId);
    if (!s) {
      navigation.goBack();
      return;
    }
    setSession(s);
    navigation.setOptions({ title: s.book.title });
  }, [bookId, navigation]);

  const handleSend = async () => {
    if (!session || !input.trim() || isSending) return;

    const userText = input.trim();
    setInput("");
    setIsSending(true);

    // 1) Add user message locally
    const afterUser = appendMessage(session.id, {
      role: "user",
      content: userText,
    });

    if (afterUser) setSession(afterUser);

    try {
      // 2) Ask LLM
      const reply = await askBook(afterUser ?? session, userText);

      const afterBook = appendMessage(session.id, {
        role: "book",
        content: reply,
      });
      if (afterBook) setSession(afterBook);
    } catch (e) {
      const afterError = appendMessage(session.id, {
        role: "book",
        content:
          "Sorry, something went wrong while trying to think about your question.",
      });
      if (afterError) setSession(afterError);
    } finally {
      setIsSending(false);
    }
  };

  if (!session) {
    return (
      <View style={styles.center}>
        <Text>Loading session…</Text>
      </View>
    );
  }

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.messageUser : styles.messageBook,
        ]}
      >
        <Text style={styles.messageText}>{item.content}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        {session.book.coverImageUri ? (
          <Image
            source={{ uri: session.book.coverImageUri }}
            style={styles.cover}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.bookTitle}>{session.book.title}</Text>
          {!!session.book.author && (
            <Text style={styles.bookAuthor}>{session.book.author}</Text>
          )}
        </View>
      </View>

      <FlatList
        data={session.messages.sort((a, b) => a.createdAt - b.createdAt)}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask the book anything..."
          placeholderTextColor="#888"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || isSending) && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isSending}
        >
          <Text style={styles.sendLabel}>{isSending ? "..." : "Send"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050509" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    alignItems: "center",
  },
  cover: {
    width: 48,
    height: 72,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: "#333",
  },
  bookTitle: { color: "#fff", fontWeight: "600", fontSize: 16 },
  bookAuthor: { color: "#aaa", fontSize: 13, marginTop: 2 },
  messagesList: {
    padding: 12,
    paddingBottom: 80,
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    padding: 10,
    marginVertical: 4,
  },
  messageUser: {
    alignSelf: "flex-end",
    backgroundColor: "#4CAF50",
  },
  messageBook: {
    alignSelf: "flex-start",
    backgroundColor: "#222",
  },
  messageText: { color: "#fff" },
  inputRow: {
    flexDirection: "row",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#222",
    backgroundColor: "#050509",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#fff",
  },
  sendButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
  },
  sendDisabled: {
    backgroundColor: "#555",
  },
  sendLabel: { color: "#fff", fontWeight: "600" },
});
