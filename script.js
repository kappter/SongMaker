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
const songmakerTitle = document.getElementById('songmaker-title');
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

const partTypes = ['intro', 'verse', 'chorus', 'bridge', 'outro', 'interlude', 'pre-chorus', 'solo'];
const rootNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const modes = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'];
const feels = ['Happiness', 'Sadness', 'Tension', 'Euphoria', 'Calmness', 'Anger', 'Mystical', 'Rebellion', 'Triumph', 'Bliss', 'Frustration', 'Atmospheric', 'Trippy', 'Awakening', 'Intense', 'Climactic'];
const sampleLyrics = [
  "Lost in the night, searching for light",
  "Dreams take flight, under the sky",
  "Echoes call me, through the storm",
  "Time moves slow, in shadows deep",
  "Rise above, feel the beat",
  "Whispers fade, into the void",
  "",
];

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

function updateTitle(newTitle) {
  currentSongName = newTitle || 'Untitled';
  document.getElementById('song-name').value = currentSongName;
  printSongName.textContent = currentSongName;
  songmakerTitle.textContent = `${currentSongName} - SongMaker`;
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

function updateCurrentBlock(timing) {
  const previousBlock = timeline.querySelector('.playing');
  if (previousBlock) previousBlock.classList.remove('playing');
  timing.block.classList.add('playing');
  currentBlockDisplay.style.backgroundColor = '#3b4048';
  currentBlockDisplay.classList.add('pulse');
  currentBlockDisplay.style.animation = `pulse ${60 / timing.tempo}s infinite`;
}

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
  const songData = { songName: currentSongName, blocks };
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
  if (isNaN(measures) || measures <= 0) return 'Measures must be a positive number';
  if (isNaN(tempo) || tempo <= 0) return 'Tempo must be a positive number';
  if (!validTimeSignatures.includes(block.timeSignature)) return `Invalid time signature: ${block.timeSignature}`;
  return null;
}

function importSong(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.name.endsWith('.json')) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const songData = JSON.parse(e.target.result);
        loadSongData(songData);
      } catch (error) {
        alert(`Failed to load song: ${error.message}`);
      }
    };
    reader.readAsText(file);
  } else {
    alert('Please select a valid .json file.');
  }
}

function loadSongFromDropdown(filename) {
  if (!filename) {
    console.log("No song selected.");
    return;
  }
  console.log(`Loading song: ${filename}`);

  const loadFunctions = {
    'pneuma.js': loadPneuma,
    'satisfaction.js': loadSatisfaction,
    'dirtyLaundry.js': loadDirtyLaundry,
    'invincible.js': loadInvincible,
    'astroworld.js': loadAstroworld,
    'astrothunder.js': loadAstrothunder
  };

  if (filename in loadFunctions) {
    if (typeof loadFunctions[filename] === 'function') {
      console.log(`Executing ${filename.replace('.js', '')} load function`);
      loadFunctions[filename]();
    } else {
      console.log(`Fetching ${filename}...`);
      fetch(filename)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.text();
        })
        .then(text => {
          eval(text);
          console.log(`${filename} evaluated`);
          if (typeof loadFunctions[filename] === 'function') {
            loadFunctions[filename]();
          } else {
            alert(`Failed to load ${filename}: Load function not defined`);
          }
        })
        .catch(error => alert(`Failed to load ${filename}: ${error.message}`));
    }
  } else if (filename === 'Echoes of Joy.json') {
    fetch(filename)
      .then(response => response.json())
      .then(data => loadSongData(data))
      .catch(error => alert(`Failed to load ${filename}: ${error.message}`));
  } else {
    alert(`Unsupported file: ${filename}`);
  }
}

function loadSongData(songData) {
  if (!songData.songName || !Array.isArray(songData.blocks)) {
    throw new Error('Invalid song file format.');
  }

  for (let i = 0; i < songData.blocks.length; i++) {
    const error = validateBlock(songData.blocks[i]);
    if (error) throw new Error(`Block ${i + 1}: ${error}`);
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
  console.log(`Song loaded: ${songData.songName}`);
}

function addBlock() {
  const block = {
    type: document.getElementById('part-type').value,
    measures: document.getElementById('measures').value,
    rootNote: document.getElementById('root-note').value,
    mode: document.getElementById('mode').value,
    tempo: document.getElementById('tempo').value,
    timeSignature: document.getElementById('time-signature').value,
    feel: document.getElementById('feel').value,
    lyrics: document.getElementById('lyrics').value
  };

  const error = validateBlock(block);
  if (error) {
    alert(`Cannot add block: ${error}`);
    return;
  }

  const div = document.createElement('div');
  div.classList.add('song-block', block.type);
  div.setAttribute('data-measures', block.measures);
  div.setAttribute('data-tempo', block.tempo);
  div.setAttribute('data-time-signature', block.timeSignature);
  div.setAttribute('data-feel', block.feel);
  div.setAttribute('data-lyrics', block.lyrics);
  div.setAttribute('data-root-note', block.rootNote);
  div.setAttribute('data-mode', block.mode);
  div.innerHTML = `<span class="label">${formatPart(block.type)}: ${block.timeSignature} ${block.measures}m<br>${abbreviateKey(block.rootNote, block.mode)} ${block.mode} ${block.tempo}b ${block.feel}${block.lyrics ? '<br>-<br>' + truncateLyrics(block.lyrics) : ''}</span><span class="tooltip">${block.lyrics || 'No lyrics'}</span>`;
  updateBlockSize(div);
  setupBlock(div);
  timeline.appendChild(div);
  calculateTimings();
}

function updateBlock() {
  if (!selectedBlock) {
    alert('No block selected to update.');
    return;
  }

  const block = {
    type: document.getElementById('part-type').value,
    measures: document.getElementById('measures').value,
    rootNote: document.getElementById('root-note').value,
    mode: document.getElementById('mode').value,
    tempo: document.getElementById('tempo').value,
    timeSignature: document.getElementById('time-signature').value,
    feel: document.getElementById('feel').value,
    lyrics: document.getElementById('lyrics').value
  };

  const error = validateBlock(block);
  if (error) {
    alert(`Cannot update block: ${error}`);
    return;
  }

  selectedBlock.className = `song-block ${block.type}`;
  selectedBlock.setAttribute('data-measures', block.measures);
  selectedBlock.setAttribute('data-tempo', block.tempo);
  selectedBlock.setAttribute('data-time-signature', block.timeSignature);
  selectedBlock.setAttribute('data-feel', block.feel);
  selectedBlock.setAttribute('data-lyrics', block.lyrics);
  selectedBlock.setAttribute('data-root-note', block.rootNote);
  selectedBlock.setAttribute('data-mode', block.mode);
  selectedBlock.innerHTML = `<span class="label">${formatPart(block.type)}: ${block.timeSignature} ${block.measures}m<br>${abbreviateKey(block.rootNote, block.mode)} ${block.mode} ${block.tempo}b ${block.feel}${block.lyrics ? '<br>-<br>' + truncateLyrics(block.lyrics) : ''}</span><span class="tooltip">${block.lyrics || 'No lyrics'}</span>`;
  updateBlockSize(selectedBlock);
  calculateTimings();
}

function clearSelection() {
  if (selectedBlock) {
    selectedBlock.classList.remove('selected');
    selectedBlock = null;
  }
}

function randomizeSong() {
  const blockCount = Math.floor(Math.random() * 4) + 3; // 3-6 blocks
  const songStructure = ['intro'];
  for (let i = 1; i < blockCount - 1; i++) {
    const middleParts = ['verse', 'chorus', 'bridge', 'interlude', 'pre-chorus', 'solo'];
    songStructure.push(middleParts[Math.floor(Math.random() * middleParts.length)]);
  }
  songStructure.push('outro');

  const rootNote = rootNotes[Math.floor(Math.random() * rootNotes.length)];
  const mode = modes[Math.floor(Math.random() * modes.length)];
  const tempo = Math.floor(Math.random() * (160 - 60 + 1)) + 60;
  const timeSignature = validTimeSignatures[Math.floor(Math.random() * validTimeSignatures.length)];

  const randomSong = {
    songName: `Random Song ${Math.floor(Math.random() * 1000)}`,
    blocks: songStructure.map(type => ({
      type,
      measures: Math.floor(Math.random() * 12) + 4,
      rootNote,
      mode,
      tempo,
      timeSignature,
      feel: feels[Math.floor(Math.random() * feels.length)],
      lyrics: sampleLyrics[Math.floor(Math.random() * sampleLyrics.length)]
    }))
  };

  loadSongData(randomSong);
}

function populateSongDropdown() {
  const availableSongs = [
    'pneuma.js',
    'Echoes of Joy.json',
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
  console.log("Dropdown populated.");
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function formatPart(type) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function abbreviateKey(rootNote, mode) {
  const isSharpFlat = ['C#', 'D#', 'F#', 'G#', 'A#'].includes(rootNote);
  return `${rootNote}${isSharpFlat ? '' : ' '}${mode.charAt(0)}`;
}

function truncateLyrics(lyrics) {
  return lyrics.length > 30 ? lyrics.substring(0, 27) + '...' : lyrics;
}

function calculateTimings() {
  const blocks = Array.from(timeline.querySelectorAll('.song-block'));
  let totalSeconds = 0;
  let totalBeats = 0;
  const timings = blocks.map((block, index) => {
    const measures = parseInt(block.getAttribute('data-measures'));
    const tempo = parseInt(block.getAttribute('data-tempo'));
    const timeSignature = block.getAttribute('data-time-signature');
    const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);
    const totalBlockBeats = measures * beatsPerMeasure;
    const duration = (totalBlockBeats * 60) / tempo;

    totalSeconds += duration;
    totalBeats += totalBlockBeats;

    return {
      block,
      duration,
      totalBeats: totalBlockBeats,
      totalMeasures: measures,
      tempo,
      beatsPerMeasure,
      blockIndex: index
    };
  });

  timeCalculator.textContent = `Current Time: ${formatDuration(currentTime)} / Total Duration: ${formatDuration(totalSeconds)} | Song Beat: ${currentBeat} of ${totalBeats} | Block: ${blockBeat} of ${timings[0]?.totalBeats || 0} (Measure: ${blockMeasure} of ${timings[0]?.totalMeasures || 0})`;
  return { timings, totalSeconds, totalBeats };
}

function updateBlockSize(block) {
  const measures = parseInt(block.getAttribute('data-measures'));
  const baseWidth = window.innerWidth <= 768 ? 100 : measures * 20; // Fixed 100px on tablet/mobile
  block.style.width = `${baseWidth}px`;
}

function setupBlock(block) {
  block.draggable = true;
  block.addEventListener('dragstart', () => draggedBlock = block);
  block.addEventListener('dragend', () => draggedBlock = null);
  block.addEventListener('dragover', e => e.preventDefault());
  block.addEventListener('drop', e => {
    e.preventDefault();
    if (draggedBlock && draggedBlock !== block) {
      const allBlocks = Array.from(timeline.querySelectorAll('.song-block'));
      const fromIndex = allBlocks.indexOf(draggedBlock);
      const toIndex = allBlocks.indexOf(block);
      if (fromIndex < toIndex) block.after(draggedBlock);
      else block.before(draggedBlock);
      calculateTimings();
    }
  });
  // Add touch support
  block.addEventListener('touchstart', e => draggedBlock = block);
  block.addEventListener('touchmove', e => e.preventDefault());
  block.addEventListener('touchend', e => {
    const touch = e.changedTouches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY).closest('.song-block');
    if (draggedBlock && target && draggedBlock !== target) {
      const allBlocks = Array.from(timeline.querySelectorAll('.song-block'));
      const fromIndex = allBlocks.indexOf(draggedBlock);
      const toIndex = allBlocks.indexOf(target);
      if (fromIndex < toIndex) target.after(draggedBlock);
      else target.before(draggedBlock);
      calculateTimings();
    }
    draggedBlock = null;
  });
  block.addEventListener('click', () => {
    if (selectedBlock) selectedBlock.classList.remove('selected');
    selectedBlock = block;
    selectedBlock.classList.add('selected');
    document.getElementById('part-type').value = block.classList[1];
    document.getElementById('measures').value = block.getAttribute('data-measures');
    document.getElementById('root-note').value = block.getAttribute('data-root-note');
    document.getElementById('mode').value = block.getAttribute('data-mode');
    document.getElementById('tempo').value = block.getAttribute('data-tempo');
    document.getElementById('time-signature').value = block.getAttribute('data-time-signature');
    document.getElementById('feel').value = block.getAttribute('data-feel');
    document.getElementById('lyrics').value = block.getAttribute('data-lyrics');
  });
}

function printSong() {
  window.print();
}

function initialBlocks() {
  const echoesOfJoy = {
    songName: "Echoes of Joy",
    blocks: [
      { type: "intro", measures: "4", rootNote: "C", mode: "Ionian", tempo: "120", timeSignature: "4/4", feel: "Happiness", lyrics: "Echoes in the air" },
      { type: "verse", measures: "8", rootNote: "C", mode: "Ionian", tempo: "120", timeSignature: "4/4", feel: "Calmness", lyrics: "Whispers of the past" },
      { type: "chorus", measures: "8", rootNote: "G", mode: "Mixolydian", tempo: "120", timeSignature: "4/4", feel: "Euphoria", lyrics: "Joyful echoes rise" },
      { type: "outro", measures: "4", rootNote: "C", mode: "Ionian", tempo: "120", timeSignature: "4/4", feel: "Bliss", lyrics: "Fading into light" }
    ]
  };
  loadSongData(echoesOfJoy);
}

initialBlocks();
populateSongDropdown();
isDarkMode = true;
toggleTheme(); // Ensure dark mode is applied
