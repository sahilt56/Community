import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../hooks/useSocket';
import { useTheme } from '../context/ThemeContext';
import OnlineIndicator from './OnlineIndicator';

const SearchDropdown = ({ searchResults, searchTerm, setShowResults, setSearchTerm, getAvatarUrl }) => {
  if (
    (!searchResults.communities || searchResults.communities.length === 0) &&
    (!searchResults.users || searchResults.users.length === 0) &&
    (!searchResults.posts || searchResults.posts.length === 0)
  ) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm italic">
        No results found for "{searchTerm}" 🔍
      </div>
    );
  }

  return (
    <>
      {/* Communities Section */}
      {searchResults.communities.length > 0 && (
        <div className="py-2">
          <h3 className="px-4 py-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Communities</h3>
          {searchResults.communities.map(community => (
            <Link 
              key={community._id}
              to={`/r/${community.name}`}
              onClick={() => { setShowResults(false); setSearchTerm(''); }}
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#272729] transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                r/
              </div>
              <div className="flex flex-col">
                <span className="text-gray-900 dark:text-white text-sm font-medium">r/{community.name}</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">{community.members?.length || 0} members</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Users Section */}
      {searchResults.users.length > 0 && (
        <div className="py-2 border-t border-[#343536]">
          <h3 className="px-4 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Users</h3>
          {searchResults.users.map(u => (
            <Link 
              key={u._id}
              to={`/u/${u.username}`}
              onClick={() => { setShowResults(false); setSearchTerm(''); }}
              className="flex items-center gap-3 px-4 py-2 hover:bg-[#272729] transition-colors"
            >
              <div className="w-8 h-8 bg-linear-to-tr from-orange-500 to-yellow-400 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs">
                {u.profilePic ? (
                  <img src={getAvatarUrl(u.profilePic)} alt={u.username} className="w-full h-full object-cover" />
                ) : (
                  u.username.charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-white text-sm font-medium">u/{u.username}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Posts Section */}
      {searchResults.posts && searchResults.posts.length > 0 && (
        <div className="py-2 border-t border-[#343536]">
          <h3 className="px-4 py-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Posts</h3>
          {searchResults.posts.map(post => (
            <Link 
              key={post._id}
              to={`/post/${post._id}`}
              onClick={() => { setShowResults(false); setSearchTerm(''); }}
              className="flex flex-col gap-1 px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#272729] transition-colors"
            >
              <span className="text-gray-900 dark:text-white text-sm font-medium line-clamp-1">{post.title}</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                in r/{post.community?.name || 'general'} • by u/{post.author?.username || 'user'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
};

const Navbar = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const s = localStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState({ communities: [], users: [], posts: [] });

  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const menuRef = useRef(null);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const desktopNotifRef = useRef(null);
  const mobileNotifRef = useRef(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const { isDarkMode, toggleTheme } = useTheme();
  const { socket } = useSocket() || {};

  // FIX: Wrapped fetchNotifications in useCallback so it can be safely used in useEffect without warnings
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.get(`${apiUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
      const unread = res.data.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]); // Updated dependency

  // Listen for real-time notifications via Socket.IO
  useEffect(() => {
    if (socket) {
      const handleNewNotification = (newNotif) => {
        setNotifications((prev) => [newNotif, ...prev]);
        setUnreadCount((prev) => prev + 1);
      };

      socket.on('new_notification', handleNewNotification);

      return () => {
        socket.off('new_notification', handleNewNotification);
      };
    }
  }, [socket]);

  // Mark Read
  const markAsRead = async (id) => {
    // Optimistic Update
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.put(`${apiUrl}/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // fetchNotifications(); // Already updated locally
    } catch (err) {
      console.error(err);
      fetchNotifications(); // Sync if failed
    }
  };

  const markAllRead = async () => {
    // Optimistic Update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.put(`${apiUrl}/api/notifications/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // fetchNotifications(); // Already updated locally
    } catch (err) {
      console.error(err);
      fetchNotifications(); // Sync if failed
    }
  };

  // Listen for localStorage updates (e.g. profile pic change)
  useEffect(() => {
    const sync = () => {
      setToken(localStorage.getItem('token'));
      const s = localStorage.getItem('user');
      setUser(s ? JSON.parse(s) : null);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  // Live Search Logic (Debounced)
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim().length > 0) {
        setIsSearching(true);
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          const res = await axios.get(`${apiUrl}/api/search?q=${searchTerm}`);
          setSearchResults(res.data);
          setShowResults(true);
        } catch (err) {
          console.error("Search error:", err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults({ communities: [], users: [], posts: [] });
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      
      const isOutsideDesktopSearch = !desktopSearchRef.current || !desktopSearchRef.current.contains(e.target);
      const isOutsideMobileSearch = !mobileSearchRef.current || !mobileSearchRef.current.contains(e.target);
      if (isOutsideDesktopSearch && isOutsideMobileSearch) {
        setShowResults(false);
      }

      const isOutsideDesktopNotif = !desktopNotifRef.current || !desktopNotifRef.current.contains(e.target);
      const isOutsideMobileNotif = !mobileNotifRef.current || !mobileNotifRef.current.contains(e.target);
      if (isOutsideDesktopNotif && isOutsideMobileNotif) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setMenuOpen(false);
    navigate('/login');
  };

  const getAvatarUrl = (pic) => {
    const targetPic = pic || user?.profilePic;
    if (!targetPic) return null;
    return targetPic.startsWith('http') ? targetPic : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${targetPic}`;
  };

  return (
    <nav className="bg-white/80 dark:bg-[#1a1a1b]/80 backdrop-blur-md border-b border-gray-200 dark:border-[#343536] px-4 py-2 flex items-center justify-between sticky top-0 z-50 h-14 transition-all duration-300">
      {/* Search Overlay (Mobile Only) */}
      {mobileSearchOpen && (
        <div className="absolute inset-x-0 inset-y-0 bg-white dark:bg-[#1a1a1b] z-60 flex items-center px-4 gap-2 animate-in fade-in duration-200">
          <button 
            onClick={() => { setMobileSearchOpen(false); setSearchTerm(''); }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-full text-gray-600 dark:text-gray-400"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          
          <div className="flex-1 relative" ref={mobileSearchRef}>
            <div className="bg-gray-100 dark:bg-[#272729] border border-transparent dark:border-[#343536] rounded-md px-4 py-1.5 flex items-center focus-within:border-orange-500 transition-all">
              <input 
                autoFocus
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none outline-none text-gray-900 dark:text-white text-sm w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {isSearching && <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent animate-spin rounded-full ml-2" />}
            </div>

            {/* Results in Overlay */}
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1b] border border-[#343536] rounded-md shadow-2xl overflow-y-auto max-h-[70vh]">
                <SearchDropdown searchResults={searchResults} searchTerm={searchTerm} setShowResults={setShowResults} setSearchTerm={setSearchTerm} getAvatarUrl={getAvatarUrl} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Brand Section */}
      <Link to="/" className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => setMobileSearchOpen(false)}>
        <div className="bg-orange-600 p-1.5 rounded-full">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3.005 3.005 0 013.75-2.906z" />
          </svg>
        </div>
        <span className="text-gray-900 dark:text-white font-bold text-lg tracking-tight hidden md:block">
          Community App
        </span>
      </Link>

      {/* Desktop Search Bar */}
      <div className="hidden sm:block flex-1 max-w-150 mx-4 relative" ref={desktopSearchRef}>
        <div className="bg-gray-100/50 dark:bg-[#272729]/50 backdrop-blur-sm border border-transparent dark:border-[#343536] rounded-md px-4 py-1.5 flex items-center hover:border-gray-300 dark:hover:border-gray-500 transition-all focus-within:border-gray-300 dark:focus-within:border-gray-400 focus-within:bg-white dark:focus-within:bg-[#272729]">
          <svg className={`w-4 h-4 ${isSearching ? 'text-orange-500 animate-spin' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isSearching ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            )}
          </svg>
          <input 
            type="text" 
            placeholder="Search communities, users, posts..." 
            className="bg-transparent border-none outline-none text-gray-900 dark:text-white text-sm ml-2 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm.trim().length > 0 && setShowResults(true)}
          />
        </div>

        {/* Desktop Dropdown */}
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 dark:bg-[#1a1a1b]/95 backdrop-blur-lg border border-gray-200 dark:border-[#343536] rounded-md shadow-2xl z-50 overflow-hidden max-h-100 overflow-y-auto">
            <SearchDropdown searchResults={searchResults} searchTerm={searchTerm} setShowResults={setShowResults} setSearchTerm={setSearchTerm} getAvatarUrl={getAvatarUrl} />
          </div>
        )}
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-1 sm:gap-3">
        {/* Mobile Search Icon */}
        <button 
          onClick={() => setMobileSearchOpen(true)}
          className="sm:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-full text-gray-600 dark:text-gray-300 transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        
        {/* Toggle Theme Button */}
        <button 
          onClick={toggleTheme}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-full text-gray-600 dark:text-gray-300 transition-all"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {token ? (
          <>
            {/* Desktop: Create Post */}
            <Link to="/create-post" className="hidden lg:flex text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-100 dark:hover:bg-[#272729] px-4 py-1.5 rounded-full transition-all border border-gray-200 dark:border-[#343536] items-center gap-1">
              <span>✏️</span> Create Post
            </Link>

            {/* Desktop: Create Community */}
            <Link to="/create-community" className="hidden lg:flex text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-100 dark:hover:bg-[#272729] px-4 py-1.5 rounded-full transition-all border border-gray-200 dark:border-[#343536] items-center gap-1">
              <span>+</span> Create Community
            </Link>

            {/* Desktop Notification Bell */}
            <div className="hidden sm:block relative" ref={desktopNotifRef}>
              <button 
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-full transition-all relative"
              >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-[#1a1a1b]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-md shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-[#343536] flex justify-between items-center">
                    <span className="text-gray-900 dark:text-white font-bold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllRead}
                        className="text-blue-500 text-xs hover:underline font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center text-gray-500 text-sm">
                         No notifications yet 🍃
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n._id}
                          className={`flex items-start gap-3 px-4 py-3 border-b border-gray-200 dark:border-[#343536]/50 hover:bg-gray-50 dark:hover:bg-[#272729] transition-all cursor-pointer ${!n.read ? 'bg-blue-50 dark:bg-blue-500/5 border-l-2 border-l-blue-500' : ''}`}
                          onClick={() => {
                            if (!n.read) markAsRead(n._id);
                            
                            if (n.type === 'follow') {
                              navigate(`/u/${n.sender?.username}`);
                            } else {
                              navigate(`/post/${n.post?._id}`);
                            }
                            setNotifOpen(false);
                          }}
                        >
                          <div className="w-10 h-10 bg-linear-to-tr from-orange-500 to-yellow-400 rounded-full shrink-0 overflow-hidden">
                            {n.sender?.profilePic ? (
                              <img src={getAvatarUrl(n.sender.profilePic)} alt="sender" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs uppercase">
                                {n.sender?.username?.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-700 dark:text-gray-200">
                              <span className="font-bold text-gray-900 dark:text-white">u/{n.sender?.username}</span> 
                              {n.type === 'vote' ? ' voted on your post' : n.type === 'comment' ? ' commented on your post' : ' started following you'}
                            </p>
                            {n.type !== 'follow' && <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 line-clamp-1">{n.post?.title}</p>}
                            <p className="text-[10px] text-gray-500 mt-1">
                              {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop: Profile Link */}
            <Link to={`/u/${user?.username}`} className="hidden md:flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium text-sm transition-colors border border-transparent hover:border-gray-200 dark:hover:border-[#343536] px-2 py-1 rounded-md">
              <div className="w-7 h-7 relative shrink-0">
                <div className="w-full h-full bg-linear-to-tr from-orange-500 to-yellow-400 rounded-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden relative">
                  {getAvatarUrl() ? (
                    <img src={getAvatarUrl()} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user?.username?.charAt(0).toUpperCase()
                  )}
                </div>
                <OnlineIndicator userId={user?.id || user?._id} size="w-2.5 h-2.5" border="border-[1.5px] border-white dark:border-[#1a1a1b]" />
              </div>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[11px] font-bold text-gray-900 dark:text-white">u/{user?.username}</span>
              </div>
            </Link>

            {/* Desktop: Logout */}
            <button 
              onClick={handleLogout}
              className="hidden lg:block text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-100 dark:hover:bg-[#272729] px-4 py-1.5 rounded-full transition-all border border-gray-200 dark:border-[#343536]"
            >
              Log Out
            </button>

            {/* Mobile Actions Group */}
            <div className="sm:hidden flex items-center gap-1">
              {/* Mobile Bell */}
              <div className="relative" ref={mobileNotifRef}>
                <button 
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-full transition-all relative"
                >
                  <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-orange-600 text-white text-[8px] font-bold px-1 py-0.5 rounded-full border border-white dark:border-[#1a1a1b]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {/* Mobile Dropdown (Same as Desktop but adjusted) */}
                {notifOpen && (
                  <div className="fixed inset-x-4 top-16 bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-md shadow-2xl z-60 overflow-hidden max-h-[70vh]">
                     {/* Reuse same dropdown content */}
                     <div className="px-4 py-3 border-b border-gray-200 dark:border-[#343536] flex justify-between items-center bg-white dark:bg-[#1a1a1b] sticky top-0">
                        <span className="text-gray-900 dark:text-white font-bold text-sm">Notifications</span>
                        <div className="flex items-center gap-3">
                           {unreadCount > 0 && (
                             <button 
                               onClick={markAllRead}
                               className="text-blue-500 text-[10px] hover:underline font-medium"
                             >
                               Mark all as read
                             </button>
                           )}
                           <button onClick={() => setNotifOpen(false)} className="text-gray-400 text-xs">✕</button>
                        </div>
                     </div>
                     <div className="overflow-y-auto max-h-[60vh]">
                        {notifications.length === 0 ? (
                           <div className="py-10 text-center text-gray-500 text-sm">No notifications yet 🍃</div>
                        ) : (
                           notifications.map(n => (
                              <div key={n._id} className={`flex items-start gap-3 px-4 py-3 border-b border-gray-200 dark:border-[#343536]/50 hover:bg-gray-50 dark:hover:bg-[#272729] cursor-pointer ${!n.read ? 'bg-blue-50 dark:bg-blue-500/5' : ''}`} onClick={() => { markAsRead(n._id); if (n.type === 'follow') navigate(`/u/${n.sender?.username}`); else navigate(`/post/${n.post?._id}`); setNotifOpen(false); }}>
                                 <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-gray-200 dark:bg-[#272729]">
                                    {n.sender?.profilePic ? <img src={getAvatarUrl(n.sender.profilePic)} className="w-full h-full object-cover" alt="Avatar"/> : <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-white text-xs">{n.sender?.username?.charAt(0)}</div>}
                                 </div>
                                 <div className="flex-1">
                                    <p className="text-xs text-gray-700 dark:text-gray-200">
                                      <span className="font-bold text-gray-900 dark:text-white">u/{n.sender?.username}</span> {n.type === 'vote' ? 'voted on your post' : n.type === 'comment' ? 'commented on your post' : 'started following you'}
                                    </p>
                                    {n.type !== 'follow' && <p className="text-[10px] text-gray-500 truncate">{n.post?.title}</p>}
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                  </div>
                )}
              </div>
              <Link to="/create-post" className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-full transition-all text-lg">
                <span>✏️</span>
              </Link>
            </div>

            {/* Mobile: Profile Pic + Hamburger Menu */}
            <div className="sm:hidden relative" ref={menuRef}>
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2"
              >
                {/* Profile Pic */}
                <div className="w-8 h-8 relative shrink-0">
                  <div className="w-full h-full bg-linear-to-tr from-orange-500 to-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden border-2 border-white dark:border-[#343536] relative">
                    {getAvatarUrl() ? (
                      <img src={getAvatarUrl()} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      user?.username?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <OnlineIndicator userId={user?.id || user?._id} size="w-2.5 h-2.5" border="border-[1.5px] border-white dark:border-[#1a1a1b]" />
                </div>
                {/* Hamburger Icon */}
                <div className="flex flex-col gap-0.75">
                  <span className={`block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 rounded transition-all ${menuOpen ? 'rotate-45 translate-y-1.25' : ''}`}></span>
                  <span className={`block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 rounded transition-all ${menuOpen ? 'opacity-0' : ''}`}></span>
                  <span className={`block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 rounded transition-all ${menuOpen ? '-rotate-45 -translate-y-1.25' : ''}`}></span>
                </div>
              </button>

              {/* Dropdown Menu */}
              {menuOpen && (
                <div className="absolute right-0 top-12 bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-lg shadow-2xl w-56 py-2 z-50 animate-in">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-[#343536] flex items-center gap-3">
                    <div className="w-10 h-10 bg-linear-to-tr from-orange-500 to-yellow-400 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden shrink-0">
                      {getAvatarUrl() ? (
                        <img src={getAvatarUrl()} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        user?.username?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white font-bold text-sm">u/{user?.username}</p>
                      <p className="text-gray-500 text-xs">Online</p>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <Link 
                    to={`/u/${user?.username}`} 
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729] hover:text-gray-900 dark:hover:text-white transition-all text-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    View Profile
                  </Link>

                  <Link 
                    to="/create-community" 
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729] hover:text-gray-900 dark:hover:text-white transition-all text-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Create Community
                  </Link>

                  <button 
                    onClick={() => { setNotifOpen(true); setMenuOpen(false); }}
                    className="flex lg:hidden items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729] hover:text-gray-900 dark:hover:text-white transition-all text-sm w-full"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Notifications {unreadCount > 0 && <span className="bg-orange-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-auto">{unreadCount}</span>}
                  </button>

                  <div className="border-t border-gray-200 dark:border-[#343536] mt-1 pt-1">
                    <button 
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-3 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-[#272729] hover:text-red-600 dark:hover:text-red-300 transition-all text-sm w-full"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          // Logged out view
          <>
            <Link to="/login" className="text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-100 dark:hover:bg-[#272729] px-5 py-2 rounded-full transition-all border border-gray-200 dark:border-[#343536]">
              Log In
            </Link>
            <Link to="/login" state={{ isSignUp: true }} className="hidden sm:block bg-orange-600 text-white text-sm font-bold px-5 py-2 rounded-full hover:bg-orange-700 transition-all">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;