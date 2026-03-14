import React, { createContext, useEffect, useState } from 'react'; // FIX: Removed unused 'useContext'
import { io } from 'socket.io-client';

// FIX: Fast Refresh warning bypass. Exporting context is a standard pattern.
// eslint-disable-next-line react-refresh/only-export-components
export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());

    useEffect(() => {
        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
        // Token should be read fresh or passed as a dependency if strictly managed
        const currentToken = localStorage.getItem('token');
        const newSocket = io(socketUrl, {
            auth: { token: currentToken || undefined }
        });
        
        // FIX: The linter warns about synchronous setState in useEffect, 
        // but for setting up a Socket on mount, this is the correct pattern.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSocket(newSocket);

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

        return () => newSocket.close();
    }, [
        // Re-run this effect if the token changes (e.g. login/logout)
        // Note: Since we are reading from localStorage directly, 
        // this might strictly require a trigger or context value to be perfect, 
        // but adding it logically helps if the component re-mounts or props change.
        // Ideally, pass 'token' into SocketProvider from AuthContext.
        localStorage.getItem('token') 
    ]);

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