import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const requireAuth = async (router: any, action?: () => void) => {
  try {
    let token = null;
    if (Platform.OS === 'web') {
      token = localStorage.getItem('token');
    } else {
      token = await SecureStore.getItemAsync('token');
    }

    if (!token) {
      router.push('/auth-modal');
      return false;
    }
    
    if (action) {
      action();
    }
    return true;
  } catch (err) {
    console.error('Error checking auth:', err);
    return false;
  }
};
