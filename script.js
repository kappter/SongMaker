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
let activeSounds = []; // Track all playing audio instances

// Time Manager Class
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
  formContent.classList.toggle('collapsed', isFormCollapsed);
  toggleFormBtn.textContent = isFormCollapsed ? 'Show Parameters' : 'Hide Parameters';
}

function updateTitle(songName) {
  currentSongName = songName || 'SongMaker';
  document.title = `${currentSongName} - SongMaker`;
  printSongName.textContent = currentSongName;
  document.getElementById('song-name').value = currentSongName;
}

function formatPart(part) {
  return part.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function formatKey(rootNote, mode) {
  return `${rootNote} ${mode.split(' ')[0]}`; // e.g., "C Ionian", "A Aeolian"
}

function abbreviateKey(rootNote, mode) {
  const modeShort = mode === 'Aeolian' ? 'm' : mode === 'Ionian' ? '' : mode.charAt(0);
  return `${rootNote}${modeShort}`; // e.g., "C" (Ionian), "Am" (Aeolian), "DD" (Dorian)
}

function truncateLyrics(lyrics) {
  if (!lyrics) return '';
  const words = lyrics.split(' ');
  return words.length > 5 ? words.slice(0, 5).join(' ') + '...' : lyrics;
}

function updateBlockSize(block) {
  const measures = parseInt(block.getAttribute('data-measures'));
  const pixelsPerMeasure = 25;
  block.style.width = `${measures * pixelsPerMeasure}px`;
}

function getBeatsPerMeasure(timeSignature) {
  switch (timeSignature) {
    case '4/4': return 4;
    case '3/4': return 3;
    case '6/8': return 6;
    case '2/4': return 2;
    case '5/4': return 5;
    case '7/8': return 7;
    case '12/8': return 12;
    case '9/8': return 9;
    case '11/8': return 11;
    case '15/8': return 15;
    case '13/8': return 13;
    case '10/4': return 10;
    case '8/8': return 8;
    case '14/8': return 14;
    case '16/8': return 16;
    case '7/4': return 7;
    default: return 4;
  }
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(1);
  return `${minutes}:${remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds}`;
}

function calculateTimings() {
  const blocks = Array.from(timeline.querySelectorAll('.song-block'));
  let totalSeconds = 0;
  let totalBeats = 0;
  const timings = [];

  blocks.forEach((block, index) => {
    const measures = parseInt(block.getAttribute('data-measures'));
    const tempo = parseInt(block.getAttribute('data-tempo'));
    const timeSignature = block.getAttribute('data-time-signature');
    const beatsPerMeasure = getBeatsPerMeasure(timeSignature);
    const beats = measures * beatsPerMeasure;
    const seconds = (beats / tempo) * 60;

    timings.push({
      block,
      start: totalSeconds,
      duration: seconds,
      label: block.querySelector('.label').innerHTML,
      tempo,
      beatsPerMeasure,
      totalBeats: beats,
      totalMeasures: measures,
      blockIndex: index
    });
    totalSeconds += seconds;
    totalBeats += beats;
  });

  timeCalculator.textContent = `Current Time: ${formatDuration(currentTime)} / Total Duration: ${formatDuration(totalSeconds)} | Song Beat: ${currentBeat} of ${totalBeats} | Block: ${blockBeat} of 0 (Measure: ${blockMeasure} of 0)`;
  return { timings, totalSeconds, totalBeats };
}

function loadBlockIntoForm(block) {
  document.getElementById('part-type').value = block.classList[1];
  document.getElementById('measures').value = block.getAttribute('data-measures');
  document.getElementById('root-note').value = block.getAttribute('data-root-note') || 'C';
  document.getElementById('mode').value = block.getAttribute('data-mode') || 'Ionian';
  document.getElementById('tempo').value = block.getAttribute('data-tempo');
  document.getElementById('time-signature').value = block.getAttribute('data-time-signature');
  document.getElementById('feel').value = block.getAttribute('data-feel');
  document.getElementById('lyrics').value = block.getAttribute('data-lyrics') || '';
}

function clearSelection() {
  if (selectedBlock) {
    selectedBlock.classList.remove('selected');
    selectedBlock = null;
  }
  document.getElementById('part-type').value = 'intro';
  document.getElementById('measures').value = '4';
  document.getElementById('root-note').value = 'C';
  document.getElementById('mode').value = 'Ionian';
  document.getElementById('tempo').value = '120';
  document.getElementById('time-signature').value = '4/4';
  document.getElementById('feel').value = 'Happiness';
  document.getElementById('lyrics').value = '';
}

function setupBlock(block) {
  block.draggable = true;

  block.addEventListener('dragstart', (e) => {
    draggedBlock = block;
    setTimeout(() => block.style.opacity = '0.5', 0);
    e.dataTransfer.setData('text/plain', '');
  });

  block.addEventListener('dragend', () => {
    draggedBlock.style.opacity = '1';
    draggedBlock = null;
    calculateTimings();
  });

  block.addEventListener('dragover', (e) => e.preventDefault());

  block.addEventListener('dragenter', () => {
    if (block !== draggedBlock) {
      block.style.border = '2px dashed var(--accent-color)';
    }
  });

  block.addEventListener('dragleave', () => {
    block.style.border = 'none';
  });

  block.addEventListener('drop', (e) => {
    e.preventDefault();
    block.style.border = 'none';
    if (draggedBlock && draggedBlock !== block) {
      const allBlocks = [...timeline.querySelectorAll('.song-block')];
      const draggedIndex = allBlocks.indexOf(draggedBlock);
      const dropIndex = allBlocks.indexOf(block);
      if (draggedIndex < dropIndex) {
        block.after(draggedBlock);
      } else {
        block.before(draggedBlock);
      }
    }
    calculateTimings();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.classList.add('delete-btn');
  deleteBtn.textContent = 'X';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    block.remove();
    if (block === selectedBlock) clearSelection();
    calculateTimings();
  });
  block.appendChild(deleteBtn);

  block.addEventListener('click', () => {
    if (selectedBlock) selectedBlock.classList.remove('selected');
    selectedBlock = block;
    block.classList.add('selected');
    loadBlockIntoForm(block);
  });
}

function addBlock() {
  const partType = document.getElementById('part-type').value;
  const measures = document.getElementById('measures').value;
  const rootNote = document.getElementById('root-note').value;
  const mode = document.getElementById('mode').value;
  const tempo = document.getElementById('tempo').value;
  const timeSignature = document.getElementById('time-signature').value;
  const feel = document.getElementById('feel').value;
  const lyrics = document.getElementById('lyrics').value;

  if (!measures || measures < 1 || !tempo || tempo < 1) {
    alert('Please enter valid measures and tempo.');
    return;
  }

  const block = document.createElement('div');
  block.classList.add('song-block', partType);
  block.setAttribute('data-measures', measures);
  block.setAttribute('data-tempo', tempo);
  block.setAttribute('data-time-signature', timeSignature);
  block.setAttribute('data-feel', feel);
  block.setAttribute('data-lyrics', lyrics);
  block.setAttribute('data-root-note', rootNote);
  block.setAttribute('data-mode', mode);

  const label = document.createElement('span');
  label.classList.add('label');
  label.innerHTML = `${formatPart(partType)}: ${timeSignature} ${measures}m<br>${abbreviateKey(rootNote, mode)} ${mode} ${tempo}b ${feel}${lyrics ? '<br>-<br>' + truncateLyrics(lyrics) : ''}`;
  block.appendChild(label);

  const tooltip = document.createElement('span');
  tooltip.classList.add('tooltip');
  tooltip.textContent = lyrics || 'No lyrics';
  block.appendChild(tooltip);

  updateBlockSize(block);
  setupBlock(block);
  timeline.appendChild(block);

  calculateTimings();
  document.getElementById('lyrics').value = '';
}

function updateBlock() {
  if (!selectedBlock) {
    alert('Please select a block to update.');
    return;
  }

  const partType = document.getElementById('part-type').value;
  const measures = document.getElementById('measures').value;
  const rootNote = document.getElementById('root-note').value;
  const mode = document.getElementById('mode').value;
  const tempo = document.getElementById('tempo').value;
  const timeSignature = document.getElementById('time-signature').value;
  const feel = document.getElementById('feel').value;
  const lyrics = document.getElementById('lyrics').value;

  if (!measures || measures < 1 || !tempo || tempo < 1) {
    alert('Please enter valid measures and tempo.');
    return;
  }

  selectedBlock.className = `song-block ${partType}`;
  selectedBlock.setAttribute('data-measures', measures);
  selectedBlock.setAttribute('data-tempo', tempo);
  selectedBlock.setAttribute('data-time-signature', timeSignature);
  selectedBlock.setAttribute('data-feel', feel);
  selectedBlock.setAttribute('data-lyrics', lyrics);
  selectedBlock.setAttribute('data-root-note', rootNote);
  selectedBlock.setAttribute('data-mode', mode);
  selectedBlock.querySelector('.label').innerHTML = `${formatPart(partType)}: ${timeSignature} ${measures}m<br>${abbreviateKey(rootNote, mode)} ${mode} ${tempo}b ${feel}${lyrics ? '<br>-<br>' + truncateLyrics(lyrics) : ''}`;
  selectedBlock.querySelector('.tooltip').textContent = lyrics || 'No lyrics';
  updateBlockSize(selectedBlock);
  clearSelection();
  calculateTimings();
}

function printSong() {
  window.print();
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
      activeSounds.push(sound); // Track the sound
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
          activeSounds.push(sound); // Track the sound
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
  currentBlockDisplay.classList.remove('pulse');

  const totalBlocks = Array.from(timeline.querySelectorAll('.song-block')).length;
  const blockNum = timing.blockIndex + 1;
  const rootNote = timing.block.getAttribute('data-root-note');
  const mode = timing.block.getAttribute('data-mode');

  currentBlockDisplay.innerHTML = `
    <span class="label">${formatPart(timing.block.classList[1])}: ${timing.block.getAttribute('data-time-signature')} ${timing.totalMeasures}m<br>${abbreviateKey(rootNote, mode)} ${mode} ${timing.tempo}b ${timing.block.getAttribute('data-feel')}</span>
    <span class="info">Beat: ${blockBeat} of ${timing.totalBeats} | Measure: ${blockMeasure} of ${timing.totalMeasures} | Block: ${blockNum} of ${totalBlocks}</span>
  `;

  timing.block.classList.add('playing');
  const blockStyle = window.getComputedStyle(timing.block);
  const bgGradient = blockStyle.backgroundImage || blockStyle.background;
  currentBlockDisplay.style.background = bgGradient;

  const beatDuration = 60 / timing.tempo;
  currentBlockDisplay.style.animation = `pulse ${beatDuration}s infinite`;
  currentBlockDisplay.classList.add('pulse');
}

function resetPlayback() {
  currentTime = 0;
  currentBeat = 0;
  blockBeat = 0;
  blockMeasure = 0;
  lastBeatTime = 0;

  // Stop all active sounds
  activeSounds.forEach(sound => {
    sound.pause();
    sound.currentTime = 0; // Reset to start for reuse
  });
  activeSounds = []; // Clear the array

  const previousBlock = timeline.querySelector('.playing');
  if (previousBlock) previousBlock.classList.remove('playing');
  currentBlockDisplay.classList.remove('pulse');
  currentBlockDisplay.style.animation = '';
  currentBlockDisplay.style.background = 'var(--form-bg)';
  currentBlockDisplay.innerHTML = '<span class="label">No block playing</span>';
  calculateTimings();
}

// ... (Previous code remains unchanged up to exportSong) ...

function exportSong() {
  const blocks = Array.from(timeline.querySelectorAll('.song-block')).map(block => ({
    type: block.classList[1],
    measures: block.getAttribute('data-measures'),
    rootNote: block.getAttribute('data-root-note'),
    mode: block.getAttribute('data-mode'),
    tempo: block.getAttribute('data-tempo'),
    timeSignature: block.getAttribute('data-time-signature'),
    feel: block.getAttribute('data-feel'),
    lyrics: block.getAttribute('data-lyrics')
  }));
  const songData = {
    songName: currentSongName,
    blocks: blocks
  };
  const json = JSON.stringify(songData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentSongName || 'Untitled'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function validateBlock(block) {
  const requiredFields = ['type', 'measures', 'rootNote', 'mode', 'tempo', 'timeSignature'];
  for (const field of requiredFields) {
    if (!block[field] || block[field] === '') {
      return `Missing or empty required field: ${field}`;
    }
  }
  const measures = parseInt(block.measures);
  const tempo = parseInt(block.tempo);
  if (isNaN(measures) || measures <= 0) {
    return 'Measures must be a positive number';
  }
  if (isNaN(tempo) || tempo <= 0) {
    return 'Tempo must be a positive number';
  }
  if (!validTimeSignatures.includes(block.timeSignature)) {
    return `Invalid time signature: ${block.timeSignature}. Must be one of ${validTimeSignatures.join(', ')}`;
  }
  return null;
}

function importSong(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.name.endsWith('.json')) {
    loadSongFile(file);
  } else if (file.name.endsWith('.js')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Execute the JS content to define the song variable
        eval(e.target.result);
        if (typeof pneumaSong !== 'undefined') {
          loadSongData(pneumaSong);
        } else {
          alert('Failed to load song: No valid song data found in .js file.');
        }
      } catch (error) {
        alert(`Failed to load song: ${error.message}`);
      }
    };
    reader.readAsText(file);
  } else {
    alert('Please select a valid .json or .js file.');
  }
}

function loadSongFromDropdown(filename) {
  if (!filename) return;
  console.log(`Attempting to load: ${filename}`); // Debug
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
        .catch(error => alert(`Failed to load song: ${error.message}`));
    }
  } else if (filename === 'satisfaction.js') {
    if (typeof loadSatisfaction === 'function') {
      console.log("Calling loadSatisfaction");
      loadSatisfaction();
    } else {
      fetch(filename)
        .then(response => response.text())
        .then(text => {
          eval(text);
          console.log("Fetched and evaluated satisfaction.js");
          loadSatisfaction();
        })
        .catch(error => alert(`Failed to load song: ${error.message}`));
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
        .catch(error => alert(`Failed to load song: ${error.message}`));
    }
  } else {
    fetch(filename)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch song file');
        return response.json();
      })
      .then(data => loadSongData(data))
      .catch(error => alert(`Failed to load song: ${error.message}`));
  }
}

function loadSongFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const songData = JSON.parse(e.target.result);
      loadSongData(songData);
    } catch (error) {
      alert(`Failed to load song: ${error.message}`);
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

  calculateTimings();
}

function populateSongDropdown() {
  const availableSongs = [
    'pneuma.js',
    'Echoes of Joy.json',
    'satisfaction.js',
    'dirtyLaundry.js'
  ];
  availableSongs.forEach(song => {
    const option = document.createElement('option');
    option.value = song;
    option.textContent = song.replace('.json', '').replace('.js', '');
    songDropdown.appendChild(option);
  });
}

// ... (Remaining code unchanged: initialBlocks, setup, etc.) ...

const initialBlocks = [
  { type: 'intro', measures: 4, rootNote: 'C', mode: 'Ionian', tempo: 120, timeSignature: '4/4', feel: 'Happiness', lyrics: 'Here we go now' },
  { type: 'verse', measures: 8, rootNote: 'C', mode: 'Ionian', tempo: 120, timeSignature: '3/4', feel: 'Calmness', lyrics: 'The wind blows soft and low' },
  { type: 'chorus', measures: 8, rootNote: 'D', mode: 'Mixolydian', tempo: 120, timeSignature: '6/8', feel: 'Euphoria', lyrics: 'Rise up, feel the beat' },
  { type: 'bridge', measures: 4, rootNote: 'G', mode: 'Aeolian', tempo: 100, timeSignature: '7/8', feel: 'Tension', lyrics: 'Hold your breath' },
  { type: 'solo', measures: 16, rootNote: 'G', mode: 'Aeolian', tempo: 100, timeSignature: '4/4', feel: 'Triumph', lyrics: '' },
  { type: 'outro', measures: 8, rootNote: 'C', mode: 'Ionian', tempo: 120, timeSignature: '4/4', feel: 'Bliss', lyrics: 'Fade into the light' }
];

initialBlocks.forEach(({ type, measures, rootNote, mode, tempo, timeSignature, feel, lyrics }) => {
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
});

updateTitle(currentSongName);
calculateTimings();
document.body.setAttribute('data-theme', 'dark');
populateSongDropdown();
