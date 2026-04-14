import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import TipTapEditor from './TipTapEditor';
import api from '../api';
import toast from 'react-hot-toast';
import { ArrowUp, ArrowDown, MessageCircle, Share, Pencil, Trash2, Award } from 'lucide-react';
import { getOptimizedUrl, IMAGE_PRESETS } from '../utils/cloudinaryHelper';

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

const CommentThread = ({ 
  comment, 
  depth = 0, 
  onReply, 
  onVote, 
  onShare, 
  onEdit,
  onDelete,
  currentUser,
  isMod
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pendingEditorFiles, setPendingEditorFiles] = useState([]);

  const handleReplySubmit = async () => {
    if (!replyText.trim()) return;
    
    let finalContent = replyText;
    const filesToUpload = pendingEditorFiles.filter(item => finalContent.includes(item.url));
    if (filesToUpload.length > 0) {
      const loadingId = toast.loading('Uploading media inside reply... ⏳');
      try {
        for (const item of filesToUpload) {
          const fd = new FormData();
          fd.append('media', item.file);
          const res = await api.post('/api/upload', fd);
          const realUrl = res.data.url.startsWith('http') ? res.data.url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${res.data.url}`;
          finalContent = finalContent.split(item.url).join(realUrl);
        }
        toast.success('Media embedded successfully! 🎉', { id: loadingId });
      } catch {
        toast.error("Failed to upload media. ❌", { id: loadingId });
        return;
      }
    }

    onReply(comment._id, finalContent);
    setReplyText('');
    setShowReplyForm(false);
    setPendingEditorFiles([]);
  };

  const handleEditSubmit = async () => {
    if (!editText.trim()) return;

    let finalContent = editText;
    const filesToUpload = pendingEditorFiles.filter(item => finalContent.includes(item.url));
    if (filesToUpload.length > 0) {
      const loadingId = toast.loading('Uploading media inside edit... ⏳');
      try {
        for (const item of filesToUpload) {
          const fd = new FormData();
          fd.append('media', item.file);
          const res = await api.post('/api/upload', fd);
          const realUrl = res.data.url.startsWith('http') ? res.data.url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${res.data.url}`;
          finalContent = finalContent.split(item.url).join(realUrl);
        }
        toast.success('Media embedded successfully! 🎉', { id: loadingId });
      } catch {
        toast.error("Failed to upload media. ❌", { id: loadingId });
        return;
      }
    }

    onEdit(comment._id, finalContent);
    setIsEditing(false);
    setPendingEditorFiles([]);
  };

  const isNested = depth > 0;
  const isAuthor = currentUser && comment.user?._id === currentUser.id;
  const isDeleted = comment.text === "[deleted]";

  // Agar comment deleted hai aur uske aage koi replies (children) nahi hain, toh usko UI se completely hata do
  if (isDeleted && (!comment.children || comment.children.length === 0)) {
    return null;
  }

  // Actions
  const netVotes = (comment.upvotes?.length || 0) - (comment.downvotes?.length || 0);
  const hasUpvoted = comment.upvotes?.includes(currentUser?.id);
  const hasDownvoted = comment.downvotes?.includes(currentUser?.id);

  if (isCollapsed) {
    return (
      <div className={`mt-2 ${isNested ? 'ml-2 pl-4 border-l-2 border-gray-200 dark:border-[#343536]' : ''}`}>
        <button 
          onClick={() => setIsCollapsed(false)}
          className="text-xs text-gray-500 font-bold hover:text-gray-900 dark:hover:text-white transition-all flex items-center gap-2"
        >
          <span>[+]</span> 
          <span>u/{isDeleted ? 'deleted' : comment.user?.username || 'user'}</span>
          <span className="font-normal opacity-50">thread collapsed</span>
        </button>
      </div>
    );
  }

  return (
    <div id={`comment-${comment._id}`} className={`mt-3 ${isNested ? 'ml-2 pl-4 border-l-2 border-gray-300 dark:border-[#343536]' : ''}`}>
      <div className="bg-gray-50 dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] p-3 rounded-md shadow-sm group transition-colors">
        {/* Header: Author & Collapse */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsCollapsed(true)}
              className="text-gray-500 hover:text-gray-900 dark:hover:text-white text-[10px] transition-all"
              title="Collapse thread"
            >
              [-]
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isDeleted ? (
                <span className="font-bold italic text-gray-400 dark:text-gray-500">[deleted]</span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Link to={`/u/${comment.user?.username}`} className="shrink-0 flex items-center">
                    {comment.user?.profilePic ? (
                      <img 
                        src={getOptimizedUrl(
                          comment.user.profilePic.startsWith('http') ? comment.user.profilePic : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${(comment.user.profilePic.startsWith('/') ? '' : '/')}${comment.user.profilePic}`,
                          IMAGE_PRESETS.AVATAR
                        )}
                        alt="" 
                        loading="lazy"
                    fetchpriority="auto"
                        decoding="async"
                        className="w-5 h-5 rounded-full object-cover shadow-sm border border-gray-200 dark:border-[#343536]" 
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-linear-to-tr from-orange-400 to-red-400 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm border border-orange-200 dark:border-[#343536]">
                        {comment.user?.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </Link>
                  <Link to={`/u/${comment.user?.username}`} className="hover:underline hover:text-gray-900 dark:hover:text-gray-300 font-bold flex items-center gap-1">
                    u/{comment.user?.username || 'user'}
                    {comment.user?.hasVartalapBadge && (
                      <Award size={12} className="text-blue-500 shrink-0" />
                    )}
                  </Link>
                </div>
              )}
            </p>
          </div>
        </div>

        {/* Comment Text / Edit Form */}
        {isEditing ? (
          <div className="mt-2">
            <div className="border border-gray-300 dark:border-[#343536] rounded-xl overflow-hidden shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 bg-white dark:bg-[#1a1a1b] min-h-32 h-auto resize-y mb-2">
               <TipTapEditor
                 value={editText}
                 onChange={setEditText}
                 onPendingFile={(file, url) => setPendingEditorFiles(prev => [...prev, { file, url }])}
                 placeholder="Edit your comment..."
                 minHeight="100%"
                 variant="comment"
               />
            </div>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setIsEditing(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-bold py-1 px-3 rounded-full transition-all text-xs"
              >
                Cancel
              </button>
              <button 
                onClick={handleEditSubmit}
                className="bg-gray-900 dark:bg-white text-white dark:text-black font-bold py-1 px-4 rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-all text-xs shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className={`text-gray-800 dark:text-gray-200 text-sm mb-2 prose prose-sm dark:prose-invert max-w-none ${isDeleted ? 'italic text-gray-500' : ''}`}>
            {isDeleted ? (
               <p>[deleted]</p>
            ) : (
               <ReactMarkdown rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeOptions]]}>
                 {comment.text || ''}
               </ReactMarkdown>
            )}
          </div>
        )}
        
        {/* Actions bar */}
        {!isDeleted && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-bold opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity mt-1">
            {/* Comment Voting */}
            <div className="flex items-center bg-gray-200 dark:bg-[#272729] rounded-full overflow-hidden transition-colors">
               <button 
                 onClick={() => onVote(comment._id, 'upvote')}
                 className={`py-1.5 px-2 transition-all ${hasUpvoted ? 'text-orange-600 dark:text-orange-500 bg-orange-500/10' : 'hover:bg-gray-300 dark:hover:bg-[#343536]'}`}
               >
                  <ArrowUp size={16} strokeWidth={hasUpvoted ? 3 : 2} />
               </button>
               <span className={`px-1 ${hasUpvoted ? 'text-orange-600 dark:text-orange-500' : hasDownvoted ? 'text-blue-600 dark:text-blue-500' : 'text-gray-900 dark:text-white'}`}>
                 {netVotes}
               </span>
               <button 
                 onClick={() => onVote(comment._id, 'downvote')}
                 className={`py-1.5 px-2 transition-all ${hasDownvoted ? 'text-blue-600 dark:text-blue-500 bg-blue-500/10' : 'hover:bg-gray-300 dark:hover:bg-[#343536]'}`}
               >
                  <ArrowDown size={16} strokeWidth={hasDownvoted ? 3 : 2} />
               </button>
            </div>

            <button 
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="hover:bg-gray-200 dark:hover:bg-[#272729] px-2 py-1.5 rounded transition-colors flex items-center gap-1.5"
            >
              <MessageCircle size={14} /> <span>Reply</span>
            </button>

            <button 
              onClick={() => onShare(comment._id)}
              className="hover:bg-gray-200 dark:hover:bg-[#272729] px-2 py-1.5 rounded transition-colors flex items-center gap-1.5"
            >
              <Share size={14} /> <span>Share</span>
            </button>

            {/* Author specific actions */}
            {isAuthor && (
              <button 
                onClick={() => setIsEditing(true)}
                className="hover:bg-gray-200 dark:hover:bg-[#272729] px-2 py-1.5 rounded transition-colors flex items-center gap-1.5"
              >
                <Pencil size={14} /> <span>Edit</span>
              </button>
            )}

            {/* Author/Mod can delete (Delete handler handles permissions) */}
            {(isAuthor || isMod) && (
              <button 
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this comment?")) {
                    onDelete(comment._id);
                  }
                }}
                className="hover:text-red-500 px-2 py-1.5 rounded transition-colors flex items-center gap-1.5 ml-auto"
              >
                <Trash2 size={14} /> <span>Delete</span>
              </button>
            )}
          </div>
        )}

        {/* Inline Reply Form */}
        {showReplyForm && (
          <div className="mt-3">
            <div className="border border-gray-300 dark:border-[#343536] rounded-xl overflow-hidden shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 bg-white dark:bg-[#1a1a1b] min-h-32 h-auto resize-y mb-2">
               <TipTapEditor
                 value={replyText}
                 onChange={setReplyText}
                 onPendingFile={(file, url) => setPendingEditorFiles(prev => [...prev, { file, url }])}
                 placeholder="What are your thoughts?"
                 minHeight="100%"
                 variant="comment"
               />
            </div>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowReplyForm(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-bold py-1 px-3 rounded-full transition-all text-xs"
              >
                Cancel
              </button>
              <button 
                onClick={handleReplySubmit}
                className="bg-gray-900 dark:bg-white text-white dark:text-black font-bold py-1 px-4 rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-all text-xs shadow-sm"
              >
                Reply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RECURSIVE CALL FOR CHILDREN */}
      {comment.children && comment.children.length > 0 && (
        <div className="mt-1">
          {comment.children.map(childComment => (
            <CommentThread 
              key={childComment._id} 
              comment={childComment} 
              depth={depth + 1} 
              onReply={onReply} 
              onVote={onVote}
              onShare={onShare}
              onEdit={onEdit}
              onDelete={onDelete}
              currentUser={currentUser}
              isMod={isMod}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentThread;
