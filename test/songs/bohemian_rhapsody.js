const bohemianRhapsody = {
  title: "Bohemian Rhapsody",
  artist: "Queen",
  lyrics: `Is this the real life? Is this just fantasy?
Caught in a landslide, no escape from reality
Open your eyes, look up to the skies and see
I'm just a poor boy, I need no sympathy
Because I'm easy come, easy go, little high, little low
Any way the wind blows doesn't really matter to me, to me
Mama, just killed a man, put a gun against his head
Pulled my trigger, now he's dead
Mama, life had just begun
But now I've gone and thrown it all away
Mama, ooh, didn't mean to make you cry
If I'm not back again this time tomorrow
Carry on, carry on as if nothing really matters
Too late, my time has come
Sends shivers down my spine, body's aching all the time
Goodbye, everybody, I've got to go
Gotta leave you all behind and face the truth
Mama, ooh (Any way the wind blows)
I don't wanna die, I sometimes wish I'd never been born at all
I see a little silhouetto of a man
Scaramouche, Scaramouche, will you do the Fandango?
Thunderbolt and lightning, very, very frightening me
(Galileo) Galileo, (Galileo) Galileo, Galileo Figaro
Magnifico-o-o-o-o
I'm just a poor boy, nobody loves me
He's just a poor boy from a poor family
Spare him his life from this monstrosity
Easy come, easy go, will you let me go?
Bismillah! No, we will not let you go (Let him go)
Bismillah! We will not let you go (Let him go)
Bismillah! We will not let you go (Let me go)
Will not let you go (Let me go)
Never, never, never, never let me go
Oh, mama mia, mama mia
Mama mia, let me go
Beelzebub has a devil put aside for me, for me, for me
So you think you can stone me and spit in my eye?
So you think you can love me and leave me to die?
Oh, baby, can't do this to me, baby
Just gotta get out, just gotta get right outta here
Nothing really matters, anyone can see
Nothing really matters
Nothing really matters to me
Any way the wind blows`,
  blocks: [
    {
      type: "intro",
      measures: 10, // ~49 seconds at 80 BPM (20 measures/minute)
      timeSignature: "4/4",
      rootNote: "Bb",
      mode: "Ionian",
      tempo: 80,
      feel: "Melancholy"
    },
    {
      type: "verse", // Ballad section
      measures: 37, // ~107 seconds (2:36 - 0:49 = 107 seconds)
      timeSignature: "4/4",
      rootNote: "Bb",
      mode: "Ionian",
      tempo: 80,
      feel: "Reflective"
    },
    {
      type: "interlude", // Operatic section
      measures: 31, // ~91 seconds (4:07 - 2:36 = 91 seconds)
      timeSignature: "4/4",
      rootNote: "F",
      mode: "Ionian",
      tempo: 80,
      feel: "Dramatic"
    },
    {
      type: "chorus", // Hard rock section
      measures: 16, // ~48 seconds (4:55 - 4:07 = 48 seconds)
      timeSignature: "4/4",
      rootNote: "Bb",
      mode: "Ionian",
      tempo: 80,
      feel: "Intense"
    },
    {
      type: "outro",
      measures: 24, // ~60 seconds (5:55 - 4:55 = 60 seconds)
      timeSignature: "4/4",
      rootNote: "Bb",
      mode: "Ionian",
      tempo: 80,
      feel: "Reflective"
    }
  ]
};

// Export the song data for use in other files (if using modules)
if (typeof module !== "undefined" && module.exports) {
  module.exports = bohemianRhapsody;
}
