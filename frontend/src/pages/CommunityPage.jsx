import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import CommentThread from '../components/CommentThread';
import SkeletonLoader from '../components/SkeletonLoader';
import PostMenu from '../components/PostMenu';
import CommunityMenu from '../components/CommunityMenu';
import EventsTab from '../components/EventsTab';
import VoicePartyTab from '../components/VoicePartyTab';
import CreatePost from '../components/CreatePost';
import { SocketContext } from '../context/SocketContext';
import PollView from '../components/PollView';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Share, MessageCircle, ArrowUp, ArrowDown, Flame, Sparkles, Shield, UserX, Crown, ScrollText, Trash2, Edit, AlertTriangle, LogOut, CheckCircle, Calendar, Mic, BarChart2, ExternalLink, Users, Ban, Award } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

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

const CommunityPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');
  const [sortBy, setSortBy] = useState('hot');
  const [activeMainTab, setActiveMainTab] = useState('posts'); // posts, events, voice

  const observer = useRef();
  const lastPostElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);
  
  // Edit Community State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    topic: '',
    minAnubhav: 0,
    minAgeDays: 0,
    rules: []
  });
  const [profileFile, setProfileFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Mod Management State
  const [newModId, setNewModId] = useState('');

  // FIX: Wrapped in useCallback to safely use inside useEffect
  const fetchCommunityInfo = useCallback(async () => {
    try {
      const res = await api.get(`/api/communities/${id}`);
      setCommunity(res.data);
    } catch (err) {
      console.error("Error fetching community", err);
      if (err.response && err.response.status === 404) {
        toast.error(err.response.data?.message || "This community is currently unavailable.");
        navigate('/');
      }
    }
  }, [id, navigate]);

  // FIX: Wrapped in useCallback and added default pageNum = 1
  const fetchCommunityPosts = useCallback(async (pageNum = 1, reset = false) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/posts/community/${id}?sort=${sortBy}&page=${pageNum}&limit=5`);
      setPosts(prev => reset ? res.data.posts : [...prev, ...res.data.posts]);
      setHasMore(res.data.hasMore);
    } catch (err) {
      console.error("Error fetching community posts", err);
    } finally {
      setLoading(false);
    }
  }, [id, sortBy]);

  // FIX: Updated dependency array with the memoized functions
  useEffect(() => {
    fetchCommunityInfo();
    // Reset posts on id or sort change
    setPage(1);
    fetchCommunityPosts(1, true);
  }, [fetchCommunityInfo, fetchCommunityPosts]);

  // FIX: Added fetchCommunityPosts to dependency array
  useEffect(() => {
    if (page > 1) {
      fetchCommunityPosts(page);
    }
  }, [page, fetchCommunityPosts]);

  // VOTING LOGIC for the feed
  const handleUpvote = async (postId) => {
    if (!token) {
      toast.error("Vote karne ke liye pehle Log In karein!");
      return;
    }
    // Toggle-off supported by backend logic
    const post = posts.find(p => p._id === postId);
    if (!post) return;

    try {
      const res = await api.put(`/api/posts/${postId}/upvote`, {});
      // Merge only the votes to preserve populated author/community
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, upvotes: res.data.post.upvotes, downvotes: res.data.post.downvotes } : p));
    } catch (err) {
      console.error("Voting error:", err);
    }
  };

  const handleDownvote = async (postId) => {
    if (!token) {
      toast.error("Vote karne ke liye pehle Log In karein!");
      return;
    }
    // Toggle-off supported by backend logic
    const post = posts.find(p => p._id === postId);
    if (!post) return;

    try {
      const res = await api.put(`/api/posts/${postId}/downvote`, {});
      // Merge only the votes to preserve populated author/community
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, upvotes: res.data.post.upvotes, downvotes: res.data.post.downvotes } : p));
    } catch (err) {
      console.error("Voting error:", err);
    }
  };

  const handleShare = (postId) => {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied to clipboard!");
    }).catch(err => {
      console.error("Share error:", err);
    });
  };

  const handleJoin = async () => {
    if (!token) return toast.error("Please log in to join!");
    try {
      const res = await api.post(`/api/communities/${community._id}/join`, {});
      toast.success(res.data.message || "Successfully joined!");
      fetchCommunityInfo(); // Refresh to update members
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || "Error joining community";
      toast.error(errorMessage);
    }
  };

  const handleLeave = async () => {
    if (!token) return toast.error("Please log in!");

    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-white flex items-center gap-2"><LogOut size={16} /> Are you sure you want to leave?</p>
        <div className="flex gap-2 justify-end">
          <button 
            onClick={() => { toast.dismiss(t.id); executeLeave(); }}
            className="bg-red-500 text-white px-3 py-1 rounded text-xs font-bold"
          >
            Yes, Leave
          </button>
          <button 
            onClick={() => toast.dismiss(t.id)}
            className="bg-gray-500 text-white px-3 py-1 rounded text-xs font-bold"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  };

  const executeLeave = async () => {
    try {
      await api.post(`/api/communities/${community._id}/leave`, {});
      toast.success("Left the community!");
      fetchCommunityInfo(); // Refresh to update members
    } catch (err) {
      toast.error(err.response?.data?.message || "Error leaving community");
    }
  };

  // Moderator Management Functions
  const handleAddMod = async () => {
    if (!newModId.trim()) return toast.error("Please enter a User ID");
    try {
      await api.post(`/api/communities/${community._id}/add-mod`, 
        { userId: newModId }
      );
      toast.success("Moderator added successfully!");
      setNewModId('');
      fetchCommunityInfo();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error adding moderator");
    }
  };

  const handleRemoveMod = async (modId) => {
    try {
      await api.post(`/api/communities/${community._id}/remove-mod`, 
        { userId: modId }
      );
      toast.success("Moderator removed!");
      fetchCommunityInfo();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error removing moderator");
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await api.put(`/api/communities/${community._id}/members/${userId}/remove`);
      toast.success("User removed from community.");
      fetchCommunityInfo();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error removing member");
    }
  };

  const handleBanMember = async (userId) => {
    toast((t) => (
      <div>
        <p className="mb-2 flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100"><Ban size={18} className="text-red-500" /> Really PERMANENTLY BAN this user from the community?</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => { toast.dismiss(t.id); executeBanMember(userId); }} className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold">Ban User</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-gray-500 text-white px-3 py-1 rounded text-sm font-bold">Cancel</button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  };

  const executeBanMember = async (userId) => {
    try {
      await api.put(`/api/communities/${community._id}/members/${userId}/ban`);
      toast.success("User permanently banned from community.");
      fetchCommunityInfo();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Error banning member");
    }
  };

  const handleEditClick = () => {
    setEditForm({
      name: community.name,
      description: community.description,
      topic: community.topic || 'General',
      minAnubhav: community.minAnubhav || 0,
      minAgeDays: community.minAgeDays || 0,
      rules: community.rules || []
    });
    setProfileFile(null);
    setBannerFile(null);
    setIsEditing(true);
  };

  const handleUpdateCommunity = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('description', editForm.description);
      formData.append('topic', editForm.topic);
      formData.append('minAnubhav', editForm.minAnubhav);
      formData.append('minAgeDays', editForm.minAgeDays);
      if (profileFile) formData.append('profilePic', profileFile);
      if (bannerFile) formData.append('bannerPic', bannerFile);
      formData.append('rules', JSON.stringify(editForm.rules));

      await api.put(`/api/communities/${community._id}/update`, formData);
      toast.success('Community updated successfully! 🎉');
      setIsEditing(false);
      fetchCommunityInfo();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error updating community");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCommunity = () => {
    toast((t) => (
      <div>
        <p className="mb-2 flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100"><AlertTriangle size={18} className="text-red-500" /> Are you extremely sure you want to PERMANENTLY delete v/{community.name}?</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => { toast.dismiss(t.id); executeDeleteCommunity(); }} className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold">Delete</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-gray-500 text-white px-3 py-1 rounded text-sm font-bold">Cancel</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const executeDeleteCommunity = async () => {
    try {
      await api.delete(`/api/communities/${community._id}`);
      toast.success("Community deleted forever.");
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || "Error deleting community");
    }
  };

  const handleReportCommunity = () => {
    if (!token) return toast.error("Log in to report communities!");
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <p className="font-bold text-orange-600">🚩 Report This Community</p>
        <p className="text-xs text-gray-500">Select a reason:</p>
        <div className="flex flex-col gap-1">
          {['spam', 'abuse', 'harassment', 'hate_speech', 'misinformation', 'illegal_content'].map(reason => (
            <button
              key={reason}
              onClick={() => { toast.dismiss(t.id); submitCommunityReport(reason); }}
              className="text-left px-3 py-1.5 text-xs font-bold rounded hover:bg-gray-100 dark:hover:bg-[#272729] capitalize transition-colors"
            >
              {reason.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button onClick={() => toast.dismiss(t.id)} className="text-xs text-gray-400 hover:text-gray-600 mt-1 text-center">Cancel</button>
      </div>
    ), { duration: Infinity, position: 'top-center', style: { minWidth: '280px' } });
  };

  const submitCommunityReport = async (reason) => {
    try {
      await api.post(`/api/reports`, 
        { targetType: 'community', targetId: community._id, reason }
      );
      toast.success('Community report submitted!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report.');
    }
  };

  const handleSavePost = async (postId) => {
    if (!token) return toast.error("Log in to save posts!");
    try {
      const res = await api.put(`/api/posts/${postId}/save`, {});
      setPosts(prev => prev.map(p => 
        p._id === postId 
          ? { ...p, savedBy: res.data.isSaved ? [...(p.savedBy || []), currentUser.id] : (p.savedBy || []).filter(id => id !== currentUser.id) }
          : p
      ));
      toast.success(res.data.isSaved ? "Saved!" : "Removed from Saved!");
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleHidePost = async (postId) => {
    if (!token) return toast.error("Log in to hide posts!");
    try {
      const res = await api.put(`/api/posts/${postId}/hide`, {});
      if (res.data.isHidden) {
        setPosts(prev => prev.filter(p => p._id !== postId));
        toast.success("Post Hidden!");
      }
    } catch (err) {
      console.error("Hide error:", err);
    }
  };

  const handleReportPost = (postId) => {
    if (!token) return toast.error("Log in to report posts!");
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <p className="font-bold text-orange-600">🚩 Report This Post</p>
        <p className="text-xs text-gray-500">Select a reason:</p>
        <div className="flex flex-col gap-1">
          {['spam', 'abuse', 'harassment', 'hate_speech', 'misinformation'].map(reason => (
            <button
              key={reason}
              onClick={() => { toast.dismiss(t.id); submitPostReport(postId, reason); }}
              className="text-left px-3 py-2 text-xs font-bold rounded hover:bg-gray-100 dark:hover:bg-[#272729] capitalize transition-colors"
            >
              {reason.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button onClick={() => toast.dismiss(t.id)} className="text-xs text-gray-400 hover:text-gray-600 mt-1 text-center">Cancel</button>
      </div>
    ), { duration: Infinity, position: 'top-center', style: { minWidth: '280px' } });
  };

  const submitPostReport = async (postId, reason) => {
    try {
      await api.post(`/api/reports`, 
        { targetType: 'post', targetId: postId, reason }
      );
      toast.success('Report submitted! Our team will review it.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report.');
    }
  };

  const handleDeletePost = (postId) => {
    toast((t) => (
      <div>
        <p className="mb-2 flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100"><AlertTriangle size={18} className="text-red-500" /> Are you sure you want to delete this post?</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => { toast.dismiss(t.id); executeDeletePost(postId); }} className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold">Yes</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-gray-500 text-white px-3 py-1 rounded text-sm font-bold">Cancel</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const executeDeletePost = async (postId) => {
    try {
      await api.delete(`/api/posts/${postId}`);
      setPosts(prev => prev.filter(p => p._id !== postId));
      toast.success("Post Deleted!");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete post.");
    }
  };

  const handlePollVoteSuccess = (postId, updatedPost) => {
    setPosts(prev => prev.map(p => p._id === postId ? updatedPost : p));
  };

  if (!community) return <div className="mt-10"><SkeletonLoader /></div>;

  const isMember = currentUser && community.members?.some(m => 
    (typeof m === 'object' ? m._id === currentUser.id : m === currentUser.id)
  );

  const isCreator = currentUser && (
    (typeof community.creator === 'object' ? community.creator._id === currentUser.id : community.creator === currentUser.id) ||
    (community.creator?.username && community.creator.username === currentUser.username)
  );

  const isMod = currentUser && community.moderators?.some(m => 
    (typeof m === 'object' ? m._id === currentUser.id : m === currentUser.id)
  );

  const canEdit = isCreator || isMod;

  return (
    <div className="mt-6">
      <Helmet>
        <title>v/{community.name} | Vartalap</title>
        <meta name="description" content={community.description ? (community.description.length > 150 ? community.description.substring(0, 150) + '...' : community.description) : `Join the v/${community.name} community on Vartalap. A place for ${community.topic || 'discussions'}.`} />
        <meta property="og:title" content={`v/${community.name} | Vartalap`} />
        <meta property="og:description" content={community.description ? (community.description.length > 150 ? community.description.substring(0, 150) + '...' : community.description) : `Join the v/${community.name} community on Vartalap. A place for ${community.topic || 'discussions'}.`} />
      </Helmet>
      
      {/* Community BANNER & DETAILS */}
      <div className="bg-gray-50 dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-md shadow-sm mb-6 relative transition-colors">
        {/* Banner Image */}
        {community.bannerPic ? (
          <div className="h-32 md:h-48 w-full border-b border-gray-200 dark:border-[#343536]">
            <img 
              src={community.bannerPic.startsWith('http') ? community.bannerPic : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${community.bannerPic}`} 
              alt="Banner" 
              className="w-full h-full object-cover" 
            />
          </div>
        ) : (
          <div className="h-20 bg-blue-600 border-b border-gray-200 dark:border-[#343536]"></div>
        )}

        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            {/* THIS INNER WRAPPER STACKS TEXT BELOW ICON ON MOBILE */}
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start w-full md:w-auto md:flex-1 min-w-0">
              {/* Profile Icon */}
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-blue-600 border-4 border-white dark:border-[#1a1a1b] -mt-12 md:-mt-16 overflow-hidden shrink-0 flex items-center justify-center text-white text-3xl font-bold relative z-10">
                v/
                {community.profilePic && (
                  <img 
                    src={community.profilePic.startsWith('http') ? community.profilePic : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${community.profilePic}`} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-cover" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0 w-full">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1 break-all">v/{community.name}</h1>
                <p className="text-gray-700 dark:text-gray-300 text-sm mb-2 max-w-2xl break-all">{community.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 font-bold">
                  <span>Topic: <span className="text-gray-900 dark:text-white font-normal">{community.topic || 'General'}</span></span>
                  <span>Created by: <Link to={`/u/${community.creator?.username}`} className="text-blue-500 dark:text-blue-400 hover:underline">u/{community.creator?.username || 'unknown'}</Link></span>
                  <span>{community.members?.length || 1} Members</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full md:w-auto items-start md:items-end mt-2 md:mt-0">
              <div className="flex gap-2 w-full md:w-auto">
                {currentUser && !isCreator && !isMod && (
                  <button 
                    onClick={isMember ? handleLeave : handleJoin}
                    className={`w-full md:w-32 px-4 py-2 rounded-full font-bold text-sm transition-all shadow-md ${
                      isMember 
                        ? 'bg-transparent border border-gray-900 dark:border-white text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10' 
                        : 'bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'
                    }`}
                  >
                    {isMember ? 'Joined' : 'Join'}
                  </button>
                )}
                {canEdit && (
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={handleEditClick}
                      className="hidden md:block px-6 py-2 rounded-full font-bold text-sm transition-all shadow-md bg-gray-200 dark:bg-[#272729] text-gray-900 dark:text-white border border-gray-300 dark:border-[#343536] hover:bg-gray-300 dark:hover:bg-[#343536]"
                    >
                      Edit
                    </button>
                    {isCreator && (
                      <button 
                        onClick={handleDeleteCommunity}
                        className="hidden lg:block px-4 py-2 rounded-full font-bold text-sm transition-all shadow-md bg-red-600/10 text-red-500 border border-red-500 hover:bg-red-500 hover:text-white"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
                
                {/* Community Three Dot Menu (Hiding for Creator per request) */}
                {currentUser && community && (
                  (() => {
                    const creatorId = typeof community.creator === 'object' ? community.creator._id : community.creator;
                    const curId = currentUser.id || currentUser._id;
                    return creatorId !== curId;
                  })()
                ) && (
                  <CommunityMenu 
                    onReport={handleReportCommunity}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteCommunity}
                    canEdit={canEdit}
                    isCreator={isCreator}
                    onOpenChange={(isOpen) => setActiveMenuId(isOpen ? 'community' : (prev => prev === 'community' ? null : prev))}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT COMPONENT: Modal + Feed */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          
          {/* Edit Community Modal */}
          {isEditing && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 dark:border-[#343536] flex justify-between items-center sticky top-0 bg-white dark:bg-[#1a1a1b] z-10 transition-colors">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Community Settings</h2>
                  <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">✕</button>
                </div>
                
                <form onSubmit={handleUpdateCommunity} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Community Name</label>
                        <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] rounded-md px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500" required />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Topic / Category</label>
                        <input type="text" value={editForm.topic} onChange={e => setEditForm({...editForm, topic: e.target.value})} className="w-full bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] rounded-md px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500" placeholder="e.g. Technology, Gaming, News" required />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Minimum Anubhav to Join</label>
                        <input type="number" value={editForm.minAnubhav} onChange={e => setEditForm({...editForm, minAnubhav: e.target.value})} className="w-full bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] rounded-md px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Minimum Account Age (Days)</label>
                        <input type="number" value={editForm.minAgeDays} onChange={e => setEditForm({...editForm, minAgeDays: e.target.value})} className="w-full bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] rounded-md px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500" />
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                        <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] rounded-md px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 min-h-25" required />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Community Icon / Profile Pic</label>
                        <input type="file" accept="image/*" onChange={e => {
                          const file = e.target.files[0];
                          if (file && file.size > 5 * 1024 * 1024) {
                            toast.error("Unable to upload, please choose a file less than 5MB");
                            e.target.value = null;
                            return;
                          }
                          setProfileFile(file);
                        }} className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-600/10 file:text-blue-600 dark:file:text-blue-500 hover:file:bg-blue-100 dark:hover:file:bg-blue-600/20 cursor-pointer" />
                        <p className="text-[10px] text-gray-500 mt-1">Leave empty to keep current picture.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Banner Image</label>
                        <input type="file" accept="image/*" onChange={e => {
                          const file = e.target.files[0];
                          if (file && file.size > 5 * 1024 * 1024) {
                            toast.error("Unable to upload, please choose a file less than 5MB");
                            e.target.value = null;
                            return;
                          }
                          setBannerFile(file);
                        }} className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 dark:file:bg-orange-600/10 file:text-orange-600 dark:file:text-orange-500 hover:file:bg-orange-100 dark:hover:file:bg-orange-600/20 cursor-pointer" />
                      </div>
                    </div>
                  </div>

                  {/* Rules Management */}
                  <div className="pt-4 border-t border-gray-200 dark:border-[#343536]">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 italic">Community Rules (Niyam)</label>
                    <div className="space-y-4 text-left">
                      {editForm.rules.map((rule, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-[#272729] p-4 rounded-md border border-gray-200 dark:border-[#343536] relative group">
                          <button 
                            type="button" 
                            onClick={() => {
                              const newRules = editForm.rules.filter((_, i) => i !== index);
                              setEditForm({ ...editForm, rules: newRules });
                            }}
                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-500 transition-colors"
                          >
                            ✕
                          </button>
                          <input 
                            type="text" 
                            placeholder="Rule Title (e.g. No Spam)" 
                            value={rule.title}
                            onChange={(e) => {
                              const newRules = [...editForm.rules];
                              newRules[index].title = e.target.value;
                              setEditForm({ ...editForm, rules: newRules });
                            }}
                            className="w-full bg-transparent border-b border-gray-300 dark:border-[#343536] text-gray-900 dark:text-white font-bold mb-2 outline-none focus:border-orange-500 py-1"
                          />
                          <textarea 
                            placeholder="Short description..." 
                            value={rule.description}
                            onChange={(e) => {
                              const newRules = [...editForm.rules];
                              newRules[index].description = e.target.value;
                              setEditForm({ ...editForm, rules: newRules });
                            }}
                            className="w-full bg-transparent text-xs text-gray-600 dark:text-gray-400 outline-none resize-none h-16"
                          />
                        </div>
                      ))}
                      <button 
                        type="button"
                        onClick={() => setEditForm({ ...editForm, rules: [...editForm.rules, { title: '', description: '' }] })}
                        className="w-full border border-dashed border-gray-300 dark:border-gray-600 rounded-md py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-white transition-all font-bold"
                      >
                        + Add a Rule
                      </button>
                    </div>
                  </div>

                  {/* Moderator Management - Only for Creator */}
                  {isCreator && (
                    <div className="pt-4 border-t border-gray-200 dark:border-[#343536]">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 italic">Moderators (Admins)</label>
                      <div className="flex flex-col gap-4">
                        {/* Add Mod Input */}
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Enter User ID to make them a Mod..." 
                            value={newModId}
                            onChange={(e) => setNewModId(e.target.value)}
                            className="flex-1 bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] rounded-md px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 text-sm"
                          />
                          <button 
                            type="button" 
                            onClick={handleAddMod}
                            className="bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-500 border border-blue-200 dark:border-blue-500 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-md font-bold text-sm transition-colors"
                          >
                            Add Mod
                          </button>
                        </div>

                        {/* Current Mods List */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between bg-gray-50 dark:bg-[#272729] border border-gray-200 dark:border-[#343536] p-3 rounded-md">
                            <div className="flex items-center gap-3">
                              <Crown size={20} className="text-yellow-500" />
                              <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">u/{community.creator?.username || 'Creator'}</p>
                                <p className="text-xs text-orange-600 dark:text-orange-500">Creator & Head Mod</p>
                              </div>
                            </div>
                          </div>

                          {community.moderators && community.moderators.map((mod) => (
                            <div key={mod._id || mod} className="flex items-center justify-between bg-gray-50 dark:bg-[#272729] border border-gray-200 dark:border-[#343536] p-3 rounded-md">
                              <div className="flex items-center gap-3">
                                <Shield size={20} className="text-blue-500" />
                                <div>
                                  <p className="text-sm font-bold text-gray-900 dark:text-white">u/{mod.username || mod}</p>
                                  <p className="text-xs text-blue-600 dark:text-blue-400">Moderator</p>
                                </div>
                              </div>
                              <button 
                                type="button"
                                onClick={() => handleRemoveMod(mod._id || mod)}
                                className="text-gray-500 hover:text-red-600 dark:hover:text-red-500 transition-colors text-sm px-2"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200 dark:border-[#343536] flex justify-end gap-4">
                    <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-full font-bold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSaving} className="bg-orange-600 text-white font-bold px-8 py-2 rounded-full shadow-md hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                  {isSaving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Main Community Tabs */}
          <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-md mb-4 flex divide-x divide-gray-200 dark:divide-[#343536] overflow-hidden overflow-x-auto no-scrollbar">
            {['posts', 'members', 'events', 'voice', ...((isMod || isCreator) ? ['poll'] : [])].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveMainTab(tab)}
                className={`flex-1 py-3 px-4 font-bold text-sm text-center transition-colors flex justify-center items-center gap-2 whitespace-nowrap min-w-max ${
                  activeMainTab === tab 
                    ? 'bg-gray-100 dark:bg-[#272729] text-gray-900 dark:text-white border-b-2 border-orange-500' 
                    : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-[#272729]/50 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'posts' && <ScrollText size={16} />}
                {tab === 'members' && <Users size={16} />}
                {tab === 'events' && <Calendar size={16} />}
                {tab === 'voice' && <Mic size={16} />}
                {tab === 'poll' && <BarChart2 size={16} />}
                <span className="capitalize">{tab} {tab === 'voice' && 'Party'}</span>
              </button>
            ))}
          </div>

          {activeMainTab === 'posts' && (
            <>
              {/* Sorting Tabs */}
              <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-md p-2 mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar relative w-full transition-colors">
                {['hot', 'new', 'top'].map((sortType) => (
                  <button
                    key={sortType}
                    onClick={() => setSortBy(sortType)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-colors whitespace-nowrap ${
                      sortBy === sortType 
                        ? 'bg-gray-200 dark:bg-[#272729] text-gray-900 dark:text-white' 
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#272729] hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {sortType === 'hot' ? <Flame size={16} /> : sortType === 'new' ? <Sparkles size={16} /> : <ArrowUp size={16} />}
                    <span className="capitalize">{sortType}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-4">
            {posts.length === 0 && !loading ? (
              <div className="text-center text-gray-500 mt-10">No posts in this community yet. Be the first to post!</div>
            ) : (
              posts.map((post, index) => {
                const upvotes = post.upvotes?.length || 0;
                const downvotes = post.downvotes?.length || 0;
                const netVotes = upvotes - downvotes;
                const curUserId = currentUser?.id || currentUser?._id;
                const hasUpvoted = currentUser && post.upvotes?.some(id => (typeof id === 'object' ? id._id : id) === curUserId);
                const hasDownvoted = currentUser && post.downvotes?.some(id => (typeof id === 'object' ? id._id : id) === curUserId);
                
                const isLast = (posts.length === index + 1);

                return (
                  <div 
                    key={`${post._id}-${index}`} 
                    ref={isLast ? lastPostElementRef : null}
                    className={`bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-4 rounded-md shadow-sm transition-colors overflow-visible relative ${String(activeMenuId) === String(post._id) ? 'z-[100]' : 'z-10 hover:z-[60]'}`}
                  >
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      Posted by 
                      <Link to={`/u/${post.author?.username}`} className="hover:underline hover:text-gray-900 dark:hover:text-white flex items-center gap-1">
                        u/{post.author?.username || 'user'}
                        {post.authorHasVartalapBadge && (
                          <Award size={12} className="text-blue-500 flex-shrink-0" />
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
                        isMod={isMod || isCreator}
                        onSave={handleSavePost}
                        onHide={handleHidePost}
                        onReport={handleReportPost}
                        onDelete={handleDeletePost}
                        onOpenChange={(isOpen) => setActiveMenuId(isOpen ? post._id : (prev => prev === post._id ? null : prev))}
                      />
                    </div>

                    {/* Link Post Rendering */}
                    {post.postType === 'link' && post.link && (
                      <div className="bg-gray-50 dark:bg-[#272729] border border-gray-200 dark:border-[#343536] p-3 rounded-md mb-3 flex items-center justify-between group hover:border-gray-400 dark:hover:border-gray-500 transition-all">
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                          <span className="text-blue-600 dark:text-blue-400 text-sm font-bold truncate">{post.link}</span>
                          <span className="text-gray-500 tracking-wide text-[11px]">External Link <ExternalLink size={10} className="inline mb-0.5" /></span>
                        </div>
                        <a 
                          href={post.link.startsWith('http') ? post.link : `https://${post.link}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-gray-200 dark:bg-[#343536] text-gray-900 dark:text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all flex items-center gap-1.5 flex-shrink-0"
                        >
                          Open
                        </a>
                      </div>
                    )}

                    {/* Poll Post Rendering */}
                    {post.postType === 'poll' && (
                      <PollView 
                        post={post} 
                        currentUser={currentUser} 
                        onVoteSuccess={handlePollVoteSuccess} 
                      />
                    )}

                    {post.media && post.media.length > 0 && (
                      <div className={`grid gap-2 mb-4 ${post.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {post.media.map((item, idx) => (
                          <div key={idx} className="relative rounded-md overflow-hidden border border-[#343536] bg-black/20 flex items-center justify-center">
                            {item.mimetype?.startsWith('video/') ? (
                              <video 
                                src={item.url.startsWith('http') ? item.url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${item.url}`} 
                                controls 
                                className="max-h-96 w-full object-cover"
                              />
                            ) : (
                              <img 
                                src={item.url.startsWith('http') ? item.url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${item.url}`} 
                                alt={`Attachment ${idx}`} 
                                className="max-h-96 w-full object-contain"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4 prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeOptions]]}>
                        {post.content || ''}
                      </ReactMarkdown>
                    </div>
                    
                    {/* Post Actions */}
                    <div className="flex items-center gap-2 sm:gap-4 text-gray-500 dark:text-gray-400 font-bold text-sm">
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
                        
                        <div className="w-[1px] h-4 bg-gray-300 dark:bg-[#343536]"></div>

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

                      {/* Comments Link */}
                      <Link to={`/post/${post._id}`} className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#272729] px-2 py-1.5 rounded cursor-pointer transition-all">
                         <MessageCircle size={14} strokeWidth={2} />
                         <span className="text-[11px] sm:text-xs pt-0.5">{post.comments?.length || 0} <span className="hidden sm:inline">Comments</span></span>
                      </Link>

                      {/* Share Button */}
                      <div 
                        onClick={() => handleShare(post._id)}
                        className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#272729] px-2 py-1.5 rounded cursor-pointer transition-all"
                      >
                         <Share size={14} strokeWidth={2} />
                         <span className="text-[11px] sm:text-xs pt-0.5">Share</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {loading && (
              <>
                <SkeletonLoader />
                <SkeletonLoader />
              </>
            )}
            {!hasMore && posts.length > 0 && (
              <div className="text-center text-gray-500 py-4 font-bold text-sm">
                <div className="flex flex-col items-center justify-center gap-1">
                  <CheckCircle size={24} className="text-gray-400 mb-1" />
                  <p>You've reached the end of the feed!</p>
                </div>
              </div>
            )}
          </div>
          </>
          )}

          {activeMainTab === 'events' && (
            <EventsTab 
              communityId={community._id} 
              currentUser={currentUser} 
              isMod={isMod} 
              isCreator={isCreator} 
            />
          )}

          {activeMainTab === 'voice' && (
            <VoicePartyTab 
              communityId={community._id} 
              currentUser={currentUser} 
              isMod={isMod} 
              isCreator={isCreator} 
            />
          )}

          {activeMainTab === 'poll' && (isMod || isCreator) && (
            <div className="mb-4">
              <CreatePost preselectedCommunityId={community._id} initialType="poll" />
            </div>
          )}

          {activeMainTab === 'members' && (
            <div className="flex flex-col gap-3">
              {community.members && community.members.length > 0 ? (
                community.members.map(member => (
                  <div key={member._id} className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-4 rounded-xl flex items-center justify-between gap-4 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <img 
                        src={member.profilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.username}`} 
                        alt={member.username} 
                        className="w-10 h-10 rounded-full border border-gray-200 dark:border-[#343536] bg-gray-50 dark:bg-[#272729]" 
                      />
                      <div className="flex flex-col min-w-0">
                        <Link to={`/u/${member.username}`} className="font-bold text-gray-900 dark:text-white truncate hover:underline flex items-center gap-1.5">
                          u/{member.username}
                          {community.creator === member._id && <Crown size={12} className="text-orange-500 shrink-0" title="Creator" />}
                          {community.moderators?.includes(member._id) && <Shield size={12} className="text-blue-500 shrink-0" title="Moderator" />}
                        </Link>
                        <span className="text-xs text-gray-500 font-mono">{member.anubhav} XP</span>
                      </div>
                    </div>
                    
                    {(isMod || isCreator) && member._id !== community.creator && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={() => handleRemoveMember(member._id)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#343536] dark:hover:bg-[#4a4b4c] text-gray-700 dark:text-gray-300 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5"
                        >
                          <UserX size={14} /> Remove
                        </button>
                        <button 
                          onClick={() => handleBanMember(member._id)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5"
                        >
                          <Ban size={14} /> Ban
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-10">No members yet.</div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT SIDEBAR: Community Info & Rules */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
          <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-md overflow-hidden shadow-sm transition-colors">
            <div className="bg-gray-100 dark:bg-[#343536] p-3">
              <h3 className="text-xs font-bold text-gray-600 dark:text-white uppercase tracking-wider">v/{community.name} Rules</h3>
            </div>
            <div className="p-1">
              {community.rules && community.rules.length > 0 ? (
                community.rules.map((rule, idx) => (
                  <div key={idx} className="border-b border-gray-200 dark:border-[#343536] last:border-0 hover:bg-gray-50 dark:hover:bg-[#272729] transition-colors">
                    <div className="p-4">
                      <p className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">{idx + 1}. {rule.title}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{rule.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center flex flex-col items-center gap-2">
              <ScrollText size={32} strokeWidth={1.5} className="text-gray-400 opacity-50 mb-2" />
                  <p className="text-xs text-gray-500">No rules set for this community.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;