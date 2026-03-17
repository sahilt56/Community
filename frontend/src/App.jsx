import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Home from './pages/Home';
import PostPage from './pages/PostPage';
import CreateCommunity from './pages/CreateCommunity';
import CommunityPage from './pages/CommunityPage';
import AdminDashboard from './pages/AdminDashboard'; // Admin Dashboard
import AdminUserSupervision from './pages/AdminUserSupervision';
import UserProfile from './pages/UserProfile';
import CreatePostPage from './pages/CreatePostPage';
import Explore from './pages/Explore';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import MobileBottomNav from './components/MobileBottomNav';
import { SocketProvider } from './context/SocketContext';
import toast, { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import ChatRooms from './pages/ChatRooms';
import ChatRoom from './pages/ChatRoom';

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    let inactivityTimer;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      // 2 hours = 2 * 60 * 60 * 1000 = 7200000 ms
      inactivityTimer = setTimeout(async () => {
        if (localStorage.getItem('token') || document.cookie.includes('token')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          try {
            await fetch('/api/auth/logout', { method: 'POST' }); // ensure HttpOnly cookie is wiped
          } catch(e) {}
          
          toast.error('Session expired due to 2 hours of inactivity. Please log in again.', { duration: 5000 });
          navigate('/login');
          window.dispatchEvent(new Event('auth-change'));
        }
      }, 7200000); 
    };

    // Track common user interactions
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'
    ];

    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Start timer on mount
    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [navigate]);

  return (
    <ThemeProvider>
      <SocketProvider>
        <div className="h-screen flex flex-col bg-gray-100 dark:bg-[#030303] text-gray-900 dark:text-white transition-colors duration-200 overflow-hidden">
        <Toaster 
          position="bottom-center"
          toastOptions={{
            className: 'custom-toast-style border border-gray-200 dark:border-[#343536] shadow-lg',
          }}
        />
        <Navbar />
        <div className="flex-1 overflow-hidden w-full max-w-400 mx-auto px-4 xl:px-8 flex justify-center gap-6 mt-4 items-start">
          <LeftSidebar />
          
          {/* Main Content Area */}
          <div className="flex-1 max-w-225 min-w-0 h-full overflow-y-auto no-scrollbar pb-24 xl:pb-10 w-full mx-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/post/:id" element={<PostPage />} />
              <Route path="/create-community" element={<CreateCommunity />} />
              <Route path="/v/:id" element={<CommunityPage />} />
              <Route path="/u/:username" element={<UserProfile />} />
              <Route path="/create-post" element={<CreatePostPage />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/reports" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUserSupervision />} />
              <Route path="/chat" element={<ChatRooms />} />
              <Route path="/chat/:id" element={<ChatRoom />} />
            </Routes>
          </div>

          <RightSidebar />
        </div>
        
        <MobileBottomNav />
      </div>
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;