import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Globe, Users, AlignLeft, Shield, Calendar, Plus, ShieldAlert } from 'lucide-react';

const CreateCommunity = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minAnubhav, setMinAnubhav] = useState(0);
  const [minAgeDays, setMinAgeDays] = useState(0);
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const token = localStorage.getItem('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Community name should be lowercase and without spaces for cleaner URLs
    const formattedName = name.toLowerCase().replace(/\s+/g, '-');

    try {
      const res = await api.post('/api/communities/create', 
        { name: formattedName, description, minAnubhav: Number(minAnubhav), minAgeDays: Number(minAgeDays) }
      );
      toast.success("Community Created! 🎉");
      // Navigate to the newly created community page
      navigate(`/v/${res.data.community._id}`);
    } catch (err) {
      console.error("Community creation error:", err);
      toast.error(err.response?.data?.message || "Error creating community");
    }
  };

  if (!token) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
        <p className="text-lg font-bold mb-4 flex items-center justify-center gap-2"><ShieldAlert size={22} className="text-red-500" /> Community create karne ke liye pehle Log In karein!</p>
        <button 
          onClick={() => navigate('/login')}
          className="bg-orange-600 text-white font-bold px-6 py-2 rounded-full hover:bg-orange-700 transition-all"
        >
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center mt-4 md:mt-12 transition-colors px-4 pb-10">
      <div className="animate-scale-in bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-5 sm:p-8 rounded-2xl w-full max-w-lg shadow-md transition-colors">
        <div className="w-14 h-14 bg-orange-50 dark:bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-orange-100 dark:border-orange-500/20">
          <Globe size={32} strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Create Your Community on Vartalap</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Names cannot have spaces (e.g., "reactjs" or "learn-python").</p>

        {currentUser?.disabledFeatures?.includes('community') ? (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-6 rounded-xl flex flex-col items-center justify-center text-center transition-colors">
            <ShieldAlert size={32} className="text-red-500 mb-3" />
            <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Creation Restricted</h3>
            <p className="text-sm text-red-600 dark:text-red-300/80 mt-1 max-w-md">Your Vartalap creation privileges have been temporarily disabled by an administrator.</p>
            <button onClick={() => navigate('/')} className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-bold transition-colors text-sm">
              Return to Home
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-gray-700 dark:text-gray-300 font-bold mb-1.5 text-sm flex items-center gap-1.5">
                <Users size={16} className="text-gray-400 dark:text-gray-500" /> Community Name
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">v/</span>
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
              <label className="text-gray-700 dark:text-gray-300 font-bold mb-1.5 text-sm flex items-center gap-1.5">
                <AlignLeft size={16} className="text-gray-400 dark:text-gray-500" /> Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="focus-ring w-full bg-gray-50 dark:bg-[#272729] text-gray-900 dark:text-white border border-gray-200 dark:border-[#343536] p-3 rounded-xl h-24 outline-none resize-none transition-all text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-700 dark:text-gray-300 font-bold mb-1.5 text-sm flex items-center gap-1.5">
                  <Shield size={16} className="text-gray-400 dark:text-gray-500" /> Min Anubhav to Join
                </label>
                <input
                  type="number"
                  min="0"
                  value={minAnubhav}
                  onChange={(e) => setMinAnubhav(e.target.value)}
                  className="focus-ring w-full bg-gray-50 dark:bg-[#272729] text-gray-900 dark:text-white border border-gray-200 dark:border-[#343536] p-3 rounded-xl outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="text-gray-700 dark:text-gray-300 font-bold mb-1.5 text-sm flex items-center gap-1.5">
                  <Calendar size={16} className="text-gray-400 dark:text-gray-500" /> Min Account Age (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={minAgeDays}
                  onChange={(e) => setMinAgeDays(e.target.value)}
                  className="focus-ring w-full bg-gray-50 dark:bg-[#272729] text-gray-900 dark:text-white border border-gray-200 dark:border-[#343536] p-3 rounded-xl outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn-press w-full sm:w-auto text-center text-gray-600 dark:text-gray-300 font-bold px-6 py-2.5 rounded-full border border-gray-200 dark:border-[#343536] hover:bg-gray-50 dark:hover:bg-[#272729] transition-all text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-press w-full sm:w-auto bg-linear-to-r from-orange-500 to-orange-600 text-white font-bold px-6 py-2.5 rounded-full hover:from-orange-600 hover:to-orange-700 transition-all shadow-md text-sm flex items-center justify-center gap-2"
              >
              <Plus size={18} strokeWidth={2.5} /> Create Community
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateCommunity;
