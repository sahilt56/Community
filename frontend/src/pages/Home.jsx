import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import { SocketContext } from '../context/SocketContext';
import toast from 'react-hot-toast';
import SkeletonLoader from '../components/SkeletonLoader';
import PostMenu from '../components/PostMenu';
import PollView from '../components/PollView';
import { Flame, Sparkles, ArrowUp, ArrowDown, MessageCircle, Share, AlertTriangle, CheckCircle, Award } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Helmet } from 'react-helmet-async';

const sanitizeOptions = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] || []), 'style', 'className', 'class'],
    iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder'],
    video: ['src', 'controls', 'class', 'className', 'poster', 'loop', 'muted', 'playsinline']
  },
  tagNames: [...(defaultSchema.tagNames || []), 'mark', 'iframe', 'video', 'source', 'span', 'figure', 'figcaption'],
};

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');
  const { socket } = useContext(SocketContext) || {};

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
      const res = await api.get(`/api/posts?sort=${sortBy}&page=${pageNum}&limit=5`);
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
    // Toggle-off supported by backend logic
    const post = posts.find(p => p._id === postId);
    if (!post) return;

    try {
      const res = await api.put(`/api/posts/${postId}/upvote`, {});
      // Merge only the votes to preserve populated author/community
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, upvotes: res.data.post.upvotes, downvotes: res.data.post.downvotes } : p));
    } catch (err) {
      console.error("Voting error:", err);
    }
  };

  const handleDownvote = async (postId) => {
    if (!token) {
      toast.error("Vote karne ke liye pehle Log In karein!");
      return;
    }
    // Toggle-off supported by backend logic
    const post = posts.find(p => p._id === postId);
    if (!post) return;

    try {
      const res = await api.put(`/api/posts/${postId}/downvote`, {});
      // Merge only the votes to preserve populated author/community
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, upvotes: res.data.post.upvotes, downvotes: res.data.post.downvotes } : p));
    } catch (err) {
      console.error("Voting error:", err);
    }
  };

  const handleSave = async (postId) => {
    if (!token) return toast.error("Log in to save posts!");
    try {
      const res = await api.put(`/api/posts/${postId}/save`, {});
      setPosts(prev => prev.map(p => 
        p._id === postId 
          ? { ...p, savedBy: res.data.isSaved ? [...(p.savedBy || []), currentUser.id] : (p.savedBy || []).filter(id => id !== currentUser.id) }
          : p
      ));
      toast.success(res.data.isSaved ? "Post Saved!" : "Removed from Saved!");
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleHide = async (postId) => {
    if (!token) return toast.error("Log in to hide posts!");
    try {
      const res = await api.put(`/api/posts/${postId}/hide`, {});
      if (res.data.isHidden) {
        setPosts(prev => prev.filter(p => p._id !== postId));
        toast.success("Post Hidden! 🚫");
      }
    } catch (err) {
      console.error("Hide error:", err);
    }
  };

  const handleReport = (postId) => {
    if (!token) return toast.error("Log in to report posts!");
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <p className="font-bold text-orange-600">🚩 Report This Post</p>
        <p className="text-xs text-gray-500">Select a reason:</p>
        <div className="flex flex-col gap-1">
          {['spam', 'abuse', 'harassment', 'hate_speech', 'misinformation'].map(reason => (
            <button
              key={reason}
              onClick={() => { toast.remove(t.id); submitReport(postId, reason); }}
              className="text-left px-3 py-2 text-xs font-bold rounded hover:bg-gray-100 dark:hover:bg-[#272729] capitalize transition-colors"
            >
              {reason.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button onClick={() => toast.remove(t.id)} className="text-xs text-gray-400 hover:text-gray-600 mt-1 text-center">Cancel</button>
      </div>
    ), { duration: Infinity, position: 'top-center', style: { minWidth: '280px' } });
  };

  const submitReport = async (postId, reason) => {
    try {
      await api.post(`/api/reports`, 
        { targetType: 'post', targetId: postId, reason }
      );
      toast.success('Report submitted! Our team will review it. 🛡️');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report.');
    }
  };

  const handleDelete = (postId) => {
    toast((t) => (
      <div>
        <p className="mb-2 flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100"><AlertTriangle size={18} className="text-red-500" /> Are you sure you want to delete this post?</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => { toast.remove(t.id); executeDelete(postId); }} className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold">Yes</button>
          <button onClick={() => toast.remove(t.id)} className="bg-gray-500 text-white px-3 py-1 rounded text-sm font-bold">Cancel</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const executeDelete = async (postId) => {
    try {
      await api.delete(`/api/posts/${postId}`);
      setPosts(prev => prev.filter(p => p._id !== postId));
      toast.success("Post deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete post.");
    }
  };

  const handlePollVoteSuccess = (postId, updatedPost) => {
    setPosts(prev => prev.map(p => p._id === postId ? updatedPost : p));
  };

  return (
    <div className="">
      <Helmet>
        <title>{sortBy === 'hot' ? 'Trending Discussions' : sortBy === 'new' ? 'Latest Posts' : 'Top Rated'} | Vartalap</title>
        <meta name="description" content={`Explore the ${sortBy} posts and discussions on Vartalap. Join the conversation with students and professionals.`} />
      </Helmet>

      <div className="bg-gray-50/80 dark:bg-[#1a1a1b] border border-gray-200/60 dark:border-[#343536] rounded-[24px] p-1.5 mb-5 inline-flex items-center gap-1 shadow-sm animate-fade-up">
        {['hot', 'new', 'top'].map((sortType) => (
          <button
            key={sortType}
            onClick={() => setSortBy(sortType)}
            className={`btn-press flex items-center gap-1.5 px-3.5 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
              sortBy === sortType
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-[#272729] hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center justify-center">
              {sortType === 'hot' ? <Flame size={18} strokeWidth={sortBy === 'hot' ? 2.5 : 2} fill={sortBy === 'hot' ? 'transparent' : 'none'} /> : sortType === 'new' ? <Sparkles size={18} strokeWidth={2} /> : <ArrowUp size={18} strokeWidth={2} />}
            </span>
            <span className="capitalize">{sortType}</span>
          </button>
        ))}
      </div>

      {/* Partner/Sponsor Banner (Mobile Only) */}
      <div className="block xl:hidden mb-4 bg-linear-to-br from-orange-50 to-orange-100 dark:from-[#272729] dark:to-[#1a1a1b] border border-orange-200 dark:border-[#343536] rounded-xl p-4 shadow-sm relative overflow-hidden animate-fade-up">
        <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider shadow-sm z-10">
          Partner
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Techerax
              <span className="bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-sm inline-block leading-none">SERVICES</span>
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed max-w-sm">
              Need a stunning website or app? Hire <span className="font-bold text-gray-800 dark:text-gray-200">Techerax</span>.
            </p>
          </div>
          <a 
            href="https://tech-era-x.vercel.app" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn-press whitespace-nowrap text-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold py-2 px-6 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-sm shrink-0"
          >
            Explore
          </a>
        </div>
      </div>
      
      <div className="flex flex-col gap-4">
        {posts.map((post, index) => {
          // Calculate net votes
          const upvotes = post.upvotes?.length || 0;
          const downvotes = post.downvotes?.length || 0;
         
          // Check if current user has voted
          const curUserId = currentUser?.id || currentUser?._id;
          const hasUpvoted = currentUser && post.upvotes?.some(id => (typeof id === 'object' ? id._id : id) === curUserId);
          const hasDownvoted = currentUser && post.downvotes?.some(id => (typeof id === 'object' ? id._id : id) === curUserId);

          const isLast = (posts.length === index + 1);

          return (
          <div
            key={`${post._id}-${index}`}
            ref={isLast ? lastPostElementRef : null}
            className={`card-hover bg-white dark:bg-[#1a1a1b] border border-gray-100 dark:border-[#343536] p-4 rounded-xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] dark:shadow-none transition-all animate-fade-up overflow-visible relative ${String(activeMenuId) === String(post._id) ? 'z-[100]' : 'z-10 hover:z-[60]'}`}
            style={{ animationDelay: `${Math.min(index, 4) * 60}ms` }}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2.5">
                <Link to={post.community ? `/v/${post.community.name}` : `/u/${post.author?.username}`} className="shrink-0 block">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 dark:bg-[#272729] flex items-center justify-center border border-gray-200 dark:border-[#343536]">
                    {(post.community?.profilePic || post.author?.profilePic) ? (
                      <img 
                        src={(post.community?.profilePic || post.author?.profilePic).startsWith('http') ? (post.community?.profilePic || post.author?.profilePic) : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${(post.community?.profilePic || post.author?.profilePic).replace(/\\/g, '/')}`}
                        alt="avatar" 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-sm font-bold text-gray-400 uppercase">
                        {(post.community?.name || post.author?.username || '?').charAt(0)}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex flex-col justify-center">
                  {post.community ? (
                    <Link to={`/v/${post.community.name}`} className="text-[13px] font-bold text-gray-900 dark:text-white hover:underline leading-tight">
                      v/{post.community.name}
                    </Link>
                  ) : (
                    <Link to={`/u/${post.author?.username}`} className="text-[13px] font-bold text-gray-900 dark:text-white hover:underline leading-tight flex items-center gap-1">
                      u/{post.author?.username}
                      {post.authorHasVartalapBadge && <Award size={12} className="text-blue-500" />}
                    </Link>
                  )}
                  <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                    {post.community && (
                      <>
                        <Link to={`/u/${post.author?.username}`} className="hover:underline flex items-center gap-0.5">
                          u/{post.author?.username}
                          {post.authorHasVartalapBadge && <Award size={10} className="text-blue-500" />}
                        </Link>
                        <span>•</span>
                      </>
                    )}
                    {new Date().getTime() - new Date(post.createdAt || Date.now()).getTime() < 24*60*60*1000 
                      ? Math.floor((new Date().getTime() - new Date(post.createdAt || Date.now()).getTime()) / (60*60*1000)) + 'h ago'
                      : new Date(post.createdAt || Date.now()).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                  </span>
                </div>
              </div>
              <PostMenu 
                post={post}
                currentUser={currentUser}
                onSave={handleSave}
                onHide={handleHide}
                onReport={handleReport}
                onDelete={handleDelete}
                onOpenChange={(isOpen) => setActiveMenuId(isOpen ? post._id : (prev => prev === post._id ? null : prev))}
              />
            </div>
            
            <div className="mb-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                <Link to={`/post/${post._id}`} className="hover:underline">{post.title}</Link>
              </h2>
            </div>
            
            {/* Link Post Rendering - Added so links show up immediately in feed */}
            {post.postType === 'link' && post.link && (
              <div className="bg-gray-50 dark:bg-[#272729] border border-gray-200 dark:border-[#343536] p-3 rounded-md mb-3 flex items-center justify-between group hover:border-gray-400 dark:hover:border-gray-500 transition-all">
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <span className="text-blue-600 dark:text-blue-400 text-sm font-bold truncate">{post.link}</span>
                  <span className="text-gray-500 tracking-wide text-[11px]">External Link 🔗</span>
                </div>
                <a 
                  href={post.link.startsWith('http') ? post.link : `https://${post.link}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-gray-200 dark:bg-[#343536] text-gray-900 dark:text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all flex items-center gap-1.5 flex-shrink-0"
                >
                  Open ↗️
                </a>
              </div>
            )}

            {/* Poll Post Rendering */}
            {post.postType === 'poll' && (
              <PollView 
                post={post} 
                currentUser={currentUser} 
                onVoteSuccess={handlePollVoteSuccess} 
              />
            )}

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
            <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4 prose prose-sm dark:prose-invert max-w-none break-words">
              <ReactMarkdown rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeOptions]]}>
                {post.content || ''}
              </ReactMarkdown>
            </div>
            
            {/* Post Actions */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-gray-500 dark:text-gray-400 font-bold text-sm mt-3">
                
                {/* Voting UI */}
              <div className="flex items-center bg-gray-100 dark:bg-[#272729] rounded-full overflow-hidden transition-colors border border-transparent dark:border-[#343536]">
                  <div
                    onClick={() => handleUpvote(post._id)}
                    className={`btn-press flex items-center gap-1 px-2 pb-2 pt-2.5 sm:px-3 sm:py-2 cursor-pointer transition-all ${
                      hasUpvoted ? 'text-orange-500 bg-orange-500/10' : 'hover:bg-gray-200 dark:hover:bg-[#343536]'
                    }`}
                  >
                  <ArrowUp size={18} strokeWidth={hasUpvoted ? 3 : 2} />
                    <span className="text-xs font-bold pt-0.5">{post.upvotes?.length || 0}</span>
                  </div>
                  
                  <div className="w-[1px] h-4 bg-gray-300 dark:bg-[#343536]"></div>

                  <div
                    onClick={() => handleDownvote(post._id)}
                    className={`btn-press flex items-center gap-1 px-2 pb-2 pt-2.5 sm:px-3 sm:py-2 cursor-pointer transition-all ${
                      hasDownvoted ? 'text-blue-500 bg-blue-500/10' : 'hover:bg-gray-200 dark:hover:bg-[#343536]'
                    }`}
                  >
                  <ArrowDown size={18} strokeWidth={hasDownvoted ? 3 : 2} />
                    <span className="text-xs font-bold pt-0.5">{post.downvotes?.length || 0}</span>
                  </div>
                </div>
 
                {/* Comments Link */}
                <Link to={`/post/${post._id}`} className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#272729] px-2 py-1.5 rounded cursor-pointer transition-all">
                   <MessageCircle size={14} strokeWidth={2} />
                   <span className="text-[11px] sm:text-xs">{post.comments?.length || 0} <span className="hidden sm:inline">Comments</span></span>
                </Link>

                {/* Share Button */}
                <div 
                  onClick={() => handleShare(post._id)}
                  className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-[#272729] px-2 py-1.5 rounded cursor-pointer transition-all"
                >
                   <Share size={14} strokeWidth={2} />
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
            <CheckCircle size={32} strokeWidth={1.5} className="mx-auto mb-3 text-gray-400" />
            <p className="font-bold">You've reached the end!</p>
            <p className="text-xs mt-1">Aapne saari posts dekh li hain.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;