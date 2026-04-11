import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateHub() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const cards = [
    {
      id: 'post',
      title: 'Post / Poll',
      description: 'Share thoughts, media, or polls',
      icon: 'pencil',
      color: '#f97316',
      route: '/create/post',
    },
    {
      id: 'community',
      title: 'Community',
      description: 'Start a new community forum',
      icon: 'people',
      color: '#3b82f6',
      route: '/create/community',
    },
    {
      id: 'chat-room',
      title: 'Chat Room',
      description: 'Start an ephemeral conversation',
      icon: 'chatbubbles',
      color: '#10b981',
      route: '/create/chat' as any,
    },
    {
      id: 'event',
      title: 'Event',
      description: 'Host a meetup or stream',
      icon: 'calendar',
      color: '#8b5cf6',
      route: '/create/event',
    },
  ];

  const c = {
    bg: isDark ? '#0a0a0a' : '#f8fafc',
    card: isDark ? '#1a1a1b' : '#ffffff',
    text: isDark ? '#ffffff' : '#0f172a',
    subText: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View className="px-6 py-4 flex-row items-center justify-between">
        <Text className="text-3xl font-black" style={{ color: c.text }}>Create</Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center bg-gray-100 dark:bg-gray-800"
        >
          <Ionicons name="close" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pt-2">
        <Text className="text-base font-medium mb-6" style={{ color: c.subText }}>
          What would you like to build today?
        </Text>

        <View className="flex-row flex-wrap justify-between">
          {cards.map((card) => (
            <TouchableOpacity
              key={card.id}
              onPress={() => router.push(card.route as any)}
              activeOpacity={0.7}
              style={{ 
                backgroundColor: c.card,
                width: '48%',
                aspectRatio: 1,
                borderRadius: 24,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: c.border,
                // Shadows for premium feel
                shadowColor: card.color,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 3,
              }}
              className="justify-between"
            >
              <View 
                style={{ backgroundColor: `${card.color}15` }}
                className="w-12 h-12 rounded-2xl items-center justify-center"
              >
                <Ionicons name={card.icon as any} size={24} color={card.color} />
              </View>
              
              <View>
                <Text className="text-lg font-bold" style={{ color: c.text }}>{card.title}</Text>
                <Text className="text-[11px] font-medium leading-tight mt-1" style={{ color: c.subText }}>
                  {card.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View className="mt-8 p-6 rounded-3xl bg-orange-500/10 border border-orange-500/20">
          <View className="flex-row items-center mb-2">
            <Ionicons name="sparkles" size={20} color="#f97316" />
            <Text className="text-lg font-bold text-orange-600 ml-2">Tip</Text>
          </View>
          <Text className="text-sm font-medium text-orange-700/80 leading-relaxed">
            Sharing quality content increases your Anubhav score and helps you rank up in the community!
          </Text>
        </View>
        
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
