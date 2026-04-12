import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, Platform, KeyboardAvoidingView,
  ScrollView, StyleSheet, useColorScheme
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import api from '../../api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hold On', 'Please enter both your email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { token, user } = res.data;
      if (Platform.OS === 'web') {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('loginTime', Date.now().toString());
      } else {
        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('user', JSON.stringify(user));
        await SecureStore.setItemAsync('loginTime', Date.now().toString());
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      console.log("Login Error:", err?.response?.data || err);
      Alert.alert('Login Failed', err.response?.data?.message || err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const colors = {
    bg: isDark ? '#121212' : '#ffffff',
    cardBg: isDark ? '#1a1a1b' : '#f9fafb',
    inputBorder: isDark ? '#343536' : '#f3f4f6',
    focusBorder: '#f97316',
    text: isDark ? '#ffffff' : '#111827',
    subText: isDark ? '#9ca3af' : '#6b7280',
    placeholder: isDark ? '#6b7280' : '#9ca3af',
    separator: isDark ? '#343536' : '#e5e7eb',
    googleBg: isDark ? '#1a1a1b' : '#ffffff',
    googleBorder: isDark ? '#343536' : '#e5e7eb',
    googleText: isDark ? '#e5e7eb' : '#374151',
    googleIcon: isDark ? '#e5e7eb' : '#4b5563',
    orange: '#f97316',
    orangeLight: isDark ? '#fb923c' : '#ea580c',
  };

  return (
    <SafeAreaView style={[s.flex1, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.flex1}
      >
        <ScrollView contentContainerStyle={s.scroll}>

          {/* Logo & Welcome Header */}
          <View style={s.headerWrap}>
            <View style={[s.logoWrap, { backgroundColor: isDark ? '#1a1a1b' : '#fff' }, !isDark && s.logoShadow]}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={s.logoImg}
                contentFit="contain"
                transition={300}
              />
            </View>
            <Text style={[s.title, { color: colors.text }]}>Welcome Back!</Text>
            <Text style={[s.subtitle, { color: colors.subText }]}>
              Log in to jump back into the conversation with the community.
            </Text>
          </View>

          {/* Form Fields */}
          <View>
            {/* Email Input */}
            <View style={[s.inputRow, { backgroundColor: colors.cardBg, borderColor: emailFocused ? colors.focusBorder : colors.inputBorder }]}>
              <Ionicons name="mail" size={22} color={emailFocused ? '#f97316' : colors.placeholder} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: colors.text }]}
                placeholder="Email Address"
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                autoCapitalize="none"
                keyboardType="email-address"
                selectionColor="#f97316"
              />
            </View>

            {/* Password Input */}
            <View style={[s.inputRow, { backgroundColor: colors.cardBg, borderColor: passwordFocused ? colors.focusBorder : colors.inputBorder, marginBottom: 8 }]}>
              <Ionicons name="lock-closed" size={22} color={passwordFocused ? '#f97316' : colors.placeholder} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: colors.text }]}
                placeholder="Password"
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                selectionColor="#f97316"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                <Ionicons name={showPassword ? "eye" : "eye-off"} size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={s.forgotBtn}>
              <Text style={[s.forgotText, { color: colors.orangeLight }]}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
              style={[s.primaryBtn, s.btnShadow, { backgroundColor: loading ? '#fb923c' : '#f97316' }]}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={s.primaryBtnText}>Log In securely</Text>
              )}
            </TouchableOpacity>

            {/* Retry Note */}
            <View style={[s.noteBox, { backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff', borderColor: isDark ? 'rgba(59,130,246,0.25)' : '#bfdbfe' }]}>
              <Ionicons name="information-circle" size={18} color={isDark ? '#60a5fa' : '#3b82f6'} style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={[s.noteText, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
                Agar login nahi ho pa raha hai to 10-20 second baad dubara try kijiye, ho jayega!
              </Text>
            </View>
          </View>

          {/* Separator */}
          <View style={s.separatorWrap}>
            <View style={s.separatorRow}>
              <View style={[s.separatorLine, { backgroundColor: colors.separator }]} />
              <Text style={[s.separatorText, { color: colors.placeholder }]}>OR CONNECT VIA</Text>
              <View style={[s.separatorLine, { backgroundColor: colors.separator }]} />
            </View>

            {/* Google Button */}
            <TouchableOpacity style={[s.googleBtn, { backgroundColor: colors.googleBg, borderColor: colors.googleBorder }, !isDark && s.cardShadow]}>
              <Ionicons name="logo-google" size={24} color={colors.googleIcon} />
              <Text style={[s.googleBtnText, { color: colors.googleText }]}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View style={s.bottomLink}>
            <Text style={[s.bottomLinkText, { color: colors.subText }]}>New to Vartalap? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[s.bottomLinkAction, { color: colors.orange }]}>Sign Up now</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex1: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingVertical: 40, justifyContent: 'center' },

  // Header
  headerWrap: { alignItems: 'center', marginBottom: 48 },
  logoWrap: { marginBottom: 24, borderRadius: 32, padding: 8 },
  logoShadow: { elevation: 12, shadowColor: '#f97316', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  logoImg: { width: 96, height: 96, borderRadius: 26 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 8, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, textAlign: 'center', fontWeight: '500', paddingHorizontal: 16, lineHeight: 24 },

  // Inputs
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 64, borderRadius: 18, borderWidth: 1.5, marginBottom: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '500', marginLeft: 8 },
  eyeBtn: { padding: 8, marginLeft: 4 },

  // Forgot Password
  forgotBtn: { alignItems: 'flex-end', marginBottom: 32, marginTop: 4 },
  forgotText: { fontWeight: 'bold', fontSize: 15 },

  // Buttons
  primaryBtn: { width: '100%', paddingVertical: 16, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 18, letterSpacing: 0.5 },
  btnShadow: { elevation: 8, shadowColor: '#f97316', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  cardShadow: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },

  // Separator
  separatorWrap: { marginTop: 48, alignItems: 'center' },
  separatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, width: '100%', paddingHorizontal: 8 },
  separatorLine: { flex: 1, height: 1 },
  separatorText: { marginHorizontal: 16, fontWeight: 'bold', letterSpacing: 2, fontSize: 11, textTransform: 'uppercase' },

  // Google
  googleBtn: { width: '100%', height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 1, marginBottom: 40 },
  googleBtnText: { fontWeight: '800', fontSize: 16, marginLeft: 12, letterSpacing: -0.3 },

  // Bottom link
  bottomLink: { flexDirection: 'row', justifyContent: 'center', paddingBottom: 16 },
  bottomLinkText: { fontSize: 16, fontWeight: '500' },
  bottomLinkAction: { fontWeight: '800', fontSize: 16 },

  // Note
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 16, padding: 14, borderRadius: 14, borderWidth: 1 },
  noteText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19 },
});
