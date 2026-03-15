import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, Bookmark, BookmarkCheck, EyeOff, Flag, Trash2 } from 'lucide-react';

const PostMenu = ({ post, currentUser, onSave, onHide, onReport, onDelete, onOpenChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    if (onOpenChange) onOpenChange(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isSaved = currentUser && post.savedBy?.includes(currentUser.id);
  const isHidden = currentUser && post.hiddenBy?.includes(currentUser.id);
  
  // Check if author ID matches current user ID (handling both object and string ID)
  const isAuthor = currentUser && (
    (post.author?._id === currentUser.id || post.author === currentUser.id) ||
    (post.author?.username === currentUser.username)
  );

  return (
    <div className={`relative shrink-0 ${isOpen ? 'z-[100]' : ''}`} ref={menuRef}>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#272729] transition-all btn-press"
      >
        <MoreVertical size={18} strokeWidth={2.5} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-md shadow-2xl py-2 z-[101] flex flex-col min-w-[160px] transition-colors overflow-hidden animate-fade-in">
          {/* Save Action - Hidden for Author */}
          {onSave && !isAuthor && (
            <div 
              onClick={(e) => { e.stopPropagation(); onSave(post._id); setIsOpen(false); }}
              className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-[#272729] px-4 py-2.5 cursor-pointer transition-all"
            >
              {isSaved ? <BookmarkCheck size={16} className="text-green-500" strokeWidth={2.5} /> : <Bookmark size={16} className="text-gray-500" strokeWidth={2} />}
              <span className={`text-sm font-bold ${isSaved ? 'text-green-500' : 'text-gray-700 dark:text-gray-300'}`}>
                {isSaved ? 'Saved' : 'Save'}
              </span>
            </div>
          )}

          {/* Hide Action (Restricted to author by user request) */}
          {onHide && isAuthor && (
            <div 
              onClick={(e) => { e.stopPropagation(); onHide(post._id); setIsOpen(false); }}
              className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-[#272729] px-4 py-2.5 cursor-pointer transition-all"
            >
              {isHidden ? <EyeOff size={16} className="text-red-500" strokeWidth={2.5} /> : <EyeOff size={16} className="text-gray-500" strokeWidth={2} />}
              <span className={`text-sm font-bold ${isHidden ? 'text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {isHidden ? 'Unhide' : 'Hide'}
              </span>
            </div>
          )}

          {/* Report Action - Hidden for Author */}
          {onReport && !isAuthor && (
            <div 
              onClick={(e) => { e.stopPropagation(); onReport(post._id); setIsOpen(false); }}
              className="flex items-center gap-3 hover:bg-orange-50 dark:hover:bg-orange-500/10 px-4 py-2.5 cursor-pointer transition-all text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-500"
            >
              <Flag size={16} className="text-gray-500 group-hover:text-orange-500" strokeWidth={2} />
              <span className="text-sm font-bold">Report</span>
            </div>
          )}

          {/* Delete Option (Author Only) */}
          {onDelete && isAuthor && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(post._id); setIsOpen(false); }}
              className="flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-500/10 px-4 py-2.5 transition-all border-t border-gray-200 dark:border-[#343536] mt-1 text-red-500 w-full text-left"
            >
              <Trash2 size={16} strokeWidth={2} /> <span className="text-sm font-bold">Delete Post</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PostMenu;
