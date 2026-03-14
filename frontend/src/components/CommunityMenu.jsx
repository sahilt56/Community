import React, { useState, useEffect, useRef } from 'react';

const CommunityMenu = ({ onReport, onEdit, onDelete, canEdit, isCreator, onOpenChange }) => {
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
        className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-all border border-gray-300 dark:border-[#343536] flex items-center justify-center h-10 w-10"
      >
        ⋮
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-md shadow-2xl py-2 z-[101] flex flex-col min-w-[180px] transition-colors overflow-hidden animate-fade-in">
          {/* Report Action */}
          <div 
            onClick={(e) => { e.stopPropagation(); onReport(); setIsOpen(false); }}
            className="flex items-center gap-3 hover:bg-orange-50 dark:hover:bg-orange-500/10 px-4 py-3 cursor-pointer transition-all"
          >
            <span className="text-gray-400 text-lg">🚩</span>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Report Community</span>
          </div>

          {/* Edit Option (Mod/Creator Only) */}
          {canEdit && (
            <div 
              onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); }}
              className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-[#272729] px-4 py-3 cursor-pointer transition-all border-t border-gray-200 dark:border-[#343536]"
            >
              <span className="text-gray-400 text-lg">✏️</span>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Edit Settings</span>
            </div>
          )}

          {/* Delete Option (Creator Only) */}
          {isCreator && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); }}
              className="flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-500/10 px-4 py-3 transition-all border-t border-gray-200 dark:border-[#343536] text-red-500 w-full text-left"
            >
              <span className="text-lg">🗑️</span> <span className="text-sm font-bold">Delete Community</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CommunityMenu;
