// src/pages/SynthesizerPage.jsx
import React from 'react';
import AaaSynthesizer from '../components/AaaSynthesizer';
import './SynthesizerPage.css';

function SynthesizerPage() {
  return (
    <div className="synth-page">
      <div className="synth-hero">
        <h1>Virtual Synthesizer</h1>
        <p className="tagline">Make music in your browser</p>
      </div>
      
      <AaaSynthesizer />
    </div>
  );
}

export default SynthesizerPage;