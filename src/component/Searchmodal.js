// src/component/Searchmodal.jsx
import React, { useEffect } from 'react';

const Searchmodal = ({ isOpen, onClose }) => {
  useEffect(() => {
    const escClose = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', escClose);
    return () => document.removeEventListener('keydown', escClose);
  }, [onClose]);

  return (
    <div className={`search-model ${isOpen ? 'active' : ''}`}>
      <div className="h-100 d-flex align-items-center justify-content-center">
        <div className="search-close-switch" onClick={onClose}>+</div>
        <form className="search-model-form" onSubmit={(e) => e.preventDefault()}>
          <input type="text" id="search-input" placeholder="Search here....." />
        </form>
      </div>
    </div>
  );
};

export default Searchmodal;
