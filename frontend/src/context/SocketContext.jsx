import React, { createContext, useEffect, useState } from 'react'; // FIX: Removed unused 'useContext'
import { io } from 'socket.io-client';

// FIX: Fast Refresh warning bypass. Exporting context is a standard pattern.
// eslint-disable-next-line react-refresh/only-export-components
export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [authToken, setAuthToken] = useState(localStorage.getItem('token'));

    console.log('[Socket] Initial mount, authToken:', !!localStorage.getItem('token'));

    // Listen for storage changes (logout from other tabs or same tab)
    useEffect(() => {
        const handleStorageChange = (e) => {
            console.log('[Socket] 💾 STORAGE EVENT - key:', e.key, 'current token:', !!localStorage.getItem('token'));
            if (e.key === 'token' || !e.key) {
                // Token changed or storage was cleared
                const newToken = localStorage.getItem('token');
                console.log('[Socket] Storage change detected. Setting authToken to:', !!newToken);
                setAuthToken(newToken);
            }
        };

        // Listen for storage events (other tabs)
        window.addEventListener('storage', handleStorageChange);

        // Listen for custom auth-change event (same tab)
        const handleAuthChange = () => {
            const newToken = localStorage.getItem('token');
            console.log('[Socket] 🔔 AUTH-CHANGE EVENT RECEIVED! Current localStorage token:', !!newToken, 'Token preview:', newToken?.substring(0, 20) + '...');
            setAuthToken(newToken);
        };
        window.addEventListener('auth-change', handleAuthChange);

        console.log('[Socket] Event listeners registered successfully');

        return () => {
            console.log('[Socket] Cleaning up event listeners');
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('auth-change', handleAuthChange);
        };
    }, []);

    // Socket connection effect - triggered by authToken state changes
    useEffect(() => {
        console.log('[Socket] ⚡ authToken effect triggered:', !!authToken, '| Token:', authToken?.substring(0, 30) + '...');
        
        if (!authToken) {
            // Token is empty/removed - disconnect socket
            if (socket) {
                console.log('[Socket] ❌ Disconnecting socket due to token removal');
                socket.disconnect();
                // Defer state update to avoid cascading render warning
                setTimeout(() => setSocket(null), 0);
            }
            console.log('[Socket] ⏸️ No authToken, socket remains null');
            return;
        }

        // Token exists - connect/reconnect socket
        console.log('[Socket] ✅ CONNECTING SOCKET with new token');
        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
        console.log('[Socket] Socket URL:', socketUrl);
        
        // Close old socket if exists before creating new one
        if (socket) {
            console.log('[Socket] Closing old socket before creating new one');
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
            console.log('[Socket] ✅ SOCKET CONNECTED SUCCESSFULLY');
        });

        newSocket.on('connect_error', (err) => {
            console.error('[Socket] ❌ Connection Error:', err.message);
            // If it's an auth error, it might be due to expired token
            if (err.message.includes("Authentication error")) {
                console.warn('[Socket] Auth error, will reconnect when token updates');
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
            console.log('[Socket] Cleaning up socket connection');
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

    return (
        <SocketContext.Provider value={{ socket, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};