import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { SocketContext } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import OnlineIndicator from './OnlineIndicator';
import logo from '../assets/logo.png';

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
              to={`/v/${community.name}`}
              onClick={() => { setShowResults(false); setSearchTerm(''); }}
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#272729] transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                v/
              </div>
              <div className="flex flex-col">
                <span className="text-gray-900 dark:text-white text-sm font-medium">v/{community.name}</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">{community.members?.length || 0} members</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Users Section */}
      {searchResults.users.length > 0 && (
        <div className="py-2 border-t border-gray-100 dark:border-[#343536]">
          <h3 className="px-4 py-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Users</h3>
          {searchResults.users.map(u => (
            <Link 
              key={u._id}
              to={`/u/${u.username}`}
              onClick={() => { setShowResults(false); setSearchTerm(''); }}
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#272729] transition-colors"
            >
              <div className="w-8 h-8 bg-linear-to-tr from-orange-500 to-yellow-400 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs relative">
                {u.username.charAt(0).toUpperCase()}
                {u.profilePic && (
                  <img 
                    src={getAvatarUrl(u.profilePic)} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-cover" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
              </div>
              <span className="text-gray-900 dark:text-white text-sm font-medium">u/{u.username}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Posts Section */}
      {searchResults.posts && searchResults.posts.length > 0 && (
        <div className="py-2 border-t border-gray-100 dark:border-[#343536]">
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
                in v/{post.community?.name || 'general'} • by u/{post.author?.username || 'user'}
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
  const { socket } = useContext(SocketContext) || {};

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
  }, [fetchNotifications]);

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

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.put(`${apiUrl}/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error(err);
      fetchNotifications();
    }
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.put(`${apiUrl}/api/notifications/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error(err);
      fetchNotifications();
    }
  };

  useEffect(() => {
    const sync = () => {
      setToken(localStorage.getItem('token'));
      const s = localStorage.getItem('user');
      setUser(s ? JSON.parse(s) : null);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

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
    window.location.href = '/';
  };

  const getAvatarUrl = (pic) => {
    const targetPic = pic || user?.profilePic;
    if (!targetPic) return null;
    return targetPic.startsWith('http') ? targetPic : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${targetPic}`;
  };

  return (
    <nav className="glass-nav px-4 py-2 flex items-center justify-between sticky top-0 z-50 h-14 transition-all duration-300">
      
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

            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1b] border border-[#343536] rounded-md shadow-2xl overflow-y-auto max-h-[70vh]">
                <SearchDropdown searchResults={searchResults} searchTerm={searchTerm} setShowResults={setShowResults} setSearchTerm={setSearchTerm} getAvatarUrl={getAvatarUrl} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEFT SIDE: Hamburger Menu & Logo */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Hamburger Menu */}
        <div className="sm:hidden relative" ref={menuRef}>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-md transition-all btn-press w-8 h-8 flex-col justify-center"
          >
            <span className={`block w-5 h-[2px] bg-gray-600 dark:bg-gray-300 rounded transition-all origin-center ${menuOpen ? 'rotate-45 translate-y-[5px]' : ''}`}></span>
            <span className={`block w-5 h-[2px] bg-gray-600 dark:bg-gray-300 rounded transition-all ${menuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-5 h-[2px] bg-gray-600 dark:bg-gray-300 rounded transition-all origin-center ${menuOpen ? '-rotate-45 -translate-y-[5px]' : ''}`}></span>
          </button>

          {/* Left-aligned Mobile Menu Dropdown */}
          {menuOpen && (
            <div className="absolute left-0 top-12 bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-lg shadow-2xl w-64 py-2 z-50 animate-fade-up">
              {token ? (
                <>
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-[#343536] flex items-center gap-3">
                    <div className="w-10 h-10 bg-linear-to-tr from-orange-500 to-yellow-400 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden shrink-0 relative">
                      {user?.username?.charAt(0).toUpperCase()}
                      {getAvatarUrl() && (
                        <img 
                          src={getAvatarUrl()} 
                          alt="" 
                          className="absolute inset-0 w-full h-full object-cover" 
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white font-bold text-sm">u/{user?.username}</p>
                      <p className="text-green-500 text-xs font-medium">Online</p>
                    </div>
                  </div>

                  <Link 
                    to={`/u/${user?.username}`} 
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729] hover:text-gray-900 dark:hover:text-white transition-all text-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    View Profile
                  </Link>

                  <Link 
                    to="/create-community" 
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729] hover:text-gray-900 dark:hover:text-white transition-all text-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    Create Community
                  </Link>
                  
                  {/* Theme Toggle (Inside Mobile Menu) */}
                  <button 
                    onClick={() => { toggleTheme(); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729] hover:text-gray-900 dark:hover:text-white transition-all text-sm"
                  >
                    {isDarkMode ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                    )}
                    {isDarkMode ? "Light Mode" : "Dark Mode"}
                  </button>

                  <div className="border-t border-gray-200 dark:border-[#343536] mt-1 pt-1">
                    <button 
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-3 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-[#272729] hover:text-red-600 dark:hover:text-red-300 transition-all text-sm w-full"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      Log Out
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-2 px-4 py-3 border-b border-gray-200 dark:border-[#343536]">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Join Vartalap today!</p>
                    <Link to="/login" onClick={() => setMenuOpen(false)} className="w-full text-center bg-gray-100 dark:bg-[#272729] text-gray-900 dark:text-white text-sm font-bold px-4 py-2 rounded-full transition-all">Log In</Link>
                    <Link to="/login" state={{ isSignUp: true }} onClick={() => setMenuOpen(false)} className="w-full text-center bg-orange-500 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-orange-600 transition-all">Sign Up</Link>
                  </div>
                  
                  {/* Theme Toggle (Inside Mobile Menu for Guests) */}
                  <button 
                    onClick={() => { toggleTheme(); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729] hover:text-gray-900 dark:hover:text-white transition-all text-sm"
                  >
                    {isDarkMode ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                    )}
                    {isDarkMode ? "Light Mode" : "Dark Mode"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 cursor-pointer shrink-0 pill-hover pr-2 py-1 rounded-full transition-all" onClick={() => setMobileSearchOpen(false)}>
          <img src={logo} alt="Vartalap Logo" className="w-8 h-8 sm:w-9 sm:h-9 object-cover rounded-full border border-gray-200 dark:border-[#343536] shadow-sm" />
          <span className="text-gray-900 dark:text-white font-bold text-lg sm:text-xl tracking-tight hidden md:block">
            Vartalap
          </span>
        </Link>
      </div>

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

        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 dark:bg-[#1a1a1b]/95 backdrop-blur-lg border border-gray-200 dark:border-[#343536] rounded-md shadow-2xl z-50 overflow-hidden max-h-100 overflow-y-auto">
            <SearchDropdown searchResults={searchResults} searchTerm={searchTerm} setShowResults={setShowResults} setSearchTerm={setSearchTerm} getAvatarUrl={getAvatarUrl} />
          </div>
        )}
      </div>

      {/* RIGHT SIDE ACTIONS */}
      <div className="flex items-center gap-1 sm:gap-3">
        {/* Mobile Search Icon */}
        <button 
          onClick={() => setMobileSearchOpen(true)}
          className="sm:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-full text-gray-600 dark:text-gray-300 transition-all btn-press"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        
        {/* Toggle Theme Button (Desktop Only, hidden on sm) */}
        <button 
          onClick={toggleTheme}
          className="hidden sm:block p-1.5 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-full text-gray-600 dark:text-gray-300 transition-all btn-press"
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
            {/* Desktop: Create Post (Primary Action) */}
            <Link to="/create-post" className="hidden lg:flex bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-1.5 rounded-full transition-all shadow-sm hover:shadow-md items-center gap-1.5 btn-press">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              Create Post
            </Link>

            {/* Desktop: Create Community (Secondary Action) */}
            <Link to="/create-community" className="hidden lg:flex text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-100 dark:hover:bg-[#272729] px-4 py-1.5 rounded-full transition-all border border-gray-200 dark:border-[#343536] items-center gap-1.5 btn-press">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Community
            </Link>

            {/* Notification Bell (Desktop + Mobile) */}
            <div className="relative" ref={desktopNotifRef}>
              <button 
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-full transition-all relative btn-press"
              >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 bg-orange-600 text-white text-[8px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded-full border-2 border-white dark:border-[#1a1a1b]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-md shadow-2xl z-50 overflow-hidden animate-fade-up">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-[#343536] flex justify-between items-center bg-white dark:bg-[#1a1a1b] sticky top-0">
                    <span className="text-gray-900 dark:text-white font-bold text-sm">Notifications</span>
                    <div className="flex items-center gap-3">
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-blue-500 text-[10px] hover:underline font-medium">
                          Mark all as read
                        </button>
                      )}
                      <button onClick={() => setNotifOpen(false)} className="sm:hidden text-gray-400 text-xs">✕</button>
                    </div>
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
                          <div className="w-10 h-10 bg-linear-to-tr from-orange-500 to-yellow-400 rounded-full shrink-0 overflow-hidden relative flex items-center justify-center text-white font-bold text-xs uppercase">
                            {n.sender?.username?.charAt(0)}
                            {n.sender?.profilePic && (
                              <img 
                                src={getAvatarUrl(n.sender.profilePic)} 
                                alt="" 
                                className="absolute inset-0 w-full h-full object-cover" 
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
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

            {/* Mobile Create Post Icon */}
            <Link to="/create-post" className="sm:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-full transition-all text-lg btn-press">
              <span>✏️</span>
            </Link>

            {/* Desktop: Modern Profile Pill */}
            <div className="hidden md:flex relative group cursor-pointer">
              <div className="flex items-center gap-2 bg-gray-50/50 dark:bg-[#272729]/50 border border-gray-200 dark:border-[#343536] hover:border-gray-300 dark:hover:border-gray-500 pl-1 pr-3 py-1 rounded-full transition-all btn-press">
                <div className="w-7 h-7 relative shrink-0">
                  <div className="w-full h-full bg-linear-to-tr from-orange-500 to-yellow-400 rounded-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden relative">
                    {user?.username?.charAt(0).toUpperCase()}
                    {getAvatarUrl() && (
                      <img 
                        src={getAvatarUrl()} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover" 
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                  </div>
                  <OnlineIndicator userId={user?.id || user?._id} size="w-2.5 h-2.5" border="border-[1.5px] border-white dark:border-[#1a1a1b]" />
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[12px] font-bold text-gray-900 dark:text-white">u/{user?.username}</span>
                </div>
                {/* Dropdown Chevron */}
                <svg className="w-3 h-3 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Hover Dropdown for Profile & Logout */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1a1b] border border-gray-100 dark:border-[#343536] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden animate-fade-up">
                <Link to={`/u/${user?.username}`} className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  My Profile
                </Link>
                <div className="h-px bg-gray-100 dark:bg-[#343536]"></div>
                <button onClick={handleLogout} className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 font-medium transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Log Out
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="hidden sm:block text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-100 dark:hover:bg-[#272729] px-5 py-2 rounded-full transition-all border border-gray-200 dark:border-[#343536] btn-press">
              Log In
            </Link>
            <Link to="/login" state={{ isSignUp: true }} className="hidden sm:block bg-orange-500 text-white text-sm font-bold px-5 py-2 rounded-full hover:bg-orange-600 transition-all btn-press shadow-sm hover:shadow-md">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;