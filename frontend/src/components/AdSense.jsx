import React, { useEffect } from 'react';

const AdSense = ({ adSlot, adFormat = 'auto', fullWidthResponsive = 'true', style = { display: 'block' } }) => {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, []);

  return (
    <div className="adsense-container w-full overflow-hidden my-4">
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-client="ca-pub-3881909791011190"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive}
      ></ins>
    </div>
  );
};

export default AdSense;
