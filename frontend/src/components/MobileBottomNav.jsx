import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Plus, User, Users } from 'lucide-react';

const MobileBottomNav = () => {
  const location = useLocation();
  const currentUser = JSON.parse(localStorage.getItem('user'));

  // Helper for active link styles
  const isActive = (path, exact = true) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="xl:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a1a1b] border-t border-gray-200 dark:border-[#343536] flex justify-around items-center px-2 py-1 z-[100] shadow-sm pb-safe">
       <Link 
          to="/" 
          className={`relative flex flex-col items-center p-1.5 w-14 transition-all duration-300 ease-spring ${isActive('/') ? 'text-orange-500' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
       >
         <div className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 ${isActive('/') ? 'bg-orange-50 dark:bg-orange-500/10' : 'bg-transparent'}`}>
           <Home size={22} strokeWidth={isActive('/') ? 2.5 : 2} className={isActive('/') ? 'scale-110' : ''} />
         </div>
         <span className={`text-[10px] font-medium mt-0.5 transition-all ${isActive('/') ? 'font-bold opacity-100' : 'opacity-70'}`}>Home</span>
       </Link>
       
       <Link 
          to="/explore" 
          className={`relative flex flex-col items-center p-1.5 w-14 transition-all duration-300 ease-spring ${isActive('/explore') ? 'text-orange-500' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
       >
         <div className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 ${isActive('/explore') ? 'bg-orange-50 dark:bg-orange-500/10' : 'bg-transparent'}`}>
           <Compass size={22} strokeWidth={isActive('/explore') ? 2.5 : 2} className={isActive('/explore') ? 'scale-110' : ''} />
         </div>
         <span className={`text-[10px] font-medium mt-0.5 transition-all ${isActive('/explore') ? 'font-bold opacity-100' : 'opacity-70'}`}>Explore</span>
       </Link>
       
       {currentUser && (
         <>
           {/* Mobile Only: + for Create Community */}
           <Link 
              to="/create-community" 
              className={`md:hidden relative flex flex-col items-center p-1.5 w-14 transition-all duration-300 ease-spring ${isActive('/create-community') ? 'text-orange-500' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
           >
             <div className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 ${isActive('/create-community') ? 'bg-orange-50 dark:bg-orange-500/10' : 'bg-transparent'}`}>
               <Plus size={22} strokeWidth={isActive('/create-community') ? 2.5 : 2} className={isActive('/create-community') ? 'scale-110' : ''} />
             </div>
             <span className={`text-[10px] font-medium mt-0.5 transition-all ${isActive('/create-community') ? 'font-bold opacity-100' : 'opacity-70'}`}>Community</span>
           </Link>

           {/* Tablet/iPad Only: + for Create Post */}
           <Link 
              to="/create-post" 
              className={`hidden md:flex relative flex-col items-center p-1.5 w-14 transition-all duration-300 ease-spring ${isActive('/create-post') ? 'text-orange-500' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
           >
             <div className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 ${isActive('/create-post') ? 'bg-orange-50 dark:bg-orange-500/10' : 'bg-transparent'}`}>
               <Plus size={22} strokeWidth={isActive('/create-post') ? 2.5 : 2} className={isActive('/create-post') ? 'scale-110' : ''} />
             </div>
             <span className={`text-[10px] font-medium mt-0.5 transition-all ${isActive('/create-post') ? 'font-bold opacity-100' : 'opacity-70'}`}>Post</span>
           </Link>

           {/* Tablet/iPad Only: Users icon for Create Community */}
           <Link 
              to="/create-community" 
              className={`hidden md:flex relative flex-col items-center p-1.5 w-14 transition-all duration-300 ease-spring ${isActive('/create-community') ? 'text-orange-500' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
           >
             <div className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 ${isActive('/create-community') ? 'bg-orange-50 dark:bg-orange-500/10' : 'bg-transparent'}`}>
               <Users size={22} strokeWidth={isActive('/create-community') ? 2.5 : 2} className={isActive('/create-community') ? 'scale-110' : ''} />
             </div>
             <span className={`text-[10px] font-medium mt-0.5 transition-all ${isActive('/create-community') ? 'font-bold opacity-100' : 'opacity-70'}`}>Community</span>
           </Link>
         </>
       )}
       
       <Link 
          to={currentUser ? `/u/${currentUser.username}` : "/login"} 
          className={`relative flex flex-col items-center p-1.5 w-14 transition-all duration-300 ease-spring ${isActive('/u/', false) ? 'text-orange-500' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
       >
         <div className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 ${isActive('/u/', false) ? 'bg-orange-50 dark:bg-orange-500/10' : 'bg-transparent'}`}>
           <User size={22} strokeWidth={isActive('/u/', false) ? 2.5 : 2} className={isActive('/u/', false) ? 'scale-110' : ''} />
         </div>
         <span className={`text-[10px] font-medium mt-0.5 transition-all ${isActive('/u/', false) ? 'font-bold opacity-100' : 'opacity-70'}`}>Profile</span>
       </Link>
    </div>
  );
};

export default MobileBottomNav;