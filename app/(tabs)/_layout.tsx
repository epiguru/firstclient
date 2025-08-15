import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chats",
          tabBarLabel: "Chats",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="chat" color={color} size={size} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="group/index"
        options={{
          title: "Group",
          tabBarLabel: "Group",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="group" color={color} size={size} />
          ),
          headerTitle: "Group",
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="settings" color={color} size={size} />
          ),
          headerTitle: "Settings",
        }}
      />
    </Tabs>
  );
}
