import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../api';
import { requireAuth } from '../../utils/auth';

export default function PostScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await api.get(`/api/posts/${id}`);
        setPost(res.data.post || res.data);
      } catch (err) {
        console.error('Post fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchPost();
    }
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!post) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <Text className="text-gray-500">Post not found</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-black p-4">
      <View className="bg-white dark:bg-[#1a1a1b] p-5 rounded-xl border border-gray-200 dark:border-[#343536] shadow-sm mb-4">
        <Text className="text-xs text-gray-500 mb-2">
          c/{post.community?.name || 'general'} • Posted by u/{post.author?.username || 'user'}
        </Text>
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{post.title}</Text>
        
        {post.media && post.media.length > 0 && (
          <Image 
            source={{ uri: post.media[0].url.startsWith('http') ? post.media[0].url : `http://192.168.1.13:5000${post.media[0].url}` }} 
            className="w-full h-48 rounded-md mb-4" 
            resizeMode="cover"
          />
        )}
        
        {post.content ? (
          <Text className="text-gray-700 dark:text-gray-300 text-base leading-relaxed mb-4">
            {post.content.replace(/<[^>]+>/g, '')}
          </Text>
        ) : null}

        <View className="flex-row items-center pt-3 border-t border-gray-100 dark:border-[#343536]">
          <TouchableOpacity onPress={() => requireAuth(router)}>
            <Text className="text-orange-500 font-bold mr-4">↑ {post.upvotes?.length || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => requireAuth(router)}>
            <Text className="text-blue-500 font-bold mr-4">↓ {post.downvotes?.length || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => requireAuth(router)}>
            <Text className="text-gray-500 font-bold">💬 {post.comments?.length || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">Comments</Text>
      {post.comments && post.comments.length > 0 ? (
        post.comments.map((comment: any, index: number) => (
          <View key={comment._id || index} className="bg-white dark:bg-[#1a1a1b] p-3 rounded-lg border border-gray-200 dark:border-[#343536] mb-2 shadow-sm">
            <Text className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">u/{comment.author?.username || 'user'}</Text>
            <Text className="text-gray-800 dark:text-gray-300 text-sm">
              {comment.content ? comment.content.replace(/<[^>]+>/g, '') : ''}
            </Text>
          </View>
        ))
      ) : (
        <Text className="text-gray-500">No comments yet.</Text>
      )}
      <View className="h-10" />
    </ScrollView>
  );
}
