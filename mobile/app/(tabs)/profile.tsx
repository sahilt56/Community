import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, FlatList, useColorScheme, Platform, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api';

export default function ProfileScreen() {
  const [localUser, setLocalUser] = useState<any>(null); // from SecureStore
  const [profileData, setProfileData] = useState<any>(null); // from API
  const [activeTab, setActiveTab] = useState('Posts');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const fetchProfile = async (username: string, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await api.get(`/api/users/${username}`);
      setProfileData(res.data);
    } catch (err) {
      console.error('Failed to load profile details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const loadUser = async () => {
        try {
          const userData = await SecureStore.getItemAsync('user');
          if (userData) {
            const parsed = JSON.parse(userData);
            setLocalUser(parsed);
            fetchProfile(parsed.username);
          } else {
            setLocalUser(null);
            setLoading(false);
          }
        } catch (err) {
          console.error('Failed to load user', err);
        }
      };
      loadUser();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (localUser?.username) {
      fetchProfile(localUser.username, true);
    } else {
      setRefreshing(false);
    }
  }, [localUser]);

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      setLocalUser(null);
      setProfileData(null);
      router.replace('/(auth)/login');
    } catch (err) {
      Alert.alert('Logout Error', 'Could not log out properly.');
    }
  };

  const pickImage = async (type: 'profilePic' | 'bannerPic') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'profilePic' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadingImage(true);
        const formData = new FormData();
        const filename = result.assets[0].uri.split('/').pop() || 'upload.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const fileType = match ? `image/${match[1]}` : `image`;

        formData.append(type, {
          uri: result.assets[0].uri,
          name: filename,
          type: fileType,
        } as any);

        const pUsername = profileData?.profile?.username || localUser?.username;
        await api.put(`/api/users/${pUsername}/update`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        Alert.alert('Success', 'Image updated successfully!');
        if (pUsername) fetchProfile(pUsername, true);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const c = {
    bg: isDark ? '#000000' : '#f3f4f6',
    card: isDark ? '#1a1a1b' : '#ffffff',
    text: isDark ? '#ffffff' : '#111827',
    subText: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#343536' : '#e5e7eb',
    orange: '#f97316',
  };

  // ======= Logged Out State =======
  if (!localUser) {
    return (
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: c.bg }}>
        <View className="w-32 h-32 rounded-full items-center justify-center mb-8 bg-orange-100 dark:bg-orange-500/20">
          <Ionicons name="person" size={64} color="#f97316" />
        </View>

        <Text className="text-3xl font-extrabold mb-3 text-center" style={{ color: c.text }}>Join Vartalap</Text>
        <Text className="text-base text-center leading-relaxed mb-10 px-2 font-medium" style={{ color: c.subText }}>
          Connect with communities, share ideas, and discover amazing conversations.
        </Text>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.85}
          className="w-full h-14 rounded-2xl bg-orange-500 flex-row items-center justify-center mb-4 shadow-sm shadow-orange-500/30"
        >
          <Ionicons name="log-in-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
          <Text className="text-white font-black text-lg">Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.85}
          className="w-full h-14 rounded-2xl border-2 border-orange-500 flex-row items-center justify-center mb-6 bg-transparent"
        >
          <Ionicons name="person-add-outline" size={20} color="#f97316" style={{ marginRight: 10 }} />
          <Text className="font-extrabold text-lg text-orange-500">Create Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  const p = profileData?.profile || localUser;

  // Tab Content Data Routing
  let feedData: any[] = [];
  if (profileData) {
    switch (activeTab) {
      case 'Posts': feedData = profileData.posts || []; break;
      case 'Comments': feedData = profileData.commentedPosts || []; break;
      case 'Saved': feedData = profileData.savedPosts || []; break;
      case 'Upvoted': feedData = profileData.upvotedPosts || []; break;
      case 'Downvoted': feedData = profileData.downvotedPosts || []; break;
    }
  }

  const renderPostCard = (item: any, isCommentTab = false) => {
    // Shared rendering logic for both cases
    const authorPic = item.author?.profilePicture || item.author?.profilePic;
    return (
      <TouchableOpacity
        key={item._id}
        activeOpacity={0.7}
        onPress={() => router.push(`/post/${item._id}`)}
        className="bg-white dark:bg-[#1a1a1b] mx-4 mb-4 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-[#343536]"
        style={{ elevation: 1 }}
      >
        <View className="flex-row items-center mb-2">
          <View className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-500/20 items-center justify-center mr-2 overflow-hidden">
            {authorPic ? (
              <Image source={{ uri: authorPic.startsWith('http') ? authorPic : `http://192.168.1.13:5000${authorPic}` }} className="w-full h-full" contentFit="cover" transition={200} />
            ) : (
              <Text className="text-orange-500 font-bold">{item.author?.username?.charAt(0)?.toUpperCase() || 'U'}</Text>
            )}
          </View>
          <View>
            <Text className="text-xs font-bold text-gray-500 dark:text-gray-400">u/{item.author?.username || 'user'}</Text>
            <Text className="text-[10px] text-gray-400">c/{item.community?.name || 'general'}</Text>
          </View>
        </View>

        <Text className="text-base font-extrabold text-gray-900 dark:text-white mb-2 leading-tight tracking-tight">{item.title}</Text>

        {item.content ? (
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3 leading-relaxed" numberOfLines={3}>
            {item.content.replace(/<[^>]+>/g, '')}
          </Text>
        ) : null}

        <View className="flex-row items-center justify-between border-t border-gray-50 dark:border-[#343536] pt-3 mt-1">
          <View className="flex-row items-center h-8 bg-gray-50 dark:bg-[#272729] rounded-full px-1">
            <TouchableOpacity className="px-2 py-1 flex-row items-center">
              <Ionicons name="arrow-up-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
            <Text className="text-[13px] font-bold text-gray-700 dark:text-gray-300 min-w-[20px] text-center">
              {(item.upvotes?.length || 0) - (item.downvotes?.length || 0)}
            </Text>
            <TouchableOpacity className="px-2 py-1 flex-row items-center">
              <Ionicons name="arrow-down-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="flex-row items-center bg-gray-50 dark:bg-[#272729] rounded-full px-3 py-1.5"
            onPress={() => router.push(`/post/${item._id}`)}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#6b7280" />
            <Text className="text-[13px] font-bold text-gray-600 dark:text-gray-400 ml-2">
              {item.comments?.length || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center bg-gray-50 dark:bg-[#272729] rounded-full w-8 h-8 items-center justify-center">
            <Ionicons name="share-social-outline" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ======= Logged In State =======
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Scrollable Feed */}
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
      >
        {/* Profile Header Block */}
        <View className="bg-white dark:bg-[#1a1a1b] shadow-sm pb-5 border-b border-gray-100 dark:border-[#343536]">
          {/* Banner Image */}
          <View className="w-full h-36 bg-gray-200 dark:bg-[#272729] relative">
            {p.bannerPic ? (
              <Image
                source={{ uri: p.bannerPic.startsWith('http') ? p.bannerPic : `http://192.168.1.13:5000${p.bannerPic}` }}
                className="w-full h-full"
                contentFit="cover"
                transition={300}
              />
            ) : (
              <View className="absolute inset-0 bg-blue-500 opacity-20" />
            )}

            <TouchableOpacity
              onPress={() => pickImage('bannerPic')}
              activeOpacity={0.8}
              style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 10, elevation: 5 }}
              className="w-10 h-10 bg-black/60 rounded-full items-center justify-center border border-white/40"
            >
              {uploadingImage ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={20} color="#fff" />}
            </TouchableOpacity>
          </View>

          <View className="px-5">
            {/* Avatar & Action Button Row */}
            <View className="flex-row justify-between items-end -mt-10 mb-4">
              <View className="w-24 h-24 rounded-full border-4 border-white dark:border-[#1a1a1b] bg-white dark:bg-black overflow-hidden shadow-md items-center justify-center relative">
                {p.profilePic || p.profilePicture ? (
                  <Image
                    source={{ uri: (p.profilePic || p.profilePicture).startsWith('http') ? (p.profilePic || p.profilePicture) : `http://192.168.1.13:5000${p.profilePic || p.profilePicture}` }}
                    className="w-full h-full"
                    contentFit="cover" transition={200}
                  />
                ) : (
                  <View className="w-full h-full bg-orange-100 dark:bg-orange-500/20 items-center justify-center">
                    <Text className="text-4xl font-black text-orange-500">{p.username?.charAt(0)?.toUpperCase() || 'U'}</Text>
                  </View>
                )}
                <TouchableOpacity
                  className="absolute inset-0 bg-transparent items-center justify-center"
                  onPress={() => pickImage('profilePic')}
                >
                  {uploadingImage ? <ActivityIndicator size="small" color="#f97316" /> : null}
                </TouchableOpacity>
              </View>

              <View className="flex-row gap-2">
                {/* Edit Profile button removed as requested */}
              </View>
            </View>

            {/* Profile Info */}
            <View className="mb-4">
              <View className="flex-row items-center flex-wrap">
                <Text className="text-2xl font-black text-gray-900 dark:text-white mr-2" numberOfLines={1}>u/{p.username}</Text>
                {p.isBetaTester && (
                  <View className="bg-teal-100 dark:bg-teal-500/20 px-2 py-0.5 rounded-full flex-row items-center border border-teal-200 dark:border-teal-500/30 mr-1">
                    <Ionicons name="beaker" size={12} color="#14b8a6" />
                    <Text className="text-[10px] text-teal-600 font-bold ml-1">BETA TESTER</Text>
                  </View>
                )}
                {(profileData?.totalAnubhav || p.karma || 0) >= 100 && (
                  <View className="bg-orange-100 dark:bg-orange-500/20 px-2 py-0.5 rounded-full flex-row items-center border border-orange-200 dark:border-orange-500/30">
                    <Ionicons name="medal" size={12} color="#f97316" />
                    <Text className="text-[10px] text-orange-600 font-bold ml-1">CENTURION</Text>
                  </View>
                )}
              </View>
              {p.description ? (
                <Text className="text-sm text-gray-700 dark:text-gray-300 mt-2 leading-relaxed font-medium">{p.description}</Text>
              ) : null}
            </View>

            {/* Stats */}
            <View className="flex-row items-center mt-2 flex-wrap pb-1">
              <View className="mr-6 min-w-[60px]">
                <Text className="text-lg font-black text-gray-900 dark:text-white">{p.followers?.length || 0}</Text>
                <Text className="text-xs text-gray-500 font-bold" numberOfLines={1}>followers</Text>
              </View>
              <View className="mr-6 min-w-[60px]">
                <Text className="text-lg font-black text-gray-900 dark:text-white">{p.following?.length || 0}</Text>
                <Text className="text-xs text-gray-500 font-bold" numberOfLines={1}>following</Text>
              </View>
              <View className="min-w-[60px]">
                <Text className="text-lg font-black text-orange-500">{profileData?.totalAnubhav || p.karma || 0}</Text>
                <Text className="text-xs text-orange-400 font-bold" numberOfLines={1}>anubhav</Text>
              </View>
            </View>

            {/* Joined Date */}
            {p.createdAt ? (
              <View className="flex-row items-center mt-3 pt-3 border-t border-gray-50 dark:border-[#343536]">
                <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                <Text className="text-xs text-gray-500 ml-1.5 font-medium">
                  Joined Vartalap on {new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Dynamic Tabs Menu */}
        <View className="bg-white dark:bg-[#1a1a1b] border-b border-gray-100 dark:border-[#343536] mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-3" contentContainerStyle={{ paddingVertical: 12 }}>
            {['Posts', 'Comments', 'Saved', 'Upvoted', 'Downvoted'].map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`mx-2 px-4 py-2 rounded-full ${activeTab === tab ? 'bg-gray-900 dark:bg-white' : 'bg-gray-100 dark:bg-[#272729]'}`}
              >
                <Text className={`font-bold text-sm ${activeTab === tab ? 'text-white dark:text-black' : 'text-gray-600 dark:text-gray-400'}`}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content List Engine */}
        {feedData && feedData.length > 0 ? (
          feedData.map(item => renderPostCard(item, activeTab === 'Comments'))
        ) : (
          <View className="py-16 items-center flex-1">
            <View className="w-16 h-16 bg-gray-100 dark:bg-[#272729] rounded-full items-center justify-center mb-4">
              <Ionicons name="file-tray-outline" size={32} color={c.subText} />
            </View>
            <Text className="text-base font-bold text-gray-400 dark:text-gray-500">No {activeTab.toLowerCase()} to display.</Text>
          </View>
        )}

        <View className="h-10" />
      </ScrollView>
    </View>
  );
}
