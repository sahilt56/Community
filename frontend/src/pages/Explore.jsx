import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import SkeletonLoader from '../components/SkeletonLoader';
import toast from 'react-hot-toast';
import CommunityMenu from '../components/CommunityMenu';

const Explore = () => {
  const [communities, setCommunities] = useState([]);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await axios.get(`${apiUrl}/api/communities`);
        setCommunities(res.data);
      } catch (err) {
        console.error("Error fetching explore communities", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCommunities();
  }, []);

  const filteredCommunities = communities.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleReportCommunity = (communityId, communityName) => {
    if (!token) return toast.error("Log in to report communities!");
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <p className="font-bold text-orange-600">🚩 Report v/{communityName}</p>
        <p className="text-xs text-gray-500">Select a reason:</p>
        <div className="flex flex-col gap-1">
          {['spam', 'abuse', 'harassment', 'hate_speech', 'misinformation', 'illegal_content'].map(reason => (
            <button
              key={reason}
              onClick={() => { toast.dismiss(t.id); submitCommunityReport(communityId, reason); }}
              className="text-left px-3 py-2 text-xs font-bold rounded hover:bg-gray-100 dark:hover:bg-[#272729] capitalize transition-colors"
            >
              {reason.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button onClick={() => toast.dismiss(t.id)} className="text-xs text-gray-400 hover:text-gray-600 mt-1 text-center">Cancel</button>
      </div>
    ), { duration: Infinity, position: 'top-center', style: { minWidth: '280px' } });
  };

  const submitCommunityReport = async (communityId, reason) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.post(`${apiUrl}/api/reports`, 
        { targetType: 'community', targetId: communityId, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Community report submitted! 🛡️');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report.');
    }
  };

  return (
    <div className="mt-6 max-w-4xl mx-auto px-4 transition-colors">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 animate-fade-up">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Explore Communities 🌐</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Find your next favorite community and join the conversation.</p>
        </div>
        <div className="relative w-full md:w-80">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search communities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="focus-ring w-full bg-white dark:bg-[#1a1a1b] text-gray-900 dark:text-white border border-gray-200 dark:border-[#343536] p-3 pl-10 rounded-full outline-none transition-all text-sm shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <SkeletonLoader />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCommunities.map((c, i) => (
            <div key={c._id} className={`relative group overflow-visible ${String(activeMenuId) === String(c._id) ? 'z-[100]' : 'z-10 hover:z-[60]'}`}>
              <Link
                to={`/v/${c._id}`}
                className={`card-hover bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-xl p-5 flex items-center gap-4 transition-all shadow-sm animate-fade-up w-full h-full`}
                style={{ animationDelay: `${Math.min(i, 5) * 60}ms` }}
              >
                <div className="w-14 h-14 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 shrink-0 flex items-center justify-center text-white text-xl font-bold overflow-hidden border-2 border-white dark:border-[#1a1a1b] shadow-md relative">
                  v/
                  {c.profilePic && (
                    <img 
                      src={c.profilePic.startsWith('http') ? c.profilePic : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${c.profilePic}`} 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover" 
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-gray-900 dark:text-white font-bold group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors truncate">v/{c.name}</h2>
                  <p className="text-gray-500 text-xs line-clamp-2 mt-0.5">{c.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <span>👥 {c.members?.length || 1} Members</span>
                    <span>•</span>
                    <span>{c.topic || 'General'}</span>
                  </div>
                </div>
                <div className="btn-press opacity-0 md:group-hover:opacity-100 bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all shrink-0">
                  Join →
                </div>
              </Link>
              
              {/* Community Menu Overlay (Hiding for Creator per request) */}
              {currentUser && (
                (() => {
                  const creatorId = typeof c.creator === 'object' ? c.creator._id : c.creator;
                  const curId = currentUser.id || currentUser._id;
                  return creatorId !== curId;
                })()
              ) && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-[60]">
                  <CommunityMenu 
                    onReport={() => handleReportCommunity(c._id, c.name)}
                    canEdit={currentUser && (
                      (typeof c.creator === 'object' ? c.creator._id === (currentUser.id || currentUser._id) : c.creator === (currentUser.id || currentUser._id)) || 
                      c.moderators?.includes(currentUser.id || currentUser._id)
                    )}
                    isCreator={currentUser && (typeof c.creator === 'object' ? c.creator._id === (currentUser.id || currentUser._id) : c.creator === (currentUser.id || currentUser._id))}
                    onEdit={() => window.location.href = `/v/${c._id}`} // Redirect to edit on community page
                    onDelete={() => window.location.href = `/v/${c._id}`} // Redirect to delete on community page
                    onOpenChange={(isOpen) => setActiveMenuId(isOpen ? c._id : (prev => prev === c._id ? null : prev))}
                  />
                </div>
              )}
            </div>
          ))}
          {filteredCommunities.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-20 bg-gray-50 dark:bg-[#1a1a1b]/50 border border-dashed border-gray-300 dark:border-[#343536] rounded-xl transition-colors animate-fade-in">
              <div className="text-4xl mb-3">🧐</div>
              <p className="font-bold text-gray-700 dark:text-gray-300">No communities found</p>
              {searchTerm && <p className="text-sm mt-1">No results for "{searchTerm}"</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Explore;
