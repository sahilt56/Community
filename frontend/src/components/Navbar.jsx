import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { SocketContext } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import OnlineIndicator from './OnlineIndicator';
import { Search, Menu, X, Sun, Moon, LogOut, User as UserIcon, Users, Pencil, Bell, ChevronDown, AlignLeft, Shield, MessageSquare, Megaphone, Flame, AlertTriangle, Sparkles, Volume2, VolumeX, Award, Info } from 'lucide-react';
import logo from '../assets/logo.png';
import SystemInbox from './SystemInbox';

const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  let text = tmp.textContent || tmp.innerText || "";
  // Remove markdown bold/italic characters
  text = text.replace(/(\*\*|__|\*|_)/g, '');
  // Optionally truncate for preview
  if (text.length > 80) text = text.substring(0, 80) + '...';
  return text;
};

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
              <div className="w-8 h-8 bg-blue-600 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs relative">
                v/
                {community.profilePic && (
                  <img 
                    src={getAvatarUrl(community.profilePic)} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-cover z-10 bg-white dark:bg-[#1a1a1b]" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
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
                    className="absolute inset-0 w-full h-full object-cover z-10 bg-white dark:bg-[#1a1a1b]" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
              </div>
              <span className="text-gray-900 dark:text-white text-sm font-medium flex items-center gap-1">
                u/{u.username}
                {u.hasVartalapBadge && (
                    <Award size={12} className="text-blue-500 flex-shrink-0" />
                )}
              </span>
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

  // System Inbox State
  const [inboxOpen, setInboxOpen] = useState(false);
  const desktopInboxRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewingAdminMsg, setViewingAdminMsg] = useState(null);

  // Sound Preferences State
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem('soundEnabled');
    return stored !== null ? JSON.parse(stored) : true; // Default to true
  });
  const soundEnabledRef = useRef(soundEnabled);
  
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const newVal = !prev;
      localStorage.setItem('soundEnabled', JSON.stringify(newVal));
      return newVal;
    });
  };

  const { isDarkMode, toggleTheme } = useTheme();
  const { socket } = useContext(SocketContext) || {};
  const [currentTime] = useState(() => Date.now());

  let accountAgeText = "";
  if (user?.createdAt) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = Math.max(0, currentTime - new Date(user.createdAt).getTime()); // Time Sync drift ko -1 jaane se rokne ke liye
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

  // System Messages State (lifted from SystemInbox)
  const [sysMessages, setSysMessages] = useState([]);
  const [sysReadIds, setSysReadIds] = useState([]);
  const [sysUnreadCount, setSysUnreadCount] = useState(0);

  const fetchSysMessages = useCallback(async () => {
    if (!token) return;
    try {
        const res = await api.get('/api/system-messages');
        const msgs = res.data.messages || [];
        const rIds = res.data.readMessageIds || [];
        setSysMessages(msgs);
        setSysReadIds(rIds);
        setSysUnreadCount(msgs.filter(m => !rIds.includes(m._id)).length);
    } catch (err) {
        console.error("Fetch system messages error:", err);
    }
  }, [token]);

  useEffect(() => {
    fetchSysMessages();
  }, [fetchSysMessages]);

  useEffect(() => {
    if (socket) {
        const handleNewSysMessage = (newMsg) => {
            setSysMessages((prev) => {
                const exists = prev.find(m => m._id === newMsg._id);
                if (exists) return prev;
                return [newMsg, ...prev];
            });
            setSysUnreadCount((prev) => prev + 1);
                
                // Play sound effect for new announcements
                if (soundEnabledRef.current) {
                    try {
                        const audio = new Audio('/sounds/announcement.mp3');
                        audio.play().catch(err => console.warn("Audio playback prevented by browser auto-play policy:", err));
                    } catch (err) {}
                }
        };

        socket.on('new_system_message', handleNewSysMessage);
        return () => socket.off('new_system_message', handleNewSysMessage);
    }
  }, [socket, user]);

  const handleSysMsgRead = (newReadIds) => {
      setSysReadIds(newReadIds);
      setSysUnreadCount(sysMessages.filter(m => !newReadIds.includes(m._id)).length);
  };

  const markAllSysMsgsRead = async () => {
    // Optimistic UI update
    const allIds = sysMessages.map(m => m._id);
    setSysReadIds(allIds);
    setSysUnreadCount(0);

    try {
        await api.put(`/api/system-messages/mark-all-read`, {});
    } catch (err) {
        console.error(err);
        fetchSysMessages();
    }
  };

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/api/notifications');
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
        
        // Play standard notification sound
        if (soundEnabledRef.current) {
            try {
                const audio = new Audio('/sounds/notification.mp3');
                audio.play().catch(err => console.warn("Audio playback prevented by browser auto-play policy:", err));
            } catch (err) {}
        }
      };

      socket.on('new_notification', handleNewNotification);

      return () => {
        socket.off('new_notification', handleNewNotification);
      };
    }
  }, [socket]);

  // Fetch updated user stats (like Anubhav) periodically or on mount
  const fetchCurrentUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/api/auth/me');
      if (res.data?.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      // Silently fail if auth error, app router handles actual logouts
    }
  }, [token]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Optionally listen to post_interaction to silently refresh Anubhav
  useEffect(() => {
    if (socket) {
      const handleInteraction = () => fetchCurrentUser();
      socket.on('post_interaction', handleInteraction);
      return () => socket.off('post_interaction', handleInteraction);
    }
  }, [socket, fetchCurrentUser]);

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await api.put(`/api/notifications/${id}/read`, {});
    } catch (err) {
      console.error(err);
      fetchNotifications();
    }
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await api.put(`/api/notifications/mark-all-read`, {});
    } catch (err) {
      console.error(err);
      fetchNotifications();
    }
  };

  const clearAllNotifications = async () => {
    // Optimistic update: Turant UI clear kardo
    setNotifications([]);
    setUnreadCount(0);
    try {
      await api.delete('/api/notifications/clear-all');
    } catch (err) {
      console.error(err);
      fetchNotifications(); // Agar error aaye toh wapas purani list le aao
    }
  };

  const deleteNotification = async (notifId, e) => {
    e.stopPropagation(); // Click event ko parent div tak jaane se roko taki page redirect na ho
    // Optimistic UI update
    const notifToDelete = notifications.find(n => n._id === notifId);
    setNotifications(prev => prev.filter(n => n._id !== notifId));
    if (notifToDelete && !notifToDelete.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
    }

    try {
        await api.delete(`/api/notifications/${notifId}`);
    } catch (err) {
        console.error("Failed to delete notification:", err);
        fetchNotifications(); // Revert on failure
    }
  };

  const acceptChatInvite = async (notifId) => {
    // Optimistic UI update for immediate disappearance
    setNotifications(prev => prev.filter(n => n._id !== notifId));
    setUnreadCount(prev => Math.max(0, prev - 1));
    setNotifOpen(false);

    try {
      await api.post(`/api/chat/invite/accept`, { notificationId: notifId });
      toast.success("Joined chat room!");
      navigate('/chat');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to join room.");
      // Note: If it fails, we typically don't revert the UI here to prevent the popup from reappearing confusingly
      // but we could call fetchNotifications() if strict consistency is needed.
    }
  };

  const declineChatInvite = async (notifId) => {
    // Optimistic UI update for immediate disappearance
    setNotifications(prev => prev.filter(n => n._id !== notifId));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await api.post(`/api/chat/invite/decline`, { notificationId: notifId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to decline.");
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
          const res = await api.get(`/api/search?q=${searchTerm}`);
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

      const isOutsideInbox = !desktopInboxRef.current || !desktopInboxRef.current.contains(e.target);
      if (isOutsideInbox && !e.target.closest('#announcement-modal-root')) {
        setInboxOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setMenuOpen(false);
    
    try {
      await api.post('/api/auth/logout');
    } catch(e) {}
    
    window.location.replace('/?logout=true');
  };

  const getAvatarUrl = (pic, fallbackToUser = false) => {
    const targetPic = fallbackToUser ? (pic || user?.profilePic) : pic;
    if (!targetPic) return null;
    let url = targetPic.startsWith('http') ? targetPic : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${targetPic}`;
    return url.replace(/\\/g, '/');
  };

  return (
    <>
      <nav className="bg-white/200 dark:bg-[#1a1a1b]/70 backdrop-blur-xl border-b border-orange-200/40 dark:border-[#343536] shadow-sm px-4 py-2 flex items-center justify-between sticky top-0 z-[999] h-14 transition-all duration-300">
        
        {/* Search Overlay (Mobile Only) */}
        {mobileSearchOpen && (
          <div className="absolute inset-x-0 inset-y-0 bg-white dark:bg-[#1a1a1b] z-[1000] flex items-center px-4 gap-2 animate-in fade-in duration-200">
            <button 
              onClick={() => { setMobileSearchOpen(false); setSearchTerm(''); }}
              className="p-2 bg-gray-50 border border-gray-100 dark:bg-[#272729]/80 dark:border-[#343536] hover:bg-teal-50 hover:text-teal-600 hover:border-teal-100 dark:hover:bg-teal-900/20 rounded-full text-gray-500 dark:text-gray-400 transition-all shadow-xs"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
            
            <div className="flex-1 relative" ref={mobileSearchRef}>
              <div className="bg-gray-50 border border-gray-200 dark:bg-[#272729]/80 dark:border-[#343536] rounded-full px-4 py-1.5 flex items-center focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all shadow-inner">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search..." 
                  className="bg-transparent border-none outline-none text-gray-900 dark:text-white text-sm w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {isSearching && <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent animate-spin rounded-full ml-2" />}
              </div>

              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-md shadow-2xl overflow-y-auto max-h-[70vh] animate-fade-up origin-top">
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
              className="flex items-center justify-center p-1.5 bg-white dark:bg-[#272729]/80 hover:bg-orange-100 dark:hover:bg-[#343536] rounded-xl transition-all active:scale-95 w-9 h-9 text-gray-700 hover:text-orange-600 dark:text-gray-300 shadow-sm border border-orange-100 dark:border-[#343536]/50 btn-press"
            >
              <div className={`flex items-center justify-center transition-transform duration-300 ${menuOpen ? 'rotate-90' : 'rotate-0'}`}>
                {menuOpen ? <X size={20} strokeWidth={2.5} /> : <AlignLeft size={20} strokeWidth={2.5} />}
              </div>
            </button>

            {/* Left-aligned Mobile Menu Dropdown */}
            {menuOpen && (
              <div className="absolute left-0 top-12 bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-lg shadow-2xl w-64 py-2 z-50 animate-fade-up">
                {token ? (
                  <>
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-[#343536] flex items-center gap-3">
                      <div className="w-10 h-10 bg-linear-to-tr from-teal-500 to-cyan-400 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden shrink-0 relative shadow-sm">
                        {user?.username?.charAt(0).toUpperCase()}
                        {getAvatarUrl(null, true) && (
                          <img 
                            src={getAvatarUrl(null, true)} 
                            alt="" 
                            className="absolute inset-0 w-full h-full object-cover z-10 bg-white dark:bg-[#1a1a1b]" 
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                      </div>
                      <div>
                        <p className="text-gray-900 dark:text-white font-bold text-sm">u/{user?.username}</p>
                        <p className="text-green-500 text-[11px] font-medium mb-0.5">Online</p>
                        {accountAgeText && <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{accountAgeText}</p>}
                        <div className="flex items-center gap-1 mt-1 text-teal-600 dark:text-teal-400">
                          <Flame size={12} strokeWidth={2.5} />
                          <span className="text-xs font-bold">{user?.anubhav || 0} Anubhav</span>
                        </div>
                      </div>
                    </div>

                    <Link 
                      to={`/u/${user?.username}`} 
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729] hover:text-gray-900 dark:hover:text-white transition-all text-sm"
                    >
                      <UserIcon size={20} strokeWidth={2} />
                      View Profile
                    </Link>

                    {user?.isAdmin && (
                      <Link 
                        to="/admin" 
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-teal-600 dark:text-teal-400 font-bold hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-all text-sm"
                      >
                        <Shield size={20} strokeWidth={2} />
                        Admin Panel
                      </Link>
                    )}

                    <Link 
                      to="/create-community" 
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729] hover:text-gray-900 dark:hover:text-white transition-all text-sm"
                    >
                      <Users size={20} strokeWidth={2} />
                      Create Community
                    </Link>

                    <Link 
                      to="/chat" 
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729] hover:text-gray-900 dark:hover:text-white transition-all text-sm"
                    >
                      <MessageSquare size={20} strokeWidth={2} />
                      Chat
                    </Link>

                    <Link 
                      to="/about" 
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729] hover:text-gray-900 dark:hover:text-white transition-all text-sm"
                    >
                      <Info size={20} strokeWidth={2} />
                      About Vartalap
                    </Link>
                    
                    <a 
                      href="mailto:vartalapsupport@gmail.com" 
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all text-sm"
                    >
                      <Megaphone size={20} strokeWidth={2} />
                      Contact Developer
                    </a>
                    
                    {/* Theme Toggle (Inside Mobile Menu) */}
                    <button 
                      onClick={() => { toggleTheme(); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729] hover:text-gray-900 dark:hover:text-white transition-all text-sm"
                    >
                      {isDarkMode ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
                      {isDarkMode ? "Light Mode" : "Dark Mode"}
                    </button>

                    <div className="border-t border-gray-200 dark:border-[#343536] mt-1 pt-1">
                      <button 
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-[#272729] hover:text-red-600 dark:hover:text-red-300 transition-all text-sm w-full"
                      >
                        <LogOut size={20} strokeWidth={2} />
                        Log Out
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-2 px-4 py-3 border-b border-gray-200 dark:border-[#343536]">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Join Vartalap today!</p>
                      <Link to="/login" onClick={() => setMenuOpen(false)} className="w-full text-center bg-gray-100 dark:bg-[#272729] text-gray-900 dark:text-white text-sm font-bold px-4 py-2 rounded-full transition-all">Log In</Link>
                      <Link to="/login" state={{ isSignUp: true }} onClick={() => setMenuOpen(false)} className="w-full text-center bg-linear-to-r from-teal-500 to-cyan-500 text-white text-sm font-bold px-4 py-2 rounded-full hover:opacity-90 transition-all shadow-md">Sign Up</Link>
                    </div>

                    <Link 
                      to="/about" 
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729] hover:text-gray-900 dark:hover:text-white transition-all text-sm"
                    >
                      <Info size={20} strokeWidth={2} />
                      About Vartalap
                    </Link>
                    
                    {/* Theme Toggle (Inside Mobile Menu for Guests) */}
                    <button 
                      onClick={() => { toggleTheme(); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729] hover:text-gray-900 dark:hover:text-white transition-all text-sm"
                    >
                      {isDarkMode ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
                      {isDarkMode ? "Light Mode" : "Dark Mode"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 cursor-pointer shrink-0 py-1 rounded-full transition-all" onClick={() => setMobileSearchOpen(false)}>
            <img src={logo} alt="Vartalap Logo" className="w-8 h-8 sm:w-9 sm:h-9 object-cover rounded-full border border-orange-200 dark:border-[#343536] shadow-sm bg-white" />
            <span className="text-gray-900 dark:text-white font-extrabold text-lg sm:text-xl tracking-tight hidden md:block">
              Vartalap
            </span>
          </Link>
        </div>

        {/* Desktop Search Bar */}
        <div className="hidden sm:block flex-1 max-w-150 mx-4 relative" ref={desktopSearchRef}>
          <div className="bg-white dark:bg-[#272729]/80 border border-orange-100 dark:border-[#343536] rounded-full px-4 py-1.5 flex items-center hover:border-orange-300 dark:hover:border-orange-700 transition-all focus-within:border-orange-500 dark:focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 dark:focus-within:ring-orange-500/20 focus-within:bg-white dark:focus-within:bg-[#272729] shadow-inner w-full group">
            <Search size={16} strokeWidth={2.5} className={`transition-colors ${isSearching ? 'text-orange-500 dark:text-orange-500 animate-pulse' : 'text-gray-400 group-focus-within:text-orange-500 dark:group-focus-within:text-orange-500'}`} />
            <input 
              type="text" 
              placeholder="Search communities, users, posts..." 
              className="bg-transparent border-none outline-none text-gray-900 dark:text-white text-sm ml-2 w-full placeholder-gray-400 dark:placeholder-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchTerm.trim().length > 0 && setShowResults(true)}
            />
          </div>

          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 dark:bg-[#1a1a1b]/95 backdrop-blur-lg border border-gray-200 dark:border-[#343536] rounded-md shadow-2xl z-50 overflow-hidden max-h-100 overflow-y-auto animate-fade-up origin-top">
              <SearchDropdown searchResults={searchResults} searchTerm={searchTerm} setShowResults={setShowResults} setSearchTerm={setSearchTerm} getAvatarUrl={getAvatarUrl} />
            </div>
          )}
        </div>

        {/* RIGHT SIDE ACTIONS */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile Search Icon */}
          <button 
            onClick={() => setMobileSearchOpen(true)}
            className="sm:hidden p-2 bg-white border border-orange-100 dark:bg-[#272729]/80 dark:border-[#343536] hover:bg-orange-100 hover:text-orange-600 hover:border-orange-200 dark:hover:bg-orange-900/20 rounded-full text-gray-500 dark:text-gray-400 transition-all shadow-xs btn-press"
          >
            <Search size={18} strokeWidth={2.5} />
          </button>
          
          {/* Toggle Theme Button (Desktop Only, hidden on sm) */}
          <button 
            onClick={toggleTheme}
            className="hidden sm:flex items-center justify-center p-2 bg-white border border-orange-100 dark:bg-[#272729]/80 dark:border-[#343536] hover:bg-orange-100 hover:text-orange-600 hover:border-orange-200 dark:hover:bg-orange-900/20 rounded-full text-gray-500 dark:text-gray-400 transition-all shadow-xs btn-press w-9 h-9"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={18} strokeWidth={2.5} /> : <Moon size={18} strokeWidth={2.5} />}
          </button>

          {token ? (
            <>
              {/* Desktop: Create Post (Primary Action) */}
              <Link to="/create-post" className="hidden xl:flex bg-linear-to-r from-orange-400 to-orange-500 dark:from-orange-500 dark:to-orange-600 hover:opacity-90 text-white text-sm font-bold px-4 py-1.5 rounded-full transition-all shadow-md items-center gap-1.5 btn-press">
                <Pencil size={16} strokeWidth={2.5} />
                Create Post
              </Link>

              {/* Desktop: Create Community (Secondary Action) */}
              <Link to="/create-community" className="hidden xl:flex text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-[#272729] px-4 py-1.5 rounded-full transition-all border border-orange-200 dark:border-[#343536] items-center gap-1.5 btn-press bg-white dark:bg-transparent">
                <Users size={16} strokeWidth={2.5} />
                Community
              </Link>

              {/* Desktop: Chat Link */}
              <Link to="/chat" className="hidden xl:flex text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-[#272729] px-4 py-1.5 rounded-full transition-all border border-orange-200 dark:border-[#343536] items-center gap-1.5 btn-press bg-white dark:bg-transparent">
                <MessageSquare size={16} strokeWidth={2.5} />
                Chat
              </Link>

              {/* System Inbox (Megaphone) */}
              <div className="relative" ref={desktopInboxRef}>
                <button 
                  onClick={() => setInboxOpen(!inboxOpen)}
                  className="p-2 bg-white border border-orange-100 dark:bg-[#272729]/80 dark:border-[#343536] hover:bg-orange-100 hover:text-orange-600 hover:border-orange-200 dark:hover:bg-orange-900/20 rounded-full text-gray-500 dark:text-gray-400 transition-all shadow-xs btn-press relative flex items-center justify-center w-9 h-9"
                  title="System Announcements"
                >
                  <Megaphone size={18} strokeWidth={2.5} />
                  {sysUnreadCount > 0 && (
                     <span className="absolute top-1 right-1 flex items-center justify-center min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5 shadow-[0_0_0_2px_#fff7ed] dark:shadow-[0_0_0_2px_#1a1a1b]">
                       {sysUnreadCount}
                     </span>
                  )}
                </button>
                <SystemInbox 
                  isOpen={inboxOpen} 
                  onClose={() => setInboxOpen(false)} 
                  user={user} 
                  messages={sysMessages}
                  readIds={sysReadIds}
                  onMarkRead={handleSysMsgRead}
                  onMarkAllRead={markAllSysMsgsRead}
                  refreshMessages={fetchSysMessages}
                />
              </div>

              {/* Notification Bell (Desktop + Mobile) */}
              <div className="relative" ref={desktopNotifRef}>
                <button 
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="p-2 bg-white border border-orange-100 dark:bg-[#272729]/80 dark:border-[#343536] hover:bg-orange-100 hover:text-orange-600 hover:border-orange-200 dark:hover:bg-orange-900/20 rounded-full text-gray-500 dark:text-gray-400 transition-all shadow-xs btn-press relative flex items-center justify-center w-9 h-9"
                >
                  <Bell size={18} strokeWidth={2.5} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5 shadow-[0_0_0_2px_#fff7ed] dark:shadow-[0_0_0_2px_#1a1a1b]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-md shadow-2xl z-50 overflow-hidden animate-fade-up">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-[#343536] flex justify-between items-center bg-white dark:bg-[#1a1a1b] sticky top-0 z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 dark:text-white font-bold text-sm">Notifications</span>
                        <button 
                          onClick={toggleSound} 
                          className="text-gray-400 hover:text-orange-500 transition-colors focus:outline-none" 
                          title={soundEnabled ? "Mute notification sounds" : "Unmute notification sounds"}
                        >
                          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-blue-500 text-[10px] hover:underline font-medium">
                            Mark all as read
                          </button>
                        )}
                      {notifications.length > 0 && (
                        <button onClick={clearAllNotifications} className="text-red-500 text-[10px] hover:underline font-medium">
                          Clear all
                        </button>
                      )}
                        <button onClick={() => setNotifOpen(false)} className="sm:hidden text-gray-400 text-xs">✕</button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-10 flex flex-col items-center justify-center gap-2 text-center text-gray-500 text-sm">
                          <Bell size={24} className="opacity-30" />
                          <span>No notifications yet</span>
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n._id}
                            className={`flex items-start gap-3 px-4 py-3 border-b border-gray-200 dark:border-[#343536]/50 hover:bg-gray-50 dark:hover:bg-[#272729] transition-all cursor-pointer group ${!n.read ? 'bg-blue-50 dark:bg-blue-500/5 border-l-2 border-l-blue-500' : ''}`}
                            onClick={() => {
                              if (!n.read) markAsRead(n._id);
                              
                              if (n.type === 'follow') {
                                navigate(`/u/${n.sender?.username}`);
                              } else if (n.type === 'report') {
                                navigate(`/admin/reports`);
                              } else if (n.type === 'chat_invite') {
                                navigate(`/chat`);
                              } else if (n.type === 'admin_message') {
                                setViewingAdminMsg(n);
                                setNotifOpen(false);
                              } else if (n.type === 'welcome') {
                                // No nav required, just stay on current page
                              } else {
                                navigate(`/post/${n.post?._id}`);
                              }
                              setNotifOpen(false);
                            }}
                          >
                            {/* Notification Icon */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              n.type === 'vote' ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' :
                              (n.type === 'comment' || n.type === 'reply') ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' :
                              n.type === 'mention' ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' :
                              n.type === 'report' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' :
                              n.type === 'chat_invite' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' :
                              n.type === 'welcome' ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' :
                              n.type === 'admin_message' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-500' :
                              'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400'
                            }`}>
                              {n.type === 'vote' ? <Flame className="w-4 h-4" /> :
                               (n.type === 'comment' || n.type === 'reply') ? <MessageSquare className="w-4 h-4" /> :
                               n.type === 'mention' ? <span className="font-bold text-lg font-mono leading-none pt-0.5">@</span> :
                               n.type === 'report' ? <AlertTriangle className="w-4 h-4" /> :
                               n.type === 'chat_invite' ? <MessageSquare className="w-4 h-4" /> :
                               n.type === 'welcome' ? <Sparkles className="w-4 h-4" /> :
                               n.type === 'admin_message' ? <Shield className="w-4 h-4" /> :
                               <Users className="w-4 h-4" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-700 dark:text-gray-200">
                                <span className="font-bold text-gray-900 dark:text-white">{n.type === 'welcome' || n.type === 'admin_message' ? 'System ' : `u/${n.sender?.username}`}</span> 
                                <span className="text-gray-600 dark:text-gray-400">
                                {n.type === 'welcome' 
                                  ? n.content
                                  : n.type === 'admin_message'
                                  ? `: ${stripHtml(n.content)}`
                                  : n.type === 'vote' ? ' voted on your post' : n.type === 'comment' ? ' commented on your post' : n.type === 'reply' ? ' replied to your comment' : n.type === 'mention' ? ' mentioned you in a comment' : n.type === 'report' ? ' reported a ' + (n.content?.split(' ')[2] || 'item') : n.type === 'chat_invite' ? ' ' + n.content : ' started following you'}
                                </span>
                              </p>
                              {(n.type !== 'follow' && n.type !== 'report' && n.type !== 'chat_invite' && n.type !== 'welcome' && n.type !== 'admin_message') && <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 line-clamp-1">{n.post?.title}</p>}
                              <p className="text-[10px] text-gray-500 mt-1">
                                {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {n.type === 'chat_invite' && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <button onClick={(e) => { e.stopPropagation(); acceptChatInvite(n._id); }} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer relative z-10 btn-press">Accept</button>
                                  <button onClick={(e) => { e.stopPropagation(); declineChatInvite(n._id); }} className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-[#343536] dark:hover:bg-[#404142] text-gray-800 dark:text-gray-200 text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer relative z-10 btn-press">Decline</button>
                                </div>
                              )}
                            </div>
                            <button 
                                onClick={(e) => deleteNotification(n._id, e)} 
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors self-center opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Delete Notification"
                             >
                                <X size={16} strokeWidth={2.5}/>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Create Post Icon */}
              <Link to="/create-post" className="sm:hidden p-2 bg-white border border-orange-100 dark:bg-[#272729]/80 dark:border-[#343536] hover:bg-orange-100 hover:text-orange-600 hover:border-orange-200 dark:hover:bg-[#343536] rounded-full transition-all text-gray-500 dark:text-gray-300 btn-press" title="Create Post">
                <Pencil size={18} strokeWidth={2.5} />
              </Link>

              {/* Desktop: Modern Profile Pill */}
              <div className="hidden md:flex relative group cursor-pointer">
                <div className="flex items-center gap-2 bg-white dark:bg-[#272729]/50 border border-orange-200 dark:border-[#343536] hover:border-orange-300 dark:hover:border-orange-500 pl-1 pr-3 py-1 rounded-full transition-all btn-press shadow-sm">
                  <div className="w-7 h-7 relative shrink-0">
                    <div className="w-full h-full bg-linear-to-tr from-orange-400 to-red-400 rounded-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden relative shadow-inner">
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
                  <ChevronDown size={14} strokeWidth={2.5} className="text-gray-400 ml-1" />
                </div>

                {/* Hover Dropdown for Profile & Logout */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1a1b] border border-gray-100 dark:border-[#343536] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden animate-fade-up">
                  <Link to={`/u/${user?.username}`} className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <UserIcon size={16} strokeWidth={2} />
                    My Profile
                  </Link>
                  {user?.isAdmin && (
                    <Link to="/admin" className="flex items-center gap-2 px-4 py-3 text-sm text-orange-600 dark:text-orange-400 font-bold hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors">
                      <Shield size={16} strokeWidth={2} />
                      Admin Panel
                    </Link>
                  )}
                  <a 
                    href="mailto:vartalapsupport@gmail.com" 
                    className="flex items-center gap-2 px-4 py-3 text-sm text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                  >
                    <Megaphone size={16} strokeWidth={2} />
                    Support / Contact
                  </a>
                  <Link to="/about" className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <Info size={16} strokeWidth={2} />
                    About Vartalap
                  </Link>
                  <div className="h-px bg-gray-100 dark:bg-[#343536]"></div>
                  <button onClick={handleLogout} className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 font-medium transition-colors">
                    <LogOut size={16} strokeWidth={2} />
                    Log Out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block text-orange-700 dark:text-gray-200 text-sm font-bold hover:bg-orange-100 dark:hover:bg-[#272729] px-5 py-2 rounded-full transition-all border border-orange-200 dark:border-[#343536] btn-press bg-white">
                Log In
              </Link>
              <Link to="/login" state={{ isSignUp: true }} className="hidden sm:block bg-orange-500 text-white text-sm font-bold px-5 py-2 rounded-full hover:bg-orange-600 transition-all btn-press shadow-sm hover:shadow-md">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Admin Message View Modal */}
      {viewingAdminMsg && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => { 
            if(e.target === e.currentTarget) setViewingAdminMsg(null);
        }}>
          <div className="bg-white dark:bg-[#1a1a1b] w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-[#343536] animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-4 shrink-0 relative">
                <button 
                  onClick={() => setViewingAdminMsg(null)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-1 transition"
                >
                  <X size={18} />
                </button>
                <div className="flex items-center gap-3 text-white">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg leading-tight">System Message</h2>
                    <p className="text-xs text-white/80">From Vartalap Administration</p>
                  </div>
                </div>
            </div>
            
            <div className="p-6 overflow-y-auto custom-editor-content">
              <div 
                className="prose prose-sm md:prose-base dark:prose-invert max-w-none break-words"
                dangerouslySetInnerHTML={{ __html: viewingAdminMsg.content }}
              />
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-[#343536] bg-gray-50 dark:bg-[#272729] shrink-0 text-center">
              <button 
                onClick={() => setViewingAdminMsg(null)}
                className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-[#343536] dark:hover:bg-[#404142] text-gray-800 dark:text-gray-200 rounded-xl font-bold transition text-sm"
              >
                Close Message
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;