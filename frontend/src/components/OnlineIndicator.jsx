import React, { useContext } from 'react';
import { SocketContext } from '../context/SocketContext';

const OnlineIndicator = ({ userId, size = 'w-3 h-3', border = 'border-2 border-white dark:border-[#1a1a1b]' }) => {
    const context = useContext(SocketContext);
    const onlineUsers = context?.onlineUsers || new Set();
    const isOnline = onlineUsers.has(userId);

    return (
        <div
            className={`${size} rounded-full ${border} ${isOnline ? 'bg-green-500' : 'bg-gray-400'} absolute bottom-0 right-0 transition-all duration-300`}
            style={isOnline ? { animation: 'pulseDot 2s infinite' } : {}}
            title={isOnline ? 'Online' : 'Offline'}
        />
    );
};

export default OnlineIndicator;
