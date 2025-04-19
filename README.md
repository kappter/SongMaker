# SongMaker

**SongMaker** is a sleek, web-based tool for creating, editing, and visualizing musical compositions. Built with HTML, CSS, and JavaScript, it helps musicians define song structures, calculate timing, generate printable summaries, and even play back metronome beats to support their creative workflow.

[![SongMaker Screenshot](https://github.com/kappter/SongMaker/blob/main/tunepix.png?raw=true)](https://kappter.github.io/SongMaker/)

## 🎵 Key Features

### 🎼 Song Structure & Block Creation
- Build songs from customizable blocks: **Intro**, **Verse**, **Chorus**, **Bridge**, **Outro**, etc.
- Define each block with:
  - **Measures** (1–8)
  - **Root Note** and **Mode** (e.g., Dorian, Ionian, Aeolian)
  - **Tempo** (60–180 BPM)
  - **Time Signature** (e.g., 4/4, 7/4, 11/8)
  - **Feel** (e.g., Atmospheric, Tension, Euphoria)
  - **Lyrics** (optional)
- Dynamically sized visual blocks reflect duration.
- Hover tooltips show full lyrics.

### 🧠 Random Song Generation
- One-click “Randomize” feature builds a song with logical structure:
  - Intro → Verses → Choruses (w/ optional Pre-Choruses) → Bridge/Solo → Outro
- Ensures key/mode/tempo consistency.
- Adds variety in measures, feel, time signature, and lyrics.

### ⏱️ Time Calculation
- Automatically calculates and displays:
  - **Total Duration** (formatted MM:SS)
  - **Total Beats** (based on time signatures and measures)
  - **Block Count**
- Dynamically updates with each change.

### 📦 Import, Export & Song Management
- Preloaded songs like `pneuma.js`, `schism.js`, and more.
- Add custom `.js` song files to the `songs/` directory.
- Import/export song data via the interface.
- Dropdown menu for quick song selection.

### 🎧 Metronome Playback
- Use SongMaker as a practice metronome:
  - Tick/tock sounds synced to block tempo and time signature.
  - Toggle audio on/off.
  - Visual beat highlighting for intuitive practice.

### 🖨️ Print-Friendly Output
- Single-page print layout with:
  - Centered title and decorative border
  - Structured layout using `flex-wrap` (blocks arranged neatly)
  - Avoids breaking blocks across pages
  - Footer: “© 2025 SongMaker by kappter. All rights reserved.”
- Hides app controls and non-essential UI for clean output.

### 🎨 Style Customization
- Change block styles via a dropdown to personalize the visual aesthetic.
- Styles persist across app and print views.

### 📱 Responsive & Accessible
- Flexible layout for desktops, tablets, and mobile devices.
- Clean, high-contrast design for readability.
- Tooltips and labeled inputs enhance accessibility.

[![Edit Screen](https://github.com/kappter/SongMaker/blob/main/hidePara.jpg?raw=true)](https://kappter.github.io/SongMaker/)

## 🚀 Getting Started

### Prerequisites
- A modern browser (e.g., Chrome, Firefox)
- Basic knowledge of JavaScript to add songs to the `/songs` folder

### Installation
```bash
git clone https://github.com/kappter/SongMaker.git
cd SongMaker
