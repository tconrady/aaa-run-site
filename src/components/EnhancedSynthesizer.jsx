// EnhancedAaaSynthesizer.jsx
import { useState, useEffect, useRef } from 'react';
import './Synthesizer.css';
import './EnhancedSynthesizer.css';

// Tooltip component for parameter explanations
const ControlTooltip = ({ text }) => (
  <div className="tooltip">
    <span className="info-icon">?</span>
    <span className="tooltip-text">{text}</span>
  </div>
);

// Preset definitions
const SYNTH_PRESETS = {
  "Default": {
    waveform: 'sine',
    volume: 0.5,
    attackTime: 0.1,
    decayTime: 0.2,
    sustainLevel: 0.7,
    releaseTime: 0.3,
    filterType: 'lowpass',
    filterCutoff: 20000,
    filterResonance: 1,
    reverbAmount: 0.1,
    delayTime: 0.3,
    delayFeedback: 0.2,
    delayMix: 0.1,
    lfoEnabled: false,
    lfoRate: 5,
    lfoDepth: 5,
    lfoTarget: 'filter'
  },
  "Spacey Pad": {
    waveform: 'sine',
    volume: 0.4,
    attackTime: 0.8,
    decayTime: 0.4,
    sustainLevel: 0.6,
    releaseTime: 1.5,
    filterType: 'lowpass',
    filterCutoff: 2000,
    filterResonance: 2,
    reverbAmount: 0.6,
    delayTime: 0.5,
    delayFeedback: 0.4,
    delayMix: 0.3,
    lfoEnabled: true,
    lfoRate: 0.5,
    lfoDepth: 10,
    lfoTarget: 'filter'
  },
  "Bass": {
    waveform: 'sawtooth',
    volume: 0.6,
    attackTime: 0.05,
    decayTime: 0.2,
    sustainLevel: 0.4,
    releaseTime: 0.1,
    filterType: 'lowpass',
    filterCutoff: 800,
    filterResonance: 4,
    reverbAmount: 0.1,
    delayTime: 0.2,
    delayFeedback: 0.1,
    delayMix: 0.05,
    lfoEnabled: false,
    lfoRate: 5,
    lfoDepth: 5,
    lfoTarget: 'filter'
  },
  "Plucky Lead": {
    waveform: 'square',
    volume: 0.5,
    attackTime: 0.01,
    decayTime: 0.1,
    sustainLevel: 0.3,
    releaseTime: 0.2,
    filterType: 'highpass',
    filterCutoff: 800,
    filterResonance: 3,
    reverbAmount: 0.2,
    delayTime: 0.25,
    delayFeedback: 0.3,
    delayMix: 0.15,
    lfoEnabled: true,
    lfoRate: 6,
    lfoDepth: 3,
    lfoTarget: 'pitch'
  },
  "Ambient Drone": {
    waveform: 'triangle',
    volume: 0.4,
    attackTime: 1.0,
    decayTime: 0.5,
    sustainLevel: 0.8,
    releaseTime: 2.0,
    filterType: 'bandpass',
    filterCutoff: 1200,
    filterResonance: 8,
    reverbAmount: 0.7,
    delayTime: 0.7,
    delayFeedback: 0.6,
    delayMix: 0.4,
    lfoEnabled: true,
    lfoRate: 0.2,
    lfoDepth: 20,
    lfoTarget: 'filter'
  }
};

const EnhancedAaaSynthesizer = () => {
  // Audio context and nodes
  const audioContextRef = useRef(null);
  const activeNotesRef = useRef({});
  const masterGainRef = useRef(null);
  const filterRef = useRef(null);
  const reverbRef = useRef(null);
  const lfoRef = useRef(null);
  const delayRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // State for synth parameters
  const [isInitialized, setIsInitialized] = useState(false);
  const [waveform, setWaveform] = useState('sine');
  const [volume, setVolume] = useState(0.5);
  const [attackTime, setAttackTime] = useState(0.1);
  const [decayTime, setDecayTime] = useState(0.2);
  const [sustainLevel, setSustainLevel] = useState(0.7);
  const [releaseTime, setReleaseTime] = useState(0.3);
  const [activeNotes, setActiveNotes] = useState([]);
  const [octaveShift, setOctaveShift] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState("Default");
  const [showHelp, setShowHelp] = useState(false);
  
  // Filter parameters
  const [filterType, setFilterType] = useState('lowpass');
  const [filterCutoff, setFilterCutoff] = useState(20000);
  const [filterResonance, setFilterResonance] = useState(1);
  
  // Effects parameters
  const [reverbAmount, setReverbAmount] = useState(0.1);
  const [delayTime, setDelayTime] = useState(0.3);
  const [delayFeedback, setDelayFeedback] = useState(0.2);
  const [delayMix, setDelayMix] = useState(0.1);
  
  // LFO parameters
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

  // Apply preset settings
  const applyPreset = (presetName) => {
    if (!SYNTH_PRESETS[presetName]) return;
    
    const preset = SYNTH_PRESETS[presetName];
    setWaveform(preset.waveform);
    setVolume(preset.volume);
    setAttackTime(preset.attackTime);
    setDecayTime(preset.decayTime);
    setSustainLevel(preset.sustainLevel);
    setReleaseTime(preset.releaseTime);
    setFilterType(preset.filterType);
    setFilterCutoff(preset.filterCutoff);
    setFilterResonance(preset.filterResonance);
    setReverbAmount(preset.reverbAmount);
    setDelayTime(preset.delayTime);
    setDelayFeedback(preset.delayFeedback);
    setDelayMix(preset.delayMix);
    setLfoEnabled(preset.lfoEnabled);
    setLfoRate(preset.lfoRate);
    setLfoDepth(preset.lfoDepth);
    setLfoTarget(preset.lfoTarget);
    setSelectedPreset(presetName);
  };

  // Initialize the audio context and effects chain
  const initializeAudio = () => {
    if (!isInitialized) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      // Create analyser node for oscilloscope
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.connect(audioContext.destination);
      analyserRef.current = analyser;
      
      // Create master gain node
      const masterGain = audioContext.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(analyser);
      masterGainRef.current = masterGain;
      
      // Create delay node
      const delay = audioContext.createDelay();
      delay.delayTime.value = delayTime;
      
      const delayFeedbackGain = audioContext.createGain();
      delayFeedbackGain.gain.value = delayFeedback;
      
      const delayMixGain = audioContext.createGain();
      delayMixGain.gain.value = delayMix;
      
      const dryGain = audioContext.createGain();
      dryGain.gain.value = 1 - delayMix;
      
      // Connect delay network
      delay.connect(delayFeedbackGain);
      delayFeedbackGain.connect(delay);
      
      delay.connect(delayMixGain);
      delayMixGain.connect(masterGain);
      
      // Store delay nodes for later parameter updates
      delayRef.current = {
        delay,
        feedback: delayFeedbackGain,
        mix: delayMixGain,
        dry: dryGain
      };
      
      // Create filter node
      const filter = audioContext.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = filterCutoff;
      filter.Q.value = filterResonance;
      
      // Connect filter to delay and direct path
      filter.connect(delay);
      filter.connect(dryGain);
      dryGain.connect(masterGain);
      
      filterRef.current = filter;
      
      // Create reverb (ConvolverNode)
      createReverb(audioContext, masterGain).then(reverb => {
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
      
      // Start visualization
      startVisualization();
      
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

  // Draw oscilloscope visualization
  const drawOscilloscope = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    analyser.getByteTimeDomainData(dataArray);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw waveform
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3498db';
    
    ctx.beginPath();
    
    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * canvas.height / 2;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    
    // Request next frame
    animationFrameRef.current = requestAnimationFrame(drawOscilloscope);
  };
  
  // Start visualization
  const startVisualization = () => {
    if (canvasRef.current && analyserRef.current) {
      // Start animation loop
      animationFrameRef.current = requestAnimationFrame(drawOscilloscope);
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
    
    // Update delay parameters
    if (delayRef.current) {
      delayRef.current.delay.delayTime.value = delayTime;
      delayRef.current.feedback.gain.value = delayFeedback;
      delayRef.current.mix.gain.value = delayMix;
      delayRef.current.dry.gain.value = 1 - delayMix;
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
    lfoDepth, lfoTarget, delayTime, delayFeedback, delayMix
  ]);

  // Set up canvas sizing on mount
  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const container = canvas.parentElement;
        
        if (container) {
          canvas.width = container.clientWidth;
          canvas.height = 150; // Fixed height for oscilloscope
        }
      }
    };
    
    // Initial size
    resizeCanvas();
    
    // Handle window resize
    window.addEventListener('resize', resizeCanvas);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
        gainNode.gain.linearRampToValueAtTime(volume * sustainLevel, currentTime + quickAttack);
        
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
        applyADSREnvelope(gainNode.gain, currentTime);
        activeNotesRef.current[note] = {
          oscillator,
          gainNode,
          startTime: currentTime
        };
      }
    } else {
      // Normal note start (first time playing this note)
      applyADSREnvelope(gainNode.gain, currentTime);
      
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

  // Apply ADSR envelope to a parameter
  const applyADSREnvelope = (audioParam, startTime) => {
    const attackEndTime = startTime + attackTime;
    const decayEndTime = attackEndTime + decayTime;
    
    // Attack phase - from 0 to peak (volume)
    audioParam.setValueAtTime(0, startTime);
    audioParam.linearRampToValueAtTime(volume, attackEndTime);
    
    // Decay phase - from peak to sustain level
    audioParam.linearRampToValueAtTime(volume * sustainLevel, decayEndTime);
    
    // Sustain phase is handled implicitly by staying at the sustain level
    // Release phase is handled in the stopNote function
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
  }, [isInitialized, waveform, volume, attackTime, decayTime, sustainLevel, releaseTime, octaveShift]);

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
        <h2>Enhanced AAA.run Synthesizer</h2>
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
              <button 
                onClick={() => setShowHelp(!showHelp)}
                className={`help-button ${showHelp ? 'active' : ''}`}
              >
                {showHelp ? 'Hide Help' : 'Show Help'}
              </button>
            </>
          )}
        </div>
      </div>
      
      {showHelp && (
        <div className="help-panel">
          <h3>Synthesizer Basics</h3>
          <p>This synthesizer creates sound using digital oscillators and audio processing:</p>
          <ul>
            <li><strong>Oscillator</strong>: Generates the basic sound waveform</li>
            <li><strong>ADSR Envelope</strong>: Controls how the sound evolves over time:
              <ul>
                <li>Attack: Time to reach full volume when a key is pressed</li>
                <li>Decay: Time to fall to sustain level after initial attack</li>
                <li>Sustain: Volume level maintained while key is held</li>
                <li>Release: Time for sound to fade out after key is released</li>
              </ul>
            </li>
            <li><strong>Filter</strong>: Shapes the tone by removing or emphasizing frequencies</li>
            <li><strong>Effects</strong>: Add depth and character to the sound</li>
            <li><strong>LFO</strong>: Low Frequency Oscillator that can modulate parameters over time</li>
          </ul>
          <p>Try different presets to hear how these elements work together!</p>
        </div>
      )}
      
      {isInitialized && (
        <>
          <div className="oscilloscope-container">
            <h3>Oscilloscope</h3>
            <canvas ref={canvasRef} className="oscilloscope"></canvas>
          </div>
          
          <div className="preset-section">
            <h3>Presets</h3>
            <div className="preset-buttons">
              {Object.keys(SYNTH_PRESETS).map(presetName => (
                <button
                  key={presetName}
                  onClick={() => applyPreset(presetName)}
                  className={`preset-button ${selectedPreset === presetName ? 'active' : ''}`}
                >
                  {presetName}
                </button>
              ))}
            </div>
          </div>
          
          <div className="control-section">
            <h3>Oscillator</h3>
            <div className="control-panel">
              <div className="control-group">
                <label>
                  Waveform
                  <ControlTooltip text="The basic shape of the sound wave. Sine is smooth, square is buzzy, triangle is balanced, sawtooth is bright." />
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
                  <ControlTooltip text="Overall loudness of the synthesizer" />
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
            </div>
          </div>
          
          <div className="control-section">
            <h3>Envelope (ADSR)</h3>
            <div className="control-panel">
              <div className="control-group">
                <label>
                  Attack: {attackTime.toFixed(2)}s
                  <ControlTooltip text="Time it takes for the sound to reach full volume when a key is pressed. Shorter times create percussive sounds, longer times create soft fade-ins." />
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
                  Decay: {decayTime.toFixed(2)}s
                  <ControlTooltip text="Time it takes for the sound to fall from peak volume to sustain level after the initial attack." />
                </label>
                <input 
                  type="range" 
                  min="0.01" 
                  max="1" 
                  step="0.01" 
                  value={decayTime} 
                  onChange={(e) => setDecayTime(parseFloat(e.target.value))}
                />
              </div>
              
              <div className="control-group">
                <label>
                  Sustain: {Math.round(sustainLevel * 100)}%
                  <ControlTooltip text="Volume level maintained while a key is held down after attack and decay phases." />
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={sustainLevel} 
                  onChange={(e) => setSustainLevel(parseFloat(e.target.value))}
                />
              </div>
              
              <div className="control-group">
                <label>
                  Release: {releaseTime.toFixed(2)}s
                  <ControlTooltip text="Time it takes for the sound to fade out after a key is released. Longer times create smoother fade-outs." />
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
                  <ControlTooltip text="Controls which frequencies are allowed through. Lowpass keeps lows, cuts highs. Highpass keeps highs, cuts lows. Bandpass only allows a range of frequencies." />
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
                  <ControlTooltip text="The frequency where the filter begins to take effect. For lowpass, frequencies above this point are reduced. For highpass, frequencies below this point are reduced." />
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
                  <ControlTooltip text="Emphasizes frequencies near the cutoff point. Higher values create a more pronounced 'peak' effect." />
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
                  <ControlTooltip text="Simulates the sound reflecting off surfaces in a room. Higher values create more spacious, ambient sounds." />
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
                <label>
                  Delay Time: {delayTime.toFixed(2)}s
                  <ControlTooltip text="Time between echoes. Longer values create more spaced-out repeats." />
                </label>
                <input 
                  type="range" 
                  min="0.05" 
                  max="1" 
                  step="0.01" 
                  value={delayTime} 
                  onChange={(e) => setDelayTime(parseFloat(e.target.value))}
                />
              </div>
              
              <div className="control-group">
                <label>
                  Delay Feedback: {Math.round(delayFeedback * 100)}%
                  <ControlTooltip text="Amount of signal fed back into the delay. Higher values create more repeating echoes." />
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="0.9" 
                  step="0.01" 
                  value={delayFeedback} 
                  onChange={(e) => setDelayFeedback(parseFloat(e.target.value))}
                />
              </div>
              
              <div className="control-group">
                <label>
                  Delay Mix: {Math.round(delayMix * 100)}%
                  <ControlTooltip text="Balance between dry (original) and wet (delayed) signals." />
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="0.9" 
                  step="0.01" 
                  value={delayMix} 
                  onChange={(e) => setDelayMix(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
          
          <div className="control-section">
            <h3>LFO (Low Frequency Oscillator)</h3>
            <div className="control-panel">
              <div className="control-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={lfoEnabled} 
                    onChange={(e) => setLfoEnabled(e.target.checked)}
                  />
                  Enable LFO
                  <ControlTooltip text="Low Frequency Oscillator automatically varies parameters over time, creating movement in the sound." />
                </label>
              </div>
              
              <div className="control-group">
                <label>
                  LFO Rate: {lfoRate.toFixed(1)} Hz
                  <ControlTooltip text="Speed of the modulation. Lower values create slow changes, higher values create faster vibrato-like effects." />
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
                  <ControlTooltip text="Amount of modulation applied. Higher values create more dramatic effects." />
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
                  <ControlTooltip text="Parameter that the LFO will modulate. 'Filter Cutoff' creates wah-like effects, 'Pitch' creates vibrato." />
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
            <p>Play multiple keys at once to create chords. Try different presets to explore sound possibilities!</p>
          </div>
        </>
      )}
    </div>
  );
};

export default EnhancedAaaSynthesizer;