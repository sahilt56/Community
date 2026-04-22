import React, { createContext, useEffect, useState, useMemo } from 'react'; // FIX: Added useMemo
import { io } from 'socket.io-client';

// FIX: Fast Refresh warning bypass. Exporting context is a standard pattern.
// eslint-disable-next-line react-refresh/only-export-components
export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [authToken, setAuthToken] = useState(localStorage.getItem('token'));



    // Listen for storage changes (logout from other tabs or same tab)
    useEffect(() => {
        const handleStorageChange = (e) => {

            if (e.key === 'token' || !e.key) {
                // Token changed or storage was cleared
                const newToken = localStorage.getItem('token');

                setAuthToken(newToken);
            }
        };

        // Listen for storage events (other tabs)
        window.addEventListener('storage', handleStorageChange);

        // Listen for custom auth-change event (same tab)
        const handleAuthChange = () => {
            const newToken = localStorage.getItem('token');

            setAuthToken(newToken);
        };
        window.addEventListener('auth-change', handleAuthChange);



        return () => {

            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('auth-change', handleAuthChange);
        };
    }, []);

    // Socket connection effect - triggered by authToken state changes
    useEffect(() => {

        
        if (!authToken) {
            // Token is empty/removed - disconnect socket
            if (socket) {

                socket.disconnect();
                // Defer state update to avoid cascading render warning
                setTimeout(() => setSocket(null), 0);
            }

            return;
        }

        // Token exists - connect/reconnect socket

        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

        
        // Close old socket if exists before creating new one
        if (socket) {

            socket.disconnect();
        }

        const newSocket = io(socketUrl, {
            auth: { token: authToken },
            withCredentials: true, // For cookie support
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
        });
        
        setSocket(newSocket);

        newSocket.on('connect', () => {

        });

        newSocket.on('connect_error', (err) => {

            // If it's an auth error, it might be due to expired token
            if (err.message.includes("Authentication error")) {

                setSocket(null);
            }
        });

        newSocket.on('online_users_list', (users) => {
            const normalizedUsers = (users || []).map(id => String(id));
            setOnlineUsers(new Set(normalizedUsers));
        });

        newSocket.on('user_online', (userId) => {
            if (!userId) return;
            const normalizedId = String(userId);
            setOnlineUsers((prev) => new Set([...prev, normalizedId]));
        });

        newSocket.on('user_offline', (userId) => {
            if (!userId) return;
            const normalizedId = String(userId);
            setOnlineUsers((prev) => {
                const newSet = new Set(prev);
                newSet.delete(normalizedId);
                return newSet;
            });
        });

        return () => {

            newSocket.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authToken]);

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

    const value = useMemo(() => ({ socket, onlineUsers }), [socket, onlineUsers]);

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};