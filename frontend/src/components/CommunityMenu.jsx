import React, { useState, useEffect, useRef } from 'react';
import { Flag, Settings, Trash2, MoreVertical, EyeOff, Eye } from 'lucide-react';

const CommunityMenu = ({ onReport, onEdit, onDelete, onHide, canEdit, isCreator, isHidden, onOpenChange }) => {
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
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-md shadow-2xl py-1 z-[101] flex flex-col min-w-[140px] transition-colors overflow-hidden animate-fade-in">
          {/* Report Action */}
          <div 
            onClick={(e) => { e.stopPropagation(); onReport(); setIsOpen(false); }}
            className="flex items-center gap-2 hover:bg-orange-50 dark:hover:bg-orange-500/10 px-3 py-2 cursor-pointer transition-all"
          >
            <Flag size={14} className="text-gray-500 group-hover:text-orange-500" strokeWidth={2} />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Report</span>
          </div>

          {/* Edit Option (Mod/Creator Only) */}
          {canEdit && (
            <div 
              onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); }}
              className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-[#272729] px-3 py-2 cursor-pointer transition-all border-t border-gray-200 dark:border-[#343536]"
            >
              <Settings size={14} className="text-gray-500" strokeWidth={2} />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Edit</span>
            </div>
          )}

          {/* Hide/Unhide Option (Creator Only) */}
          {isCreator && (
            <button 
              onClick={(e) => { e.stopPropagation(); onHide && onHide(); setIsOpen(false); }}
              className="flex items-center gap-2 hover:bg-orange-50 dark:hover:bg-orange-500/10 px-3 py-2 transition-all border-t border-gray-200 dark:border-[#343536] text-orange-600 dark:text-orange-400 w-full text-left"
            >
              {isHidden ? <Eye size={14} strokeWidth={2} /> : <EyeOff size={14} strokeWidth={2} />} 
              <span className="text-xs font-bold">{isHidden ? 'Unhide' : 'Hide'}</span>
            </button>
          )}

          {/* Delete Option (Creator Only) */}
          {isCreator && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); }}
              className="flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-500/10 px-3 py-2 transition-all border-t border-gray-200 dark:border-[#343536] text-red-500 w-full text-left"
            >
              <Trash2 size={14} strokeWidth={2} /> <span className="text-xs font-bold">Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
export default CommunityMenu;
