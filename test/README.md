# SongMaker — GitHub Pages Deployment

## Quick Setup

1. Create a new GitHub repository (e.g. `songmaker`)
2. Extract the ZIP contents into the repository root
3. Go to **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main` → Folder: `/ (root)`
4. Click **Save** — your site will be live at `https://yourusername.github.io/songmaker/songmaker.html`

## File Structure

```
songmaker.html        ← Main app (use this URL)
index.html            ← Alternate entry point
styles.css            ← All styles
script.js             ← Main app logic
analyzer.js           ← MIDI analyzer / lossless import
jspdf.min.js          ← PDF generation library
midi-writer-js.min.js ← MIDI export library
tonejs-midi.min.js    ← MIDI parsing library
meyda.min.js          ← Audio analysis library
tick.wav / tock.wav   ← Metronome sounds
songs/                ← Built-in song library (JSON/JS)
```

## Notes

- **No server required** — all files are static, no PHP or Node.js needed
- The `songs/list.php` file has been excluded; the song list is loaded from `songs/songs.json` instead
- To add new songs: add a `.js` file to `songs/` and register it in `songs/songs.json`
- The app works fully offline once loaded (all libraries are bundled locally)

## Adding Songs

Edit `songs/songs.json` to register new songs:
```json
[
  { "name": "My Song", "file": "songs/mysong.js" }
]
```

Each song file exports a `window.songData` object — copy an existing `.js` file as a template.
