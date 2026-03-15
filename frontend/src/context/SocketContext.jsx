import React, { createContext, useEffect, useState } from 'react'; // FIX: Removed unused 'useContext'
import { io } from 'socket.io-client';

// FIX: Fast Refresh warning bypass. Exporting context is a standard pattern.
// eslint-disable-next-line react-refresh/only-export-components
export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());

    useEffect(() => {
        const currentToken = localStorage.getItem('token');
        if (!currentToken) return; // Don't even try to connect if not logged in

        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
        
        const newSocket = io(socketUrl, {
            auth: { token: currentToken },
            withCredentials: true // For cookie support
        });
        
        setSocket(newSocket);

        newSocket.on('connect_error', (err) => {
            console.error("Socket Connection Error:", err.message);
            // If it's an auth error, it might be due to expired token
            if (err.message.includes("Authentication error")) {
                setSocket(null);
            }
        });

        newSocket.on('online_users_list', (users) => {
            setOnlineUsers(new Set(users));
        });

        newSocket.on('user_online', (userId) => {
            setOnlineUsers((prev) => new Set([...prev, userId]));
        });

        newSocket.on('user_offline', (userId) => {
            setOnlineUsers((prev) => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        });

        return () => {
            newSocket.close();
        };
    }, [localStorage.getItem('token')]);

    // Effect to join personal room when socket and user ID are available
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (socket && token && userStr) {
            try {
                const user = JSON.parse(userStr);
                socket.emit('join_personal_room', user.id || user._id);
            } catch (err) {
                console.error("Error parsing user from localStorage for socket auth", err);
            }
        }
    }, [socket]);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};