// pneuma.js
console.log("Loading Pneuma script...");

const pneumaSong = {
  songName: "Pneuma",
  blocks: [
    {
      type: "intro",
      measures: 16,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "7/4",
      feel: "Atmospheric",
      lyrics: "" // Extended atmospheric riff
    },
    {
      type: "verse",
      measures: 16,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "7/4",
      feel: "Mystical",
      lyrics: "We are spirit bound to this flesh, we go round one foot nailed down"
    },
    {
      type: "interlude",
      measures: 16,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "7/4",
      feel: "Trippy",
      lyrics: "" // Middle Eastern drumming
    },
    {
      type: "verse",
      measures: 16,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "7/4",
      feel: "Mystical",
      lyrics: "But bound to reach out and beyond this flesh, become Pneuma"
    },
    {
      type: "chorus",
      measures: 12,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "4/4",
      feel: "Awakening",
      lyrics: "Child, wake up, child, release the light"
    },
    {
      type: "interlude",
      measures: 16,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "7/4",
      feel: "Intense",
      lyrics: "" // Instrumental build
    },
    {
      type: "bridge",
      measures: 24,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "7/4",
      feel: "Tension",
      lyrics: "" // Heavier riff section
    },
    {
      type: "chorus",
      measures: 12,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "4/4",
      feel: "Awakening",
      lyrics: "Wake up, remember, we are born of one breath"
    },
    {
      type: "bridge",
      measures: 32,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "7/4",
      feel: "Climactic",
      lyrics: "" // Extended climactic instrumental
    },
    {
      type: "outro",
      measures: 16,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "7/4",
      feel: "Resolution",
      lyrics: "Pneuma, reach out and beyond, wake up remember"
    }
  ]
};

window.loadPneuma = function() {
  console.log("Executing loadPneuma...");
  loadSongData(pneumaSong);
};

// Optional: Auto-load for testing
// window.loadPneuma();
