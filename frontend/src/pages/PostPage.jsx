import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import CommentThread from '../components/CommentThread';
import SkeletonLoader from '../components/SkeletonLoader';
import PostMenu from '../components/PostMenu';
import PollView from '../components/PollView';
import TipTapEditor from '../components/TipTapEditor';
import { SocketContext } from '../context/SocketContext';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Scale, Trophy, ExternalLink, ArrowUp, ArrowDown, MessageCircle, Share, Bookmark, BookmarkCheck, Trash2, ThumbsUp, ThumbsDown, ArrowLeft, Flag, AlertTriangle, ShieldAlert, Award } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { getOptimizedUrl, IMAGE_PRESETS } from '../utils/cloudinaryHelper';

const sanitizeOptions = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] || []), 'style', 'className', 'class'],
    iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder'],
    video: ['src', 'controls', 'class', 'className', 'poster', 'loop', 'muted', 'playsinline'],
    img: ['src', 'alt', 'loading', 'width', 'height', 'decoding']
  },
  tagNames: [...(defaultSchema.tagNames || []), 'mark', 'iframe', 'video', 'source', 'span', 'figure', 'figcaption', 'img'],
};

const PostPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [stance, setStance] = useState('neutral'); // ⚖️ For Debate Mode
  const [pendingEditorFiles, setPendingEditorFiles] = useState([]);
  const { socket } = useContext(SocketContext);
  
  const currentUser = JSON.parse(localStorage.getItem('user'));

  const fetchSinglePost = useCallback(async () => {
    try {
      const res = await api.get(`/api/posts/${id}`);
      setPost(res.data);
    } catch (err) {
      console.error("Error fetching post", err);
      if (err.response && err.response.status === 404) {
        toast.error("Post not found or has been deleted.");
        navigate('/'); // Redirect user back to feed
      }
    }
  }, [id, navigate]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await api.get(`/api/comments/post/${id}`);
      setComments(res.data);
    } catch (err) {
      console.error("Error fetching comments", err);
    }
  }, [id]);

  useEffect(() => {
    const loadData = async () => {
      await fetchSinglePost();
      await fetchComments();
    };
    loadData();
  }, [fetchSinglePost, fetchComments]);

  // Real-time updates: Listen for likes/comments/edits
  useEffect(() => {
    if (!socket) return;

    const handlePostUpdate = (updatedPostId) => {
      if (updatedPostId === id) {
        fetchSinglePost(); // Reload data silently without refreshing page
        fetchComments();
      }
    };

    socket.on('post_interaction', handlePostUpdate);

    return () => {
      socket.off('post_interaction', handlePostUpdate);
    };
  }, [socket, id, fetchSinglePost, fetchComments]);

  const handleCommentSubmit = async (parentId = null, text = commentText) => {
    if (!text.trim()) return;
    if (!currentUser) {
      toast.error("Comment karne ke liye login karein!");
      return;
    }

    let finalContent = text;
    // We only process pending files for root comments since inline replies handle their own
    if (!parentId) {
      const filesToUpload = pendingEditorFiles.filter(item => finalContent.includes(item.url));
      if (filesToUpload.length > 0) {
        const loadingId = toast.loading('Uploading media inside comment... ⏳');
        try {
          for (const item of filesToUpload) {
            const fd = new FormData();
            fd.append('media', item.file);
            const res = await api.post('/api/upload', fd);
            const realUrl = res.data.url.startsWith('http') ? res.data.url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${res.data.url}`;
            finalContent = finalContent.split(item.url).join(realUrl);
          }
          toast.success('Media embedded successfully! 🎉', { id: loadingId });
        } catch (err) {
          console.error("Upload error", err);
          toast.error("Failed to upload media. ❌", { id: loadingId });
          return;
        }
      }
    }

    try {
      await api.post(`/api/comments/add`, { 
        content: finalContent, postId: id, parentCommentId: parentId, stance: parentId ? 'neutral' : stance 
      });
      if (!parentId) {
        setCommentText(''); // Sirf main dabba khali karo agar root comment hai
        setStance('neutral'); // Stance reset karo
        setPendingEditorFiles([]);
      }
      fetchComments();  // Naye comment ko list me laane ke liye bas comments ko refresh karo
    } catch (err) {
      console.error("Comment submit error:", err);
      toast.error(err.response?.data?.error || err.response?.data?.message || "Comment post nahi hua!");
    }
  };

  // -----------------------------------------
  // Flat comments ko Tree structure mein badlo
  // -----------------------------------------
  const buildCommentTree = (commentsFlatArray) => {
    if (!commentsFlatArray) return { roots: [], totalVisible: 0 };
    
    const commentMap = {};
    const roots = [];
    let totalVisible = 0;

    // Har comment ka ek map entity bana lo jisme empty children array ho
    commentsFlatArray.forEach(c => {
      // CommentThread component ko purane format ki aadat hai isliye naye backend response ko map kar rahe hain
      commentMap[c._id] = { ...c, text: c.content, user: c.author, children: [] };
    });

    // Har comment ko uske parent ke children array mein ghusao
    commentsFlatArray.forEach(c => {
      if (c.parentComment) {
        if (commentMap[c.parentComment]) {
          commentMap[c.parentComment].children.push(commentMap[c._id]);
        }
      } else {
        roots.push(commentMap[c._id]);
      }
    });

    // Count visible comments recursively (Logical match with CommentThread.jsx rendering)
    const countVisible = (node) => {
      const isDeleted = node.text === "[deleted]" || !node.user;
      const hasChildren = node.children && node.children.length > 0;
      
      // If deleted and no children, it won't be rendered
      if (isDeleted && !hasChildren) return 0;
      
      let count = 1; // Count this node
      node.children.forEach(child => {
        count += countVisible(child);
      });
      return count;
    };

    roots.forEach(root => {
      totalVisible += countVisible(root);
    });

    return { roots, totalVisible };
  };

  const { roots: rootComments, totalVisible: commentCount } = buildCommentTree(comments);

  // VOTING LOGIC
  const handleUpvote = async () => {
    if (!currentUser) {
      toast.error("Vote karne ke liye pehle Log In karein! 🛑");
      return;
    }
    // Toggle-off supported by backend logic

    try {
      const res = await api.put(`/api/posts/${id}/upvote`);
      // Targeted update to preserve populated data and avoid duplication
      setPost(prev => ({ ...prev, upvotes: res.data.post.upvotes, downvotes: res.data.post.downvotes }));
    } catch (err) {
      console.error("Voting error:", err);
    }
  };

  const handleDownvote = async () => {
    if (!currentUser) {
      toast.error("Vote karne ke liye pehle Log In karein! 🛑");
      return;
    }
    // Toggle-off supported by backend logic

    try {
      const res = await api.put(`/api/posts/${id}/downvote`);
      // Targeted update to preserve populated data and avoid duplication
      setPost(prev => ({ ...prev, upvotes: res.data.post.upvotes, downvotes: res.data.post.downvotes }));
    } catch (err) {
      console.error("Voting error:", err);
    }
  };

  const handleCommentEdit = async (commentId, newText) => {
    if (!currentUser) return;
    try {
      await api.put(`/api/comments/${commentId}`, { content: newText });
      toast.success("Comment updated! ✨");
      fetchComments();
    } catch (err) {
      console.error("Comment edit error:", err);
      toast.error("Error updating comment");
    }
  };

  const handleCommentDelete = async (commentId) => {
    if (!currentUser) return;
    try {
      await api.delete(`/api/comments/${commentId}`);
      toast.success("Comment deleted! 🗑️");
      fetchComments();
    } catch (err) {
      console.error("Comment delete error:", err);
      toast.error("Error deleting comment");
    }
  };

  const handleCommentVote = async (commentId, type) => {
    if (!currentUser) {
      toast.error("Vote karne ke liye pehle Log In karein!");
      return;
    }
    try {
      await api.put(`/api/comments/${commentId}/${type}`);
      fetchComments();
    } catch (err) {
      console.error("Comment voting error:", err);
    }
  };

  const handleSave = async () => {
    if (!currentUser) {
      toast.error("Save karne ke liye login karein!");
      return;
    }
    try {
      const res = await api.put(`/api/posts/${id}/save`);
      toast.success(res.data.message);
      fetchSinglePost();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Error saving post");
    }
  };

  const handleHide = async () => {
    if (!currentUser) return toast.error("Log in to hide posts!");
    try {
      await api.put(`/api/posts/${id}/hide`);
      toast.success("Post Hidden! 🚫");
      navigate('/');
    } catch (err) {
      console.error("Hide error:", err);
    }
  };

  const handleReport = () => {
    if (!currentUser) return toast.error("Log in to report posts!");
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <p className="font-bold text-orange-600 flex items-center gap-2"><Flag size={16} /> Report This Post</p>
        <p className="text-xs text-gray-500">Select a reason:</p>
        <div className="flex flex-col gap-1">
          {['spam', 'abuse', 'harassment', 'hate_speech', 'misinformation'].map(reason => (
            <button
              key={reason}
              onClick={() => { toast.remove(t.id); submitReport(reason); }}
              className="text-left px-3 py-2 text-xs font-bold rounded hover:bg-gray-100 dark:hover:bg-[#272729] capitalize transition-colors"
            >
              {reason.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button onClick={() => toast.remove(t.id)} className="text-xs text-gray-400 hover:text-gray-600 mt-1 text-center">Cancel</button>
      </div>
    ), { id: `report-${id}`, duration: Infinity, position: 'top-center', style: { minWidth: '280px' } });
  };

  const submitReport = async (reason) => {
    try {
      await api.post(`/api/reports`, { targetType: 'post', targetId: id, reason });
      toast.success('Report submitted! Our team will review it. 🛡️');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report.');
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

  const handleAcceptBounty = async (commentId) => {
    try {
      await api.put(`/api/comments/${commentId}/accept-bounty`);
      toast.success("Bounty awarded! 🏆");
      fetchSinglePost();
      fetchComments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to award bounty");
    }
  };

  if (!post) return <div className="mt-10"><SkeletonLoader /></div>;

  // const netVotes = (post.upvotes?.length || 0) - (post.downvotes?.length || 0);
  const curUserId = currentUser?.id || currentUser?._id;
  const hasUpvoted = currentUser && post.upvotes?.some(id => (typeof id === 'object' ? id._id : id) === curUserId);
  const hasDownvoted = currentUser && post.downvotes?.some(id => (typeof id === 'object' ? id._id : id) === curUserId);

  const isAuthor = currentUser && post.author?._id === currentUser.id;
  const isCreator = currentUser && post.community?.creator === currentUser.id;
  const isMod = currentUser && post.community?.moderators?.some(m => 
    (typeof m === 'object' ? m._id === currentUser.id : m === currentUser.id)
  );

  const canDeletePost = isAuthor || isCreator || isMod;
  const isCommunityAdmin = isCreator || isMod;

  const handleDeletePost = () => {
    toast((t) => (
      <div>
        <p className="mb-2 flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100"><AlertTriangle size={18} className="text-red-500" /> Are you sure you want to delete this post?</p>
        <div className="flex gap-2 justify-end">
           <button 
             onClick={() => { toast.remove(t.id); executeDeletePost(); }} 
             className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold"
           >
             Delete
           </button>
           <button 
             onClick={() => toast.remove(t.id)} 
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
      await api.delete(`/api/posts/${post._id}`);
      toast.success("Post deleted!");
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || "Error deleting post");
    }
  };

  // 🖼️ Dynamic Image Logic for SEO
  const postImage = post?.media?.length > 0 && post.media[0].mimetype?.startsWith('image/') 
    ? (post.media[0].url.startsWith('http') ? post.media[0].url : `${import.meta.env.VITE_API_URL || 'https://api.vartalap.live'}${post.media[0].url}`)
    : 'https://www.vartalap.live/favicon.png';

  return (
    <div className="mt-6 pb-10">
      <Helmet>
        <title>{post.title.length > 60 ? post.title.substring(0, 60) + '...' : post.title} | Vartalap</title>
        <meta name="description" content={post.content ? (post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content) : `Join the discussion about ${post.title} on Vartalap.`} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.content ? (post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content) : `Join the discussion about ${post.title} on Vartalap.`} />
        <meta property="og:image" content={postImage} />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.content ? (post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content) : `Join the discussion about ${post.title} on Vartalap.`} />
        <meta name="twitter:image" content={postImage} />
      </Helmet>
      
      <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4 text-sm flex items-center gap-1.5 transition-colors">
        <ArrowLeft size={16} /> Back to Feed
      </button>

      <div className="bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-4 sm:p-6 rounded-md shadow-sm transition-colors overflow-visible relative">
        <div className="flex justify-between items-start mb-2">
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            Posted in <span className="text-gray-900 dark:text-white font-bold">c/{post.community?.name || 'general'}</span> • by 
            <Link to={`/u/${post.author?.username}`} className="hover:underline hover:text-gray-900 dark:hover:text-white flex items-center gap-1">
              u/{post.author?.username || 'user'}
              {post.authorHasVartalapBadge && (
                <Award size={12} className="text-blue-500 shrink-0" />
              )}
            </Link>
            {post.author?.accountType === 'bot' && (
              <span className="ml-1.5 text-xs font-bold text-blue-500 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400 px-1.5 py-0.5 rounded-sm">
                BOT
              </span>
            )}
          </p>
          <PostMenu 
            post={post}
            currentUser={currentUser}
            isMod={canDeletePost}
            onSave={() => handleSave()}
            onHide={() => handleHide()}
            onReport={() => handleReport()}
            onDelete={() => handleDeletePost()}
            onOpenChange={() => {}} // Not needed for single post overflow but good for consistency
          />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{post.title}</h1>
      {/* ⚖️ Debate Badge */}
      {post.postType === 'debate' && (
        <div className="mb-4 inline-flex items-center gap-1.5 bg-linear-to-r from-green-500 to-red-500 text-white text-[11px] uppercase tracking-wider font-extrabold px-3 py-1 rounded shadow-sm">
          <Scale size={14} /> Live Debate
        </div>
      )}
      
      {/* 🏆 Bounty Badge */}
      {post.bountyAmount > 0 && (
        <div className={`mb-4 ml-2 inline-flex items-center gap-1.5 text-white text-[11px] uppercase tracking-wider font-extrabold px-3 py-1 rounded shadow-sm ${post.bountyResolved ? 'bg-gray-500' : 'bg-linear-to-r from-yellow-500 to-orange-500'}`}>
          <Trophy size={14} /> {post.bountyAmount} Anubhav Bounty {post.bountyResolved ? '(Resolved)' : ''}
        </div>
      )}
        {post.postType === 'link' && post.link && (
          <div className="bg-gray-50 dark:bg-[#272729] border border-gray-200 dark:border-[#343536] p-4 rounded-md mb-4 flex items-center justify-between group hover:border-gray-400 dark:hover:border-gray-500 transition-all">
            <div className="flex flex-col gap-1 overflow-hidden">
              <span className="text-blue-600 dark:text-blue-400 text-sm font-bold truncate">{post.link}</span>
              <span className="text-gray-500 tracking-wide text-xs flex items-center gap-1">External Link <ExternalLink size={12} /></span>
            </div>
            <a 
              href={post.link.startsWith('http') ? post.link : `https://${post.link}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-gray-200 dark:bg-[#343536] text-gray-900 dark:text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all flex items-center gap-2"
            >
              Open <ExternalLink size={14} />
            </a>
          </div>
        )}

        {post.postType === 'poll' && (
          <PollView 
            post={post} 
            currentUser={currentUser} 
            onVoteSuccess={(postId, updatedPost) => setPost(updatedPost)} 
          />
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
                    src={getOptimizedUrl(
                      item.url.startsWith('http') ? item.url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${item.url}`,
                      IMAGE_PRESETS.POST
                    )}
                    alt={`Attachment ${idx}`} 
                    loading="lazy"
                    decoding="async"
                    className="max-h-150 w-full object-contain"
                  />
                )}
              </div>
            ))}
          </div>
        )}
        <div className="text-gray-800 dark:text-gray-200 text-sm md:text-base leading-relaxed mb-6 prose prose-sm md:prose-base dark:prose-invert max-w-none wrap-break-word">
          <ReactMarkdown rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeOptions]]}>
            {post.content || ''}
          </ReactMarkdown>
        </div>

        {/* Post Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-gray-500 dark:text-gray-400 font-bold text-sm mt-3">
           
            <div className="flex items-center bg-gray-100 dark:bg-[#272729] rounded-full overflow-hidden transition-colors border border-transparent dark:border-[#343536]">
              {/* ⬆️ Upvote Button */}
              <div 
                onClick={() => handleUpvote()}
                className={`flex items-center gap-1 px-2 pb-2 pt-2.5 sm:px-3 sm:py-2 cursor-pointer transition-all ${
                  hasUpvoted ? 'text-orange-500 bg-orange-500/10' : 'hover:bg-gray-200 dark:hover:bg-[#343536]'
                }`}
              >
                 <ArrowUp size={18} strokeWidth={hasUpvoted ? 3 : 2} />
                 <span className="text-xs font-bold pt-0.5">{post.upvotes?.length || 0}</span>
              </div>
              
              <div className="w-px h-4 bg-gray-300 dark:bg-[#343536]"></div>

              {/* ⬇️ Downvote Button */}
              <div 
                onClick={() => handleDownvote()}
                className={`flex items-center gap-1 px-2 pb-2 pt-2.5 sm:px-3 sm:py-2 cursor-pointer transition-all ${
                  hasDownvoted ? 'text-blue-500 bg-blue-500/10' : 'hover:bg-gray-200 dark:hover:bg-[#343536]'
                }`}
              >
                 <ArrowDown size={18} strokeWidth={hasDownvoted ? 3 : 2} />
                 <span className="text-xs font-bold pt-0.5">{post.downvotes?.length || 0}</span>
              </div>
            </div>

           {/* Comments Count Indicator */}
           <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#272729] px-2.5 py-1.5 sm:px-3 rounded-full transition-colors">
              <MessageCircle size={14} />
              <span className="text-[11px] sm:text-xs pt-0.5">{commentCount} <span className="hidden sm:inline">Comments</span></span>
           </div>

            <div 
              onClick={() => handleShare()}
              className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#272729] px-2.5 py-1.5 sm:px-3 rounded-full hover:bg-gray-200 dark:hover:bg-[#343536] cursor-pointer transition-all"
            >
               <Share size={14} />
               <span className="text-[11px] sm:text-xs pt-0.5">Share</span>
            </div>

            {/* Save Button */}
            <div 
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 rounded-full cursor-pointer transition-all ${
                post.savedBy?.includes(currentUser?.id) ? 'bg-yellow-50 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 border border-yellow-200 dark:border-yellow-500/50' : 'bg-gray-100 dark:bg-[#272729] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#343536]'
              }`}
            >
               {post.savedBy?.includes(currentUser?.id) ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
               <span className="text-[11px] sm:text-xs pt-0.5">{post.savedBy?.includes(currentUser?.id) ? 'Saved' : 'Save'}</span>
            </div>

            {/* Delete Button (Author/Mod only) */}
            {canDeletePost && (
              <div 
                onClick={handleDeletePost}
                className="flex items-center gap-1.5 bg-red-600/10 text-red-500 border border-red-500 px-3 py-1.5 rounded-full hover:bg-red-500 hover:text-white cursor-pointer transition-all ml-auto"
              >
                <Trash2 size={14} />
                <span className="text-[11px] sm:text-xs pt-0.5">Delete</span>
              </div>
            )}
        </div>
      </div>

      {/* Comment Bhejne ka Dabba */}
      {currentUser?.disabledFeatures?.includes('comment') ? (
        <div className="mt-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-6 rounded-xl flex flex-col items-center justify-center text-center transition-colors">
          <ShieldAlert size={32} className="text-red-500 mb-3" />
          <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Commenting Restricted</h3>
          <p className="text-sm text-red-600 dark:text-red-300/80 mt-1 max-w-md">Your commenting privileges have been temporarily disabled by an administrator. You can still read the discussion.</p>
        </div>
      ) : (
        <div className="mt-6 bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-4 rounded-md transition-colors">
          <p className="text-gray-800 dark:text-white mb-2 text-sm font-bold">
            Comment as <span className="text-blue-600 dark:text-cyan-400">u/{currentUser?.username || 'Anonymous'}</span>
          </p>
        {/* ⚖️ Debate Mode Stance Selector */}
        {post.postType === 'debate' && (
          <div className="flex gap-3 mb-3">
            <button 
              onClick={() => setStance('agree')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${stance === 'agree' ? 'bg-green-500 border-green-500 text-white' : 'bg-transparent border-gray-300 dark:border-[#343536] text-gray-500 hover:border-green-500 hover:text-green-500'}`}
            ><ThumbsUp size={14} /> I Agree</button>
            <button 
              onClick={() => setStance('disagree')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${stance === 'disagree' ? 'bg-red-500 border-red-500 text-white' : 'bg-transparent border-gray-300 dark:border-[#343536] text-gray-500 hover:border-red-500 hover:text-red-500'}`}
            ><ThumbsDown size={14} /> I Disagree</button>
          </div>
        )}
          <div className="mb-3">
            <div className="border border-gray-200 dark:border-[#343536] rounded-xl overflow-hidden shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 bg-white dark:bg-[#1a1a1b] min-h-24 sm:min-h-32 h-auto resize-none sm:resize-y flex flex-col">
              <TipTapEditor
                value={commentText}
                onChange={setCommentText}
                onPendingFile={(file, url) => setPendingEditorFiles(prev => [...prev, { file, url }])}
                placeholder="What are your thoughts? (Markdown supported ✨)"
                minHeight="100%"
                variant="comment"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={() => handleCommentSubmit(null, commentText)}
              className="bg-gray-900 dark:bg-white text-white dark:text-black font-bold py-1.5 px-6 rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-sm"
            >
              Comment
            </button>
          </div>
        </div>
      )}

      {/* ⚖️ Comments Display Section */}
      {post.postType === 'debate' ? (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Agree Column */}
          <div className="border-t-4 border-green-500 pt-4 bg-linear-to-b from-green-50 to-transparent dark:from-green-900/10 rounded-b-lg">
            <h3 className="text-green-600 dark:text-green-400 font-extrabold mb-4 flex justify-center items-center gap-2 tracking-wide"><ThumbsUp size={18} strokeWidth={2.5} /> For / Agree</h3>
            <div className="flex flex-col gap-2 px-1">
              {rootComments.filter(c => c.stance === 'agree').map((rootComment) => (
                <CommentThread key={rootComment._id} comment={rootComment} onReply={handleCommentSubmit} onVote={handleCommentVote} onShare={handleShare} onEdit={handleCommentEdit} onDelete={handleCommentDelete} currentUser={currentUser} onAcceptBounty={handleAcceptBounty} post={post} isMod={isCommunityAdmin} />
              ))}
              {rootComments.filter(c => c.stance === 'agree').length === 0 && <p className="text-gray-400 text-sm text-center py-4">No arguments for this side yet.</p>}
            </div>
          </div>
          {/* Disagree Column */}
          <div className="border-t-4 border-red-500 pt-4 bg-linear-to-b from-red-50 to-transparent dark:from-red-900/10 rounded-b-lg">
            <h3 className="text-red-600 dark:text-red-400 font-extrabold mb-4 flex justify-center items-center gap-2 tracking-wide"><ThumbsDown size={18} strokeWidth={2.5} /> Against / Disagree</h3>
            <div className="flex flex-col gap-2 px-1">
              {rootComments.filter(c => c.stance === 'disagree').map((rootComment) => (
                <CommentThread key={rootComment._id} comment={rootComment} onReply={handleCommentSubmit} onVote={handleCommentVote} onShare={handleShare} onEdit={handleCommentEdit} onDelete={handleCommentDelete} currentUser={currentUser} onAcceptBounty={handleAcceptBounty} post={post} isMod={isCommunityAdmin} />
              ))}
              {rootComments.filter(c => c.stance === 'disagree').length === 0 && <p className="text-gray-400 text-sm text-center py-4">No arguments for this side yet.</p>}
            </div>
          </div>
        </div>
      ) : (
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
                onAcceptBounty={handleAcceptBounty}
                post={post}
                isMod={isCommunityAdmin}
              />
            ))
          ) : (
            <p className="text-gray-500 text-center mt-4">No comments yet. Be the first to share your thoughts!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PostPage;