import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Ek naya Axios instance banate hain jisme by default withCredentials true rahega
const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true, // Ab har request mein automatically cookies jayengi 🍪
  headers: {
    'X-CSRF-Protection': '1', // 🛡️ Anti-CSRF Header
  }
});

// Request Interceptor: Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor: Har API response yahan se hokar guzrega
api.interceptors.response.use(
  (response) => {
    // Agar response successful hai, toh use aage bhej do
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Backend 403 (Forbidden) bhejta hai jab Token expire ho jata hai ya invalid hota hai
    // Agar 403 aaya, aur humne pehle retry nahi kiya hai, toh token refresh karne ki koshish karo
    if (error.response?.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Background mein naya token mangwao (Cookies use karke)
        // 🛡️ Added CSRF header for refresh request
        await axios.post(`${apiUrl}/api/auth/refresh-token`, {}, { 
          withCredentials: true,
          headers: { 'X-CSRF-Protection': '1' }
        });
        
        // Token refresh success ho gaya! Ab fail hui request ko wapas attempt karo
        return api(originalRequest);
      } catch (refreshError) {
        // Agar refresh token bhi expire ho gaya (jaise 7 din pure ho gaye)
        console.error("Session expired. Please log in again.");
        
        // 🧹 Clean EVERYTHING from localStorage to prevent infinite loop
        localStorage.removeItem('user'); 
        localStorage.removeItem('token'); 

        // 🛑 Prevent infinite refresh loop if already on /login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'; 
        }
        
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;