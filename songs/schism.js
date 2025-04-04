// schism.js
console.log("Loading Schism script...");

const schismSong = {
  songName: "Schism",
  blocks: [
    {
      type: "intro",
      measures: 12,
      rootNote: "D",
      mode: "Dorian",
      tempo: 107,
      timeSignature: "11/8", // Changed from 5/8
      feel: "Atmospheric",
      lyrics: "" // Opening bass and guitar riff
    },
    {
      type: "verse",
      measures: 16,
      rootNote: "D",
      mode: "Dorian",
      tempo: 107,
      timeSignature: "11/8", // Changed from 5/8
      feel: "Tension",
      lyrics: "I know the pieces fit 'cause I watched them fall away"
    },
    {
      type: "interlude",
      measures: 8,
      rootNote: "D",
      mode: "Dorian",
      tempo: 107,
      timeSignature: "6/8", // Already valid
      feel: "Mystical",
      lyrics: "" // Shift to 6/8 instrumental
    },
    {
      type: "verse",
      measures: 16,
      rootNote: "D",
      mode: "Dorian",
      tempo: 107,
      timeSignature: "11/8", // Changed from 5/8
      feel: "Tension",
      lyrics: "Milquetoast and misery between sobriety and silence"
    },
    {
      type: "chorus",
      measures: 12,
      rootNote: "D",
      mode: "Dorian",
      tempo: 107,
      timeSignature: "4/4", // Already valid
      feel: "Intense",
      lyrics: "The pieces fit, I know the pieces fit"
    },
    {
      type: "interlude",
      measures: 16,
      rootNote: "D",
      mode: "Dorian",
      tempo: 107,
      timeSignature: "6/8", // Already valid
      feel: "Trippy",
      lyrics: "" // Extended polyrhythmic drumming
    },
    {
      type: "bridge",
      measures: 20,
      rootNote: "D",
      mode: "Dorian",
      tempo: 107,
      timeSignature: "11/8", // Changed from 5/8
      feel: "Climactic",
      lyrics: "There was a time that the pieces fit, but I watched them fall away"
    },
    {
      type: "interlude",
      measures: 12,
      rootNote: "D",
      mode: "Dorian",
      tempo: 107,
      timeSignature: "6/8", // Already valid
      feel: "Atmospheric",
      lyrics: "" // Instrumental build-up
    },
    {
      type: "chorus",
      measures: 12,
      rootNote: "D",
      mode: "Dorian",
      tempo: 107,
      timeSignature: "4/4", // Already valid
      feel: "Awakening",
      lyrics: "Cold silence has a tendency to atrophy any sense of compassion"
    },
    {
      type: "bridge",
      measures: 24,
      rootNote: "D",
      mode: "Dorian",
      tempo: 107,
      timeSignature: "11/8", // Changed from 5/8
      feel: "Resolution",
      lyrics: "Between supposed lovers, between supposed brothers"
    },
    {
      type: "outro",
      measures: 16,
      rootNote: "D",
      mode: "Dorian",
      tempo: 107,
      timeSignature: "4/4", // Already valid
      feel: "Calmness",
      lyrics: "I know the pieces fit, I know the pieces fit"
    }
  ]
};

window.loadSchism = function() {
  console.log("Executing loadSchism...");
  loadSongData(schismSong);
};

// Optional: Auto-load for testing
// window.loadSchism();
