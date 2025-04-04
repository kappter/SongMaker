// 7empest.js
console.log("Loading 7empest script...");

const sevenTempestSong = {
  songName: "7empest",
  blocks: [
    {
      type: "intro",
      measures: 32,
      rootNote: "D",
      mode: "Dorian",
      tempo: 78,
      timeSignature: "5/4",
      feel: "Atmospheric",
      lyrics: "" // Extended opening riff
    },
    {
      type: "verse",
      measures: 12,
      rootNote: "D",
      mode: "Dorian",
      tempo: 78,
      timeSignature: "5/4",
      feel: "Tension",
      lyrics: "Keep calm, keep calm, keep calm when the 7empest comes"
    },
    {
      type: "interlude",
      measures: 20,
      rootNote: "D",
      mode: "Dorian",
      tempo: 78,
      timeSignature: "7/4",
      feel: "Mystical",
      lyrics: "" // Instrumental build
    },
    {
      type: "verse",
      measures: 12,
      rootNote: "D",
      mode: "Dorian",
      tempo: 78,
      timeSignature: "5/4",
      feel: "Tension",
      lyrics: "Heat lightning flash, but don’t blink, misleading calm"
    },
    {
      type: "chorus",
      measures: 8,
      rootNote: "D",
      mode: "Dorian",
      tempo: 78,
      timeSignature: "4/4",
      feel: "Intense",
      lyrics: "A tempest must be just that, a tempest must be true"
    },
    {
      type: "interlude",
      measures: 28,
      rootNote: "D",
      mode: "Dorian",
      tempo: 78,
      timeSignature: "7/4",
      feel: "Trippy",
      lyrics: "" // Polyrhythmic drumming and guitar
    },
    {
      type: "bridge",
      measures: 30,
      rootNote: "D",
      mode: "Dorian",
      tempo: 78,
      timeSignature: "5/4",
      feel: "Climactic",
      lyrics: "Control, your delusion, insane and striking at random"
    },
    {
      type: "interlude",
      measures: 24,
      rootNote: "D",
      mode: "Dorian",
      tempo: 78,
      timeSignature: "7/4",
      feel: "Atmospheric",
      lyrics: "" // Extended instrumental swell
    },
    {
      type: "chorus",
      measures: 8,
      rootNote: "D",
      mode: "Dorian",
      tempo: 78,
      timeSignature: "4/4",
      feel: "Awakening",
      lyrics: "A tempest must be just that, no time to deny the storm"
    },
    {
      type: "bridge",
      measures: 32,    // Adjusted from 36
      rootNote: "D",
      mode: "Dorian",
      tempo: 78,
      timeSignature: "5/4",
      feel: "Resolution",
      lyrics: "Here comes the grand finale, blame all your own"
    },
    {
      type: "outro",
      measures: 21,    // Adjusted from 30
      rootNote: "D",
      mode: "Dorian",
      tempo: 78,
      timeSignature: "4/4",
      feel: "Climactic",
      lyrics: "" // Extended instrumental fade with guitar solo
    }
  ]
};

window.loadSevenTempest = function() {
  console.log("Executing loadSevenTempest...");
  loadSongData(sevenTempestSong);
};

// Optional: Auto-load for testing
// window.loadSevenTempest();
