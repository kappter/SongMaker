// Modified script.js for test directory with fixed resource paths

const timeline = document.getElementById('timeline');
const timeCalculator = document.getElementById('time-calculator');
const currentBlockDisplay = document.getElementById('current-block-display');
const playBtn = document.getElementById('play-btn');
const soundBtn = document.getElementById('sound-btn');
const themeBtn = document.getElementById('theme-btn');
const songDropdown = document.getElementById('song-dropdown');
const toggleFormBtn = document.getElementById('toggle-form-btn');
const formContent = document.getElementById('form-content');
const printSongName = document.getElementById('print-song-name');
const songTitleInput = document.getElementById('song-title-input'); // Reference to parameters input
let draggedBlock = null;
let selectedBlock = null;
let currentSongName = '(I Can't Get No) Satisfaction';
let isPlaying = false;
let currentTime = 0;
let currentBeat = 0;
let blockBeat = 0;
let blockMeasure = 0;
let soundEnabled = true;
let isDarkMode = true;
let isFormCollapsed = true;
let activeTimeManager = null;
let scheduledSources = [];
let audioContext = new AudioContext();

const validTimeSignatures = [
  '4/4', '3/4', '6/8', '2/4', '5/4', '7/8', '12/8', '9/8', '11/8', '15/8', '13/8', '10/4', '8/8', '14/8', '16/8', '7/4', '6/4'
];

const moods = ["progressive", "ambient", "energetic", "dreamy"];
const themes = ["rebellion", "triumph", "freedom", "nostalgia"];

let tickBuffer = null;
let tockBuffer = null;
let tickShortBuffer = null;
let tockShortBuffer = null;

function copyRiffusionPrompt() {
  const song = extractCurrentSongData();
  if (!song) return; // Exit if no song data available
  
  const prompt = generateRiffusionPrompt(song);
  navigator.clipboard.writeText(prompt)
    .then(() => alert("Riffusion prompt copied to clipboard!"))
    .catch(err => {
      console.error("Failed to copy: ", err);
      alert("Failed to copy prompt. See console for details.");
    });
}

function extractCurrentSongData() {
  // Get all blocks from the timeline
  const blocks = Array.from(timeline.children);
  if (blocks.length === 0) {
    alert("Please create a song first!");
    return null;
  }

  // Extract song-wide properties
  const songData = {
    title: currentSongName,
    key: blocks[0].getAttribute('data-root-note') || 'C',
    mode: blocks[0].getAttribute('data-mode') || 'Ionian',
    bpm: parseInt(blocks[0].getAttribute('data-tempo')) || 120,
    timeSignature: blocks[0].getAttribute('data-time-signature') || '4/4',
    
    // Analyze overall mood and vibe based on block feels
    mood: getMostCommonFeel(blocks),
    vibe: getVibeFromFeels(blocks),
    
    // Extract section-specific data
    introData: getSectionData(blocks, 'intro'),
    verseData: getSectionData(blocks, 'verse'),
    chorusData: getSectionData(blocks, 'chorus'),
    bridgeData: getSectionData(blocks, 'bridge'),
    outroData: getSectionData(blocks, 'outro'),
    
    // Additional properties for richness
    instruments: getInstrumentSuggestions(blocks),
    overallVibe: getOverallVibe(blocks)
  };
  
  return songData;
}

function getMostCommonFeel(blocks) {
  const feelCounts = {};
  blocks.forEach(block => {
    const feel = block.getAttribute('data-feel');
    if (feel) {
      feelCounts[feel] = (feelCounts[feel] || 0) + 1;
    }
  });
  
  let mostCommonFeel = 'energetic';
  let maxCount = 0;
  
  for (const feel in feelCounts) {
    if (feelCounts[feel] > maxCount) {
      maxCount = feelCounts[feel];
      mostCommonFeel = feel;
    }
  }
  
  return mostCommonFeel;
}

function getVibeFromFeels(blocks) {
  const feels = blocks.map(block => block.getAttribute('data-feel')).filter(Boolean);
  
  if (feels.some(feel => ['Tension', 'Anger', 'Frustration', 'Intense'].includes(feel))) {
    return 'intense';
  } else if (feels.some(feel => ['Happiness', 'Euphoria', 'Bliss', 'Triumph'].includes(feel))) {
    return 'uplifting';
  } else if (feels.some(feel => ['Calmness', 'Atmospheric', 'Mystical'].includes(feel))) {
    return 'ambient';
  } else if (feels.some(feel => ['Rebellion', 'Trippy', 'Awakening'].includes(feel))) {
    return 'experimental';
  }
  
  return 'balanced';
}

function getSectionData(blocks, sectionType) {
  const sectionBlocks = blocks.filter(block => block.getAttribute('data-type') === sectionType);
  if (sectionBlocks.length === 0) return null;
  
  return {
    count: sectionBlocks.length,
    averageMeasures: Math.round(sectionBlocks.reduce((sum, block) => sum + parseInt(block.getAttribute('data-measures') || 4), 0) / sectionBlocks.length),
    feel: getMostCommonFeel(sectionBlocks),
    hasLyrics: sectionBlocks.some(block => block.getAttribute('data-lyrics') && block.getAttribute('data-lyrics').trim() !== '')
  };
}

function getInstrumentSuggestions(blocks) {
  const feels = blocks.map(block => block.getAttribute('data-feel')).filter(Boolean);
  const rootNote = blocks[0].getAttribute('data-root-note') || 'C';
  const mode = blocks[0].getAttribute('data-mode') || 'Ionian';
  
  const instruments = [];
  
  // Base instruments
  instruments.push('electric guitar', 'bass guitar', 'drums');
  
  // Add instruments based on feel
  if (feels.some(feel => ['Tension', 'Anger', 'Frustration', 'Intense'].includes(feel))) {
    instruments.push('distorted guitar', 'heavy drums');
  }
  
  if (feels.some(feel => ['Happiness', 'Euphoria', 'Bliss'].includes(feel))) {
    instruments.push('synthesizer', 'piano');
  }
  
  if (feels.some(feel => ['Calmness', 'Atmospheric', 'Mystical'].includes(feel))) {
    instruments.push('ambient pads', 'strings');
  }
  
  if (feels.some(feel => ['Rebellion', 'Trippy', 'Awakening'].includes(feel))) {
    instruments.push('electronic beats', 'unusual percussion');
  }
  
  // Add instruments based on mode
  if (['Dorian', 'Mixolydian', 'Blues Scale'].includes(mode)) {
    instruments.push('blues guitar');
  }
  
  if (['Lydian', 'Whole Tone'].includes(mode)) {
    instruments.push('jazz piano');
  }
  
  if (['Phrygian', 'Locrian'].includes(mode)) {
    instruments.push('metal guitar');
  }
  
  return [...new Set(instruments)].slice(0, 5); // Return unique instruments, max 5
}

function getOverallVibe(blocks) {
  const feels = blocks.map(block => block.getAttribute('data-feel')).filter(Boolean);
  const tempo = parseInt(blocks[0].getAttribute('data-tempo')) || 120;
  
  if (tempo > 140) {
    return 'energetic and fast-paced';
  } else if (tempo < 90) {
    return 'slow and deliberate';
  } else {
    return 'moderate and balanced';
  }
}

function generateRiffusionPrompt(song) {
  let prompt = `${song.title} - A ${song.mood} ${song.vibe} song in ${song.key} ${song.mode} at ${song.bpm} BPM in ${song.timeSignature} time signature. `;
  
  // Add structure information
  prompt += "Song structure: ";
  if (song.introData) prompt += `Intro (${song.introData.averageMeasures} measures), `;
  if (song.verseData) prompt += `Verse (${song.verseData.averageMeasures} measures), `;
  if (song.chorusData) prompt += `Chorus (${song.chorusData.averageMeasures} measures), `;
  if (song.bridgeData) prompt += `Bridge (${song.bridgeData.averageMeasures} measures), `;
  if (song.outroData) prompt += `Outro (${song.outroData.averageMeasures} measures). `;
  
  // Add instruments
  prompt += `Instruments: ${song.instruments.join(', ')}. `;
  
  // Add overall vibe
  prompt += `The overall feel is ${song.overallVibe}.`;
  
  return prompt;
}

function loadAudioBuffers() {
  console.log('Loading audio buffers...');
  // Create a new audio context if needed
  if (audioContext.state === 'closed') {
    audioContext = new AudioContext();
  }
  
  // Resume the audio context if it's suspended
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  // Use absolute paths for audio files
  const basePath = '/SongMaker/';
  
  return Promise.all([
    fetch(basePath + 'tick.wav')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load tick.wav: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then(buffer => audioContext.decodeAudioData(buffer))
      .then(decoded => {
        tickBuffer = decoded;
        console.log('Tick buffer loaded successfully');
      }),
    fetch(basePath + 'tock.wav')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load tock.wav: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then(buffer => audioContext.decodeAudioData(buffer))
      .then(decoded => {
        tockBuffer = decoded;
        console.log('Tock buffer loaded successfully');
      }),
    // Use tick and tock for short versions if the short versions aren't available
    fetch(basePath + 'tick.wav')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load tick.wav for short: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then(buffer => audioContext.decodeAudioData(buffer))
      .then(decoded => {
        tickShortBuffer = decoded;
        console.log('Tick short buffer loaded successfully');
      }),
    fetch(basePath + 'tock.wav')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load tock.wav for short: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then(buffer => audioContext.decodeAudioData(buffer))
      .then(decoded => {
        tockShortBuffer = decoded;
        console.log('Tock short buffer loaded successfully');
      })
  ]).catch(error => {
    console.error('Failed to load audio files:', error);
    // Create silent buffers as fallback
    const silentBuffer = audioContext.createBuffer(1, 44100, 44100);
    tickBuffer = silentBuffer;
    tockBuffer = silentBuffer;
    tickShortBuffer = silentBuffer;
    tockShortBuffer = silentBuffer;
  });
}

// Initialize audio context and load buffers
let audioBufferPromise;
try {
  audioContext = new AudioContext();
  audioBufferPromise = loadAudioBuffers(); // Single call, stored as promise
  console.log('Audio context initialized and buffers loading started');
} catch (e) {
  console.error('Failed to initialize audio context:', e);
}

function playSound(buffer, time) {
  if (!buffer || !soundEnabled) return null;
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(time || 0);
  scheduledSources.push(source);
  return source;
}

function stopAllSounds() {
  scheduledSources.forEach(source => {
    try {
      source.stop();
    } catch (e) {
      // Ignore errors from already stopped sources
    }
  });
  scheduledSources = [];
}

function createBlock(type, measures, rootNote, mode, tempo, timeSignature, feel, lyrics) {
  const block = document.createElement('div');
  block.className = 'block';
  block.setAttribute('data-type', type);
  block.setAttribute('data-measures', measures);
  block.setAttribute('data-root-note', rootNote);
  block.setAttribute('data-mode', mode);
  block.setAttribute('data-tempo', tempo);
  block.setAttribute('data-time-signature', timeSignature);
  block.setAttribute('data-feel', feel);
  block.setAttribute('data-lyrics', lyrics || '');
  
  // Create block content
  const blockContent = document.createElement('div');
  blockContent.className = 'block-content';
  
  // Add type and measures
  const typeEl = document.createElement('div');
  typeEl.className = 'block-type';
  typeEl.textContent = `${formatType(type)}: ${timeSignature} ${measures}m`;
  blockContent.appendChild(typeEl);
  
  // Add key, mode, tempo, feel
  const detailsEl = document.createElement('div');
  detailsEl.className = 'block-details';
  detailsEl.textContent = `${rootNote} ${mode} ${tempo}b ${feel}`;
  blockContent.appendChild(detailsEl);
  
  // Add lyrics if present
  if (lyrics && lyrics.trim() !== '') {
    const lyricsEl = document.createElement('div');
    lyricsEl.className = 'block-lyrics';
    lyricsEl.textContent = '-';
    const lyricsPreview = lyrics.length > 20 ? lyrics.substring(0, 20) + '...' : lyrics;
    lyricsEl.textContent += lyricsPreview;
    blockContent.appendChild(lyricsEl);
  } else {
    const lyricsEl = document.createElement('div');
    lyricsEl.className = 'block-lyrics';
    lyricsEl.textContent = 'No lyrics';
    blockContent.appendChild(lyricsEl);
  }
  
  block.appendChild(blockContent);
  
  // Add delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = 'X';
  deleteBtn.onclick = function(e) {
    e.stopPropagation();
    block.remove();
    calculateTimings();
  };
  block.appendChild(deleteBtn);
  
  // Add event listeners
  block.addEventListener('click', function() {
    selectBlock(block);
  });
  
  block.addEventListener('dragstart', function(e) {
    draggedBlock = block;
    e.dataTransfer.setData('text/plain', ''); // Required for Firefox
    setTimeout(() => block.classList.add('dragging'), 0);
  });
  
  block.addEventListener('dragend', function() {
    block.classList.remove('dragging');
    draggedBlock = null;
    calculateTimings();
  });
  
  block.draggable = true;
  
  return block;
}

function formatType(type) {
  return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function selectBlock(block) {
  // Deselect previously selected block
  if (selectedBlock) {
    selectedBlock.classList.remove('selected');
  }
  
  // Select new block
  selectedBlock = block;
  block.classList.add('selected');
  
  // Update form with block data
  document.getElementById('part-type').value = block.getAttribute('data-type');
  document.getElementById('measures').value = block.getAttribute('data-measures');
  document.getElementById('root-note').value = block.getAttribute('data-root-note');
  document.getElementById('mode').value = block.getAttribute('data-mode');
  document.getElementById('tempo').value = block.getAttribute('data-tempo');
  document.getElementById('time-signature').value = block.getAttribute('data-time-signature');
  document.getElementById('feel').value = block.getAttribute('data-feel');
  document.getElementById('lyrics').value = block.getAttribute('data-lyrics');
  
  // Show form if it's collapsed
  if (isFormCollapsed) {
    toggleForm();
  }
}

function addBlock() {
  const type = document.getElementById('part-type').value;
  const measures = parseInt(document.getElementById('measures').value);
  const rootNote = document.getElementById('root-note').value;
  const mode = document.getElementById('mode').value;
  const tempo = parseInt(document.getElementById('tempo').value);
  const timeSignature = document.getElementById('time-signature').value;
  const feel = document.getElementById('feel').value;
  const lyrics = document.getElementById('lyrics').value;
  
  const block = createBlock(type, measures, rootNote, mode, tempo, timeSignature, feel, lyrics);
  timeline.appendChild(block);
  
  calculateTimings();
}

function updateBlock() {
  if (!selectedBlock) return;
  
  const type = document.getElementById('part-type').value;
  const measures = parseInt(document.getElementById('measures').value);
  const rootNote = document.getElementById('root-note').value;
  const mode = document.getElementById('mode').value;
  const tempo = parseInt(document.getElementById('tempo').value);
  const timeSignature = document.getElementById('time-signature').value;
  const feel = document.getElementById('feel').value;
  const lyrics = document.getElementById('lyrics').value;
  
  selectedBlock.setAttribute('data-type', type);
  selectedBlock.setAttribute('data-measures', measures);
  selectedBlock.setAttribute('data-root-note', rootNote);
  selectedBlock.setAttribute('data-mode', mode);
  selectedBlock.setAttribute('data-tempo', tempo);
  selectedBlock.setAttribute('data-time-signature', timeSignature);
  selectedBlock.setAttribute('data-feel', feel);
  selectedBlock.setAttribute('data-lyrics', lyrics);
  
  // Update block content
  const typeEl = selectedBlock.querySelector('.block-type');
  typeEl.textContent = `${formatType(type)}: ${timeSignature} ${measures}m`;
  
  const detailsEl = selectedBlock.querySelector('.block-details');
  detailsEl.textContent = `${rootNote} ${mode} ${tempo}b ${feel}`;
  
  const lyricsEl = selectedBlock.querySelector('.block-lyrics');
  if (lyrics && lyrics.trim() !== '') {
    lyricsEl.textContent = '-';
    const lyricsPreview = lyrics.length > 20 ? lyrics.substring(0, 20) + '...' : lyrics;
    lyricsEl.textContent += lyricsPreview;
  } else {
    lyricsEl.textContent = 'No lyrics';
  }
  
  calculateTimings();
}

function calculateTimings() {
  const blocks = Array.from(timeline.children);
  const timings = [];
  let totalSeconds = 0;
  let totalBeats = 0;
  
  blocks.forEach(block => {
    const type = block.getAttribute('data-type');
    const measures = parseInt(block.getAttribute('data-measures'));
    const tempo = parseInt(block.getAttribute('data-tempo'));
    const timeSignature = block.getAttribute('data-time-signature');
    
    // Parse time signature
    const [beatsPerMeasure, beatUnit] = timeSignature.split('/').map(Number);
    
    // Calculate beats in this block
    const beatsInBlock = measures * beatsPerMeasure;
    
    // Calculate seconds for this block
    const secondsPerBeat = 60 / tempo;
    const secondsInBlock = beatsInBlock * secondsPerBeat;
    
    timings.push({
      type,
      measures,
      tempo,
      timeSignature,
      beatsPerMeasure,
      beatUnit,
      beatsInBlock,
      secondsInBlock,
      startBeat: totalBeats,
      startTime: totalSeconds
    });
    
    totalBeats += beatsInBlock;
    totalSeconds += secondsInBlock;
  });
  
  // Update time calculator
  timeCalculator.textContent = `Current Time: ${formatTime(0)} / Total Duration: ${formatTime(totalSeconds)} | Song Beat: 0 of ${totalBeats} | Block: 0 of ${blocks.length} (Measure: 0 of 0)`;
  
  return { timings, totalSeconds, totalBeats };
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function togglePlay() {
  if (isPlaying) {
    isPlaying = false;
    playBtn.textContent = 'Play';
    resetPlayback();
  } else {
    const { timings, totalSeconds, totalBeats } = calculateTimings();
    if (timings.length === 0) {
      console.log('No blocks to play');
      alert('Please add some blocks to the timeline first');
      return;
    }
    
    playBtn.textContent = 'Reset';
    isPlaying = true;
    currentTime = 0;
    currentBeat = 0;
    blockBeat = 0;
    blockMeasure = 0;
    
    // Make sure audio context is running
    if (audioContext.state === 'suspended') {
      console.log('Resuming audio context');
      audioContext.resume().then(() => {
        console.log('Audio context resumed successfully');
        startPlayback(timings, totalSeconds, totalBeats);
      }).catch(err => {
        console.error('Failed to resume audio context:', err);
        alert('Failed to start audio playback. Please try again.');
        isPlaying = false;
        playBtn.textContent = 'Play';
      });
    } else {
      startPlayback(timings, totalSeconds, totalBeats);
    }
  }
}

function startPlayback(timings, totalSeconds, totalBeats) {
  console.log('Starting playback with timings:', timings);
  // Check if audio buffers are loaded
  if (!tickBuffer || !tockBuffer) {
    console.log('Audio buffers not loaded yet, waiting for promise to resolve');
    audioBufferPromise.then(() => {
      console.log('Audio buffers now loaded, starting lead-in');
      playLeadIn(timings, totalSeconds, totalBeats);
    }).catch(err => {
      console.error('Failed to load audio buffers:', err);
      alert('Failed to load audio files. Playback will continue without sound.');
      playLeadIn(timings, totalSeconds, totalBeats);
    });
  } else {
    console.log('Audio buffers already loaded, starting lead-in');
    playLeadIn(timings, totalSeconds, totalBeats);
  }
}

function playLeadIn(timings, totalSeconds, totalBeats) {
  const firstBlock = timings[0];
  const beatDuration = 60 / firstBlock.tempo;
  
  // Play 4 lead-in beats
  for (let i = 0; i < 4; i++) {
    const time = audioContext.currentTime + i * beatDuration;
    playSound(i === 0 ? tockBuffer : tickBuffer, time);
  }
  
  // Start playback after lead-in
  setTimeout(() => {
    startTime = Date.now();
    activeTimeManager = setInterval(() => updatePlayback(timings, totalSeconds, totalBeats, startTime), 50);
  }, beatDuration * 4 * 1000);
}

function updatePlayback(timings, totalSeconds, totalBeats, startTime) {
  if (!isPlaying) return;
  
  // Calculate current time
  currentTime = (Date.now() - startTime) / 1000;
  
  // Check if playback is complete
  if (currentTime >= totalSeconds) {
    resetPlayback();
    return;
  }
  
  // Find current block
  let currentBlockIndex = 0;
  let currentBlock = null;
  
  for (let i = 0; i < timings.length; i++) {
    if (i === timings.length - 1 || currentTime < timings[i + 1].startTime) {
      currentBlockIndex = i;
      currentBlock = timings[i];
      break;
    }
  }
  
  // Calculate current beat
  const blockElapsedTime = currentTime - currentBlock.startTime;
  const beatDuration = 60 / currentBlock.tempo;
  const currentBeatInBlock = Math.floor(blockElapsedTime / beatDuration);
  currentBeat = currentBlock.startBeat + currentBeatInBlock;
  
  // Calculate current measure and beat within measure
  blockMeasure = Math.floor(currentBeatInBlock / currentBlock.beatsPerMeasure);
  blockBeat = currentBeatInBlock % currentBlock.beatsPerMeasure;
  
  // Update time calculator
  timeCalculator.textContent = `Current Time: ${formatTime(currentTime)} / Total Duration: ${formatTime(totalSeconds)} | Song Beat: ${currentBeat} of ${totalBeats} | Block: ${currentBlockIndex + 1} of ${timings.length} (Measure: ${blockMeasure + 1} of ${currentBlock.measures})`;
  
  // Update current block display
  const blockElements = Array.from(timeline.children);
  
  // Reset all blocks
  blockElements.forEach(block => {
    block.classList.remove('playing');
  });
  
  // Highlight current block
  if (blockElements[currentBlockIndex]) {
    blockElements[currentBlockIndex].classList.add('playing');
    currentBlockDisplay.innerHTML = `<span class="label">${formatType(currentBlock.type)}</span>: Measure ${blockMeasure + 1}, Beat ${blockBeat + 1}`;
  }
  
  // Play metronome sound if we've crossed a beat boundary
  const previousBeat = Math.floor((currentTime - 0.05) / beatDuration);
  const currentBeatOverall = Math.floor(currentTime / beatDuration);
  
  if (previousBeat !== currentBeatOverall) {
    // Determine if it's the first beat of a measure
    const isFirstBeatOfMeasure = currentBeatOverall % currentBlock.beatsPerMeasure === 0;
    playSound(isFirstBeatOfMeasure ? tockBuffer : tickBuffer);
  }
}

function resetPlayback() {
  if (activeTimeManager) {
    clearInterval(activeTimeManager);
    activeTimeManager = null;
  }
  
  stopAllSounds();
  isPlaying = false;
  playBtn.textContent = 'Play';
  
  // Reset all blocks
  const blockElements = Array.from(timeline.children);
  blockElements.forEach(block => {
    block.classList.remove('playing');
  });
  
  // Reset current block display
  currentBlockDisplay.innerHTML = '<span class="label">No block playing</span>';
  
  // Reset time calculator
  const { totalSeconds, totalBeats } = calculateTimings();
  timeCalculator.textContent = `Current Time: ${formatTime(0)} / Total Duration: ${formatTime(totalSeconds)} | Song Beat: 0 of ${totalBeats} | Block: 0 of ${blockElements.length} (Measure: 0 of 0)`;
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? 'Sound On' : 'Sound Off';
}

function toggleTheme() {
  isDarkMode = !isDarkMode;
  document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  themeBtn.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
}

function toggleForm() {
  isFormCollapsed = !isFormCollapsed;
  formContent.classList.toggle('collapsed', isFormCollapsed);
  toggleFormBtn.textContent = isFormCollapsed ? 'Show Parameters' : 'Hide Parameters';
}

function exportSong() {
  const blocks = Array.from(timeline.children);
  const exportData = {
    songName: currentSongName,
    blocks: blocks.map(block => ({
      type: block.getAttribute('data-type'),
      measures: parseInt(block.getAttribute('data-measures')),
      rootNote: block.getAttribute('data-root-note'),
      mode: block.getAttribute('data-mode'),
      tempo: parseInt(block.getAttribute('data-tempo')),
      timeSignature: block.getAttribute('data-time-signature'),
      feel: block.getAttribute('data-feel'),
      lyrics: block.getAttribute('data-lyrics')
    }))
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  
  const exportFileDefaultName = currentSongName.replace(/\s+/g, '_') + '.json';
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

function importSong(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      loadSongData(data);
    } catch (error) {
      console.error('Error parsing imported file:', error);
      alert('Error importing file. Please make sure it is a valid JSON file.');
    }
  };
  reader.readAsText(file);
}

function loadSongData(data) {
  // Clear existing blocks
  timeline.innerHTML = '';
  
  // Set song name
  currentSongName = data.songName || 'New Song';
  songTitleInput.value = currentSongName;
  printSongName.textContent = currentSongName;
  
  // Add blocks
  data.blocks.forEach(blockData => {
    const block = createBlock(
      blockData.type,
      blockData.measures,
      blockData.rootNote,
      blockData.mode,
      blockData.tempo,
      blockData.timeSignature,
      blockData.feel,
      blockData.lyrics
    );
    timeline.appendChild(block);
  });
  
  calculateTimings();
}

function randomizeSong() {
  // Clear existing blocks
  timeline.innerHTML = '';
  
  // Generate random song name
  const adjectives = ['Epic', 'Dreamy', 'Intense', 'Mellow', 'Vibrant', 'Cosmic', 'Electric', 'Mystic'];
  const nouns = ['Journey', 'Voyage', 'Symphony', 'Rhapsody', 'Odyssey', 'Dream', 'Vision', 'Horizon'];
  currentSongName = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  songTitleInput.value = currentSongName;
  printSongName.textContent = currentSongName;
  
  // Random key and mode
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const modes = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian', 'Pentatonic Major', 'Pentatonic Minor', 'Blues Scale'];
  const rootNote = keys[Math.floor(Math.random() * keys.length)];
  const mode = modes[Math.floor(Math.random() * modes.length)];
  
  // Random tempo and time signature
  const tempo = Math.floor(Math.random() * 60) + 80; // 80-140 BPM
  const timeSignature = validTimeSignatures[Math.floor(Math.random() * 3)]; // Just use common time signatures
  
  // Random song structure
  const structure = [];
  
  // Intro
  structure.push({
    type: 'intro',
    measures: Math.floor(Math.random() * 4) + 4, // 4-8 measures
    feel: 'Tension'
  });
  
  // Verse
  structure.push({
    type: 'verse',
    measures: Math.floor(Math.random() * 4) + 8, // 8-12 measures
    feel: 'Frustration'
  });
  
  // Chorus
  structure.push({
    type: 'chorus',
    measures: Math.floor(Math.random() * 4) + 8, // 8-12 measures
    feel: 'Rebellion'
  });
  
  // Verse 2
  structure.push({
    type: 'verse',
    measures: Math.floor(Math.random() * 4) + 8, // 8-12 measures
    feel: 'Frustration'
  });
  
  // Chorus 2
  structure.push({
    type: 'chorus',
    measures: Math.floor(Math.random() * 4) + 8, // 8-12 measures
    feel: 'Rebellion'
  });
  
  // Bridge or Solo (50/50 chance)
  if (Math.random() > 0.5) {
    structure.push({
      type: 'bridge',
      measures: Math.floor(Math.random() * 8) + 8, // 8-16 measures
      feel: 'Mystical'
    });
  } else {
    structure.push({
      type: 'solo',
      measures: Math.floor(Math.random() * 8) + 8, // 8-16 measures
      feel: 'Intense'
    });
  }
  
  // Final Chorus
  structure.push({
    type: 'chorus',
    measures: Math.floor(Math.random() * 8) + 8, // 8-16 measures
    feel: 'Rebellion'
  });
  
  // Outro
  structure.push({
    type: 'outro',
    measures: Math.floor(Math.random() * 4) + 4, // 4-8 measures
    feel: 'Calmness'
  });
  
  // Create blocks
  structure.forEach(part => {
    const block = createBlock(
      part.type,
      part.measures,
      rootNote,
      mode,
      tempo,
      timeSignature,
      part.feel,
      '' // No lyrics for random songs
    );
    timeline.appendChild(block);
  });
  
  calculateTimings();
}

// Fixed print function to avoid extra page
function printSong() {
  const printWindow = window.open('', '_blank');
  
  // Create print content
  const blocks = Array.from(timeline.children);
  let printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${currentSongName} - SongMaker</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        h1 {
          text-align: center;
          margin-bottom: 30px;
        }
        .song-info {
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
        }
        .block {
          margin-bottom: 15px;
          padding: 10px;
          border: 1px solid #ccc;
          page-break-inside: avoid;
        }
        .block-type {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .block-details {
          margin-bottom: 5px;
        }
        .block-lyrics {
          font-style: italic;
          white-space: pre-line;
        }
        @media print {
          body {
            font-size: 12pt;
          }
          .page-break {
            page-break-after: always;
          }
        }
      </style>
    </head>
    <body>
      <h1>${currentSongName}</h1>
      
      <div class="song-info">
        <div>
          <strong>Key:</strong> ${blocks.length > 0 ? blocks[0].getAttribute('data-root-note') : 'N/A'} 
          <strong>Mode:</strong> ${blocks.length > 0 ? blocks[0].getAttribute('data-mode') : 'N/A'}
        </div>
        <div>
          <strong>Tempo:</strong> ${blocks.length > 0 ? blocks[0].getAttribute('data-tempo') : 'N/A'} BPM
          <strong>Time Signature:</strong> ${blocks.length > 0 ? blocks[0].getAttribute('data-time-signature') : 'N/A'}
        </div>
      </div>
      
      <div class="blocks">
  `;
  
  // Add blocks
  blocks.forEach(block => {
    const type = block.getAttribute('data-type');
    const measures = block.getAttribute('data-measures');
    const timeSignature = block.getAttribute('data-time-signature');
    const feel = block.getAttribute('data-feel');
    const lyrics = block.getAttribute('data-lyrics');
    
    printContent += `
      <div class="block">
        <div class="block-type">${formatType(type)} (${measures} measures, ${timeSignature}, ${feel})</div>
        ${lyrics ? `<div class="block-lyrics">${lyrics}</div>` : ''}
      </div>
    `;
  });
  
  printContent += `
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.open();
  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // Print after a short delay to ensure content is loaded
  setTimeout(() => {
    printWindow.print();
    // Don't close the window after printing to allow user to save as PDF if desired
  }, 500);
}

// Load songs for dropdown
fetch('/SongMaker/songs/songs.json')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    songDropdown.innerHTML = '<option value="">Select a Song</option>';
    data.songs.forEach(song => {
      const option = document.createElement('option');
      option.value = song.file;
      option.textContent = song.name;
      songDropdown.appendChild(option);
    });
    console.log('Songs loaded into dropdown successfully');
  })
  .catch(error => {
    console.error('Error loading songs:', error);
    // Add fallback options if fetch fails
    songDropdown.innerHTML = '<option value="">Select a Song</option>' +
                            '<option value="satisfaction.js">(I Can\'t Get No) Satisfaction</option>' +
                            '<option value="bohemian_rhapsody.js">Bohemian Rhapsody</option>';
  });

// Initialize with default song
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded, initializing default song');
  setTimeout(() => {
    // Try to load a default song or create a random one if that fails
    loadSongFromDropdown('satisfaction.js');
  }, 500); // Small delay to ensure everything is loaded
});

function loadSongFromDropdown(value) {
  if (!value) return;
  
  console.log(`Attempting to load song: /SongMaker/songs/${value}`);
  
  // Check if the file exists first
  fetch(`/SongMaker/songs/${value}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log(`Song file found: /SongMaker/songs/${value}`);
      return response.json();
    })
    .then(songData => {
      console.log('Song data loaded successfully:', songData);
      loadSongData(songData);
    })
    .catch(error => {
      console.error('Error loading song:', error);
      alert(`Failed to load song: ${error.message}. Check console for details.`);
      
      // Try loading a hardcoded default song as fallback
      if (value === 'satisfaction.js') {
        console.log('Attempting to load hardcoded default song');
        const defaultSong = {
          songName: "(I Can't Get No) Satisfaction",
          blocks: [
            {
              type: "intro",
              measures: 4,
              rootNote: "E",
              mode: "Mixolydian",
              tempo: 136,
              timeSignature: "4/4",
              feel: "Tension",
              lyrics: ""
            },
            {
              type: "verse",
              measures: 8,
              rootNote: "E",
              mode: "Mixolydian",
              tempo: 136,
              timeSignature: "4/4",
              feel: "Frustration",
              lyrics: "I can't get no satisfaction, I can't get no satisfaction..."
            },
            {
              type: "chorus",
              measures: 4,
              rootNote: "E",
              mode: "Mixolydian",
              tempo: 136,
              timeSignature: "4/4",
              feel: "Rebellion",
              lyrics: "Cause I try, and I try, and I try, and I try..."
            }
          ]
        };
        loadSongData(defaultSong);
      } else {
        // If not the default song, try creating a random one
        randomizeSong();
      }
    });
}

// Add CSS for light mode text color fix
document.head.insertAdjacentHTML('beforeend', `
  <style>
    body[data-theme="light"] footer,
    body[data-theme="light"] h2 {
      color: #333 !important;
    }
  </style>
`);

// Initialize timeline as a drop target
timeline.addEventListener('dragover', function(e) {
  e.preventDefault();
  const afterElement = getDragAfterElement(e.clientX);
  if (afterElement) {
    timeline.insertBefore(draggedBlock, afterElement);
  } else {
    timeline.appendChild(draggedBlock);
  }
});

function getDragAfterElement(x) {
  const draggableElements = [...timeline.querySelectorAll('.block:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = x - box.left - box.width / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Create a default song if none exists
if (timeline.children.length === 0) {
  randomizeSong();
}
