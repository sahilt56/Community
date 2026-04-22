import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import OnlineIndicator from '../components/OnlineIndicator';
import SkeletonLoader from '../components/SkeletonLoader';
import PostMenu from '../components/PostMenu';
import { SocketContext } from '../context/SocketContext';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Calendar, MessageCircle, MapPin, Link as LinkIcon, Edit, ShieldAlert, Trash2, Camera, UserX, UserPlus, MapPinned, Users, CheckCircle, ArrowLeft, ArrowUp, ArrowDown, Share, Bookmark, BookmarkCheck, ExternalLink, BadgeCheck, Award, Pencil, Beaker } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { getOptimizedUrl, IMAGE_PRESETS } from '../utils/cloudinaryHelper';
import { compressImage } from '../utils/imageCompressor';

const sanitizeOptions = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] || []), 'style', 'className', 'class'],
    iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder'],
    video: ['src', 'controls', 'class', 'className', 'poster', 'loop', 'muted', 'playsinline']
  },
  tagNames: [...(defaultSchema.tagNames || []), 'mark', 'iframe', 'video', 'source', 'span', 'figure', 'figcaption'],
};

const UserProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]); // Currently viewed list of posts based on activeTab
  const [allTabsData, setAllTabsData] = useState({}); // Stores all fetched arrays
  const [activeTab, setActiveTab] = useState('Overview');
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null); // Track which post's dropdown is open
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [description, setDescription] = useState('');
  const [uploadModal, setUploadModal] = useState({ isOpen: false, type: '', file: null, previewUrl: '' });
  const [followersModal, setFollowersModal] = useState({ isOpen: false, type: 'followers', list: [] });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    const { socket } = useContext(SocketContext);

  const fetchUserProfile = useCallback(async () => {
    try {
      const res = await api.get(`/api/users/${username}`);
      setProfileData(res.data);
      
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
      if (err.response && err.response.status === 404) {
        toast.error(err.response.data?.message || "User not found or unavailable.");
        navigate('/'); // Redirect user back to feed
      }
    }
  }, [username, currentUser, navigate]);

  // Sync description state when not editing (prevents socket updates from wiping typed text)
  useEffect(() => {
    if (profileData && !isEditingDesc) {
      setDescription(profileData.profile.description || '');
    }
  }, [profileData, isEditingDesc]);

  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;
  };

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

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
  }, [socket, allTabsData, fetchUserProfile]); // Dependency ensures we check against latest data

  // Handle click outside for profile menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      const res = await api.put(`/api/posts/${postId}/upvote`, {});
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
      const res = await api.put(`/api/posts/${postId}/downvote`, {});
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

    // Check file size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("Unable to upload, please choose a file less than 10MB");
      e.target.value = ''; // Reset input
      return;
    }

    try {
      const loadingToast = toast.loading("Optimizing image... ✨");
      const optimizedFile = await compressImage(file);
      const previewUrl = URL.createObjectURL(optimizedFile);
      setUploadModal({ isOpen: true, type, file: optimizedFile, previewUrl });
      toast.dismiss(loadingToast);
    } catch (err) {
      console.error("Compression failed:", err);
      // Fallback to original file if compression fails
      const previewUrl = URL.createObjectURL(file);
      setUploadModal({ isOpen: true, type, file, previewUrl });
    } finally {
      e.target.value = ''; // Reset input so the same file can be selected again
    }
  };

  const closeUploadModal = () => {
    if (uploadModal.previewUrl) URL.revokeObjectURL(uploadModal.previewUrl);
    setUploadModal({ isOpen: false, type: '', file: null, previewUrl: '' });
  };

  const confirmImageUpload = async () => {
    if (!uploadModal.file) return;
    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append(uploadModal.type, uploadModal.file);

    try {
      const res = await api.put(`/api/users/${username}/update`, formData);
      toast.success(`${uploadModal.type === 'profilePic' ? 'Profile Picture' : 'Banner'} Updated! 🎉`);
      
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (storedUser && res.data.user) {
        storedUser.profilePic = res.data.user.profilePic || storedUser.profilePic;
        storedUser.bannerPic = res.data.user.bannerPic || storedUser.bannerPic;
        localStorage.setItem('user', JSON.stringify(storedUser));
        window.dispatchEvent(new Event('storage'));
      }
      
      fetchUserProfile();
      closeUploadModal();
    } catch (err) {
      if (err.response?.status === 413 || err.response?.data?.message?.toLowerCase().includes("too large")) {
        toast.error("File is too large completely! Please select a file under 10MB.");
      } else {
        toast.error(err.response?.data?.message || "Upload failed. File might be too large or invalid.");
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleUpdateDescription = async () => {
    try {
      // Optimistic update to prevent flicker and immediate text replacement
      setProfileData(prev => ({
        ...prev,
        profile: { ...prev.profile, description }
      }));
      await api.put(`/api/users/${username}/update`, { description });
      toast.success("Description updated!");
      setIsEditingDesc(false);
      fetchUserProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
      fetchUserProfile(); // Revert on failure
    }
  };

  const handleImageDelete = (type) => {
    toast((t) => (
      <div>
        <p className="mb-2">{`Are you sure you want to delete ${type === 'profilePic' ? 'Profile Picture' : 'Banner'}?`}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => { toast.remove(t.id); executeImageDelete(type); }} className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold">Yes</button>
          <button onClick={() => toast.remove(t.id)} className="bg-gray-500 text-white px-3 py-1 rounded text-sm font-bold">Cancel</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const executeImageDelete = async (type) => {
    try {
      const res = await api.delete(`/api/users/${username}/remove-image`, {
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
    const diff = Math.max(0, Date.now() - new Date(profileData.profile.createdAt).getTime()); // Time Sync drift ko -1 jaane se rokne ke liye
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

  const handleDelete = (postId) => {
    toast((t) => (
      <div>
        <p className="mb-2">Are you sure you want to delete this post?</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => { toast.remove(t.id); executeDelete(postId); }} className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold">Yes</button>
          <button onClick={() => toast.remove(t.id)} className="bg-gray-500 text-white px-3 py-1 rounded text-sm font-bold">Cancel</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const executeDelete = async (postId) => {
    try {
      await api.delete(`/api/posts/${postId}`);
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
      toast.success("Post Deleted!");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Post delete karne mein error aaya!");
    }
  };

  const handleFollow = async () => {
    if (!token) return toast.error("Log in to follow users!");
    try {
      const res = await api.put(`/api/users/${profileData.profile._id}/follow`, {});
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
        <p className="font-bold text-red-600 flex items-center gap-1"><ShieldAlert size={16} /> Account Permanently Delete Kar Dein?</p>
        <p className="text-xs text-gray-500">Aapka saara data (posts, comments, profile) hamesha ke liye mit jayega. Yeh action undo nahi ho sakta.</p>
        <div className="flex gap-2 justify-end">
          <button 
            onClick={() => { toast.remove(t.id); executeAccountDeletion(); }} 
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-full text-xs font-bold transition-colors"
          >
            Yes, Delete Permanently
          </button>
          <button 
            onClick={() => toast.remove(t.id)} 
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
      const res = await api.delete(`/api/users/${profileData.profile._id}/delete`);
      
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

  const openFollowersModal = (type) => {
    const list = type === 'followers' ? profileData.profile.followers : profileData.profile.following;
    setFollowersModal({ isOpen: true, type, list: list || [] });
  };

  const handleSave = async (postId) => {
    if (!token) return toast.error("Log in to save posts!");
    try {
      const res = await api.put(`/api/posts/${postId}/save`, {});
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
      const res = await api.put(`/api/posts/${postId}/hide`, {});
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
              onClick={() => { toast.remove(t.id); submitReport(postId, reason); }}
              className="text-left px-3 py-2 text-xs font-bold rounded hover:bg-gray-100 dark:hover:bg-[#272729] capitalize transition-colors"
            >
              {reason.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button onClick={() => toast.remove(t.id)} className="text-xs text-gray-400 hover:text-gray-600 mt-1">Cancel</button>
      </div>
    ), { id: `report-post-${postId}`, duration: Infinity, position: 'top-center', style: { minWidth: '280px' } });
  };

  const submitReport = async (postId, reason) => {
    try {
      await api.post(`/api/reports`, 
        { targetType: 'post', targetId: postId, reason }
      );
      toast.success('Report submitted! Our team will review it.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report.');
    }
  };

  const handleUserReport = () => {
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <p className="font-bold text-red-600">🚩 Report User</p>
        <p className="text-xs text-gray-500">Select a reason for reporting u/{profileData.profile.username}:</p>
        <div className="flex flex-col gap-1">
          {['spam', 'abuse', 'harassment', 'hate_speech', 'misinformation'].map(reason => (
            <button
              key={reason}
              onClick={() => { toast.remove(t.id); submitUserReport(reason); }}
              className="text-left px-3 py-2 text-xs font-bold rounded hover:bg-gray-100 dark:hover:bg-[#272729] capitalize transition-colors"
            >
              {reason.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button onClick={() => toast.remove(t.id)} className="text-xs text-gray-400 hover:text-gray-600 mt-1">Cancel</button>
      </div>
    ), { id: `report-user-${profileData.profile._id}`, duration: Infinity, position: 'top-center', style: { minWidth: '280px' } });
  };

  const submitUserReport = async (reason) => {
    try {
      await api.post(`/api/reports`, 
        { targetType: 'user', targetId: profileData.profile._id, reason }
      );
      toast.success('User reported! Our team will review it.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report.');
    }
  };

  return (
    <div className="dark:bg-black min-h-screen text-gray-900 dark:text-white transition-colors">
      <Helmet>
        <title>u/{profileData.profile.username} | Vartalap</title>
        <meta name="description" content={profileData.profile.description ? (profileData.profile.description.length > 150 ? profileData.profile.description.substring(0, 150) + '...' : profileData.profile.description) : `Check out u/${profileData.profile.username}'s profile, posts, and communities on Vartalap.`} />
        <meta property="og:title" content={`u/${profileData.profile.username} | Vartalap`} />
        <meta property="og:description" content={profileData.profile.description ? (profileData.profile.description.length > 150 ? profileData.profile.description.substring(0, 150) + '...' : profileData.profile.description) : `Check out u/${profileData.profile.username}'s profile, posts, and communities on Vartalap.`} />
      </Helmet>
      
      {/* FOLLOWERS/FOLLOWING MODAL */}
      {followersModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 z-110 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm" onClick={(e) => { if(e.target === e.currentTarget) setFollowersModal({ isOpen: false, type: '', list: [] }); }}>
            <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-[#343536] bg-gray-50 dark:bg-[#272729]/50 shrink-0">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white capitalize">
                        {followersModal.type}
                    </h3>
                    <button onClick={() => setFollowersModal({ isOpen: false, type: '', list: [] })} className="text-gray-500 hover:text-red-500 transition-colors">
                        ✕
                    </button>
                </div>
                <div className="p-2 overflow-y-auto">
                    {followersModal.list.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">No users to display.</div>
                    ) : (
                        followersModal.list.map(user => (
                            <Link 
                                key={user._id} 
                                to={`/u/${user.username}`} 
                                onClick={() => setFollowersModal({ isOpen: false, type: '', list: [] })}
                                className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-lg transition-colors"
                            >
                                <div className="w-10 h-10 bg-linear-to-tr from-orange-500 to-yellow-400 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden shrink-0 relative">
                                    {user.username.charAt(0).toUpperCase()}
                                    {getImageUrl(user.profilePic) && (
                                        <img src={getImageUrl(user.profilePic)} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                    )}
                                </div>
                                <span className="font-bold text-gray-900 dark:text-white">u/{user.username}</span>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}
      
      {/* MODERN UPLOAD MODAL */}
      {uploadModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 z-110 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-[#343536] bg-gray-50 dark:bg-[#272729]/50">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                Update {uploadModal.type === 'profilePic' ? 'Profile Picture' : 'Banner'}
              </h3>
              <button 
                onClick={closeUploadModal}
                disabled={isUploadingImage}
                className="text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                ✕
              </button>
            </div>
            <div className="p-6 flex flex-col items-center">
              {uploadModal.type === 'profilePic' ? (
                <div className="w-40 h-40 rounded-full border-4 border-gray-200 dark:border-[#343536] overflow-hidden shadow-xl mb-6 relative bg-gray-100 dark:bg-[#272729]">
                  <img src={uploadModal.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full h-32 rounded-xl border-2 border-gray-200 dark:border-[#343536] overflow-hidden shadow-md mb-6 bg-gray-100 dark:bg-[#272729]">
                  <img src={uploadModal.previewUrl} alt="Preview" className="w-full h-full object-cover object-center" />
                </div>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                Looking good! Do you want to save this new {uploadModal.type === 'profilePic' ? 'profile picture' : 'banner'}?
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={closeUploadModal}
                  disabled={isUploadingImage}
                  className="flex-1 px-4 py-2.5 rounded-full font-bold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-[#343536] hover:bg-gray-50 dark:hover:bg-[#272729] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmImageUpload}
                  disabled={isUploadingImage}
                  className="flex-1 px-4 py-2.5 rounded-full font-bold text-white bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isUploadingImage ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Save Image'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. TOP HEADER SECTION */}
      <div className="bg-green-50 dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-md shadow-md transition-colors relative">
        {/* Banner */}
        <div 
          className="h-40 md:h-64 bg-gray-100 dark:bg-[#272729] relative group overflow-hidden transition-colors border-b border-gray-200 dark:border-[#343536] rounded-t-md"
        >
          {profileData.profile.bannerPic ? (
            <img 
              src={getOptimizedUrl(getImageUrl(profileData.profile.bannerPic), IMAGE_PRESETS.POST)} 
              alt="Banner" 
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover object-center"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full bg-linear-to-r from-gray-200 to-gray-300 dark:from-[#1a1a1b] dark:to-[#272729]"></div>
          )}
          
          {isOwner && (
            <div className="absolute bottom-3 right-3 flex gap-2 md:opacity-0 group-hover:opacity-100 transition-all duration-300 z-30">
              <label 
                className="w-8 h-8 md:w-10 md:h-10 bg-black/50 hover:bg-black/80 backdrop-blur-md text-white rounded-full cursor-pointer shadow-lg border border-white/20 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 relative"
                title="Edit Banner"
              >
                <input 
                  type="file" 
                  className="hidden" 
                  accept={(profileData.profile.canUseGifBanner || profileData.profile.isAdmin) ? "image/jpeg, image/png, image/webp, image/gif" : "image/jpeg, image/png, image/webp"}
                  onChange={(e) => handleImageUpload(e, 'bannerPic')} 
                />
                <Camera size={18} strokeWidth={2.5} className="w-4 h-4 md:w-auto md:h-auto" />
                {(profileData.profile.canUseGifBanner || profileData.profile.isAdmin) && (
                   <span className="absolute -top-1 -right-1 flex h-3 w-3">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                   </span>
                )}
              </label>
              {profileData.profile.bannerPic && (
                <button 
                  onClick={() => handleImageDelete('bannerPic')}
                  className="w-8 h-8 md:w-10 md:h-10 bg-red-600/70 hover:bg-red-600 backdrop-blur-md text-white rounded-full shadow-lg border border-white/20 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  title="Remove Banner"
                >
                  <Trash2 size={18} strokeWidth={2.5} className="w-4 h-4 md:w-auto md:h-auto" />
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Profile Info Row */}
        <div className="px-4 md:px-6 pb-2 flex flex-col relative">
          {/* Overlapping Avatar AND Info row Wrapper */}
          <div className="mt-4 flex flex-col items-start gap-4 w-full">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start w-full md:w-auto md:flex-1 min-w-0">
              {/* Overlapping Avatar */}
              <div className="-mt-12 md:-mt-16 w-24 h-24 md:w-32 md:h-32 relative shrink-0 z-20">
                <div className="w-full h-full bg-linear-to-tr from-orange-500 to-yellow-400 rounded-full border-4 border-white dark:border-[#1a1a1b] flex items-center justify-center text-4xl font-bold text-white shadow-xl group overflow-hidden relative transition-colors">
                  {profileData.profile.username.charAt(0).toUpperCase()}
                  {profileData.profile.profilePic && (
                    <img 
                      src={getOptimizedUrl(getImageUrl(profileData.profile.profilePic), IMAGE_PRESETS.AVATAR)} 
                      alt="" 
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover" 
                      onError={(e) => { e.target.style.display = 'none'; }} 
                    />
                  )}
                  
                  {isOwner && (
                    <div className="absolute inset-0 bg-black/20 md:bg-black/40 flex items-center justify-center cursor-pointer md:opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                       {/* Overlay indicator (optional, kept subtle) */}
                    </div>
                  )}
                </div>
                
                {/* Pencil Edit Icon Bagal Me */}
                {isOwner && (
                  <div className="absolute -bottom-1 -right-1 z-30" ref={profileMenuRef}>
                    <button 
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="w-8 h-8 md:w-10 md:h-10 bg-white dark:bg-[#1a1a1b] text-gray-700 dark:text-gray-200 rounded-full shadow-xl border border-gray-200 dark:border-[#343536] hover:bg-gray-50 dark:hover:bg-[#272729] flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 btn-press"
                      title="Edit Profile Picture"
                    >
                      <Pencil size={16} strokeWidth={2.5} className="md:w-5 md:h-5" />
                    </button>

                    {isProfileMenuOpen && (
                      <div className="absolute left-0 md:left-auto md:-right-20 top-full mt-2 w-48 bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-xl shadow-2xl overflow-hidden animate-scale-in z-50">
                        <label className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-[#272729] cursor-pointer transition-colors group">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                            <Camera size={16} strokeWidth={2.5} />
                          </div>
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Change Photo</span>
                          <input 
                            type="file" 
                            accept="image/jpeg, image/png, image/webp" 
                            className="hidden" 
                            onChange={(e) => { handleImageUpload(e, 'profilePic'); setIsProfileMenuOpen(false); }} 
                          />
                        </label>
                        
                        {profileData.profile.profilePic && (
                          <button 
                            onClick={() => { handleImageDelete('profilePic'); setIsProfileMenuOpen(false); }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group border-t border-gray-100 dark:border-[#343536]"
                          >
                            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                              <Trash2 size={16} strokeWidth={2.5} />
                            </div>
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">Remove Photo</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <OnlineIndicator userId={profileData.profile._id} size="w-6 h-6 md:w-8 md:h-8" border="border-[3px] md:border-4 border-white dark:border-[#1a1a1b]" />
              </div>
              
              <div className="flex flex-col items-start justify-between w-full md:w-auto gap-4 md:mt-4">
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight break-all">u/{profileData.profile.username}</h1>
                    {profileData.profile.hasVartalapBadge && (
                      <div className="flex items-center gap-1 bg-linear-to-r from-blue-500 to-purple-600 text-white px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] border border-blue-400/50" title="Official Vartalap Badge">
                        <Award size={16} strokeWidth={2.5} />
                        <span className="text-[10px] font-extrabold tracking-wider uppercase">Vartalap Badge</span>
                      </div>
                    )}
                    {profileData.profile.isBetaTester && (
                      <div className="flex items-center gap-1 bg-linear-to-r from-teal-400 to-emerald-500 text-white px-2 py-0.5 rounded-full shadow-sm border border-teal-300/50" title="Beta Tester">
                        <Beaker size={16} strokeWidth={2.5} />
                        <span className="text-[10px] font-extrabold tracking-wider uppercase">Beta Tester</span>
                      </div>
                    )}
                    {(profileData.totalAnubhav || 0) >= 100 && (
                      <div className="flex items-center gap-1 bg-linear-to-r from-orange-400 to-yellow-500 text-white px-2 py-0.5 rounded-full shadow-sm" title="Vartalap Centurion (100+ Anubhav)">
                        <BadgeCheck size={16} strokeWidth={2.5} />
                        <span className="text-[10px] font-extrabold tracking-wider uppercase">Centurion</span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm break-all">u/{profileData.profile.username}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                    <span onClick={() => openFollowersModal('followers')} className="cursor-pointer hover:underline hover:text-gray-900 dark:hover:text-white">{profileData.profile.followers?.length || 0} Followers</span>
                     • 
                    <span onClick={() => openFollowersModal('following')} className="cursor-pointer hover:underline hover:text-gray-900 dark:hover:text-white"> {profileData.profile.following?.length || 0} Following</span>
                    <span className="md:hidden"> • {accountAgeText}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full md:w-auto md:absolute md:right-6 md:top-24">
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
                  onClick={() => toast("Chat feature is coming soon!", { icon: <MessageCircle size={16}/> })}
                  className="flex-1 md:flex-none justify-center bg-transparent border border-gray-300 dark:border-[#343536] text-gray-900 dark:text-white font-bold px-6 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-sm"
                >
                  Chat
                </button>
              )}
              {!isOwner && (
                <button 
                  onClick={handleUserReport}
                  className="flex-1 md:flex-none justify-center bg-transparent border border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400 font-bold px-6 py-2 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 transition-all text-sm"
                >
                  Report
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
      <div className="flex flex-col-reverse md:flex-row gap-6 items-start mt-6">
        
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
              const curUserId = currentUser?.id || currentUser?._id;
              const hasUpvoted = currentUser && post.upvotes?.some(id => (typeof id === 'object' ? id._id : id) === curUserId);
              const hasDownvoted = currentUser && post.downvotes?.some(id => (typeof id === 'object' ? id._id : id) === curUserId);

              return (
                <div key={post._id} className={`bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-4 rounded-md shadow-sm hover:border-gray-400 dark:hover:border-gray-500 transition-all cursor-pointer overflow-visible relative ${String(activeMenuId) === String(post._id) ? 'z-100' : 'z-10 hover:z-60'}`}>
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    Posted in <span className="text-gray-900 dark:text-white font-bold hover:underline">c/{post.community?.name || 'general'}</span> • by 
                    <Link to={`/u/${post.author?.username}`} className="hover:underline hover:text-gray-900 dark:hover:text-white flex items-center gap-1">
                      u/{post.author?.username || 'user'}
                      {post.authorHasVartalapBadge && (
                        <Award size={12} className="text-blue-500 shrink-0" />
                      )}
                    </Link>
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
                  <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4 prose prose-sm dark:prose-invert max-w-none line-clamp-3 wrap-break-word">
                    <ReactMarkdown rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeOptions]]}>
                      {post.content || ''}
                    </ReactMarkdown>
                  </div>
                  
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
                          <ArrowUp size={18} strokeWidth={hasUpvoted ? 3 : 2} />
                          <span className="text-xs font-bold">{post.upvotes?.length || 0}</span>
                      </div>
                      
                      <div className="w-px h-4 bg-gray-300 dark:bg-[#343536]"></div>

                      <div 
                        onClick={() => handleDownvote(post._id)}
                        className={`flex items-center gap-1 px-3 py-2 cursor-pointer transition-all ${
                          hasDownvoted ? 'text-blue-500 bg-blue-500/10' : 'hover:bg-gray-200 dark:hover:bg-[#343536]'
                        }`}
                      >
                          <ArrowDown size={18} strokeWidth={hasDownvoted ? 3 : 2} />
                          <span className="text-xs font-bold">{post.downvotes?.length || 0}</span>
                      </div>
                    </div>
                    <Link to={`/post/${post._id}`} className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#272729] px-3 py-1.5 rounded transition-all">
                        <MessageCircle size={16} strokeWidth={2} />
                        <span className="pt-0.5">{post.comments?.length || 0} Comments</span>
                    </Link>

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT COLUMN: PROFILE SIDEBAR CARD */}
        <div className="w-full md:w-80 h-fit flex flex-col gap-4 md:sticky md:top-18">
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
                  <div className="relative group pr-8">
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                      {profileData.profile.description || "No description provided."}
                    </p>
                    {isOwner && (
                      <button 
                        onClick={() => setIsEditingDesc(true)}
                        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 dark:bg-[#272729] p-1.5 rounded-full text-gray-500 hover:text-orange-500"
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-200 dark:border-[#343536] transition-colors">
                <div onClick={() => openFollowersModal('followers')} className="flex flex-col p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#272729] cursor-pointer transition-colors">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{profileData.profile.followers?.length || 0}</span>
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-tighter">Followers</span>
                </div>
                <div onClick={() => openFollowersModal('following')} className="flex flex-col p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#272729] cursor-pointer transition-colors">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{profileData.profile.following?.length || 0}</span>
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-tighter">Following</span>
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
                 <Trash2 size={16} /> Delete Account Permanently
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