import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import TipTapEditor from '../components/TipTapEditor';
import { 
  Shield, AlertTriangle, Users, MessageSquare, Send, X, Lock,
  Trash2, CheckCircle, Search, MoreVertical, Activity, Layers, Ban, MessageCircle, KeyRound, Award, Database, HardDriveDownload
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [user, setUser] = useState(null);
  
  const [users, setUsers] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [messageModal, setMessageModal] = useState({ isOpen: false, userId: null, username: '', content: '' });
  const [pendingEditorFiles, setPendingEditorFiles] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [globalSettings, setGlobalSettings] = useState({ disablePost: false, disableCommunity: false, disableComment: false, disableReply: false, disablePoll: false, disableVoice: false, disableEvent: false, autoCleanup: false });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [storageModal, setStorageModal] = useState(false);
  
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const initAdmin = async () => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            toast.error('Access Denied. Please login.');
            navigate('/login');
            return;
        }
        
        try {
            const parsedUser = JSON.parse(storedUser);
            // Fetch fresh user data to truly verify isAdmin flag securely
            const res = await api.get(`/api/users/${parsedUser.username}`);
            
            if (!res.data.profile || !res.data.profile.isAdmin) {
                toast.error('Access Denied. Admins only.');
                navigate('/');
                return;
            }

            setUser(res.data.profile);
            fetchData();
        } catch (err) {
            toast.error('Authentication Error');
            navigate('/');
        }
    };

    initAdmin();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const res = await api.get('/api/admin/stats');
        setStats(res.data);
      } else if (activeTab === 'users') {
        const res = await api.get('/api/admin/users');
        setUsers(res.data);
      } else if (activeTab === 'communities') {
        const res = await api.get('/api/admin/communities');
        setCommunities(res.data);
      } else if (activeTab === 'posts') {
        const res = await api.get('/api/admin/posts');
        setPosts(res.data);
      } else if (activeTab === 'reports') {
        const res = await api.get('/api/admin/reports');
        setReports(res.data);
        } else if (activeTab === 'settings') {
        try {
          const res = await api.get('/api/admin/settings/welcome_message');
          setWelcomeMessage(res.data.value || '');
        } catch (e) {
          if (e.response && e.response.status === 404) {
             setWelcomeMessage('Welcome to Vartalap! 🎉 Dive into communities and start exploring today.');
          }
        }
        try {
          const resPost = await api.get('/api/admin/settings/global_disable_post');
          const resComm = await api.get('/api/admin/settings/global_disable_community');
          const resComment = await api.get('/api/admin/settings/global_disable_comment');
          const resReply = await api.get('/api/admin/settings/global_disable_reply');
          const resPoll = await api.get('/api/admin/settings/global_disable_poll');
          const resVoice = await api.get('/api/admin/settings/global_disable_voice');
          const resEvent = await api.get('/api/admin/settings/global_disable_event');
          let resCleanup = { data: { value: 'false' } };
          try { resCleanup = await api.get('/api/admin/settings/auto_cleanup_enabled'); } catch(e){}

          setGlobalSettings({
              disablePost: resPost.data.value === 'true',
              disableCommunity: resComm.data.value === 'true',
              disableComment: resComment.data.value === 'true',
              disableReply: resReply.data.value === 'true',
              disablePoll: resPoll.data.value === 'true',
              disableVoice: resVoice.data.value === 'true',
              disableEvent: resEvent.data.value === 'true',
              autoCleanup: resCleanup.data.value === true || resCleanup.data.value === 'true'
          });
        } catch (e) {
            // Ignored if they don't exist yet
        }
      }
    } catch (err) {
      toast.error("Failed to load admin data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (userId) => {
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          WARNING: Permanently delete this user and ALL their posts/communities?
        </p>
        <div className="flex gap-2 justify-end mt-1">
          <button onClick={() => { toast.remove(t.id); executeDeleteUser(userId); }} className="bg-red-500 text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-red-600">Delete User</button>
          <button onClick={() => toast.remove(t.id)} className="bg-gray-200 dark:bg-[#343536] text-gray-800 dark:text-gray-200 px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-gray-300 dark:hover:bg-[#272729]">Cancel</button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  };

  const executeDeleteUser = async (userId) => {
    try {
        await api.delete(`/api/admin/users/${userId}`);
        toast.success("User completely wiped from platform.");
        fetchData();
    } catch (err) {
        toast.error(err.response?.data?.message || "Failed to delete user.");
    }
  };

  const handleBanUser = (id) => {
    let days = 7;
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Ban size={18} className="text-orange-500 shrink-0" />
          Temporarily ban this user?
        </p>
        <p className="text-xs text-gray-500">Enter number of days:</p>
        <input
          type="number"
          defaultValue={days}
          min="1"
          onChange={(e) => {
            let val = parseInt(e.target.value);
            if (isNaN(val)) val = '';
            else if (val < 1) val = 1;
            days = val;
            e.target.value = val;
          }}
          className="bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] rounded px-3 py-1.5 text-sm outline-none focus:border-orange-500 text-gray-900 dark:text-white"
          autoFocus
        />
        <div className="flex gap-2 justify-end mt-1">
          <button onClick={() => { 
            const parsedDays = parseInt(days);
            if (isNaN(parsedDays) || parsedDays <= 0) {
              toast.error("Days must be greater than 0.");
              return;
            }
            toast.remove(t.id); executeBanUser(id, parsedDays); }} className="bg-orange-500 text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-orange-600">Confirm Ban</button>
          <button onClick={() => toast.remove(t.id)} className="bg-gray-200 dark:bg-[#343536] text-gray-800 dark:text-gray-200 px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-gray-300 dark:hover:bg-[#272729]">Cancel</button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  };

  const handleDeductAnubhav = (id, username, currentAnubhav) => {
    let amount = 10;
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Activity size={18} className="text-red-500 shrink-0" />
          Deduct Anubhav from u/{username}?
        </p>
        <p className="text-xs text-gray-500 flex items-center justify-between">
            <span>Enter amount to deduct:</span>
            <span className="font-bold text-gray-900 dark:text-gray-300">Balance: {currentAnubhav}</span>
        </p>
        <input
          type="number"
          defaultValue={amount}
          min="1"
          onChange={(e) => {
            let val = parseInt(e.target.value);
            if (isNaN(val)) val = '';
            else if (val < 1) val = 1;
            amount = val;
            e.target.value = val;
          }}
          className="bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] rounded px-3 py-1.5 text-sm outline-none focus:border-red-500 text-gray-900 dark:text-white"
          autoFocus
        />
        <div className="flex gap-2 justify-end mt-1">
          <button onClick={() => { 
            const parsedAmount = parseInt(amount);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
              toast.error("Amount must be greater than 0.");
              return;
            }
            toast.remove(t.id); executeDeductAnubhav(id, parsedAmount); }} className="bg-red-500 text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-red-600">Deduct</button>
          <button onClick={() => toast.remove(t.id)} className="bg-gray-200 dark:bg-[#343536] text-gray-800 dark:text-gray-200 px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-gray-300 dark:hover:bg-[#272729]">Cancel</button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  };

  const executeDeductAnubhav = async (id, amount) => {
      try {
          const res = await api.put(`/api/admin/users/${id}/deduct-anubhav`, { amount });
          toast.success(res.data.message);
          
          // update user locally directly if modal is open
          if (selectedUser && selectedUser.profile._id === id) {
              setSelectedUser(prev => ({
                  ...prev,
                  profile: {
                      ...prev.profile,
                      anubhav: prev.profile.anubhav - amount
                  }
              }));
          }
          fetchData(); 
      } catch (err) {
          toast.error(err.response?.data?.error || "Error deducting anubhav.");
      }
  };

  const handleAddAnubhav = (id, username, currentAnubhav) => {
    let amount = 10;
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Activity size={18} className="text-green-500 shrink-0" />
          Add Anubhav to u/{username}?
        </p>
        <p className="text-xs text-gray-500 flex items-center justify-between">
            <span>Enter amount to grant:</span>
            <span className="font-bold text-gray-900 dark:text-gray-300">Balance: {currentAnubhav}</span>
        </p>
        <input
          type="number"
          defaultValue={amount}
          min="1"
          onChange={(e) => {
            let val = parseInt(e.target.value);
            if (isNaN(val)) val = '';
            else if (val < 1) val = 1;
            amount = val;
            e.target.value = val;
          }}
          className="bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] rounded px-3 py-1.5 text-sm outline-none focus:border-green-500 text-gray-900 dark:text-white"
          autoFocus
        />
        <div className="flex gap-2 justify-end mt-1">
          <button onClick={() => { 
            const parsedAmount = parseInt(amount);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
              toast.error("Amount must be greater than 0.");
              return;
            }
            toast.remove(t.id); executeAddAnubhav(id, parsedAmount); }} className="bg-green-500 text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-green-600">Add XP</button>
          <button onClick={() => toast.remove(t.id)} className="bg-gray-200 dark:bg-[#343536] text-gray-800 dark:text-gray-200 px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-gray-300 dark:hover:bg-[#272729]">Cancel</button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  };

  const executeAddAnubhav = async (id, amount) => {
      try {
          const res = await api.put(`/api/admin/users/${id}/add-anubhav`, { amount });
          toast.success(res.data.message);
          
          // update user locally directly if modal is open
          if (selectedUser && selectedUser.profile._id === id) {
              setSelectedUser(prev => ({
                  ...prev,
                  profile: {
                      ...prev.profile,
                      anubhav: prev.profile.anubhav + amount
                  }
              }));
          }
          fetchData(); 
      } catch (err) {
          toast.error(err.response?.data?.error || "Error adding anubhav.");
      }
  };

  const executeBanUser = async (id, days) => {
      try {
          const res = await api.put(`/api/admin/users/${id}/ban`, { durationDays: days });
          toast.success(res.data.message);
          fetchData(); 
      } catch (err) {
          toast.error(err.response?.data?.error || "Error banning user.");
      }
  };

  const handleUnbanUser = (id) => {
    toast.promise(
      api.post(`/api/admin/users/${id}/unban`).then(() => fetchData()),
      {
        loading: 'Unbanning user...',
        success: 'User unbanned successfully!',
        error: 'Failed to unban user.',
      }
    );
  };

  const handleDeleteCommunity = (id) => {
      toast((t) => (
        <div className="flex flex-col gap-3 p-1">
          <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500 shrink-0" />
            Permanently delete this community?
          </p>
          <div className="flex gap-2 justify-end mt-1">
            <button onClick={() => { toast.remove(t.id); executeDeleteCommunity(id); }} className="bg-red-500 text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-red-600">Delete</button>
            <button onClick={() => toast.remove(t.id)} className="bg-gray-200 dark:bg-[#343536] text-gray-800 dark:text-gray-200 px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-gray-300 dark:hover:bg-[#272729]">Cancel</button>
          </div>
        </div>
      ), { duration: Infinity, position: 'top-center' });
  };

  const executeDeleteCommunity = async (id) => {
      try {
          await api.delete(`/api/admin/communities/${id}`);
          toast.success("Community permanently deleted.");
          fetchData();
      } catch (err) {
          toast.error("Error deleting community.");
      }
  };

  const isUserBanned = (user) => {
    return user && user.banExpiresAt && new Date(user.banExpiresAt) > new Date();
  };

  const isCommunityBanned = (community) => {
    return community && community.banExpiresAt && new Date(community.banExpiresAt) > new Date();
  };

  const getRemainingTime = (dateString, currentTime) => {
    if (!dateString) return '';
    const diff = new Date(dateString) - currentTime;
    if (diff <= 0) return 'Expired';
    
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);

    let res = [];
    if (d > 0) res.push(`${d}d`);
    if (h > 0 || d > 0) res.push(`${h.toString().padStart(2, '0')}h`);
    if (m > 0 || h > 0 || d > 0) res.push(`${m.toString().padStart(2, '0')}m`);
    res.push(`${s.toString().padStart(2, '0')}s`);
    return res.join(' ');
  };

  const handleBanCommunity = (id) => {
      let days = 7;
      toast((t) => (
        <div className="flex flex-col gap-3 p-1">
          <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Ban size={18} className="text-orange-500 shrink-0" />
            Ban this community?
          </p>
          <p className="text-xs text-gray-500">Enter number of days:</p>
          <input
            type="number"
            defaultValue={days}
            min="1"
            onChange={(e) => {
              let val = parseInt(e.target.value);
              if (isNaN(val)) val = '';
              else if (val < 1) val = 1;
              days = val;
              e.target.value = val;
            }}
            className="bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] rounded px-3 py-1.5 text-sm outline-none focus:border-orange-500 text-gray-900 dark:text-white"
            autoFocus
          />
          <div className="flex gap-2 justify-end mt-1">
            <button onClick={() => {
              const parsedDays = parseInt(days);
              if (isNaN(parsedDays) || parsedDays <= 0) {
                toast.error("Days must be greater than 0.");
                return;
              }
              toast.remove(t.id); executeBanCommunity(id, parsedDays);
            }} className="bg-orange-500 text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-orange-600">Confirm Ban</button>
            <button onClick={() => toast.remove(t.id)} className="bg-gray-200 dark:bg-[#343536] text-gray-800 dark:text-gray-200 px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-gray-300 dark:hover:bg-[#272729]">Cancel</button>
          </div>
        </div>
      ), { duration: Infinity, position: 'top-center' });
  };

  const executeBanCommunity = async (id, days) => {
      try {
          const res = await api.put(`/api/admin/communities/${id}/ban`, { durationDays: days });
          toast.success(res.data.message);
          fetchData(); 
      } catch (err) {
          toast.error(err.response?.data?.error || "Error banning community.");
      }
  };

  const handleUnbanCommunity = (id) => {
    toast.promise(
      executeBanCommunity(id, 0), // 0 days means unban
      {
        loading: 'Unbanning community...',
        success: 'Community unbanned successfully!',
        error: 'Failed to unban community.',
      }
    );
  };

  const handleSendMessageClick = (id, username) => {
      setMessageModal({ isOpen: true, userId: id, username, content: '' });
  };

  const executeSendMessage = async (e) => {
      e.preventDefault();
      if (!messageModal.content.trim()) return;

      let finalContent = messageModal.content;
      const filesToUpload = pendingEditorFiles.filter(item => finalContent.includes(item.url));
      if (filesToUpload.length > 0) {
          const loadingId = toast.loading('Uploading media... ⏳');
          try {
              for (const item of filesToUpload) {
                  const fd = new FormData();
                  fd.append('media', item.file);
                  const res = await api.post('/api/upload', fd);
                  const realUrl = res.data.url.startsWith('http') ? res.data.url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${res.data.url}`;
                  finalContent = finalContent.split(item.url).join(realUrl);
              }
              toast.success('Media embedded successfully!', { id: loadingId });
          } catch (err) {
              toast.error("Failed to upload media.", { id: loadingId });
              return;
          }
      }

      try {
          const res = await api.post(`/api/admin/users/${messageModal.userId}/message`, { content: finalContent });
          toast.success(res.data.message);
          setMessageModal({ isOpen: false, userId: null, username: '', content: '' });
          setPendingEditorFiles([]);
      } catch (err) {
          toast.error(err.response?.data?.error || "Error sending message.");
      }
  };

  const handleDeletePost = (id) => {
      toast((t) => (
        <div className="flex flex-col gap-3 p-1">
          <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500 shrink-0" />
            Force delete this post globally?
          </p>
          <div className="flex gap-2 justify-end mt-1">
            <button onClick={() => { toast.remove(t.id); executeDeletePost(id); }} className="bg-red-500 text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-red-600">Delete</button>
            <button onClick={() => toast.remove(t.id)} className="bg-gray-200 dark:bg-[#343536] text-gray-800 dark:text-gray-200 px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-gray-300 dark:hover:bg-[#272729]">Cancel</button>
          </div>
        </div>
      ), { duration: Infinity, position: 'top-center' });
  };

  const executeDeletePost = async (id) => {
      try {
          await api.delete(`/api/admin/posts/${id}`);
          toast.success("Post deleted.");
          fetchData();
      } catch (err) {
          toast.error("Error deleting post.");
      }
  };

  const handleToggleUserFeature = async (userId, featureName, isCurrentlyDisabled) => {
      if (!selectedUser) return;
      const currentFeatures = selectedUser.profile.disabledFeatures || [];
      let newFeatures;
      
      if (isCurrentlyDisabled) {
          newFeatures = currentFeatures.filter(f => f !== featureName);
      } else {
          newFeatures = [...currentFeatures, featureName];
      }

      try {
          const res = await api.put(`/api/admin/users/${userId}/features`, { features: newFeatures });
          toast.success(`${featureName} feature ${isCurrentlyDisabled ? 'enabled' : 'disabled'}!`);
          
          setSelectedUser(prev => ({
              ...prev,
              profile: {
                  ...prev.profile,
                  disabledFeatures: res.data.disabledFeatures
              }
          }));
          fetchData(); 
      } catch (err) {
          toast.error("Failed to update user features.");
      }
  };

  const handleResolveReport = (reportId, action) => {
      if(action === 'delete_target') {
          toast((t) => (
            <div className="flex flex-col gap-3 p-1">
              <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500 shrink-0" />
                This will DELETE the reported content. Proceed?
              </p>
              <div className="flex gap-2 justify-end mt-1">
                <button onClick={() => { toast.remove(t.id); executeResolveReport(reportId, action); }} className="bg-red-500 text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-red-600">Delete Content</button>
                <button onClick={() => toast.remove(t.id)} className="bg-gray-200 dark:bg-[#343536] text-gray-800 dark:text-gray-200 px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-gray-300 dark:hover:bg-[#272729]">Cancel</button>
              </div>
            </div>
          ), { duration: Infinity, position: 'top-center' });
      } else {
          executeResolveReport(reportId, action);
      }
  };

  const handleToggleVartalapBadge = async (userId) => {
      if (!selectedUser) return;
      try {
          const res = await api.put(`/api/admin/users/${userId}/vartalap-badge`);
          toast.success(res.data.message);
          
          setSelectedUser(prev => ({
              ...prev,
              profile: {
                  ...prev.profile,
                  hasVartalapBadge: res.data.hasVartalapBadge
              }
          }));
          fetchData(); 
      } catch (err) {
          toast.error("Failed to update Vartalap Badge.");
      }
  };

  const executeResolveReport = async (reportId, action) => {
      try {
          await api.put(`/api/admin/reports/${reportId}/resolve`, { action });
          toast.success(`Report resolved: ${action}`);
          fetchData();
      } catch (err) {
          toast.error("Error resolving report.");
      }
  };

  const handleUserClick = async (username) => {
      setLoadingUser(true);
      try {
          const res = await api.get(`/api/users/${username}`);
          setSelectedUser(res.data);
      } catch (err) {
          if (err.response?.status === 404) {
              toast.error(err.response.data?.message || "User not found.");
          } else {
              toast.error("Failed to fetch user details.");
          }
      } finally {
          setLoadingUser(false);
      }
  };

  const handleChangePassword = async (e) => {
      e.preventDefault();
      
      const current = passwords.current;
      const newPass = passwords.new;
      const confirmPass = passwords.confirm;

      if (newPass !== confirmPass) {
          return toast.error("New passwords do not match!");
      }
      
      if (newPass.length < 6) {
          return toast.error("Password must be at least 6 characters.");
      }
      setIsChangingPassword(true);
      try {
          const res = await api.put('/api/admin/change-password', {
              currentPassword: current,
              newPassword: newPass
          });
          toast.success(res.data.message + " Please use it on your next login.");
          setPasswords({ current: '', new: '', confirm: '' });
      } catch (err) {
          toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to change password.");
      } finally {
          setIsChangingPassword(false);
      }
  };

  const handleSaveWelcomeMessage = async (e) => {
      e.preventDefault();
      setIsSavingSettings(true);
      try {
          await api.put('/api/admin/settings/welcome_message', { 
            value: welcomeMessage,
            description: 'Message sent to newly registered users via notification bell'
          });
          toast.success("Welcome message updated successfully!");
      } catch (err) {
          toast.error("Failed to update welcome message.");
      } finally {
          setIsSavingSettings(false);
      }
  };

  const handleToggleGlobalSetting = async (settingKey, currentValue) => {
      const newValue = !currentValue;
      try {
          await api.put(`/api/admin/settings/${settingKey}`, { 
            value: newValue.toString(),
            description: settingKey === 'auto_cleanup_enabled' ? "Automated nightly DB cleanup job" : ""
          });
          
          toast.success("Setting updated successfully!");
          
          // Re-fetch global settings to keep UI in sync
          const res = await api.get(`/api/admin/settings/${settingKey}`);
          
          setGlobalSettings(prev => {
              const keyMap = {
                  'global_disable_post': 'disablePost',
                  'global_disable_community': 'disableCommunity',
                  'global_disable_comment': 'disableComment',
                  'global_disable_reply': 'disableReply',
                  'global_disable_poll': 'disablePoll',
                  'global_disable_voice': 'disableVoice',
                  'global_disable_event': 'disableEvent',
                  'auto_cleanup_enabled': 'autoCleanup'
              };
              const stateKey = keyMap[settingKey];
              if (stateKey) {
                  return { ...prev, [stateKey]: res.data.value === 'true' || res.data.value === true };
              }
              return prev;
          });
      } catch (err) {
          toast.error("Failed to update setting.");
      }
  };

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '0.00 MB';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getCollectionColor = (index) => {
    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500'];
    return colors[index % colors.length];
  };

  const handleClearCollection = (colName, filterType) => {
      let message = `Are you sure you want to permanently delete ${filterType === 'old' ? 'older (30+ days)' : 'ALL'} data from the '${colName}' collection? This cannot be undone.`;
      
      toast((t) => (
        <div className="flex flex-col gap-3 p-1">
          <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500 shrink-0" />
            {message}
          </p>
          <div className="flex gap-2 justify-end mt-1">
            <button onClick={() => { toast.remove(t.id); executeClearCollection(colName, filterType); }} className="bg-red-500 text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-red-600">Delete Data</button>
            <button onClick={() => toast.remove(t.id)} className="bg-gray-200 dark:bg-[#343536] text-gray-800 dark:text-gray-200 px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-gray-300 dark:hover:bg-[#272729]">Cancel</button>
          </div>
        </div>
      ), { duration: Infinity, position: 'top-center' });
  };

  const executeClearCollection = async (colName, filterType) => {
      try {
          const res = await api.delete(`/api/admin/collections/${colName}/clear?filterType=${filterType}`);
          toast.success(res.data.message);
          fetchData(); 
      } catch (err) {
          toast.error(err.response?.data?.error || `Failed to clear ${colName}.`);
      }
  };

  if (!user || !user.isAdmin) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] md:h-[calc(100vh-64px)] max-w-7xl mx-auto pt-4 md:pt-6 px-3 sm:px-4 gap-4 md:gap-6 pb-24 md:pb-4">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 flex-shrink-0 flex md:flex-col gap-2 bg-white dark:bg-[#1a1a1b] p-3 md:p-4 rounded-xl shadow-sm border border-gray-200 dark:border-[#343536] overflow-x-auto no-scrollbar md:overflow-visible h-fit md:sticky md:top-[80px] z-10">
        <div className="hidden md:flex items-center gap-2 mb-4 px-2">
            <Shield className="text-orange-500 w-6 h-6" />
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Admin Panel</h2>
        </div>
        
        
        <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729]'}`}>
            <Activity className="w-4 h-4 md:w-5 md:h-5" /> <span className="text-sm md:text-base">Overview</span>
        </button>
        <button onClick={() => setActiveTab('reports')} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'reports' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729]'}`}>
            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" /> <span className="text-sm md:text-base">Reports</span> 
            {stats?.pendingReports > 0 && <span className="ml-1 md:ml-auto bg-red-500 text-white text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full">{stats.pendingReports}</span>}
        </button>
        <button onClick={() => navigate('/admin/users')} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729]`}>
            <Users className="w-4 h-4 md:w-5 md:h-5" /> <span className="text-sm md:text-base">Users Supervision</span>
        </button>
        <button onClick={() => setActiveTab('communities')} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'communities' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729]'}`}>
            <Layers className="w-4 h-4 md:w-5 md:h-5" /> <span className="text-sm md:text-base">Vartalaps</span>
        </button>
        <button onClick={() => setActiveTab('posts')} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'posts' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729]'}`}>
            <MessageSquare className="w-4 h-4 md:w-5 md:h-5" /> <span className="text-sm md:text-base">Feed</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729]'}`}>
            <Shield className="w-4 h-4 md:w-5 md:h-5" /> <span className="text-sm md:text-base">Platform Settings</span>
        </button>
        <button onClick={() => setActiveTab('security')} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'security' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#272729]'}`}>
            <Lock className="w-4 h-4 md:w-5 md:h-5" /> <span className="text-sm md:text-base">Security</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white dark:bg-[#1a1a1b] rounded-xl shadow-sm border border-gray-200 dark:border-[#343536] overflow-hidden flex flex-col h-full min-h-[500px] mb-4 md:mb-0">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-[#343536]">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white capitalize">{activeTab} Supervision</h1>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1">
            {loading ? (
                <div className="flex justify-center py-10"><span className="w-8 h-8 rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></span></div>
            ) : (
                <>
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && stats && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                            <div className="bg-gray-50 dark:bg-[#272729] rounded-xl p-4 md:p-5 border border-gray-200 dark:border-[#343536]">
                                <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium">Total Users</p>
                                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-1 md:mt-2">{stats.totalUsers}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-[#272729] rounded-xl p-4 md:p-5 border border-gray-200 dark:border-[#343536]">
                                <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium">Communities</p>
                                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-1 md:mt-2">{stats.totalCommunities}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-[#272729] rounded-xl p-4 md:p-5 border border-gray-200 dark:border-[#343536]">
                                <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium">Active Posts</p>
                                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-1 md:mt-2">{stats.totalPosts}</p>
                            </div>
                            <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 md:p-5 border border-red-200 dark:border-red-500/20">
                                <p className="text-red-500 dark:text-red-400 text-xs md:text-sm font-medium">Pending Reports</p>
                                <p className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-500 mt-1 md:mt-2">{stats.pendingReports}</p>
                            </div>
                            
                            {/* DB Storage Section - Full Width on small, Col-Span-2/4 on larger */}
                            <div className="col-span-2 lg:col-span-3 xl:col-span-4 bg-gray-50 dark:bg-[#272729] rounded-xl p-4 md:p-5 border border-gray-200 dark:border-[#343536] flex flex-col justify-between mt-2">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-gray-900 dark:text-white text-base md:text-lg font-bold flex items-center gap-2">
                                            <Database className="w-5 h-5 text-orange-500" /> Database Storage Profile (512 MB Free Tier)
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Detailed breakdown of space consumed by individual collections.</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                                            {formatBytes(stats.dbStorageUsed)}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">/ 512.00 MB</span>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => setStorageModal(true)}
                                    className="mb-4 self-start bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-400 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                >
                                    <HardDriveDownload className="w-4 h-4" /> Manage Storage & Clean Up
                                </button>

                                {/* Stacked Progress Bar */}
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 md:h-4 mt-2 mb-4 overflow-hidden flex shadow-inner">
                                    {stats.collectionsStats && stats.collectionsStats.length > 0 ? (
                                        stats.collectionsStats.map((col, idx) => {
                                            const totalLimit = 512 * 1024 * 1024;
                                            const percentage = Math.max((col.sizeBytes / totalLimit) * 100, 0.5); // min 0.5% to be visible if tiny
                                            return (
                                                <div 
                                                    key={col.name}
                                                    title={`${col.name}: ${formatBytes(col.sizeBytes)}`}
                                                    className={`h-full ${getCollectionColor(idx)} border-r border-[#272729] last:border-0 hover:brightness-110 transition-all cursor-crosshair`} 
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            );
                                        })
                                    ) : (
                                        <div 
                                            className={`h-full ${stats.dbStorageUsed && (stats.dbStorageUsed / (1024 * 1024)) > 400 ? 'bg-red-500' : 'bg-orange-500'}`} 
                                            style={{ width: `${Math.min(((stats.dbStorageUsed || 0) / (1024 * 1024) / 512) * 100, 100)}%` }}
                                        ></div>
                                    )}
                                </div>

                                {/* Legend Grid */}
                                {stats.collectionsStats && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-2 border-t border-gray-200 dark:border-gray-700/50 pt-4">
                                        {stats.collectionsStats.map((col, idx) => (
                                            <div key={col.name} className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full shrink-0 ${getCollectionColor(idx)} shadow-sm`}></div>
                                                <div className="overflow-hidden">
                                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 capitalize truncate">{col.name}</p>
                                                    <p className="text-[10px] md:text-xs text-gray-500 font-medium">{formatBytes(col.sizeBytes)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* REPORTS TAB */}
                    {activeTab === 'reports' && (
                        <div className="flex flex-col gap-4">
                            {reports.length === 0 ? <p className="text-gray-500 text-center py-8">No pending reports! 🎉</p> : 
                                reports.map(r => (
                                    <div key={r._id} className={`p-4 rounded-xl border ${r.status === 'pending' ? 'border-orange-500 shadow-sm bg-orange-50/30 dark:bg-orange-500/5' : 'border-gray-200 dark:border-[#343536] bg-gray-50 dark:bg-[#272729] opacity-70'}`}>
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase ${r.status === 'pending' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                    {r.status}
                                                </span>
                                                <span className="text-sm font-medium text-red-500 uppercase break-all">Reason: {r.reason}</span>
                                            </div>
                                            <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Reported by <b>{r.reporter?.username || 'Unknown'}</b> regarding a <b>{r.targetType}</b></p>
                                        
                                        {r.targetId && (
                                            <div className="bg-white dark:bg-[#1a1a1b] p-3 rounded-md border border-gray-200 dark:border-[#343536] mb-4 text-sm text-gray-800 dark:text-gray-200 line-clamp-3">
                                                <b>Target Preview:</b> {r.targetId.title || r.targetId.name || r.targetId.content || r.targetId.text || 'No content available'}
                                            </div>
                                        )}

                                        {r.status === 'pending' && (
                                            <div className="flex flex-col sm:flex-row gap-2 mt-2">
                                                <button onClick={() => handleResolveReport(r._id, 'delete_target')} className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition w-full sm:w-auto">
                                                    <Trash2 className="w-4 h-4"/> Delete Content
                                                </button>
                                                <button onClick={() => handleResolveReport(r._id, 'dismiss')} className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-bold transition w-full sm:w-auto">
                                                    <CheckCircle className="w-4 h-4"/> Dismiss Ignored
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            }
                        </div>
                    )}



                    {/* PLATFORM SETTINGS TAB */}
                    {activeTab === 'settings' && (
                        <div className="max-w-2xl animate-fade-in">
                            <div className="bg-white dark:bg-[#1a1a1b] p-6 rounded-2xl border border-gray-200 dark:border-[#343536] shadow-sm mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                    <MessageSquare className="text-orange-500" /> Welcome Notification Message
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
                                    This message is automatically sent to all new users via the notification bell upon registration.
                                </p>
                                <form onSubmit={handleSaveWelcomeMessage} className="flex flex-col gap-4">
                                    <div>
                                        <textarea 
                                            value={welcomeMessage}
                                            onChange={e => setWelcomeMessage(e.target.value)}
                                            rows="4"
                                            className="w-full bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-sans resize-y"
                                            required
                                            placeholder="Enter welcome message..."
                                        />
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={isSavingSettings}
                                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm disabled:opacity-50 self-end flex items-center gap-2"
                                    >
                                        {isSavingSettings ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : 'Save Message'}
                                    </button>
                                </form>
                            </div>

                            <div className="bg-white dark:bg-[#1a1a1b] p-6 rounded-2xl border border-gray-200 dark:border-[#343536] shadow-sm mb-6 mt-4">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                    <Shield className="text-orange-500" /> Global Feature Toggles
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
                                    Instantly disable certain features across the entire platform in case of emergency.
                                </p>
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/30 mb-2">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1"><Database className="w-4 h-4 text-emerald-500"/> Automated Nightly Cleanup</p>
                                            <p className="text-xs text-gray-500">Automatically deletes read notifications (7d) and dismissed reports (30d) at midnight to save space.</p>
                                        </div>
                                        <button 
                                            onClick={() => handleToggleGlobalSetting('auto_cleanup_enabled', globalSettings.autoCleanup)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${globalSettings.autoCleanup ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalSettings.autoCleanup ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between bg-gray-50 dark:bg-[#272729] p-4 rounded-xl border border-gray-200 dark:border-[#343536]">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">Disable Post Creation</p>
                                            <p className="text-xs text-gray-500">Prevents ALL users from creating new posts.</p>
                                        </div>
                                        <button 
                                            onClick={() => handleToggleGlobalSetting('global_disable_post', globalSettings.disablePost)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${globalSettings.disablePost ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalSettings.disablePost ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between bg-gray-50 dark:bg-[#272729] p-4 rounded-xl border border-gray-200 dark:border-[#343536]">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">Disable Community Creation</p>
                                            <p className="text-xs text-gray-500">Prevents ALL users from creating new communities.</p>
                                        </div>
                                        <button 
                                            onClick={() => handleToggleGlobalSetting('global_disable_community', globalSettings.disableCommunity)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${globalSettings.disableCommunity ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalSettings.disableCommunity ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between bg-gray-50 dark:bg-[#272729] p-4 rounded-xl border border-gray-200 dark:border-[#343536]">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">Disable Comments</p>
                                            <p className="text-xs text-gray-500">Prevents ALL users from creating new root comments.</p>
                                        </div>
                                        <button 
                                            onClick={() => handleToggleGlobalSetting('global_disable_comment', globalSettings.disableComment)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${globalSettings.disableComment ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalSettings.disableComment ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between bg-gray-50 dark:bg-[#272729] p-4 rounded-xl border border-gray-200 dark:border-[#343536]">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">Disable Replies</p>
                                            <p className="text-xs text-gray-500">Prevents ALL users from replying to comments.</p>
                                        </div>
                                        <button 
                                            onClick={() => handleToggleGlobalSetting('global_disable_reply', globalSettings.disableReply)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${globalSettings.disableReply ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalSettings.disableReply ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between bg-gray-50 dark:bg-[#272729] p-4 rounded-xl border border-gray-200 dark:border-[#343536]">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">Disable Polls</p>
                                            <p className="text-xs text-gray-500">Prevents ALL users from creating new polls.</p>
                                        </div>
                                        <button 
                                            onClick={() => handleToggleGlobalSetting('global_disable_poll', globalSettings.disablePoll)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${globalSettings.disablePoll ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalSettings.disablePoll ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between bg-gray-50 dark:bg-[#272729] p-4 rounded-xl border border-gray-200 dark:border-[#343536]">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">Disable Voice Parties</p>
                                            <p className="text-xs text-gray-500">Prevents ALL users from starting voice rooms.</p>
                                        </div>
                                        <button 
                                            onClick={() => handleToggleGlobalSetting('global_disable_voice', globalSettings.disableVoice)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${globalSettings.disableVoice ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalSettings.disableVoice ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between bg-gray-50 dark:bg-[#272729] p-4 rounded-xl border border-gray-200 dark:border-[#343536]">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">Disable Events</p>
                                            <p className="text-xs text-gray-500">Prevents ALL users from creating local events.</p>
                                        </div>
                                        <button 
                                            onClick={() => handleToggleGlobalSetting('global_disable_event', globalSettings.disableEvent)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${globalSettings.disableEvent ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalSettings.disableEvent ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECURITY TAB */}
                    {activeTab === 'security' && (
                        <div className="max-w-md animate-fade-in">
                            <div className="bg-white dark:bg-[#1a1a1b] p-6 rounded-2xl border border-gray-200 dark:border-[#343536] shadow-sm">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                                    <KeyRound className="text-orange-500" /> Change Admin Password
                                </h2>
                                <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                                        <input 
                                            type="password" 
                                            value={passwords.current}
                                            onChange={e => setPasswords({...passwords, current: e.target.value})}
                                            className="w-full bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                                        <input 
                                            type="password" 
                                            value={passwords.new}
                                            onChange={e => setPasswords({...passwords, new: e.target.value})}
                                            className="w-full bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                                        <input 
                                            type="password" 
                                            value={passwords.confirm}
                                            onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                                            className="w-full bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                    <div className="pt-2">
                                        <button type="submit" disabled={isChangingPassword} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-all shadow-md disabled:opacity-50 flex justify-center">
                                            {isChangingPassword ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Update Password'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* COMMUNITIES TAB */}
                    {activeTab === 'communities' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {communities.map(c => (
                                 <div key={c._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 dark:bg-[#272729] rounded-xl border border-gray-200 dark:border-[#343536] gap-3">
                                    <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
                                        <img src={c.profilePic || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.name}`} className="w-10 h-10 rounded-full" alt=""/>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-bold text-gray-900 dark:text-white">v/{c.name}</h3>
                                            <p className="text-xs text-gray-500">{c.members?.length} Members • By {c.creator?.username}</p>
                                            {isCommunityBanned(c) && (
                                                <div className="text-[10px] text-red-500 font-bold mt-0.5 truncate flex items-center gap-1">
                                                    <Ban className="w-3 h-3 shrink-0" /> Banned till {getRemainingTime(c.banExpiresAt, now)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
                                        {isCommunityBanned(c) ? (
                                            <button onClick={() => handleUnbanCommunity(c._id)} title="Unban Community" className="text-green-500 p-2 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-full transition">
                                                <CheckCircle className="w-4 h-4 md:w-5 md:h-5"/>
                                            </button>
                                        ) : (
                                            <button onClick={() => handleBanCommunity(c._id)} title="Timeout Community" className="text-orange-500 p-2 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-full transition">
                                                <Ban className="w-4 h-4 md:w-5 md:h-5"/>
                                            </button>
                                        )}
                                        <button onClick={() => handleDeleteCommunity(c._id)} title="Permanent Ban" className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition">
                                            <Trash2 className="w-4 h-4 md:w-5 md:h-5"/>
                                        </button>
                                    </div>
                                 </div>
                             ))}
                        </div>
                    )}

                    {/* POSTS TAB */}
                    {activeTab === 'posts' && (
                        <div className="flex flex-col gap-4">
                            {posts.map(p => (
                                <div key={p._id} className="p-4 bg-gray-50 dark:bg-[#272729] rounded-xl border border-gray-200 dark:border-[#343536]">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                                        <div className="text-xs text-gray-500">
                                            <span className="font-bold text-gray-900 dark:text-gray-300">v/{p.community?.name}</span> • Posted by u/{p.author?.username}
                                        </div>
                                        <button onClick={() => handleDeletePost(p._id)} className="text-red-500 flex items-center justify-center sm:justify-start gap-1 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-500/10 px-2 py-1.5 rounded transition w-full sm:w-auto">
                                            <Trash2 className="w-4 h-4"/> Delete
                                        </button>
                                    </div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{p.title}</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 line-clamp-2">{p.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1a1a1b] w-full max-w-2xl rounded-xl shadow-2xl border border-gray-200 dark:border-[#343536] overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-[#343536] bg-gray-50 dark:bg-[#272729]">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        User Profile: {selectedUser.profile.username}
                        {selectedUser.profile.isAdmin && <Shield className="w-4 h-4 text-orange-500" />}
                    </h2>
                    <button onClick={() => setSelectedUser(null)} className="text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-1.5 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-col gap-6 flex">
                    {/* Header Info */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                        <img src={selectedUser.profile.profilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedUser.profile.username}`} className="w-20 h-20 sm:w-16 sm:h-16 rounded-full border-2 border-gray-200 dark:border-[#343536]" alt=""/>
                        <div className="flex flex-col items-center sm:items-start">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white break-all">{selectedUser.profile.username}</h3>
                            <p className="text-sm text-gray-500">{selectedUser.profile.email || "Email hidden"}</p>
                            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2 text-sm font-medium">
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-md">Anubhav: {selectedUser.profile.anubhav}</span>
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-md capitalize">{selectedUser.profile.userType || 'student'}</span>
                                {selectedUser.profile.banCount > 0 && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-md flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> Banned {selectedUser.profile.banCount} time{selectedUser.profile.banCount > 1 ? 's' : ''}
                                    </span>
                                )}
                                {isUserBanned(selectedUser.profile) && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-md flex items-center gap-1">
                                        <Ban className="w-3 h-3" /> Banned till {getRemainingTime(selectedUser.profile.banExpiresAt, now)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons in Modal */}
                    <div className="flex flex-wrap gap-2 mt-4">
                        <button onClick={() => { handleSendMessageClick(selectedUser.profile._id, selectedUser.profile.username); setSelectedUser(null); }} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-lg text-sm font-bold transition">
                            <MessageCircle size={16}/> Message
                        </button>
                        <button onClick={() => { handleDeductAnubhav(selectedUser.profile._id, selectedUser.profile.username, selectedUser.profile.anubhav); }} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 rounded-lg text-sm font-bold transition">
                            <Activity size={16}/> Deduct Anubhav
                        </button>
                        {isUserBanned(selectedUser.profile) ? (
                            <button onClick={() => { handleUnbanUser(selectedUser.profile._id); setSelectedUser(null); }} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20 rounded-lg text-sm font-bold transition">
                                <CheckCircle size={16}/> Unban User
                            </button>
                        ) : (
                            <button onClick={() => { handleBanUser(selectedUser.profile._id); setSelectedUser(null); }} className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20 rounded-lg text-sm font-bold transition">
                                <Ban size={16}/> Ban User
                            </button>
                        )}
                        <button 
                            onClick={() => handleToggleVartalapBadge(selectedUser.profile._id)} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${selectedUser.profile.hasVartalapBadge ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-400 dark:hover:bg-purple-900/60' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                        >
                            <Award size={16} /> 
                            {selectedUser.profile.hasVartalapBadge ? 'Revoke Vartalap Badge' : 'Award Vartalap Badge'}
                        </button>
                    </div>

                    {/* Feature Toggles */}
                    {selectedUser.profile && (
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Shield className="w-4 h-4"/> Feature Access Control</h4>
                            <div className="flex flex-col gap-2 bg-gray-50 dark:bg-[#272729] p-4 rounded-xl border border-gray-200 dark:border-[#343536]">
                                {[
                                    { id: 'post', label: 'Create Posts', desc: 'Can this user publish new posts?' },
                                    { id: 'comment', label: 'Add Comments', desc: 'Can this user reply to posts and comments?' },
                                    { id: 'community', label: 'Create Vartalaps', desc: 'Can this user create new communities?' }
                                ].map(feature => {
                                    const isDisabled = (selectedUser.profile.disabledFeatures || []).includes(feature.id);
                                    return (
                                        <div key={feature.id} className="flex items-center justify-between p-2 hover:bg-white dark:hover:bg-[#1a1a1b] rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-[#343536]">
                                            <div>
                                                <p className="font-bold text-sm text-gray-900 dark:text-white">{feature.label}</p>
                                                <p className="text-xs text-gray-500">{feature.desc}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleToggleUserFeature(selectedUser.profile._id, feature.id, isDisabled)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-[#1a1a1b] ${isDisabled ? 'bg-red-500' : 'bg-green-500'}`}
                                            >
                                                <span className={`${isDisabled ? 'translate-x-1' : 'translate-x-6'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Communities Re-used */}
                    {selectedUser.communities && selectedUser.communities.length > 0 && (
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Layers className="w-4 h-4"/> Communities Created ({selectedUser.communities.length})</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {selectedUser.communities.map(c => (
                                    <div key={c._id} className="p-3 bg-gray-50 dark:bg-[#272729] rounded-lg border border-gray-200 dark:border-[#343536] flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs shrink-0">v/</div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{c.name}</p>
                                            <p className="text-xs text-gray-500">{c.members?.length || 0} members</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Posts */}
                    {selectedUser.posts && selectedUser.posts.length > 0 && (
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4"/> Recent Posts ({selectedUser.posts.length})</h4>
                            <div className="flex flex-col gap-3">
                                {selectedUser.posts.map(p => (
                                    <div key={p._id} className="p-3 bg-gray-50 dark:bg-[#272729] rounded-lg border border-gray-200 dark:border-[#343536]">
                                        <span className="text-xs text-blue-500 font-bold mb-1 block">v/{p.community?.name || 'unknown'}</span>
                                        <p className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{p.title}</p>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Message Modal */}
      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1a1a1b] w-full max-w-2xl rounded-xl shadow-2xl border border-gray-200 dark:border-[#343536] overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-[#343536] bg-orange-50 dark:bg-orange-900/10">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Send size={18} className="text-orange-500" />
                        Send Message to {messageModal.username}
                    </h2>
                    <button onClick={() => setMessageModal({ isOpen: false, userId: null, username: '', content: '' })} className="text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-1.5 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={executeSendMessage} className="p-4 flex flex-col gap-4 overflow-y-auto">
                    <div className="border border-gray-200 dark:border-[#343536] rounded-xl overflow-hidden shadow-sm transition-all focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 bg-white dark:bg-[#1a1a1b] min-h-[12rem] flex flex-col">
                        <TipTapEditor
                            value={messageModal.content}
                            onChange={(val) => setMessageModal(prev => ({ ...prev, content: val }))}
                            onPendingFile={(file, url) => setPendingEditorFiles(prev => [...prev, { file, url }])}
                            placeholder={`Write a message to ${messageModal.username}... (Markdown supported ✨)`}
                            minHeight="100%"
                            variant="comment"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setMessageModal({ isOpen: false, userId: null, username: '', content: '' })}
                            className="px-4 py-2 font-bold text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!messageModal.content.trim()}
                            className="px-6 py-2 font-bold text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Send size={16} /> Send
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
      {/* STORAGE MANAGEMENT MODAL */}
      {storageModal && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1a1a1b] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-4 md:p-5 border-b border-gray-200 dark:border-[#343536] flex justify-between items-center bg-gray-50 dark:bg-[#272729]">
                      <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <HardDriveDownload className="w-5 h-5 text-orange-500" /> Storage Management
                      </h2>
                      <button onClick={() => setStorageModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition bg-white dark:bg-[#1a1a1b] p-1.5 rounded-full border border-gray-200 dark:border-[#343536] shadow-sm">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="p-4 md:p-6 overflow-y-auto">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Free up active database storage by permanently deleting old or unnecessary records. <strong className="text-red-500">Warning: Actions here are irreversible.</strong></p>
                      
                      <div className="flex flex-col gap-4">
                          {stats?.collectionsStats?.map(col => {
                              // We only allow certain collections to be bulk cleared safely
                              const saveable = ['notifications', 'messages', 'reports', 'comments', 'posts'].includes(col.name.toLowerCase());
                              
                              return (
                                  <div key={col.name} className="bg-gray-50 dark:bg-[#272729] rounded-xl p-4 border border-gray-200 dark:border-[#343536] flex flex-col md:flex-row md:items-center justify-between gap-4">
                                      <div>
                                          <p className="font-bold text-gray-900 dark:text-white capitalize flex items-center gap-2">
                                              {col.name} 
                                          </p>
                                          <p className="text-xs text-gray-500 font-medium mt-1">Space Used: <span className="text-gray-800 dark:text-gray-300 font-bold">{formatBytes(col.sizeBytes)}</span></p>
                                      </div>
                                      
                                      {saveable ? (
                                          <div className="flex flex-wrap gap-2 shrink-0">
                                              {/* For Posts/Comments we might just want to delete older ones safely */}
                                              {['posts', 'comments', 'notifications'].includes(col.name.toLowerCase()) && (
                                                  <button onClick={() => handleClearCollection(col.name, 'old')} className="bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-orange-200 dark:border-orange-800/50">
                                                      <Trash2 className="w-3.5 h-3.5" /> Clear Older than 30 Days
                                                  </button>
                                              )}
                                              <button onClick={() => handleClearCollection(col.name, 'all')} className="bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-red-200 dark:border-red-800/30">
                                                  <AlertTriangle className="w-3.5 h-3.5" /> Delete ALL Data
                                              </button>
                                          </div>
                                      ) : (
                                          <p className="text-xs text-gray-400 italic">Core data (not safe to bulk clear)</p>
                                      )}
                                  </div>
                              );
                          })}
                          
                          {(!stats?.collectionsStats || stats.collectionsStats.length === 0) && (
                              <p className="text-sm text-gray-500 text-center py-4">No collection stats available to manage.</p>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminDashboard;
