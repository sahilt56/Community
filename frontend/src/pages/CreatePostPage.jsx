import React from 'react';
import { useNavigate } from 'react-router-dom';
import CreatePost from '../components/CreatePost';
import { AlertCircle, Pencil, ShieldAlert } from 'lucide-react';

const CreatePostPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;

  if (!token) {
    return (
      <div className="text-center text-gray-400 mt-20">
        <p className="text-lg font-bold mb-4 flex items-center justify-center gap-2"><AlertCircle size={22} className="text-red-500" /> Post create karne ke liye pehle Log In karein!</p>
        <button 
          onClick={() => navigate('/login')}
          className="bg-orange-600 text-white font-bold px-6 py-2 rounded-full hover:bg-orange-700 transition-all"
        >
          Log In
        </button>
      </div>
    );
  }

  if (currentUser?.disabledFeatures?.includes('post')) {
    return (
      <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-6 rounded-xl flex flex-col items-center justify-center text-center transition-colors mt-10">
        <ShieldAlert size={32} className="text-red-500 mb-3" />
        <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Posting Restricted</h3>
        <p className="text-sm text-red-600 dark:text-red-300/80 mt-1 max-w-md">Your posting privileges have been temporarily disabled by an administrator.</p>
        <button onClick={() => navigate('/')} className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-bold transition-colors text-sm">
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors flex items-center gap-2.5"><Pencil size={24} className="text-orange-500" /> Create a Post</h1>
      <CreatePost onPostCreated={() => navigate('/')} />
    </div>
  );
};

export default CreatePostPage;
