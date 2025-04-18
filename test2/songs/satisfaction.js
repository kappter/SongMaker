// satisfaction.js
console.log("Loading Satisfaction script...");

const satisfactionSong = {
  songName: "(I Can't Get No) Satisfaction",
  blocks: [
    {
      type: "intro",
      measures: 8,
      rootNote: "E",
      mode: "Ionian",
      tempo: 136,
      timeSignature: "4/4",
      feel: "Rebellion",
      lyrics: "" // Extended riff
    },
    {
      type: "verse",
      measures: 12,
      rootNote: "E",
      mode: "Ionian",
      tempo: 136,
      timeSignature: "4/4",
      feel: "Frustration",
      lyrics: "I can't get no satisfaction, I can't get no satisfaction"
    },
    {
      type: "chorus",
      measures: 12,
      rootNote: "E",
      mode: "Ionian",
      tempo: 136,
      timeSignature: "4/4",
      feel: "Rebellion",
      lyrics: "'Cause I try and I try and I try and I try"
    },
    {
      type: "verse",
      measures: 12,
      rootNote: "E",
      mode: "Ionian",
      tempo: 136,
      timeSignature: "4/4",
      feel: "Frustration",
      lyrics: "When I'm drivin' in my car, and a man comes on the radio"
    },
    {
      type: "chorus",
      measures: 12,
      rootNote: "E",
      mode: "Ionian",
      tempo: 136,
      timeSignature: "4/4",
      feel: "Rebellion",
      lyrics: "I can't get no, oh no no no"
    },
    {
      type: "verse",
      measures: 12,
      rootNote: "E",
      mode: "Ionian",
      tempo: 136,
      timeSignature: "4/4",
      feel: "Frustration",
      lyrics: "When I'm watchin' my TV, and a man comes on and tells me"
    },
    {
      type: "chorus",
      measures: 16,
      rootNote: "E",
      mode: "Ionian",
      tempo: 136,
      timeSignature: "4/4",
      feel: "Rebellion",
      lyrics: "I can't get no satisfaction, hey hey hey"
    },
    {
      type: "interlude",
      measures: 24,
      rootNote: "E",
      mode: "Ionian",
      tempo: 136,
      timeSignature: "4/4",
      feel: "Tension",
      lyrics: "" // Instrumental break
    },
    {
      type: "outro",
      measures: 12,
      rootNote: "E",
      mode: "Ionian",
      tempo: 136,
      timeSignature: "4/4",
      feel: "Rebellion",
      lyrics: "I can't get no, satisfaction fades"
    }
  ]
};

window.loadSatisfaction = function() {
  console.log("Executing loadSatisfaction...");
  loadSongData(satisfactionSong);
};
