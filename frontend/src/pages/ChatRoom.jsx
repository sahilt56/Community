import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SocketContext } from '../context/SocketContext';
import api from '../api';
import toast from 'react-hot-toast';
import EmojiPicker from 'emoji-picker-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Send, Image as ImageIcon, Code, Smile, LogOut, Trash2, X, AlertOctagon, UserPlus, Search, CheckCircle, Edit2, Reply, Settings, UserMinus } from 'lucide-react';
import useSearch from '../hooks/useSearch';

const ChatRoom = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { socket } = useContext(SocketContext);
    const currentUser = JSON.parse(localStorage.getItem('user'));
    
    // State
    const [room, setRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    
    // Inputs
    const [textInput, setTextInput] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    
    // Code Modal
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [codeSnippet, setCodeSnippet] = useState('');
    
    // Media Upload
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Advanced Features State
    const [replyTo, setReplyTo] = useState(null);
    const [editingMessageId, setEditingMessageId] = useState(null);

    // Add Member Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const { results: memberSearchResults, isSearching: isMemberSearching } = useSearch(memberSearchTerm);
    const [addingUserIds, setAddingUserIds] = useState([]);

    // Initial Fetch
    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const res = await api.get(`/api/chat/${id}`);
                setRoom(res.data.room);
                setMessages(res.data.messages);
                scrollToBottom();
            } catch (err) {
                toast.error(err.response?.data?.message || "Room not found or destroyed.");
                navigate('/chat');
            } finally {
                setIsLoading(false);
            }
        };
        fetchRoom();
    }, [id, navigate]);

    // Socket Connections
    useEffect(() => {
        if (socket && room && room.status === 'active') {
            socket.emit('join_chat_room', id);

            socket.on('receive_chat_message', (msg) => {
                setMessages(prev => [...prev, msg]);
                scrollToBottom();
            });

            socket.on('room_closed', (data) => {
                toast.error(data.message, { duration: 6000, icon: '🚨' });
                setRoom(prev => ({ ...prev, status: 'closed' }));
            });

            socket.on('member_added', (data) => {
                setRoom(prev => ({ ...prev, participants: data.participants }));
                if (data.newMemberId === currentUser?.id) {
                     toast.success("You were added to this private room!");
                }
            });

            socket.on('message_deleted', (msgId) => {
                setMessages(prev => prev.filter(m => m._id !== msgId));
            });

            socket.on('message_edited', (updatedMsg) => {
                setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
            });

            socket.on('member_kicked', (data) => {
                if (data.userId === currentUser?.id) {
                    toast.error("You have been kicked from the room.", { icon: '🚪' });
                    navigate('/chat');
                } else {
                    // Refetch participants or let backend populate it via another event?
                    // The backend returns it in the HTTP response, but for sockets we can just remove them
                    setRoom(prev => ({ ...prev, participants: prev.participants.filter(p => p._id !== data.userId && p !== data.userId) }));
                }
            });

            socket.on('room_settings_updated', (data) => {
                setRoom(prev => ({ ...prev, membersCanInvite: data.membersCanInvite }));
            });
        }

        return () => {
            if (socket) {
                socket.emit('leave_chat_room', id);
                socket.off('receive_chat_message');
                socket.off('room_closed');
                socket.off('member_added');
                socket.off('message_deleted');
                socket.off('message_edited');
                socket.off('member_kicked');
                socket.off('room_settings_updated');
            }
        };
    }, [socket, id, room, currentUser?.id, navigate]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // Chat Actions
    const handleSendMessage = async (e) => {
        e?.preventDefault();
        if (!textInput.trim() && !codeSnippet.trim()) return;

        if (editingMessageId) {
            try {
                await api.put(`/api/chat/${id}/messages/${editingMessageId}`, {
                    text: textInput.trim(),
                    codeSnippet: codeSnippet.trim()
                });
                setEditingMessageId(null);
                setTextInput('');
                setCodeSnippet('');
                setShowCodeModal(false);
                setShowEmojiPicker(false);
            } catch {
                toast.error("Failed to edit message");
            }
            return;
        }

        const data = {
            roomId: id,
            text: textInput.trim(),
            codeSnippet: codeSnippet.trim(),
            media: [],
            replyToId: replyTo ? replyTo._id : null
        };

        socket.emit('send_chat_message', data);
        
        setTextInput('');
        setCodeSnippet('');
        setShowCodeModal(false);
        setShowEmojiPicker(false);
        setReplyTo(null);
    };

    const handleDeleteMessage = async (msgId) => {
        if (!window.confirm("Delete this message? It will be removed for everyone.")) return;
        try {
            await api.delete(`/api/chat/${id}/messages/${msgId}`);
            // UI updates via socket
        } catch {
            toast.error("Failed to delete message");
        }
    };

    const handleEditInitiate = (msg) => {
        setEditingMessageId(msg._id);
        setTextInput(msg.text || '');
        setCodeSnippet(msg.codeSnippet || '');
        setReplyTo(null); // Cancel any reply in progress
        if (msg.codeSnippet) setShowCodeModal(true);
    };

    const handleKickMember = async (userId) => {
        if (!window.confirm("Kick this member from the room?")) return;
        try {
            const res = await api.post(`/api/chat/${id}/kick-member`, { userId });
            setRoom(prev => ({ ...prev, participants: res.data.participants }));
            toast.success("Member kicked");
        } catch(err) {
            toast.error(err.response?.data?.message || "Failed to kick member");
        }
    };

    const handleToggleSettings = async () => {
        try {
            const res = await api.put(`/api/chat/${id}/settings`);
            // UI updates via socket
            toast.success(res.data.membersCanInvite ? "Participants can now invite others!" : "Only you can invite others.");
        } catch {
            toast.error("Failed to update settings");
        }
    };

    const handleMediaUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            return toast.error("File size must be less than 10MB");
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('media', file);

        try {
            const res = await api.post('/api/upload', formData);
            
            // Emit directly with media array
            socket.emit('send_chat_message', {
                roomId: id,
                text: '',
                codeSnippet: '',
                media: [{
                    url: res.data.url,
                    public_id: res.data.public_id,
                    type: file.type.startsWith('video/') ? 'video' : 'image'
                }]
            });
            
        } catch {
            toast.error("Media upload failed.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleEmojiClick = (emojiObject) => {
        setTextInput(prev => prev + emojiObject.emoji);
    };

    const handleAddMember = async (userId) => {
        setAddingUserIds(prev => [...prev, userId]);
        try {
            const res = await api.post(`/api/chat/${id}/add-member`, { userId });
            toast.success("Member added successfully!");
            setRoom(prev => ({ ...prev, participants: res.data.participants }));
            setMemberSearchTerm(''); // Clear search on success
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to add member.");
        } finally {
            setAddingUserIds(prev => prev.filter(id => id !== userId));
        }
    };

    // Destruction
    const closeRoom = async () => {
        if (!window.confirm("Are you sure? This will disconnect everyone and permanently destroy the room in 2 minutes.")) return;
        setIsClosing(true);
        try {
            await api.put(`/api/chat/${id}/close`);
            // The Socket listener will pick up 'room_closed'
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to close room.");
            setIsClosing(false);
        }
    };

    // Derived State
    const isOwner = currentUser && room && (room.creator._id === currentUser.id || room.creator === currentUser.id);
    const canInvite = isOwner || (room?.status === 'active' && room?.membersCanInvite);

    if (isLoading) return <div className="text-center mt-20">Loading Temporary Room...</div>;
    if (!room) return <div className="text-center mt-20 text-red-500">Room doesn't exist.</div>;

    return (
        <div className="max-w-5xl mx-auto md:p-4 h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] flex flex-col">
            
            {/* Header */}
            <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-4 rounded-t-xl flex justify-between items-center z-10 shadow-sm relative shrink-0">
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex w-10 h-10 bg-orange-500 text-white rounded-full items-center justify-center font-bold text-xl uppercase">
                        {room.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white leading-tight flex items-center gap-2">
                            {room.name}
                            {room.status === 'closed' && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">Self-Destructing</span>}
                        </h2>
                        <p className="text-xs text-gray-500">Created by u/{room.creator?.username}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {canInvite && room.status === 'active' && (
                        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-bold transition-colors border border-blue-200 dark:border-blue-900/50 mr-1 sm:mr-3">
                            <UserPlus size={16} /> <span className="hidden md:inline">Add Member</span>
                        </button>
                    )}
                    {isOwner && room.status === 'active' && (
                        <button onClick={handleToggleSettings} className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-lg text-sm text-gray-600 dark:text-gray-300 font-bold transition-colors border border-transparent dark:border-[#343536]" title="Toggle Member Invites">
                            <Settings size={18} className={room.membersCanInvite ? "text-green-500" : "text-gray-400"} />
                        </button>
                    )}
                    <button onClick={() => navigate('/chat')} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-lg text-sm text-gray-600 dark:text-gray-300 font-bold transition-colors border border-transparent dark:border-[#343536]">
                        <LogOut size={16} /> <span className="hidden sm:inline">Leave</span>
                    </button>
                    {isOwner && room.status === 'active' && (
                        <button disabled={isClosing} onClick={closeRoom} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 rounded-lg text-sm font-bold transition-colors border border-red-200 dark:border-red-900/50 min-w-max">
                            <Trash2 size={16} /> <span className="hidden sm:inline">{isClosing ? '...' : 'Close & Destroy'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-gray-50 dark:bg-[#030303] overflow-y-auto p-4 md:p-6 flex flex-col gap-4 border-x border-gray-200 dark:border-[#343536] relative">
                
                {room.status === 'closed' && (
                    <div className="absolute top-4 left-4 right-4 bg-red-600/90 text-white p-3 rounded-lg text-center font-bold text-sm shadow-xl backdrop-blur-sm z-20 flex items-center justify-center gap-2">
                        <AlertOctagon size={20} className="animate-pulse" /> This room is closed! It will be permanently wiped exactly 2 minutes from closure. 
                    </div>
                )}

                {messages.length === 0 && (
                    <div className="m-auto text-center text-gray-400 dark:text-gray-600 flex flex-col items-center gap-2">
                        <Smile size={48} className="opacity-50" />
                        <p className="font-medium text-lg">No messages yet.</p>
                        <p className="text-sm">Start the conversation! Code snippets and images allowed.</p>
                    </div>
                )}

                {/* Add Member Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] w-full max-w-sm rounded-xl shadow-2xl p-6 flex flex-col max-h-[80vh]">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 pt-1"><UserPlus size={20} className="text-orange-500"/> Invite Member</h3>
                                <button onClick={() => {setShowAddModal(false); setMemberSearchTerm('');}} className="p-1 hover:bg-gray-100 dark:hover:bg-[#272729] rounded-full text-gray-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="relative mb-4">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search username to add..." 
                                    value={memberSearchTerm}
                                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#030303] border border-gray-200 dark:border-[#343536] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                                    autoFocus
                                />
                                {isMemberSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-orange-500 border-t-transparent animate-spin rounded-full"></div>}
                            </div>

                            <div className="flex-1 overflow-y-auto min-h-25 border border-gray-100 dark:border-[#343536] rounded-lg bg-gray-50/50 dark:bg-[#030303]/50">
                                {memberSearchTerm.trim() === '' ? (
                                    <div className="flex flex-col">
                                        <div className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 dark:bg-[#1a1a1b] border-b border-gray-200 dark:border-[#343536] sticky top-0 z-10">Current Participants ({room.participants?.length || 0})</div>
                                        {room.participants?.map(p => {
                                            const isSelf = p._id === currentUser?.id;
                                            const isCreator = room.creator._id === p._id || room.creator === p._id;
                                            return (
                                                <div key={p._id || p} className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-[#343536] last:border-0 hover:bg-white dark:hover:bg-[#1a1a1b] transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                                            {p.profilePic ? <img src={p.profilePic.startsWith('http') ? p.profilePic : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${p.profilePic}`} className="w-full h-full object-cover rounded-full" alt=""/> : (p.username?.charAt(0) || '?')}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">u/{p.username} {isSelf && "(You)"}</span>
                                                        {isCreator && <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded ml-1">Creator</span>}
                                                    </div>
                                                    {isOwner && !isCreator && (
                                                        <button onClick={() => handleKickMember(p._id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-md transition-colors" title="Kick Member">
                                                            <UserMinus size={16}/>
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (!memberSearchResults?.users || memberSearchResults.users.length === 0) ? (
                                    <div className="p-4 text-center text-sm text-gray-500">No users found for '{memberSearchTerm}'</div>
                                ) : (
                                    <div className="flex flex-col">
                                        {memberSearchResults.users.map(u => {
                                            const isAlreadyInRoom = room.participants?.some(p => p._id === u._id || p === u._id);
                                            const isAdding = addingUserIds.includes(u._id);
                                            
                                            return (
                                                <div key={u._id} className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-[#343536] last:border-0 hover:bg-white dark:hover:bg-[#1a1a1b] transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                                            {u.profilePic ? <img src={u.profilePic.startsWith('http') ? u.profilePic : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${u.profilePic}`} className="w-full h-full object-cover rounded-full" alt=""/> : u.username.charAt(0)}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">u/{u.username}</span>
                                                    </div>
                                                    
                                                    {isAlreadyInRoom ? (
                                                        <span className="text-[10px] font-bold bg-gray-200 dark:bg-gray-800 text-gray-500 px-2 py-1 rounded-md flex items-center gap-1"><CheckCircle size={12}/>Added</span>
                                                    ) : (
                                                        <button 
                                                            disabled={isAdding}
                                                            onClick={() => handleAddMember(u._id)}
                                                            className="text-xs font-bold bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                                                        >
                                                            {isAdding ? '...' : 'Add'}
                                                        </button>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {messages.map((msg, index) => {
                    const isMe = msg.sender._id === currentUser.id;
                    return (
                        <div key={index} className={`flex w-full group relative ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <span className={`text-[10px] mb-1 px-1 font-bold flex items-center gap-1 ${isMe ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {isMe ? 'You' : `u/${msg.sender?.username}`} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {msg.isEdited && <span className="text-[9px] italic ml-1">(edited)</span>}
                                </span>
                                
                                <div className="flex items-center gap-2 relative">
                                    {/* Action Buttons for Others (Reply Only) */}
                                    {!isMe && (
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-[#1a1a1b] shadow-sm border border-gray-200 dark:border-[#343536] rounded-lg px-2 py-1 absolute left-full ml-2 z-10 shrink-0">
                                            <button onClick={() => setReplyTo(msg)} className="text-gray-400 hover:text-blue-500 p-1 px-1.5" title="Reply"><Reply size={14}/></button>
                                        </div>
                                    )}

                                    <div className={`p-3 rounded-2xl shadow-xs overflow-hidden flex flex-col ${
                                        isMe 
                                            ? 'bg-orange-600 text-white rounded-tr-none' 
                                            : 'bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] text-gray-900 dark:text-white rounded-tl-none'
                                    }`}>
                                        
                                        {/* Reply Context Block */}
                                        {msg.replyTo && (
                                            <div className="mb-2 p-2 rounded bg-black/10 dark:bg-white/5 border-l-2 border-current text-xs opacity-80 w-full overflow-hidden">
                                                <span className="font-bold mb-0.5 block truncate">Replying to u/{msg.replyTo.sender?.username || 'Unknown'}</span>
                                                <span className="truncate block opacity-80">{msg.replyTo.text || (msg.replyTo.media?.length ? '[Attachment]' : (msg.replyTo.codeSnippet ? '[Code Snippet]' : 'Message...'))}</span>
                                            </div>
                                        )}

                                        {/* Text Content */}
                                        {msg.text && (
                                            <p className="whitespace-pre-wrap text-[15px] leading-relaxed wrap-break-word">{msg.text}</p>
                                        )}

                                        {/* Code Snippet */}
                                        {msg.codeSnippet && (
                                            <div className={`mt-2 rounded-lg overflow-hidden text-sm w-full max-w-full ${msg.text ? 'border-t border-white/20 pt-2' : ''}`}>
                                                <SyntaxHighlighter language="javascript" style={vscDarkPlus} customStyle={{ margin: 0, padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                                                    {msg.codeSnippet}
                                                </SyntaxHighlighter>
                                            </div>
                                        )}

                                        {/* Media Content */}
                                        {msg.media && msg.media.length > 0 && (
                                            <div className={`mt-2 flex flex-wrap gap-2 w-full ${msg.text || msg.codeSnippet ? 'pt-2' : ''}`}>
                                                {msg.media.map((m, i) => (
                                                    <div key={i} className="max-w-70 rounded-lg overflow-hidden border border-black/10">
                                                        {m.type === 'video' ? (
                                                            <video src={m.url} controls className="w-full h-auto max-h-64 object-cover" />
                                                        ) : (
                                                            <a href={m.url} target="_blank" rel="noreferrer">
                                                                <img src={m.url} alt="Attached" className="w-full h-auto max-h-64 object-cover hover:opacity-90 transition-opacity" />
                                                            </a>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons for Me (Reply, Edit, Delete) */}
                                    {isMe && (
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-[#1a1a1b] shadow-sm border border-gray-200 dark:border-[#343536] rounded-lg px-2 py-1 absolute right-full mr-2 z-10 shrink-0">
                                            <button onClick={() => setReplyTo(msg)} className="text-gray-400 hover:text-blue-500 p-1" title="Reply"><Reply size={14}/></button>
                                            <button onClick={() => handleEditInitiate(msg)} className="text-gray-400 hover:text-green-500 p-1" title="Edit"><Edit2 size={13}/></button>
                                            <button onClick={() => handleDeleteMessage(msg._id)} className="text-gray-400 hover:text-red-500 p-1" title="Delete"><Trash2 size={14}/></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {room.status === 'active' ? (
                <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-3 rounded-b-xl shrink-0 relative shadow-[0_-4px_10px_rgba(0,0,0,0.05)] dark:shadow-none">
                    
                    {/* Reply / Edit Banner */}
                    {(replyTo || editingMessageId) && (
                        <div className="bg-orange-50 dark:bg-orange-900/10 text-orange-800 dark:text-orange-200 text-xs px-3 py-1.5 mb-2 rounded-lg flex justify-between items-center border border-orange-200 dark:border-orange-500/20">
                            <div className="flex items-center gap-1.5 truncate">
                                {replyTo ? <Reply size={14}/> : <Edit2 size={14}/>}
                                <span className="font-bold truncate">
                                    {replyTo ? `Replying to u/${replyTo.sender?.username || 'Unknown'}` : 'Editing Message'}
                                </span>
                            </div>
                            <button 
                                onClick={() => { setReplyTo(null); setEditingMessageId(null); setTextInput(''); setCodeSnippet(''); }} 
                                className="text-orange-600 dark:text-orange-400 hover:text-red-500 p-0.5"
                                type="button"
                            >
                                <X size={14}/>
                            </button>
                        </div>
                    )}

                    {/* Emoji Picker Popup */}
                    {showEmojiPicker && (
                        <div className="absolute bottom-full left-4 mb-2 z-50 shadow-2xl rounded-xl overflow-hidden border border-gray-200 dark:border-[#343536]">
                            <EmojiPicker onEmojiClick={handleEmojiClick} theme="auto" />
                        </div>
                    )}

                    {/* Code Snippet Modal */}
                    {showCodeModal && (
                        <div className="absolute bottom-full left-0 w-full p-4 mb-2 z-40 bg-white/95 dark:bg-[#1a1a1b]/95 backdrop-blur-md border border-gray-200 dark:border-[#343536] rounded-t-xl shadow-2xl">
                           <div className="flex justify-between items-center mb-2">
                               <h4 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2"><Code size={16}/> Paste Code Snippet</h4>
                               <button onClick={() => setShowCodeModal(false)} className="text-gray-500 hover:text-red-500 p-1"><X size={18}/></button>
                           </div>
                           <textarea 
                               value={codeSnippet}
                               onChange={(e) => setCodeSnippet(e.target.value)}
                               placeholder="Paste your code here..."
                               className="w-full h-40 bg-gray-900 text-green-400 p-3 font-mono text-sm rounded-lg focus:outline-none resize-none border border-[#343536]"
                           />
                           <div className="flex justify-end mt-2">
                               <button onClick={handleSendMessage} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-1.5 px-4 rounded-lg flex items-center gap-2">
                                   <Send size={14}/> Send Code
                               </button>
                           </div>
                        </div>
                    )}

                    <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                        {/* Hidden File Input */}
                        <input type="file" ref={fileInputRef} onChange={handleMediaUpload} accept="image/*,video/*" className="hidden" />
                        
                        <div className="flex items-center gap-1 shrink-0 pb-1.5">
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-full transition-all disabled:opacity-50">
                                {isUploading ? <span className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin flex"></span> : <ImageIcon size={22} />}
                            </button>
                            <button type="button" onClick={() => setShowCodeModal(!showCodeModal)} className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-full transition-all hidden sm:flex">
                                <Code size={22} />
                            </button>
                            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-gray-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 rounded-full transition-all hidden sm:flex">
                                <Smile size={22} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden rounded-2xl bg-gray-100 dark:bg-[#272729] border border-transparent focus-within:border-orange-500 dark:focus-within:border-orange-500 transition-colors">
                            <textarea
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                                placeholder="Type a message..."
                                className="w-full max-h-32 min-h-11 bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-sm text-gray-900 dark:text-white"
                                rows={1}
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={(!textInput.trim() && !codeSnippet.trim()) || isUploading}
                            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-full p-3 transition-colors flex shrink-0 shadow-md disabled:shadow-none mb-0.5"
                        >
                            <Send size={18} className="translate-x-px" />
                        </button>
                    </form>
                </div>
            ) : (
                <div className="bg-gray-100 dark:bg-[#272729] p-4 rounded-b-xl text-center text-gray-500 font-bold border-t border-gray-200 dark:border-[#343536]">
                    This room is closed and no longer accepts messages.
                </div>
            )}
        </div>
    );
};

export default ChatRoom;
