import React from 'react';
import './LiquidButton.css';

const LiquidButton = ({ children, disabled, className = '', onClick, type = 'button' }) => {
  return (
    <div className={`glass-capsule-wrapper ${className}`}>
      <button 
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={`glass-capsule shadow-lg text-base ${disabled ? 'disabled-state' : ''}`}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
      </button>
    </div>
  );
};

export default LiquidButton;
