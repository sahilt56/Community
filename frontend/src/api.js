import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create an AbortController to cancel pending requests on logout
let requestAbortController = new AbortController();

// Export function to cancel pending requests
export const cancelPendingRequests = () => {
  requestAbortController.abort();
  requestAbortController = new AbortController(); // Create new one for future requests
};

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
  // Attach abort signal to cancel request if needed
  config.signal = requestAbortController.signal;
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
    // Silently ignore canceled requests (from logout or pending request cancellation)
    if (axios.isCancel(error)) {
      console.log("Request canceled:", error.message);
      return Promise.reject(error);
    }

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

    // Try to refresh token on ANY 401 if we have a user session active 
    if (error.response?.status === 401 && !originalRequest._retry && localStorage.getItem('user')) {
      originalRequest._retry = true;

      try {
        // Background mein naya token mangwao (Cookies use karke)
        // 🛡️ Added CSRF header for refresh request
        const refreshRes = await axios.post(`${apiUrl}/api/auth/refresh-token`, {}, { 
          withCredentials: true,
          headers: { 'X-CSRF-Protection': '1' },
          signal: requestAbortController.signal // Attach abort signal here too
        });

        // Save new token to localStorage so subsequent requests use the fresh token
        if (refreshRes.data?.token) {
          localStorage.setItem('token', refreshRes.data.token);
          originalRequest.headers.Authorization = `Bearer ${refreshRes.data.token}`;
        }
        
        // Token refresh success ho gaya! Ab fail hui request ko wapas attempt karo
        return api(originalRequest);
      } catch (refreshError) {
        // Silently ignore if refresh request was also canceled
        if (axios.isCancel(refreshError)) {
          console.log("Refresh request canceled");
          return Promise.reject(refreshError);
        }

        // Agar refresh token bhi expire ho gaya (jaise 7 din pure ho gaye)
        console.error("Session expired. Please log in again.");
        
        // 🛡️ Guard: Agar user abhi abhi login kiya hai (< 5 seconds ago),
        // toh purani in-flight 401 request ka redirect ignore karo
        const loginTime = localStorage.getItem('loginTime');
        if (loginTime && Date.now() - parseInt(loginTime) < 5000) {
          return Promise.reject(refreshError);
        }
        
        // 🧹 Clean EVERYTHING from localStorage to prevent infinite loop
        localStorage.removeItem('user'); 
        localStorage.removeItem('token'); 
        localStorage.removeItem('loginTime');

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