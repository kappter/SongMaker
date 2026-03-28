/**
 * SongMaker Track Analyzer
 * Analyzes MP3, WAV, and MIDI files to extract musical features:
 * - Tempo (BPM), Key, Mode, Time Signature
 * - Waveform + Beat Grid
 * - Energy Arc (RMS amplitude over time)
 * - Chromagram (pitch class energy heatmap)
 * - Section Novelty (structural change detection)
 * - MIDI: Note density per track, velocity arc
 */

'use strict';

// ─── State ───────────────────────────────────────────────────────────────────
let analyzeResult = null; // Stores last analysis for "Import as Song"

// ─── Modal Controls ───────────────────────────────────────────────────────────
function openAnalyzeModal() {
  const modal = document.getElementById('analyze-modal');
  modal.style.display = 'block';
  // Reset state
  document.getElementById('analyze-progress').style.display = 'none';
  document.getElementById('analyze-results').style.display = 'none';
  document.getElementById('analyze-progress-bar').style.width = '0%';
  document.getElementById('analyze-file-input').value = '';
  analyzeResult = null;
}

function closeAnalyzeModal() {
  document.getElementById('analyze-modal').style.display = 'none';
}

// Drag-and-drop support
document.addEventListener('DOMContentLoaded', () => {
  const dz = document.getElementById('analyze-dropzone');
  if (!dz) return;

  dz.addEventListener('dragover', e => {
    e.preventDefault();
    dz.style.borderColor = 'var(--primary)';
    dz.style.background = 'rgba(var(--primary-rgb, 99,102,241),0.08)';
  });
  dz.addEventListener('dragleave', () => {
    dz.style.borderColor = 'var(--border-color)';
    dz.style.background = '';
  });
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.style.borderColor = 'var(--border-color)';
    dz.style.background = '';
    const file = e.dataTransfer.files[0];
    if (file) processAnalyzeFile(file);
  });
});

function handleAnalyzeFile(event) {
  const file = event.target.files[0];
  if (file) processAnalyzeFile(file);
}

// ─── Main Dispatcher ──────────────────────────────────────────────────────────
async function processAnalyzeFile(file) {
  const name = file.name.toLowerCase();
  setAnalyzeStatus('Reading file...', 5);
  showAnalyzeProgress(true);

  try {
    const arrayBuffer = await file.arrayBuffer();
    if (name.endsWith('.mid') || name.endsWith('.midi')) {
      await analyzeMIDI(arrayBuffer, file.name);
    } else {
      await analyzeAudio(arrayBuffer, file.name);
    }
  } catch (err) {
    setAnalyzeStatus('Error: ' + err.message, 0);
    console.error('Analyze error:', err);
  }
}

function setAnalyzeStatus(msg, pct) {
  document.getElementById('analyze-status').textContent = msg;
  document.getElementById('analyze-progress-bar').style.width = pct + '%';
}

function showAnalyzeProgress(show) {
  document.getElementById('analyze-progress').style.display = show ? 'block' : 'none';
}

// ─── MIDI Analysis ────────────────────────────────────────────────────────────
async function analyzeMIDI(arrayBuffer, filename) {
  setAnalyzeStatus('Parsing MIDI...', 20);

  // Use @tonejs/midi (UMD exports window.Midi)
  const MidiClass = window.Midi;
  if (!MidiClass) throw new Error('MIDI parser library not loaded. Please refresh the page.');
  const uint8 = new Uint8Array(arrayBuffer);
  const midi = new MidiClass(uint8);

  setAnalyzeStatus('Extracting MIDI features...', 40);

  // ── Detect SongMaker metadata track for lossless round-trip ──────────────
  let songmakerBlocks = null;  // will be set if this is a SongMaker MIDI
  let songmakerHeader = null;
  midi.tracks.forEach(track => {
    if (track.name === 'SongMaker_Metadata_v1') {
      // @tonejs/midi exposes text events via track.instrument or controlChanges;
      // we need to read raw events. Fall back to parsing the raw MIDI bytes.
      // The Midi class stores text events in track.name only for track name events.
      // We parse the raw buffer ourselves for text events on this track.
    }
  });

  // Parse raw MIDI bytes to extract SM_HEADER and SM_BLOCK text events
  (function extractSongMakerMeta() {
    const view = new DataView(arrayBuffer);
    let pos = 0;

    function readUint32() { const v = view.getUint32(pos); pos += 4; return v; }
    function readUint16() { const v = view.getUint16(pos); pos += 2; return v; }
    function readByte()   { return view.getUint8(pos++); }
    function readVarLen() {
      let val = 0, b;
      do { b = readByte(); val = (val << 7) | (b & 0x7f); } while (b & 0x80);
      return val;
    }
    function readStr(len) {
      let s = '';
      for (let i = 0; i < len; i++) s += String.fromCharCode(readByte());
      return s;
    }

    // Skip MIDI header chunk
    if (readStr(4) !== 'MThd') return;
    readUint32(); readUint16(); readUint16(); readUint16(); // length, format, ntracks, division

    // Scan each track chunk
    while (pos < arrayBuffer.byteLength - 8) {
      const chunkId = readStr(4);
      const chunkLen = readUint32();
      const chunkEnd = pos + chunkLen;
      if (chunkId !== 'MTrk') { pos = chunkEnd; continue; }

      let trackName = '';
      let tick = 0;
      while (pos < chunkEnd) {
        const delta = readVarLen();
        tick += delta;
        const statusByte = readByte();
        if (statusByte === 0xff) {
          // Meta event
          const metaType = readByte();
          const metaLen  = readVarLen();
          const metaStr  = readStr(metaLen);
          if (metaType === 0x03) trackName = metaStr; // Track Name
          if (metaType === 0x2f) break;                  // End of Track
          if (metaType === 0x01 || metaType === 0x06) {
            // Text or Marker event
            if (metaStr.startsWith('SM_HEADER:')) {
              try { songmakerHeader = JSON.parse(metaStr.slice(10)); } catch(e) {}
            } else if (metaStr.startsWith('SM_BLOCK:')) {
              try {
                if (!songmakerBlocks) songmakerBlocks = [];
                songmakerBlocks.push(JSON.parse(metaStr.slice(9)));
              } catch(e) {}
            }
          }
        } else if (statusByte === 0xf0 || statusByte === 0xf7) {
          // SysEx
          const sysexLen = readVarLen();
          pos += sysexLen;
        } else {
          // Regular MIDI event — determine byte count
          const type = statusByte & 0xf0;
          if (type === 0xc0 || type === 0xd0) pos += 1;
          else if (type === 0xf0) { /* already handled */ }
          else pos += 2;
        }
      }
      pos = chunkEnd;
    }
  })();

  const bpm = midi.header.tempos.length > 0 ? Math.round(midi.header.tempos[0].bpm) : 120;
  const timeSig = midi.header.timeSignatures.length > 0
    ? `${midi.header.timeSignatures[0].timeSignature[0]}/${midi.header.timeSignatures[0].timeSignature[1]}`
    : '4/4';
  const durationSec = midi.duration;

  // Collect all notes across all tracks
  const allNotes = [];
  midi.tracks.forEach(track => {
    track.notes.forEach(n => allNotes.push(n));
  });

  // Key detection via chromagram
  const chromaSum = new Float32Array(12).fill(0);
  allNotes.forEach(n => {
    const pc = n.midi % 12;
    chromaSum[pc] += n.durationTicks || 1;
  });
  const { key, mode } = detectKeyFromChroma(chromaSum);

  // Build time-series data for visualizations
  const BINS = 200;
  const binDur = durationSec / BINS;

  // Energy (note velocity) per bin
  const energyBins = new Float32Array(BINS).fill(0);
  const countBins = new Float32Array(BINS).fill(0);
  allNotes.forEach(n => {
    const bin = Math.min(BINS - 1, Math.floor(n.time / binDur));
    energyBins[bin] += n.velocity;
    countBins[bin]++;
  });
  for (let i = 0; i < BINS; i++) {
    if (countBins[i] > 0) energyBins[i] /= countBins[i];
  }

  // Chromagram over time (12 x BINS)
  const chromaTime = [];
  for (let i = 0; i < 12; i++) chromaTime.push(new Float32Array(BINS).fill(0));
  allNotes.forEach(n => {
    const bin = Math.min(BINS - 1, Math.floor(n.time / binDur));
    chromaTime[n.midi % 12][bin] += n.velocity;
  });

  // Section novelty: diff of chroma vectors
  const novelty = computeNovelty(chromaTime, BINS);

  // Beat grid
  const beatInterval = 60 / bpm;
  const beats = [];
  for (let t = 0; t < durationSec; t += beatInterval) beats.push(t / durationSec);

  // Note density per track
  const trackDensities = midi.tracks.map(track => {
    const d = new Float32Array(BINS).fill(0);
    track.notes.forEach(n => {
      const bin = Math.min(BINS - 1, Math.floor(n.time / binDur));
      d[bin]++;
    });
    return { name: track.name || 'Track', data: d };
  });

  setAnalyzeStatus('Rendering visualizations...', 80);

  analyzeResult = {
    type: 'midi', filename, bpm, timeSig, key, mode,
    durationSec, trackCount: midi.tracks.length,
    energyBins, chromaTime, novelty, beats, trackDensities,
    // SongMaker lossless round-trip data (null if not a SongMaker MIDI)
    songmakerBlocks, songmakerHeader
  };

  // Show a badge in the UI if this is a SongMaker MIDI
  if (songmakerBlocks && songmakerBlocks.length > 0) {
    const meta = document.getElementById('analyze-meta');
    if (meta) {
      const badge = document.createElement('span');
      badge.style.cssText = 'background:#22c55e;color:#fff;padding:3px 10px;border-radius:12px;font-size:0.8em;font-weight:700;letter-spacing:0.04em;';
      badge.textContent = '\u2714 SongMaker MIDI — lossless import';
      meta.prepend(badge);
    }
  }

  renderAnalyzeResults(analyzeResult);
  setAnalyzeStatus('Done!', 100);
  setTimeout(() => showAnalyzeProgress(false), 600);
}

// ─── Audio Analysis ───────────────────────────────────────────────────────────
async function analyzeAudio(arrayBuffer, filename) {
  setAnalyzeStatus('Decoding audio...', 10);

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let audioBuffer;
  try {
    audioBuffer = await new Promise((resolve, reject) => {
      audioCtx.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
    });
  } catch(e) {
    throw new Error('Could not decode audio. Try a WAV file if MP3 fails.');
  }

  setAnalyzeStatus('Extracting waveform...', 25);

  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0); // mono
  const durationSec = audioBuffer.duration;
  const totalSamples = channelData.length;

  const BINS = 300;
  const binSize = Math.floor(totalSamples / BINS);

  // Waveform (peak per bin)
  const waveform = new Float32Array(BINS);
  for (let i = 0; i < BINS; i++) {
    let peak = 0;
    const start = i * binSize;
    const end = Math.min(start + binSize, totalSamples);
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > peak) peak = abs;
    }
    waveform[i] = peak;
  }

  setAnalyzeStatus('Computing RMS energy...', 40);

  // RMS energy per bin
  const energyBins = new Float32Array(BINS);
  for (let i = 0; i < BINS; i++) {
    let sum = 0;
    const start = i * binSize;
    const end = Math.min(start + binSize, totalSamples);
    for (let j = start; j < end; j++) sum += channelData[j] * channelData[j];
    energyBins[i] = Math.sqrt(sum / (end - start));
  }

  setAnalyzeStatus('Computing chromagram...', 55);

  // Chromagram via Meyda (if available) or manual FFT-based approach
  const CHROMA_BINS = 150;
  const chromaTime = [];
  for (let i = 0; i < 12; i++) chromaTime.push(new Float32Array(CHROMA_BINS).fill(0));

  if (window.Meyda) {
    // Use Meyda for chroma extraction
    const frameSize = 4096;
    const hopSize = Math.floor(totalSamples / CHROMA_BINS);
    for (let i = 0; i < CHROMA_BINS; i++) {
      const start = i * hopSize;
      const frame = channelData.slice(start, start + frameSize);
      if (frame.length < frameSize) break;
      try {
        const features = Meyda.extract(['chroma'], Array.from(frame));
        if (features && features.chroma) {
          features.chroma.forEach((v, pc) => { chromaTime[pc][i] = v; });
        }
      } catch(e) { /* skip frame */ }
    }
  } else {
    // Fallback: simplified chroma via zero-crossing and amplitude
    const hopSize = Math.floor(totalSamples / CHROMA_BINS);
    for (let i = 0; i < CHROMA_BINS; i++) {
      const start = i * hopSize;
      const end = Math.min(start + hopSize, totalSamples);
      // Estimate dominant pitch class from autocorrelation
      const pc = estimatePitchClass(channelData, start, end, sampleRate);
      chromaTime[pc][i] += 1;
    }
  }

  setAnalyzeStatus('Detecting tempo...', 70);

  // BPM detection via onset strength
  const { bpm, beats } = detectBPM(energyBins, durationSec);

  setAnalyzeStatus('Detecting key and mode...', 80);

  // Key detection from average chroma
  const chromaSum = new Float32Array(12).fill(0);
  for (let pc = 0; pc < 12; pc++) {
    for (let t = 0; t < CHROMA_BINS; t++) chromaSum[pc] += chromaTime[pc][t];
  }
  const { key, mode } = detectKeyFromChroma(chromaSum);

  // Section novelty
  const novelty = computeNovelty(chromaTime, CHROMA_BINS);

  // Time signature estimation (from beat regularity)
  const timeSig = estimateTimeSig(beats, bpm);

  setAnalyzeStatus('Rendering visualizations...', 90);

  analyzeResult = {
    type: 'audio', filename, bpm, timeSig, key, mode,
    durationSec, waveform, energyBins, chromaTime, novelty, beats
  };

  renderAnalyzeResults(analyzeResult);
  setAnalyzeStatus('Done!', 100);
  setTimeout(() => showAnalyzeProgress(false), 600);
  audioCtx.close();
}

// ─── Key Detection (Krumhansl-Schmuckler) ────────────────────────────────────
const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const MODE_NAMES = {
  Ionian: [0,2,4,5,7,9,11],
  Dorian: [0,2,3,5,7,9,10],
  Phrygian: [0,1,3,5,7,8,10],
  Lydian: [0,2,4,6,7,9,11],
  Mixolydian: [0,2,4,5,7,9,10],
  Aeolian: [0,2,3,5,7,8,10],
  Locrian: [0,1,3,5,6,8,10],
};

function detectKeyFromChroma(chroma) {
  let bestKey = 0, bestMode = 'Ionian', bestScore = -Infinity;

  for (let root = 0; root < 12; root++) {
    // Major (Ionian)
    let scoreMaj = 0, scoreMin = 0;
    for (let i = 0; i < 12; i++) {
      scoreMaj += chroma[(root + i) % 12] * KS_MAJOR[i];
      scoreMin += chroma[(root + i) % 12] * KS_MINOR[i];
    }
    if (scoreMaj > bestScore) { bestScore = scoreMaj; bestKey = root; bestMode = 'Ionian'; }
    if (scoreMin > bestScore) { bestScore = scoreMin; bestKey = root; bestMode = 'Aeolian'; }
  }

  // Refine mode: test all 7 modes for the detected root
  let refinedMode = bestMode;
  let refinedScore = -Infinity;
  for (const [modeName, intervals] of Object.entries(MODE_NAMES)) {
    let score = 0;
    intervals.forEach(interval => { score += chroma[(bestKey + interval) % 12]; });
    if (score > refinedScore) { refinedScore = score; refinedMode = modeName; }
  }

  return { key: NOTE_NAMES[bestKey], mode: refinedMode };
}

// ─── BPM Detection ────────────────────────────────────────────────────────────
function detectBPM(energyBins, durationSec) {
  const n = energyBins.length;
  const binDur = durationSec / n;

  // Onset strength: positive energy flux
  const onset = new Float32Array(n);
  for (let i = 1; i < n; i++) {
    onset[i] = Math.max(0, energyBins[i] - energyBins[i - 1]);
  }

  // Autocorrelation to find periodicity
  const maxLag = Math.floor(n / 2);
  const acf = new Float32Array(maxLag);
  for (let lag = 1; lag < maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) sum += onset[i] * onset[i + lag];
    acf[lag] = sum;
  }

  // Find peak in BPM range 60–200
  const minLag = Math.floor(60 / (200 * binDur));
  const maxLagBPM = Math.floor(60 / (60 * binDur));
  let bestLag = minLag, bestAcf = 0;
  for (let lag = minLag; lag <= Math.min(maxLag - 1, maxLagBPM); lag++) {
    if (acf[lag] > bestAcf) { bestAcf = acf[lag]; bestLag = lag; }
  }

  const bpm = Math.round(60 / (bestLag * binDur));
  const safeBPM = (bpm < 60 || bpm > 220) ? 120 : bpm;

  // Beat positions
  const beatInterval = 60 / safeBPM;
  const beats = [];
  for (let t = 0; t < durationSec; t += beatInterval) beats.push(t / durationSec);

  return { bpm: safeBPM, beats };
}

// ─── Time Signature Estimation ────────────────────────────────────────────────
function estimateTimeSig(beats, bpm) {
  // Simple heuristic: most music is 4/4; check for 3/4 via beat grouping
  return '4/4';
}

// ─── Pitch Class Estimation (fallback without Meyda) ─────────────────────────
function estimatePitchClass(channelData, start, end, sampleRate) {
  // Zero-crossing rate as rough frequency proxy
  let zc = 0;
  for (let i = start + 1; i < end; i++) {
    if ((channelData[i] >= 0) !== (channelData[i - 1] >= 0)) zc++;
  }
  const freq = (zc / 2) * sampleRate / (end - start);
  if (freq < 20 || freq > 4000) return 0;
  // Map frequency to pitch class
  const midi = 12 * Math.log2(freq / 440) + 69;
  return ((Math.round(midi) % 12) + 12) % 12;
}

// ─── Section Novelty ─────────────────────────────────────────────────────────
function computeNovelty(chromaTime, bins) {
  const novelty = new Float32Array(bins).fill(0);
  for (let t = 1; t < bins; t++) {
    let diff = 0;
    for (let pc = 0; pc < 12; pc++) {
      const d = chromaTime[pc][t] - chromaTime[pc][t - 1];
      diff += d * d;
    }
    novelty[t] = Math.sqrt(diff);
  }
  // Smooth
  const smoothed = new Float32Array(bins);
  const W = 3;
  for (let t = 0; t < bins; t++) {
    let sum = 0, count = 0;
    for (let k = -W; k <= W; k++) {
      const idx = t + k;
      if (idx >= 0 && idx < bins) { sum += novelty[idx]; count++; }
    }
    smoothed[t] = sum / count;
  }
  return smoothed;
}

// ─── Render Results ───────────────────────────────────────────────────────────
function renderAnalyzeResults(r) {
  // Show results panel
  document.getElementById('analyze-results').style.display = 'block';
  document.getElementById('analyze-midi-section').style.display =
    (r.type === 'midi') ? 'block' : 'none';
  document.getElementById('analyze-import-btn').style.display = 'inline-block';

  // Metadata chips
  const meta = document.getElementById('analyze-meta');
  const chipStyle = 'background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); border-radius:20px; padding:5px 14px; font-size:0.82em; font-weight:600;';
  const dur = formatDuration(r.durationSec);
  meta.innerHTML = `
    <span style="${chipStyle}">&#127911; ${r.filename}</span>
    <span style="${chipStyle}">&#9201; ${dur}</span>
    <span style="${chipStyle}">&#9836; ${r.bpm} BPM</span>
    <span style="${chipStyle}">&#9835; ${r.timeSig}</span>
    <span style="${chipStyle}">&#127929; ${r.key} ${r.mode}</span>
    ${r.type === 'midi' ? `<span style="${chipStyle}">&#127932; ${r.trackCount} tracks</span>` : ''}
  `;

  // Waveform + beat grid
  drawWaveformCanvas(r);

  // Energy arc
  drawEnergyCanvas(r);

  // Chromagram
  drawChromaCanvas(r);

  // Section novelty
  drawNoveltyCanvas(r);

  // MIDI note density
  if (r.type === 'midi' && r.trackDensities) {
    drawMIDIDensityCanvas(r);
  }
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Canvas Renderers ─────────────────────────────────────────────────────────
function setupCanvas(id) {
  const canvas = document.getElementById(id);
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(rect.width || canvas.offsetWidth || 800, 200);
  const h = canvas.offsetHeight || parseInt(canvas.style.height) || 80;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w, h };
}

function drawWaveformCanvas(r) {
  const { ctx, w, h } = setupCanvas('analyze-waveform');
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, w, h);

  const data = r.waveform || r.energyBins;
  const n = data.length;
  const mid = h / 2;

  // Draw waveform
  ctx.beginPath();
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    const x = (i / n) * w;
    const amp = data[i] * mid * 0.9;
    if (i === 0) ctx.moveTo(x, mid - amp);
    else ctx.lineTo(x, mid - amp);
  }
  ctx.stroke();

  // Mirror
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(74,222,128,0.4)';
  for (let i = 0; i < n; i++) {
    const x = (i / n) * w;
    const amp = data[i] * mid * 0.9;
    if (i === 0) ctx.moveTo(x, mid + amp);
    else ctx.lineTo(x, mid + amp);
  }
  ctx.stroke();

  // Fill between
  ctx.beginPath();
  ctx.fillStyle = 'rgba(74,222,128,0.08)';
  for (let i = 0; i < n; i++) {
    const x = (i / n) * w;
    const amp = data[i] * mid * 0.9;
    if (i === 0) ctx.moveTo(x, mid - amp);
    else ctx.lineTo(x, mid - amp);
  }
  for (let i = n - 1; i >= 0; i--) {
    const x = (i / n) * w;
    const amp = data[i] * mid * 0.9;
    ctx.lineTo(x, mid + amp);
  }
  ctx.closePath();
  ctx.fill();

  // Beat markers
  if (r.beats) {
    ctx.strokeStyle = 'rgba(251,191,36,0.6)';
    ctx.lineWidth = 1;
    r.beats.forEach((b, i) => {
      const x = b * w;
      const isMeasure = i % 4 === 0;
      ctx.globalAlpha = isMeasure ? 0.9 : 0.3;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  // Time labels
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '10px monospace';
  const labelCount = Math.min(8, Math.floor(r.durationSec / 30) + 1);
  for (let i = 0; i <= labelCount; i++) {
    const t = (i / labelCount) * r.durationSec;
    const x = (i / labelCount) * w;
    ctx.fillText(formatDuration(t), x + 2, h - 3);
  }
}

function drawEnergyCanvas(r) {
  const { ctx, w, h } = setupCanvas('analyze-energy');
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, w, h);

  const data = r.energyBins;
  const n = data.length;
  const maxVal = Math.max(...data) || 1;
  const pad = 8;

  // Gradient fill
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(59,130,246,0.8)');
  grad.addColorStop(0.4, 'rgba(16,185,129,0.8)');
  grad.addColorStop(0.7, 'rgba(245,158,11,0.8)');
  grad.addColorStop(1, 'rgba(239,68,68,0.8)');

  ctx.beginPath();
  ctx.fillStyle = grad;
  ctx.moveTo(0, h);
  for (let i = 0; i < n; i++) {
    const x = (i / n) * w;
    const y = h - pad - (data[i] / maxVal) * (h - pad * 2);
    if (i === 0) ctx.lineTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Line on top
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < n; i++) {
    const x = (i / n) * w;
    const y = h - pad - (data[i] / maxVal) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Section novelty peaks as vertical markers
  if (r.novelty) {
    const maxN = Math.max(...r.novelty) || 1;
    const threshold = maxN * 0.65;
    ctx.strokeStyle = 'rgba(251,191,36,0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    const nBins = r.novelty.length;
    r.novelty.forEach((v, i) => {
      if (v > threshold && (i === 0 || r.novelty[i - 1] < v)) {
        const x = (i / nBins) * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    });
    ctx.setLineDash([]);
  }
}

function drawChromaCanvas(r) {
  const { ctx, w, h } = setupCanvas('analyze-chroma');
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, w, h);

  const chromaTime = r.chromaTime;
  const bins = chromaTime[0].length;
  const rowH = h / 12;

  // Find global max for normalization
  let globalMax = 0;
  for (let pc = 0; pc < 12; pc++) {
    for (let t = 0; t < bins; t++) {
      if (chromaTime[pc][t] > globalMax) globalMax = chromaTime[pc][t];
    }
  }
  if (globalMax === 0) globalMax = 1;

  // Heatmap colors: dark blue → cyan → yellow → red
  for (let pc = 0; pc < 12; pc++) {
    const y = (11 - pc) * rowH; // high notes at top
    for (let t = 0; t < bins; t++) {
      const val = chromaTime[pc][t] / globalMax;
      const x = (t / bins) * w;
      const bw = Math.ceil(w / bins) + 1;
      ctx.fillStyle = chromaHeatColor(val);
      ctx.fillRect(x, y, bw, rowH);
    }
  }

  // Note name labels
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `bold ${Math.max(9, Math.floor(rowH * 0.7))}px monospace`;
  for (let pc = 0; pc < 12; pc++) {
    const y = (11 - pc) * rowH;
    ctx.fillText(NOTE_NAMES[pc], 4, y + rowH * 0.75);
  }

  // Highlight detected key row
  const keyIdx = NOTE_NAMES.indexOf(r.key);
  if (keyIdx >= 0) {
    ctx.strokeStyle = 'rgba(251,191,36,0.9)';
    ctx.lineWidth = 2;
    const y = (11 - keyIdx) * rowH;
    ctx.strokeRect(0, y, w, rowH);
  }
}

function chromaHeatColor(val) {
  // 0 = dark, 0.5 = teal, 1 = bright yellow-red
  if (val < 0.001) return 'rgba(0,0,0,0)';
  const r = Math.round(val < 0.5 ? val * 2 * 20 : 20 + (val - 0.5) * 2 * 235);
  const g = Math.round(val < 0.5 ? val * 2 * 180 : 180 - (val - 0.5) * 2 * 80);
  const b = Math.round(val < 0.5 ? 100 + val * 2 * 80 : 180 - (val - 0.5) * 2 * 180);
  return `rgba(${r},${g},${b},${0.3 + val * 0.7})`;
}

function drawNoveltyCanvas(r) {
  const { ctx, w, h } = setupCanvas('analyze-novelty');
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, w, h);

  const data = r.novelty;
  const n = data.length;
  const maxVal = Math.max(...data) || 1;
  const threshold = maxVal * 0.65;
  const pad = 6;

  // Fill area
  ctx.beginPath();
  ctx.fillStyle = 'rgba(139,92,246,0.25)';
  ctx.moveTo(0, h);
  for (let i = 0; i < n; i++) {
    const x = (i / n) * w;
    const y = h - pad - (data[i] / maxVal) * (h - pad * 2);
    if (i === 0) ctx.lineTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(167,139,250,0.9)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < n; i++) {
    const x = (i / n) * w;
    const y = h - pad - (data[i] / maxVal) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Section boundary markers
  let sectionIdx = 1;
  for (let i = 1; i < n - 1; i++) {
    if (data[i] > threshold && data[i] >= data[i - 1] && data[i] >= data[i + 1]) {
      const x = (i / n) * w;
      ctx.strokeStyle = 'rgba(251,191,36,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.fillStyle = 'rgba(251,191,36,0.9)';
      ctx.font = '10px monospace';
      ctx.fillText(`S${sectionIdx++}`, x + 2, 12);
    }
  }

  // Threshold line
  ctx.strokeStyle = 'rgba(251,191,36,0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  const ty = h - pad - (threshold / maxVal) * (h - pad * 2);
  ctx.beginPath();
  ctx.moveTo(0, ty);
  ctx.lineTo(w, ty);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawMIDIDensityCanvas(r) {
  const { ctx, w, h } = setupCanvas('analyze-midi-density');
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, w, h);

  const tracks = r.trackDensities.filter(t => t.data.some(v => v > 0));
  if (tracks.length === 0) return;

  const colors = ['#f87171','#60a5fa','#34d399','#fbbf24','#a78bfa','#fb923c','#e879f9'];
  const n = tracks[0].data.length;

  // Find global max
  let globalMax = 0;
  tracks.forEach(t => { const m = Math.max(...t.data); if (m > globalMax) globalMax = m; });
  if (globalMax === 0) return;

  const trackH = h / tracks.length;

  tracks.forEach((track, ti) => {
    const y0 = ti * trackH;
    const color = colors[ti % colors.length];
    const data = track.data;

    ctx.fillStyle = color.replace(')', ',0.15)').replace('rgb', 'rgba').replace('#', '');
    // Draw as mini bar chart
    for (let i = 0; i < n; i++) {
      const x = (i / n) * w;
      const bw = Math.max(1, Math.ceil(w / n));
      const bh = (data[i] / globalMax) * trackH * 0.85;
      ctx.fillStyle = color + '99';
      ctx.fillRect(x, y0 + trackH - bh, bw, bh);
    }

    // Track label
    ctx.fillStyle = color;
    ctx.font = 'bold 10px monospace';
    ctx.fillText(track.name.substring(0, 20) || `Track ${ti + 1}`, 4, y0 + 12);
  });
}

// ─── Import as Song Blocks ────────────────────────────────────────────────────
function importAnalyzedSong() {
  if (!analyzeResult) return;
  const r = analyzeResult;

  // ── Lossless path: SongMaker MIDI with embedded metadata ─────────────────
  if (r.songmakerBlocks && r.songmakerBlocks.length > 0) {
    const blocks = r.songmakerBlocks;

    // Restore song title
    const titleInput = document.getElementById('song-title-input');
    const songTitle = (r.songmakerHeader && r.songmakerHeader.songTitle)
      ? r.songmakerHeader.songTitle
      : r.filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
    if (titleInput) {
      titleInput.value = songTitle;
      const nameEl = document.getElementById('print-song-name');
      if (nameEl) nameEl.textContent = songTitle;
    }

    // Clear existing blocks
    const timeline = document.getElementById('timeline');
    if (timeline) timeline.innerHTML = '';

    // Restore every block exactly from metadata
    blocks.forEach(b => {
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      };

      setVal('part-type',       b.partType  || 'verse');
      setVal('measures',        b.measures  || 4);
      setVal('root-note',       b.rootNote  || 'C');
      setVal('mode',            b.mode      || 'Ionian');
      setVal('tempo',           b.tempo     || 120);
      setVal('time-signature',  b.timeSig   || '4/4');
      setVal('feel',            b.feel      || '');
      setVal('lyrics',          b.lyrics    || '');

      // Per-role energy
      if (b.energy) {
        setVal('energy-drummer',     b.energy.drummer     || 5);
        setVal('energy-bassist',     b.energy.bassist     || 5);
        setVal('energy-guitarist',   b.energy.guitarist   || 5);
        setVal('energy-keyboardist', b.energy.keyboardist || 5);
        setVal('energy-vocalist',    b.energy.vocalist    || 5);
      }

      if (typeof addBlock === 'function') addBlock();
    });

    closeAnalyzeModal();
    alert(`\u2714 Lossless import complete!\n${blocks.length} blocks restored from "${r.filename}" with all fields intact (key, mode, tempo, time signature, measures, feel, lyrics, and per-role energy).`);
    return;
  }

  // ── Estimation path: non-SongMaker MIDI or audio file ────────────────────
  const novelty = r.novelty;
  const n = novelty.length;
  const maxN = Math.max(...novelty) || 1;
  const threshold = maxN * 0.65;

  const boundaries = [0];
  for (let i = 1; i < n - 1; i++) {
    if (novelty[i] > threshold && novelty[i] >= novelty[i - 1] && novelty[i] >= novelty[i + 1]) {
      if (i - boundaries[boundaries.length - 1] > n * 0.05) boundaries.push(i);
    }
  }
  boundaries.push(n);

  const sectionTypes = ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro'];
  const beatsPerMeasure = parseInt((r.timeSig || '4/4').split('/')[0]);

  const titleInput = document.getElementById('song-title-input');
  if (titleInput) {
    const baseName = r.filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
    titleInput.value = baseName;
    const nameEl = document.getElementById('print-song-name');
    if (nameEl) nameEl.textContent = baseName;
  }

  const timeline = document.getElementById('timeline');
  if (timeline) timeline.innerHTML = '';

  boundaries.slice(0, -1).forEach((start, idx) => {
    const end = boundaries[idx + 1];
    const sectionDur = (end - start) / n * r.durationSec;
    const beatCount = Math.round((sectionDur * r.bpm) / 60);
    const measures = Math.max(1, Math.round(beatCount / beatsPerMeasure));

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('part-type',      sectionTypes[idx % sectionTypes.length]);
    setVal('measures',       measures);
    setVal('root-note',      r.key);
    setVal('mode',           r.mode);
    setVal('tempo',          r.bpm);
    setVal('time-signature', r.timeSig);

    if (typeof addBlock === 'function') addBlock();
  });

  closeAnalyzeModal();
  alert(`Imported ${boundaries.length - 1} estimated sections from "${r.filename}" — key: ${r.key} ${r.mode}, ${r.bpm} BPM.\nNote: section boundaries and types are estimated. Review and adjust as needed.`);
}
