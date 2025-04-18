// AaaSynthesizer.jsx
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react';
import './Synthesizer.css';

const AaaSynthesizer = () => {
  // Audio context and nodes
  const audioContextRef = useRef(null);
  const activeNotesRef = useRef({});
  const masterGainRef = useRef(null);
  const filterRef = useRef(null);
  const reverbRef = useRef(null);
  const lfoRef = useRef(null);
  
  // State for synth parameters
  const [isInitialized, setIsInitialized] = useState(false);
  const [waveform, setWaveform] = useState('sine');
  const [volume, setVolume] = useState(0.5);
  const [attackTime, setAttackTime] = useState(0.1);
  const [releaseTime, setReleaseTime] = useState(0.3);
  const [activeNotes, setActiveNotes] = useState([]);
  const [octaveShift, setOctaveShift] = useState(0);
  
  // New parameters for additional features
  const [filterType, setFilterType] = useState('lowpass');
  const [filterCutoff, setFilterCutoff] = useState(20000);
  const [filterResonance, setFilterResonance] = useState(1);
  
  const [reverbAmount, setReverbAmount] = useState(0.1);
  
  const [lfoEnabled, setLfoEnabled] = useState(false);
  const [lfoRate, setLfoRate] = useState(5);
  const [lfoDepth, setLfoDepth] = useState(5);
  const [lfoTarget, setLfoTarget] = useState('filter');

  // Base note frequencies (before octave shift)
  const noteFrequencies = useRef({
    'a': 261.63, // C4
    's': 293.66, // D4
    'd': 329.63, // E4
    'f': 349.23, // F4
    'g': 392.00, // G4
    'h': 440.00, // A4
    'j': 493.88, // B4
    'k': 523.25, // C5
    'l': 587.33  // D5
  });

  // Key to note mapping for display
  const keyToNote = {
    'a': 'C',
    's': 'D',
    'd': 'E',
    'f': 'F',
    'g': 'G',
    'h': 'A',
    'j': 'B',
    'k': 'C♯',
    'l': 'D♯'
  };

  // Track pressed keys to handle polyphonic input
  const pressedKeysRef = useRef(new Set());

  // Initialize the audio context and effects chain
  const initializeAudio = () => {
    if (!isInitialized) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      // Create master gain node
      const masterGain = audioContext.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(audioContext.destination);
      masterGainRef.current = masterGain;
      
      // Create filter node
      const filter = audioContext.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = filterCutoff;
      filter.Q.value = filterResonance;
      filter.connect(masterGain);
      filterRef.current = filter;
      
      // Create reverb (ConvolverNode)
      createReverb(audioContext, filter).then(reverb => {
        reverbRef.current = reverb;
      });
      
      // Create LFO (OscillatorNode)
      const lfo = audioContext.createOscillator();
      const lfoGain = audioContext.createGain();
      
      lfo.type = 'sine';
      lfo.frequency.value = lfoRate;
      lfoGain.gain.value = lfoEnabled ? lfoDepth : 0;
      
      lfo.connect(lfoGain);
      
      // LFO will be connected to target parameter when target changes
      updateLfoTarget(lfoTarget, lfoGain);
      
      lfo.start();
      lfoRef.current = { oscillator: lfo, gain: lfoGain };
      
      setIsInitialized(true);
    }
  };
  
  // Create reverb effect
  const createReverb = async (audioContext, destination) => {
    // Simple impulse response for reverb
    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * 2; // 2 seconds reverb
    const impulse = audioContext.createBuffer(2, length, sampleRate);
    
    // Fill buffer with decaying noise (simple impulse response)
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2);
        channelData[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    
    // Create convolver and connect
    const convolver = audioContext.createConvolver();
    convolver.buffer = impulse;
    
    // Create dry/wet mix
    const dryGain = audioContext.createGain();
    const wetGain = audioContext.createGain();
    
    dryGain.gain.value = 1 - reverbAmount;
    wetGain.gain.value = reverbAmount;
    
    // Connect chain
    destination.connect(dryGain);
    destination.connect(convolver);
    convolver.connect(wetGain);
    
    dryGain.connect(audioContext.destination);
    wetGain.connect(audioContext.destination);
    
    return { convolver, dryGain, wetGain };
  };
  
  // Update LFO target connection
  const updateLfoTarget = (target, lfoGain = lfoRef.current?.gain) => {
    if (!lfoGain || !isInitialized) return;
    
    // Disconnect from any previous targets
    try {
      lfoGain.disconnect();
    } catch (e) {
      console.log("No previous connections to disconnect");
    }
    
    // Connect to new target
    if (target === 'filter' && filterRef.current) {
      lfoGain.connect(filterRef.current.frequency);
    } else if (target === 'pitch') {
      // We'll handle pitch modulation in the playNote function
    }
  };

  // Update effect parameters when they change
  useEffect(() => {
    if (!isInitialized) return;
    
    // Update master volume
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume;
    }
    
    // Update filter parameters
    if (filterRef.current) {
      filterRef.current.type = filterType;
      filterRef.current.frequency.value = filterCutoff;
      filterRef.current.Q.value = filterResonance;
    }
    
    // Update reverb mix
    if (reverbRef.current) {
      reverbRef.current.dryGain.gain.value = 1 - reverbAmount;
      reverbRef.current.wetGain.gain.value = reverbAmount;
    }
    
    // Update LFO parameters
    if (lfoRef.current) {
      lfoRef.current.oscillator.frequency.value = lfoRate;
      lfoRef.current.gain.gain.value = lfoEnabled ? lfoDepth : 0;
      updateLfoTarget(lfoTarget);
    }
  }, [
    isInitialized, volume, filterType, filterCutoff, 
    filterResonance, reverbAmount, lfoEnabled, lfoRate, 
    lfoDepth, lfoTarget
  ]);

  // Play a note
  const playNote = (note) => {
    if (!isInitialized) return;
    
    // Get base frequency and apply octave shift
    const baseFrequency = noteFrequencies.current[note];
    if (!baseFrequency) return;
    
    // Calculate actual frequency with octave shift
    const frequency = baseFrequency * Math.pow(2, octaveShift);
    
    const audioContext = audioContextRef.current;
    const currentTime = audioContext.currentTime;
    const existingNote = activeNotesRef.current[note];
    
    // Create fresh oscillator and gain node
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Configure oscillator
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, currentTime);
    
    // Apply LFO to pitch if needed
    if (lfoEnabled && lfoTarget === 'pitch' && lfoRef.current) {
      const pitchModulation = audioContext.createGain();
      pitchModulation.gain.value = frequency * 0.05; // 5% modulation depth
      lfoRef.current.gain.connect(pitchModulation);
      pitchModulation.connect(oscillator.frequency);
    }
    
    // Connect nodes to effects chain
    oscillator.connect(gainNode);
    
    // Connect to filter -> master chain
    if (filterRef.current) {
      gainNode.connect(filterRef.current);
    } else {
      gainNode.connect(masterGainRef.current);
    }
    
    // Start with zero gain
    gainNode.gain.setValueAtTime(0, currentTime);
    
    // If the same note is already playing, create a more natural transition
    if (existingNote) {
      const { oscillator: oldOsc, gainNode: oldGain, timeoutId } = existingNote;
      
      try {
        // Cancel any pending timeouts
        if (timeoutId) clearTimeout(timeoutId);
        
        // Create a natural-sounding retrigger effect
        // Short release for the previous note
        oldGain.gain.cancelScheduledValues(currentTime);
        oldGain.gain.setValueAtTime(oldGain.gain.value, currentTime);
        oldGain.gain.linearRampToValueAtTime(0, currentTime + 0.03);
        
        // Schedule old oscillator to stop after the short release
        oldOsc.stop(currentTime + 0.05);
        
        // Start new note with a faster attack for repeated notes
        const quickAttack = Math.min(attackTime, 0.05);
        gainNode.gain.linearRampToValueAtTime(volume, currentTime + quickAttack);
        
        // Clean up old note reference after a short delay
        const newTimeoutId = setTimeout(() => {
          try {
            delete activeNotesRef.current[note];
            // Create a new reference right away with the new oscillator
            activeNotesRef.current[note] = {
              oscillator,
              gainNode,
              startTime: currentTime
            };
          } catch (e) {
            console.error("Error cleaning up during retrigger:", e);
          }
        }, 30); // 30ms delay to allow smooth transition
        
        // Update the existing note's timeout
        existingNote.timeoutId = newTimeoutId;
      } catch (e) {
        console.error("Error during note retrigger:", e);
        // Fall back to standard note behavior on error
        gainNode.gain.linearRampToValueAtTime(volume, currentTime + attackTime);
        activeNotesRef.current[note] = {
          oscillator,
          gainNode,
          startTime: currentTime
        };
      }
    } else {
      // Normal note start (first time playing this note)
      gainNode.gain.linearRampToValueAtTime(volume, currentTime + attackTime);
      
      // Store reference to the new note
      activeNotesRef.current[note] = {
        oscillator,
        gainNode,
        startTime: currentTime
      };
    }
    
    // Start the oscillator
    oscillator.start();
    
    // Update UI - ensure the note is only added once in the array
    setActiveNotes(prev => {
      if (prev.includes(note)) return prev;
      return [...prev, note];
    });
  };

  // Stop a note
  const stopNote = (note) => {
    if (!isInitialized || !activeNotesRef.current[note]) return;
    
    const { oscillator, gainNode, timeoutId } = activeNotesRef.current[note];
    const audioContext = audioContextRef.current;
    
    try {
      // Cancel any existing timeout
      if (timeoutId) clearTimeout(timeoutId);
      
      // Apply release envelope
      gainNode.gain.cancelScheduledValues(audioContext.currentTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + releaseTime);
      
      // Stop oscillator with a definite time
      const stopTime = audioContext.currentTime + releaseTime + 0.1;
      oscillator.stop(stopTime);
      
      // Update UI immediately
      setActiveNotes(prev => prev.filter(n => n !== note));
      
      // Schedule final cleanup
      const newTimeoutId = setTimeout(() => {
        try {
          delete activeNotesRef.current[note];
        } catch (e) {
          console.error("Error cleaning up note:", e);
        }
      }, releaseTime * 1000 + 300);
      
      // Store timeout ID
      activeNotesRef.current[note].timeoutId = newTimeoutId;
    } catch (e) {
      console.error("Error stopping note:", e);
      // Force cleanup on error
      try {
        oscillator.stop();
      } catch (e) {
        console.error("Failed to stop oscillator:", e);
      }
      delete activeNotesRef.current[note];
      setActiveNotes(prev => prev.filter(n => n !== note));
    }
  };

  // Emergency stop - stop all sounds
  const stopAllSounds = () => {
    if (!isInitialized) return;
    
    console.log("Stopping all sounds, notes count:", Object.keys(activeNotesRef.current).length);
    
    // Stop all active oscillators
    Object.entries(activeNotesRef.current).forEach(([note, { oscillator, gainNode, timeoutId }]) => {
      try {
        // Cancel any pending timeouts
        if (timeoutId) clearTimeout(timeoutId);
        
        // Immediately silence the gain node
        gainNode.gain.cancelScheduledValues(audioContextRef.current.currentTime);
        gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
        
        // Stop the oscillator immediately
        oscillator.stop(audioContextRef.current.currentTime);
        console.log(`Stopped note: ${note}`);
      } catch (e) {
        console.error(`Error stopping sound for note ${note}:`, e);
      }
    });
    
    // Clear all active notes
    activeNotesRef.current = {};
    setActiveNotes([]);
  };

  // Handle keyboard events with improved polyphonic support
  useEffect(() => {
    if (!isInitialized) return;
    
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      
      // Only process valid notes that aren't being repeated by key repeat
      if (noteFrequencies.current[key] && !e.repeat) {
        // Add to our tracked pressed keys
        pressedKeysRef.current.add(key);
        
        // Play the note
        playNote(key);
      }
      
      // Handle octave shifting
      if (e.key === 'z' && !e.repeat) {
        setOctaveShift(prev => Math.max(prev - 1, -2));
      }
      if (e.key === 'x' && !e.repeat) {
        setOctaveShift(prev => Math.min(prev + 1, 2));
      }
    };
    
    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      
      if (noteFrequencies.current[key]) {
        // Remove from our tracked pressed keys
        pressedKeysRef.current.delete(key);
        
        // Stop the note
        stopNote(key);
      }
    };
    
    // Handle case when window loses focus - stop all currently pressed keys
    const handleBlur = () => {
      // Stop all currently pressed keys
      pressedKeysRef.current.forEach(key => {
        stopNote(key);
      });
      // Clear the set
      pressedKeysRef.current.clear();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isInitialized, waveform, volume, attackTime, releaseTime, octaveShift]);

  // Clean up audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        try {
          if (typeof stopAllSounds === 'function') {
            stopAllSounds();
          }
          
          // Stop LFO
          if (lfoRef.current && lfoRef.current.oscillator) {
            lfoRef.current.oscillator.stop();
          }
          
          // Additional cleanup
          setTimeout(() => {
            try {
              if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
              }
            } catch (e) {
              console.error("Error closing audio context:", e);
            }
          }, 300);
        } catch (e) {
          console.error("Error during cleanup:", e);
        }
      }
    };
  }, []);

  return (
    <div className="synth-container">
      <div className="synth-header">
        <h2>AAA.run Synthesizer</h2>
        <p>Click keys or use your computer keyboard (A-L) to play</p>
        <div className="header-buttons">
          {!isInitialized ? (
            <button 
              onClick={initializeAudio}
              className="init-button"
            >
              Initialize Synthesizer
            </button>
          ) : (
            <>
              <button 
                onClick={stopAllSounds} 
                className="panic-button"
              >
                Panic (Stop All Sounds)
              </button>
              <div className="octave-controls">
                <span>Octave: {octaveShift}</span>
                <div>
                  <button 
                    onClick={() => setOctaveShift(prev => Math.max(prev - 1, -2))}
                    className="octave-button"
                    disabled={octaveShift <= -2}
                  >
                    -
                  </button>
                  <button 
                    onClick={() => setOctaveShift(prev => Math.min(prev + 1, 2))}
                    className="octave-button"
                    disabled={octaveShift >= 2}
                  >
                    +
                  </button>
                </div>
                <span className="key-hint">(Z/X keys)</span>
              </div>
            </>
          )}
        </div>
      </div>
      
      {isInitialized && (
        <>
          <div className="control-section">
            <h3>Oscillator</h3>
            <div className="control-panel">
              <div className="control-group">
                <label>
                  Waveform
                </label>
                <select 
                  value={waveform} 
                  onChange={(e) => setWaveform(e.target.value)}
                >
                  <option value="sine">Sine</option>
                  <option value="square">Square</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                </select>
              </div>
              
              <div className="control-group">
                <label>
                  Volume: {Math.round(volume * 100)}%
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={volume} 
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                />
              </div>
              
              <div className="control-group">
                <label>
                  Attack: {attackTime.toFixed(2)}s
                </label>
                <input 
                  type="range" 
                  min="0.01" 
                  max="1" 
                  step="0.01" 
                  value={attackTime} 
                  onChange={(e) => setAttackTime(parseFloat(e.target.value))}
                />
              </div>
              
              <div className="control-group">
                <label>
                  Release: {releaseTime.toFixed(2)}s
                </label>
                <input 
                  type="range" 
                  min="0.01" 
                  max="2" 
                  step="0.01" 
                  value={releaseTime} 
                  onChange={(e) => setReleaseTime(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
          
          <div className="control-section">
            <h3>Filter</h3>
            <div className="control-panel">
              <div className="control-group">
                <label>
                  Filter Type
                </label>
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="lowpass">Low Pass</option>
                  <option value="highpass">High Pass</option>
                  <option value="bandpass">Band Pass</option>
                  <option value="notch">Notch</option>
                </select>
              </div>
              
              <div className="control-group">
                <label>
                  Cutoff: {filterCutoff.toFixed(0)} Hz
                </label>
                <input 
                  type="range" 
                  min="20" 
                  max="20000" 
                  step="1" 
                  value={filterCutoff} 
                  onChange={(e) => setFilterCutoff(parseFloat(e.target.value))}
                />
              </div>
              
              <div className="control-group">
                <label>
                  Resonance: {filterResonance.toFixed(1)}
                </label>
                <input 
                  type="range" 
                  min="0.1" 
                  max="20" 
                  step="0.1" 
                  value={filterResonance} 
                  onChange={(e) => setFilterResonance(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
          
          <div className="control-section">
            <h3>Effects</h3>
            <div className="control-panel">
              <div className="control-group">
                <label>
                  Reverb: {Math.round(reverbAmount * 100)}%
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="0.9" 
                  step="0.01" 
                  value={reverbAmount} 
                  onChange={(e) => setReverbAmount(parseFloat(e.target.value))}
                />
              </div>
              
              <div className="control-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={lfoEnabled} 
                    onChange={(e) => setLfoEnabled(e.target.checked)}
                  />
                  Enable LFO
                </label>
              </div>
              
              <div className="control-group">
                <label>
                  LFO Rate: {lfoRate.toFixed(1)} Hz
                </label>
                <input 
                  type="range" 
                  min="0.1" 
                  max="20" 
                  step="0.1" 
                  value={lfoRate} 
                  onChange={(e) => setLfoRate(parseFloat(e.target.value))}
                  disabled={!lfoEnabled}
                />
              </div>
              
              <div className="control-group">
                <label>
                  LFO Depth: {lfoDepth.toFixed(0)}
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  step="1" 
                  value={lfoDepth} 
                  onChange={(e) => setLfoDepth(parseFloat(e.target.value))}
                  disabled={!lfoEnabled}
                />
              </div>
              
              <div className="control-group">
                <label>
                  LFO Target
                </label>
                <select 
                  value={lfoTarget} 
                  onChange={(e) => setLfoTarget(e.target.value)}
                  disabled={!lfoEnabled}
                >
                  <option value="filter">Filter Cutoff</option>
                  <option value="pitch">Pitch</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="keyboard">
            {Object.keys(keyToNote).map(key => (
              <div 
                key={key}
                className={`key ${activeNotes.includes(key) ? 'active' : ''}`}
                onMouseDown={(e) => {
                  // Prevent default to avoid focus issues
                  e.preventDefault();
                  playNote(key);
                }}
                onMouseUp={() => stopNote(key)}
                onMouseLeave={() => activeNotes.includes(key) && stopNote(key)}
                onTouchStart={(e) => {
                  // Prevent default to avoid scrolling on mobile
                  e.preventDefault();
                  playNote(key);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stopNote(key);
                }}
              >
                <span className="note-name">{keyToNote[key]}</span>
                <span className="key-label">({key.toUpperCase()})</span>
              </div>
            ))}
          </div>
          
          <div className="synth-instructions">
            <p>Play multiple keys at once to create chords</p>
          </div>
        </>
      )}
    </div>
  );
};

export default AaaSynthesizer;