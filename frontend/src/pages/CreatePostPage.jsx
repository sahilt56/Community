import React from 'react';
import { useNavigate } from 'react-router-dom';
import CreatePost from '../components/CreatePost';

const CreatePostPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  if (!token) {
    return (
      <div className="text-center text-gray-400 mt-20">
        <p className="text-lg font-bold mb-4">Post create karne ke liye pehle Log In karein! 🛑</p>
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
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">Create a Post ✍️</h1>
      <CreatePost onPostCreated={() => navigate('/')} />
    </div>
  );
};

export default CreatePostPage;
