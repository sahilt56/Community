import { useEffect, useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import SkeletonLoader from '../components/SkeletonLoader';
import toast from 'react-hot-toast';
import CommunityMenu from '../components/CommunityMenu';
import { Globe, Search, Users, SearchX, Flag } from 'lucide-react';

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
        const res = await api.get('/api/communities');
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
        <p className="font-bold text-orange-600 flex items-center gap-2"><Flag size={16} /> Report v/{communityName}</p>
        <p className="text-xs text-gray-500">Select a reason:</p>
        <div className="flex flex-col gap-1">
          {['spam', 'abuse', 'harassment', 'hate_speech', 'misinformation', 'illegal_content'].map(reason => (
            <button
              key={reason}
              onClick={() => { toast.remove(t.id); submitCommunityReport(communityId, reason); }}
              className="text-left px-3 py-1.5 text-xs font-bold rounded hover:bg-gray-100 dark:hover:bg-[#272729] text-gray-700 dark:text-gray-300 capitalize transition-colors"
            >
              {reason.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button onClick={() => toast.remove(t.id)} className="text-xs text-gray-400 hover:text-gray-600 mt-1 text-center">Cancel</button>
      </div>
    ), { id: `report-community-${communityId}`, duration: Infinity, position: 'top-center', style: { minWidth: '280px' } });
  };

  const submitCommunityReport = async (communityId, reason) => {
    try {
      await api.post(`/api/reports`, 
        { targetType: 'community', targetId: communityId, reason }
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Explore Vartalap Communities <Globe className="text-orange-500" size={28} /></h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Find your next favorite community and join the conversation.</p>
        </div>
        <div className="relative w-full sm:w-80 md:w-96 shrink-0">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><Search size={18} /></span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {filteredCommunities.map((c, i) => (
            <div key={c._id} className={`relative group overflow-visible ${String(activeMenuId) === String(c._id) ? 'z-100' : 'z-10 hover:z-60'}`}>
              <Link
                to={`/v/${c._id}`}
                className={`card-hover bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-xl p-5 flex flex-col gap-3 transition-all shadow-sm animate-fade-up w-full h-full`}
                style={{ animationDelay: `${Math.min(i, 5) * 60}ms` }}
              >
                <div className="flex items-start gap-4">
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
                  <div className="flex-1 min-w-0 pr-6">
                    <h2 className="text-gray-900 dark:text-white font-bold text-lg group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors truncate">v/{c.name}</h2>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                      <span className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300">
                        <Users size={12} /> {c.members?.length || 1}
                      </span>
                      <span className="bg-gray-100 dark:bg-[#272729] px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        {c.topic || 'General'}
                      </span>
                      <span>•</span>
                      <span>by <span className="text-gray-900 dark:text-white font-bold">u/{c.creator?.username || 'unknown'}</span></span>
                    </div>
                  </div>
                </div>
                <p className={`text-gray-600 dark:text-gray-400 text-sm leading-relaxed mt-2 ${c.rules && c.rules.length > 0 ? 'line-clamp-2' : 'line-clamp-3'}`}>
                  {c.description ? c.description : <span className="italic opacity-60">No description provided.</span>}
                </p>

                {/* Community Rules Preview */}
                {c.rules && c.rules.length > 0 ? (
                  <div className="mt-2 bg-gray-50 dark:bg-[#272729]/50 rounded-lg p-2.5 border border-gray-100 dark:border-[#343536]">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">Rules</p>
                    <ul className="text-[11px] text-gray-600 dark:text-gray-300 flex flex-col gap-1">
                      {c.rules.slice(0, 2).map((r, idx) => (
                        <li key={idx} className="truncate flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-orange-500 shrink-0"></span> {r.title}</li>
                      ))}
                      {c.rules.length > 2 && <li className="text-[10px] text-gray-400 italic ml-2.5">+{c.rules.length - 2} more</li>}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest border border-dashed border-gray-200 dark:border-[#343536] rounded-lg p-2 bg-transparent">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 opacity-80"></span> Casual / No Strict Rules
                  </div>
                )}
                <div className="mt-auto pt-3 flex justify-end">
                  <div className="btn-press bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold px-4 py-1.5 rounded-full transition-all flex items-center gap-1">
                    Explore Community →
                  </div>
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
                <div className="absolute top-4 right-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-60">
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
              <div className="flex justify-center mb-3 text-gray-400"><SearchX size={40} strokeWidth={1.5} /></div>
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
