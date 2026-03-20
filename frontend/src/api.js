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
  // 🛡️ Prevent sending the literal string "undefined" to backend
  if (token && token !== 'undefined' && token !== 'null') {
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

    // Clear session and redirect on invalid token
    if (
      (error.response?.status === 401 && error.response.data?.code === 'TOKEN_INVALID')
    ) {
      console.error("Session invalid. Clearing session...");
      localStorage.removeItem('user'); 
      localStorage.removeItem('token'); 
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'; 
      }
      return Promise.reject(error);
    }

    // Agar 401 (Unauthorized) aaya aur backend ne 'TOKEN_EXPIRED' code bheja hai, toh token refresh karne ki koshish karo
    if (error.response?.status === 401 && error.response.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
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