import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api';

const API_URL = 'http://192.168.1.13:5000';

export default function CreateChatRoom() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a room name.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/chat', {
        name: name.trim()
      });

      Alert.alert('Success', 'Room created! Auto-destruct timer will start when closed.', [
        { 
          text: 'Join Room', 
          onPress: () => {
             // If we had a chat room screen, we'd navigate there:
             // router.replace(`/chat/${response.data._id}`);
             router.replace('/(tabs)');
          } 
        }
      ]);
    } catch (error: any) {
      console.error('Chat room creation error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  const c = {
    bg: isDark ? '#0a0a0a' : '#f8fafc',
    card: isDark ? '#1a1a1b' : '#ffffff',
    text: isDark ? '#ffffff' : '#0f172a',
    subText: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    input: isDark ? '#272729' : '#f1f5f9',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View className="px-6 py-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text className="text-xl font-bold" style={{ color: c.text }}>Create Chat Room</Text>
        </View>
      </View>

      <View className="flex-1 px-6 justify-center">
        <View className="items-center mb-8">
          <View 
            style={{ backgroundColor: '#10b98115' }}
            className="w-20 h-20 rounded-[30px] items-center justify-center border border-[#10b98120]"
          >
            <Ionicons name="chatbubbles" size={40} color="#10b981" />
          </View>
          <Text className="text-2xl font-black mt-6 text-center" style={{ color: c.text }}>
            Open a Room
          </Text>
          <Text className="text-center mt-2 px-8" style={{ color: c.subText }}>
            Rooms are ephemeral. Data is wiped 2 minutes after room closure.
          </Text>
        </View>

        <View className="mb-6">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Room Name (e.g. Midnight Debugging)"
            placeholderTextColor="#94a3b8"
            className="px-6 py-5 rounded-3xl font-bold text-lg"
            style={{ backgroundColor: c.input, color: c.text, borderWidth: 1, borderColor: c.border }}
            maxLength={50}
          />
        </View>

        <TouchableOpacity
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.8}
          className="bg-emerald-600 py-5 rounded-3xl flex-row items-center justify-center shadow-lg shadow-emerald-500/30"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="flash" size={24} color="#fff" />
              <Text className="text-white font-black text-lg ml-2">Ignite Room</Text>
            </>
          )}
        </TouchableOpacity>

        <View className="mt-10 p-5 rounded-3xl bg-orange-500/10 border border-orange-500/20 flex-row items-start">
          <Ionicons name="warning" size={20} color="#f97316" className="mt-0.5" />
          <View className="flex-1 ml-3">
            <Text className="text-xs font-bold text-orange-700/80 leading-relaxed">
              No backups are stored. Everything including media will be wiped permanently after the room expires.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
