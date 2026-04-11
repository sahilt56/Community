import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import * as SecureStore from 'expo-secure-store';
import api from '../../api';

const API_URL = 'http://192.168.1.13:5000';

export default function CreateEvent() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingCommunities, setFetchingCommunities] = useState(true);

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        router.replace('/(auth)/login' as any);
        return;
      }
      const res = await api.get('/api/communities/joined');
      setCommunities(res.data);
      if (res.data.length > 0) setSelectedCommunity(res.data[0]._id);
    } catch (err) {
      console.error("Error fetching communities", err);
    } finally {
      setFetchingCommunities(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedCommunity || !name.trim() || !date.trim() || !time.trim()) {
      Alert.alert('Error', 'Please fill in required fields (Community, Name, Date, Time).');
      return;
    }

    setLoading(true);
    // Combine date and time (assuming YYYY-MM-DD and HH:mm format for simplicity in MVP)
    const eventDateTime = new Date(`${date}T${time}`);
    
    try {
      await api.post('/api/events', {
        name: name.trim(),
        description: description.trim(),
        date: eventDateTime.toISOString(),
        location: location.trim(),
        communityId: selectedCommunity
      });

      Alert.alert('Success', 'Event hosted! 🎉', [
        { text: 'Great!', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to host event.');
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

  if (fetchingCommunities) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View className="px-6 py-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold" style={{ color: c.text }}>Host Event</Text>
      </View>

      <ScrollView className="flex-1 px-6">
        <View className="mb-6 mt-4">
          <Text className="text-sm font-bold mb-2 ml-1" style={{ color: c.subText }}>Select Community</Text>
          <View className="rounded-2xl overflow-hidden border" style={{ backgroundColor: c.input, borderColor: c.border }}>
            <Picker
              selectedValue={selectedCommunity}
              onValueChange={(itemValue) => setSelectedCommunity(itemValue)}
              dropdownIconColor={isDark ? '#fff' : '#000'}
              style={{ color: c.text }}
            >
              {communities.map(comm => (
                <Picker.Item key={comm._id} label={`v/${comm.name}`} value={comm._id} />
              ))}
            </Picker>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-bold mb-2 ml-1" style={{ color: c.subText }}>Event Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Weekly Gaming Night"
            placeholderTextColor="#94a3b8"
            className="px-4 py-4 rounded-2xl font-bold text-base"
            style={{ backgroundColor: c.input, color: c.text, borderWidth: 1, borderColor: c.border }}
          />
        </View>

        <View className="flex-row justify-between gap-4 mb-6">
          <View className="flex-1">
            <Text className="text-sm font-bold mb-2 ml-1" style={{ color: c.subText }}>Date</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
              className="px-4 py-4 rounded-2xl font-bold text-base"
              style={{ backgroundColor: c.input, color: c.text, borderWidth: 1, borderColor: c.border }}
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold mb-2 ml-1" style={{ color: c.subText }}>Time</Text>
            <TextInput
              value={time}
              onChangeText={setTime}
              placeholder="HH:mm"
              placeholderTextColor="#94a3b8"
              className="px-4 py-4 rounded-2xl font-bold text-base"
              style={{ backgroundColor: c.input, color: c.text, borderWidth: 1, borderColor: c.border }}
            />
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-bold mb-2 ml-1" style={{ color: c.subText }}>Location / Link</Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Discord link or Physical Address"
            placeholderTextColor="#94a3b8"
            className="px-4 py-4 rounded-2xl font-medium text-base"
            style={{ backgroundColor: c.input, color: c.text, borderWidth: 1, borderColor: c.border }}
          />
        </View>

        <View className="mb-8">
          <Text className="text-sm font-bold mb-2 ml-1" style={{ color: c.subText }}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What should attendees know?"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="px-4 py-4 rounded-2xl font-medium text-base h-24"
            style={{ backgroundColor: c.input, color: c.text, borderWidth: 1, borderColor: c.border }}
          />
        </View>

        <TouchableOpacity
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.8}
          className="bg-violet-600 py-4 rounded-2xl flex-row items-center justify-center mb-10 shadow-lg shadow-violet-500/30"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="calendar-outline" size={24} color="#fff" />
              <Text className="text-white font-black text-lg ml-2">Host Event</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
