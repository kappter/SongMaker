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
let currentSongName = 'Echoes of Joy';
let isPlaying = false;
let currentTime = 0;
let currentBeat = 0;
let blockBeat = 0;
let blockMeasure = 0;
let lastBeatTime = 0;
let soundEnabled = true;
let isDarkMode = true;
let isFormCollapsed = false;

const validTimeSignatures = ['4/4', '3/4', '6/8', '2/4', '5/4', '7/8', '12/8', '9/8', '11/8', '15/8', '13/8', '10/4', '8/8', '14/8', '16/8', '7/4'];
const tickSound = new Audio('tick.wav');
const tockSound = new Audio('tock.wav');
let activeSounds = [];

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
    this.startTime = performance.now() / 1000;
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

    if (currentBeat <= this.totalBeats) {
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
  // Clear the existing timeline
  timeline.innerHTML = '';
  if (selectedBlock) clearSelection();

  // Define possible values for block properties
  const partTypes = [
    'intro', 'verse', 'refrain', 'pre-chorus', 'chorus', 'post-chorus', 'bridge', 'outro',
    'elision', 'solo', 'ad-lib', 'hook', 'interlude', 'breakdown', 'drop', 'coda',
    'modulation', 'tag', 'chorus-reprise', 'countermelody', 'instrumental-verse-chorus', 'false-ending'
  ];
  const rootNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const modes = [
    'Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian',
    'Harmonic Minor', 'Melodic Minor', 'Blues Scale', 'Pentatonic Major', 'Pentatonic Minor', 'Whole Tone'
  ];
  const feels = [
    'Happiness', 'Sadness', 'Tension', 'Euphoria', 'Calmness', 'Anger', 'Mystical',
    'Rebellion', 'Triumph', 'Bliss', 'Frustration', 'Atmospheric', 'Trippy', 'Awakening', 'Intense', 'Climactic'
  ];
  const possibleLyrics = [
    '', // Sometimes no lyrics
    'La la la, here we go again...',
    'Feel the rhythm, let it flow...',
    'Shadows dancing in the moonlight...',
    'Break free, let your spirit soar...',
    'Echoes of a forgotten dream...'
  ];

  // Generate a random number of blocks (between 5 and 15)
  const numBlocks = Math.floor(Math.random() * (15 - 5 + 1)) + 5;

  // Generate random blocks
  for (let i = 0; i < numBlocks; i++) {
    const type = partTypes[Math.floor(Math.random() * partTypes.length)];
    const measures = Math.floor(Math.random() * (16 - 1 + 1)) + 1; // 1 to 16 measures
    const rootNote = rootNotes[Math.floor(Math.random() * rootNotes.length)];
    const mode = modes[Math.floor(Math.random() * modes.length)];
    const tempo = Math.floor(Math.random() * (180 - 60 + 1)) + 60; // 60 to 180 BPM
    const timeSignature = validTimeSignatures[Math.floor(Math.random() * validTimeSignatures.length)];
    const feel = feels[Math.floor(Math.random() * feels.length)];
    const lyrics = possibleLyrics[Math.floor(Math.random() * possibleLyrics.length)];

    const blockData = { type, measures, rootNote, mode, tempo, timeSignature, feel, lyrics };
    const error = validateBlock(blockData);
    if (error) {
      console.error(`Generated block failed validation: ${error}`);
      continue; // Skip invalid blocks (though our random values should all be valid)
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
    block.innerHTML = `<span class="label">${formatPart(type)}: ${timeSignature} ${measures}m<br>${abbreviateKey(rootNote, mode)} ${mode} ${tempo}b ${feel}${lyrics ? '<br>-<br>' + truncateLyrics(lyrics) : ''}</span><span class="tooltip">${lyrics || 'No lyrics'}</span>`;
    updateBlockSize(block);
    setupBlock(block);
    timeline.appendChild(block);

    // Apply current style
    const styleDropdown = document.getElementById('style-dropdown');
    if (styleDropdown.value) block.classList.add(styleDropdown.value);
  }

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

function abbreviateKey(rootNote, mode) {
  const isFlat = rootNote.includes('#');
  const simpleMode = mode.split(' ')[0];
  return `${rootNote}${isFlat ? '' : ''} ${simpleMode}`;
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
  block.style.height = `${Math.max(100, measures * 10)}px`;
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
  block.innerHTML = `<span class="label">${formatPart(type)}: ${timeSignature} ${measures}m<br>${abbreviateKey(rootNote, mode)} ${mode} ${tempo}b ${feel}${lyrics ? '<br>-<br>' + truncateLyrics(lyrics) : ''}</span><span class="tooltip">${lyrics || 'No lyrics'}</span>`;
  updateBlockSize(block);
  setupBlock(block);
  timeline.appendChild(block);

  // Apply current style
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
  selectedBlock.innerHTML = `<span class="label">${formatPart(type)}: ${timeSignature} ${measures}m<br>${abbreviateKey(rootNote, mode)} ${mode} ${tempo}b ${feel}${lyrics ? '<br>-<br>' + truncateLyrics(lyrics) : ''}</span><span class="tooltip">${lyrics || 'No lyrics'}</span>`;
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

  // Reapply style
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

function calculateTimings() {
  const blocks = Array.from(timeline.children);
  let totalSeconds = 0;
  let totalBeats = 0;
  let totalMeasures = 0;
  const timings = blocks.map((block, index) => {
    const tempo = parseInt(block.getAttribute('data-tempo'));
    const measures = parseInt(block.getAttribute('data-measures'));
    const timeSignature = block.getAttribute('data-time-signature');
    const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);
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

  timeCalculator.textContent = `Current Time: ${formatDuration(currentTime)} / Total Duration: ${formatDuration(totalSeconds)} | Song Beat: ${currentBeat} of ${totalBeats} | Block: ${blockBeat} of ${totalBeats} (Measure: ${blockMeasure} of ${totalMeasures})`;
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
    lastBeatTime = 0;
    playLeadIn(timings, totalSeconds, totalBeats);
  }
}

function playLeadIn(timings, totalSeconds, totalBeats) {
  const firstBlock = timings[0];
  const beatDuration = 60 / firstBlock.tempo;
  const leadInBeats = 4;

  currentBlockDisplay.style.backgroundColor = '#3b4048';
  currentBlockDisplay.innerHTML = `
    <span class="label">Lead-In</span>
    <span class="info">Beat: 0 of ${leadInBeats}</span>
  `;
  currentBlockDisplay.classList.add('pulse');
  currentBlockDisplay.style.animation = `pulse ${beatDuration}s infinite`;

  const timeManager = new TimeManager(firstBlock.tempo, 4, leadInBeats - 1, ({ elapsedTime, beat, isFirstBeat }) => {
    if (soundEnabled) {
      const sound = (isFirstBeat && beat === 0 ? tockSound : tickSound).cloneNode();
      sound.play();
      activeSounds.push(sound);
    }
    currentBlockDisplay.innerHTML = `
      <span class="label">Lead-In</span>
      <span class="info">Beat: ${beat + 1} of ${leadInBeats}</span>
    `;
    currentTime = elapsedTime;
    timeCalculator.textContent = `Current Time: ${formatDuration(currentTime)} / Total Duration: ${formatDuration(totalSeconds)} | Song Beat: ${currentBeat} of ${totalBeats} | Block: ${blockBeat} of 0 (Measure: ${blockMeasure} of 0)`;
  });

  timeManager.start();

  setTimeout(() => {
    timeManager.stop();
    currentBlockDisplay.classList.remove('pulse');
    currentTime = 0;
    playSong(timings, totalSeconds, totalBeats);
  }, leadInBeats * beatDuration * 1000);
}

function playSong(timings, totalSeconds, totalBeats) {
  let currentIndex = 0;
  blockBeat = 0;
  blockMeasure = 1;
  let blockStartTime = 0;

  updateCurrentBlock(timings[currentIndex]);

  const runBlock = () => {
    const currentTiming = timings[currentIndex];
    const beatsPerSecond = currentTiming.tempo / 60;
    const blockDuration = currentTiming.duration;
    const totalBlockBeats = currentTiming.totalBeats;

    const timeManager = new TimeManager(
      currentTiming.tempo,
      currentTiming.beatsPerMeasure,
      totalBlockBeats - 1,
      ({ elapsedTime, beat, measure, isFirstBeat }) => {
        blockBeat = beat;
        blockMeasure = measure;
        currentTime = blockStartTime + elapsedTime;
        currentBeat = Math.floor(currentTime * beatsPerSecond);

        if (soundEnabled && (beat === 0 || elapsedTime - (lastBeatTime - blockStartTime) >= 1 / beatsPerSecond)) {
          const sound = (isFirstBeat ? tockSound : tickSound).cloneNode();
          sound.play();
          activeSounds.push(sound);
          lastBeatTime = blockStartTime + elapsedTime;
        }

        const totalBlocks = timings.length;
        const blockNum = currentTiming.blockIndex + 1;
        const rootNote = currentTiming.block.getAttribute('data-root-note');
        const mode = currentTiming.block.getAttribute('data-mode');

        currentBlockDisplay.innerHTML = `
          <span class="label">${formatPart(currentTiming.block.classList[1])}: ${currentTiming.block.getAttribute('data-time-signature')} ${currentTiming.totalMeasures}m<br>${abbreviateKey(rootNote, mode)} ${mode} ${currentTiming.tempo}b ${currentTiming.block.getAttribute('data-feel')}</span>
          <span class="info">Beat: ${blockBeat} of ${currentTiming.totalBeats} | Measure: ${blockMeasure} of ${currentTiming.totalMeasures} | Block: ${blockNum} of ${totalBlocks}</span>
        `;

        timeCalculator.textContent = `Current Time: ${formatDuration(currentTime)} / Total Duration: ${formatDuration(totalSeconds)} | Song Beat: ${currentBeat} of ${totalBeats} | Block: ${blockBeat} of ${currentTiming.totalBeats} (Measure: ${blockMeasure} of ${currentTiming.totalMeasures})`;
      }
    );

    timeManager.start();

    setTimeout(() => {
      timeManager.stop();
      currentIndex++;
      if (currentIndex < timings.length) {
        blockStartTime += blockDuration;
        updateCurrentBlock(timings[currentIndex]);
        runBlock();
      } else {
        playBtn.textContent = 'Play';
        isPlaying = false;
        resetPlayback();
      }
    }, blockDuration * 1000);
  };

  runBlock();
}

function updateCurrentBlock(timing) {
  const previousBlock = timeline.querySelector('.playing');
  if (previousBlock) previousBlock.classList.remove('playing');
  timing.block.classList.add('playing');
  const beatDuration = 60 / timing.tempo;
  currentBlockDisplay.style.animation = `pulse ${beatDuration}s infinite`;
}

function resetPlayback() {
  currentTime = 0;
  currentBeat = 0;
  blockBeat = 0;
  blockMeasure = 0;
  lastBeatTime = 0;

  activeSounds.forEach(sound => {
    sound.pause();
    sound.currentTime = 0;
  });
  activeSounds = [];

  const previousBlock = timeline.querySelector('.playing');
  if (previousBlock) previousBlock.classList.remove('playing');
  currentBlockDisplay.classList.remove('pulse');
  currentBlockDisplay.style.animation = '';
  currentBlockDisplay.style.background = 'var(--form-bg)';
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

  const songData = {
    songName: currentSongName,
    blocks
  };

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
      throw new Error(`Block ${i + 1}: ${error}`);
    }
  }

  if (isPlaying) {
    isPlaying = false;
    playBtn.textContent = 'Play';
    resetPlayback();
  }

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
    block.innerHTML = `<span class="label">${formatPart(type)}: ${timeSignature} ${measures}m<br>${abbreviateKey(rootNote, mode)} ${mode} ${tempo}b ${feel || ''}${lyrics ? '<br>-<br>' + truncateLyrics(lyrics) : ''}</span><span class="tooltip">${lyrics || 'No lyrics'}</span>`;
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
  console.log(`Attempting to load: ${filename}`);
  try {
    if (filename === 'pneuma.js') {
      if (typeof loadPneuma === 'function') {
        console.log("Calling loadPneuma");
        loadPneuma();
      } else {
        fetch(filename)
          .then(response => {
            if (!response.ok) throw new Error('Failed to fetch Pneuma file');
            return response.text();
          })
          .then(text => {
            eval(text);
            console.log("Fetched and evaluated pneuma.js");
            loadPneuma();
          })
          .catch(error => {
            console.error(`Failed to load Pneuma: ${error.message}`);
            alert(`Failed to load song: ${error.message}`);
          });
      }
    } else if (filename === 'satisfaction.js') {
      if (typeof loadSatisfaction === 'function') {
        console.log("Calling loadSatisfaction");
        loadSatisfaction();
      } else {
        fetch(filename)
          .then(response => {
            if (!response.ok) throw new Error('Failed to fetch Satisfaction file');
            return response.text();
          })
          .then(text => {
            eval(text);
            console.log("Fetched and evaluated satisfaction.js");
            loadSatisfaction();
          })
          .catch(error => {
            console.error(`Failed to load Satisfaction: ${error.message}`);
            alert(`Failed to load song: ${error.message}`);
          });
      }
    } else if (filename === 'dirtyLaundry.js') {
      if (typeof loadDirtyLaundry === 'function') {
        console.log("Calling loadDirtyLaundry");
        loadDirtyLaundry();
      } else {
        fetch(filename)
          .then(response => {
            if (!response.ok) throw new Error('Failed to fetch Dirty Laundry file');
            return response.text();
          })
          .then(text => {
            eval(text);
            console.log("Fetched and evaluated dirtyLaundry.js");
            loadDirtyLaundry();
          })
          .catch(error => {
            console.error(`Failed to load Dirty Laundry: ${error.message}`);
            alert(`Failed to load song: ${error.message}`);
          });
      }
    } else if (filename === 'invincible.js') {
      if (typeof loadInvincible === 'function') {
        console.log("Calling loadInvincible");
        loadInvincible();
      } else {
        fetch(filename)
          .then(response => {
            if (!response.ok) throw new Error('Failed to fetch Invincible file');
            return response.text();
          })
          .then(text => {
            eval(text);
            console.log("Fetched and evaluated invincible.js");
            loadInvincible();
          })
          .catch(error => {
            console.error(`Failed to load Invincible: ${error.message}`);
            alert(`Failed to load song: ${error.message}`);
          });
      }
    } else if (filename === 'astroworld.js') {
      if (typeof loadAstroworld === 'function') {
        console.log("Calling loadAstroworld");
        loadAstroworld();
      } else {
        fetch(filename)
          .then(response => {
            if (!response.ok) throw new Error('Failed to fetch ASTROWORLD file');
            return response.text();
          })
          .then(text => {
            eval(text);
            console.log("Fetched and evaluated astroworld.js");
            loadAstroworld();
          })
          .catch(error => {
            console.error(`Failed to load ASTROWORLD: ${error.message}`);
            alert(`Failed to load song: ${error.message}`);
          });
      }
    } else if (filename === 'astrothunder.js') {
      if (typeof loadAstrothunder === 'function') {
        console.log("Calling loadAstrothunder");
        loadAstrothunder();
      } else {
        fetch(filename)
          .then(response => {
            if (!response.ok) throw new Error('Failed to fetch ASTROTHUNDER file');
            return response.text();
          })
          .then(text => {
            eval(text);
            console.log("Fetched and evaluated astrothunder.js");
            loadAstrothunder();
          })
          .catch(error => {
            console.error(`Failed to load ASTROTHUNDER: ${error.message}`);
            alert(`Failed to load song: ${error.message}`);
          });
      }
    } else if (filename === 'Echoes of Joy.json') {
      fetch(filename)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to fetch Echoes of Joy file: ${response.statusText}`);
          return response.text(); // Get text first to debug parsing issues
        })
        .then(text => {
          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            throw new Error(`Invalid JSON format in Echoes of Joy.json: ${e.message}`);
          }
          loadSongData(data);
          console.log(`Loaded JSON song: ${filename}`);
        })
        .catch(error => {
          console.error(`Failed to load Echoes of Joy: ${error.message}`);
          alert(`Failed to load song: ${error.message}`);
          // Fallback: Load a different song to avoid a blank timeline
          const fallbackSong = availableSongs.find(song => song !== 'Echoes of Joy.json');
          if (fallbackSong) {
            console.log(`Falling back to ${fallbackSong}`);
            loadSongFromDropdown(fallbackSong);
          }
        });
    } else {
      fetch(filename)
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch song file');
          return response.json();
        })
        .then(data => {
          loadSongData(data);
          console.log(`Loaded JSON song: ${filename}`);
        })
        .catch(error => {
          console.error(`Failed to load JSON song: ${error.message}`);
          alert(`Failed to load song: ${error.message}`);
        });
    }
    songDropdown.value = filename;
  } catch (error) {
    console.error(`Error in loadSongFromDropdown: ${error.message}`);
    alert(`Error loading song: ${error.message}`);
  }
}

function populateSongDropdown() {
  const availableSongs = [
    'Echoes of Joy.json',
    'pneuma.js',
    'satisfaction.js',
    'dirtyLaundry.js',
    'invincible.js',
    'astroworld.js',
    'astrothunder.js'
  ];
  availableSongs.forEach(song => {
    const option = document.createElement('option');
    option.value = song;
    option.textContent = song.replace('.json', '').replace('.js', '');
    songDropdown.appendChild(option);
  });
}

function printSong() {
  window.print();
}

// Initialize the dropdown and load a random song on page load
populateSongDropdown();

// Load a random song on page load
const availableSongs = [
  'Echoes of Joy.json',
  'pneuma.js',
  'satisfaction.js',
  'dirtyLaundry.js',
  'invincible.js',
  'astroworld.js',
  'astrothunder.js'
];
const randomSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];
loadSongFromDropdown(randomSong);
