import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
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
import About from './pages/About';
import Blog from './pages/Blog';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import MobileBottomNav from './components/MobileBottomNav';
import { SocketProvider } from './context/SocketContext';
import toast, { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import ChatRooms from './pages/ChatRooms';
import ChatRoom from './pages/ChatRoom';
import { cancelPendingRequests } from './api';

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    // 🕒 INACTIVITY LOGIC (Robust Version)
    // Tracks last activity and checks periodically to avoid browser throttling issues
    let lastActivity = Date.now();
    const INACTIVITY_LIMIT = 2 * 60 * 60 * 1000; // 2 hours

    const handleLogout = async () => {
      if (localStorage.getItem('token') || document.cookie.includes('token')) {
        // 🛑 Cancel all pending API requests immediately
        cancelPendingRequests();
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');
        try {
          // Attempt to wipe HttpOnly cookies on the backend
          await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/logout`, { method: 'POST' });
        } catch(err) {
            console.error('[Logout] API error (ignoring):', err);
        }
        
        // Dispatch auth-change event to update SocketContext immediately
        window.dispatchEvent(new Event('auth-change'));
        
        toast.error('Session expired due to inactivity. Please log in again.', { duration: 5000 });
        
        // Dispatch storage event so same-tab listeners (Navbar, RightSidebar) can react
        window.dispatchEvent(new Event('storage'));
        
        // Use full page reload instead of navigate() to ensure ALL components
        // re-initialize with clean state (no stale user data in Navbar/RightSidebar)
        setTimeout(() => {
          window.location.replace('/login');
        }, 200);
      }
    };

    const resetActivity = () => {
      lastActivity = Date.now();
    };

    // Check every 1 minute if the user has been inactive for too long
    const checkInterval = setInterval(() => {
      if (Date.now() - lastActivity > INACTIVITY_LIMIT) {
        handleLogout();
      }
    }, 60000); // 60 seconds

    // Track common user interactions
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'
    ];

    activityEvents.forEach(event => {
      window.addEventListener(event, resetActivity);
    });

    return () => {
      clearInterval(checkInterval);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetActivity);
      });
    };
  }, [navigate]);

  return (
    <ThemeProvider>
      <SocketProvider>
        <Helmet>
          <title>Vartalap - Connect, Share, and Grow Together | The Indian Reddit & StackOverflow</title>
          <meta name="description" content="Vartalap is a vibrant community platform and the best alternative to Reddit, Quora, and StackOverflow. Students and professionals come together to share ideas, ask coding questions, and build meaningful networks." />
          <meta name="keywords" content="vartalap.live, varta, reddit, community, students, professionals, networking, questions, answers, discussion forum, vartalap, Vartalap, Vartlap, Vartalp, VARTALAP, reddit alternative, stackoverflow alternative, quora alternative, indian forum, coding help, ask questions" />
          <meta property="og:title" content="Vartalap - Connect, Share, and Grow Together | The Indian Reddit & StackOverflow" />
          <meta property="og:description" content="Vartalap is a vibrant community platform and the best alternative to Reddit, Quora, and StackOverflow. Students and professionals come together to share ideas, ask coding questions, and build meaningful networks." />
          <meta name="twitter:title" content="Vartalap - Connect, Share, and Grow Together | The Indian Reddit & StackOverflow" />
          <meta name="twitter:description" content="Vartalap is a vibrant community platform and the best alternative to Reddit, Quora, and StackOverflow. Students and professionals come together to share ideas, ask coding questions, and build meaningful networks." />
        </Helmet>
        <div className="h-screen flex flex-col bg-[#f0f2f5] dark:bg-[#030303] text-gray-900 dark:text-white transition-colors duration-200 overflow-hidden">
        <Toaster 
          position="bottom-center"
          toastOptions={{
            className: 'custom-toast-style border border-gray-200 dark:border-[#343536] shadow-lg',
            duration: 1500,
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
              <Route path="/about" element={<About />} />
              <Route path="/blog" element={<Blog />} />
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