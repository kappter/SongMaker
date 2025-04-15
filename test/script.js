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
let audioContext = new AudioContext();

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

// Initial setup
populateSongDropdown();
loadSongFromDropdown('songs/satisfaction.js');
updateTitle(currentSongName); // Sync input on load
