function loadJambi() {
  const songData = {
    songName: "Jambi",
    blocks: [
      {
        type: "intro",
        measures: 16,
        rootNote: "E",
        mode: "Phrygian",
        tempo: 93,
        timeSignature: "9/8",
        feel: "Mystical",
        lyrics: "Here from the king's mountain view\nHere from the wild dream come true\nFeast like a sultan I do\nOn treasures and flesh, never few"
      },
      {
        type: "verse",
        measures: 24,
        rootNote: "E",
        mode: "Phrygian",
        tempo: 93,
        timeSignature: "9/8",
        feel: "Tension",
        lyrics: "The devil and his had me down\nIn love with the dark side I'd found\nDabble in all the way down\nUp to my neck soon to drown"
      },
      {
        type: "chorus",
        measures: 24,
        rootNote: "E",
        mode: "Phrygian",
        tempo: 93,
        timeSignature: "9/8",
        feel: "Triumph",
        lyrics: "But I, I would wish it all away\nIf I thought I'd lose you just one day"
      },
      {
        type: "verse",
        measures: 24,
        rootNote: "E",
        mode: "Phrygian",
        tempo: 93,
        timeSignature: "9/8",
        feel: "Tension",
        lyrics: "Prayed like a martyr dusk to dawn\nBegged like a hooker all night long\nTempted the devil with my song\nAnd got what I wanted all along"
      },
      {
        type: "chorus",
        measures: 24,
        rootNote: "E",
        mode: "Phrygian",
        tempo: 93,
        timeSignature: "9/8",
        feel: "Triumph",
        lyrics: "But I, and I would\nIf I could, and I would\nWish it away, wish it away\nWish it all away"
      },
      {
        type: "bridge",
        measures: 32,
        rootNote: "E",
        mode: "Phrygian",
        tempo: 93,
        timeSignature: "6/4",
        feel: "Intense",
        lyrics: "[Guitar solo with talk box effect]"
      },
      {
        type: "verse",
        measures: 16,
        rootNote: "E",
        mode: "Phrygian",
        tempo: 93,
        timeSignature: "9/8",
        feel: "Mystical",
        lyrics: "Shine on, benevolent sun\nShine down upon the broken"
      },
      {
        type: "chorus",
        measures: 24,
        rootNote: "E",
        mode: "Phrygian",
        tempo: 93,
        timeSignature: "9/8",
        feel: "Triumph",
        lyrics: "Shine until the two become one\nBreathe in union"
      },
      {
        type: "outro",
        measures: 16,
        rootNote: "E",
        mode: "Phrygian",
        tempo: 93,
        timeSignature: "9/8",
        feel: "Mystical",
        lyrics: "[Psychedelic trail off]"
      }
    ]
  };

  loadSongData(songData);
}
