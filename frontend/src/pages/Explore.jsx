import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import SkeletonLoader from '../components/SkeletonLoader';

const Explore = () => {
  const [communities, setCommunities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

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
            <Link
              key={c._id}
              to={`/v/${c._id}`}
              className={`card-hover bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-xl p-5 flex items-center gap-4 transition-all group shadow-sm animate-fade-up`}
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
              <div className="btn-press opacity-0 group-hover:opacity-100 bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all shrink-0">
                Join →
              </div>
            </Link>
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
