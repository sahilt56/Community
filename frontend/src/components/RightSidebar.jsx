import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import OnlineIndicator from './OnlineIndicator';

const RightSidebar = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const s = localStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  });
  const navigate = useNavigate();
  const [popularCommunities, setPopularCommunities] = useState([]);
  const [profileStats, setProfileStats] = useState(null);

  // FIX: Storing the current time in state to keep the component render strictly pure
const [currentTime] = useState(() => Date.now());
  useEffect(() => {
    const sync = () => {
      setToken(localStorage.getItem('token'));
      const s = localStorage.getItem('user');
      const updatedUser = s ? JSON.parse(s) : null;
      setUser(updatedUser);
      if (updatedUser?.username) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        axios.get(`${apiUrl}/api/users/${updatedUser.username}`)
          .then(res => setProfileStats(res.data))
          .catch(err => console.error(err));
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    const fetchPopular = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await axios.get(`${apiUrl}/api/communities?sort=popular`);
        setPopularCommunities(res.data.slice(0, 5));
      } catch (err) {
        console.error("Error fetching right sidebar communities", err);
      }
    };
    fetchPopular();
    if (token && user) {
      const fetchProfile = async () => {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          const res = await axios.get(`${apiUrl}/api/users/${user.username}`);
          setProfileStats(res.data);
        } catch (err) {
          console.error("Error fetching right sidebar profile", err);
        }
      };
      fetchProfile();
    }
  }, [token, user]); // FIX: Added 'user' to the dependency array

  let accountAgeText = "Ready to dive in?";
  const joinedDate = profileStats?.profile?.createdAt || user?.createdAt;
  if (joinedDate) {
    const msPerDay = 1000 * 60 * 60 * 24;
    // FIX: Replaced Date.now() with currentTime state
    const days = Math.floor((currentTime - new Date(joinedDate).getTime()) / msPerDay);
    if (days === 0) accountAgeText = "Joined today";
    else if (days === 1) accountAgeText = "Joined 1 day ago";
    else accountAgeText = `Joined ${days} days ago`;
  }

  return (
    <div className="w-80 shrink-0 hidden lg:flex flex-col gap-4 sticky top-18 max-h-[calc(100vh-88px)] overflow-y-auto no-scrollbar pb-4">

      {token ? (
        <div className="card-hover bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-xl overflow-hidden shadow-sm relative text-center transition-all animate-fade-up">
          {/* Banner */}
          {profileStats?.profile?.bannerPic && (
            <div className="h-16 overflow-hidden">
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
                {user?.profilePic ? (
                  <img src={user.profilePic.startsWith('http') ? user.profilePic : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${user.profilePic}`} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.username?.charAt(0).toUpperCase()
                )}
              </div>
              <OnlineIndicator userId={user?.id || user?._id} size="w-5 h-5" border="border-[3px] border-white dark:border-[#1a1a1b]" />
            </div>

            <Link to={`/u/${user?.username}`} className="font-bold text-gray-900 dark:text-white hover:underline text-base">{user?.username}</Link>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{accountAgeText}</p>

            <div className="flex justify-center gap-8 w-full mt-4 mb-4 border-t border-b border-gray-100 dark:border-[#343536] py-3">
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-gray-900 dark:text-white">{profileStats?.totalKarma || 0}</span>
                <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Karma</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-gray-900 dark:text-white">{profileStats?.posts?.length || 0}</span>
                <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Posts</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/create-post')}
              className="btn-press w-full bg-linear-to-r from-blue-500 to-blue-600 text-white font-bold py-2.5 rounded-full hover:from-blue-600 hover:to-blue-700 transition-all text-sm shadow-md"
            >
              📝 Create Post
            </button>
            <button
              onClick={() => navigate('/create-community')}
              className="btn-press w-full bg-transparent text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#343536] font-bold py-2.5 rounded-full hover:bg-gray-50 dark:hover:bg-[#272729] mt-2.5 transition-all text-sm"
            >
              👥 Create Community
            </button>
          </div>
        </div>
      ) : (
        <div className="card-hover bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-xl p-5 shadow-sm text-center transition-all animate-fade-up">
          <div className="text-4xl mb-3">👋</div>
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
        <h3 className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-4">🔥 Popular Communities</h3>
        <div className="flex flex-col gap-3">
          {popularCommunities.map((c, index) => (
            <div key={c._id} className={`flex items-center justify-between animate-fade-up`} style={{ animationDelay: `${index * 50}ms` }}>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className="text-xs font-bold text-gray-400 w-4 text-center">{index + 1}</span>
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 shrink-0 flex items-center justify-center text-xs text-white font-bold shadow-sm">r/</div>
                <div className="flex flex-col truncate">
                  <Link to={`/r/${c._id}`} className="text-sm font-bold text-gray-900 dark:text-white hover:underline truncate">r/{c.name}</Link>
                  <span className="text-xs text-gray-400">{c.members?.length || 1} members</span>
                </div>
              </div>
              <Link
                to={`/r/${c._id}`}
                className="btn-press bg-gray-100 dark:bg-[#272729] text-gray-700 dark:text-gray-200 font-bold px-3 py-1.5 rounded-full text-xs hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-500/10 dark:hover:text-orange-400 transition-all shrink-0"
              >
                View
              </Link>
            </div>
          ))}
          {popularCommunities.length === 0 && <p className="text-sm text-gray-400 text-center py-2">No communities yet.</p>}
        </div>
      </div>

    </div>
  );
};

export default RightSidebar;