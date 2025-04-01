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
let draggedBlock = null;
let selectedBlock = null;
let currentSongName = '(I Can’t Get No) Satisfaction';
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
let audioContext = new AudioContext(); // Moved to allow reinitialization

const validTimeSignatures = [
  '4/4', '3/4', '6/8', '2/4', '5/4', '7/8', '12/8', '9/8', '11/8', '15/8', '13/8', '10/4', '8/8', '14/8', '16/8', '7/4', '6/4'
];

let tickBuffer = null;
let tockBuffer = null;
let tickShortBuffer = null;
let tockShortBuffer = null;

function loadAudioBuffers() {
  return Promise.all([
    fetch('tick.wav').then(response => response.arrayBuffer()).then(buffer => audioContext.decodeAudioData(buffer)).then(decoded => tickBuffer = decoded),
    fetch('tock.wav').then(response => response.arrayBuffer()).then(buffer => audioContext.decodeAudioData(buffer)).then(decoded => tockBuffer = decoded),
    fetch('tick_short.wav').then(response => response.arrayBuffer()).then(buffer => audioContext.decodeAudioData(buffer)).then(decoded => tickShortBuffer = decoded),
    fetch('tock_short.wav').then(response => response.arrayBuffer()).then(buffer => audioContext.decodeAudioData(buffer)).then(decoded => tockShortBuffer = decoded)
  ]).catch(error => console.error('Failed to load audio files:', error));
}

loadAudioBuffers();

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

async function randomizeSong() {
  timeline.innerHTML = '';
  if (selectedBlock) clearSelection();

  // Define possible attributes for randomization
  const rootNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const modes = [
    'Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian',
    'Harmonic Minor', 'Melodic Minor', 'Blues Scale', 'Pentatonic Major', 'Pentatonic Minor', 'Whole Tone'
  ];
  const feels = [
    'Happiness', 'Sadness', 'Tension', 'Euphoria', 'Calmness', 'Anger', 'Mystical',
    'Rebellion', 'Triumph', 'Bliss', 'Frustration', 'Atmospheric', 'Trippy', 'Awakening', 'Intense', 'Climactic'
  ];

  // Fetch song data from songs.json
  let songs = [];
  try {
    const response = await fetch('songs/songs.json');
    if (!response.ok) throw new Error('Failed to load songs.json');
    const data = await response.json();
    songs = data.songs;
  } catch (error) {
    console.error('Error loading songs:', error);
    songs = [{ title: 'Default Song', artist: 'Unknown', lyrics: '' }];
  }

  // Define song structure components
  const introTypes = ['intro', 'instrumental-verse-chorus'];
  const outroTypes = ['outro', 'coda', 'false-ending'];
  const mainSectionTypes = ['verse', 'chorus', 'pre-chorus', 'refrain', 'post-chorus'];
  const breakSectionTypes = ['bridge', 'solo', 'interlude', 'breakdown', 'drop'];

  // Set a single key and tempo for the entire song
  const rootNote = rootNotes[Math.floor(Math.random() * rootNotes.length)];
  const mode = modes[Math.floor(Math.random() * modes.length)];
  const tempo = Math.floor(Math.random() * (180 - 60 + 1)) + 60;

  // Generate a logical song structure
  const numBlocks = Math.floor(Math.random() * (10 - 5 + 1)) + 5;
  const structure = [];

  // Always start with an intro
  structure.push({
    type: introTypes[Math.floor(Math.random() * introTypes.length)],
    measures: Math.floor(Math.random() * (4 - 1 + 1)) + 1
  });

  // Main body: Create a pattern like Verse → Pre-Chorus → Chorus, repeated
  const numMainSections = numBlocks - 2;
  let hasSolo = false;
  for (let i = 0; i < numMainSections; i++) {
    const position = i % 3;
    if (position === 0) {
      structure.push({ type: 'verse', measures: Math.floor(Math.random() * (8 - 4 + 1)) + 4 });
    } else if (position === 1 && Math.random() > 0.3) {
      structure.push({ type: 'pre-chorus', measures: Math.floor(Math.random() * (4 - 2 + 1)) + 2 });
    } else {
      structure.push({ type: 'chorus', measures: Math.floor(Math.random() * (8 - 4 + 1)) + 4 });
      if (i === 4 && !hasSolo && Math.random() > 0.5) {
        structure.push({
          type: breakSectionTypes[Math.floor(Math.random() * breakSectionTypes.length)],
          measures: Math.floor(Math.random() * (6 - 2 + 1)) + 2
        });
        hasSolo = true;
        i++;
      }
    }
  }

  // Always end with an outro
  structure.push({
    type: outroTypes[Math.floor(Math.random() * outroTypes.length)],
    measures: Math.floor(Math.random() * (4 - 1 + 1)) + 1
  });

  // Generate blocks based on the structure
  structure.forEach(({ type, measures }) => {
    const timeSignature = validTimeSignatures[Math.floor(Math.random() * validTimeSignatures.length)];
    const feel = feels[Math.floor(Math.random() * feels.length)];
    const song = songs[Math.floor(Math.random() * songs.length)];
    const lyrics = song.lyrics;

    const blockData = { type, measures, rootNote, mode, tempo, timeSignature, feel, lyrics };
    const error = validateBlock(blockData);
    if (error) {
      console.error(`Generated block failed validation: ${error}`);
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
    block.setAttribute('data-song-title', song.title);
    block.setAttribute('data-song-artist', song.artist);
    block.innerHTML = `
      <span class="label">${formatPart(type)}: ${timeSignature} ${measures}m<br>${abbreviateKey(rootNote)} ${mode} ${tempo}b ${feel}<br>${song.title} by ${song.artist}${lyrics ? '<br>-<br>' + truncateLyrics(lyrics) : ''}</span>
      <span class="tooltip">${lyrics || 'No lyrics'}</span>
    `;
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
}

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
  const measures = parseInt(block.getAttribute('data-measures'));
  const baseWidth = 120;
  const minWidth = 120;
  const width = Math.max(minWidth, (measures / 4) * baseWidth);
  block.style.width = `${width}px`;
}

function setupBlock(block) {
  block.draggable = true;
  block.addEventListener('dragstart', (e) => {
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

  block.addEventListener('click', () => {
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

  updateBlockSize(block);
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
  if (denominator === 8 && numerator % 3 === 0) {
    return numerator / 3; // Compound time (e.g., 6/8 = 2 beats)
  }
  if (timeSignature === '6/4') {
    return 6; // 6 quarter-note beats
  }
  return numerator; // Simple time
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
    audioContext.resume();
    playLeadIn(timings, totalSeconds, totalBeats);
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
    const source = playSound(beat === 0 ? currentTockBuffer : currentTickBuffer, soundTime);
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
      const isFirstBeatOfMeasure = beat % currentTiming.beatsPerMeasure === 0;
      const source = playSound(isFirstBeatOfMeasure ? currentTockBuffer : currentTickBuffer, soundTime);
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

  // Fully reset AudioContext
  audioContext.close().then(() => {
    audioContext = new AudioContext();
    loadAudioBuffers();
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
    if (error) throw new Error(`Block ${i + 1}: ${error}`);
  }

  if (isPlaying) resetPlayback();

  timeline.innerHTML = '';
  if (selectedBlock) clearSelection();

  updateTitle(songData.songName);

  songData.blocks.forEach(({ type, measures, rootNote, mode, tempo, timeSignature, feel, lyrics }) => {
    const block = document.createElement('div');
    block.classList.add('song-block', type);
    block.setAttribute('data-measures', measures);
    block.setAttribute('data-tempo', tempo);
    block.setAttribute('data-time-signature', timeSignature);
    block.setAttribute('data-feel', feel || '');
    block.setAttribute('data-lyrics', lyrics || '');
    block.setAttribute('data-root-note', rootNote);
    block.setAttribute('data-mode', mode);
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

  // Ensure full reset before loading new song
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

  console.log(`Attempting to load: ${filename}`);
  try {
    if (filename === 'pneuma.js') {
      if (typeof loadPneuma === 'function') loadPneuma();
      else fetch(filename).then(response => response.text()).then(text => { eval(text); loadPneuma(); });
    } else if (filename === 'satisfaction.js') {
      if (typeof loadSatisfaction === 'function') loadSatisfaction();
      else fetch(filename).then(response => response.text()).then(text => { eval(text); loadSatisfaction(); });
    } else if (filename === 'dirtyLaundry.js') {
      if (typeof loadDirtyLaundry === 'function') loadDirtyLaundry();
      else fetch(filename).then(response => response.text()).then(text => { eval(text); loadDirtyLaundry(); });
    } else if (filename === 'invincible.js') {
      if (typeof loadInvincible === 'function') loadInvincible();
      else fetch(filename).then(response => response.text()).then(text => { eval(text); loadInvincible(); });
    } else if (filename === 'astroworld.js') {
      if (typeof loadAstroworld === 'function') loadAstroworld();
      else fetch(filename).then(response => response.text()).then(text => { eval(text); loadAstroworld(); });
    } else if (filename === 'astrothunder.js') {
      if (typeof loadAstrothunder === 'function') loadAstrothunder();
      else fetch(filename).then(response => response.text()).then(text => { eval(text); loadAstrothunder(); });
    } else if (filename === 'jambi.js') {
      if (typeof loadJambi === 'function') loadJambi();
      else fetch(filename).then(response => response.text()).then(text => { eval(text); loadJambi(); });
    } else if (filename === 'Echoes of Joy.json') {
      fetch(filename).then(response => response.text()).then(text => loadSongData(JSON.parse(text)));
    } else {
      fetch(filename).then(response => response.json()).then(data => loadSongData(data));
    }
    songDropdown.value = filename;
  } catch (error) {
    console.error(`Error in loadSongFromDropdown: ${error.message}`);
    alert(`Error loading song: ${error.message}`);
  }
}

async function populateSongDropdown() {
  let songs = [];
  try {
    const response = await fetch('songs/songs.json');
    if (!response.ok) throw new Error('Failed to load songs.json');
    const data = await response.json();
    songs = data.songs;
  } catch (error) {
    console.error('Error loading songs for dropdown:', error);
    songs = [{ title: 'Default Song', artist: 'Unknown', lyrics: '' }];
  }

  const dropdown = document.getElementById('song-dropdown');
  dropdown.innerHTML = '';
  songs.forEach(song => {
    const option = document.createElement('option');
    option.value = song.title;
    option.textContent = `${song.title} by ${song.artist}`;
    dropdown.appendChild(option);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  populateSongDropdown();
});

// Call populateSongDropdown on page load
document.addEventListener('DOMContentLoaded', () => {
  populateSongDropdown();
});

// Call this on page load
document.addEventListener('DOMContentLoaded', () => {
  populateSongDropdown();
});

populateSongDropdown();
loadSongFromDropdown('satisfaction.js');
