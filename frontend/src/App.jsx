import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Home from './pages/Home';
import PostPage from './pages/PostPage';
import CreateCommunity from './pages/CreateCommunity';
import CommunityPage from './pages/CommunityPage';
import UserProfile from './pages/UserProfile';
import CreatePostPage from './pages/CreatePostPage';
import Explore from './pages/Explore';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import MobileBottomNav from './components/MobileBottomNav';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <div className="h-screen flex flex-col bg-gray-100 dark:bg-[#030303] text-gray-900 dark:text-white transition-colors duration-200 overflow-hidden">
        <Toaster 
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#333',
              color: '#fff',
            },
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