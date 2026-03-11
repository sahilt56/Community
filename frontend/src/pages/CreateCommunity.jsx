import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const CreateCommunity = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minKarma, setMinKarma] = useState(0);
  const [minAgeDays, setMinAgeDays] = useState(0);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    // Community name should be lowercase and without spaces for cleaner URLs (reddit style)
    const formattedName = name.toLowerCase().replace(/\s+/g, '-');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.post(`${apiUrl}/api/communities/create`, 
        { name: formattedName, description, minKarma: Number(minKarma), minAgeDays: Number(minAgeDays) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Community Created! 🎉");
      // Navigate to the newly created community page
      navigate(`/r/${res.data.community._id}`);
    } catch (err) {
      console.error("Community creation error:", err);
      toast.error(err.response?.data?.message || "Error creating community");
    }
  };

  return (
    <div className="flex flex-col items-center mt-10 transition-colors">
      <div className="animate-scale-in bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-8 rounded-2xl w-full max-w-lg shadow-md transition-colors">
        <div className="text-4xl mb-3">🌐</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Create a Community</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Names cannot have spaces (e.g., "reactjs" or "learn-python").</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-gray-700 dark:text-gray-300 font-bold block mb-1.5 text-sm">Community Name</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">r/</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="focus-ring w-full bg-gray-50 dark:bg-[#272729] text-gray-900 dark:text-white border border-gray-200 dark:border-[#343536] p-3 pl-8 rounded-xl outline-none transition-all text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-gray-700 dark:text-gray-300 font-bold block mb-1.5 text-sm">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="focus-ring w-full bg-gray-50 dark:bg-[#272729] text-gray-900 dark:text-white border border-gray-200 dark:border-[#343536] p-3 rounded-xl h-24 outline-none resize-none transition-all text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-700 dark:text-gray-300 font-bold block mb-1.5 text-sm">Min Karma to Join</label>
              <input
                type="number"
                min="0"
                value={minKarma}
                onChange={(e) => setMinKarma(e.target.value)}
                className="focus-ring w-full bg-gray-50 dark:bg-[#272729] text-gray-900 dark:text-white border border-gray-200 dark:border-[#343536] p-3 rounded-xl outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="text-gray-700 dark:text-gray-300 font-bold block mb-1.5 text-sm">Min Account Age (Days)</label>
              <input
                type="number"
                min="0"
                value={minAgeDays}
                onChange={(e) => setMinAgeDays(e.target.value)}
                className="focus-ring w-full bg-gray-50 dark:bg-[#272729] text-gray-900 dark:text-white border border-gray-200 dark:border-[#343536] p-3 rounded-xl outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-press text-gray-600 dark:text-gray-300 font-bold px-6 py-2.5 rounded-full border border-gray-200 dark:border-[#343536] hover:bg-gray-50 dark:hover:bg-[#272729] transition-all text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-press bg-linear-to-r from-orange-500 to-orange-600 text-white font-bold px-6 py-2.5 rounded-full hover:from-orange-600 hover:to-orange-700 transition-all shadow-md text-sm"
            >
              🌐 Create Community
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCommunity;
