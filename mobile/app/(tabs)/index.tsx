import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api';
import { requireAuth } from '../../utils/auth';

// Helper function to get random colors based on text (for avatar fallback)
const getAvatarColor = (name: string) => {
  if (!name) return '#f97316';
  const colors = ['#f97316', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
};

// Main Home Screen
export default function HomeScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeSort, setActiveSort] = useState('hot');
  const router = useRouter();

  const fetchPosts = async (pageNum = 1, shouldRefresh = false) => {
    if (loading || (!hasMore && !shouldRefresh)) return;

    setLoading(true);
    try {
      const { data } = await api.get(`/api/posts?page=${pageNum}&limit=10&sort=${activeSort}`);
      const fetchedPosts = data.posts || [];
      
      if (shouldRefresh) {
        setPosts(fetchedPosts);
      } else {
        setPosts(prev => [...prev, ...fetchedPosts]);
      }
      
      if (fetchedPosts.length < 10) setHasMore(false);
    } catch (err) {
      console.warn('Error fetching posts in Home:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts(1, true);
  }, [activeSort]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    fetchPosts(1, true);
  }, [activeSort]);

  const loadMore = () => {
    if (!loading && hasMore) {
      const next = page + 1;
      setPage(next);
      fetchPosts(next);
    }
  };

  const renderSortBar = () => (
    <View className="bg-white rounded-[16px] mx-4 my-4 p-[6px] flex-row shadow-sm shadow-gray-200/50" style={{ elevation: 2 }}>
      {/* Hot */}
      <TouchableOpacity 
        onPress={() => setActiveSort('hot')}
        className={`flex-1 flex-row items-center justify-center py-[10px] rounded-[12px] ${activeSort === 'hot' ? 'bg-[#f97316] shadow-sm' : 'bg-transparent'}`}
      >
        <Ionicons name={activeSort === 'hot' ? "flame" : "flame-outline"} size={18} color={activeSort === 'hot' ? "white" : "#6b7280"} />
        <Text className={`font-extrabold ml-2 text-[15px] tracking-wide ${activeSort === 'hot' ? 'text-white' : 'text-gray-500'}`}>Hot</Text>
      </TouchableOpacity>
      
      {/* New */}
      <TouchableOpacity 
        onPress={() => setActiveSort('new')}
        className={`flex-1 flex-row items-center justify-center py-[10px] rounded-[12px] ${activeSort === 'new' ? 'bg-[#3b82f6] shadow-sm' : 'bg-transparent'}`}
      >
        <Ionicons name={activeSort === 'new' ? "sparkles" : "sparkles-outline"} size={18} color={activeSort === 'new' ? "white" : "#6b7280"} />
        <Text className={`font-extrabold ml-2 text-[15px] tracking-wide ${activeSort === 'new' ? 'text-white' : 'text-gray-500'}`}>New</Text>
      </TouchableOpacity>
      
      {/* Top */}
      <TouchableOpacity 
        onPress={() => setActiveSort('top')}
        className={`flex-1 flex-row items-center justify-center py-[10px] rounded-[12px] ${activeSort === 'top' ? 'bg-[#10b981] shadow-sm' : 'bg-transparent'}`}
      >
        <Ionicons name={activeSort === 'top' ? "podium" : "podium-outline"} size={18} color={activeSort === 'top' ? "white" : "#6b7280"} />
        <Text className={`font-extrabold ml-2 text-[15px] tracking-wide ${activeSort === 'top' ? 'text-white' : 'text-gray-500'}`}>Top</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const commName = item.community?.name || 'community';
    const authorName = item.author?.username || 'user';
    const authorPic = item.author?.profilePic || item.author?.profilePicture || null;
    const avatarColor = getAvatarColor(authorName);
    const hasMedia = item.media && item.media.length > 0;

    return (
      <View className="bg-white mx-4 mb-5 p-[18px] rounded-[24px] shadow-sm shadow-gray-200/40" style={{ elevation: 2 }}>
        
        {/* Header: User Avatar, Name & Options */}
        <View className="flex-row items-center mb-3">
          <View 
             className="w-11 h-11 rounded-full items-center justify-center mr-3 overflow-hidden"
             style={{ backgroundColor: authorPic ? 'transparent' : avatarColor + '20' }}
          >
             {authorPic ? (
               <Image source={{ uri: authorPic.startsWith('http') ? authorPic : `http://192.168.1.13:5000${authorPic}` }} className="w-full h-full" />
             ) : (
               <Text className="text-xl font-extrabold uppercase" style={{ color: avatarColor }}>
                 {authorName.charAt(0)}
               </Text>
             )}
          </View>
          <View className="flex-1 justify-center">
            <Text className="text-[15px] font-bold text-gray-900 tracking-tight leading-tight">u/{authorName}</Text>
            <Text className="text-[13px] text-gray-400 mt-[2px] font-medium tracking-tight">in <Text className="font-bold text-gray-600">c/{commName}</Text> • 2h</Text>
          </View>
          <TouchableOpacity className="p-2 items-center justify-center bg-gray-50 rounded-full">
            <Ionicons name="ellipsis-horizontal" size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Content: Title & Text */}
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(`/post/${item._id}`)}>
          <Text className="text-[18px] font-extrabold text-[#1f2937] leading-tight mb-[6px] tracking-tight">
            {item.title}
          </Text>
          {item.content ? (
            <Text className="text-[15px] text-gray-500 leading-relaxed mb-3" numberOfLines={3}>
              {item.content.replace(/<[^>]+>/g, '')}
            </Text>
          ) : null}
          
          {/* Media Attachment */}
          {hasMedia && (
            <View className="w-full mt-2 mb-3 rounded-[18px] overflow-hidden bg-gray-100 border border-gray-100 relative">
              <Image 
                source={{ uri: item.media[0].url.startsWith('http') ? item.media[0].url : `http://10.201.218.169:5000${item.media[0].url}` }} 
                className="w-full h-56" 
                resizeMode="cover"
              />
            </View>
          )}
        </TouchableOpacity>

        {/* Interactive Bottom Actions Bar */}
        <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-50">
          
          {/* Voting Pill */}
          <View className="flex-row items-center bg-gray-100 rounded-full overflow-hidden">
            <TouchableOpacity className="px-3 py-[6px] flex-row items-center" onPress={() => requireAuth(router)}>
              <Ionicons name="arrow-up-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
            <Text className="text-[13px] font-bold text-gray-700 min-w-[20px] text-center">
              {(item.upvotes?.length || 0) - (item.downvotes?.length || 0)}
            </Text>
            <TouchableOpacity className="px-3 py-[6px] flex-row items-center" onPress={() => requireAuth(router)}>
              <Ionicons name="arrow-down-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Comments Pill */}
          <TouchableOpacity 
             className="flex-row items-center bg-gray-100 rounded-full px-4 py-[6px]"
             onPress={() => requireAuth(router, () => router.push(`/post/${item._id}`))}
          >
            <Ionicons name="chatbubble-outline" size={18} color="#6b7280" />
            <Text className="text-[13px] font-bold text-gray-600 ml-2">
              {item.comments?.length || 0}
            </Text>
          </TouchableOpacity>

          {/* Share Pill */}
          <TouchableOpacity className="flex-row items-center bg-gray-100 rounded-full w-10 h-10 items-center justify-center" onPress={() => requireAuth(router)}>
            <Ionicons name="share-social-outline" size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>

      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#F3F4F6]">
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListHeaderComponent={renderSortBar}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
        ListFooterComponent={loading && !refreshing ? <ActivityIndicator size="small" color="#f97316" className="my-6" /> : null}
        contentContainerStyle={{ paddingBottom: 30, paddingTop: 4 }}
      />
    </View>
  );
}
