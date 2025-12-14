// App.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import CameraScreen from "@screens/CameraScreen";
import ChatScreen from "@screens/ChatScreen";
import LibraryScreen from "@screens/LibraryScreen";
import { RootStackParamList } from "./src/types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Library">
          <Stack.Screen
            name="Library"
            component={LibraryScreen}
            options={{ title: "Library" }}
          />
          <Stack.Screen
            name="Camera"
            component={CameraScreen}
            options={{ title: "Scan a Book" }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ title: "Chat with Book" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
