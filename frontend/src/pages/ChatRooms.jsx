import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SocketContext } from '../context/SocketContext';
import api from '../api';
import toast from 'react-hot-toast';
import { Plus, Users, Clock, AlertTriangle, Lock, Unlock } from 'lucide-react';

const ChatRooms = () => {
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const { socket } = useContext(SocketContext);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = () => {
             const userStr = localStorage.getItem('user');
             if (userStr) {
                 setCurrentUser(JSON.parse(userStr));
             } else {
                 setCurrentUser(null);
             }
        };
        fetchUser();

        window.addEventListener('storage', fetchUser);
        window.addEventListener('auth-change', fetchUser);
        return () => {
            window.removeEventListener('storage', fetchUser);
            window.removeEventListener('auth-change', fetchUser);
        };
    }, []);

    const fetchRooms = async () => {
        try {
            const res = await api.get('/api/chat');
            setRooms(res.data);
        } catch (err) {
            toast.error("Failed to load chat rooms.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();

        if (socket) {
            socket.on('new_chat_room', (room) => {
                setRooms(prev => [room, ...prev]);
            });

            socket.on('room_removed', (roomId) => {
                setRooms(prev => prev.filter(r => r._id !== roomId));
            });

            socket.on('room_invite', (data) => {
                // If it's the current user getting invited
                if (currentUser && data.invitedUserId === currentUser.id) {
                    toast.success(`You were invited to room: ${data.roomName}`, { icon: '🔑', duration: 5000 });
                    fetchRooms(); // refresh the background lobby to get the updated participant arrays 
                }
            });
        }

        return () => {
            if (socket) {
                socket.off('new_chat_room');
                socket.off('room_removed');
                socket.off('room_invite');
            }
        };
    }, [socket]);

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        if (!newRoomName.trim()) return;

        setIsCreating(true);
        try {
            const res = await api.post('/api/chat', { name: newRoomName });
            toast.success("Room created! Auto-destruct timer will start when closed.");
            navigate(`/chat/${res.data._id}`);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create room.");
        } finally {
            setIsCreating(false);
            setNewRoomName('');
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 mt-6 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        🔥 Vartalap Rooms (Self-Destructing)
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Chat, share code, and send media. Data is permanently erased 2 minutes after room closure.
                    </p>
                </div>
            </div>

            {/* Create Room Box */}
            {currentUser && (
                <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-6 rounded-xl shadow-sm mb-8 transition-colors">
                    <form onSubmit={handleCreateRoom} className="flex flex-col sm:flex-row gap-3">
                        <input 
                            type="text" 
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            placeholder="Naam likhiye room ka (e.g. 'Midnight Debugging')..."
                            className="flex-grow bg-gray-50 dark:bg-[#272729] border border-gray-300 dark:border-[#343536] text-gray-900 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                            maxLength={50}
                            required
                        />
                        <button 
                            type="submit" 
                            disabled={isCreating}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                        >
                            <Plus size={20} /> {isCreating ? 'Creating...' : 'Create Room'}
                        </button>
                    </form>
                </div>
            )}

            {/* Active Rooms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isLoading ? (
                    <div className="col-span-full text-center py-10 text-gray-500">Loading active rooms...</div>
                ) : rooms.length === 0 ? (
                    <div className="col-span-full text-center py-16 bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-xl flex flex-col items-center">
                        <Clock size={48} className="text-gray-400 mb-4" />
                        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">No Active Rooms</h3>
                        <p className="text-gray-500 mt-2">Sab sannata hai. Apna room banaiye!</p>
                    </div>
                ) : (
                    rooms.map(room => (
                        <div 
                            key={room._id} 
                            onClick={(e) => {
                                e.stopPropagation();
                                const isParticipant = room.participants?.some(p => p._id === currentUser?.id || p === currentUser?.id);
                                const isCreator = room.creator?._id === currentUser?.id || room.creator === currentUser?.id;
                                if (isParticipant || isCreator || currentUser?.isAdmin) {
                                    navigate(`/chat/${room._id}`);
                                } else {
                                    toast.error("Private Room: You need an invitation from the creator to join.");
                                }
                            }}
                            className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-5 rounded-xl hover:border-orange-500 dark:hover:border-orange-500 transition-all shadow-sm group relative overflow-hidden flex flex-col justify-between h-36 cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
                            
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors">
                                    {room.name}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                    Created by <span className="font-bold">u/{room.creator?.username}</span>
                                </p>
                            </div>

                            <div className="flex justify-between items-end mt-4">
                                <span className="flex items-center gap-1 text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-md">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Active
                                </span>
                                
                                <div className="flex items-center gap-2">
                                    { /* Security Indicator */ }
                                    <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium bg-gray-100 dark:bg-[#272729] px-2.5 py-1 rounded-md">
                                        { (room.participants?.some(p => p._id === currentUser?.id || p === currentUser?.id) || room.creator?._id === currentUser?.id || currentUser?.isAdmin) 
                                                ? <Unlock size={14} className="text-green-500" />
                                                : <Lock size={14} className="text-red-500" />
                                        }
                                    </span>
                                    <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium bg-gray-100 dark:bg-[#272729] px-2.5 py-1 rounded-md">
                                        <Users size={14} /> {room.participants?.length || 1}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-10 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle size={24} className="text-orange-600 shrink-0 mt-0.5" />
                <p className="text-sm text-orange-800 dark:text-orange-300 leading-relaxed font-medium">
                    Disclaimer: These rooms are fully ephemeral. Once closed by the creator, the 2-minute self-destruct sequence begins. <br className="hidden sm:block" />
                    <strong>No backups are stored. Everything (including media) is wiped permanently from the database and buckets.</strong> 💥
                </p>
            </div>
        </div>
    );
};

export default ChatRooms;
