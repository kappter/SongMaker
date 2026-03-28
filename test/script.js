const timeline = document.getElementById('timeline');
const timeCalculator = document.getElementById('time-calculator');
const currentBlockDisplay = document.getElementById('current-block-display');
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const stopBtn = document.getElementById('stop-btn');
const soundBtn = document.getElementById('sound-btn');
const themeBtn = document.getElementById('theme-btn');
const songDropdown = document.getElementById('song-dropdown');
const toggleFormBtn = document.getElementById('toggle-form-btn');
const formContent = document.getElementById('form-content');
const printSongName = document.getElementById('print-song-name');
const songTitleInput = document.getElementById('song-title-input'); // Reference to parameters input
let draggedBlock = null;
let selectedBlock = null;
let currentSongName = "(I Can't Get No) Satisfaction";
let currentTime = 0;
let currentBeat = 0;
let blockBeat = 0;
let blockMeasure = 0;
let soundEnabled = true;
let isDarkMode = true;
let isFormCollapsed = true;

// ── Audio engine state ──────────────────────────────────────────────────────
let audioContext = null;
let tickBuffer = null, tockBuffer = null, tickShortBuffer = null, tockShortBuffer = null;
let audioBufferPromise = null;

// ── Playback state ───────────────────────────────────────────────────────────
// All timing is driven by audioContext.currentTime (the Web Audio clock).
// We NEVER use setTimeout/setInterval to advance blocks — only to look ahead
// and schedule audio. The rAF loop reads the audio clock for UI updates.
let isPlaying = false;
let isPaused = false;

// The audioContext.currentTime value at which beat 0 of the song started.
// Set once when playback begins; never changes until stop.
let songStartAudioTime = 0;

// Total pre-computed beat schedule for the whole song (including lead-in).
// Each entry: { audioTime, isFirstBeatOfMeasure, blockIndex }
let beatSchedule = [];

// Index into beatSchedule of the next beat we haven't scheduled audio for yet.
let scheduleHead = 0;

// Index into beatSchedule of the last beat we reported to the UI.
let uiHead = 0;

// Pre-computed per-block timing info (same shape as old timings array).
let songTimings = [];
let songTotalSeconds = 0;
let songTotalBeats = 0;

// rAF handle so we can cancel it.
let rafHandle = null;

// How far ahead (in seconds) to pre-schedule audio beats.
const SCHEDULE_AHEAD = 0.3; // increased so beats are always pre-scheduled before playback

// ── AudioContext lifecycle ───────────────────────────────────────────────────
// We create the context ONCE on first play and keep it alive forever.
// iOS requires creation inside a user-gesture handler.
function ensureAudioContext() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.error('Failed to create AudioContext:', e);
      return Promise.reject(e);
    }
  }
  if (audioContext.state === 'suspended') {
    return audioContext.resume();
  }
  return Promise.resolve();
}

const validTimeSignatures = [
  '4/4', '3/4', '6/8', '2/4', '5/4', '7/8', '12/8', '9/8', '11/8', '15/8', '13/8', '10/4', '8/8', '14/8', '16/8', '7/4', '6/4'
];

// Generate a random song object for Riffusion prompt
function generateRandomSong() {
  const titleAdjectives = ['Cosmic', 'Silent', 'Electric', 'Fading', 'Raging', 'Dreamy', 'Wild', 'Ethereal', 'Vivid', 'Haunting'];
  const titleNouns = ['Echo', 'Pulse', 'Wave', 'Night', 'Fire', 'Journey', 'Sky', 'Dawn', 'Shadow', 'Rhythm'];
  const moods = ['Happiness', 'Sadness', 'Tension', 'Euphoria', 'Calmness', 'Mystical'];
  const vibes = ['Rebellion', 'Triumph', 'Bliss', 'Atmospheric', 'Trippy', 'Awakening'];
  const keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const modes = ['Ionian', 'Dorian', 'Aeolian', 'Mixolydian'];
  const instruments = ['guitar, drums, bass', 'synth, piano, strings', 'electronic beats, vocal chops'];

  return {
    title: `${titleAdjectives[Math.floor(Math.random() * titleAdjectives.length)]} ${titleNouns[Math.floor(Math.random() * titleNouns.length)]}`,
    mood: moods[Math.floor(Math.random() * moods.length)],
    vibe: vibes[Math.floor(Math.random() * vibes.length)],
    key: keys[Math.floor(Math.random() * keys.length)],
    mode: modes[Math.floor(Math.random() * modes.length)],
    bpm: Math.floor(Math.random() * (180 - 60 + 1)) + 60,
    timeSignature: validTimeSignatures[Math.floor(Math.random() * validTimeSignatures.length)],
    introMood: moods[Math.floor(Math.random() * moods.length)],
    introVibe: vibes[Math.floor(Math.random() * vibes.length)],
    verseMood: moods[Math.floor(Math.random() * moods.length)],
    verseThemes: 'introspection, freedom',
    verseStyle: 'melodic, rhythmic',
    chorusMood: moods[Math.floor(Math.random() * moods.length)],
    chorusHook: 'catchy, uplifting',
    chorusVibe: vibes[Math.floor(Math.random() * vibes.length)],
    bridgeMood: moods[Math.floor(Math.random() * moods.length)],
    bridgeVibe: vibes[Math.floor(Math.random() * vibes.length)],
    bridgeTexture: 'sparse, atmospheric',
    outroMood: moods[Math.floor(Math.random() * moods.length)],
    outroVibe: 'resolving, fading',
    instruments: instruments[Math.floor(Math.random() * instruments.length)],
    overallVibe: vibes[Math.floor(Math.random() * vibes.length)]
  };
}

function generateRiffusionPrompt(song) {
  return `Create a ${song.mood}, ${song.vibe} track titled "${song.title}" in ${song.key} ${song.mode}, ${song.bpm} BPM, ${song.timeSignature} time signature. ` +
         `Begin with a ${song.introMood} intro that feels ${song.introVibe}. ` +
         `Transition into ${song.verseMood} verses with themes of ${song.verseThemes}, using ${song.verseStyle}. ` +
         `Introduce a ${song.chorusMood} chorus with a ${song.chorusHook}, ${song.chorusVibe}. ` +
         `Include a bridge section that is ${song.bridgeMood}, evoking ${song.bridgeVibe} with ${song.bridgeTexture}. ` +
         `End with a ${song.outroMood} outro that ${song.outroVibe}, tying together the song’s themes. ` +
         `Use ${song.instruments} to maintain an ${song.overallVibe} vibe throughout.`;
}

function copyRiffusionPrompt() {
  const blocks = Array.from(timeline.children);
  const firstBlock = blocks[0];
  const introBlock = blocks.find(b => b.classList.contains('intro'));
  const verseBlock = blocks.find(b => b.classList.contains('verse'));
  const chorusBlock = blocks.find(b => b.classList.contains('chorus'));
  const bridgeBlock = blocks.find(b => b.classList.contains('bridge'));
  const outroBlock = blocks.find(b => b.classList.contains('outro'));

  const song = {
    title: currentSongName || 'Untitled Song',
    mood: firstBlock?.getAttribute('data-feel') || 'Happiness',
    vibe: 'Atmospheric',
    key: firstBlock?.getAttribute('data-root-note') || 'C',
    mode: firstBlock?.getAttribute('data-mode') || 'Ionian',
    bpm: parseInt(firstBlock?.getAttribute('data-tempo')) || 120,
    timeSignature: firstBlock?.getAttribute('data-time-signature') || '4/4',
    introMood: introBlock?.getAttribute('data-feel') || 'Calmness',
    introVibe: 'Mystical',
    verseMood: verseBlock?.getAttribute('data-feel') || 'Sadness',
    verseThemes: 'introspection, freedom',
    verseStyle: 'melodic, rhythmic',
    chorusMood: chorusBlock?.getAttribute('data-feel') || 'Euphoria',
    chorusHook: 'catchy, uplifting',
    chorusVibe: 'Triumph',
    bridgeMood: bridgeBlock?.getAttribute('data-feel') || 'Tension',
    bridgeVibe: 'sparse',
    bridgeTexture: 'atmospheric',
    outroMood: outroBlock?.getAttribute('data-feel') || 'Resolution',
    outroVibe: 'fading',
    instruments: 'guitar, drums, synth',
    overallVibe: 'Bliss'
  };

  const prompt = generateRiffusionPrompt(song);
  navigator.clipboard.writeText(prompt)
    .then(() => alert("Prompt copied to clipboard!"))
    .catch(err => console.error("Failed to copy: ", err));
}

// iOS Safari does not support the Promise-based decodeAudioData API reliably.
// IMPORTANT: Use ONLY the callback form. On Chrome mobile, decodeAudioData
// both calls the success callback AND returns a Promise — if we attach both,
// resolve() fires twice (second time with undefined), corrupting the buffer.
// Using only the callback form works on all platforms: iOS Safari, Chrome, Firefox.
function decodeAudioDataCompat(arrayBuffer) {
  return new Promise((resolve, reject) => {
    try {
      audioContext.decodeAudioData(
        arrayBuffer,
        (buffer) => resolve(buffer),  // success — works on ALL browsers
        (err)    => reject(err || new Error('decodeAudioData failed'))
      );
      // Do NOT also attach .then() — that causes double-resolve on Chrome mobile
    } catch (e) {
      reject(e);
    }
  });
}

function loadAudioBuffers() {
  const loadOne = (url, setter) =>
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
        return r.arrayBuffer();
      })
      .then(b => decodeAudioDataCompat(b))
      .then(d => setter(d))
      .catch(err => {
        console.warn(`Audio file ${url} failed to load:`, err);
        // Non-fatal: metronome will run silently if sounds fail
      });

  return Promise.all([
    loadOne('tick.wav',       d => { tickBuffer = d; }),
    loadOne('tock.wav',       d => { tockBuffer = d; }),
    loadOne('tick_short.wav', d => { tickShortBuffer = d; }),
    loadOne('tock_short.wav', d => { tockShortBuffer = d; })
  ]);
}

function scheduleSound(buffer, audioTime) {
  if (!buffer || !soundEnabled || !audioContext) return;
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(audioTime);
}

const TEMPO_THRESHOLD = 150;

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
  
  // Per-role energy helper: each role has different energy characteristics per section type
  function getRoleEnergy(role, type) {
    const jitter = () => Math.floor(Math.random() * 2); // 0 or 1 variation
    const profiles = {
      drummer: {
        'intro': 3 + jitter(), 'verse': 5 + jitter(), 'pre-chorus': 7, 'chorus': 9 + jitter(),
        'post-chorus': 8, 'bridge': 5 + jitter(), 'breakdown': 2, 'drop': 10,
        'solo': 6 + jitter(), 'hook': 8 + jitter(), 'interlude': 3, 'ad-lib': 5 + jitter(),
        'outro': 3 + jitter(), 'coda': 3
      },
      bassist: {
        'intro': 4 + jitter(), 'verse': 5 + jitter(), 'pre-chorus': 6, 'chorus': 8 + jitter(),
        'post-chorus': 7, 'bridge': 6 + jitter(), 'breakdown': 3 + jitter(), 'drop': 9,
        'solo': 5 + jitter(), 'hook': 7 + jitter(), 'interlude': 4, 'ad-lib': 4 + jitter(),
        'outro': 4 + jitter(), 'coda': 3
      },
      guitarist: {
        'intro': 3 + jitter(), 'verse': 4 + jitter(), 'pre-chorus': 6 + jitter(), 'chorus': 9,
        'post-chorus': 7 + jitter(), 'bridge': 5 + jitter(), 'breakdown': 2 + jitter(), 'drop': 10,
        'solo': 10, 'hook': 8 + jitter(), 'interlude': 3 + jitter(), 'ad-lib': 6 + jitter(),
        'outro': 3, 'coda': 4
      },
      keyboardist: {
        'intro': 5 + jitter(), 'verse': 4 + jitter(), 'pre-chorus': 5 + jitter(), 'chorus': 7 + jitter(),
        'post-chorus': 6, 'bridge': 7 + jitter(), 'breakdown': 4 + jitter(), 'drop': 8,
        'solo': 5 + jitter(), 'hook': 6 + jitter(), 'interlude': 6 + jitter(), 'ad-lib': 5 + jitter(),
        'outro': 5 + jitter(), 'coda': 5
      },
      vocalist: {
        'intro': 2 + jitter(), 'verse': 5 + jitter(), 'pre-chorus': 6 + jitter(), 'chorus': 9 + jitter(),
        'post-chorus': 7, 'bridge': 6 + jitter(), 'breakdown': 1 + jitter(), 'drop': 8,
        'solo': 2, 'hook': 9, 'interlude': 1, 'ad-lib': 8 + jitter(),
        'outro': 4 + jitter(), 'coda': 3
      }
    };
    const val = (profiles[role] || {})[type];
    return Math.min(10, Math.max(1, val !== undefined ? val : 5 + jitter()));
  }

  const randRoles = ['drummer', 'bassist', 'guitarist', 'keyboardist', 'vocalist'];

  // 1. Always start with an intro
  const introEnergies = {};
  randRoles.forEach(r => { introEnergies[`energy_${r}`] = getRoleEnergy(r, 'intro'); });
  songStructure.push({
    type: 'intro',
    measures: Math.floor(Math.random() * (8 - 4 + 1)) + 4,
    rootNote: songRootNote,
    mode: songMode,
    tempo: songTempo,
    timeSignature: songTimeSignature,
    feel: 'Atmospheric',
    lyrics: '',
    ...introEnergies
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

    const midEnergies = {};
    randRoles.forEach(r => { midEnergies[`energy_${r}`] = getRoleEnergy(r, type); });
    songStructure.push({
      type,
      measures,
      rootNote: songRootNote,
      mode: songMode,
      tempo: songTempo,
      timeSignature: songTimeSignature,
      feel: feels[Math.floor(Math.random() * feels.length)],
      lyrics: possibleLyrics[Math.floor(Math.random() * possibleLyrics.length)],
      ...midEnergies
    });
  }

  // 3. Always end with an outro
  const outroEnergies = {};
  randRoles.forEach(r => { outroEnergies[`energy_${r}`] = getRoleEnergy(r, 'outro'); });
  songStructure.push({
    type: 'outro',
    measures: Math.floor(Math.random() * (8 - 4 + 1)) + 4,
    rootNote: songRootNote,
    mode: songMode,
    tempo: songTempo,
    timeSignature: songTimeSignature,
    feel: 'Resolution',
    lyrics: '',
    ...outroEnergies
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
    block.setAttribute('data-part-type', blockData.type);
    block.setAttribute('data-measures', blockData.measures);
    block.setAttribute('data-tempo', blockData.tempo);
    block.setAttribute('data-time-signature', blockData.timeSignature);
    block.setAttribute('data-feel', blockData.feel);
    block.setAttribute('data-lyrics', blockData.lyrics);
    block.setAttribute('data-root-note', blockData.rootNote);
    block.setAttribute('data-mode', blockData.mode);
    ['drummer','bassist','guitarist','keyboardist','vocalist'].forEach(r => {
      block.setAttribute(`data-energy-${r}`, blockData[`energy_${r}`] || 5);
    });
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
    document.getElementById('energy-drummer').value = parseInt(block.getAttribute('data-energy-drummer')) || 5;
    document.getElementById('energy-bassist').value = parseInt(block.getAttribute('data-energy-bassist')) || 5;
    document.getElementById('energy-guitarist').value = parseInt(block.getAttribute('data-energy-guitarist')) || 5;
    document.getElementById('energy-keyboardist').value = parseInt(block.getAttribute('data-energy-keyboardist')) || 5;
    document.getElementById('energy-vocalist').value = parseInt(block.getAttribute('data-energy-vocalist')) || 5;
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
  const energyDrummer = Math.min(10, Math.max(1, parseInt(document.getElementById('energy-drummer').value) || 5));
  const energyBassist = Math.min(10, Math.max(1, parseInt(document.getElementById('energy-bassist').value) || 5));
  const energyGuitarist = Math.min(10, Math.max(1, parseInt(document.getElementById('energy-guitarist').value) || 5));
  const energyKeyboardist = Math.min(10, Math.max(1, parseInt(document.getElementById('energy-keyboardist').value) || 5));
  const energyVocalist = Math.min(10, Math.max(1, parseInt(document.getElementById('energy-vocalist').value) || 5));

  const blockData = { type, measures, rootNote, mode, tempo, timeSignature, feel, lyrics };
  const error = validateBlock(blockData);
  if (error) {
    alert(`Error: ${error}`);
    return;
  }

  const block = document.createElement('div');
  block.classList.add('song-block', type);
  block.setAttribute('data-part-type', type);
  block.setAttribute('data-measures', measures);
  block.setAttribute('data-tempo', tempo);
  block.setAttribute('data-time-signature', timeSignature);
  block.setAttribute('data-feel', feel);
  block.setAttribute('data-lyrics', lyrics);
  block.setAttribute('data-root-note', rootNote);
  block.setAttribute('data-mode', mode);
  block.setAttribute('data-energy-drummer', energyDrummer);
  block.setAttribute('data-energy-bassist', energyBassist);
  block.setAttribute('data-energy-guitarist', energyGuitarist);
  block.setAttribute('data-energy-keyboardist', energyKeyboardist);
  block.setAttribute('data-energy-vocalist', energyVocalist);
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
  const energyDrummer = Math.min(10, Math.max(1, parseInt(document.getElementById('energy-drummer').value) || 5));
  const energyBassist = Math.min(10, Math.max(1, parseInt(document.getElementById('energy-bassist').value) || 5));
  const energyGuitarist = Math.min(10, Math.max(1, parseInt(document.getElementById('energy-guitarist').value) || 5));
  const energyKeyboardist = Math.min(10, Math.max(1, parseInt(document.getElementById('energy-keyboardist').value) || 5));
  const energyVocalist = Math.min(10, Math.max(1, parseInt(document.getElementById('energy-vocalist').value) || 5));

  const blockData = { type, measures, rootNote, mode, tempo, timeSignature, feel, lyrics };
  const error = validateBlock(blockData);
  if (error) {
    alert(`Error: ${error}`);
    return;
  }

  selectedBlock.className = `song-block ${type}`;
  selectedBlock.setAttribute('data-part-type', type);
  selectedBlock.setAttribute('data-measures', measures);
  selectedBlock.setAttribute('data-tempo', tempo);
  selectedBlock.setAttribute('data-time-signature', timeSignature);
  selectedBlock.setAttribute('data-feel', feel);
  selectedBlock.setAttribute('data-lyrics', lyrics);
  selectedBlock.setAttribute('data-root-note', rootNote);
  selectedBlock.setAttribute('data-mode', mode);
  selectedBlock.setAttribute('data-energy-drummer', energyDrummer);
  selectedBlock.setAttribute('data-energy-bassist', energyBassist);
  selectedBlock.setAttribute('data-energy-guitarist', energyGuitarist);
  selectedBlock.setAttribute('data-energy-keyboardist', energyKeyboardist);
  selectedBlock.setAttribute('data-energy-vocalist', energyVocalist);
  selectedBlock.innerHTML = `<span class="label">${formatPart(type)}: ${timeSignature} ${measures}m<br>${abbreviateKey(rootNote)} ${mode} ${tempo}b ${feel}${lyrics ? '<br>-<br>' + truncateLyrics(lyrics) : ''}</span><span class="tooltip">${lyrics || 'No lyrics'}</span>`;
  updateBlockSize(selectedBlock);

  // Re-attach all event listeners (click, delete, resize) via setupBlock
  const blockRef = selectedBlock;
  setupBlock(blockRef);

  // Re-apply current style
  const styleDropdown = document.getElementById('style-dropdown');
  if (styleDropdown.value) blockRef.classList.add(styleDropdown.value);

  // Keep the block selected after update
  blockRef.classList.add('selected');
  selectedBlock = blockRef;

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
  document.getElementById('energy-drummer').value = 5;
  document.getElementById('energy-bassist').value = 5;
  document.getElementById('energy-guitarist').value = 5;
  document.getElementById('energy-keyboardist').value = 5;
  document.getElementById('energy-vocalist').value = 5;
}

function getBeatsPerMeasure(timeSignature) {
  const [numerator, denominator] = timeSignature.split('/').map(Number);
  
  // Compound time signatures (denominator = 8, numerator divisible by 3)
  // These use dotted quarter notes as the beat unit
  if (denominator === 8 && numerator % 3 === 0) {
    return numerator / 3;
  }
  
  // Simple time signatures (denominator = 4 or 2)
  // The numerator directly represents the number of beats
  if (denominator === 4 || denominator === 2) {
    return numerator;
  }
  
  // Irregular time signatures (e.g., 5/8, 7/8, 11/8)
  // These are typically counted as written
  if (denominator === 8) {
    return numerator;
  }
  
  // Default fallback for any other time signatures
  return numerator;
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
  
  // Update mini progress bar
  updateMiniProgressBar(timings, totalSeconds);
  
  return { timings, totalSeconds, totalBeats };
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// ── Beat schedule builder ─────────────────────────────────────────────────────
// Builds a flat array of every beat in the song (lead-in + all blocks).
// Each entry records the exact audioContext time it should fire and
// enough metadata for the UI to know what to display.
function buildBeatSchedule(timings, startAudioTime) {
  const schedule = [];
  const firstBlock = timings[0];
  const leadInBeats = firstBlock.beatsPerMeasure;
  const leadInBeatDuration = 60 / firstBlock.tempo;

  // Lead-in beats (negative song-time, before beat 0)
  for (let b = 0; b < leadInBeats; b++) {
    schedule.push({
      audioTime: startAudioTime + b * leadInBeatDuration,
      songTime: -(leadInBeats - b) * leadInBeatDuration,
      isLeadIn: true,
      leadInBeat: b,          // 0-indexed within lead-in
      leadInTotal: leadInBeats,
      isFirstBeatOfMeasure: b === 0,
      blockIndex: 0
    });
  }

  // Song beats
  let offset = leadInBeats * leadInBeatDuration; // audio offset from startAudioTime
  let cumulativeSongBeats = 0;

  timings.forEach((timing, blockIndex) => {
    const beatDuration = 60 / timing.tempo;
    for (let b = 0; b < timing.totalBeats; b++) {
      const isFirstBeatOfMeasure = b % timing.beatsPerMeasure === 0;
      schedule.push({
        audioTime: startAudioTime + offset + b * beatDuration,
        songTime: offset + b * beatDuration - leadInBeats * leadInBeatDuration,
        isLeadIn: false,
        blockIndex,
        beatInBlock: b,       // 0-indexed within block
        measureInBlock: Math.floor(b / timing.beatsPerMeasure) + 1,
        cumulativeSongBeat: cumulativeSongBeats + b + 1,
        isFirstBeatOfMeasure
      });
    }
    offset += timing.totalBeats * beatDuration;
    cumulativeSongBeats += timing.totalBeats;
  });

  return schedule;
}

// ── Look-ahead audio scheduler (called every rAF) ─────────────────────────
// Schedules any beats whose audioTime falls within the next SCHEDULE_AHEAD
// seconds. This is the ONLY place audio nodes are created.
function flushAudioSchedule() {
  if (!audioContext || !isPlaying) return;
  const horizon = audioContext.currentTime + SCHEDULE_AHEAD;
  while (scheduleHead < beatSchedule.length && beatSchedule[scheduleHead].audioTime <= horizon) {
    const entry = beatSchedule[scheduleHead];
    const timing = songTimings[entry.blockIndex];
    const useShort = timing.tempo > TEMPO_THRESHOLD;
    const tickBuf = useShort ? tickShortBuffer : tickBuffer;
    const tockBuf = useShort ? tockShortBuffer : tockBuffer;
    scheduleSound(entry.isFirstBeatOfMeasure ? tickBuf : tockBuf, entry.audioTime);
    scheduleHead++;
  }
}

// ── UI update loop (rAF) ────────────────────────────────────────────────────────
function rafLoop() {
  if (!isPlaying) return;

  // If AudioContext isn't ready yet (Safari unlock pending), keep looping
  // so the animation doesn't stall — audio will join once context is running.
  if (!audioContext || audioContext.state === 'suspended') {
    // Try to resume the context
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        // Context just became running — rebuild beat schedule from NOW
        if (!isPlaying) return;
        // Ensure buffers are loaded before scheduling
        const doRebuild = () => {
          if (!isPlaying) return;
          songStartAudioTime = audioContext.currentTime + 0.5;
          beatSchedule = buildBeatSchedule(songTimings, songStartAudioTime);
          scheduleHead = 0;
          uiHead = 0;
        };
        if (tickBuffer) {
          doRebuild();
        } else {
          if (!audioBufferPromise) {
            audioBufferPromise = loadAudioBuffers().catch(err => console.warn('Audio load:', err));
          }
          audioBufferPromise.then(doRebuild);
        }
      }).catch(() => {});
    }
    rafHandle = requestAnimationFrame(rafLoop);
    return;
  }

  flushAudioSchedule();

  const now = audioContext.currentTime;
  // Find the beat that is currently sounding (the last one whose audioTime <= now)
  // We walk forward from uiHead to avoid O(n) scan every frame.
  while (uiHead + 1 < beatSchedule.length && beatSchedule[uiHead + 1].audioTime <= now) {
    uiHead++;
  }

  const entry = beatSchedule[uiHead];
  if (!entry) {
    rafHandle = requestAnimationFrame(rafLoop);
    return;
  }

  const timing = songTimings[entry.blockIndex];
  const songTimeSec = Math.max(0, now - songStartAudioTime - (timing ? (60 / songTimings[0].tempo) * songTimings[0].beatsPerMeasure : 0));

  if (entry.isLeadIn) {
    // Lead-in UI
    const beatDuration = 60 / timing.tempo;
    currentBlockDisplay.classList.add('pulse');
    currentBlockDisplay.style.animation = `pulse ${beatDuration}s infinite`;
    currentBlockDisplay.innerHTML = `
      <span class="label">Lead-In (${timing.block.getAttribute('data-time-signature')})</span>
      <span class="info">Beat: ${entry.leadInBeat + 1} of ${entry.leadInTotal}</span>
    `;
    if (entry.isFirstBeatOfMeasure) {
      currentBlockDisplay.classList.add('one-count');
    } else {
      currentBlockDisplay.classList.remove('one-count');
    }
    timeCalculator.textContent = `Lead-In | Total Duration: ${formatDuration(songTotalSeconds)} | Song Beat: 0 of ${songTotalBeats}`;
  } else {
    // Song beat UI
    const beatDuration = 60 / timing.tempo;
    const blockNum = entry.blockIndex + 1;
    const totalBlocks = songTimings.length;
    const rootNote = timing.block.getAttribute('data-root-note');
    const mode = timing.block.getAttribute('data-mode');

    // Highlight the playing block in the timeline
    const prevPlaying = timeline.querySelector('.playing');
    if (prevPlaying && prevPlaying !== timing.block) prevPlaying.classList.remove('playing');
    if (!timing.block.classList.contains('playing')) timing.block.classList.add('playing');

    currentBlockDisplay.classList.add('pulse');
    currentBlockDisplay.style.animation = `pulse ${beatDuration}s infinite`;
    currentBlockDisplay.innerHTML = `
      <span class="label">${formatPart(timing.block.classList[1])}: ${timing.block.getAttribute('data-time-signature')} ${timing.totalMeasures}m<br>${abbreviateKey(rootNote)} ${mode} ${timing.tempo}b ${timing.block.getAttribute('data-feel')}</span>
      <span class="info">Beat: ${entry.beatInBlock + 1} of ${timing.totalBeats} | Measure: ${entry.measureInBlock} of ${timing.totalMeasures} | Block: ${blockNum} of ${totalBlocks}</span>
    `;
    if (entry.isFirstBeatOfMeasure) {
      currentBlockDisplay.classList.add('one-count');
      pulseMiniProgressMarker();
    } else {
      currentBlockDisplay.classList.remove('one-count');
    }

    // Compute song elapsed time from audio clock (perfectly accurate)
    const leadInDuration = (60 / songTimings[0].tempo) * songTimings[0].beatsPerMeasure;
    const elapsed = Math.max(0, now - songStartAudioTime - leadInDuration);
    currentTime = elapsed;
    currentBeat = entry.cumulativeSongBeat;
    blockBeat = entry.beatInBlock + 1;
    blockMeasure = entry.measureInBlock;

    timeCalculator.textContent = `Current Time: ${formatDuration(elapsed)} / Total Duration: ${formatDuration(songTotalSeconds)} | Song Beat: ${currentBeat} of ${songTotalBeats} | Block: ${blockNum} of ${totalBlocks} (Measure: ${blockMeasure} of ${timing.totalMeasures})`;
    updateMiniProgressMarker(elapsed, songTotalSeconds);
  }

  // Check if song has ended
  if (uiHead >= beatSchedule.length - 1 && now >= beatSchedule[beatSchedule.length - 1].audioTime + 0.1) {
    resetPlayback();
    return;
  }

  rafHandle = requestAnimationFrame(rafLoop);
}

// ── Public playback controls ─────────────────────────────────────────────────────
function togglePlay() {
  if (isPlaying) stopMusic();
  else playMusic();
}

function playMusic() {
  if (isPlaying && !isPaused) return;

  const { timings, totalSeconds, totalBeats } = calculateTimings();
  if (timings.length === 0) return;

  // ── Step 1: Update UI state synchronously (no async needed for this) ────────
  playBtn.style.display = 'none';
  pauseBtn.style.display = 'inline-block';
  stopBtn.style.display = 'inline-block';

  if (isPaused) {
    // Resume from pause — adjust the audio clock reference for the pause gap
    isPaused = false;
    isPlaying = true;
    // If AudioContext is running, adjust immediately
    if (audioContext && audioContext.state === 'running') {
      const pauseDuration = audioContext.currentTime - pausedAtAudioTime;
      songStartAudioTime += pauseDuration;
      // Shift all remaining beat schedule entries forward by pause duration
      for (let i = scheduleHead; i < beatSchedule.length; i++) {
        beatSchedule[i].audioTime += pauseDuration;
      }
    }
    // If AudioContext is suspended, rafLoop will rebuild schedule when it resumes
    if (rafHandle) cancelAnimationFrame(rafHandle);
    rafHandle = requestAnimationFrame(rafLoop);
  } else {
    // ── Step 2: Set up song state synchronously ──────────────────────────────
    isPlaying = true;
    isPaused = false;
    scheduleHead = 0;
    uiHead = 0;
    currentTime = 0;
    currentBeat = 0;
    blockBeat = 0;
    blockMeasure = 0;
    songTimings = timings;
    songTotalSeconds = totalSeconds;
    songTotalBeats = totalBeats;

    // ── Step 3: Start RAF loop immediately (no async blocking) ───────────────
    // songStartAudioTime will be set properly once AudioContext is confirmed
    // running (either now if already running, or in rafLoop's resume branch).
    songStartAudioTime = 0; // placeholder until AudioContext confirms
    beatSchedule = [];

    if (rafHandle) cancelAnimationFrame(rafHandle);
    rafHandle = requestAnimationFrame(rafLoop);
  }

  // ── Step 4: Initialise AudioContext, load buffers, THEN build schedule ──────
  // Key fix: we wait for audio buffers to load before setting songStartAudioTime
  // so the first beat is never scheduled before its sound is ready.
  (function initAudio() {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
    } catch(e) {
      console.warn('AudioContext creation failed:', e);
      return; // Will run silently (visual only)
    }

    const buildScheduleWhenReady = () => {
      if (!isPlaying) return;
      if (beatSchedule.length > 0) return; // already built (e.g. resume path)

      // Buffers already loaded (second play onwards) — start immediately
      if (tickBuffer) {
        songStartAudioTime = audioContext.currentTime + 0.15;
        beatSchedule = buildBeatSchedule(songTimings, songStartAudioTime);
        scheduleHead = 0;
        uiHead = 0;
        return;
      }

      // First play — load buffers first, then schedule with enough lead time
      if (!audioBufferPromise) {
        audioBufferPromise = loadAudioBuffers().catch(err => console.warn('Audio load:', err));
      }
      audioBufferPromise.then(() => {
        if (!isPlaying) return;
        if (beatSchedule.length > 0) return;
        // Give 0.5s of lead time so first beat is guaranteed to have its buffer
        songStartAudioTime = audioContext.currentTime + 0.5;
        beatSchedule = buildBeatSchedule(songTimings, songStartAudioTime);
        scheduleHead = 0;
        uiHead = 0;
      });
    };

    const tryResume = () => {
      if (audioContext.state !== 'suspended') {
        buildScheduleWhenReady();
        return;
      }
      audioContext.resume().then(tryResume).catch(err => {
        console.warn('AudioContext resume failed:', err);
        // rafLoop will retry
      });
    };

    tryResume();
  })();
}

let pausedAtAudioTime = 0;

function pauseMusic() {
  if (!isPlaying || isPaused) return;

  isPaused = true;
  isPlaying = false;
  pausedAtAudioTime = audioContext.currentTime;

  if (rafHandle) { cancelAnimationFrame(rafHandle); rafHandle = null; }

  pauseBtn.style.display = 'none';
  playBtn.style.display = 'inline-block';
  playBtn.textContent = 'Resume';
}

function stopMusic() {
  isPlaying = false;
  isPaused = false;

  if (rafHandle) { cancelAnimationFrame(rafHandle); rafHandle = null; }

  playBtn.style.display = 'inline-block';
  playBtn.textContent = 'Play';
  pauseBtn.style.display = 'none';
  stopBtn.style.display = 'none';

  resetPlayback();
}

function resetPlayback() {
  if (rafHandle) { cancelAnimationFrame(rafHandle); rafHandle = null; }

  isPlaying = false;
  isPaused = false;
  beatSchedule = [];
  scheduleHead = 0;
  uiHead = 0;
  currentTime = 0;
  currentBeat = 0;
  blockBeat = 0;
  blockMeasure = 0;

  playBtn.textContent = 'Play';
  playBtn.style.display = 'inline-block';
  pauseBtn.style.display = 'none';
  stopBtn.style.display = 'none';

  const previousBlock = timeline.querySelector('.playing');
  if (previousBlock) previousBlock.classList.remove('playing');

  currentBlockDisplay.classList.remove('pulse', 'one-count');
  currentBlockDisplay.style.animation = 'none';
  currentBlockDisplay.innerHTML = '<span class="label">No block playing</span>';

  hideMiniProgressMarker();
  calculateTimings();
}

function exportSong() {
  const roles = ['drummer', 'bassist', 'guitarist', 'keyboardist', 'vocalist'];
  const blocks = Array.from(timeline.children).map(block => {
    const obj = {
      type: block.classList[1],
      measures: parseInt(block.getAttribute('data-measures')),
      rootNote: block.getAttribute('data-root-note'),
      mode: block.getAttribute('data-mode'),
      tempo: parseInt(block.getAttribute('data-tempo')),
      timeSignature: block.getAttribute('data-time-signature'),
      feel: block.getAttribute('data-feel'),
      lyrics: block.getAttribute('data-lyrics')
    };
    roles.forEach(r => { obj[`energy_${r}`] = parseInt(block.getAttribute(`data-energy-${r}`)) || 5; });
    return obj;
  });

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
    if (error) throw new Error(`Block ${i + 1}: ${error}`);
  }

  if (isPlaying) resetPlayback();

  timeline.innerHTML = '';
  if (selectedBlock) clearSelection();

  updateTitle(songData.songName);

  const loadRoles = ['drummer', 'bassist', 'guitarist', 'keyboardist', 'vocalist'];
  songData.blocks.forEach((blockData) => {
    const { type, measures, rootNote, mode, tempo, timeSignature, feel, lyrics } = blockData;
    const block = document.createElement('div');
    block.classList.add('song-block', type);
    block.setAttribute('data-part-type', type);
    block.setAttribute('data-measures', measures);
    block.setAttribute('data-tempo', tempo);
    block.setAttribute('data-time-signature', timeSignature);
    block.setAttribute('data-feel', feel || '');
    block.setAttribute('data-lyrics', lyrics || '');
    block.setAttribute('data-root-note', rootNote);
    block.setAttribute('data-mode', mode);
    loadRoles.forEach(r => {
      // Support both new (energy_drummer) and legacy (energy) format
      const val = blockData[`energy_${r}`] || blockData.energy || 5;
      block.setAttribute(`data-energy-${r}`, val);
    });
    block.innerHTML = `<span class="label">${formatPart(type)}: ${timeSignature} ${measures}m<br>${abbreviateKey(rootNote)} ${mode} ${tempo}b ${feel || ''}${lyrics ? '<br>-<br>' + truncateLyrics(lyrics) : ''}</span><span class="tooltip">${lyrics || 'No lyrics'}</span>`;
    updateBlockSize(block);
    setupBlock(block);
    timeline.appendChild(block);
  });

  const styleDropdown = document.getElementById('style-dropdown');
  if (styleDropdown.value) changeBlockStyle(styleDropdown.value);

  calculateTimings();
}

function loadSongFromDropdown(filename) {
  if (!filename) {
    console.log("No filename selected");
    return;
  }

  if (isPlaying) resetPlayback();

  if (filename === 'new-song') {
    timeline.innerHTML = '';
    if (selectedBlock) clearSelection();
    isFormCollapsed = false;
    formContent.classList.remove('collapsed');
    toggleFormBtn.textContent = 'Hide Parameters';
    currentSongName = 'New Song';
    updateTitle(currentSongName);
    calculateTimings();
    const styleDropdown = document.getElementById('style-dropdown');
    styleDropdown.value = '';
    return;
  }

  // Prepend 'songs/' to the filename for fetching
  const fullPath = filename.startsWith('songs/') ? filename : `songs/${filename}`;
  console.log(`Attempting to load: ${fullPath}`);
  try {
    if (filename.endsWith('.js')) {
      fetch(fullPath)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to fetch ${fullPath}: ${response.statusText}`);
          return response.text();
        })
        .then(text => {
          eval(text); // Load the script into the global scope
          if (filename === 'songs/pneuma.js' && typeof loadPneuma === 'function') loadPneuma();
          else if (filename === 'songs/satisfaction.js' && typeof loadSatisfaction === 'function') loadSatisfaction();
          else if (filename === 'songs/dirtyLaundry.js' && typeof loadDirtyLaundry === 'function') loadDirtyLaundry();
          else if (filename === 'songs/invincible.js' && typeof loadInvincible === 'function') loadInvincible();
          else if (filename === 'songs/astroworld.js' && typeof loadAstroworld === 'function') loadAstroworld();
          else if (filename === 'songs/astrothunder.js' && typeof loadAstrothunder === 'function') loadAstrothunder();
          else if (filename === 'songs/jambi.js' && typeof loadJambi === 'function') loadJambi();
          else if (filename === 'songs/schism.js' && typeof loadSchism === 'function') loadSchism();
          else if (filename === 'songs/7empest.js' && typeof loadSevenTempest === 'function') loadSevenTempest();
          else throw new Error(`No load function found for ${filename}`);
        })
        .catch(error => {
          console.error(`Error loading ${fullPath}:`, error);
          alert(`Failed to load song: ${error.message}`);
        });
    } else if (filename.endsWith('.json')) {
      fetch(fullPath)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to fetch ${fullPath}: ${response.statusText}`);
          return response.json();
        })
        .then(data => loadSongData(data))
        .catch(error => {
          console.error(`Error loading ${fullPath}:`, error);
          alert(`Failed to load song: ${error.message}`);
        });
    } else {
      throw new Error(`Unsupported file type: ${filename}`);
    }
    songDropdown.value = filename;
  } catch (error) {
    console.error(`Error in loadSongFromDropdown: ${error.message}`);
    alert(`Error loading song: ${error.message}`);
  }
}

function populateTimeSignatures() {
  const select = document.getElementById('time-signature');
  validTimeSignatures.forEach(ts => {
    const option = document.createElement('option');
    option.value = ts;
    option.textContent = ts;
    select.appendChild(option);
  });
}
// Call this during initialization, e.g., after populateSongDropdown()
populateTimeSignatures();

function populateSongDropdown() {
const availableSongs = [
  'new-song', 'songs/Echoes of Joy.json', 'songs/pneuma.js', 'songs/satisfaction.js',
  'songs/dirtyLaundry.js', 'songs/invincible.js', 'songs/astroworld.js', 'songs/astrothunder.js',
  'songs/jambi.js', 'songs/schism.js', 'songs/7empest.js'
];
  availableSongs.forEach(song => {
    const option = document.createElement('option');
    option.value = song;
    option.textContent = song === 'new-song' ? 'New Song' : song.replace('songs/', '').replace('.json', '').replace('.js', '');
    songDropdown.appendChild(option);
  });
}

function printSong() {
  const { totalSeconds, totalBeats } = calculateTimings();
  const blockCount = timeline.children.length;

  // Store original content to restore later
  const originalContent = currentBlockDisplay.innerHTML;

  // Populate with concise info, add print-specific class
  currentBlockDisplay.classList.add('print-view');
  currentBlockDisplay.innerHTML = `
    <span class="label">
      ${currentSongName} | ${formatDuration(totalSeconds)} | ${totalBeats} Beats | ${blockCount} Blocks
      <br>© 2025 SongMaker by kappter
    </span>
  `;

  window.print();

  // Restore original state
  currentBlockDisplay.classList.remove('print-view');
  currentBlockDisplay.innerHTML = originalContent;
}

// ── Nav dropdown helpers ──────────────────────────────────────────────────────
function toggleNavDropdown(id) {
  const el = document.getElementById(id);
  const isOpen = el.classList.contains('open');
  // Close all first
  document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
  if (!isOpen) el.classList.add('open');
}

function closeNavDropdowns() {
  document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.nav-dropdown')) closeNavDropdowns();
});

// Initial setup
populateSongDropdown();
loadSongFromDropdown('songs/satisfaction.js');
updateTitle(currentSongName); // Sync input on load

// ── iOS / Mobile compatibility ────────────────────────────────────────────────
// iOS Safari requires AudioContext to be created AND resumed inside a
// synchronous user-gesture handler. We add touchstart listeners (in addition
// to onclick) so the gesture is captured on the first tap on mobile.
(function setupMobilePlayback() {
  // Helper: ensure buttons respond to both click and touchend on mobile
  function addTouchHandler(btn, handler) {
    if (!btn) return;
    btn.addEventListener('touchend', function(e) {
      e.preventDefault(); // prevent ghost click
      handler();
    }, { passive: false });
  }

  addTouchHandler(playBtn, function() {
    if (isPlaying && !isPaused) pauseMusic();
    else if (isPaused) playMusic();
    else playMusic();
  });
  addTouchHandler(pauseBtn, pauseMusic);
  addTouchHandler(stopBtn, stopMusic);

  // Pre-unlock AudioContext on very first touch anywhere on the page.
  // This is the most reliable way to unblock iOS audio.
  function unlockAudio() {
    if (audioContext) {
      if (audioContext.state === 'suspended') audioContext.resume();
      return;
    }
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Assign synchronously so ensureAudioContext() reuses it immediately
      audioContext = ctx;
      // Play a silent buffer to fully unlock the audio system on iOS
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      ctx.resume().catch(() => {});
    } catch(e) {}
  }

  document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  document.addEventListener('touchend', unlockAudio, { once: true, passive: true });
})();

// MIDI Export Functionality
function exportMIDI() {
  const blocks = Array.from(timeline.children);
  
  if (blocks.length === 0) {
    alert('No blocks to export. Please add some song blocks first.');
    return;
  }

  try {
    const noteMap = {
      'C': 60, 'C#': 61, 'D': 62, 'D#': 63, 'E': 64, 'F': 65,
      'F#': 66, 'G': 67, 'G#': 68, 'A': 69, 'A#': 70, 'B': 71
    };
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    function midiNoteToName(midiNote) {
      const octave = Math.floor(midiNote / 12) - 1;
      const name = noteNames[midiNote % 12];
      return `${name}${octave}`;
    }

    const TICKS_PER_BEAT = 128;

    // ── Track 0: SongMaker Metadata (lossless round-trip data) ──────────────
    // Encodes every block field as a JSON marker event so the analyzer can
    // restore the song exactly without guessing.
    const metaTrack = new MidiWriter.Track();
    metaTrack.addTrackName('SongMaker_Metadata_v1');

    // Song-level header at tick 0
    const songHeader = {
      songmakerVersion: 1,
      songTitle: currentSongName || 'Untitled Song',
      blockCount: blocks.length
    };
    metaTrack.addEvent(new MidiWriter.TextEvent({
      text: 'SM_HEADER:' + JSON.stringify(songHeader),
      tick: 0
    }));

    // ── Track 1: Musical content (root notes + tempo/timesig events) ────────
    const track = new MidiWriter.Track();
    track.addTrackName(currentSongName || 'Untitled Song');

    const firstBlock = blocks[0];
    const firstTempo = parseInt(firstBlock.getAttribute('data-tempo')) || 120;
    const firstTS = firstBlock.getAttribute('data-time-signature') || '4/4';
    const [firstNum, firstDen] = firstTS.split('/').map(Number);
    track.setTempo(firstTempo);
    track.setTimeSignature(firstNum, firstDen);

    let currentTick = 0;

    blocks.forEach((block, index) => {
      const partType    = block.getAttribute('data-part-type')     || 'section';
      const measures    = parseInt(block.getAttribute('data-measures')) || 4;
      const rootNote    = block.getAttribute('data-root-note')     || 'C';
      const blockTempo  = parseInt(block.getAttribute('data-tempo'))    || 120;
      const blockTS     = block.getAttribute('data-time-signature') || '4/4';
      const mode        = block.getAttribute('data-mode')          || 'Ionian';
      const feel        = block.getAttribute('data-feel')          || '';
      const lyrics      = block.getAttribute('data-lyrics')        || '';
      const energyDrummer    = parseInt(block.getAttribute('data-energy-drummer'))    || 5;
      const energyBassist    = parseInt(block.getAttribute('data-energy-bassist'))    || 5;
      const energyGuitarist  = parseInt(block.getAttribute('data-energy-guitarist'))  || 5;
      const energyKeyboardist= parseInt(block.getAttribute('data-energy-keyboardist'))|| 5;
      const energyVocalist   = parseInt(block.getAttribute('data-energy-vocalist'))   || 5;
      const [tsNum, tsDen] = blockTS.split('/').map(Number);

      // Embed full block data as a JSON marker on the metadata track
      const blockMeta = {
        idx: index,
        partType, rootNote, mode, tempo: blockTempo,
        timeSig: blockTS, measures, feel, lyrics,
        energy: {
          drummer: energyDrummer, bassist: energyBassist,
          guitarist: energyGuitarist, keyboardist: energyKeyboardist,
          vocalist: energyVocalist
        },
        tick: currentTick
      };
      metaTrack.addEvent(new MidiWriter.TextEvent({
        text: 'SM_BLOCK:' + JSON.stringify(blockMeta),
        tick: currentTick
      }));

      // Human-readable marker on the music track too
      track.addEvent(new MidiWriter.TextEvent({
        text: `${index + 1}. ${partType} (${measures}m) - ${rootNote} ${mode}`,
        tick: currentTick
      }));

      if (index === 0 || blockTempo !== parseInt(blocks[index - 1].getAttribute('data-tempo'))) {
        track.setTempo(blockTempo, currentTick);
      }
      if (index === 0 || blockTS !== blocks[index - 1].getAttribute('data-time-signature')) {
        track.setTimeSignature(tsNum, tsDen, currentTick);
      }

      const rootMidi = noteMap[rootNote] || 60;
      const rootNoteName = midiNoteToName(rootMidi);
      const beatsPerMeasure = getBeatsPerMeasure(blockTS);
      const totalBeats = measures * beatsPerMeasure;
      const isCompound = tsDen === 8 && tsNum % 3 === 0;
      const noteDuration = isCompound ? 'd4' : '4';
      const ticksPerBeat = isCompound ? Math.round(TICKS_PER_BEAT * 1.5) : TICKS_PER_BEAT;

      for (let beat = 0; beat < totalBeats; beat++) {
        const isDownbeat = beat % beatsPerMeasure === 0;
        const velocity = isDownbeat ? 90 : 65;
        track.addEvent(new MidiWriter.NoteEvent({
          pitch: [rootNoteName],
          duration: noteDuration,
          velocity,
          tick: currentTick
        }));
        currentTick += ticksPerBeat;
      }
    });

    // Write both tracks: metadata first, then music
    const writer = new MidiWriter.Writer([metaTrack, track]);
    const dataUri = writer.dataUri();
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `${(currentSongName || 'song').replace(/[^a-z0-9]/gi, '_')}.mid`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('MIDI exported with SongMaker metadata track for lossless round-trip.');
    alert(`MIDI file "${link.download}" downloaded!\n\nAll block data is embedded for lossless re-import. Each beat plays the section root note at the correct tempo.`);

  } catch (error) {
    console.error('Error exporting MIDI:', error);
    alert('Error exporting MIDI. Check console for details.');
  }
}

// ========== REPORT GENERATION FUNCTIONS ==========

function openReportDialog() {
  document.getElementById('report-dialog').style.display = 'flex';
}

function closeReportDialog() {
  document.getElementById('report-dialog').style.display = 'none';
}

function toggleAllRoles(checked) {
  const checkboxes = document.querySelectorAll('.role-checkbox');
  checkboxes.forEach(cb => cb.checked = checked);
}

function generateReports() {
  const selectedRoles = Array.from(document.querySelectorAll('.role-checkbox:checked'))
    .map(cb => cb.value);
  
  if (selectedRoles.length === 0) {
    alert('Please select at least one role');
    return;
  }
  
  const blocks = Array.from(timeline.children);
  if (blocks.length === 0) {
    alert('No blocks in timeline to generate reports from');
    return;
  }
  
  selectedRoles.forEach(role => {
    generateRoleSheet(role, blocks);
  });
  
  closeReportDialog();
}

function generateRoleSheet(role, blocks) {
  try {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const roleNames = {
    drummer: 'Drummer',
    bassist: 'Bassist',
    guitarist: 'Guitarist',
    keyboardist: 'Keyboardist',
    vocalist: 'Vocalist'
  };
  
  const roleName = roleNames[role];
  const songTitle = currentSongName || 'Untitled Song';
  
  // Header
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text(songTitle, 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'normal');
  doc.text(`${roleName} Sheet`, 105, 30, { align: 'center' });
  
  // Song Info
  const firstBlock = blocks[0];
  const tempo = firstBlock.getAttribute('data-tempo') || '120';
  const timeSignature = firstBlock.getAttribute('data-time-signature') || '4/4';
  const key = firstBlock.getAttribute('data-root-note') || 'C';
  const mode = firstBlock.getAttribute('data-mode') || 'Ionian';
  
  doc.setFontSize(10);
  let yPos = 45;
  doc.text(`Tempo: ${tempo} BPM`, 20, yPos);
  doc.text(`Time: ${timeSignature}`, 80, yPos);
  doc.text(`Key: ${key} ${mode}`, 130, yPos);
  
  // Draw line
  yPos += 5;
  doc.setLineWidth(0.5);
  doc.line(20, yPos, 190, yPos);
  
  // Visual Song Structure Diagram
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Song Structure', 20, yPos);
  
  yPos += 8;
  const diagramStartY = yPos;
  const diagramHeight = 15;
  const diagramWidth = 170;
  const totalMeasures = blocks.reduce((sum, b) => sum + parseInt(b.getAttribute('data-measures') || 4), 0);
  // Compute total duration in seconds
  const totalDuration = blocks.reduce((sum, b) => {
    const bm = parseInt(b.getAttribute('data-measures') || 4);
    const bt = parseInt(b.getAttribute('data-tempo') || 120);
    const ts = b.getAttribute('data-time-signature') || '4/4';
    const [num] = ts.split('/').map(Number);
    return sum + (bm * num * 60 / bt);
  }, 0);
  
  // Color mapping for part types
  const partColors = {
    'intro': [100, 150, 100],
    'verse': [100, 120, 180],
    'chorus': [200, 100, 100],
    'bridge': [180, 140, 100],
    'solo': [150, 100, 180],
    'outro': [120, 120, 120],
    'interlude': [140, 160, 140],
    'pre-chorus': [160, 130, 160],
    'breakdown': [100, 100, 150],
    'hook': [190, 120, 120]
  };
  
  let xOffset = 20;
  blocks.forEach((block, index) => {
    const partType = block.getAttribute('data-part-type') || 'verse';
    const measures = parseInt(block.getAttribute('data-measures') || 4);
    const blockWidth = (measures / totalMeasures) * diagramWidth;
    
    const color = partColors[partType] || [140, 140, 140];
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(xOffset, diagramStartY, blockWidth, diagramHeight, 'F');
    
    // Add border
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.3);
    doc.rect(xOffset, diagramStartY, blockWidth, diagramHeight, 'S');
    
    // Add section number if wide enough
    if (blockWidth > 8) {
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`${index + 1}`, xOffset + blockWidth/2, diagramStartY + diagramHeight/2 + 2, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
    
    xOffset += blockWidth;
  });
  
  yPos += diagramHeight + 5;
  
  // Legend
  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  const uniqueParts = [...new Set(blocks.map(b => b.getAttribute('data-part-type') || 'verse'))];
  let legendX = 20;
  uniqueParts.forEach(partType => {
    const color = partColors[partType] || [140, 140, 140];
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(legendX, yPos, 4, 3, 'F');
    doc.setDrawColor(60, 60, 60);
    doc.rect(legendX, yPos, 4, 3, 'S');
    doc.text(formatPart(partType), legendX + 5, yPos + 2.5);
    legendX += doc.getTextWidth(formatPart(partType)) + 12;
  });
  
  yPos += 8;
  doc.setLineWidth(0.3);
  doc.line(20, yPos, 190, yPos);

  // ===== MULTI-TRACK ENERGY WAVEFORM =====
  yPos += 8;
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Energy Map — All Parts', 20, yPos);
  yPos += 5;

  // Role definitions: name, data-attribute key, RGB color
  const waveRoles = [
    { label: 'Drums',  attr: 'data-energy-drummer',     r: 220, g: 60,  b: 60  },
    { label: 'Bass',   attr: 'data-energy-bassist',     r: 60,  g: 120, b: 220 },
    { label: 'Guitar', attr: 'data-energy-guitarist',   r: 230, g: 120, b: 30  },
    { label: 'Keys',   attr: 'data-energy-keyboardist', r: 160, g: 60,  b: 210 },
    { label: 'Vocals', attr: 'data-energy-vocalist',    r: 40,  g: 180, b: 100 }
  ];

  // Draw legend inline
  let legendXw = 20;
  doc.setFontSize(7);
  doc.setFont(undefined, 'bold');
  waveRoles.forEach(wr => {
    doc.setFillColor(wr.r, wr.g, wr.b);
    doc.rect(legendXw, yPos - 2.5, 8, 2.5, 'F');
    doc.setTextColor(40, 40, 40);
    doc.text(wr.label, legendXw + 9, yPos - 0.5);
    legendXw += doc.getTextWidth(wr.label) + 18;
  });
  yPos += 5;

  const wLeft = 20;
  const wRight = 190;
  const wWidth = wRight - wLeft;
  const wTop = yPos;
  const wBottom = yPos + 36;
  const wHeight = wBottom - wTop;

  // Background
  doc.setFillColor(30, 30, 40);
  doc.rect(wLeft, wTop, wWidth, wHeight, 'F');
  doc.setDrawColor(70, 70, 90);
  doc.setLineWidth(0.2);
  doc.rect(wLeft, wTop, wWidth, wHeight, 'S');

  // Horizontal grid lines
  [0.25, 0.5, 0.75].forEach(frac => {
    const gy = wTop + wHeight * (1 - frac);
    doc.setDrawColor(60, 60, 80);
    doc.setLineWidth(0.15);
    doc.line(wLeft, gy, wRight, gy);
  });

  // Y-axis labels
  doc.setFontSize(5.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(140, 140, 160);
  doc.text('10', wLeft - 5, wTop + 2, { align: 'right' });
  doc.text('5',  wLeft - 5, wTop + wHeight / 2 + 1, { align: 'right' });
  doc.text('1',  wLeft - 5, wBottom + 1, { align: 'right' });

  // Compute x positions for each block (center of its proportional span)
  const waveBlockX = [];
  let wCumMeasures = 0;
  blocks.forEach(block => {
    const bm = parseInt(block.getAttribute('data-measures') || 4);
    const startFrac = wCumMeasures / totalMeasures;
    const endFrac   = (wCumMeasures + bm) / totalMeasures;
    waveBlockX.push(wLeft + ((startFrac + endFrac) / 2) * wWidth);
    wCumMeasures += bm;
  });

  // Draw vertical section dividers
  let wDivX = 0;
  blocks.forEach((block, bi) => {
    const bm = parseInt(block.getAttribute('data-measures') || 4);
    if (bi > 0) {
      const divX = wLeft + (wDivX / totalMeasures) * wWidth;
      doc.setDrawColor(80, 80, 100);
      doc.setLineWidth(0.2);
      doc.line(divX, wTop, divX, wBottom);
    }
    wDivX += bm;
  });

  // Draw each role's line (back to front so Vocals is on top)
  waveRoles.forEach(wr => {
    const pts = blocks.map((block, bi) => {
      const val = Math.min(10, Math.max(1, parseInt(block.getAttribute(wr.attr) || 5)));
      return { x: waveBlockX[bi], y: wTop + wHeight * (1 - (val - 1) / 9) };
    });
    if (pts.length < 2) return;
    // Draw line segments
    doc.setDrawColor(wr.r, wr.g, wr.b);
    doc.setLineWidth(0.9);
    for (let i = 0; i < pts.length - 1; i++) {
      doc.line(pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y);
    }
    // Draw dots
    doc.setFillColor(wr.r, wr.g, wr.b);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    pts.forEach(p => doc.circle(p.x, p.y, 1.2, 'FD'));
  });

  // Section name labels below chart
  doc.setFontSize(5.5);
  doc.setFont(undefined, 'normal');
  waveBlockX.forEach((px, i) => {
    const partType = blocks[i].getAttribute('data-part-type') || '';
    const label = `${i + 1}.${formatPart(partType).substring(0, 4)}`;
    doc.setTextColor(80, 80, 100);
    doc.text(label, px, wBottom + 4, { align: 'center' });
  });

  doc.setTextColor(0, 0, 0);
  yPos = wBottom + 10;

  doc.setLineWidth(0.3);
  doc.line(20, yPos, 190, yPos);

  // Section breakdown
  yPos += 8;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Section Details', 20, yPos);
  
  yPos += 8;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  
  const minBubbleWidth = 40;
  const maxBubbleWidth = 170;
  const bubbleMargin = 5;
  const startX = 20;
  const pageWidth = 190;
  let currentX = startX;
  let currentRow = 0;
  const bubbleHeight = 52; // tall enough for all content
  
  blocks.forEach((block, index) => {
    const partType = block.getAttribute('data-part-type') || 'Unknown';
    const measures = parseInt(block.getAttribute('data-measures') || '4');
    const rootNote = block.getAttribute('data-root-note') || 'C';
    const mode = block.getAttribute('data-mode') || '';
    const tempo = block.getAttribute('data-tempo') || '120';
    const timeSig = block.getAttribute('data-time-signature') || '4/4';
    const feel = block.getAttribute('data-feel') || 'Neutral';
    const lyrics = block.getAttribute('data-lyrics') || '';
    // Per-role energy for this block
    const roleEnergyMap = {
      drummer: parseInt(block.getAttribute('data-energy-drummer') || 5),
      bassist: parseInt(block.getAttribute('data-energy-bassist') || 5),
      guitarist: parseInt(block.getAttribute('data-energy-guitarist') || 5),
      keyboardist: parseInt(block.getAttribute('data-energy-keyboardist') || 5),
      vocalist: parseInt(block.getAttribute('data-energy-vocalist') || 5)
    };
    const thisRoleEnergy = roleEnergyMap[role] || 5;
    
    const proportionalWidth = (measures / totalMeasures) * pageWidth;
    const bubbleWidth = Math.max(minBubbleWidth, Math.min(maxBubbleWidth, proportionalWidth));
    
    if (currentX + bubbleWidth > startX + pageWidth && currentX > startX) {
      currentRow++;
      currentX = startX;
    }
    
    let sectionYPos = yPos + (currentRow * (bubbleHeight + 6));
    
    if (sectionYPos > 230) {
      doc.addPage();
      // Repeat song header on continuation pages
      doc.setFontSize(7);
      doc.setFont(undefined, 'italic');
      doc.setTextColor(120, 120, 140);
      doc.text(`${songTitle} — ${role.charAt(0).toUpperCase() + role.slice(1)} (cont.)`, 20, 12);
      doc.setTextColor(0, 0, 0);
      yPos = 20;
      currentRow = 0;
      currentX = startX;
      sectionYPos = yPos;
    }
    
    // Draw bubble background
    const partColor = partColors[partType] || [140, 140, 140];
    doc.setFillColor(partColor[0], partColor[1], partColor[2], 0.85);
    doc.roundedRect(currentX, sectionYPos - 5, bubbleWidth, bubbleHeight, 2, 2, 'F');
    
    // Draw colored left border
    doc.setFillColor(partColor[0], partColor[1], partColor[2]);
    doc.rect(currentX, sectionYPos - 5, 3, bubbleHeight, 'F');
    
    // Section header: part name + measures
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    const sectionTitle = `${index + 1}. ${formatPart(partType)} (${measures}m)`;
    doc.text(sectionTitle, currentX + 5, sectionYPos);
    sectionYPos += 4.5;

    // Sub-header: key, mode, tempo, time sig
    doc.setFont(undefined, 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(220, 220, 240);
    const subHeader = `${rootNote} ${mode} | ${tempo}bpm | ${timeSig} | ${feel}`;
    const subLines = doc.splitTextToSize(subHeader, bubbleWidth - 8);
    subLines.slice(0, 2).forEach(line => {
      doc.text(line, currentX + 5, sectionYPos);
      sectionYPos += 3.5;
    });

    // Energy indicator for this role
    const energyColors = { 1:[60,120,220], 2:[60,120,220], 3:[60,160,200], 4:[60,190,160],
      5:[120,190,80], 6:[190,190,60], 7:[220,150,40], 8:[220,100,40], 9:[210,60,60], 10:[200,30,30] };
    const ec = energyColors[thisRoleEnergy] || [120,120,120];
    doc.setFontSize(6);
    doc.setTextColor(ec[0], ec[1], ec[2]);
    doc.text(`Energy: ${thisRoleEnergy}/10`, currentX + 5, sectionYPos);
    sectionYPos += 4;
    
    // Role-specific information
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    
    if (role === 'drummer') {
      const safeFeelStr = String(feel || 'Neutral');
      const safeDrumPattern = String(getDrumPattern(partType, safeFeelStr) || 'Standard groove');
      const safeDynamics = String(getDynamics(partType) || 'mf');
      doc.text(`Feel: ${safeFeelStr}`, currentX + 5, sectionYPos);
      sectionYPos += 4;
      const pattern = doc.splitTextToSize(`Pat: ${safeDrumPattern}`, bubbleWidth - 8);
      pattern.slice(0, 2).forEach(line => {
        doc.text(String(line), currentX + 5, sectionYPos);
        sectionYPos += 3.5;
      });
      doc.text(`Dyn: ${safeDynamics}`, currentX + 5, sectionYPos);
      
    } else if (role === 'bassist') {
      doc.text(`Feel: ${feel}`, currentX + 5, sectionYPos);
      sectionYPos += 4;
      doc.text(`Root: ${key}`, currentX + 5, sectionYPos);
      sectionYPos += 4;
      const pattern = doc.splitTextToSize(`Pat: ${getBassPattern(partType)}`, bubbleWidth - 8);
      pattern.slice(0, 2).forEach(line => {
        doc.text(line, currentX + 5, sectionYPos);
        sectionYPos += 3.5;
      });
      
    } else if (role === 'guitarist') {
      doc.text(`Feel: ${feel}`, currentX + 5, sectionYPos);
      sectionYPos += 4;
      const chords = doc.splitTextToSize(`Chords: ${getChordProgression(key, mode, partType)}`, bubbleWidth - 8);
      chords.slice(0, 2).forEach(line => {
        doc.text(line, currentX + 5, sectionYPos);
        sectionYPos += 3.5;
      });
      const rhythm = doc.splitTextToSize(`Rhythm: ${getGuitarRhythm(partType)}`, bubbleWidth - 8);
      rhythm.slice(0, 1).forEach(line => {
        doc.text(line, currentX + 5, sectionYPos);
        sectionYPos += 3.5;
      });
      
    } else if (role === 'keyboardist') {
      doc.text(`Feel: ${feel}`, currentX + 5, sectionYPos);
      sectionYPos += 4;
      const voicing = doc.splitTextToSize(`Voicing: ${getKeyboardVoicing(partType)}`, bubbleWidth - 8);
      voicing.slice(0, 1).forEach(line => {
        doc.text(line, currentX + 5, sectionYPos);
        sectionYPos += 3.5;
      });
      const chords = doc.splitTextToSize(`Chords: ${getChordProgression(key, mode, partType)}`, bubbleWidth - 8);
      chords.slice(0, 2).forEach(line => {
        doc.text(line, currentX + 5, sectionYPos);
        sectionYPos += 3.5;
      });
      
    } else if (role === 'vocalist') {
      doc.text(`Feel: ${feel}`, currentX + 5, sectionYPos);
      sectionYPos += 4;
      if (lyrics) {
        // Auto-size lyrics to fit bubble
        const maxLyricsH = (bubbleHeight - 5) - (sectionYPos - (yPos + (currentRow * (bubbleHeight + 6)) - 5));
        let lyricsFontSize = 8;
        let lyricsLines;
        while (lyricsFontSize >= 5) {
          doc.setFontSize(lyricsFontSize);
          lyricsLines = doc.splitTextToSize(lyrics, bubbleWidth - 10);
          const lyricsH = lyricsLines.length * lyricsFontSize * 0.35;
          if (lyricsH <= maxLyricsH || lyricsFontSize <= 5) break;
          lyricsFontSize -= 0.5;
        }
        doc.setFontSize(lyricsFontSize);
        lyricsLines.forEach(line => {
          doc.text(line, currentX + 5, sectionYPos);
          sectionYPos += lyricsFontSize * 0.38;
        });
      } else {
        doc.text('(Instrumental)', currentX + 5, sectionYPos);
        sectionYPos += 4;
      }
      doc.setFontSize(7);
      const melody = doc.splitTextToSize(`Melody: ${getMelodyNotes(key, mode)}`, bubbleWidth - 8);
      melody.slice(0, 1).forEach(line => {
        doc.text(line, currentX + 5, sectionYPos);
      });
    }
    
    doc.setTextColor(0, 0, 0);
    currentX += bubbleWidth + bubbleMargin;
  });
  
  // Footer on every page: song metadata + page number
  const pageCount = doc.internal.getNumberOfPages();
  const totalDurMin = Math.floor(totalDuration / 60);
  const totalDurSec = Math.round(totalDuration % 60).toString().padStart(2, '0');
  const footerSongInfo = `${songTitle}  |  Key: ${key}  |  ${tempo} BPM  |  ${totalMeasures} measures  |  ${totalDurMin}:${totalDurSec}`;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Thin separator line
    doc.setDrawColor(180, 180, 200);
    doc.setLineWidth(0.3);
    doc.line(20, 284, 190, 284);
    // Song info left
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 100);
    doc.text(footerSongInfo, 20, 289);
    // Page number right
    doc.setTextColor(120, 120, 140);
    doc.text(`Page ${i} of ${pageCount}`, 190, 289, { align: 'right' });
    // Role label center
    doc.setFont(undefined, 'bold');
    doc.setTextColor(100, 100, 120);
    doc.text(role.charAt(0).toUpperCase() + role.slice(1), 105, 289, { align: 'center' });
  }
  
  // Save PDF
  doc.save(`${songTitle.replace(/[^a-z0-9]/gi, '_')}_${role}.pdf`);
  } catch(e) {
    alert(`Error generating ${role} PDF: ${e.message}\n\n${e.stack ? e.stack.split('\n').slice(0,4).join('\n') : ''}`);
    console.error('generateRoleSheet error for', role, e);
  }
}

function getDrumPattern(partType, feel) {
  const patterns = {
    'intro': 'Light groove, build energy',
    'verse': 'Steady beat, support vocals',
    'chorus': 'Full kit, driving rhythm',
    'bridge': 'Variation, dynamic shift',
    'outro': 'Gradual fade or strong finish',
    'solo': 'Support soloist, dynamic fills',
    'pre-chorus': 'Build intensity, fill on 4',
    'post-chorus': 'Driving rhythm, accent hits',
    'interlude': 'Sparse, hold groove',
    'breakdown': 'Half-time or stripped back',
    'hook': 'Full kit, punchy',
    'refrain': 'Steady, support melody'
  };
  return patterns[partType.toLowerCase()] || 'Standard groove';
}

function getDynamics(partType) {
  const dynamics = {
    'intro': 'mp - mf (building)',
    'verse': 'mf (moderate)',
    'chorus': 'f (strong)',
    'bridge': 'mp - f (dynamic)',
    'outro': 'f - pp (fading)',
    'solo': 'mf - f (supportive)',
    'pre-chorus': 'mf - f (building)',
    'post-chorus': 'f (strong)',
    'interlude': 'mp (sparse)',
    'breakdown': 'p - mp (stripped)',
    'hook': 'f (punchy)',
    'refrain': 'mf (steady)'
  };
  return dynamics[partType.toLowerCase()] || 'mf (moderate)';
}

function getBassPattern(partType) {
  const patterns = {
    'intro': 'Root notes, simple pattern',
    'verse': 'Walking bass or root-fifth',
    'chorus': 'Driving eighth notes',
    'bridge': 'Melodic variation',
    'outro': 'Root notes, fade',
    'solo': 'Supportive, space for soloist',
    'pre-chorus': 'Build to root, octave jumps',
    'post-chorus': 'Driving eighths, lock with kick',
    'interlude': 'Sparse, hold root',
    'breakdown': 'Half-time feel, deep root',
    'hook': 'Punchy root-fifth',
    'refrain': 'Steady root pattern'
  };
  return patterns[partType.toLowerCase()] || 'Root-fifth pattern';
}

function getChordProgression(key, mode, partType) {
  const progressions = {
    'intro': 'I - V',
    'verse': 'I - IV - V - IV',
    'chorus': 'I - V - vi - IV',
    'bridge': 'vi - IV - I - V',
    'outro': 'I - V - I',
    'solo': 'I - IV - V (repeat)',
    'pre-chorus': 'IV - V',
    'post-chorus': 'I - V',
    'interlude': 'I - vi',
    'breakdown': 'i - VII - VI',
    'hook': 'I - V - vi - IV',
    'refrain': 'I - IV - I - V'
  };
  return progressions[partType.toLowerCase()] || 'I - IV - V';
}

function getGuitarRhythm(partType) {
  const rhythms = {
    'intro': 'Arpeggios or light strumming',
    'verse': 'Steady strumming pattern',
    'chorus': 'Power chords, driving rhythm',
    'bridge': 'Fingerpicking or variation',
    'outro': 'Sustained chords',
    'solo': 'Comp chords, space for lead',
    'pre-chorus': 'Build strumming, muted hits',
    'post-chorus': 'Power chords, punchy',
    'interlude': 'Clean picking or silence',
    'breakdown': 'Heavy chug or silence',
    'hook': 'Driving power chords',
    'refrain': 'Steady strumming'
  };
  return rhythms[partType.toLowerCase()] || 'Standard strumming';
}

function getKeyboardVoicing(partType) {
  const voicings = {
    'intro': 'Sparse, high register',
    'verse': 'Comping, mid register',
    'chorus': 'Full voicings, rich sound',
    'bridge': 'Variation, different texture',
    'outro': 'Sustained pads',
    'solo': 'Comping, support harmony',
    'pre-chorus': 'Build, rising lines',
    'post-chorus': 'Full chords, sustain',
    'interlude': 'Ambient pads or silence',
    'breakdown': 'Sparse or heavy low voicing',
    'hook': 'Full, bright voicings',
    'refrain': 'Mid-register comping'
  };
  return voicings[partType.toLowerCase()] || 'Standard voicing';
}

function getMelodyNotes(key, mode) {
  return `${key} ${mode} scale, emphasize root and fifth`;
}


// ========================================
// MINI PROGRESS BAR FUNCTIONS
// ========================================

function updateMiniProgressBar(timings, totalSeconds) {
  const progressBar = document.getElementById('mini-progress-bar');
  if (!progressBar || timings.length === 0) return;
  
  // Clear existing sections
  progressBar.innerHTML = '';
  
  // Create a section for each block
  timings.forEach((timing, index) => {
    const section = document.createElement('div');
    section.classList.add('mini-section');
    
    // Add the part type class
    const partType = timing.block.getAttribute('data-part-type') || 'unknown';
    section.classList.add(partType.toLowerCase());
    
    // Set width based on duration proportion
    const widthPercent = (timing.duration / totalSeconds) * 100;
    section.style.width = `${widthPercent}%`;
    
    // Store timing data for marker positioning
    section.dataset.blockIndex = index;
    section.dataset.startTime = timing.block.dataset.startTime || '0';
    section.dataset.duration = timing.duration;
    
    progressBar.appendChild(section);
  });
  
  // Add duration markers
  const markersContainer = document.getElementById('mini-progress-markers');
  if (markersContainer) {
    markersContainer.innerHTML = '';
    
    // Dynamically generate marker intervals based on song duration
    const markerIntervals = [];
    let interval = 30; // Default 30-second intervals
    
    // Adjust interval based on total duration for better readability
    if (totalSeconds > 600) { // > 10 minutes
      interval = 60; // 1-minute intervals
    } else if (totalSeconds > 300) { // > 5 minutes
      interval = 30; // 30-second intervals
    } else if (totalSeconds > 120) { // > 2 minutes
      interval = 30; // 30-second intervals
    } else {
      interval = 15; // 15-second intervals for short songs
    }
    
    // Generate intervals from 0 to just before the end
    for (let time = 0; time < totalSeconds; time += interval) {
      markerIntervals.push(time);
    }
    
    markerIntervals.forEach(time => {
      if (time < totalSeconds) { // Changed from <= to < to avoid overlap with end marker
        const marker = document.createElement('div');
        marker.classList.add('time-marker');
        
        const position = (time / totalSeconds) * 100;
        marker.style.left = `${position}%`;
        
        // Format time as MM:SS
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        marker.innerHTML = `
          <div class="marker-line"></div>
          <div class="marker-label">${timeLabel}</div>
        `;
        
        markersContainer.appendChild(marker);
      }
    });
    
    // Add end time marker
    if (totalSeconds > 0) {
      const endMarker = document.createElement('div');
      endMarker.classList.add('time-marker', 'end-marker');
      endMarker.style.left = '100%';
      
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.round(totalSeconds % 60);
      const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      endMarker.innerHTML = `
        <div class="marker-line"></div>
        <div class="marker-label">${timeLabel}</div>
      `;
      
      markersContainer.appendChild(endMarker);
    }
  }
}

function updateMiniProgressMarker(currentTime, totalSeconds) {
  const marker = document.getElementById('mini-progress-marker');
  if (!marker) return;
  
  // Calculate position as percentage
  const position = (currentTime / totalSeconds) * 100;
  marker.style.left = `${Math.min(100, Math.max(0, position))}%`;
  
  // Show marker during playback
  if (!marker.classList.contains('active')) {
    marker.classList.add('active');
  }
  
  // Highlight the current section
  const sections = document.querySelectorAll('.mini-section');
  let cumulativeTime = 0;
  
  sections.forEach((section, index) => {
    const duration = parseFloat(section.dataset.duration);
    const sectionEnd = cumulativeTime + duration;
    
    if (currentTime >= cumulativeTime && currentTime < sectionEnd) {
      section.classList.add('playing');
    } else {
      section.classList.remove('playing');
    }
    
    cumulativeTime = sectionEnd;
  });
}

function hideMiniProgressMarker() {
  const marker = document.getElementById('mini-progress-marker');
  if (marker) {
    marker.classList.remove('active');
  }
  
  // Remove playing class from all sections
  const sections = document.querySelectorAll('.mini-section');
  sections.forEach(section => section.classList.remove('playing'));
}

function pulseMiniProgressMarker() {
  const marker = document.getElementById('mini-progress-marker');
  if (marker && marker.classList.contains('active')) {
    marker.classList.remove('pulse');
    // Force reflow
    void marker.offsetWidth;
    marker.classList.add('pulse');
  }
}
