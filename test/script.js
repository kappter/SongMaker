const timeline = document.getElementById('timeline');
let selectedBlock = null;
let isPlaying = false;
let currentBeat = 0;
let totalBeats = 0;
let currentBlockIndex = 0;
const validTimeSignatures = ['4/4', '3/4', '2/4', '6/8', '5/4', '7/8'];
let currentSong = null; // Store the current song data

function formatPart(part) {
  return part.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function abbreviateKey(key) {
  return key.replace('b', '♭').replace('#', '♯');
}

function truncateLyrics(lyrics) {
  const words = lyrics.split(/\s+/);
  return words.length > 10 ? words.slice(0, 10).join(' ') + '...' : lyrics;
}

function updateBlockSize(block) {
  const measures = parseInt(block.getAttribute('data-measures'), 10);
  const baseWidth = 100;
  const width = baseWidth + (measures * 10);
  block.style.width = `${width}px`;
}

function validateBlock(block) {
  if (!block.type || typeof block.type !== 'string') return 'Invalid block type';
  if (!Number.isInteger(block.measures) || block.measures <= 0) return 'Invalid measures';
  if (!validTimeSignatures.includes(block.timeSignature)) return 'Invalid time signature';
  if (!block.rootNote || typeof block.rootNote !== 'string') return 'Invalid root note';
  if (!block.mode || typeof block.mode !== 'string') return 'Invalid mode';
  if (!Number.isInteger(block.tempo) || block.tempo <= 0) return 'Invalid tempo';
  if (!block.feel || typeof block.feel !== 'string') return 'Invalid feel';
  if (block.chords && (!Array.isArray(block.chords) || !block.chords.every(chord => typeof chord === 'string'))) return 'Invalid chords';
  return null;
}

function clearSelection() {
  if (selectedBlock) {
    selectedBlock.classList.remove('selected');
    selectedBlock = null;
  }
}

function setupBlock(block) {
  block.addEventListener('click', () => {
    clearSelection();
    block.classList.add('selected');
    selectedBlock = block;
    calculateTimings();
  });

  const deleteBtn = document.createElement('span');
  deleteBtn.classList.add('delete-btn');
  deleteBtn.textContent = '×';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    block.remove();
    clearSelection();
    calculateTimings();
  });
  block.appendChild(deleteBtn);
}

function calculateTimings() {
  const blocks = Array.from(timeline.children);
  if (blocks.length === 0) {
    document.getElementById('time-calculator').textContent = 'No blocks to calculate.';
    totalBeats = 0;
    currentBeat = 0;
    currentBlockIndex = 0;
    return;
  }

  let totalMeasures = 0;
  let totalDuration = 0;
  totalBeats = 0;

  const blockData = blocks.map((block, index) => {
    const measures = parseInt(block.getAttribute('data-measures'), 10);
    const tempo = parseInt(block.getAttribute('data-tempo'), 10);
    const timeSignature = block.getAttribute('data-time-signature');
    const [beatsPerMeasure] = timeSignature.split('/').map(Number);
    const beats = measures * beatsPerMeasure;
    const duration = (beats / tempo) * 60;
    totalMeasures += measures;
    totalDuration += duration;
    totalBeats += beats;

    return { measures, beats, duration, index };
  });

  const totalDurationMinutes = Math.floor(totalDuration / 60);
  const totalDurationSeconds = Math.round(totalDuration % 60);
  const currentTime = currentBeat > 0 ? (currentBeat / blocks[currentBlockIndex].getAttribute('data-tempo')) * 60 : 0;
  const currentTimeMinutes = Math.floor(currentTime / 60);
  const currentTimeSeconds = Math.round(currentTime % 60);

  let currentBlockMeasures = 0;
  let currentMeasureInBlock = 0;
  let blockIndex = 0;

  for (let i = 0; i < blockData.length; i++) {
    const { beats } = blockData[i];
    if (currentBeat < (blockData[i].index === 0 ? beats : blockData.slice(0, i + 1).reduce((sum, b) => sum + b.beats, 0))) {
      blockIndex = i;
      const previousBeats = i === 0 ? 0 : blockData.slice(0, i).reduce((sum, b) => sum + b.beats, 0);
      const beatsInBlock = currentBeat - previousBeats;
      const beatsPerMeasure = parseInt(blocks[i].getAttribute('data-time-signature').split('/')[0], 10);
      currentBlockMeasures = parseInt(blocks[i].getAttribute('data-measures'), 10);
      currentMeasureInBlock = Math.floor(beatsInBlock / beatsPerMeasure);
      break;
    }
  }

  currentBlockIndex = blockIndex;
  const currentBlockDisplay = document.getElementById('current-block-display');
  if (currentBlockDisplay) {
    currentBlockDisplay.textContent = `Block ${blockIndex + 1} of ${blocks.length}`;
  }

  document.getElementById('time-calculator').textContent = `Current Time: ${currentTimeMinutes}:${currentTimeSeconds.toString().padStart(2, '0')} / Total Duration: ${totalDurationMinutes}:${totalDurationSeconds.toString().padStart(2, '0')} | Song Beat: ${currentBeat} of ${totalBeats} | Block: ${blockIndex + 1} of ${blocks.length} (Measure: ${currentMeasureInBlock + 1} of ${currentBlockMeasures})`;
}

async function populateSongDropdown() {
  const dropdown = document.getElementById('song-dropdown');
  if (!dropdown) {
    console.error('Song dropdown element not found in the DOM');
    return false;
  }

  let songs = [];
  try {
    const response = await fetch('songs.json');
    if (!response.ok) throw new Error(`Failed to load songs.json: ${response.status} ${response.statusText}`);
    const data = await response.json();
    songs = data.songs || [];
    if (songs.length === 0) {
      console.warn('No songs found in songs.json');
    }
  } catch (error) {
    console.error('Error loading songs for dropdown:', error);
    songs = [];
  }

  const processedSongs = songs.map(song => {
    if (song.file && typeof window[song.file.replace('.js', '')] !== 'undefined') {
      const songData = window[song.file.replace('.js', '')];
      return { ...song, ...songData, blocks: songData.blocks || song.blocks };
    }
    return song;
  });

  dropdown.innerHTML = '';
  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = 'Select a song...';
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  dropdown.appendChild(placeholderOption);

  processedSongs.forEach(song => {
    const option = document.createElement('option');
    option.value = song.title;
    option.textContent = song.title;
    dropdown.appendChild(option);
  });

  const defaultSongTitle = "(I Can’t Get No) Satisfaction";
  const defaultOption = Array.from(dropdown.options).find(option => option.value === defaultSongTitle);
  if (defaultOption) {
    defaultOption.selected = true;
  } else {
    console.warn(`Default song "${defaultSongTitle}" not found in dropdown options`);
  }

  return processedSongs;
}

function generateRandomTitle() {
  const adjectives = ['Cosmic', 'Eternal', 'Mystic', 'Neon', 'Silent', 'Echoing', 'Fading', 'Radiant', 'Frozen', 'Blazing'];
  const nouns = ['Fire', 'Dream', 'Storm', 'Voyage', 'Echo', 'Pulse', 'Horizon', 'Abyss', 'Light', 'Shadow'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

function generateRandomGenre() {
  const genres = ['Progressive', 'Atmospheric', 'Cinematic', 'Electronic', 'Ambient', 'Psychedelic', 'Indie', 'Synthwave', 'Rock', 'Jazz'];
  const genre1 = genres[Math.floor(Math.random() * genres.length)];
  let genre2 = genres[Math.floor(Math.random() * genres.length)];
  while (genre2 === genre1) {
    genre2 = genres[Math.floor(Math.random() * genres.length)];
  }
  return `${genre1.toLowerCase()}, ${genre2.toLowerCase()}`;
}

function getMoodForFeel(feel) {
  const moodMap = {
    'Happiness': 'joyful and uplifting',
    'Sadness': 'melancholy and reflective',
    'Tension': 'tense and suspenseful',
    'Euphoria': 'euphoric and soaring',
    'Calmness': 'calm and serene',
    'Anger': 'angry and intense',
    'Mystical': 'mysterious and enchanting',
    'Rebellion': 'rebellious and defiant',
    'Triumph': 'triumphant and victorious',
    'Bliss': 'blissful and dreamy',
    'Frustration': 'frustrated and gritty',
    'Atmospheric': 'spacey and atmospheric',
    'Trippy': 'trippy and psychedelic',
    'Awakening': 'awakening and inspiring',
    'Intense': 'intense and powerful',
    'Climactic': 'climactic and dramatic',
    'Dreamy': 'dreamy and ethereal'
  };
  return moodMap[feel] || 'dynamic';
}

function getInstrumentsForBlock(type, feel) {
  const instrumentOptions = {
    intro: ['layered synths', 'ambient pads', 'soft piano'],
    verse: ['expressive synths', 'subtle guitar riffs', 'driving bass'],
    chorus: ['bright synths', 'punchy drums', 'layered vocals'],
    bridge: ['reverb-heavy textures', 'dreamy pads', 'electric guitar'],
    interlude: ['cinematic strings', 'ethereal synths', 'percussive elements'],
    outro: ['soft piano', 'fading synths', 'strings'],
    default: ['synths', 'guitar riffs', 'cinematic textures']
  };
  const instruments = instrumentOptions[type] || instrumentOptions.default;
  return instruments.join(', ');
}

function generateVocalPhrase() {
  const phrases = [
    'La la la, here we go again',
    'Oh oh oh, we rise again',
    'Na na na, feel the light',
    'Hey hey hey, into the night',
    'Ah ah ah, we’re alive'
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

function generateRiffusionPrompt(song) {
  const blocks = song.blocks || [];
  if (!blocks.length) return 'No song data available to generate a Riffusion prompt.';

  const title = song.title || generateRandomTitle();
  const genre = generateRandomGenre();
  const firstBlock = blocks[0];
  const key = `${firstBlock.rootNote} ${firstBlock.mode}`;
  const tempo = `${firstBlock.tempo} BPM`;
  const timeSignature = firstBlock.timeSignature;

  let prompt = `Create a ${genre} track titled "${title}" in ${key}, ${tempo}, ${timeSignature} time signature. `;

  blocks.forEach((block, index) => {
    const sectionType = block.type.toLowerCase();
    const mood = getMoodForFeel(block.feel);
    const instruments = getInstrumentsForBlock(sectionType, block.feel);

    if (sectionType.includes('intro')) {
      prompt += `Begin with a ${mood} intro that feels ambient, using ${instruments}. `;
    } else if (sectionType.includes('verse')) {
      prompt += `Transition into ${mood} verses with themes of ${block.feel.toLowerCase()}, using expressive melodies and syncopated rhythms with ${instruments}. `;
    } else if (sectionType.includes('chorus')) {
      const vocalPhrase = generateVocalPhrase();
      prompt += `Introduce a catchy, ${mood} chorus with a repetitive vocal phrase ("${vocalPhrase}...") to contrast the verses, using ${instruments}. `;
    } else if (sectionType.includes('bridge') || sectionType.includes('interlude')) {
      prompt += `Include a ${mood} bridge section that evokes echoes of forgotten dreams with ${instruments}. `;
    } else if (sectionType.includes('outro')) {
      prompt += `End with a conclusive, ${mood} outro that brings resolution, tying together the song’s themes with ${instruments}. `;
    }
  });

  prompt += `Use layered synths, subtle guitar riffs, and cinematic textures to maintain an epic, interstellar vibe throughout.`;
  return prompt;
}

async function randomizeSong() {
  timeline.innerHTML = '';
  if (selectedBlock) clearSelection();

  const rootNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const modes = [
    'Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian',
    'Harmonic Minor', 'Melodic Minor', 'Blues Scale', 'Pentatonic Major', 'Pentatonic Minor', 'Whole Tone'
  ];
  const feels = [
    'Happiness', 'Sadness', 'Tension', 'Euphoria', 'Calmness', 'Anger', 'Mystical',
    'Rebellion', 'Triumph', 'Bliss', 'Frustration', 'Atmospheric', 'Trippy', 'Awakening', 'Intense', 'Climactic', 'Dreamy'
  ];
  const chordOptions = {
    'Ionian': ['I', 'IV', 'V', 'vi'],
    'Aeolian': ['i', 'iv', 'v', 'VI'],
  };

  let songs = [];
  try {
    const response = await fetch('songs.json');
    if (!response.ok) throw new Error(`Failed to load songs.json: ${response.status} ${response.statusText}`);
    const data = await response.json();
    songs = data.songs || [];
  } catch (error) {
    console.error('Error loading songs:', error);
    songs = [{ title: 'Default Song', artist: 'Unknown', lyrics: '', blocks: [] }];
  }

  const introTypes = ['intro', 'instrumental-verse-chorus'];
  const outroTypes = ['outro', 'coda', 'false-ending'];
  const mainSectionTypes = ['verse', 'chorus', 'pre-chorus', 'refrain', 'post-chorus'];
  const breakSectionTypes = ['bridge', 'solo', 'interlude', 'breakdown', 'drop'];

  const rootNote = rootNotes[Math.floor(Math.random() * rootNotes.length)];
  const mode = modes[Math.floor(Math.random() * modes.length)];
  const tempo = Math.floor(Math.random() * (180 - 60 + 1)) + 60;

  const numBlocks = Math.floor(Math.random() * (10 - 5 + 1)) + 5;
  const structure = [];

  structure.push({
    type: introTypes[Math.floor(Math.random() * introTypes.length)],
    measures: Math.floor(Math.random() * (4 - 1 + 1)) + 1
  });

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

  structure.push({
    type: outroTypes[Math.floor(Math.random() * outroTypes.length)],
    measures: Math.floor(Math.random() * (4 - 1 + 1)) + 1
  });

  const songBlocks = [];
  structure.forEach(({ type, measures }) => {
    const timeSignature = validTimeSignatures[Math.floor(Math.random() * validTimeSignatures.length)];
    const feel = feels[Math.floor(Math.random() * feels.length)];
    const song = songs[Math.floor(Math.random() * songs.length)];
    const lyrics = song.lyrics;

    const availableChords = chordOptions[mode] || ['I', 'IV', 'V'];
    const numChords = Math.min(measures, Math.floor(Math.random() * 4) + 2);
    const chords = [];
    for (let i = 0; i < numChords; i++) {
      chords.push(availableChords[Math.floor(Math.random() * availableChords.length)]);
    }

    const blockData = { type, measures, rootNote, mode, tempo, timeSignature, feel, lyrics, chords };
    songBlocks.push(blockData);

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
      <span class="label">${formatPart(type)}: ${timeSignature} ${measures}m<br>${abbreviateKey(rootNote)} ${mode} ${tempo}b ${feel}${lyrics ? '<br>-<br>' + truncateLyrics(lyrics) : ''}</span>
      ${blockData.chords && blockData.chords.length > 0 ? `<div class="chords">${blockData.chords.join(' → ')}</div>` : ''}
      <span class="tooltip">${lyrics || 'No lyrics'}</span>
    `;
    updateBlockSize(block);
    setupBlock(block);
    timeline.appendChild(block);

    const styleDropdown = document.getElementById('style-dropdown');
    if (styleDropdown && styleDropdown.value) block.classList.add(styleDropdown.value);
  });

  currentSong = {
    title: generateRandomTitle(),
    artist: 'Random Artist',
    blocks: songBlocks
  };

  calculateTimings();
  resetPlayback();
}

async function loadSong(songTitle) {
  let songs = [];
  try {
    const response = await fetch('songs.json');
    if (!response.ok) throw new Error(`Failed to load songs.json: ${response.status} ${response.statusText}`);
    const data = await response.json();
    songs = data.songs || [];
  } catch (error) {
    console.error('Error loading songs:', error);
    songs = [{ title: 'Default Song', artist: 'Unknown', lyrics: '', blocks: [] }];
  }

  const processedSongs = songs.map(song => {
    if (song.file && typeof window[song.file.replace('.js', '')] !== 'undefined') {
      const songData = window[song.file.replace('.js', '')];
      return { ...song, ...songData, blocks: songData.blocks || song.blocks };
    }
    return song;
  });

  const selectedSong = processedSongs.find(song => song.title === songTitle);
  if (!selectedSong || !selectedSong.blocks || selectedSong.blocks.length === 0) {
    console.error(`Song not found or has no blocks: ${songTitle}`);
    return;
  }

  const songTitleElement = document.getElementById('print-song-name');
  if (songTitleElement) {
    songTitleElement.textContent = selectedSong.title;
  }

  timeline.innerHTML = '';
  if (selectedBlock) clearSelection();

  selectedSong.blocks.forEach(block => {
    const { type, measures, timeSignature, rootNote, mode, tempo, feel, chords } = block;
    const lyrics = selectedSong.lyrics;

    const blockData = { type, measures, rootNote, mode, tempo, timeSignature, feel, lyrics, chords };
    const error = validateBlock(blockData);
    if (error) {
      console.error(`Block failed validation: ${error}`);
      return;
    }

    const newBlock = document.createElement('div');
    newBlock.classList.add('song-block', type);
    newBlock.setAttribute('data-measures', measures);
    newBlock.setAttribute('data-tempo', tempo);
    newBlock.setAttribute('data-time-signature', timeSignature);
    newBlock.setAttribute('data-feel', feel);
    newBlock.setAttribute('data-lyrics', lyrics);
    newBlock.setAttribute('data-root-note', rootNote);
    newBlock.setAttribute('data-mode', mode);
    newBlock.setAttribute('data-song-title', selectedSong.title);
    newBlock.setAttribute('data-song-artist', selectedSong.artist);
    newBlock.innerHTML = `
      <span class="label">${formatPart(type)}: ${timeSignature} ${measures}m<br>${abbreviateKey(rootNote)} ${mode} ${tempo}b ${feel}${lyrics ? '<br>-<br>' + truncateLyrics(lyrics) : ''}</span>
      ${blockData.chords && blockData.chords.length > 0 ? `<div class="chords">${blockData.chords.join(' → ')}</div>` : ''}
      <span class="tooltip">${lyrics || 'No lyrics'}</span>
    `;
    updateBlockSize(newBlock);
    setupBlock(newBlock);
    timeline.appendChild(newBlock);

    const styleDropdown = document.getElementById('style-dropdown');
    if (styleDropdown && styleDropdown.value) newBlock.classList.add(styleDropdown.value);
  });

  currentSong = selectedSong;

  calculateTimings();
  resetPlayback();
}

function resetPlayback() {
  isPlaying = false;
  currentBeat = 0;
  currentBlockIndex = 0;
  const playBtn = document.getElementById('play-btn');
  if (playBtn) playBtn.textContent = 'Play';
  calculateTimings();
}

async function playSong() {
  if (isPlaying) {
    isPlaying = false;
    document.getElementById('play-btn').textContent = 'Play';
    return;
  }

  const blocks = Array.from(timeline.children);
  if (blocks.length === 0) {
    console.error('No blocks to play');
    return;
  }

  isPlaying = true;
  document.getElementById('play-btn').textContent = 'Stop';

  const playBlock = async (blockIndex) => {
    if (!isPlaying || blockIndex >= blocks.length) {
      resetPlayback();
      return;
    }

    const block = blocks[blockIndex];
    const tempo = parseInt(block.getAttribute('data-tempo'), 10);
    const timeSignature = block.getAttribute('data-time-signature');
    const measures = parseInt(block.getAttribute('data-measures'), 10);
    const [beatsPerMeasure] = timeSignature.split('/').map(Number);
    const totalBeatsInBlock = measures * beatsPerMeasure;
    const beatDuration = (60 / tempo) * 1000;

    for (let beat = 0; beat < totalBeatsInBlock; beat++) {
      if (!isPlaying) break;

      const previousBeats = blockIndex === 0 ? 0 : blocks.slice(0, blockIndex).reduce((sum, b) => {
        const m = parseInt(b.getAttribute('data-measures'), 10);
        const ts = b.getAttribute('data-time-signature');
        const [bpm] = ts.split('/').map(Number);
        return sum + (m * bpm);
      }, 0);

      currentBeat = previousBeats + beat + 1;
      currentBlockIndex = blockIndex;
      calculateTimings();

      await new Promise(resolve => setTimeout(resolve, beatDuration));
    }

    if (isPlaying) {
      await playBlock(blockIndex + 1);
    }
  };

  await playBlock(0);
}

document.addEventListener('DOMContentLoaded', async () => {
  const processedSongs = await populateSongDropdown();

  const defaultSongTitle = "(I Can’t Get No) Satisfaction";
  if (processedSongs.length > 0) {
    console.log('Songs loaded successfully, loading default song:', defaultSongTitle);
    await loadSong(defaultSongTitle);
  } else {
    console.error('Failed to load songs; cannot load default song');
  }

  const songDropdown = document.getElementById('song-dropdown');
  if (songDropdown) {
    songDropdown.addEventListener('change', (event) => {
      const selectedSongTitle = event.target.value;
      if (selectedSongTitle) {
        loadSong(selectedSongTitle);
      }
    });
  } else {
    console.error('Song dropdown element not found for event listener');
  }

  const addBlockBtn = document.getElementById('add-block-btn');
  if (addBlockBtn) {
    addBlockBtn.addEventListener('click', () => {
      const songTitle = document.getElementById('song-title').value || 'Untitled Song';
      const songArtist = document.getElementById('song-artist').value || 'Unknown Artist';
      const lyrics = document.getElementById('song-lyrics').value;
      const type = document.getElementById('block-type').value;
      const measures = parseInt(document.getElementById('block-measures').value, 10);
      const timeSignature = document.getElementById('block-time-signature').value;
      const tempo = parseInt(document.getElementById('block-tempo').value, 10);
      const rootNote = document.getElementById('block-root-note').value;
      const mode = document.getElementById('block-mode').value;
      const feel = document.getElementById('block-feel').value;

      const blockData = { type, measures, rootNote, mode, tempo, timeSignature, feel, lyrics };
      const error = validateBlock(blockData);
      if (error) {
        console.error(`Block failed validation: ${error}`);
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
      block.setAttribute('data-song-title', songTitle);
      block.setAttribute('data-song-artist', songArtist);
      block.innerHTML = `
        <span class="label">${formatPart(type)}: ${timeSignature} ${measures}m<br>${abbreviateKey(rootNote)} ${mode} ${tempo}b ${feel}${lyrics ? '<br>-<br>' + truncateLyrics(lyrics) : ''}</span>
        <span class="tooltip">${lyrics || 'No lyrics'}</span>
      `;
      updateBlockSize(block);
      setupBlock(block);
      timeline.appendChild(block);

      const styleDropdown = document.getElementById('style-dropdown');
      if (styleDropdown && styleDropdown.value) block.classList.add(styleDropdown.value);

      calculateTimings();
      resetPlayback();

      currentSong = {
        title: songTitle,
        artist: songArtist,
        blocks: Array.from(timeline.children).map(b => ({
          type: b.classList[1],
          measures: parseInt(b.getAttribute('data-measures'), 10),
          timeSignature: b.getAttribute('data-time-signature'),
          rootNote: b.getAttribute('data-root-note'),
          mode: b.getAttribute('data-mode'),
          tempo: parseInt(b.getAttribute('data-tempo'), 10),
          feel: b.getAttribute('data-feel'),
          lyrics: b.getAttribute('data-lyrics')
        }))
      };
    });
  }

  const clearTimelineBtn = document.getElementById('clear-timeline-btn');
  if (clearTimelineBtn) {
    clearTimelineBtn.addEventListener('click', () => {
      timeline.innerHTML = '';
      clearSelection();
      calculateTimings();
      resetPlayback();
      currentSong = null;
    });
  }

  const styleDropdown = document.getElementById('style-dropdown');
  if (styleDropdown) {
    styleDropdown.addEventListener('change', (event) => {
      const style = event.target.value;
      const blocks = timeline.children;
      for (let block of blocks) {
        block.classList.remove('style1', 'style2', 'style3');
        if (style) block.classList.add(style);
      }
    });
  }

  const playBtn = document.getElementById('play-btn');
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      playSong();
    });
  }

  const randomizeBtn = document.getElementById('randomize-btn');
  if (randomizeBtn) {
    randomizeBtn.addEventListener('click', () => {
      randomizeSong();
    });
  }

  const printBtn = document.getElementById('print-btn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  const toggleFormBtn = document.getElementById('toggle-form-btn');
  const formContent = document.getElementById('form-content');
  if (toggleFormBtn && formContent) {
    toggleFormBtn.addEventListener('click', () => {
      const isHidden = formContent.style.display === 'none';
      formContent.style.display = isHidden ? 'block' : 'none';
      toggleFormBtn.textContent = isHidden ? 'HIDE PARAMETERS' : 'SHOW PARAMETERS';
    });
  }

  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      themeBtn.textContent = document.body.classList.contains('light-mode') ? 'Dark Mode' : 'Light Mode';
    });
  }

  const riffusionPromptBtn = document.getElementById('riffusion-prompt-btn');
  if (riffusionPromptBtn) {
    riffusionPromptBtn.addEventListener('click', () => {
      if (!currentSong) {
        alert('Please load or create a song first.');
        return;
      }

      const prompt = generateRiffusionPrompt(currentSong);
      navigator.clipboard.writeText(prompt).then(() => {
        alert('Riffusion prompt copied to clipboard! You can now paste it into Riffusion at https://www.riffusion.com/.');
      }).catch(err => {
        console.error('Failed to copy prompt:', err);
        alert('Failed to copy prompt. Please try again.');
      });
    });
  }
});
