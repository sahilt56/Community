import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import TipTapEditor from '../components/TipTapEditor';
import { 
  Shield, AlertTriangle, MessageSquare, Send, X, Lock,
  Trash2, CheckCircle, Search, MoreVertical, Activity, Layers, Ban, MessageCircle, KeyRound, Award, ArrowLeft, ImagePlay, Settings2
} from 'lucide-react';

const AdminUserSupervision = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Timer
    const [now, setNow] = useState(Date.now());
    
    // Modals
    const [messageModal, setMessageModal] = useState({ isOpen: false, userId: null, username: '', content: '' });
    const [featuresModal, setFeaturesModal] = useState({ isOpen: false, userId: null, username: '', disabledFeatures: [] });
    const [pendingEditorFiles, setPendingEditorFiles] = useState([]);
    
    // Auth Check
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
                const res = await api.get(`/api/users/${parsedUser.username}`);
                if (!res.data.profile || !res.data.profile.isAdmin) {
                    toast.error('Access Denied. Admins only.');
                    navigate('/');
                    return;
                }
                setUser(res.data.profile);
                fetchUsers();
            } catch (err) {
                toast.error('Authentication Error');
                navigate('/');
            }
        };
        initAdmin();
    }, [navigate]);

    // Timer Interval
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/users');
            setUsers(res.data);
        } catch (err) {
            toast.error("Failed to load users.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // User Management Utilities
    const isUserBanned = (u) => u && u.banExpiresAt && new Date(u.banExpiresAt) > new Date();

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

    const handleUserClick = (username) => {
        navigate(`/u/${username}`);
    };

    // User Actions
    const handleDeleteUser = (userId) => {
        toast((t) => (
            <div className="flex flex-col gap-3 p-1">
                <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-red-500 shrink-0" />
                    WARNING: Permanently delete this user and ALL their posts/communities?
                </p>
                <div className="flex gap-2 justify-end mt-1">
                    <button onClick={() => { toast.dismiss(t.id); executeDeleteUser(userId); }} className="bg-red-500 text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-red-600">Delete User</button>
                    <button onClick={() => toast.dismiss(t.id)} className="bg-gray-200 dark:bg-[#343536] text-gray-800 dark:text-gray-200 px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-gray-300 dark:hover:bg-[#272729]">Cancel</button>
                </div>
            </div>
        ), { duration: Infinity, position: 'top-center' });
    };

    const executeDeleteUser = async (userId) => {
        try {
            await api.delete(`/api/admin/users/${userId}`);
            toast.success("User completely wiped from platform.");
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete user.");
        }
    };

    const handleBanUser = (id) => {
        let days = 7;
        toast((t) => (
            <div className="flex flex-col gap-3 p-1">
                <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Ban size={18} className="text-orange-500 shrink-0" /> Temporarily ban this user?
                </p>
                <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Ban Duration (days)</span>
                    <input type="number" min="1" defaultValue="7" onChange={(e) => { days = parseInt(e.target.value) || 7; }} className="px-3 py-1.5 bg-white dark:bg-[#272729] border border-gray-300 dark:border-[#343536] rounded text-sm text-gray-900 dark:text-white font-mono" />
                </label>
                <div className="flex gap-2 justify-end mt-1">
                    <button onClick={() => { toast.dismiss(t.id); executeBanUser(id, days); }} className="bg-orange-500 text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-orange-600">Ban User</button>
                    <button onClick={() => toast.dismiss(t.id)} className="bg-gray-200 dark:bg-[#343536] text-gray-800 dark:text-gray-200 px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-gray-300 dark:hover:bg-[#272729]">Cancel</button>
                </div>
            </div>
        ), { duration: Infinity, position: 'top-center' });
    };

    const executeBanUser = async (userId, days) => {
        try {
            await api.post(`/api/admin/users/${userId}/ban`, { days });
            toast.success(`User banned for ${days} day(s)!`);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to ban user.");
        }
    };

    const handleUnbanUser = async (userId) => {
        try {
            await api.post(`/api/admin/users/${userId}/unban`);
            toast.success("User unbanned successfully!");
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to unban user.");
        }
    };

    const handleAddAnubhav = (id, username, current) => {
        let amount = 100;
        toast((t) => (
            <div className="flex flex-col gap-3 p-1">
                <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Activity size={18} className="text-green-500 shrink-0" /> Add Anubhav (XP) to u/{username}?
                </p>
                <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Amount of XP</span>
                    <input type="number" min="1" defaultValue="100" onChange={(e) => { amount = parseInt(e.target.value) || 100; }} className="px-3 py-1.5 bg-white dark:bg-[#272729] border border-gray-300 dark:border-[#343536] rounded text-sm text-gray-900 dark:text-white font-mono" />
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400">Current: {current} XP → New: {current + amount} XP</p>
                <div className="flex gap-2 justify-end mt-1">
                    <button onClick={() => { toast.dismiss(t.id); executeAddAnubhav(id, amount); }} className="bg-green-500 text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-green-600">Add XP</button>
                    <button onClick={() => toast.dismiss(t.id)} className="bg-gray-200 dark:bg-[#343536] text-gray-800 dark:text-gray-200 px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-gray-300 dark:hover:bg-[#272729]">Cancel</button>
                </div>
            </div>
        ), { duration: Infinity, position: 'top-center' });
    };

    const executeAddAnubhav = async (userId, amount) => {
        try {
            await api.post(`/api/admin/users/${userId}/add-anubhav`, { amount });
            toast.success(`Added ${amount} XP!`);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to add XP.");
        }
    };

    const handleDeductAnubhav = (id, username, current) => {
        let amount = 50;
        toast((t) => (
            <div className="flex flex-col gap-3 p-1">
                <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Activity size={18} className="text-amber-500 shrink-0" /> Deduct Anubhav (XP) from u/{username}?
                </p>
                <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Amount of XP</span>
                    <input type="number" min="1" defaultValue="50" onChange={(e) => { amount = parseInt(e.target.value) || 50; }} className="px-3 py-1.5 bg-white dark:bg-[#272729] border border-gray-300 dark:border-[#343536] rounded text-sm text-gray-900 dark:text-white font-mono" />
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400">Current: {current} XP → New: {Math.max(0, current - amount)} XP</p>
                <div className="flex gap-2 justify-end mt-1">
                    <button onClick={() => { toast.dismiss(t.id); executeDeductAnubhav(id, amount); }} className="bg-amber-500 text-white px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-amber-600">Deduct XP</button>
                    <button onClick={() => toast.dismiss(t.id)} className="bg-gray-200 dark:bg-[#343536] text-gray-800 dark:text-gray-200 px-4 py-1.5 rounded-md text-xs font-bold transition-colors hover:bg-gray-300 dark:hover:bg-[#272729]">Cancel</button>
                </div>
            </div>
        ), { duration: Infinity, position: 'top-center' });
    };

    const executeDeductAnubhav = async (userId, amount) => {
        try {
            await api.post(`/api/admin/users/${userId}/deduct-anubhav`, { amount });
            toast.success(`Deducted ${amount} XP!`);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to deduct XP.");
        }
    };

    const handleToggleGifBanner = async (userId, currentState) => {
        try {
            await api.post(`/api/admin/users/${userId}/toggle-gif`, { canUseGifBanner: !currentState });
            toast.success(!currentState ? "GIF Banner Enabled!" : "GIF Banner Disabled!");
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to toggle GIF banner.");
        }
    };

    const handleSendMessageClick = (userId, username) => {
        setMessageModal({ isOpen: true, userId, username, content: '' });
    };

    const handleOpenFeaturesModal = async (userId, username) => {
        try {
            const res = await api.get(`/api/admin/users/${userId}/features`);
            setFeaturesModal({ 
                isOpen: true, 
                userId, 
                username, 
                disabledFeatures: res.data.disabledFeatures || [] 
            });
        } catch (err) {
            toast.error("Failed to load feature settings.");
        }
    };

    const toggleFeature = (feature) => {
        setFeaturesModal(prev => ({
            ...prev,
            disabledFeatures: prev.disabledFeatures.includes(feature)
                ? prev.disabledFeatures.filter(f => f !== feature)
                : [...prev.disabledFeatures, feature]
        }));
    };

    const handleSaveFeatures = async () => {
        try {
            await api.post(`/api/admin/users/${featuresModal.userId}/features`, {
                disabledFeatures: featuresModal.disabledFeatures
            });
            toast.success("Feature privileges updated!");
            setFeaturesModal({ isOpen: false, userId: null, username: '', disabledFeatures: [] });
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update features.");
        }
    };

    const executeSendMessage = async (e) => {
        if (e) e.preventDefault();
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

    if (!user || (!user.isAdmin)) return null;

    return (
        <div className="w-full flex-1 bg-gray-50 dark:bg-[#0b0a0a] min-h-full pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                
                <div className="flex items-center gap-4 mb-6">
                    <Link to="/admin" className="p-2 bg-white dark:bg-[#1a1a1b] rounded-full shadow-sm hover:bg-gray-100 dark:hover:bg-[#272729] transition-colors border border-gray-200 dark:border-[#343536]">
                        <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </Link>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            Users Supervision
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage platform users, messages, and bans</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1a1a1b] rounded-xl shadow-sm border border-gray-200 dark:border-[#343536] p-4 sm:p-6 min-h-[500px]">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <span className="w-8 h-8 rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {users.map(u => (
                                <div key={u._id} className="bg-gray-50 dark:bg-[#0b0a0a]/50 border-2 border-gray-200 dark:border-[#343536] rounded-xl p-5 hover:border-orange-500 dark:hover:border-orange-500 transition-all shadow-sm">
                                    {/* Header Section with Avatar & User Info */}
                                    <div className="flex items-start gap-4 mb-4">
                                        <img 
                                            src={u.profilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`} 
                                            className="w-16 h-16 rounded-full border-2 border-gray-300 dark:border-[#343536] flex-shrink-0 object-cover shadow-md cursor-pointer hover:scale-105 transition-transform" 
                                            alt="" 
                                            onClick={() => handleUserClick(u.username)}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 
                                                    className="font-bold text-xl text-gray-900 dark:text-white cursor-pointer hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                                                    onClick={() => handleUserClick(u.username)}
                                                >
                                                    u/{u.username}
                                                </h3>
                                                {u.canUseGifBanner && <ImagePlay className="w-5 h-5 text-pink-500 flex-shrink-0" title="GIF Banner Enabled"/>}
                                                {u.hasVartalapBadge && <Award className="w-5 h-5 text-blue-500 flex-shrink-0" title="Vartalap Badge"/>}
                                                {u.isAdmin && <Shield className="w-5 h-5 text-orange-500 flex-shrink-0" title="Admin"/>}
                                            </div>
                                            {u.email && <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{u.email}</p>}
                                            
                                            {/* Info Badges */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="px-3 py-1 bg-white dark:bg-[#272729] border border-gray-300 dark:border-[#343536] text-gray-700 dark:text-gray-300 text-xs rounded-lg font-semibold capitalize shadow-sm">
                                                    {u.userType}
                                                </span>
                                                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs rounded-lg font-bold shadow-sm">
                                                    {u.anubhav} XP
                                                </span>
                                                <span className="px-3 py-1 bg-gray-100 dark:bg-[#272729]/70 border border-gray-300 dark:border-[#343536] text-gray-600 dark:text-gray-400 text-xs rounded-lg shadow-sm">
                                                    Joined {new Date(u.createdAt).toLocaleDateString()}
                                                </span>
                                                {u.banCount > 0 && (
                                                    <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400 text-xs rounded-lg font-bold flex items-center gap-1.5 shadow-sm">
                                                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> Banned {u.banCount}x
                                                    </span>
                                                )}
                                                {isUserBanned(u) && (
                                                    <span className="px-3 py-1 bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400 text-xs rounded-lg font-bold flex items-center gap-1.5 shadow-sm">
                                                        <Ban className="w-3.5 h-3.5 flex-shrink-0" /> {getRemainingTime(u.banExpiresAt, now)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    {!u.isAdmin && (
                                        <div className="border-t border-gray-200 dark:border-[#343536] pt-4 mt-1">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-2">
                                                <button 
                                                    onClick={() => handleSendMessageClick(u._id, u.username)} 
                                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-blue-50 dark:bg-[#272729] dark:hover:bg-blue-500/10 text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 border border-gray-300 hover:border-blue-300 dark:border-[#343536] dark:hover:border-blue-500/40 rounded-lg text-sm font-semibold transition-all shadow-sm"
                                                >
                                                    <MessageCircle size={16} className="text-blue-500"/> 
                                                    <span>Msg</span>
                                                </button>
                                                
                                                <button 
                                                    onClick={() => handleAddAnubhav(u._id, u.username, u.anubhav)} 
                                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-green-50 dark:bg-[#272729] dark:hover:bg-green-500/10 text-gray-700 hover:text-green-600 dark:text-gray-300 dark:hover:text-green-400 border border-gray-300 hover:border-green-300 dark:border-[#343536] dark:hover:border-green-500/40 rounded-lg text-sm font-semibold transition-all shadow-sm"
                                                >
                                                    <Activity size={16} className="text-green-500"/> 
                                                    <span>+XP</span>
                                                </button>
                                                
                                                <button 
                                                    onClick={() => handleDeductAnubhav(u._id, u.username, u.anubhav)} 
                                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-amber-50 dark:bg-[#272729] dark:hover:bg-amber-500/10 text-gray-700 hover:text-amber-600 dark:text-gray-300 dark:hover:text-amber-400 border border-gray-300 hover:border-amber-300 dark:border-[#343536] dark:hover:border-amber-500/40 rounded-lg text-sm font-semibold transition-all shadow-sm"
                                                >
                                                    <Activity size={16} className="text-amber-500"/> 
                                                    <span>-XP</span>
                                                </button>
                                                
                                                <button 
                                                    onClick={() => handleToggleGifBanner(u._id, u.canUseGifBanner)} 
                                                    className={`flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-pink-50 dark:bg-[#272729] dark:hover:bg-pink-500/10 text-gray-700 hover:text-pink-600 dark:text-gray-300 dark:hover:text-pink-400 border border-gray-300 hover:border-pink-300 dark:border-[#343536] dark:hover:border-pink-500/40 rounded-lg text-sm font-semibold transition-all shadow-sm ${u.canUseGifBanner ? 'ring-2 ring-pink-500 bg-pink-50 dark:bg-pink-500/20 border-pink-400 dark:border-pink-500' : ''}`}
                                                >
                                                    <ImagePlay size={16} className={u.canUseGifBanner ? "text-pink-600 dark:text-pink-400" : "text-gray-400"}/> 
                                                    <span>GIF</span>
                                                </button>
                                                
                                                <button 
                                                    onClick={() => handleOpenFeaturesModal(u._id, u.username)} 
                                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-purple-50 dark:bg-[#272729] dark:hover:bg-purple-500/10 text-gray-700 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 border border-gray-300 hover:border-purple-300 dark:border-[#343536] dark:hover:border-purple-500/40 rounded-lg text-sm font-semibold transition-all shadow-sm"
                                                >
                                                    <Settings2 size={16} className="text-purple-500"/> 
                                                    <span>Features</span>
                                                </button>
                                                
                                                {isUserBanned(u) ? (
                                                    <button 
                                                        onClick={() => handleUnbanUser(u._id)} 
                                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-green-50 dark:bg-[#272729] dark:hover:bg-green-500/10 text-gray-700 hover:text-green-600 dark:text-gray-300 dark:hover:text-green-400 border border-gray-300 hover:border-green-300 dark:border-[#343536] dark:hover:border-green-500/40 rounded-lg text-sm font-semibold transition-all shadow-sm"
                                                    >
                                                        <CheckCircle size={16} className="text-green-500"/> 
                                                        <span>Unban</span>
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleBanUser(u._id)} 
                                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-orange-50 dark:bg-[#272729] dark:hover:bg-orange-500/10 text-gray-700 hover:text-orange-600 dark:text-gray-300 dark:hover:text-orange-400 border border-gray-300 hover:border-orange-300 dark:border-[#343536] dark:hover:border-orange-500/40 rounded-lg text-sm font-semibold transition-all shadow-sm"
                                                    >
                                                        <Ban size={16} className="text-orange-500"/> 
                                                        <span>Ban</span>
                                                    </button>
                                                )}
                                                
                                                <button 
                                                    onClick={() => handleDeleteUser(u._id)} 
                                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-red-50 dark:bg-[#272729] dark:hover:bg-red-500/10 text-gray-700 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 border border-gray-300 hover:border-red-300 dark:border-[#343536] dark:hover:border-red-500/40 rounded-lg text-sm font-semibold transition-all shadow-sm"
                                                >
                                                    <Trash2 size={16} className="text-red-500"/> 
                                                    <span>Delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* SEND MESSAGE MODAL */}
            {messageModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1a1a1b] w-full max-w-2xl rounded-xl shadow-xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-200 dark:border-[#343536] flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <MessageSquare size={18} className="text-blue-500"/> 
                                    Direct Message
                                </h3>
                                <p className="text-sm text-gray-500 mt-0.5">Sending Official Admin notification to u/{messageModal.username}</p>
                            </div>
                            <button onClick={() => setMessageModal({ isOpen: false, userId: null, username: '', content: '' })} className="p-2 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-full text-gray-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 bg-gray-50 dark:bg-[#0b0a0a]">
                            <form onSubmit={executeSendMessage} className="flex flex-col h-full bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/50 transition-shadow">
                                <div className="p-2 border-b border-gray-200 dark:border-[#343536] bg-gray-50 dark:bg-[#1a1a1b]">
                                    <span className="text-xs font-bold text-gray-500 px-2 uppercase tracking-wider">Message Content</span>
                                </div>
                                <div className="flex-1 min-h-[300px] cursor-text">
                                    <TipTapEditor 
                                        content={messageModal.content} 
                                        onChange={(html) => setMessageModal(prev => ({...prev, content: html}))} 
                                        placeholder="Type your official notification here. Images and rich text are supported..."
                                        onImageAdd={(file, tempUrl) => { setPendingEditorFiles(prev => [...prev, { file, url: tempUrl }]); }}
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-[#343536] bg-white dark:bg-[#1a1a1b] shrink-0 flex justify-end gap-3">
                            <button type="button" onClick={() => setMessageModal({ isOpen: false, userId: null, username: '', content: '' })} className="px-5 py-2 font-bold text-gray-600 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-[#272729] dark:hover:bg-[#343536] rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button type="button" onClick={executeSendMessage} className="px-5 py-2 font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-lg flex items-center gap-2 transition-colors">
                                <Send size={16} /> Send Notification
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FEATURE TOGGLES MODAL */}
            {featuresModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1a1a1b] w-full max-w-sm rounded-xl shadow-xl overflow-hidden animate-fade-in flex flex-col">
                        <div className="p-4 border-b border-gray-200 dark:border-[#343536] flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Settings2 size={18} className="text-purple-500"/> 
                                    Feature Privileges
                                </h3>
                                <p className="text-sm text-gray-500 mt-0.5">Manage access for u/{featuresModal.username}</p>
                            </div>
                            <button onClick={() => setFeaturesModal({ isOpen: false, userId: null, username: '', disabledFeatures: [] })} className="p-2 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-full text-gray-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-[#272729] p-3 rounded-lg border border-gray-200 dark:border-[#343536]">
                                <div>
                                    <p className="font-bold text-sm text-gray-900 dark:text-white">Disable Post Creation</p>
                                    <p className="text-xs text-red-500">Revokes posting power</p>
                                </div>
                                <button 
                                    onClick={() => toggleFeature('post')}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${featuresModal.disabledFeatures.includes('post') ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${featuresModal.disabledFeatures.includes('post') ? 'translate-x-4.5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-[#272729] p-3 rounded-lg border border-gray-200 dark:border-[#343536]">
                                <div>
                                    <p className="font-bold text-sm text-gray-900 dark:text-white">Disable Community Creation</p>
                                    <p className="text-xs text-red-500">Revokes Vartalap creation</p>
                                </div>
                                <button 
                                    onClick={() => toggleFeature('community')}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${featuresModal.disabledFeatures.includes('community') ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${featuresModal.disabledFeatures.includes('community') ? 'translate-x-4.5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-[#272729] p-3 rounded-lg border border-gray-200 dark:border-[#343536]">
                                <div>
                                    <p className="font-bold text-sm text-gray-900 dark:text-white">Disable Comments</p>
                                    <p className="text-xs text-red-500">Revokes commenting power</p>
                                </div>
                                <button 
                                    onClick={() => toggleFeature('comment')}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${featuresModal.disabledFeatures.includes('comment') ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${featuresModal.disabledFeatures.includes('comment') ? 'translate-x-4.5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-[#272729] p-3 rounded-lg border border-gray-200 dark:border-[#343536]">
                                <div>
                                    <p className="font-bold text-sm text-gray-900 dark:text-white">Disable Replies</p>
                                    <p className="text-xs text-red-500">Revokes replying power</p>
                                </div>
                                <button 
                                    onClick={() => toggleFeature('reply')}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${featuresModal.disabledFeatures.includes('reply') ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${featuresModal.disabledFeatures.includes('reply') ? 'translate-x-4.5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-[#272729] p-3 rounded-lg border border-gray-200 dark:border-[#343536]">
                                <div>
                                    <p className="font-bold text-sm text-gray-900 dark:text-white">Disable Polls</p>
                                    <p className="text-xs text-red-500">Revokes poll creation</p>
                                </div>
                                <button 
                                    onClick={() => toggleFeature('poll')}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${featuresModal.disabledFeatures.includes('poll') ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${featuresModal.disabledFeatures.includes('poll') ? 'translate-x-4.5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-[#272729] p-3 rounded-lg border border-gray-200 dark:border-[#343536]">
                                <div>
                                    <p className="font-bold text-sm text-gray-900 dark:text-white">Disable Voice</p>
                                    <p className="text-xs text-red-500">Revokes voice party creation</p>
                                </div>
                                <button 
                                    onClick={() => toggleFeature('voice')}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${featuresModal.disabledFeatures.includes('voice') ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${featuresModal.disabledFeatures.includes('voice') ? 'translate-x-4.5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-[#272729] p-3 rounded-lg border border-gray-200 dark:border-[#343536]">
                                <div>
                                    <p className="font-bold text-sm text-gray-900 dark:text-white">Disable Events</p>
                                    <p className="text-xs text-red-500">Revokes event creation</p>
                                </div>
                                <button 
                                    onClick={() => toggleFeature('event')}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${featuresModal.disabledFeatures.includes('event') ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${featuresModal.disabledFeatures.includes('event') ? 'translate-x-4.5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-[#343536] flex justify-end gap-3 bg-gray-50 dark:bg-[#1a1a1b]">
                            <button onClick={() => setFeaturesModal({ isOpen: false, userId: null, username: '', disabledFeatures: [] })} className="px-5 py-2 font-bold text-gray-600 dark:text-gray-300 bg-white hover:bg-gray-200 dark:bg-[#272729] dark:hover:bg-[#343536] border border-gray-200 dark:border-[#343536] rounded-lg transition-colors text-sm">Cancel</button>
                            <button onClick={handleSaveFeatures} className="px-5 py-2 font-bold text-white bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors text-sm">Save Privileges</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUserSupervision;