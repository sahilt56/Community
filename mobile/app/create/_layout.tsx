import { Stack } from 'expo-router';

export default function CreateLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="post" />
      <Stack.Screen name="community" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="event" />
    </Stack>
  );
}
