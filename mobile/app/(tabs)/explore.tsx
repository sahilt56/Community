import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import api from '../../api';

export default function ExploreScreen() {
  const router = useRouter();
  const [communities, setCommunities] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const res = await api.get('/api/communities');
        setCommunities(res.data);
      } catch (err) {
        console.error('Explore fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCommunities();
  }, []);

  const filtered = communities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => router.push(`/v/${item._id}`)} className="bg-white dark:bg-[#1a1a1b] p-4 mb-3 rounded-xl border border-gray-200 dark:border-[#343536] flex-row items-center">
      <View className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center overflow-hidden mr-4">
        {item.profilePic ? (
          <Image source={{ uri: item.profilePic.startsWith('http') ? item.profilePic : `http://192.168.1.13:5000${item.profilePic}` }} className="w-full h-full" contentFit="cover" transition={200} />
        ) : (
          <Text className="text-white font-bold text-xl">v/</Text>
        )}
      </View>
      <View className="flex-1">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">v/{item.name}</Text>
        <Text className="text-xs text-gray-500 mt-1 dark:text-gray-400">
          Members: {item.members?.length || 1} • {item.topic || 'General'}
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-300 mt-2" numberOfLines={2}>
          {item.description || 'No description provided.'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black p-4">
      <Text className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Explore Communities</Text>
      <TextInput
        className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-3 rounded-xl mb-4 text-gray-900 dark:text-white"
        placeholder="Search communities..."
        placeholderTextColor="#888"
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#f97316" className="mt-10" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text className="text-center text-gray-500 mt-10">No communities found</Text>
          }
        />
      )}
    </View>
  );
}
