import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BASE_URL = 'http://192.168.1.13:5000';

// Helper: always get a fresh token for each request
const getAuthHeaders = async () => {
  let token;
  if (Platform.OS === 'web') {
    token = localStorage.getItem('token');
  } else {
    token = await SecureStore.getItemAsync('token');
  }
  
  const headers = {
    'x-csrf-protection': '1',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Wrapper functions that inject auth headers directly (no interceptor timing issues)
const api = {
  get: async (url, config = {}) => {
    const authHeaders = await getAuthHeaders();
    return axios.get(`${BASE_URL}${url}`, {
      ...config,
      headers: { ...authHeaders, ...(config.headers || {}) }
    });
  },
  
  post: async (url, data, config = {}) => {
    const authHeaders = await getAuthHeaders();
    return axios.post(`${BASE_URL}${url}`, data, {
      ...config,
      headers: { ...authHeaders, ...(config.headers || {}) }
    });
  },
  
  put: async (url, data, config = {}) => {
    const authHeaders = await getAuthHeaders();
    return axios.put(`${BASE_URL}${url}`, data, {
      ...config,
      headers: { ...authHeaders, ...(config.headers || {}) }
    });
  },
  
  delete: async (url, config = {}) => {
    const authHeaders = await getAuthHeaders();
    return axios.delete(`${BASE_URL}${url}`, {
      ...config,
      headers: { ...authHeaders, ...(config.headers || {}) }
    });
  },
  
  patch: async (url, data, config = {}) => {
    const authHeaders = await getAuthHeaders();
    return axios.patch(`${BASE_URL}${url}`, data, {
      ...config,
      headers: { ...authHeaders, ...(config.headers || {}) }
    });
  },
};

export default api;
