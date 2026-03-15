import React from 'react';
import useMediaQuery from '../hooks/useMediaQuery';

const ResponsiveWrapper = ({ mobileView, desktopView }) => {
  // iPad Pro aur bade Tabs ke liye 'xl' (1280px) breakpoint use karenge taaki center alignment bane rahe
  const isDesktop = useMediaQuery('(min-width: 1280px)');

  // Agar screen 1280px ya usse badi hai, toh desktop view render hoga
  if (isDesktop) {
    return <>{desktopView}</>;
  }

  // Warna mobile view render hoga
  return <>{mobileView}</>;
};

export default ResponsiveWrapper;