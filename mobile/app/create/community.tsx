import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import api from '../../api';

const API_URL = 'http://192.168.1.13:5000';

export default function CreateCommunity() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minAnubhav, setMinAnubhav] = useState('0');
  const [minAgeDays, setMinAgeDays] = useState('0');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in the community name and description.');
      return;
    }

    const formattedName = name.toLowerCase().replace(/\s+/g, '-');
    setLoading(true);

    try {
      await api.post('/api/communities/create', {
        name: formattedName,
        description,
        minAnubhav: Number(minAnubhav),
        minAgeDays: Number(minAgeDays)
      });

      Alert.alert('Success', 'Community Created! 🎉', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error: any) {
      console.error('Community creation error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create community.');
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
      <View className="px-6 py-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold" style={{ color: c.text }}>Create Community</Text>
      </View>

      <ScrollView className="flex-1 px-6">
        <View className="items-center mb-6 mt-2">
          <View className="w-16 h-16 bg-blue-500/10 rounded-3xl items-center justify-center border border-blue-500/20">
            <Ionicons name="globe" size={32} color="#3b82f6" />
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-bold mb-2 ml-1" style={{ color: c.subText }}>Community Name</Text>
          <View className="relative">
            <View className="absolute left-4 top-0 bottom-0 justify-center z-10">
              <Text className="font-bold" style={{ color: c.subText }}>v/</Text>
            </View>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="my-awesome-community"
              placeholderTextColor="#94a3b8"
              className="px-4 py-4 pl-9 rounded-2xl font-bold text-base"
              style={{ backgroundColor: c.input, color: c.text, borderWidth: 1, borderColor: c.border }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text className="text-xs mt-2 ml-1" style={{ color: c.subText }}>
            Names cannot have spaces. Try "reactjs" or "funny-videos".
          </Text>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-bold mb-2 ml-1" style={{ color: c.subText }}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What is this community about?"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="px-4 py-4 rounded-2xl font-medium text-base h-32"
            style={{ backgroundColor: c.input, color: c.text, borderWidth: 1, borderColor: c.border }}
          />
        </View>

        <View className="flex-row justify-between gap-4 mb-8">
          <View className="flex-1">
            <Text className="text-xs font-bold mb-2 ml-1" style={{ color: c.subText }}>Min Anubhav</Text>
            <TextInput
              value={minAnubhav}
              onChangeText={setMinAnubhav}
              keyboardType="numeric"
              className="px-4 py-3 rounded-2xl font-bold text-base"
              style={{ backgroundColor: c.input, color: c.text, borderWidth: 1, borderColor: c.border }}
            />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold mb-2 ml-1" style={{ color: c.subText }}>Min Account Age</Text>
            <TextInput
              value={minAgeDays}
              onChangeText={setMinAgeDays}
              keyboardType="numeric"
              placeholder="Days"
              className="px-4 py-3 rounded-2xl font-bold text-base"
              style={{ backgroundColor: c.input, color: c.text, borderWidth: 1, borderColor: c.border }}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
          className="bg-blue-600 py-4 rounded-2xl flex-row items-center justify-center mb-10 shadow-lg shadow-blue-500/30"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text className="text-white font-black text-lg ml-2">Create Community</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
