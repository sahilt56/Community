import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, 
  ActivityIndicator, Platform, KeyboardAvoidingView, 
  ScrollView, Image, StyleSheet, useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import api from '../../api';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);

  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleSendOtp = async () => {
    if (!username || !email || !password) {
      Alert.alert('Hold On', 'Please fill all fields to continue.');
      return;
    }
    if (password.length < 8 || !/\d/.test(password) || !/[A-Z]/.test(password)) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters, include a number and an uppercase letter!');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/send-otp', { email, username });
      Alert.alert('OTP Sent', 'Check your email for the verification code. (It is valid for 5 mins)');
      setShowOtpInput(true);
    } catch (err: any) {
      console.log("OTP Error:", err?.response?.data || err);
      Alert.alert('Error', err.response?.data?.message || err.response?.data?.error || 'Failed to send OTP. Check your network.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!otp) {
      Alert.alert('Hold On', 'Please enter the 6-digit OTP sent to your email.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/auth/register', { 
        username, email, password, otp, userType: 'student' 
      });
      const { token, user } = res.data;
      if (Platform.OS === 'web') {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('user', JSON.stringify(user));
      }
      Alert.alert('Success', 'Welcome to Vartalap! 🎉', [
        { text: 'Start Exploring', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (err: any) {
      console.log("Registration Error:", err?.response?.data || err);
      Alert.alert('Registration Failed', err.response?.data?.message || err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAlert = () => {
    Alert.alert(
      "Feature Required", 
      "Google Sign-In requires configuring a Native Android/iOS Client ID in the Google Cloud Console. Since this is an unreleased preview app, please use Email Sign Up for now. 🙏"
    );
  };

  // All styles are pure React Native - no NativeWind className anywhere
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
    linkText: isDark ? '#60a5fa' : '#2563eb',
    otpBg: isDark ? 'rgba(249,115,22,0.08)' : '#fff7ed',
  };

  return (
    <SafeAreaView style={[s.flex1, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={s.flex1}
      >
        <ScrollView contentContainerStyle={s.scroll}>
          
          {!showOtpInput ? (
            <View>
              {/* Header */}
              <View style={s.headerWrap}>
                <View style={[s.logoWrap, { backgroundColor: isDark ? '#1a1a1b' : '#fff' }, !isDark && s.logoShadow]}>
                  <Image 
                    source={require('../../assets/images/logo.png')} 
                    style={s.logoImg}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[s.title, { color: colors.text }]}>Create Account</Text>
                <Text style={[s.subtitle, { color: colors.subText }]}>
                  Join Vartalap to share your thoughts and make new connections.
                </Text>
              </View>

              {/* Form */}
              <View>
                {/* Username */}
                <View style={[s.inputRow, { backgroundColor: colors.cardBg, borderColor: usernameFocused ? colors.focusBorder : colors.inputBorder }]}>
                  <Ionicons name="person" size={22} color={usernameFocused ? '#f97316' : colors.placeholder} style={s.inputIcon} />
                  <TextInput
                    style={[s.input, { color: colors.text }]}
                    placeholder="Username"
                    placeholderTextColor={colors.placeholder}
                    value={username}
                    onChangeText={setUsername}
                    onFocus={() => setUsernameFocused(true)}
                    onBlur={() => setUsernameFocused(false)}
                    autoCapitalize="none"
                    selectionColor="#f97316"
                  />
                </View>

                {/* Email */}
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

                {/* Password */}
                <View style={[s.inputRow, { backgroundColor: colors.cardBg, borderColor: passwordFocused ? colors.focusBorder : colors.inputBorder, marginBottom: 24 }]}>
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

                {/* Continue Button */}
                <TouchableOpacity 
                  onPress={handleSendOtp} 
                  disabled={loading}
                  activeOpacity={0.8}
                  style={[s.primaryBtn, s.btnShadow, { backgroundColor: loading ? '#fb923c' : '#f97316' }]}
                >
                  {loading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={s.primaryBtnText}>Continue with Email</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Separator */}
              <View style={s.separatorWrap}>
                <View style={s.separatorRow}>
                  <View style={[s.separatorLine, { backgroundColor: colors.separator }]} />
                  <Text style={[s.separatorText, { color: colors.placeholder }]}>OR CONNECT VIA</Text>
                  <View style={[s.separatorLine, { backgroundColor: colors.separator }]} />
                </View>
                
                {/* Google Button */}
                <TouchableOpacity 
                  onPress={handleGoogleAlert} 
                  style={[s.googleBtn, { backgroundColor: colors.googleBg, borderColor: colors.googleBorder }, !isDark && s.cardShadow]}
                >
                  <Ionicons name="logo-google" size={24} color={colors.googleIcon} />
                  <Text style={[s.googleBtnText, { color: colors.googleText }]}>Sign up with Google</Text>
                </TouchableOpacity>
              </View>

              {/* Login Link */}
              <View style={s.bottomLink}>
                <Text style={[s.bottomLinkText, { color: colors.subText }]}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                  <Text style={[s.bottomLinkAction, { color: colors.linkText }]}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ===== OTP Verification View ===== */
            <View style={s.otpContainer}>
              <View style={[s.otpIconWrap, { backgroundColor: colors.otpBg }, !isDark && s.cardShadow]}>
                <Ionicons name="mail-open" size={36} color="#f97316" />
              </View>
              
              <Text style={[s.otpTitle, { color: colors.text }]}>Verify Email</Text>
              
              <Text style={[s.otpSubtitle, { color: colors.subText }]}>
                {"We've sent a 6-digit code to\n"}
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>{email}</Text>
              </Text>

              <View style={[s.otpInputRow, { backgroundColor: colors.cardBg, borderColor: otpFocused ? colors.focusBorder : colors.inputBorder }]}>
                <Ionicons name="keypad" size={24} color={otpFocused ? '#f97316' : colors.placeholder} style={{ marginRight: 4 }} />
                <TextInput
                  style={[s.otpInput, { color: colors.text }]}
                  placeholder="• • • • • •"
                  placeholderTextColor={colors.placeholder}
                  value={otp}
                  onChangeText={setOtp}
                  onFocus={() => setOtpFocused(true)}
                  onBlur={() => setOtpFocused(false)}
                  keyboardType="number-pad"
                  maxLength={6}
                  selectionColor="#f97316"
                  textAlign="center"
                />
              </View>

              <TouchableOpacity 
                onPress={handleRegister} 
                disabled={loading}
                activeOpacity={0.8}
                style={[s.primaryBtn, s.btnShadow, { backgroundColor: loading ? '#fb923c' : '#f97316' }]}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={s.primaryBtnText}>Confirm & Register</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => setShowOtpInput(false)} style={[s.editEmailBtn, { backgroundColor: isDark ? '#1a1a1b' : '#f3f4f6' }]}>
                <Text style={[s.editEmailText, { color: isDark ? '#d1d5db' : '#374151' }]}>Edit Email Address</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex1: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingVertical: 40, justifyContent: 'center' },

  // Header
  headerWrap: { alignItems: 'center', marginBottom: 40 },
  logoWrap: { marginBottom: 24, borderRadius: 32, padding: 8 },
  logoShadow: { elevation: 12, shadowColor: '#f97316', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  logoImg: { width: 80, height: 80, borderRadius: 22 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 8, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, textAlign: 'center', fontWeight: '500', paddingHorizontal: 16, lineHeight: 24 },

  // Inputs
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 64, borderRadius: 18, borderWidth: 1.5, marginBottom: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '500', marginLeft: 8 },
  eyeBtn: { padding: 8, marginLeft: 4 },

  // Buttons
  primaryBtn: { width: '100%', paddingVertical: 16, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 18, letterSpacing: 0.5 },
  btnShadow: { elevation: 8, shadowColor: '#f97316', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  cardShadow: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },

  // Separator
  separatorWrap: { marginTop: 40, alignItems: 'center' },
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

  // OTP Screen
  otpContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, minHeight: 400 },
  otpIconWrap: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  otpTitle: { fontSize: 28, fontWeight: '800', marginBottom: 12, letterSpacing: -0.5, textAlign: 'center' },
  otpSubtitle: { fontSize: 16, textAlign: 'center', marginBottom: 40, paddingHorizontal: 24, lineHeight: 24 },
  otpInputRow: { width: '100%', borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 64, borderWidth: 1.5, marginBottom: 32 },
  otpInput: { flex: 1, fontSize: 22, fontWeight: 'bold', letterSpacing: 6, marginLeft: 8 },
  editEmailBtn: { marginTop: 32, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 50 },
  editEmailText: { fontWeight: 'bold', fontSize: 15 },
});
