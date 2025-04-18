// src/components/Header.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="logo">aaa.run</Link>
      <nav className="site-nav">
        <Link to="/">Home</Link>
        <Link to="/synthesizer">Synthesizer</Link>
      </nav>
    </header>
  );
}

export default Header;