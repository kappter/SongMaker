// invincible.js
console.log("Loading Invincible script...");

const invincibleSong = {
  songName: "Invincible",
  blocks: [
    {
      type: "intro",
      measures: 48,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "6/8",
      feel: "Contemplative",
      lyrics: "" // Atmospheric instrumental
    },
    {
      type: "verse",
      measures: 24,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "6/8",
      feel: "Reflective",
      lyrics: "Long in tooth and soul, longing for another win"
    },
    {
      type: "pre-chorus",
      measures: 16,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "6/8",
      feel: "Struggle",
      lyrics: "Warrior struggling to remain consequential"
    },
    {
      type: "chorus",
      measures: 24,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "6/8",
      feel: "Defiant",
      lyrics: "Bellow aloud, bold and proud, of where I've been"
    },
    {
      type: "verse",
      measures: 24,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "6/8",
      feel: "Reflective",
      lyrics: "Beating chest and drums, beating tired bones again"
    },
    {
      type: "interlude",
      measures: 24,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "6/8",
      feel: "Nostalgic",
      lyrics: "Tales told of battles won, of things we've done"
    },
    {
      type: "bridge",
      measures: 24,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "6/8",
      feel: "Tension",
      lyrics: "" // Guitar solo and synth
    },
    {
      type: "chorus",
      measures: 24,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "6/8",
      feel: "Defiant",
      lyrics: "Cry aloud, bold and proud, of where I've been"
    },
    {
      type: "outro",
      measures: 32,
      rootNote: "D",
      mode: "Dorian",
      tempo: 120,
      timeSignature: "6/8",
      feel: "Resigned",
      lyrics: "Tears in my eyes, chasing Ponce de León's phantom"
    }
  ]
};

window.loadInvincible = function() {
  console.log("Executing loadInvincible...");
  loadSongData(invincibleSong);
};

// Optional: Auto-load for testing
// window.loadInvincible();
