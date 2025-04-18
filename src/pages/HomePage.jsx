// src/pages/HomePage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

function HomePage() {
  return (
    <div className="home-page">
      <div className="hero">
        <h1>Welcome to aaa.run</h1>
        <p className="tagline">Experience music in your browser</p>
        <div className="cta-buttons">
          <Link to="/synthesizer" className="cta-button primary">Try Synthesizer</Link>
          <Link to="/" className="cta-button secondary">Learn More</Link>
        </div>
      </div>
      
      <div className="intro-section">
        <h2>Make Music Online</h2>
        <p>
          Our browser-based synthesizer lets you create music right in your web browser.
          No downloads, no installs - just pure musical creativity.
        </p>
      </div>
    </div>
  );
}

export default HomePage;