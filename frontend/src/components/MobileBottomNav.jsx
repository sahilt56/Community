import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Plus, User, Users } from 'lucide-react';

const NavItem = (props) => {
  const { to, exact = true, icon: Icon, label, hiddenOnMobile = false, hiddenOnTablet = false, location } = props;
  const active = exact ? location.pathname === to : location.pathname.startsWith(to);
  
  // Desktop hidden classes based on props
  const displayClass = `
    ${hiddenOnMobile ? 'hidden md:flex' : 'flex'}
    ${hiddenOnTablet ? 'md:hidden' : ''}
  `.trim();

  return (
    <Link 
      to={to} 
      className={`relative flex-col items-center justify-center pt-1 pb-1.5 w-16 transition-all duration-300 ease-spring gap-1 ${displayClass} ${active ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
    >
      <div className={`relative flex items-center justify-center w-12 h-7 rounded-full transition-all duration-300 ${active ? 'bg-transparent scale-105' : 'bg-transparent scale-100'}`}>
        <Icon 
          size={20} 
          strokeWidth={active ? 2.5 : 2.25} 
          className="transition-all"
          fill="none" 
        />
      </div>
      <span className={`text-[10px] leading-none transition-all duration-300 ${active ? 'font-extrabold' : 'font-medium opacity-90'}`}>
        {label}
      </span>
    </Link>
  );
};

const MobileBottomNav = () => {
  const location = useLocation();
  const currentUser = JSON.parse(localStorage.getItem('user'));

  return (
    <div className="xl:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#1a1a1b]/90 backdrop-blur-xl border-t border-gray-200 dark:border-[#343536] flex justify-around items-center px-2 py-1 z-100 pb-safe">
       <NavItem to="/" exact={true} icon={Home} label="Home" location={location} />
       <NavItem to="/explore" exact={false} icon={Compass} label="Explore" location={location} />
       
       {currentUser && (
         <>
           <NavItem to="/create-community" exact={false} icon={Plus} label="Community" hiddenOnTablet={true} location={location} />
           <NavItem to="/create-post" exact={false} icon={Plus} label="Post" hiddenOnMobile={true} location={location} />
           <NavItem to="/create-community" exact={false} icon={Users} label="Community" hiddenOnMobile={true} location={location} />
         </>
       )}
       
       <NavItem to={currentUser ? `/u/${currentUser.username}` : "/login"} exact={false} icon={User} label="Profile" location={location} />
    </div>
  );
};

export default MobileBottomNav;