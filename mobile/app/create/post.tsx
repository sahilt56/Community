import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, useColorScheme, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import api from '../../api';

const API_URL = 'http://192.168.1.13:5000';

type PostType = 'text' | 'media' | 'link' | 'poll';

export default function CreatePost() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('text');
  const [link, setLink] = useState('');
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDuration, setPollDuration] = useState(3);
  const [loading, setLoading] = useState(false);
  const [fetchingCommunities, setFetchingCommunities] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        // Not logged in - redirect to login
        router.replace('/(auth)/login' as any);
        return;
      }

      const userStr = await SecureStore.getItemAsync('user');
      if (userStr) setCurrentUser(JSON.parse(userStr));

      const res = await api.get('/api/communities/joined');
      setCommunities(res.data);
      if (res.data.length > 0) setSelectedCommunity(res.data[0]._id);
    } catch (err) {
      console.error("Error loading post data", err);
    } finally {
      setFetchingCommunities(false);
    }
  };

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setMediaFiles([...mediaFiles, ...result.assets]);
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedCommunity || !title.trim()) {
      Alert.alert('Error', 'Please select a community and enter a title.');
      return;
    }

    if (postType === 'poll') {
      const filledOptions = pollOptions.filter(opt => opt.trim());
      if (filledOptions.length < 2) {
        Alert.alert('Error', 'Please provide at least 2 options for your poll.');
        return;
      }
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('communityId', selectedCommunity);
    formData.append('postType', postType);
    
    if (postType === 'text' || postType === 'poll') {
      formData.append('content', content.trim());
    }

    if (postType === 'link') {
      formData.append('link', link.trim());
    }

    if (postType === 'poll') {
      const validOptions = pollOptions.filter(opt => opt.trim());
      formData.append('pollOptions', JSON.stringify(validOptions));
      formData.append('pollDurationDays', pollDuration.toString());
    }

    if (postType === 'media') {
      mediaFiles.forEach((file, index) => {
        const localUri = file.uri;
        const filename = localUri.split('/').pop() || `media_${index}`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`; // Fallback to image
        
        // Note: For videos, we should detect video type
        const isVideo = file.type === 'video';
        const mimeType = isVideo ? (match ? `video/${match[1]}` : 'video/mp4') : type;

        formData.append('media', { uri: localUri, name: filename, type: mimeType } as any);
      });
    }

    try {
      await api.post('/api/posts/create', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        }
      });

      Alert.alert('Success', 'Post created successfully! 🚀', [
        { text: 'Awesome', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (err: any) {
      console.error("Post creation error", err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to create post.');
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

  const canCreatePoll = () => {
    const currentComm = communities.find(c => c._id === selectedCommunity);
    const curUserId = currentUser?.id || currentUser?._id;
    return currentComm && (
      currentComm.creator === curUserId ||
      (currentComm.moderators && currentComm.moderators.includes(curUserId))
    );
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
      <View className="px-6 py-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text className="text-xl font-bold" style={{ color: c.text }}>Create Post</Text>
        </View>
        <TouchableOpacity 
          onPress={handleSubmit} 
          disabled={loading}
          className="bg-orange-500 px-6 py-2 rounded-full"
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white font-bold">Post</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {/* Tabs */}
        <View className="flex-row border-b px-6" style={{ borderColor: c.border }}>
          {(['text', 'media', 'link', 'poll'] as PostType[]).map((type) => {
            if (type === 'poll' && !canCreatePoll()) return null;
            const isActive = postType === type;
            const labels: any = { text: 'Post', media: 'Media', link: 'Link', poll: 'Poll' };
            const icons: any = { text: 'document-text', media: 'images', link: 'link', poll: 'stats-chart' };

            return (
              <TouchableOpacity
                key={type}
                onPress={() => setPostType(type)}
                className={`py-4 mr-6 flex-row items-center border-b-2 ${isActive ? 'border-orange-500' : 'border-transparent'}`}
              >
                <Ionicons name={icons[type]} size={18} color={isActive ? '#f97316' : c.subText} />
                <Text 
                  className={`ml-2 font-bold ${isActive ? 'text-orange-500' : ''}`}
                  style={{ color: isActive ? '#f97316' : c.subText }}
                >
                  {labels[type]}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View className="p-6">
          {/* Community Picker */}
          <View className="mb-6">
            <Text className="text-xs font-bold mb-2 ml-1" style={{ color: c.subText }}>Select Community</Text>
            <View className="rounded-2xl overflow-hidden border" style={{ backgroundColor: c.input, borderColor: c.border }}>
              <Picker
                selectedValue={selectedCommunity}
                onValueChange={(val) => setSelectedCommunity(val)}
                dropdownIconColor={isDark ? '#fff' : '#000'}
                style={{ color: c.text }}
              >
                {communities.map(comm => (
                  <Picker.Item key={comm._id} label={`v/${comm.name}`} value={comm._id} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Title */}
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="An interesting title"
            placeholderTextColor="#94a3b8"
            className="text-xl font-bold mb-6"
            style={{ color: c.text }}
            multiline
          />

          {/* Content Based on Tool */}
          {postType === 'text' && (
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Body text (optional)"
              placeholderTextColor="#94a3b8"
              className="text-base font-medium min-h-[150px]"
              style={{ color: c.text }}
              multiline
              textAlignVertical="top"
            />
          )}

          {postType === 'link' && (
            <TextInput
              value={link}
              onChangeText={setLink}
              placeholder="URL (https://...)"
              placeholderTextColor="#94a3b8"
              className="px-4 py-4 rounded-2xl font-medium text-base mb-4"
              style={{ backgroundColor: c.input, color: c.text, borderWidth: 1, borderColor: c.border }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}

          {postType === 'media' && (
            <View>
              <TouchableOpacity
                onPress={pickMedia}
                className="w-full h-40 border-2 border-dashed rounded-3xl items-center justify-center mb-6"
                style={{ borderColor: c.border, backgroundColor: c.input }}
              >
                <Ionicons name="cloud-upload-outline" size={40} color={c.subText} />
                <Text className="font-bold mt-2" style={{ color: c.subText }}>Upload Media</Text>
              </TouchableOpacity>

              <View className="flex-row flex-wrap gap-3">
                {mediaFiles.map((file, idx) => (
                  <View key={idx} className="w-[30%] aspect-square rounded-xl overflow-hidden relative">
                    <Image source={{ uri: file.uri }} className="w-full h-full" />
                    <TouchableOpacity
                      onPress={() => removeMedia(idx)}
                      className="absolute top-1 right-1 bg-black/60 w-6 h-6 rounded-full items-center justify-center"
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {postType === 'poll' && (
            <View>
               <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="Ask your community a question..."
                placeholderTextColor="#94a3b8"
                className="text-base font-medium mb-6"
                style={{ color: c.text }}
                multiline
              />
              <Text className="text-sm font-bold mb-4" style={{ color: c.text }}>Poll Options</Text>
              {pollOptions.map((opt, idx) => (
                <View key={idx} className="flex-row items-center mb-3">
                  <TextInput
                    value={opt}
                    onChangeText={(text) => {
                      const newOpts = [...pollOptions];
                      newOpts[idx] = text;
                      setPollOptions(newOpts);
                    }}
                    placeholder={`Option ${idx + 1}`}
                    placeholderTextColor="#94a3b8"
                    className="flex-1 px-4 py-3 rounded-xl font-medium"
                    style={{ backgroundColor: c.input, color: c.text, borderWidth: 1, borderColor: c.border }}
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity onPress={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))} className="ml-2">
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {pollOptions.length < 6 && (
                <TouchableOpacity 
                  onPress={() => setPollOptions([...pollOptions, ''])}
                  className="flex-row items-center py-2"
                >
                  <Ionicons name="add-circle" size={20} color="#f97316" />
                  <Text className="ml-2 font-bold text-orange-500">Add Option</Text>
                </TouchableOpacity>
              )}

              <View className="mt-6 flex-row items-center justify-between border-t pt-4" style={{ borderColor: c.border }}>
                <Text className="font-bold" style={{ color: c.text }}>Poll Duration</Text>
                <View className="rounded-xl overflow-hidden border w-32" style={{ backgroundColor: c.input, borderColor: c.border }}>
                  <Picker
                    selectedValue={pollDuration}
                    onValueChange={(val) => setPollDuration(val)}
                    style={{ color: c.text }}
                  >
                    {[1, 2, 3, 5, 7].map(days => (
                      <Picker.Item key={days} label={`${days} Day${days > 1 ? 's' : ''}`} value={days} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          )}
        </View>
        
        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
