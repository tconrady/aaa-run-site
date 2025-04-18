// src/components/Footer.jsx
import React from 'react';
import './Footer.css';

function Footer() {
  return (
    <footer className="site-footer">
      <p>&copy; 2025 aaa.run - All rights reserved</p>
      <div className="social-links">
        <a href="#" aria-label="GitHub">GH</a>
        <a href="#" aria-label="LinkedIn">LI</a>
      </div>
    </footer>
  );
}

export default Footer;