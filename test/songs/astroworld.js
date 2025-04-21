// astroworld.js
console.log("Loading ASTROWORLD script (STARGAZING)...");

const astroworldSong = {
  songName: "STARGAZING",
  blocks: [
    {
      type: "intro",
      measures: 20,
      rootNote: "Bb",
      mode: "Aeolian",
      tempo: 103,
      timeSignature: "4/4",
      feel: "Trippy",
      lyrics: "" // Psychedelic synths
    },
    {
      type: "verse",
      measures: 20,
      rootNote: "Bb",
      mode: "Aeolian",
      tempo: 103,
      timeSignature: "4/4",
      feel: "Euphoria",
      lyrics: "Rollin', rollin', rollin', got me stargazin'"
    },
    {
      type: "chorus",
      measures: 20,
      rootNote: "Bb",
      mode: "Aeolian",
      tempo: 103,
      timeSignature: "4/4",
      feel: "Euphoria",
      lyrics: "This the type of shit that keep me high, stargazin'"
    },
    {
      type: "bridge",
      measures: 20,
      rootNote: "Bb",
      mode: "Aeolian",
      tempo: 103,
      timeSignature: "4/4",
      feel: "Trippy",
      lyrics: "" // Beat switch transition
    },
    {
      type: "verse",
      measures: 40,
      rootNote: "Bb",
      mode: "Aeolian",
      tempo: 103,
      timeSignature: "4/4",
      feel: "Euphoria",
      lyrics: "Out of body, floatin', but I'm in control now"
    }
  ]
};

window.loadAstroworld = function() {
  console.log("Executing loadAstroworld...");
  loadSongData(astroworldSong);
};

// Optional: Auto-load for testing
// window.loadAstroworld();
