import React, { useEffect, useState, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import SkeletonLoader from './SkeletonLoader';
import { SocketContext } from '../context/SocketContext';
import { Home, Compass, Plus, Info, Shield, Megaphone, BookOpen } from 'lucide-react';

const LeftSidebar = () => {
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const { socket } = useContext(SocketContext) || {};

  const fetchCommunities = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await api.get('/api/communities/joined');
      setCommunities(res.data);
    } catch (err) {
      console.error("Error fetching communities for sidebar", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchCommunities();
    }
  }, [token, fetchCommunities]);

  // Real-time cross-device updates using Socket.io
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleCommunityUpdate = () => {
      fetchCommunities(true); // Fetch in background without SkeletonLoader
    };

    socket.on('user_communities_updated', handleCommunityUpdate);
    socket.on('community_updated', handleCommunityUpdate);

    return () => {
      socket.off('user_communities_updated', handleCommunityUpdate);
      socket.off('community_updated', handleCommunityUpdate);
    };
  }, [socket, currentUser, fetchCommunities]);

  return (
    <div className="w-65 shrink-0 hidden xl:block text-sm">
      <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-xl sticky top-18 overflow-hidden transition-colors shadow-sm animate-fade-up flex flex-col max-h-[calc(100vh-88px)]">
        
        <div className="overflow-y-auto no-scrollbar flex-1 flex flex-col">
          {/* Navigation Links */}
        <div className="p-3 border-b border-gray-200 dark:border-[#343536]">
          <Link to="/" className="sidebar-link flex items-center gap-3 px-3 py-2.5 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#272729] rounded-lg transition-all group">
            <Home size={20} strokeWidth={2} className="group-hover:text-orange-500 group-hover:scale-110 transition-all duration-200" />
            <span className="font-semibold text-sm">Home</span>
          </Link>
          <Link to="/explore" className="sidebar-link flex items-center gap-3 px-3 py-2.5 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#272729] rounded-lg transition-all group">
            <Compass size={20} className="text-gray-400 group-hover:text-orange-500 transition-colors duration-200" />
            <span className="font-semibold text-sm">Explore</span>
          </Link>
        </div>

        {/* Create Community Button */}
        {token && (
          <div className="p-4 border-b border-gray-200 dark:border-[#343536]">
            <Link
              to="/create-community"
              className="btn-press w-full bg-transparent hover:bg-orange-50 dark:hover:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 font-bold py-2.5 px-4 rounded-full flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={18} strokeWidth={2.5} />
              Create Community
            </Link>
          </div>
        )}

        {/* Joined Communities (Logged in only) */}
        {token && (
          <div className="p-3 pl-4 border-b border-gray-200 dark:border-[#343536]">
            <h2 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-2">Your Communities</h2>
            {loading ? (
              <div className="px-2 py-1"><SkeletonLoader /></div>
            ) : communities.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-xs px-2 py-1 italic">Join communities to see them here.</p>
            ) : (
              <div className="mt-1 flex flex-col gap-0.5">
                {communities.slice(0, 10).map((community, i) => (
                  <Link
                    key={community._id}
                    to={`/v/${community.name}`}
                    className={`sidebar-link flex items-center gap-3 px-2 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#272729] rounded-lg transition-all animate-fade-up stagger-${Math.min(i + 1, 6)}`}
                  >
                    <div className="w-6 h-6 bg-linear-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-[9px] shrink-0 shadow-sm relative overflow-hidden">
                      v/
                      {community.profilePic && (
                        <img 
                          src={community.profilePic.startsWith('http') ? community.profilePic : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${community.profilePic}`} 
                          alt="" 
                          className="absolute inset-0 w-full h-full object-cover" 
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                    </div>
                    <span className="font-medium truncate text-sm">v/{community.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resources Section (Visible to Everyone) */}
        <div className="p-3 border-b border-gray-200 dark:border-[#343536]">
          <h2 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-2">Resources</h2>
          <div className="flex flex-col gap-0.5">
            {[
              { icon: Info, label: 'About Vartalap', to: '/about' },
              { icon: BookOpen, label: 'Vartalap Blog', to: '/blog' },
              { icon: Shield, label: 'Help / Rules', to: '#' },
              { icon: Megaphone, label: 'Advertise', to: '#' },
            ].map((item) => {
              const IconComp = item.icon;
              return (
                <Link 
                  key={item.label} 
                  to={item.to}
                  className="sidebar-link flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#272729] transition-all text-gray-700 dark:text-gray-300 group"
                >
                  <IconComp size={18} strokeWidth={2} className="text-gray-500 group-hover:text-orange-500 transition-colors" />
                  <span className="font-semibold text-sm">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Developer Contact */}
        <div className="p-3 border-b border-gray-200 dark:border-[#343536]">
          <h2 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-2">Developer Support</h2>
          <div className="px-3 py-1 flex flex-col gap-1">
             <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                Contact developer for any concern:
             </p>
             <a href="mailto:vartalapsupport@gmail.com" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1.5">
                <Megaphone size={12} /> vartalapsupport@gmail.com
             </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center leading-relaxed">Vartalap INC © 2026.<br />All rights reserved.</p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;