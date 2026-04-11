import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../api';
import { requireAuth } from '../../utils/auth';

export default function CommunityScreen() {
  const { id } = useLocalSearchParams();
  const [community, setCommunity] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [commRes, postsRes] = await Promise.all([
          api.get(`/api/communities/${id}`),
          api.get(`/api/posts/community/${id}?sort=hot&page=1&limit=10`)
        ]);
        setCommunity(commRes.data);
        setPosts(postsRes.data.posts);
      } catch (err) {
        console.error('Community fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchData();
    }
  }, [id]);

  const renderPost = ({ item }: { item: any }) => (
    <View className="bg-white dark:bg-[#1a1a1b] p-4 mb-3 rounded-lg border border-gray-200 dark:border-[#343536] shadow-sm">
      <Text className="text-xs text-gray-500 mb-1">u/{item.author?.username || 'user'}</Text>
      <Text className="text-lg font-bold text-gray-900 dark:text-white mb-2">{item.title}</Text>
      {item.content ? (
        <Text className="text-gray-700 dark:text-gray-300 mb-2" numberOfLines={3}>
          {item.content.replace(/<[^>]+>/g, '')}
        </Text>
      ) : null}
      <View className="flex-row items-center space-x-4 mt-2">
        <TouchableOpacity onPress={() => requireAuth(router)}>
          <Text className="text-orange-500 font-bold ml-1 mr-3">↑ {item.upvotes?.length || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => requireAuth(router)}>
          <Text className="text-blue-500 font-bold mr-1">↓ {item.downvotes?.length || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => requireAuth(router, () => router.push(`/post/${item._id}`))}>
          <Text className="text-gray-500 font-bold ml-4">💬 {item.comments?.length || 0}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!community) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <Text className="text-gray-500">Community not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderPost}
        ListHeaderComponent={
          <View className="bg-white dark:bg-[#1a1a1b] border-b border-gray-200 dark:border-[#343536] mb-4 shadow-sm pb-4">
            {community.bannerPic ? (
              <Image 
                source={{ uri: community.bannerPic.startsWith('http') ? community.bannerPic : `http://192.168.1.13:5000${community.bannerPic}` }} 
                className="w-full h-32"
              />
            ) : (
              <View className="w-full h-24 bg-blue-600" />
            )}
            <View className="px-4">
              <View className="w-20 h-20 rounded-full bg-blue-600 border-4 border-white dark:border-[#1a1a1b] -mt-10 items-center justify-center overflow-hidden">
                {community.profilePic ? (
                  <Image source={{ uri: community.profilePic.startsWith('http') ? community.profilePic : `http://192.168.1.13:5000${community.profilePic}` }} className="w-full h-full" />
                ) : (
                  <Text className="text-white text-3xl font-bold">v/</Text>
                )}
              </View>
              <Text className="text-2xl font-bold text-gray-900 dark:text-white mt-2">v/{community.name}</Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {community.members?.length || 1} Members • Topic: {community.topic || 'General'}
              </Text>
              <Text className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                {community.description || 'No description provided.'}
              </Text>
              <TouchableOpacity 
                className="bg-gray-900 dark:bg-white p-3 rounded-full items-center shadow-md"
                onPress={() => requireAuth(router)}
              >
                <Text className="text-white dark:text-black font-bold">Join Community</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<Text className="text-center text-gray-500 mt-10">No posts in this community yet.</Text>}
      />
    </View>
  );
}
