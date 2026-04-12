import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, ChevronDown, Clock, Megaphone, Plus, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import api from '../api';
import CreateAnnouncementModal from './CreateAnnouncementModal';
import toast from 'react-hot-toast';

const SystemInbox = ({ isOpen, onClose, user, messages, readIds, onMarkRead, onMarkAllRead, refreshMessages }) => {
    const [expandedMsgId, setExpandedMsgId] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    
    // Stop clicks inside from closing the popover
    const inboxRef = useRef(null);

    const handleMessageClick = async (message) => {
        // Toggle expansion
        if (expandedMsgId === message._id) {
            setExpandedMsgId(null);
            return;
        }
        
        setExpandedMsgId(message._id);

        // Mark as read if it's not already
        if (user && !readIds.includes(message._id)) {
            try {
                const res = await api.put(`/api/system-messages/${message._id}/read`);
                onMarkRead(res.data.readMessageIds);
            } catch (err) {
                console.error("Failed to mark message as read", err);
            }
        }
    };

    const handleCreateSuccess = () => {
        setShowCreateModal(false);
        refreshMessages();
    };

    const executeHideMessage = async (id) => {
        try {
            setExpandedMsgId(null);
            await api.put(`/api/system-messages/${id}/hide`);
            toast.success("Removed from your inbox.");
            refreshMessages();
        } catch (err) {
            toast.error("Failed to remove message.");
        }
    };

    const handleDeleteClick = (e, id) => {
        e.stopPropagation();
        
        if (user?.isAdmin) {
            toast((t) => (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="text-red-500 shrink-0" size={20} />
                        <span className="font-bold text-gray-900 dark:text-white">Delete Announcement?</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Choose an action for this announcement.</p>
                    <div className="flex flex-col sm:flex-row gap-2 mt-1">
                        <button 
                            onClick={async () => {
                                toast.remove(t.id);
                                await executeHideMessage(id);
                            }} 
                            className="px-3 py-1.5 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-md transition"
                        >
                            Hide for Me
                        </button>
                        <button 
                            onClick={async () => {
                                toast.remove(t.id);
                                try {
                                    setExpandedMsgId(null);
                                    await api.delete(`/api/system-messages/${id}`);
                                    toast.success("Announcement deleted successfully!");
                                    refreshMessages();
                                } catch (err) {
                                    toast.error(err.response?.data?.message || "Failed to delete announcement.");
                                }
                            }} 
                            className="px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-md transition"
                        >
                            Global Delete
                        </button>
                    </div>
                    <button 
                            onClick={() => toast.remove(t.id)} 
                            className="mt-1 px-3 py-1 text-xs font-bold text-gray-500 hover:text-gray-700 transition"
                        >
                            Cancel
                     </button>
                </div>
            ), { duration: 5000, position: 'top-center' });
        } else {
            // Normal user: just hide without big warnings
            toast((t) => (
                <div className="flex flex-col gap-3 p-1">
                    <span className="font-bold text-gray-900 dark:text-white">Remove from Inbox?</span>
                    <div className="flex gap-2 justify-end">
                        <button 
                            onClick={() => toast.remove(t.id)} 
                            className="px-3 py-1 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-[#343536] rounded"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => {
                                toast.remove(t.id);
                                executeHideMessage(id);
                            }} 
                            className="px-3 py-1 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            ));
        }
    };

    if (!isOpen) return null;

    // Calculate unread count to show at the top
    const unreadCount = messages.filter(m => !readIds.includes(m._id)).length;

    return (
        <div ref={inboxRef} className="fixed inset-x-2 top-16 md:absolute md:inset-auto md:right-0 md:top-full mt-0 md:mt-2 w-auto md:w-96 bg-white dark:bg-[#1a1a1b] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-gray-200 dark:border-[#343536] overflow-hidden z-50 flex flex-col max-h-[calc(100vh-80px)] md:max-h-[80vh] animate-fade-up md:origin-top-right">
            
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-[#343536] flex justify-between items-center bg-gray-50 dark:bg-[#272729]">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Megaphone className="text-orange-500" size={20} />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Announcements</h3>
                </div>
                
                <div className="flex gap-2">
                    {messages && messages.length > 0 && messages.length !== readIds.length && (
                        <button 
                            onClick={onMarkAllRead}
                            title="Mark all as read"
                            className="text-gray-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 p-1 rounded transition"
                        >
                            <CheckCircle size={16} />
                        </button>
                    )}
                    {user?.isAdmin && (
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            className="text-xs flex items-center gap-1 font-bold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 px-2 py-1 rounded-md transition-colors"
                        >
                            <Plus size={14}/> New 
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 bg-white dark:bg-[#1a1a1b] min-h-[200px]">
                {!messages ? (
                    <div className="p-8 flex justify-center items-center">
                        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
                        <Bell size={32} className="opacity-30" />
                        <p className="text-sm">No announcements yet.</p>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {messages.map(msg => {
                            const isRead = readIds.includes(msg._id);
                            const isExpanded = expandedMsgId === msg._id;
                            
                            return (
                                <div 
                                    key={msg._id} 
                                    onClick={() => handleMessageClick(msg)}
                                    className={`relative p-4 border-b border-gray-100 dark:border-[#343536] last:border-0 cursor-pointer transition-colors ${isExpanded ? 'bg-orange-50/50 dark:bg-orange-900/10' : 'hover:bg-gray-50 dark:hover:bg-[#272729]'}`}
                                >
                                    {/* Unread Indicator */}
                                    {!isRead && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 rounded-r-full"></div>
                                    )}
                                    
                                    <div className="flex gap-3">
                                        {/* Avatar */}
                                        <div className="shrink-0 w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm p-0.5">
                                             <div className="w-full h-full bg-white dark:bg-[#1a1a1b] rounded-full flex items-center justify-center overflow-hidden">
                                                {msg.createdBy?.profilePic ? (
                                                    <img src={msg.createdBy.profilePic.startsWith('http') ? msg.createdBy.profilePic : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${msg.createdBy.profilePic}`} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Megaphone size={18} className="text-orange-500" />
                                                )}
                                             </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex flex-col">
                                                    <h4 className={`text-sm pr-2 ${!isRead ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                                                        {msg.title}
                                                    </h4>
                                                    <span className="text-[10px] text-gray-400 shrink-0 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                                                        <Clock size={10} />
                                                        {new Date(msg.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                                                    </span>
                                                </div>
                                                {user && (
                                                    <button 
                                                        onClick={(e) => handleDeleteClick(e, msg._id)} 
                                                        className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 dark:bg-red-500/10 rounded-md transition-colors shrink-0 z-10"
                                                        title={user.isAdmin ? "Manage Announcement" : "Hide Announcement"}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            
                                            <div 
                                                className={`text-sm text-gray-600 dark:text-gray-400 overflow-hidden transition-all break-words pr-6 ${isExpanded ? 'line-clamp-none mt-2 whitespace-pre-wrap' : 'line-clamp-2'}`}
                                                dangerouslySetInnerHTML={{ __html: msg.content }}
                                            />
                                            
                                            <div className="flex items-center gap-2 mt-2">
                                                 <span className="text-[10px] font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded">
                                                     Vartalap Team
                                                 </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Expand icon */}
                                    <div className={`absolute right-4 bottom-4 text-gray-400 transition-transform duration-200 pointer-events-none ${isExpanded ? 'rotate-180' : ''}`}>
                                        <ChevronDown size={14} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            <div className="p-2 border-t border-gray-100 dark:border-[#343536] bg-gray-50 dark:bg-[#272729] text-center">   
                 <span className="text-xs text-gray-400">System generated messages</span>
            </div>

            {showCreateModal && (
                <CreateAnnouncementModal 
                    onClose={() => setShowCreateModal(false)} 
                    onSuccess={handleCreateSuccess}
                />
            )}
        </div>
    );
};

export default SystemInbox;
