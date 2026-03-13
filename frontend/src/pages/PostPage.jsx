import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import CommentThread from '../components/CommentThread';
import SkeletonLoader from '../components/SkeletonLoader';

const PostPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [commentText, setCommentText] = useState('');
  
  // Token wapas le aaye API call ke liye
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user'));

  const fetchSinglePost = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.get(`${apiUrl}/api/posts/${id}`);
      setPost(res.data);
    } catch (err) {
      console.error("Error fetching post", err);
    }
  };

  useEffect(() => {
    fetchSinglePost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Comment bhejne ka function (Top level ya in-line reply dono ke liye)
  const handleCommentSubmit = async (parentId = null, text = commentText) => {
    if (!text.trim()) return;
    if (!token) {
      toast.error("Comment karne ke liye login karein!");
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.post(
        `${apiUrl}/api/posts/${id}/comment`, 
        { text: text, parentId: parentId }, // Send parentId to backend
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!parentId) {
        setCommentText(''); // Sirf main dabba khali karo agar root comment hai
      }
      fetchSinglePost();  // Post ko refresh karo taaki naya comment dikhe
    } catch (err) {
      console.error("Comment submit error:", err);
      toast.error("Comment post nahi hua!");
    }
  };

  // -----------------------------------------
  // Flat comments ko Tree structure mein badlo
  // -----------------------------------------
  const buildCommentTree = (commentsFlatArray) => {
    if (!commentsFlatArray) return [];
    
    const commentMap = {};
    const roots = [];

    // Har comment ka ek map entity bana lo jisme empty children array ho
    commentsFlatArray.forEach(c => {
      commentMap[c._id] = { ...c, children: [] };
    });

    // Har comment ko uske parent ke children array mein ghusao
    commentsFlatArray.forEach(c => {
      if (c.parentId) {
        // Agar uska parent map mein majood hai toh usme dal do
        if (commentMap[c.parentId]) {
          commentMap[c.parentId].children.push(commentMap[c._id]);
        }
      } else {
        // Agar parentId null hai, matlab ye pakka Root comment hai
        roots.push(commentMap[c._id]);
      }
    });

    return roots;
  };

  const rootComments = buildCommentTree(post?.comments);

  // VOTING LOGIC
  const handleUpvote = async () => {
    if (!token) {
      toast.error("Vote karne ke liye pehle Log In karein!");
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.put(`${apiUrl}/api/posts/${id}/upvote`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSinglePost();
    } catch (err) {
      console.error("Voting error:", err);
    }
  };

  const handleDownvote = async () => {
    if (!token) {
      toast.error("Vote karne ke liye pehle Log In karein!");
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.put(`${apiUrl}/api/posts/${id}/downvote`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSinglePost();
    } catch (err) {
      console.error("Voting error:", err);
    }
  };

  const handleCommentEdit = async (commentId, newText) => {
    if (!token) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.put(`${apiUrl}/api/posts/${id}/comment/${commentId}`, 
        { text: newText }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Comment updated! ✨");
      fetchSinglePost();
    } catch (err) {
      console.error("Comment edit error:", err);
      toast.error("Error updating comment");
    }
  };

  const handleCommentDelete = async (commentId) => {
    if (!token) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.delete(`${apiUrl}/api/posts/${id}/comment/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Comment deleted! 🗑️");
      fetchSinglePost();
    } catch (err) {
      console.error("Comment delete error:", err);
      toast.error("Error deleting comment");
    }
  };

  const handleCommentVote = async (commentId, type) => {
    if (!token) {
      toast.error("Vote karne ke liye pehle Log In karein!");
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.put(`${apiUrl}/api/posts/${id}/comment/${commentId}/${type}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSinglePost();
    } catch (err) {
      console.error("Comment voting error:", err);
    }
  };

  const handleSave = async () => {
    if (!token) {
      toast.error("Save karne ke liye login karein!");
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.put(`${apiUrl}/api/posts/${id}/save`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message);
      fetchSinglePost();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Error saving post");
    }
  };

  const handleShare = (commentId = null) => {
    const url = window.location.origin + window.location.pathname + (commentId ? `#comment-${commentId}` : '');
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied to clipboard! 📋");
    }).catch(err => {
      console.error("Share error:", err);
    });
  };

  if (!post) return <div className="mt-10"><SkeletonLoader /></div>;

  const netVotes = (post.upvotes?.length || 0) - (post.downvotes?.length || 0);
  const hasUpvoted = post.upvotes?.includes(currentUser?.id);
  const hasDownvoted = post.downvotes?.includes(currentUser?.id);

  const isAuthor = currentUser && post.author?._id === currentUser.id;
  const isCreator = currentUser && post.community?.creator === currentUser.id;
  const isMod = currentUser && post.community?.moderators?.some(m => 
    (typeof m === 'object' ? m._id === currentUser.id : m === currentUser.id)
  );

  const canDelete = isAuthor || isCreator || isMod;

  const handleDeletePost = () => {
    toast((t) => (
      <div>
        <p className="mb-2">Are you sure you want to delete this post? 🗑️</p>
        <div className="flex gap-2 justify-end">
           <button 
             onClick={() => { toast.dismiss(t.id); executeDeletePost(); }} 
             className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold"
           >
             Delete
           </button>
           <button 
             onClick={() => toast.dismiss(t.id)} 
             className="bg-gray-500 text-white px-3 py-1 rounded text-sm font-bold"
           >
             Cancel
           </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const executeDeletePost = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.delete(`${apiUrl}/api/posts/${post._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Post deleted! 💨");
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || "Error deleting post");
    }
  };

  return (
    <div className="mt-6 pb-10">
      <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4 text-sm flex items-center gap-1 transition-colors">
        ← Back to Feed
      </button>

      <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-6 rounded-md shadow-sm transition-colors">
        <p className="text-xs text-gray-500 mb-2">
          Posted in <span className="text-gray-900 dark:text-white font-bold">c/{post.community?.name || 'general'}</span> • by <Link to={`/u/${post.author?.username}`} className="hover:underline hover:text-gray-900 dark:hover:text-white">u/{post.author?.username || 'user'}</Link>
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{post.title}</h1>
        {post.postType === 'link' && post.link && (
          <div className="bg-gray-50 dark:bg-[#272729] border border-gray-200 dark:border-[#343536] p-4 rounded-md mb-4 flex items-center justify-between group hover:border-gray-400 dark:hover:border-gray-500 transition-all">
            <div className="flex flex-col gap-1 overflow-hidden">
              <span className="text-blue-600 dark:text-blue-400 text-sm font-bold truncate">{post.link}</span>
              <span className="text-gray-500 tracking-wide text-xs">External Link 🔗</span>
            </div>
            <a 
              href={post.link.startsWith('http') ? post.link : `https://${post.link}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-gray-200 dark:bg-[#343536] text-gray-900 dark:text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all flex items-center gap-2"
            >
              Open ↗️
            </a>
          </div>
        )}

        {post.media && post.media.length > 0 && (
          <div className={`grid gap-4 mb-6 ${post.media.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {post.media.map((item, idx) => (
              <div key={idx} className="relative rounded-md overflow-hidden border border-gray-200 dark:border-[#343536] bg-black/5 dark:bg-black/20 flex items-center justify-center">
                {item.mimetype?.startsWith('video/') ? (
                  <video 
                    src={item.url.startsWith('http') ? item.url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${item.url}`} 
                    controls 
                    className="max-h-125 w-full"
                  />
                ) : (
                  <img 
                    src={item.url.startsWith('http') ? item.url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${item.url}`} 
                    alt={`Attachment ${idx}`} 
                    className="max-h-150 w-full object-contain"
                  />
                )}
              </div>
            ))}
          </div>
        )}
        <div className="text-gray-800 dark:text-gray-300 text-base leading-relaxed whitespace-pre-wrap mb-4">
          {/* Markdown renderer could go here, for now using whitespace-pre-wrap */}
           {post.content}
        </div>

        {/* Post Actions */}
        <div className="flex items-center gap-2 sm:gap-4 text-gray-500 dark:text-gray-400 font-bold text-sm">
           
           <div className="flex items-center bg-gray-100 dark:bg-[#272729] rounded-full overflow-hidden transition-colors">
             {/* ⬆️ Upvote Button */}
             <div 
               onClick={handleUpvote}
               className={`flex items-center justify-center p-2 cursor-pointer transition-all ${
                 hasUpvoted ? 'text-orange-500 bg-orange-500/10 hover:bg-orange-500/20' : 'hover:bg-gray-200 dark:hover:bg-[#343536]'
               }`}
             >
                <span>⬆️</span>
             </div>
             
             {/* Vote Count */}
             <span className={`px-1 sm:px-2 ${
               hasUpvoted ? 'text-orange-500' : hasDownvoted ? 'text-blue-500' : 'text-gray-900 dark:text-white'
             }`}>{netVotes}</span>

             {/* ⬇️ Downvote Button */}
             <div 
               onClick={handleDownvote}
               className={`flex items-center justify-center p-2 cursor-pointer transition-all ${
                 hasDownvoted ? 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20' : 'hover:bg-gray-200 dark:hover:bg-[#343536]'
               }`}
             >
                <span>⬇️</span>
             </div>
           </div>

           {/* Comments Count Indicator */}
           <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#272729] px-3 py-1.5 rounded-full transition-colors">
              <span>💬</span>
              <span className="text-[11px] sm:text-xs">{post.comments?.length || 0} <span className="hidden sm:inline">Comments</span></span>
           </div>

            <div 
              onClick={() => handleShare()}
              className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#272729] px-3 py-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-[#343536] cursor-pointer transition-all"
            >
               <span>🔗</span>
               <span className="text-[11px] sm:text-xs">Share</span>
            </div>

            {/* Save Button */}
            <div 
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-all ${
                post.savedBy?.includes(currentUser?.id) ? 'bg-yellow-50 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 border border-yellow-200 dark:border-yellow-500/50' : 'bg-gray-100 dark:bg-[#272729] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#343536]'
              }`}
            >
               <span>{post.savedBy?.includes(currentUser?.id) ? '🔖' : '📑'}</span>
               <span className="text-[11px] sm:text-xs">{post.savedBy?.includes(currentUser?.id) ? 'Saved' : 'Save'}</span>
            </div>

            {/* Delete Button (Author/Mod only) */}
            {canDelete && (
              <div 
                onClick={handleDeletePost}
                className="flex items-center gap-1.5 bg-red-600/10 text-red-500 border border-red-500 px-3 py-1.5 rounded-full hover:bg-red-500 hover:text-white cursor-pointer transition-all ml-auto"
              >
                <span>🗑️</span>
                <span className="text-[11px] sm:text-xs">Delete</span>
              </div>
            )}
        </div>
      </div>

      {/* Comment Bhejne ka Dabba */}
      <div className="mt-6 bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-4 rounded-md transition-colors">
        <p className="text-gray-800 dark:text-white mb-2 text-sm font-bold">
          Comment as <span className="text-blue-600 dark:text-cyan-400">u/{currentUser?.username || 'Anonymous'}</span>
        </p>
        <textarea 
          placeholder="What are your thoughts?" 
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="w-full bg-gray-50 dark:bg-[#272729] text-gray-900 dark:text-white border border-gray-200 dark:border-[#343536] p-3 rounded h-24 outline-none focus:border-blue-500 dark:focus:border-gray-500 resize-none mb-2 transition-colors"
        />
        <div className="flex justify-end">
          <button 
            onClick={() => handleCommentSubmit(null, commentText)}
            className="bg-gray-900 dark:bg-white text-white dark:text-black font-bold py-1.5 px-6 rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-sm"
          >
            Comment
          </button>
        </div>
      </div>

      {/* Comments Dikhane ka Section (Tree Format) */}
      <div className="mt-6 flex flex-col gap-2">
        {rootComments && rootComments.length > 0 ? (
          rootComments.map((rootComment) => (
            <CommentThread 
              key={rootComment._id} 
              comment={rootComment} 
              onReply={handleCommentSubmit}
              onVote={handleCommentVote}
              onShare={handleShare}
              onEdit={handleCommentEdit}
              onDelete={handleCommentDelete}
              currentUser={currentUser}
            />
          ))
        ) : (
          <p className="text-gray-500 text-center mt-4">No comments yet. Be the first to share your thoughts!</p>
        )}
      </div>
    </div>
  );
};

export default PostPage;