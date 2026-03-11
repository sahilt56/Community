import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';
import SkeletonLoader from '../components/SkeletonLoader';

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');
  const { socket } = useSocket() || {};

  const [sortBy, setSortBy] = useState('hot');

  const observer = useRef();
  const lastPostElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  // FIX: Wrapped fetchPosts in useCallback
  const fetchPosts = useCallback(async (pageNum = 1, reset = false) => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.get(`${apiUrl}/api/posts?sort=${sortBy}&page=${pageNum}&limit=5`);
      setPosts(prev => reset ? res.data.posts : [...prev, ...res.data.posts]);
      setHasMore(res.data.hasMore);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  const handleShare = (postId) => {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied to clipboard! 📋");
    }).catch(err => {
      console.error("Share error:", err);
    });
  };

  const currentUser = JSON.parse(localStorage.getItem('user'));

  // Reset feed on sort change
  // FIX: Added fetchPosts to the dependency array
  useEffect(() => {
    setPage(1);
    fetchPosts(1, true);
  }, [sortBy, fetchPosts]);

  // Append posts on page change
  // FIX: Added fetchPosts to the dependency array
  useEffect(() => {
    if (page > 1) {
      fetchPosts(page);
    }
  }, [page, fetchPosts]);

  // Listen for real-time socket events for the feed
  useEffect(() => {
    if (socket) {
      // Listen for brand new posts
      const handleNewPost = (newPost) => {
        setPosts((prev) => [newPost, ...prev]);
      };

      // Listen for votes/comments on existing posts to refresh data
      // FIX: Removed the unused 'postId' argument
      const handlePostInteraction = () => {
        // Option A: Just refetch entirely
        fetchPosts(1, true); // Made sure to pass proper default args for the refetch
        
        // Option B (More optimized alternative if API supported it):
        // fetch specific post and replace in array
      };

      socket.on('new_post', handleNewPost);
      socket.on('post_interaction', handlePostInteraction);

      return () => {
        socket.off('new_post', handleNewPost);
        socket.off('post_interaction', handlePostInteraction);
      };
    }
  }, [socket, fetchPosts]); // FIX: Added fetchPosts to the dependency array

  // VOTING LOGIC
  const handleUpvote = async (postId) => {
    if (!token) {
      toast.error("Vote karne ke liye pehle Log In karein!");
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.put(`${apiUrl}/api/posts/${postId}/upvote`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPosts(page); // Kept on current page context
    } catch (err) {
      console.error("Voting error:", err);
    }
  };

  const handleDownvote = async (postId) => {
    if (!token) {
      toast.error("Vote karne ke liye pehle Log In karein!");
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.put(`${apiUrl}/api/posts/${postId}/downvote`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPosts(page); // Kept on current page context
    } catch (err) {
      console.error("Voting error:", err);
    }
  };

  return (
    <div className="">
      {/* Sorting Tabs */}
      <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-xl p-2 mb-4 flex items-center gap-1 overflow-x-auto transition-colors shadow-sm animate-fade-up">
        {['hot', 'new', 'top'].map((sortType) => (
          <button
            key={sortType}
            onClick={() => setSortBy(sortType)}
            className={`btn-press flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
              sortBy === sortType
                ? 'bg-orange-500 text-white shadow-md scale-100'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#272729] hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span className={`text-lg ${sortBy === sortType ? 'animate-bounce' : ''}`}>
              {sortType === 'hot' ? '🔥' : sortType === 'new' ? '💥' : '⬆️'}
            </span>
            <span className="capitalize">{sortType}</span>
          </button>
        ))}
      </div>
      
      <div className="flex flex-col gap-4">
        {posts.map((post, index) => {
          // Calculate net votes
          const upvotes = post.upvotes?.length || 0;
          const downvotes = post.downvotes?.length || 0;
          const netVotes = upvotes - downvotes;
          
          // Check if current user has voted
          const hasUpvoted = currentUser && post.upvotes?.includes(currentUser.id);
          const hasDownvoted = currentUser && post.downvotes?.includes(currentUser.id);

          const isLast = (posts.length === index + 1);

          return (
          <div
            key={`${post._id}-${index}`}
            ref={isLast ? lastPostElementRef : null}
            className="card-hover bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-4 rounded-xl shadow-sm transition-all animate-fade-up"
            style={{ animationDelay: `${Math.min(index, 4) * 60}ms` }}
          >
            <p className="text-xs text-gray-500 mb-2">
              Posted in <span className="text-gray-900 dark:text-white font-bold">c/{post.community?.name || 'general'}</span> • by <Link to={`/u/${post.author?.username}`} className="hover:underline hover:text-gray-900 dark:hover:text-white">u/{post.author?.username || 'user'}</Link>
            </p>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              <Link to={`/post/${post._id}`} className="hover:underline">{post.title}</Link>
            </h2>
            {post.media && post.media.length > 0 && (
              <div className={`grid gap-2 mb-4 ${post.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {post.media.map((item, idx) => (
                  <div key={idx} className="relative rounded-md overflow-hidden border border-[#343536] bg-black/20 flex items-center justify-center">
                    {item.mimetype.startsWith('video/') ? (
                      <video 
                        src={item.url.startsWith('http') ? item.url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${item.url}`} 
                        controls 
                        className="max-h-96 w-full object-cover"
                      />
                    ) : (
                      <img 
                        src={item.url.startsWith('http') ? item.url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${item.url}`} 
                        alt={`Attachment ${idx}`} 
                        className="max-h-96 w-full object-contain"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">{post.content}</p>
            
            {/* Post Actions */}
            <div className="flex items-center gap-2 sm:gap-4 text-gray-500 dark:text-gray-400 font-bold text-sm">
                
                {/* Voting UI */}
              <div className="flex items-center bg-gray-100 dark:bg-[#272729] rounded-full overflow-hidden transition-colors">
                  <div
                    onClick={() => handleUpvote(post._id)}
                    className={`btn-press flex items-center justify-center p-2 cursor-pointer transition-all ${
                      hasUpvoted ? 'text-orange-500 bg-orange-500/10 hover:bg-orange-500/20' : 'hover:bg-gray-200 dark:hover:bg-[#343536]'
                    }`}
                  >
                    <span>⬆️</span>
                  </div>
                  <span className={`px-1 sm:px-2 font-bold transition-colors ${
                    hasUpvoted ? 'text-orange-500' : hasDownvoted ? 'text-blue-500' : 'text-gray-700 dark:text-white'
                  }`}>{netVotes}</span>
                  <div
                    onClick={() => handleDownvote(post._id)}
                    className={`btn-press flex items-center justify-center p-2 cursor-pointer transition-all ${
                      hasDownvoted ? 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20' : 'hover:bg-gray-200 dark:hover:bg-[#343536]'
                    }`}
                  >
                    <span>⬇️</span>
                  </div>
                </div>

                {/* Comments Link */}
                <Link to={`/post/${post._id}`} className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#272729] px-2 py-1.5 rounded cursor-pointer transition-all">
                   <span>💬</span>
                   <span className="text-[11px] sm:text-xs">{post.comments?.length || 0} <span className="hidden sm:inline">Comments</span></span>
                </Link>

                {/* Share Button */}
                <div 
                  onClick={() => handleShare(post._id)}
                  className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#272729] px-2 py-1.5 rounded cursor-pointer transition-all"
                >
                   <span>🔗</span>
                   <span className="text-[11px] sm:text-xs">Share</span>
                </div>

            </div>
          </div>
          );
        })}
        
        {loading && (
          <>
            <SkeletonLoader />
            <SkeletonLoader />
          </>
        )}
        {!hasMore && posts.length > 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm animate-fade-in">
            <div className="text-3xl mb-2">🚀</div>
            <p className="font-bold">You've reached the end!</p>
            <p className="text-xs mt-1">Aapne saari posts dekh li hain.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;