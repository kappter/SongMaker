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
  
  return mostCommonFeel.toLowerCase();
}

function getVibeFromFeels(blocks) {
  const feels = blocks.map(block => block.getAttribute('data-feel')).filter(Boolean);
  
  // Map common feels to vibes
  const vibeMap = {
    'Happiness': 'uplifting',
    'Sadness': 'melancholic',
    'Tension': 'intense',
    'Euphoria': 'euphoric',
    'Calmness': 'serene',
    'Anger': 'aggressive',
    'Mystical': 'ethereal',
    'Rebellion': 'rebellious',
    'Triumph': 'triumphant',
    'Bliss': 'blissful',
    'Frustration': 'angsty',
    'Atmospheric': 'atmospheric',
    'Trippy': 'psychedelic',
    'Awakening': 'enlightening',
    'Intense': 'powerful',
    'Climactic': 'climactic'
  };
  
  // Default vibe
  let vibe = 'dynamic';
  
  // If we have feels, pick one randomly from the mapped vibes
  if (feels.length > 0) {
    const mappedVibes = feels.map(feel => vibeMap[feel] || 'dynamic').filter(Boolean);
    vibe = mappedVibes[Math.floor(Math.random() * mappedVibes.length)];
  }
  
  return vibe;
}

function getSectionData(blocks, sectionType) {
  const sectionBlocks = blocks.filter(block => block.classList.contains(sectionType));
  
  if (sectionBlocks.length === 0) {
    return null;
  }
  
  // Get the first block of this section type
  const block = sectionBlocks[0];
  const feel = block.getAttribute('data-feel') || '';
  
  // Map feels to moods and vibes
  const moodMap = {
    'Happiness': 'joyful',
    'Sadness': 'melancholic',
    'Tension': 'tense',
    'Euphoria': 'euphoric',
    'Calmness': 'calm',
    'Anger': 'angry',
    'Mystical': 'mystical',
    'Rebellion': 'rebellious',
    'Triumph': 'triumphant',
    'Bliss': 'blissful',
    'Frustration': 'frustrated',
    'Atmospheric': 'atmospheric',
    'Trippy': 'psychedelic',
    'Awakening': 'awakening',
    'Intense': 'intense',
    'Climactic': 'climactic'
  };
  
  const vibeMap = {
    'Happiness': 'upbeat and cheerful',
    'Sadness': 'somber and reflective',
    'Tension': 'suspenseful and building',
    'Euphoria': 'ecstatic and liberating',
    'Calmness': 'peaceful and soothing',
    'Anger': 'aggressive and raw',
    'Mystical': 'mysterious and otherworldly',
    'Rebellion': 'defiant and energetic',
    'Triumph': 'victorious and powerful',
    'Bliss': 'serene and transcendent',
    'Frustration': 'restless and yearning',
    'Atmospheric': 'spacious and immersive',
    'Trippy': 'disorienting and surreal',
    'Awakening': 'enlightening and expansive',
    'Intense': 'powerful and overwhelming',
    'Climactic': 'peak emotional intensity'
  };
  
  return {
    mood: moodMap[feel] || 'dynamic',
    vibe: vibeMap[feel] || 'engaging',
    key: block.getAttribute('data-root-note') || 'C',
    mode: block.getAttribute('data-mode') || 'Ionian',
    tempo: parseInt(block.getAttribute('data-tempo')) || 120,
    timeSignature: block.getAttribute('data-time-signature') || '4/4',
    lyrics: block.getAttribute('data-lyrics') || ''
  };
}

function getInstrumentSuggestions(blocks) {
  // Suggest instruments based on the overall feel of the song
  const feels = blocks.map(block => block.getAttribute('data-feel')).filter(Boolean);
  
  // Default instruments for different vibes
  const instrumentMap = {
    'Happiness': 'bright guitars, upbeat drums, and cheerful synths',
    'Sadness': 'piano, strings, and soft drums',
    'Tension': 'distorted guitars, heavy bass, and dramatic percussion',
    'Euphoria': 'layered synths, pulsing bass, and energetic drums',
    'Calmness': 'acoustic guitar, piano, and gentle percussion',
    'Anger': 'distorted guitars, aggressive drums, and powerful bass',
    'Mystical': 'ambient pads, bells, and atmospheric textures',
    'Rebellion': 'raw guitars, punchy drums, and gritty vocals',
    'Triumph': 'orchestral elements, powerful drums, and soaring leads',
    'Bliss': 'dreamy synths, soft pads, and gentle percussion',
    'Frustration': 'tense strings, driving rhythm, and dynamic percussion',
    'Atmospheric': 'reverb-heavy guitars, ambient pads, and sparse percussion',
    'Trippy': 'modulated synths, phased guitars, and unconventional percussion',
    'Awakening': 'bright pads, evolving textures, and building percussion',
    'Intense': 'heavy guitars, powerful drums, and driving bass',
    'Climactic': 'full orchestration, epic percussion, and soaring melodies'
  };
  
  // Default instruments
  let instruments = 'guitars, bass, drums, and synths';
  
  // If we have feels, pick one randomly from the mapped instruments
  if (feels.length > 0) {
    const mappedInstruments = feels.map(feel => instrumentMap[feel] || instruments).filter(Boolean);
    instruments = mappedInstruments[Math.floor(Math.random() * mappedInstruments.length)];
  }
  
  return instruments;
}

function getOverallVibe(blocks) {
  // Get a general vibe descriptor based on the song structure
  const blockTypes = blocks.map(block => block.classList[1]);
  const tempos = blocks.map(block => parseInt(block.getAttribute('data-tempo'))).filter(Boolean);
  const avgTempo = tempos.reduce((sum, tempo) => sum + tempo, 0) / tempos.length || 120;
  
  // Determine complexity based on number of different block types
  const uniqueBlockTypes = new Set(blockTypes).size;
  const complexity = uniqueBlockTypes <= 3 ? 'simple' : uniqueBlockTypes <= 5 ? 'moderately complex' : 'complex';
  
  // Determine energy level based on average tempo
  const energy = avgTempo < 80 ? 'relaxed' : avgTempo < 120 ? 'moderate' : 'energetic';
  
  // Combine for overall vibe
  return `${energy} and ${complexity}`;
}

function generateRiffusionPrompt(song) {
  if (!song) return '';
  
  // Base prompt with song-wide properties
  let prompt = `Create a ${song.mood}, ${song.vibe} track titled "${song.title}" in ${song.key} ${song.mode}, ${song.bpm} BPM, ${song.timeSignature} time signature. `;
  
  // Add section-specific details if available
  if (song.introData) {
    prompt += `Begin with a ${song.introData.mood} intro that feels ${song.introData.vibe}. `;
  }
  
  if (song.verseData) {
    const verseThemes = song.verseData.lyrics ? `themes from lyrics: "${song.verseData.lyrics.substring(0, 50)}${song.verseData.lyrics.length > 50 ? '...' : ''}"` : 'dynamic progression';
    prompt += `Transition into ${song.verseData.mood} verses with ${verseThemes}, using ${song.verseData.vibe} style. `;
  }
  
  if (song.chorusData) {
    prompt += `Introduce a ${song.chorusData.mood} chorus with a memorable hook, ${song.chorusData.vibe}. `;
  }
  
  if (song.bridgeData) {
    prompt += `Include a bridge section that is ${song.bridgeData.mood}, evoking ${song.bridgeData.vibe} with textural contrast. `;
  }
  
  if (song.outroData) {
    prompt += `End with a ${song.outroData.mood} outro that ${song.outroData.vibe}, tying together the song's themes. `;
  }
  
  // Add instrument suggestions
  prompt += `Use ${song.instruments} to maintain an ${song.overallVibe} vibe throughout.`;
  
  return prompt;
}

function loadAudioBuffers() {
  return Promise.all([
    fetch('tick.wav').then(response => response.arrayBuffer()).then(buffer => audioContext.decodeAudioData(buffer)).then(decoded => tickBuffer = decoded),
    fetch('tock.wav').then(response => response.arrayBuffer()).then(buffer => audioContext.decodeAudioData(buffer)).then(decoded => tockBuffer = decoded),
    fetch('tick_short.wav').then(response => response.arrayBuffer()).then(buffer => audioContext.decodeAudioData(buffer)).then(decoded => tickShortBuffer = decoded),
    fetch('tock_short.wav').then(response => response.arrayBuffer()).then(buffer => audioContext.decodeAudioData(buffer)).then(decoded => tockShortBuffer = decoded)
  ]).catch(error => console.error('Failed to load audio files:', error));
}

const audioBufferPromise = loadAudioBuffers(); // Single call, stored as promise

function playSound(buffer, time) {
  if (!buffer || !soundEnabled) return null;
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(time);
  return source;
}

const TEMPO_THRESHOLD = 150;

class TimeManager {
  constructor(tempo, beatsPerMeasure, totalBeats, callback) {
    this.tempo = tempo;
    this.beatsPerMeasure = beatsPerMeasure;
    this.totalBeats = totalBeats;
    this.callback = callback;
    this.startTime = null;
    this.lastBeat = -1;
    this.beatDuration = 60 / tempo;
    this.running = false;
  }

  start() {
    this.running = true;
    this.startTime = performance.now() / 1000 - (this.lastBeat + 1) * this.beatDuration;
    requestAnimationFrame(this.tick.bind(this));
  }

  stop() {
    this.running = false;
  }

  tick(timestamp) {
    if (!this.running) return;
    const currentTime = timestamp / 1000;
    const elapsed = currentTime - this.startTime;
    const currentBeat = Math.floor(elapsed / this.beatDuration);

    if (currentBeat <= this.totalBeats && currentBeat !== this.lastBeat) {
      this.lastBeat = currentBeat;
      const isFirstBeatOfMeasure = currentBeat % this.beatsPerMeasure === 0;
      this.callback({
        elapsedTime: elapsed,
        beat: currentBeat,
        measure: Math.floor(currentBeat / this.beatsPerMeasure) + 1,
        isFirstBeat: isFirstBeatOfMeasure
      });
    }

    if (currentBeat < this.totalBeats) {
      requestAnimationFrame(this.tick.bind(this));
    } else {
      this.stop();
    }
  }
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
  formContent.classList.toggle('collapsed');
  toggleFormBtn.textContent = isFormCollapsed ? 'Show Parameters' : 'Hide Parameters';
}

function changeBlockStyle(style) {
  const blocks = document.querySelectorAll('.song-block');
  blocks.forEach(block => {
    block.classList.remove('default', 'vibrant', 'pastel', 'monochrome');
    if (style) block.classList.add(style);
  });
}

function randomizeSong() {
  timeline.innerHTML = '';
  if (selectedBlock) clearSelection();

  // Core arrays for randomization
  const partTypes = [
    'verse', 'refrain', 'pre-chorus', 'chorus', 'post-chorus', 'bridge',
    'solo', 'ad-lib', 'hook', 'interlude', 'breakdown', 'drop', 'coda'
  ];
  const rootNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const modes = [
    'Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian',
    'Harmonic Minor', 'Melodic Minor', 'Blues Scale', 'Pentatonic Major', 'Pentatonic Minor'
  ];
  const feels = [
    'Happiness', 'Sadness', 'Tension', 'Euphoria', 'Calmness', 'Anger', 'Mystical',
    'Rebellion', 'Triumph', 'Bliss', 'Frustration', 'Atmospheric', 'Trippy', 'Awakening'
  ];
  const possibleLyrics = [
    '', 'La la la, here we go again...', 'Feel the rhythm, let it flow...',
    'Shadows dancing in the moonlight...', 'Break free, let your spirit soar...', 
    'Echoes of a forgotten dream...'
  ];

  // Random title generator
  const titleAdjectives = [
    'Cosmic', 'Silent', 'Electric', 'Fading', 'Raging', 'Dreamy', 'Wild', 'Ethereal', 'Vivid', 'Haunting'
  ];
  const titleNouns = [
    'Echo', 'Pulse', 'Wave', 'Night', 'Fire', 'Journey', 'Sky', 'Dawn', 'Shadow', 'Rhythm'
  ];
  const randomAdj = titleAdjectives[Math.floor(Math.random() * titleAdjectives.length)];
  const randomNoun = titleNouns[Math.floor(Math.random() * titleNouns.length)];
  const newTitle = `${randomAdj} ${randomNoun}`;
  updateTitle(newTitle);

  // Fixed song-wide properties
  const songRootNote = rootNotes[Math.floor(Math.random() * rootNotes.length)];
  const songMode = modes[Math.floor(Math.random() * modes.length)];
  const songTempo = Math.floor(Math.random() * (180 - 60 + 1)) + 60;
  const songTimeSignature = validTimeSignatures[Math.floor(Math.random() * validTimeSignatures.length)];

  // Song structure algorithm
  const songStructure = [];
  
  // 1. Always start with an intro
  songStructure.push({
    type: 'intro',
    measures: Math.floor(Math.random() * (8 - 4 + 1)) + 4,
    rootNote: songRootNote,
    mode: songMode,
    tempo: songTempo,
    timeSignature: songTimeSignature,
    feel: 'Atmospheric',
    lyrics: ''
  });

  // 2. Generate middle sections (6-10 blocks total, including intro/outro)
  const totalBlocks = Math.floor(Math.random() * (10 - 6 + 1)) + 6;
  const middleBlocks = totalBlocks - 2;
  let hasChorus = false;
  let hasBridge = false;

  for (let i = 0; i < middleBlocks; i++) {
    let type;
    const measures = Math.floor(Math.random() * (16 - 4 + 1)) + 4;

    // Logical progression
    if (i === 0) {
      type = 'verse';
    } else if (i === 1 && !hasChorus) {
      type = 'chorus';
      hasChorus = true;
    } else if (i === middleBlocks - 1 && !hasBridge) {
      type = 'bridge';
      hasBridge = true;
    } else {
      const rand = Math.random();
      if (rand < 0.4) type = 'verse';
      else if (rand < 0.7 && hasChorus) type = 'chorus';
      else if (rand < 0.85 && !hasBridge) {
        type = 'bridge';
        hasBridge = true;
      } else type = partTypes[Math.floor(Math.random() * partTypes.length)];
    }

    songStructure.push({
      type,
      measures,
      rootNote: songRootNote,
      mode: songMode,
      tempo: songTempo,
      timeSignature: songTimeSignature,
      feel: feels[Math.floor(Math.random() * feels.length)],
      lyrics: possibleLyrics[Math.floor(Math.random() * possibleLyrics.length)]
    });
  }

  // 3. Always end with an outro
  songStructure.push({
    type: 'outro',
    measures: Math.floor(Math.random() * (8 - 4 + 1)) + 4,
    rootNote: songRootNote,
    mode: songMode,
    tempo: songTempo,
    timeSignature: songTimeSignature,
    feel: 'Resolution',
    lyrics: ''
  });

  // Build blocks in the timeline
  songStructure.forEach(blockData => {
    const error = validateBlock(blockData);
    if (error) {
      console.error(`Generated block failed validation: ${error}`);
      return;
    }

    const block = document.createElement('div');
    block.classList.add('song-block', blockData.type);
    block.setAttribute('data-measures', blockData.measures);
    block.setAttribute('data-tempo', blockData.tempo);
    block.setAttribute('data-time-signature', blockData.timeSignature);
    block.setAttribute('data-feel', blockData.feel);
    block.setAttribute('data-lyrics', blockData.lyrics);
    block.setAttribute('data-root-note', blockData.rootNote);
    block.setAttribute('data-mode', blockData.mode);
    block.innerHTML = `<span class="label">${formatPart(blockData.type)}: ${blockData.timeSignature} ${blockData.measures}m<br>${abbreviateKey(blockData.rootNote)} ${blockData.mode} ${blockData.tempo}b ${blockData.feel}${blockData.lyrics ? '<br>-<br>' + truncateLyrics(blockData.lyrics) : ''}</span><span class="tooltip">${blockData.lyrics || 'No lyrics'}</span>`;
    updateBlockSize(block);
    setupBlock(block);
    timeline.appendChild(block);

    const styleDropdown = document.getElementById('style-dropdown');
    if (styleDropdown.value) block.classList.add(styleDropdown.value);
  });

  calculateTimings();
}

function updateTitle(name) {
  currentSongName = name;
  document.title = `${name} - SongMaker`;
  printSongName.textContent = name;
  songTitleInput.value = name; // Sync the parameters input
}

// Event listener for manual title updates
songTitleInput.addEventListener('input', (e) => {
  updateTitle(e.target.value); // Update title when user types
});

function formatPart(part) {
  return part.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function abbreviateKey(rootNote) {
  return rootNote;
}

function truncateLyrics(lyrics) {
  const maxLength = 50;
  return lyrics.length > maxLength ? lyrics.substring(0, maxLength - 3) + '...' : lyrics;
}

function validateBlock(block) {
  if (!block.type) return 'Type is required';
  if (!block.measures || block.measures < 1) return 'Measures must be at least 1';
  if (!block.rootNote) return 'Root note is required';
  if (!block.mode) return 'Mode is required';
  if (!block.tempo || block.tempo < 1) return 'Tempo must be at least 1';
  if (!block.timeSignature || !validTimeSignatures.includes(block.timeSignature)) return 'Invalid time signature';
  return null;
}

function updateBlockSize(block) {
  if (!block.style.width) {
    const measures = parseInt(block.getAttribute('data-measures'));
    const baseWidth = 120;
    const minWidth = 120;
    const width = Math.max(minWidth, (measures / 4) * baseWidth);
    block.style.width = `${width}px`;
  }
}

function setupBlock(block) {
  block.draggable = true;

  block.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('resize-handle')) {
      e.preventDefault();
      return;
    }
    draggedBlock = block;
    e.dataTransfer.setData('text/plain', '');
    block.style.opacity = '0.5';
  });

  block.addEventListener('dragend', () => {
    draggedBlock.style.opacity = '1';
    draggedBlock = null;
  });

  block.addEventListener('dragover', (e) => e.preventDefault());
  block.addEventListener('drop', (e) => {
    e.preventDefault();
    if (draggedBlock && draggedBlock !== block) {
      const allBlocks = Array.from(timeline.children);
      const draggedIndex = allBlocks.indexOf(draggedBlock);
      const droppedIndex = allBlocks.indexOf(block);

      if (draggedIndex < droppedIndex) {
        timeline.insertBefore(draggedBlock, block.nextSibling);
      } else {
        timeline.insertBefore(draggedBlock, block);
      }
      calculateTimings();
    }
  });

  block.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn') || e.target.classList.contains('resize-handle')) return;
    if (selectedBlock) selectedBlock.classList.remove('selected');
    selectedBlock = block;
    block.classList.add('selected');

    document.getElementById('part-type').value = block.classList[1];
    document.getElementById('measures').value = block.getAttribute('data-measures');
    document.getElementById('root-note').value = block.getAttribute('data-root-note');
    document.getElementById('mode').value = block.getAttribute('data-mode');
    document.getElementById('tempo').value = block.getAttribute('data-tempo');
    document.getElementById('time-signature').value = block.getAttribute('data-time-signature');
    document.getElementById('feel').value = block.getAttribute('data-feel') || '';
    document.getElementById('lyrics').value = block.getAttribute('data-lyrics') || '';
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.classList.add('delete-btn');
  deleteBtn.textContent = 'X';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    block.remove();
    if (selectedBlock === block) clearSelection();
    calculateTimings();
  });
  block.appendChild(deleteBtn);

  const resizeHandle = document.createElement('div');
  resizeHandle.classList.add('resize-handle');
  block.appendChild(resizeHandle);

  let startX, startWidth;
  resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    startX = e.pageX;
    startWidth = block.offsetWidth;
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
  });

  function resize(e) {
    const snapWidth = 30;
    const newWidth = Math.min(480, Math.max(120, Math.round((startWidth + (e.pageX - startX)) / snapWidth) * snapWidth));
    block.style.width = `${newWidth}px`;
    const measures = Math.round((newWidth / 120) * 4);
    block.setAttribute('data-measures', measures);
    const type = block.classList[1];
    const tempo = block.getAttribute('data-tempo');
    const timeSignature = block.getAttribute('data-time-signature');
    const feel = block.getAttribute('data-feel');
    const lyrics = block.getAttribute('data-lyrics');
    const rootNote = block.getAttribute('data-root-note');
    const mode = block.getAttribute('data-mode');
    block.querySelector('.label').innerHTML = `${formatPart(type)}: ${timeSignature} ${measures}m<br>${abbreviateKey(rootNote)} ${mode} ${tempo}b ${feel}${lyrics ? '<br>-<br>' + truncateLyrics(lyrics) : ''}`;
  }

  function stopResize() {
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
    calculateTimings();
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

  const blockData = { type, measures, rootNote, mode, tempo, timeSignature, feel, lyrics };
  const error = validateBlock(blockData);
  if (error) {
    alert(`Error: ${error}`);
    return;
  }

  const block = document.createElement('div');
  block.classList.add('song-block', type);
  block.setAttribute('data-measures', measures);
  block.setAttribute('data-tempo', tempo);
  block.setAttribute('data-time-signature', timeSignature);
  block.setAttribute('data-feel', feel);
  block.setAttribute('data-lyrics', lyrics);
  block.setAttribute('data-root-note', rootNote);
  block.setAttribute('data-mode', mode);
  block.innerHTML = `<span class="label">${formatPart(type)}: ${timeSignature} ${measures}m<br>${abbreviateKey(rootNote)} ${mode} ${tempo}b ${feel}${lyrics ? '<br>-<br>' + truncateLyrics(lyrics) : ''}</span><span class="tooltip">${lyrics || 'No lyrics'}</span>`;
  updateBlockSize(block);
  setupBlock(block);
  timeline.appendChild(block);

  const styleDropdown = document.getElementById('style-dropdown');
  if (styleDropdown.value) block.classList.add(styleDropdown.value);

  calculateTimings();
}

function updateBlock() {
  if (!selectedBlock) {
    alert('Please select a block to update');
    return;
  }

  const type = document.getElementById('part-type').value;
  const measures = parseInt(document.getElementById('measures').value);
  const rootNote = document.getElementById('root-note').value;
  const mode = document.getElementById('mode').value;
  const tempo = parseInt(document.getElementById('tempo').value);
  const timeSignature = document.getElementById('time-signature').value;
  const feel = document.getElementById('feel').value;
  const lyrics = document.getElementById('lyrics').value;

  const blockData = { type, measures, rootNote, mode, tempo, timeSignature, feel, lyrics };
  const error = validateBlock(blockData);
  if (error) {
    alert(`Error: ${error}`);
    return;
  }

  selectedBlock.className = `song-block ${type}`;
  selectedBlock.setAttribute('data-measures', measures);
  selectedBlock.setAttribute('data-tempo', tempo);
  selectedBlock.setAttribute('data-time-signature', timeSignature);
  selectedBlock.setAttribute('data-feel', feel);
  selectedBlock.setAttribute('data-lyrics', lyrics);
  selectedBlock.setAttribute('data-root-note', rootNote);
  selectedBlock.setAttribute('data-mode', mode);
  selectedBlock.innerHTML = `<span class="label">${formatPart(type)}: ${timeSignature} ${measures}m<br>${abbreviateKey(rootNote)} ${mode} ${tempo}b ${feel}${lyrics ? '<br>-<br>' + truncateLyrics(lyrics) : ''}</span><span class="tooltip">${lyrics || 'No lyrics'}</span>`;
  updateBlockSize(selectedBlock);

  const deleteBtn = document.createElement('button');
  deleteBtn.classList.add('delete-btn');
  deleteBtn.textContent = 'X';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedBlock.remove();
    if (selectedBlock === selectedBlock) clearSelection();
    calculateTimings();
  });
  selectedBlock.appendChild(deleteBtn);

  const resizeHandle = document.createElement('div');
  resizeHandle.classList.add('resize-handle');
  selectedBlock.appendChild(resizeHandle);

  const styleDropdown = document.getElementById('style-dropdown');
  if (styleDropdown.value) selectedBlock.classList.add(styleDropdown.value);

  calculateTimings();
}

function clearSelection() {
  if (selectedBlock) {
    selectedBlock.classList.remove('selected');
    selectedBlock = null;
  }
  document.getElementById('part-type').value = 'intro';
  document.getElementById('measures').value = 4;
  document.getElementById('root-note').value = 'C';
  document.getElementById('mode').value = 'Ionian';
  document.getElementById('tempo').value = 120;
  document.getElementById('time-signature').value = '4/4';
  document.getElementById('feel').value = 'Happiness';
  document.getElementById('lyrics').value = '';
}

function getBeatsPerMeasure(timeSignature) {
  const [numerator, denominator] = timeSignature.split('/').map(Number);
  if (timeSignature === '6/4') {
    return 6; // Special case for 6/4
  }
  return numerator; // 9/8 returns 9, 4/4 returns 4, etc.
}

function calculateTimings() {
  const blocks = Array.from(timeline.children);
  let totalSeconds = 0;
  let totalBeats = 0;
  let totalMeasures = 0;
  const timings = blocks.map((block, index) => {
    const tempo = parseInt(block.getAttribute('data-tempo'));
    const measures = parseInt(block.getAttribute('data-measures'));
    const timeSignature = block.getAttribute('data-time-signature');
    const beatsPerMeasure = getBeatsPerMeasure(timeSignature);
    const beatDuration = 60 / tempo;
    const totalBlockBeats = measures * beatsPerMeasure;
    const duration = totalBlockBeats * beatDuration;

    totalSeconds += duration;
    totalBeats += totalBlockBeats;
    totalMeasures += measures;

    return {
      block,
      blockIndex: index,
      tempo,
      beatsPerMeasure,
      totalBeats: totalBlockBeats,
      totalMeasures: measures,
      duration
    };
  });

  timeCalculator.textContent = `Current Time: ${formatDuration(currentTime)} / Total Duration: ${formatDuration(totalSeconds)} | Song Beat: ${currentBeat} of ${totalBeats} | Block: ${blockBeat} of ${timings.length} (Measure: ${blockMeasure} of ${totalMeasures})`;
  return { timings, totalSeconds, totalBeats };
}

function formatDuration(seconds) {
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
    if (timings.length === 0) return;
    playBtn.textContent = 'Reset';
    isPlaying = true;
    currentTime = 0;
    currentBeat = 0;
    blockBeat = 0;
    blockMeasure = 0;
    audioContext.resume().then(() => {
      audioBufferPromise.then(() => playLeadIn(timings, totalSeconds, totalBeats));
    });
  }
}

function playLeadIn(timings, totalSeconds, totalBeats) {
  const firstBlock = timings[0];
  const beatDuration = 60 / firstBlock.tempo;
  const leadInBeats = firstBlock.beatsPerMeasure;

  const useShortSounds = firstBlock.tempo > TEMPO_THRESHOLD;
  const currentTickBuffer = useShortSounds ? tickShortBuffer : tickBuffer;
  const currentTockBuffer = useShortSounds ? tockShortBuffer : tockBuffer;

  currentBlockDisplay.classList.add('pulse');
  currentBlockDisplay.style.animation = `pulse ${beatDuration}s infinite`;
  currentBlockDisplay.innerHTML = `
    <span class="label">Lead-In (${firstBlock.block.getAttribute('data-time-signature')})</span>
    <span class="info">Beat: 0 of ${leadInBeats}</span>
  `;

  const startTime = audioContext.currentTime;
  for (let beat = 0; beat < leadInBeats; beat++) {
    const soundTime = startTime + (beat * beatDuration);
    const isFirstBeat = beat === 0; // First beat of the lead-in measure
    const source = playSound(isFirstBeat ? currentTickBuffer : currentTockBuffer, soundTime);
    if (source) scheduledSources.push(source);
  }

  activeTimeManager = new TimeManager(firstBlock.tempo, leadInBeats, leadInBeats - 1, ({ elapsedTime, beat, isFirstBeat }) => {
    currentBlockDisplay.innerHTML = `
      <span class="label">Lead-In (${firstBlock.block.getAttribute('data-time-signature')})</span>
      <span class="info">Beat: ${beat + 1} of ${leadInBeats}</span>
    `;
    currentTime = elapsedTime;
    timeCalculator.textContent = `Current Time: ${formatDuration(currentTime)} / Total Duration: ${formatDuration(totalSeconds)} | Song Beat: ${currentBeat} of ${totalBeats} | Block: ${blockBeat} of ${timings.length} (Measure: ${blockMeasure} of 0)`;

    if (isFirstBeat) {
      currentBlockDisplay.classList.add('one-count');
    } else {
      currentBlockDisplay.classList.remove('one-count');
    }
  });

  activeTimeManager.start();

  setTimeout(() => {
    if (activeTimeManager) activeTimeManager.stop();
    activeTimeManager = null;
    currentTime = 0;
    playSong(timings, totalSeconds, totalBeats);
  }, leadInBeats * beatDuration * 1000);
}

function playSong(timings, totalSeconds, totalBeats) {
  let currentIndex = 0;
  let blockStartTime = audioContext.currentTime;
  let cumulativeBeats = 0;

  function playNextBlock() {
    if (!isPlaying || currentIndex >= timings.length) {
      resetPlayback();
      return;
    }

    const currentTiming = timings[currentIndex];
    const beatDuration = 60 / currentTiming.tempo;
    const totalBlockBeats = currentTiming.totalBeats;

    const useShortSounds = currentTiming.tempo > TEMPO_THRESHOLD;
    const currentTickBuffer = useShortSounds ? tickShortBuffer : tickBuffer;
    const currentTockBuffer = useShortSounds ? tockShortBuffer : tockBuffer;

    for (let beat = 0; beat < totalBlockBeats; beat++) {
      const soundTime = blockStartTime + (beat * beatDuration);
      // Play "tick" on the first beat of every measure
      const isFirstBeatOfMeasure = beat % currentTiming.beatsPerMeasure === 0;
      const source = playSound(isFirstBeatOfMeasure ? currentTickBuffer : currentTockBuffer, soundTime);
      if (source) scheduledSources.push(source);
    }

    updateCurrentBlock(currentTiming);

    activeTimeManager = new TimeManager(
      currentTiming.tempo,
      currentTiming.beatsPerMeasure,
      totalBlockBeats - 1,
      ({ elapsedTime, beat, measure, isFirstBeat }) => {
        blockBeat = beat + 1;
        blockMeasure = measure;
        currentTime = elapsedTime + (cumulativeBeats * (60 / timings[currentIndex].tempo));
        currentBeat = cumulativeBeats + beat + 1;

        const totalBlocks = timings.length;
        const blockNum = currentIndex + 1;
        const rootNote = currentTiming.block.getAttribute('data-root-note');
        const mode = currentTiming.block.getAttribute('data-mode');

        currentBlockDisplay.innerHTML = `
          <span class="label">${formatPart(currentTiming.block.classList[1])}: ${currentTiming.block.getAttribute('data-time-signature')} ${currentTiming.totalMeasures}m<br>${abbreviateKey(rootNote)} ${mode} ${currentTiming.tempo}b ${currentTiming.block.getAttribute('data-feel')}</span>
          <span class="info">Beat: ${blockBeat} of ${currentTiming.totalBeats} | Measure: ${blockMeasure} of ${currentTiming.totalMeasures} | Block: ${blockNum} of ${totalBlocks}</span>
        `;

        timeCalculator.textContent = `Current Time: ${formatDuration(currentTime)} / Total Duration: ${formatDuration(totalSeconds)} | Song Beat: ${currentBeat} of ${totalBeats} | Block: ${blockNum} of ${totalBlocks} (Measure: ${blockMeasure} of ${currentTiming.totalMeasures})`;

        currentBlockDisplay.classList.add('pulse');
        currentBlockDisplay.style.animation = `pulse ${beatDuration}s infinite`;

        if (isFirstBeat) {
          currentBlockDisplay.classList.add('one-count');
        } else {
          currentBlockDisplay.classList.remove('one-count');
        }
      }
    );

    activeTimeManager.start();

    setTimeout(() => {
      if (activeTimeManager) activeTimeManager.stop();
      activeTimeManager = null;
      cumulativeBeats += totalBlockBeats;
      blockStartTime += currentTiming.duration;
      currentIndex++;
      playNextBlock();
    }, currentTiming.duration * 1000 + 10);
  }

  playNextBlock();
}

function updateCurrentBlock(timing) {
  const previousBlock = timeline.querySelector('.playing');
  if (previousBlock) previousBlock.classList.remove('playing');
  timing.block.classList.add('playing');
}

function resetPlayback() {
  if (activeTimeManager) {
    activeTimeManager.stop();
    activeTimeManager = null;
  }

  scheduledSources.forEach(source => {
    try {
      source.stop();
    } catch (e) {
      // Ignore if already stopped
    }
  });
  scheduledSources = [];

  audioContext.close().then(() => {
    audioContext = new AudioContext();
    // Reload buffers after creating new context
    audioBufferPromise = loadAudioBuffers();
    audioBufferPromise.then(() => {
      console.log('Audio buffers reloaded after reset');
    }).catch(error => console.error('Failed to reload audio buffers:', error));
  });

  currentTime = 0;
  currentBeat = 0;
  blockBeat = 0;
  blockMeasure = 0;

  isPlaying = false;
  playBtn.textContent = 'Play';

  const previousBlock = timeline.querySelector('.playing');
  if (previousBlock) previousBlock.classList.remove('playing');

  currentBlockDisplay.classList.remove('pulse', 'one-count');
  currentBlockDisplay.style.animation = 'none';
  currentBlockDisplay.innerHTML = '<span class="label">No block playing</span>';

  calculateTimings();
}

function exportSong() {
  const blocks = Array.from(timeline.children).map(block => ({
    type: block.classList[1],
    measures: parseInt(block.getAttribute('data-measures')),
    rootNote: block.getAttribute('data-root-note'),
    mode: block.getAttribute('data-mode'),
    tempo: parseInt(block.getAttribute('data-tempo')),
    timeSignature: block.getAttribute('data-time-signature'),
    feel: block.getAttribute('data-feel'),
    lyrics: block.getAttribute('data-lyrics')
  }));

  const songData = { songName: currentSongName, blocks };
  const blob = new Blob([JSON.stringify(songData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentSongName}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importSong(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const songData = JSON.parse(e.target.result);
      loadSongData(songData);
    } catch (error) {
      alert(`Failed to import song: ${error.message}`);
    }
  };
  reader.readAsText(file);
}

function loadSongData(songData) {
  if (!songData.songName || !Array.isArray(songData.blocks)) {
    throw new Error('Invalid song file format: missing songName or blocks array.');
  }

  for (let i = 0; i < songData.blocks.length; i++) {
    const error = validateBlock(songData.blocks[i]);
    if (error) {
      throw new Error(`Block ${i + 1} is invalid: ${error}`);
    }
  }

  timeline.innerHTML = '';
  if (selectedBlock) clearSelection();
  updateTitle(songData.songName);

  songData.blocks.forEach(blockData => {
    const block = document.createElement('div');
    block.classList.add('song-block', blockData.type);
    block.setAttribute('data-measures', blockData.measures);
    block.setAttribute('data-tempo', blockData.tempo);
    block.setAttribute('data-time-signature', blockData.timeSignature);
    block.setAttribute('data-feel', blockData.feel || '');
    block.setAttribute('data-lyrics', blockData.lyrics || '');
    block.setAttribute('data-root-note', blockData.rootNote);
    block.setAttribute('data-mode', blockData.mode);
    block.innerHTML = `<span class="label">${formatPart(blockData.type)}: ${blockData.timeSignature} ${blockData.measures}m<br>${abbreviateKey(blockData.rootNote)} ${blockData.mode} ${blockData.tempo}b ${blockData.feel || ''}${blockData.lyrics ? '<br>-<br>' + truncateLyrics(blockData.lyrics) : ''}</span><span class="tooltip">${blockData.lyrics || 'No lyrics'}</span>`;
    updateBlockSize(block);
    setupBlock(block);
    timeline.appendChild(block);
  });

  const styleDropdown = document.getElementById('style-dropdown');
  if (styleDropdown.value) {
    const blocks = document.querySelectorAll('.song-block');
    blocks.forEach(block => block.classList.add(styleDropdown.value));
  }

  calculateTimings();
}

function loadSongFromDropdown(value) {
  if (!value) return;
  
  fetch(`songs/${value}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(songData => {
      loadSongData(songData);
    })
    .catch(error => {
      console.error('Error loading song:', error);
      alert(`Failed to load song: ${error.message}`);
    });
}

// Fixed print function to avoid extra page
function printSong() {
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Please allow pop-ups to print the song.');
    return;
  }
  
  const blocks = Array.from(timeline.children);
  const { totalSeconds } = calculateTimings();
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${currentSongName} - SongMaker</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        h1, h2 {
          margin: 0 0 10px 0;
        }
        .song-info {
          margin-bottom: 20px;
        }
        .timeline {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
        }
        .block {
          border: 1px solid #333;
          padding: 10px;
          border-radius: 5px;
          page-break-inside: avoid;
        }
        .intro { background-color: #e6f7ff; }
        .verse { background-color: #f0f5ff; }
        .chorus { background-color: #f9f0ff; }
        .bridge { background-color: #fff7e6; }
        .outro { background-color: #f6ffed; }
        .pre-chorus { background-color: #fff2e8; }
        .post-chorus { background-color: #fcffe6; }
        .solo { background-color: #fff1f0; }
        .breakdown { background-color: #f5f5f5; }
        .interlude { background-color: #e6fffb; }
        .hook { background-color: #fff0f6; }
        .coda { background-color: #e8e8e8; }
        .drop { background-color: #f0f2ff; }
        .ad-lib { background-color: #fffbe6; }
        .lyrics {
          margin-top: 5px;
          font-style: italic;
        }
        footer {
          margin-top: 20px;
          font-size: 0.8em;
          text-align: center;
          color: #666;
        }
        @media print {
          body {
            padding: 0;
            margin: 0;
          }
          @page {
            margin: 1cm;
            size: auto;
          }
        }
      </style>
    </head>
    <body>
      <h1>${currentSongName}</h1>
      <div class="song-info">
        <p>Total Duration: ${formatDuration(totalSeconds)} | Total Blocks: ${blocks.length}</p>
      </div>
      <div class="timeline">
  `);
  
  blocks.forEach(block => {
    const type = block.classList[1];
    const measures = block.getAttribute('data-measures');
    const rootNote = block.getAttribute('data-root-note');
    const mode = block.getAttribute('data-mode');
    const tempo = block.getAttribute('data-tempo');
    const timeSignature = block.getAttribute('data-time-signature');
    const feel = block.getAttribute('data-feel');
    const lyrics = block.getAttribute('data-lyrics');
    
    printWindow.document.write(`
      <div class="block ${type}">
        <h3>${formatPart(type)}</h3>
        <p>
          ${timeSignature} | ${measures} measures | ${rootNote} ${mode}<br>
          ${tempo} BPM | ${feel}
        </p>
        ${lyrics ? `<div class="lyrics">${lyrics}</div>` : ''}
      </div>
    `);
  });
  
  printWindow.document.write(`
      </div>
      <footer>
        Created with SongMaker
      </footer>
    </body>
    </html>
  `);
  
  printWindow.document.close();
  
  // Wait for resources to load before printing
  setTimeout(() => {
    printWindow.print();
    // Don't close the window after printing to allow user to save as PDF if desired
  }, 500);
}

// Load songs for dropdown
fetch('songs/songs.json')
  .then(response => response.json())
  .then(data => {
    songDropdown.innerHTML = '<option value="">Select a Song</option>';
    data.songs.forEach(song => {
      const option = document.createElement('option');
      option.value = song.file;
      option.textContent = song.name;
      songDropdown.appendChild(option);
    });
  })
  .catch(error => console.error('Error loading songs:', error));

// Initialize with default song
window.addEventListener('DOMContentLoaded', () => {
  loadSongFromDropdown('satisfaction.js');
});

// Add CSS for light mode text color fix
document.head.insertAdjacentHTML('beforeend', `
  <style>
    /* Fix for light mode text colors */
    body[data-theme="light"] footer,
    body[data-theme="light"] h2,
    body[data-theme="light"] #time-calculator {
      color: #333 !important;
    }
  </style>
`);
