import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const LeftSidebar = () => {
  const token = localStorage.getItem('token');
  const [communities, setCommunities] = useState([]);

  useEffect(() => {
    if (token) {
      const fetchCommunities = async () => {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          const res = await axios.get(`${apiUrl}/api/communities`);
          setCommunities(res.data);
        } catch (err) {
          console.error("Error fetching communities for sidebar", err);
        }
      };
      fetchCommunities();
    }
  }, [token]);

  return (
    <div className="hidden md:block w-65 shrink-0 text-sm">
      <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-xl sticky top-18 overflow-hidden transition-colors shadow-sm animate-fade-up flex flex-col max-h-[calc(100vh-88px)]">
        
        <div className="overflow-y-auto no-scrollbar flex-1 flex flex-col">
          {/* Navigation Links */}
        <div className="p-3 border-b border-gray-200 dark:border-[#343536]">
          <Link to="/" className="sidebar-link flex items-center gap-3 px-3 py-2.5 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#272729] rounded-lg transition-all group">
            <span className="text-xl group-hover:scale-110 transition-transform duration-200">🏠</span>
            <span className="font-semibold text-sm">Home</span>
          </Link>
          <Link to="/explore" className="sidebar-link flex items-center gap-3 px-3 py-2.5 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#272729] rounded-lg transition-all group">
            <svg className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="font-semibold">Explore</span>
          </Link>
        </div>

        {/* Create Community Button */}
        {token && (
          <div className="p-4 border-b border-gray-200 dark:border-[#343536]">
            <Link
              to="/create-community"
              className="btn-press w-full bg-transparent hover:bg-orange-50 dark:hover:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 font-bold py-2.5 px-4 rounded-full flex items-center justify-center gap-2 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              Create Community
            </Link>
          </div>
        )}

        {/* Joined Communities */}
        {token ? (
          <div className="p-3 pl-4 border-b border-gray-200 dark:border-[#343536]">
            <h2 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-2">Your Communities</h2>
            {communities.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-xs px-2 py-1 italic">Join communities to see them here.</p>
            ) : (
              <div className="mt-1 flex flex-col gap-0.5">
                {communities.slice(0, 10).map((community, i) => (
                  <Link
                    key={community._id}
                    to={`/v/${community.name}`}
                    className={`sidebar-link flex items-center gap-3 px-2 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#272729] rounded-lg transition-all animate-fade-up stagger-${Math.min(i + 1, 6)}`}
                  >
                    <div className="w-6 h-6 bg-linear-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-[9px] shrink-0 shadow-sm">
                      v/
                    </div>
                    <span className="font-medium truncate text-sm">v/{community.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 border-b border-gray-200 dark:border-[#343536]">
            <h2 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-2">Resources</h2>
            <div className="flex flex-col gap-0.5">
              {[
                { icon: 'ℹ️', label: 'About Vartalap' },
                { icon: '🛡️', label: 'Help / Rules' },
                { icon: '📢', label: 'Advertise' },
              ].map(({ icon, label }) => (
                <div key={label} className="sidebar-link flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#272729] transition-all text-gray-700 dark:text-gray-300 cursor-pointer">
                  <span className="text-lg">{icon}</span>
                  <span className="font-semibold text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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