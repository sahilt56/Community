import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const CommentThread = ({ 
  comment, 
  depth = 0, 
  onReply, 
  onVote, 
  onShare, 
  onEdit,
  onDelete,
  currentUser 
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleReplySubmit = () => {
    if (!replyText.trim()) return;
    onReply(comment._id, replyText);
    setReplyText('');
    setShowReplyForm(false);
  };

  const handleEditSubmit = () => {
    if (!editText.trim()) return;
    onEdit(comment._id, editText);
    setIsEditing(false);
  };

  const isNested = depth > 0;
  const isAuthor = currentUser && comment.user?._id === currentUser.id;
  const isDeleted = comment.text === "[deleted]";

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
                <Link to={`/u/${comment.user?.username}`} className="hover:underline hover:text-gray-900 dark:hover:text-gray-300 font-bold">
                  u/{comment.user?.username || 'user'}
                </Link>
              )}
            </p>
          </div>
        </div>

        {/* Comment Text / Edit Form */}
        {isEditing ? (
          <div className="mt-2">
            <textarea 
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-white dark:bg-[#272729] text-gray-900 dark:text-white border border-gray-300 dark:border-[#343536] p-2 rounded h-20 outline-none focus:border-blue-500 dark:focus:border-gray-500 resize-none mb-2 text-sm transition-colors"
            />
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
          <p className={`text-gray-800 dark:text-gray-200 text-sm mb-2 ${isDeleted ? 'italic text-gray-500' : ''}`}>
            {comment.text}
          </p>
        )}
        
        {/* Actions bar */}
        {!isDeleted && (
          <div className="flex items-center gap-3 text-xs text-gray-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Comment Voting */}
            <div className="flex items-center bg-gray-200 dark:bg-[#272729] rounded-full overflow-hidden transition-colors">
               <button 
                 onClick={() => onVote(comment._id, 'upvote')}
                 className={`p-1.5 transition-all ${hasUpvoted ? 'text-orange-600 dark:text-orange-500 bg-orange-500/10' : 'hover:bg-gray-300 dark:hover:bg-[#343536]'}`}
               >
                  ⬆️
               </button>
               <span className={`px-1 ${hasUpvoted ? 'text-orange-600 dark:text-orange-500' : hasDownvoted ? 'text-blue-600 dark:text-blue-500' : 'text-gray-900 dark:text-white'}`}>
                 {netVotes}
               </span>
               <button 
                 onClick={() => onVote(comment._id, 'downvote')}
                 className={`p-1.5 transition-all ${hasDownvoted ? 'text-blue-600 dark:text-blue-500 bg-blue-500/10' : 'hover:bg-gray-300 dark:hover:bg-[#343536]'}`}
               >
                  ⬇️
               </button>
            </div>

            <button 
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="hover:bg-gray-200 dark:hover:bg-[#272729] px-2 py-1.5 rounded transition-colors flex items-center gap-1"
            >
              <span>💬 Reply</span>
            </button>

            <button 
              onClick={() => onShare(comment._id)}
              className="hover:bg-gray-200 dark:hover:bg-[#272729] px-2 py-1.5 rounded transition-colors flex items-center gap-1"
            >
              <span>🔗 Share</span>
            </button>

            {/* Author specific actions */}
            {isAuthor && (
              <button 
                onClick={() => setIsEditing(true)}
                className="hover:bg-gray-200 dark:hover:bg-[#272729] px-2 py-1.5 rounded transition-colors flex items-center gap-1"
              >
                <span>✏️ Edit</span>
              </button>
            )}

            {/* Author/Mod can delete (Delete handler handles permissions) */}
            <button 
              onClick={() => {
                // Ensure a nice modern UI if possible in the future, otherwise base confirm works
                if (window.confirm("Are you sure you want to delete this comment?")) {
                  onDelete(comment._id);
                }
              }}
              className="hover:text-red-500 px-2 py-1.5 rounded transition-colors flex items-center gap-1 ml-auto"
            >
              <span>🗑️ Delete</span>
            </button>
          </div>
        )}

        {/* Inline Reply Form */}
        {showReplyForm && (
          <div className="mt-3">
            <textarea 
              placeholder="What are your thoughts?" 
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="w-full bg-white dark:bg-[#272729] text-gray-900 dark:text-white border border-gray-300 dark:border-[#343536] p-2 rounded h-16 outline-none focus:border-blue-500 dark:focus:border-gray-500 resize-none mb-2 text-sm transition-colors"
            />
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentThread;
