// astrothunder.js
console.log("Loading ASTROTHUNDER script...");

const astrothunderSong = {
  songName: "ASTROTHUNDER",
  blocks: [
    {
      type: "intro",
      measures: 3,
      rootNote: "G",
      mode: "Ionian",
      tempo: 80,
      timeSignature: "4/4",
      feel: "Trippy",
      lyrics: "" // Ambient synth intro
    },
    {
      type: "chorus",
      measures: 10,
      rootNote: "G",
      mode: "Ionian",
      tempo: 80,
      timeSignature: "4/4",
      feel: "Mystical",
      lyrics: "Seem like the life I feel, seem like the life I feel's a little distant"
    },
    {
      type: "verse",
      measures: 24,
      rootNote: "G",
      mode: "Ionian",
      tempo: 80,
      timeSignature: "4/4",
      feel: "Trippy",
      lyrics: "Like the remedy, sit back while I watch, repeat, do it on repeat-repeat"
    },
    {
      type: "chorus",
      measures: 11,
      rootNote: "G",
      mode: "Ionian",
      tempo: 80,
      timeSignature: "4/4",
      feel: "Mystical",
      lyrics: "Feels like the life I need's a little distant, yeah"
    }
  ]
};

window.loadAstrothunder = function() {
  console.log("Executing loadAstrothunder...");
  loadSongData(astrothunderSong);
};

// Optional: Auto-load for testing
// window.loadAstrothunder();
