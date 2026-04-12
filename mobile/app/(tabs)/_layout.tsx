import { Tabs, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Platform, Text, Modal, ScrollView, Appearance } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from 'nativewind';
import * as SecureStore from 'expo-secure-store';

export default function TabLayout() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [localUser, setLocalUser] = useState<any>(null);
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();

  useEffect(() => {
    SecureStore.getItemAsync('user').then(data => {
      if (data) setLocalUser(JSON.parse(data));
    });
  }, [menuVisible]);

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setMenuVisible(false);
    router.replace('/(auth)/login');
  };

  const CustomHeaderLeft = () => (
    <View className="flex-row items-center ml-4">
      <TouchableOpacity onPress={() => setMenuVisible(true)} className="border border-white rounded-full shadow-sm mr-3 bg-white w-[38px] h-[38px] items-center justify-center" style={{ elevation: 2 }}>
        <Ionicons name="menu-outline" size={22} color="#1f2937" />
      </TouchableOpacity>
      <View className="border border-white rounded-full bg-white shadow-sm overflow-hidden items-center justify-center w-[38px] h-[38px]" style={{ elevation: 2 }}>
        <Image
          source={require('../../assets/images/logo.png')}
          className="w-full h-full"
          contentFit="cover"
          transition={200}
        />
      </View>
    </View>
  );

  const CustomHeaderTitle = () => null;

  const CustomHeaderRight = () => (
    <View className="flex-row items-center mr-4 gap-2">
      <TouchableOpacity onPress={() => router.push('/(tabs)/explore')} className="w-9 h-9 bg-white rounded-full items-center justify-center shadow-sm border border-white" style={{ elevation: 2 }}>
        <Ionicons name="search-outline" size={20} color="#4b5563" />
      </TouchableOpacity>

      <TouchableOpacity className="relative w-9 h-9 bg-white rounded-full items-center justify-center shadow-sm border border-white" style={{ elevation: 2 }}>
        <Ionicons name="megaphone-outline" size={20} color="#4b5563" />
        <View className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
      </TouchableOpacity>

      <TouchableOpacity className="relative w-9 h-9 bg-white rounded-full items-center justify-center shadow-sm border border-white" style={{ elevation: 2 }}>
        <Ionicons name="notifications-outline" size={20} color="#4b5563" />
        <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-[16px] h-[16px] items-center justify-center shadow-sm border border-white">
          <Text className="text-white text-[9px] font-extrabold">1</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/create' as any)}
        className="w-9 h-9 bg-white rounded-full items-center justify-center shadow-sm border border-white" style={{ elevation: 2 }}
      >
        <Ionicons name="pencil-outline" size={20} color="#4b5563" />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: 'gray',
          headerShown: true,
          headerStyle: { backgroundColor: '#F3F4F6', elevation: 0, shadowOpacity: 0, borderBottomWidth: 0 },
          headerTitleAlign: 'center',
          headerLeft: () => <CustomHeaderLeft />,
          headerTitle: () => <CustomHeaderTitle />,
          headerRight: () => <CustomHeaderRight />,
          tabBarButton: HapticTab,
          tabBarStyle: {
            height: Platform.OS === 'ios' ? 85 : 65,
            paddingBottom: Platform.OS === 'ios' ? 25 : 10,
            paddingTop: 10,
            backgroundColor: '#ffffff',
            borderTopColor: '#e5e7eb',
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: 'bold',
            marginTop: 4
          }
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? "home" : "home-outline"} color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? "compass" : "compass-outline"} color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            href: null,
            title: 'Chat'
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? "person" : "person-outline"} color={color} />,
          }}
        />
      </Tabs>

      {/* Hamburger Sliding Menu Modal / Dropdown */}
      <Modal visible={menuVisible} animationType="fade" transparent={true} onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity className="flex-1 bg-blue-900/10" activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View className="absolute top-0 left-4 bg-white rounded-b-[24px] rounded-tr-[24px] shadow-2xl p-2 w-[280px] border border-gray-100"
            style={{ marginTop: Platform.OS === 'ios' ? 50 : 20 }}>

            {/* Header Mirror to align with the nav bar */}
            <View className="flex-row items-center mb-4 px-2 pt-2">
              <TouchableOpacity onPress={() => setMenuVisible(false)} className="border border-gray-200 rounded-xl mr-3 bg-gray-50/50 w-10 h-10 items-center justify-center">
                <Ionicons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
              <View className="border border-gray-100 rounded-full bg-white shadow-sm overflow-hidden items-center justify-center w-[34px] h-[34px]">
                <Image
                  source={require('../../assets/images/logo.png')}
                  className="w-full h-full"
                  contentFit="cover"
                  transition={200}
                />
              </View>
            </View>

            {/* User Profile Info Card */}
            {localUser ? (
              <View className="flex-row items-center bg-white px-3 pb-4 mb-2 border-b border-gray-100">
                <View className="w-[46px] h-[46px] rounded-full bg-orange-500 items-center justify-center mr-3 shadow-sm shadow-orange-500/30">
                  <Text className="text-xl font-bold text-white uppercase">{localUser.username?.charAt(0) || 'U'}</Text>
                </View>
                <View>
                  <Text className="text-[15px] font-black text-gray-900 leading-tight">u/{localUser.username}</Text>
                  <Text className="text-[11px] font-bold text-green-500 mt-0.5">Online</Text>
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="flame" size={12} color="#f97316" />
                    <Text className="text-[11px] font-extrabold text-orange-600 ml-1">{localUser.anubhav || 0} Anubhav</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View className="px-3 pb-3 mb-2 border-b border-gray-50">
                <Text className="text-sm font-bold text-gray-500">Not logged in</Text>
              </View>
            )}

            {/* Menu Dropdown Actions */}
            <View className="px-1">
              <TouchableOpacity onPress={() => { setMenuVisible(false); router.push('/(tabs)/profile'); }} className="flex-row items-center py-3.5 px-3 rounded-[14px]">
                <Ionicons name="person-outline" size={20} color="#4b5563" />
                <Text className="text-[15px] font-medium text-gray-700 ml-4">View Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setMenuVisible(false); router.push('/(tabs)/explore'); }} className="flex-row items-center py-3.5 px-3 rounded-[14px]">
                <Ionicons name="people-outline" size={20} color="#4b5563" />
                <Text className="text-[15px] font-medium text-gray-700 ml-4">Create Community</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setMenuVisible(false); }} className="flex-row items-center py-3.5 px-3 rounded-[14px]">
                <Ionicons name="chatbubble-outline" size={20} color="#4b5563" />
                <Text className="text-[15px] font-medium text-gray-700 ml-4">Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleColorScheme} className="flex-row items-center py-3.5 px-3 rounded-[14px]">
                <Ionicons name={colorScheme === 'dark' ? "moon" : "moon-outline"} size={20} color="#4b5563" />
                <Text className="text-[15px] font-medium text-gray-700 ml-4">Dark Mode</Text>
              </TouchableOpacity>

              <View className="h-[1px] bg-gray-100 my-2 mx-3" />

              <TouchableOpacity onPress={handleLogout} className="flex-row items-center py-3.5 px-3 rounded-[14px] mb-2">
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text className="text-[15px] font-medium text-red-500 ml-4">Log Out</Text>
              </TouchableOpacity>
            </View>

          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
