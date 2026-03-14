import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom'; // FIX: Removed unused useNavigate
import axios from 'axios';
import toast from 'react-hot-toast';
import OnlineIndicator from '../components/OnlineIndicator';
import SkeletonLoader from '../components/SkeletonLoader';
import PostMenu from '../components/PostMenu';
import { SocketContext } from '../context/SocketContext';

const UserProfile = () => {
  const { username } = useParams();
  // FIX: Removed unused 'navigate' variable
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]); // Currently viewed list of posts based on activeTab
  const [allTabsData, setAllTabsData] = useState({}); // Stores all fetched arrays
  const [activeTab, setActiveTab] = useState('Overview');
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null); // Track which post's dropdown is open
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [description, setDescription] = useState('');
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');
  const { socket } = useContext(SocketContext);

  const fetchUserProfile = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get(`${apiUrl}/api/users/${username}`, config);
      setProfileData(res.data);
      setDescription(res.data.profile.description || '');
      
      // Store all data arrays so we can switch tabs without re-fetching
      setAllTabsData({
        Posts: res.data.posts || [],
        Comments: res.data.commentedPosts || [],
        Saved: res.data.savedPosts || [],
        Hidden: res.data.hiddenPosts || [],
        Upvoted: res.data.upvotedPosts || [],
        Downvoted: res.data.downvotedPosts || []
      });

      // Default feed is Posts/Overview
      setPosts(res.data.posts || []);

      // Check if current user is already following this profile
      if (currentUser && res.data.profile.followers) {
        setIsFollowing(res.data.profile.followers.some(f => 
          (typeof f === 'object' ? f._id === currentUser.id : f === currentUser.id)
        ));
      }

    } catch (err) {
      console.error("Error fetching user profile", err);
      // alert("User nahi mila! 🛑");
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;
  };

  useEffect(() => {
    fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // Real-time Anubhav & Post Updates
  useEffect(() => {
    if (!socket) return;

    const handleInteraction = (updatedPostId) => {
      // Agar koi post update hoti hai jo humare kisi bhi tab mein hai
      const isRelevant = Object.values(allTabsData).flat().some(p => p._id === updatedPostId);
      
      // Toh hum profile dobara fetch karenge taaki Anubhav update ho jaye
      if (isRelevant) {
         fetchUserProfile();
      }
    };

    socket.on('post_interaction', handleInteraction);
    
    return () => {
      socket.off('post_interaction', handleInteraction);
    };
  }, [socket, allTabsData]); // Dependency ensures we check against latest data

  // VOTING LOGIC for the feed
  const handleUpvote = async (postId) => {
    if (!token) {
      toast.error("Vote karne ke liye pehle Log In karein! 🛑");
      return;
    }
    // Toggle-off supported by backend logic
    const post = posts.find(p => p._id === postId);
    if (!post) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.put(`${apiUrl}/api/posts/${postId}/upvote`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Merge only the votes to preserve populated author/community
      
      // 1. Calculate Karma Change for Instant UI Update (if visible user owns the post)
      if (post.author?._id === profileData.profile._id || post.author === profileData.profile._id) {
        const oldNet = (post.upvotes?.length || 0) - (post.downvotes?.length || 0);
        const newNet = (res.data.post.upvotes?.length || 0) - (res.data.post.downvotes?.length || 0);
        const diff = newNet - oldNet;
        
        setProfileData(prev => ({ ...prev, totalAnubhav: (prev.totalAnubhav || 0) + diff }));
      }

      // 2. Update Posts State
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, upvotes: res.data.post.upvotes, downvotes: res.data.post.downvotes } : p));
      setAllTabsData(prev => {
        const newData = { ...prev };
        Object.keys(newData).forEach(tab => {
          if (Array.isArray(newData[tab])) {
            newData[tab] = newData[tab].map(p => p._id === postId ? { ...p, upvotes: res.data.post.upvotes, downvotes: res.data.post.downvotes } : p);
          }
        });
        return newData;
      });
    } catch (err) {
      console.error("Voting error:", err);
    }
  };

  const handleDownvote = async (postId) => {
    if (!token) {
      toast.error("Vote karne ke liye pehle Log In karein! 🛑");
      return;
    }
    // Toggle-off supported by backend logic
    const post = posts.find(p => p._id === postId);
    if (!post) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.put(`${apiUrl}/api/posts/${postId}/downvote`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Merge only the votes to preserve populated author/community

      // 1. Calculate Karma Change
      if (post.author?._id === profileData.profile._id || post.author === profileData.profile._id) {
        const oldNet = (post.upvotes?.length || 0) - (post.downvotes?.length || 0);
        const newNet = (res.data.post.upvotes?.length || 0) - (res.data.post.downvotes?.length || 0);
        const diff = newNet - oldNet;
        
        setProfileData(prev => ({ ...prev, totalAnubhav: (prev.totalAnubhav || 0) + diff }));
      }

      setPosts(prev => prev.map(p => p._id === postId ? { ...p, upvotes: res.data.post.upvotes, downvotes: res.data.post.downvotes } : p));
      setAllTabsData(prev => {
        const newData = { ...prev };
        Object.keys(newData).forEach(tab => {
          if (Array.isArray(newData[tab])) {
            newData[tab] = newData[tab].map(p => p._id === postId ? { ...p, upvotes: res.data.post.upvotes, downvotes: res.data.post.downvotes } : p);
          }
        });
        return newData;
      });
    } catch (err) {
      console.error("Voting error:", err);
    }
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (5MB limit)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("Unable to upload, please choose a file less than 5MB");
      return;
    }

    const formData = new FormData();
    formData.append(type, file); // Yahan 'profilePic' ya 'bannerPic' dynamic ja raha hai

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.put(`${apiUrl}/api/users/${username}/update`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      // FIX: alert ki jagah toast use karein
      toast.success(`${type === 'profilePic' ? 'Profile Picture' : 'Banner'} Updated! 📸`);
      
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (storedUser && res.data.user) {
        storedUser.profilePic = res.data.user.profilePic || storedUser.profilePic;
        storedUser.bannerPic = res.data.user.bannerPic || storedUser.bannerPic;
        localStorage.setItem('user', JSON.stringify(storedUser));
        window.dispatchEvent(new Event('storage'));
      }
      
      fetchUserProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    }
  };

  const handleUpdateDescription = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.put(`${apiUrl}/api/users/${username}/update`, { description }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Description updated! ✨");
      setIsEditingDesc(false);
      fetchUserProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  const handleImageDelete = (type) => {
    toast((t) => (
      <div>
        <p className="mb-2">{`${type === 'profilePic' ? 'Profile Picture' : 'Banner'} delete karni hai? 🗑️`}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => { toast.dismiss(t.id); executeImageDelete(type); }} className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold">Yes</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-gray-500 text-white px-3 py-1 rounded text-sm font-bold">Cancel</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const executeImageDelete = async (type) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.delete(`${apiUrl}/api/users/${username}/remove-image`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { type }
      });
      toast.success(res.data.message);

      // Update localStorage
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (storedUser) {
        storedUser[type] = null;
        localStorage.setItem('user', JSON.stringify(storedUser));
        window.dispatchEvent(new Event('storage'));
      }

      fetchUserProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const isOwner = currentUser && currentUser.username === username;

  if (!profileData) return <div className="mt-10"><SkeletonLoader /></div>;

  // Calculate Account Age
  let accountAgeText = "Joined recently";
  if (profileData.profile.createdAt) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const days = Math.floor((Date.now() - new Date(profileData.profile.createdAt).getTime()) / msPerDay);
    if (days === 0) accountAgeText = "Joined today";
    else if (days === 1) accountAgeText = "Joined 1 day ago";
    else accountAgeText = `Joined ${days} days ago`;
  }

  const handleDelete = (postId) => {
    toast((t) => (
      <div>
        <p className="mb-2">Post delete karni hai? 🗑️</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => { toast.dismiss(t.id); executeDelete(postId); }} className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold">Yes</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-gray-500 text-white px-3 py-1 rounded text-sm font-bold">Cancel</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const executeDelete = async (postId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');
      await axios.delete(`${apiUrl}/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(prevPosts => prevPosts.filter(p => p._id !== postId));
      // Also update in allTabsData to prevent it reappearing on tab switch
      setAllTabsData(prev => {
        const newData = { ...prev };
        // Update the current active tab array if it exists
        if (newData[activeTab]) {
          newData[activeTab] = newData[activeTab].filter(p => p._id !== postId);
        }
        // If we are in Overview, also update Posts array as it's the source
        if (activeTab === 'Overview' && newData.Posts) {
          newData.Posts = newData.Posts.filter(p => p._id !== postId);
        }
        return newData;
      });
      toast.success("Post Deleted! 🗑️");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Post delete karne mein error aaya!");
    }
  };

  const handleFollow = async () => {
    if (!token) return toast.error("Log in to follow users!");
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.put(`${apiUrl}/api/users/${profileData.profile._id}/follow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsFollowing(res.data.isFollowing);
      // Optionally re-fetch profile to update counts, or update local state manually
      setProfileData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          followers: res.data.isFollowing 
            ? [...prev.profile.followers, currentUser.id] 
            : prev.profile.followers.filter(f => (typeof f === 'object' ? f._id !== currentUser.id : f !== currentUser.id))
        }
      }));
    } catch (err) {
      console.error("Follow error", err);
      toast.error("Failed to follow user.");
    }
  };

  const handleDeleteAccount = () => {
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <p className="font-bold text-red-600">⚠ Account Permanently Delete Kar Dein?</p>
        <p className="text-xs text-gray-500">Aapka saara data (posts, comments, profile) hamesha ke liye mit jayega. Yeh action undo nahi ho sakta.</p>
        <div className="flex gap-2 justify-end">
          <button 
            onClick={() => { toast.dismiss(t.id); executeAccountDeletion(); }} 
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-full text-xs font-bold transition-colors"
          >
            Yes, Delete Permanently
          </button>
          <button 
            onClick={() => toast.dismiss(t.id)} 
            className="bg-gray-200 dark:bg-[#343536] text-gray-800 dark:text-white px-4 py-1.5 rounded-full text-xs font-bold transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center', style: { minWidth: '350px' } });
  };

  const executeAccountDeletion = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.delete(`${apiUrl}/api/users/${profileData.profile._id}/delete`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(res.data.message, { duration: 5000 });
      
      // Cleanup and Redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);

    } catch (err) {
      console.error("Deletion error:", err);
      toast.error(err.response?.data?.message || "Failed to delete account. Please try again later.");
    }
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    // Overview usually mixes recent posts and maybe comments, but for simplicity, default to Posts array
    if (tabName === 'Overview') setPosts(allTabsData.Posts || []);
    else setPosts(allTabsData[tabName] || []);
  };

  const handleSave = async (postId) => {
    if (!token) return toast.error("Log in to save posts!");
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.put(`${apiUrl}/api/posts/${postId}/save`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update local state to reflect save toggle
      const updatePosts = (prev) => prev.map(p => 
        p._id === postId 
          ? { ...p, savedBy: res.data.isSaved ? [...(p.savedBy || []), currentUser.id] : (p.savedBy || []).filter(id => id !== currentUser.id) }
          : p
      );
      setPosts(updatePosts);
      setAllTabsData(prev => {
        const newData = { ...prev };
        Object.keys(newData).forEach(tab => {
          newData[tab] = updatePosts(newData[tab]);
        });
        return newData;
      });
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleHide = async (postId) => {
    if (!token) return toast.error("Log in to hide posts!");
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.put(`${apiUrl}/api/posts/${postId}/hide`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // If hidden, and we aren't specifically in the Hidden tab, remove from view immediately
      if (res.data.isHidden && activeTab !== 'Hidden') {
        setPosts(prev => prev.filter(p => p._id !== postId));
      } else {
        // Just toggle state if unhiding from Hidden tab
        const updatePosts = (prev) => prev.map(p => 
          p._id === postId 
            ? { ...p, hiddenBy: res.data.isHidden ? [...(p.hiddenBy || []), currentUser.id] : (p.hiddenBy || []).filter(id => id !== currentUser.id) }
            : p
        );
        setPosts(updatePosts);
      }
    } catch (err) {
      console.error("Hide error:", err);
    }
  };

  const handleReport = async (postId) => {
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <p className="font-bold text-orange-600">🚩 Report This Post</p>
        <p className="text-xs text-gray-500">Select a reason:</p>
        <div className="flex flex-col gap-1">
          {['spam', 'abuse', 'harassment', 'hate_speech', 'misinformation'].map(reason => (
            <button
              key={reason}
              onClick={() => { toast.dismiss(t.id); submitReport(postId, reason); }}
              className="text-left px-3 py-2 text-xs font-bold rounded hover:bg-gray-100 dark:hover:bg-[#272729] capitalize transition-colors"
            >
              {reason.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button onClick={() => toast.dismiss(t.id)} className="text-xs text-gray-400 hover:text-gray-600 mt-1">Cancel</button>
      </div>
    ), { duration: Infinity, position: 'top-center', style: { minWidth: '280px' } });
  };

  const submitReport = async (postId, reason) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.post(`${apiUrl}/api/reports`, 
        { targetType: 'post', targetId: postId, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Report submitted! Our team will review it. 🛡️');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report.');
    }
  };

  return (
    <div className="dark:bg-black min-h-screen text-gray-900 dark:text-white transition-colors">
      {/* 1. TOP HEADER SECTION */}
      <div className="bg-green-50 dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-md overflow-hidden shadow-md transition-colors">
        {/* Banner */}
        <div 
          className="h-40 md:h-64 bg-gray-100 dark:bg-[#272729] relative group overflow-hidden transition-colors border-b border-gray-200 dark:border-[#343536]"
        >
          {profileData.profile.bannerPic ? (
            <img 
              src={getImageUrl(profileData.profile.bannerPic)} 
              alt="Banner" 
              className="w-full h-full object-cover object-center"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full bg-linear-to-r from-gray-200 to-gray-300 dark:from-[#1a1a1b] dark:to-[#272729]"></div>
          )}
          
          {isOwner && (
            <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-30">
              <label className="bg-gray-900/70 hover:bg-gray-900/90 dark:bg-black/70 dark:hover:bg-black/90 text-white px-4 py-2 rounded-full cursor-pointer shadow-xl border border-white/20 flex items-center gap-2">
                <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'bannerPic')} />
                <span className="text-sm font-bold">📷 Edit Banner</span>
              </label>
              {profileData.profile.bannerPic && (
                <button 
                  onClick={() => handleImageDelete('bannerPic')}
                  className="bg-red-600/80 hover:bg-red-600 text-white px-4 py-2 rounded-full shadow-xl border border-white/20 flex items-center gap-2 text-sm font-bold"
                >
                  🗑️ Remove
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Profile Info Row */}
        <div className="px-4 md:px-6 pb-2 flex flex-col relative">
          {/* Overlapping Avatar */}
          <div className="-mt-12 md:-mt-16 w-24 h-24 md:w-32 md:h-32 relative shrink-0 z-20">
            <div className="w-full h-full bg-linear-to-tr from-orange-500 to-yellow-400 rounded-full border-4 border-white dark:border-[#1a1a1b] flex items-center justify-center text-4xl font-bold text-white shadow-xl group overflow-hidden relative transition-colors">
              {profileData.profile.username.charAt(0).toUpperCase()}
              {profileData.profile.profilePic && (
                <img 
                  src={getImageUrl(profileData.profile.profilePic)} 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-cover" 
                  onError={(e) => { e.target.style.display = 'none'; }} 
                />
              )}
              
              {isOwner && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 cursor-pointer opacity-0 group-hover:opacity-100 transition-all">
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'profilePic')} />
                    <span className="text-xl">📷</span>
                  </label>
                  {profileData.profile.profilePic && (
                    <button onClick={() => handleImageDelete('profilePic')} className="text-xl hover:scale-110 transition-transform">
                      🗑️
                    </button>
                  )}
                </div>
              )}
            </div>
            <OnlineIndicator userId={profileData.profile._id} size="w-6 h-6 md:w-8 md:h-8" border="border-[3px] md:border-4 border-white dark:border-[#1a1a1b]" />
          </div>
          
          <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between w-full gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight">u/{profileData.profile.username}</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">u/{profileData.profile.username}</p>
              <p className="text-gray-600 dark:text-gray-500 text-xs mt-1">
                {profileData.profile.followers?.length || 0} Followers • {profileData.profile.following?.length || 0} Following
              </p>
            </div>
            {/* Action Buttons */}
            <div className="flex gap-2">
              {!isOwner && (
                <button 
                  onClick={handleFollow}
                  className={`flex-1 md:flex-none justify-center font-bold px-6 py-2 rounded-full transition-all text-sm border ${
                    isFollowing 
                      ? 'bg-transparent text-gray-900 dark:text-white border-gray-900 dark:border-white hover:bg-gray-100 dark:hover:bg-white/10' 
                      : 'bg-gray-900 dark:bg-white text-white dark:text-black border-transparent hover:bg-gray-800 dark:hover:bg-gray-200'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
              {/* Note: Chat is currently a functional stub / WIP */}
              {!isOwner && (
                <button 
                  onClick={() => toast("Chat feature is coming soon! 💬", { icon: '💬' })}
                  className="flex-1 md:flex-none justify-center bg-transparent border border-gray-300 dark:border-[#343536] text-gray-900 dark:text-white font-bold px-6 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-sm"
                >
                  Chat
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs (Responsive) */}
          <div className="flex gap-6 mt-6 border-b border-gray-200 dark:border-[#343536] w-full overflow-x-auto no-scrollbar transition-colors">
            {['Overview', 'Posts', 'Comments', 'Saved', 'Hidden', 'Upvoted', 'Downvoted', 'Created', 'Joined']
              // Filter out private tabs if not owner
              .filter(tab => isOwner || ['Overview', 'Posts', 'Comments', 'Created', 'Joined'].includes(tab))
              .map((tab) => (
              <div 
                key={tab} 
                onClick={() => handleTabChange(tab)}
                className={`pb-3 text-sm font-bold cursor-pointer border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA (2 Columns) */}
      <div className="flex flex-col md:flex-row gap-6 items-start mt-6">
        
        {/* LEFT COLUMN: FEED */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {(activeTab === 'Created' || activeTab === 'Joined') ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(activeTab === 'Created' ? profileData.createdCommunities : profileData.joinedCommunities)?.map(c => (
                <Link key={c._id} to={`/v/${c.name}`} className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-4 rounded-md hover:border-gray-400 dark:hover:border-gray-500 transition-all flex flex-col items-center text-center gap-3">
                  <div className={`w-16 h-16 ${activeTab === 'Created' ? 'bg-orange-600' : 'bg-blue-600'} rounded-full flex items-center justify-center text-2xl font-bold text-white overflow-hidden shadow-md relative`}>
                    v/
                    {c.profilePic && (
                      <img 
                        src={getImageUrl(c.profilePic)} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover" 
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                  </div>
                  <div>
                    <h4 className="text-gray-900 dark:text-white font-bold leading-tight">v/{c.name}</h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.description || "No description provided."}</p>
                  </div>
                </Link>
              ))}
              {((activeTab === 'Created' ? profileData.createdCommunities?.length : profileData.joinedCommunities?.length) === 0) && (
                 <div className="col-span-full bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-10 rounded-md text-center text-gray-500 shadow-sm transition-colors">
                   No {activeTab.toLowerCase()} communities found.
                 </div>
              )}
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-10 rounded-md text-center text-gray-500 shadow-sm transition-colors">
              No results found in {activeTab}.
            </div>
          ) : (
            posts.map((post) => {
              const upvotes = post.upvotes?.length || 0;
              const downvotes = post.downvotes?.length || 0;
              const curUserId = currentUser?.id || currentUser?._id;
              const hasUpvoted = currentUser && post.upvotes?.some(id => (typeof id === 'object' ? id._id : id) === curUserId);
              const hasDownvoted = currentUser && post.downvotes?.some(id => (typeof id === 'object' ? id._id : id) === curUserId);

              return (
                <div key={post._id} className={`bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-4 rounded-md shadow-sm hover:border-gray-400 dark:hover:border-gray-500 transition-all cursor-pointer overflow-visible relative ${String(activeMenuId) === String(post._id) ? 'z-[100]' : 'z-10 hover:z-[60]'}`}>
                  <p className="text-xs text-gray-500 mb-2">
                    Posted in <span className="text-gray-900 dark:text-white font-bold hover:underline">c/{post.community?.name || 'general'}</span>
                  </p>
                    <div className="flex justify-between items-start mb-1">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        <Link to={`/post/${post._id}`} className="hover:underline">{post.title}</Link>
                      </h2>
                      
                      <PostMenu 
                        post={post}
                        currentUser={currentUser}
                        onSave={handleSave}
                        onHide={handleHide}
                        onReport={handleReport}
                        onDelete={handleDelete}
                        onOpenChange={(isOpen) => setActiveMenuId(isOpen ? post._id : (prev => prev === post._id ? null : prev))}
                      />
                    </div>
                  
                  {post.media && post.media.length > 0 && (
                    <div className={`grid gap-2 mb-4 ${post.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {post.media.map((item, idx) => (
                        <div key={idx} className="relative rounded-md overflow-hidden border border-gray-200 dark:border-[#343536] bg-black/5 dark:bg-black/20 flex items-center justify-center">
                          {item.mimetype?.startsWith('video/') ? (
                            <video 
                              src={getImageUrl(item.url)} 
                              controls 
                              className="max-h-80 w-full object-cover"
                            />
                          ) : (
                            <img 
                              src={getImageUrl(item.url)} 
                              alt={`Attachment ${idx}`} 
                              className="max-h-80 w-full object-contain"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4 line-clamp-3">{post.content}</p>
                  
                  {/* Action Bar */}
                  <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400 font-bold text-sm flex-wrap">
                    {/* Voting UI */}
                    <div className="flex items-center bg-gray-100 dark:bg-[#272729] rounded-full overflow-hidden transition-colors border border-transparent dark:border-[#343536]">
                      <div 
                        onClick={() => handleUpvote(post._id)}
                        className={`flex items-center gap-1 px-3 py-2 cursor-pointer transition-all ${
                          hasUpvoted ? 'text-orange-500 bg-orange-500/10' : 'hover:bg-gray-200 dark:hover:bg-[#343536]'
                        }`}
                      >
                          <span className="text-base">⬆️</span>
                          <span className="text-xs font-bold">{post.upvotes?.length || 0}</span>
                      </div>
                      
                      <div className="w-[1px] h-4 bg-gray-300 dark:bg-[#343536]"></div>

                      <div 
                        onClick={() => handleDownvote(post._id)}
                        className={`flex items-center gap-1 px-3 py-2 cursor-pointer transition-all ${
                          hasDownvoted ? 'text-blue-500 bg-blue-500/10' : 'hover:bg-gray-200 dark:hover:bg-[#343536]'
                        }`}
                      >
                          <span className="text-base">⬇️</span>
                          <span className="text-xs font-bold">{post.downvotes?.length || 0}</span>
                      </div>
                    </div>
                    <Link to={`/post/${post._id}`} className="flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-[#272729] px-3 py-1.5 rounded transition-all">
                        <span>💬 {post.comments?.length || 0} Comments</span>
                    </Link>

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT COLUMN: PROFILE SIDEBAR CARD */}
        <div className="w-full md:w-80 h-fit flex flex-col gap-4 sticky top-18">
          <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-md shadow-sm overflow-hidden transition-colors">
            <div className="p-4">
              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4">About User</h3>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 relative shrink-0">
                  <div className="w-full h-full bg-linear-to-tr from-orange-500 to-yellow-400 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg overflow-hidden relative">
                    {profileData.profile.username.charAt(0).toUpperCase()}
                    {profileData.profile.profilePic && (
                      <img 
                        src={getImageUrl(profileData.profile.profilePic)} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover" 
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                  </div>
                  <OnlineIndicator userId={profileData.profile._id} size="w-4 h-4" border="border-2 border-white dark:border-[#1a1a1b]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-900 dark:text-white font-bold">u/{profileData.profile.username}</span>
                  <span className="text-xs text-gray-500">{accountAgeText}</span>
                </div>
              </div>

              {/* Description Section */}
              <div className="mb-6">
                {isEditingDesc ? (
                  <div className="flex flex-col gap-2">
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] rounded p-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 min-h-20 transition-colors"
                      placeholder="About yourself..."
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setIsEditingDesc(false)} className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Cancel</button>
                      <button onClick={handleUpdateDescription} className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1 rounded-full font-bold transition-colors">Save</button>
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                      {profileData.profile.description || "No description provided."}
                    </p>
                    {isOwner && (
                      <button 
                        onClick={() => setIsEditingDesc(true)}
                        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 dark:bg-[#272729] p-1 rounded-full text-[10px]"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-[#343536] transition-colors">
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{profileData.totalAnubhav || 0}</span>
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-tighter">Anubhav</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{posts.length}</span>
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-tighter">Posts</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-md shadow-sm p-4 transition-colors">
            <h3 className="text-orange-600 dark:text-orange-500 text-xs font-bold uppercase tracking-wider mb-2">Vartalap Member</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              This user is a member of the Vartalap community. Join today to see more from them!
            </p>
          </div>

          {/* Delete Account Button (Owner Only) */}
          {isOwner && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#343536] transition-colors">
               <button 
                onClick={handleDeleteAccount}
                className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-500 p-3 rounded-xl border border-red-100 dark:border-red-500/20 text-xs font-bold transition-all"
               >
                 <span>🗑️</span> Delete Account Permanently
               </button>
               <p className="text-[10px] text-gray-400 mt-2 text-center">Warning: This action cannot be undone.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default UserProfile;