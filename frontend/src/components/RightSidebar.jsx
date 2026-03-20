import React, { useEffect, useState, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import OnlineIndicator from './OnlineIndicator';
import SkeletonLoader from './SkeletonLoader';
import { SocketContext } from '../context/SocketContext';
import { Hand, Flame, Plus, Pencil } from 'lucide-react';

const RightSidebar = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const s = localStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  });
  const navigate = useNavigate();
  const [popularCommunities, setPopularCommunities] = useState([]);
  const [profileStats, setProfileStats] = useState(null);
  const [loadingPopular, setLoadingPopular] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const { socket } = useContext(SocketContext);

  // FIX: Storing the current time in state to keep the component render strictly pure
const [currentTime] = useState(() => Date.now());
  useEffect(() => {
    const sync = () => {
      setToken(localStorage.getItem('token'));
      const s = localStorage.getItem('user');
      const updatedUser = s ? JSON.parse(s) : null;
      setUser(updatedUser);
      if (updatedUser?.username) {
        api.get(`/api/users/${updatedUser.username}`)
          .then(res => setProfileStats(res.data))
          .catch(err => console.error(err));
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  // Helper function to fetch popular communities
  const fetchPopular = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoadingPopular(true);
    try {
      const res = await api.get('/api/communities?sort=popular');
      setPopularCommunities(res.data.slice(0, 5));
    } catch (err) {
      console.error("Error fetching right sidebar communities", err);
    } finally {
      if (!isBackground) setLoadingPopular(false);
    }
  }, []);

  // Helper function to fetch profile stats (Refactored for reuse)
  const fetchProfile = async (isBackground = false) => {
    if (!user?.username) return;
    if (!isBackground) setLoadingProfile(true);
    try {
      const res = await api.get(`/api/users/${user.username}`);
      // console.log("Fetched right sidebar profileStats:", res.data); // ADDED FOR DEBUGGING
      setProfileStats(res.data);
    } catch (err) {
      console.error("Error fetching right sidebar profile", err);
      // Agar logged-in user ki profile 404 de rahi hai, matlab account delete ho chuka hai
      if (err.response && err.response.status === 404) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login'; // Force auto-logout
      }
    } finally {
      if (!isBackground) setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchPopular();
    if (token && user) {
      fetchProfile();
    }
  }, [token, user, fetchPopular]);

  // Real-time Anubhav Updates
  useEffect(() => {
    if (!socket) return;

    const handleInteraction = () => {
      if (user) fetchProfile(true); 
    };

    const handleCommunityUpdate = () => {
      fetchPopular(true); // Background refresh for popular communities list
    };

    socket.on('post_interaction', handleInteraction);
    socket.on('community_updated', handleCommunityUpdate);
    return () => {
      socket.off('post_interaction', handleInteraction);
      socket.off('community_updated', handleCommunityUpdate);
    };
  }, [socket, user, fetchPopular]);

  let accountAgeText = "Ready to dive in?";
  const joinedDate = profileStats?.profile?.createdAt || user?.createdAt;
  if (joinedDate) {
    const msPerDay = 1000 * 60 * 60 * 24;
    // FIX: Replaced Date.now() with currentTime state
    const diff = Math.max(0, currentTime - new Date(joinedDate).getTime()); // Time Sync drift ko -1 jaane se rokne ke liye
    const days = Math.floor(diff / msPerDay);
    if (days === 0) accountAgeText = "Joined today";
    else if (days === 1) accountAgeText = "Joined 1 day ago";
    else if (days < 30) accountAgeText = `Joined ${days} days ago`;
    else if (days < 365) {
      const months = Math.floor(days / 30);
      accountAgeText = `Joined ${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(days / 365);
      accountAgeText = `Joined ${years} year${years > 1 ? 's' : ''} ago`;
    }
  }

  return (
    <div className="w-80 shrink-0 hidden xl:flex flex-col gap-4 sticky top-5 max-h-[calc(100vh-88px)] overflow-y-auto no-scrollbar pb-4">

      {token ? (
        <div className="card-hover bg-green-50 dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-xl overflow-hidden shadow-sm relative text-center transition-all animate-fade-up">
          {loadingProfile ? (
            <div className="p-4"><SkeletonLoader /></div>
          ) : (
            <>
              {/* Banner */}
              {profileStats?.profile?.bannerPic && (
                <div className="h-28 overflow-hidden">
                  <img
                    src={profileStats.profile.bannerPic.startsWith('http') ? profileStats.profile.bannerPic : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${profileStats.profile.bannerPic}`}
                    alt="Banner"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                  />
                </div>
              )}

              <div className="px-4 pb-4 flex flex-col items-center">
                <div className={`${profileStats?.profile?.bannerPic ? '-mt-10' : 'mt-4'} w-20 h-20 relative z-10 mb-2 shrink-0`}>
                  <div className="w-full h-full bg-gray-100 dark:bg-[#272729] border-4 border-white dark:border-[#1a1a1b] rounded-full flex items-center justify-center text-gray-900 dark:text-white text-3xl font-bold shadow-md overflow-hidden relative transition-colors">
                    {user?.username?.charAt(0).toUpperCase()}
                    {user?.profilePic && (
                      <img 
                        src={user.profilePic.startsWith('http') ? user.profilePic : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${user.profilePic}`} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover" 
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                  </div>
                  <OnlineIndicator userId={user?.id || user?._id} size="w-5 h-5" border="border-[3px] border-white dark:border-[#1a1a1b]" />
                </div>

                <Link to={`/u/${user?.username}`} className="font-bold text-gray-900 dark:text-white hover:underline text-base">{user?.username}</Link>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{accountAgeText}</p>

                <div className="flex justify-center gap-8 w-full mt-4 mb-4 border-t border-b border-gray-300 dark:border-[#343536] py-3">
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{profileStats?.totalAnubhav || profileStats?.profile?.anubhav || 0}</span>
                    <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Anubhav</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{profileStats?.posts?.length || 0}</span>
                    <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Posts</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/create-post')}
                  className="btn-press flex items-center justify-center gap-2 w-full bg-linear-to-r from-blue-500 to-blue-600 text-white font-bold py-2.5 rounded-full hover:from-blue-600 hover:to-blue-700 transition-all text-sm shadow-md"
                >
                  <Pencil size={16} strokeWidth={2.5} /> Create Post
                </button>
                <button
                  onClick={() => navigate('/create-community')}
                  className="btn-press flex items-center justify-center gap-2 w-full bg-transparent text-gray-900 dark:text-gray-300 border border-black dark:border-[#343536] font-bold py-2.5 rounded-full hover:bg-gray-50 dark:hover:bg-[#272729] mt-2.5 transition-all text-sm"
                >
                  <Plus size={16} strokeWidth={2.5} /> Create Community
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="card-hover bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-xl p-5 shadow-sm text-center transition-all animate-fade-up">
          <div className="flex justify-center mb-3 text-orange-500">
            <Hand size={36} strokeWidth={2} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Join Vartalap!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">Find interesting communities, vote on content, and join the conversation.</p>
          <button
            onClick={() => navigate('/login')}
            className="btn-press w-full bg-linear-to-r from-orange-500 to-orange-600 text-white font-bold py-2.5 rounded-full hover:from-orange-600 hover:to-orange-700 transition-all shadow-md"
          >
            Log In / Sign Up
          </button>
        </div>
      )}

      {/* Popular Communities */}
      <div className="card-hover bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-xl p-4 shadow-sm transition-all animate-fade-up stagger-2">
        <h3 className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-4">
          <Flame size={14} strokeWidth={2.5} className="text-orange-500" /> Popular Communities
        </h3>
        <div className="flex flex-col gap-3">
          {loadingPopular ? (
            <SkeletonLoader />
          ) : (
            popularCommunities.map((c, index) => (
              <div key={c._id} className={`flex items-center justify-between animate-fade-up`} style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span className="text-xs font-bold text-gray-400 w-4 text-center">{index + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 shrink-0 flex items-center justify-center text-xs text-white font-bold shadow-sm relative overflow-hidden">
                    v/
                    {c.profilePic && (
                      <img 
                        src={c.profilePic.startsWith('http') ? c.profilePic : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${c.profilePic}`} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover" 
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                  </div>
                  <div className="flex flex-col truncate">
                    <Link to={`/v/${c._id}`} className="text-sm font-bold text-gray-900 dark:text-white hover:underline truncate">v/{c.name}</Link>
                    <span className="text-xs text-gray-400">{c.members?.length || 1} members</span>
                  </div>
                </div>
                <Link
                  to={`/v/${c._id}`}
                  className="btn-press bg-gray-100 dark:bg-[#272729] text-gray-700 dark:text-gray-200 font-bold px-3 py-1.5 rounded-full text-xs hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-500/10 dark:hover:text-orange-400 transition-all shrink-0"
                >
                  View
                </Link>
              </div>
            ))
          )}
          {!loadingPopular && popularCommunities.length === 0 && <p className="text-sm text-gray-400 text-center py-2">No communities yet.</p>}
        </div>
      </div>

      {/* Partner/Sponsor Banner */}
      <div className="card-hover bg-linear-to-br from-orange-50 to-orange-100 dark:from-[#272729] dark:to-[#1a1a1b] border border-orange-200 dark:border-[#343536] rounded-xl p-5 shadow-sm transition-all animate-fade-up stagger-3 relative overflow-hidden group">
        <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider shadow-sm z-10">
          Partner
        </div>
        <div className="mt-2 mb-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Techerax
            <span className="bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">SERVICES</span>
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
            Need a stunning website or app? Hire <span className="font-bold text-gray-800 dark:text-gray-200">Techerax</span> for fast & premium web solutions.
          </p>
        </div>
        <a 
          href="https://tech-era-x.vercel.app" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="btn-press block w-full text-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-sm group-hover:shadow-md"
        >
          Explore Services
        </a>
      </div>

    </div>
  );
};

export default RightSidebar;