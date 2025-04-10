# SongMaker

Welcome to **SongMaker**, a web-based application designed to create, edit, and visualize musical compositions with ease. Built with HTML, CSS, and JavaScript, SongMaker allows users to define song structures, calculate timings, and print concise song summaries—all within a sleek, user-friendly interface.

## Features

### 1. Song Structure Creation
- Define songs using a block-based system with customizable properties:
  - **Type**: Intro, verse, chorus, interlude, bridge, outro.
  - **Measures**: Number of measures per block.
  - **Root Note**: Key of the block (e.g., D, C).
  - **Mode**: Musical mode (e.g., Dorian, Aeolian, Ionian).
  - **Tempo**: Beats per minute (BPM).
  - **Time Signature**: Supports common and odd meters (e.g., 4/4, 7/4, 11/8).
  - **Feel**: Descriptive mood (e.g., Atmospheric, Climactic).
  - **Lyrics**: Optional text for vocal sections.
- Load songs from `.js` files in the `songs/` directory (e.g., `pneuma.js`, `schism.js`).

### 2. Dynamic Song Loading
- Select from a dropdown of predefined songs (e.g., "Pneuma," "Schism," "7empest," "Canon in D Minor").
- Instantly populate the timeline with song blocks for editing or review.

### 3. Time Calculation
- Real-time computation of:
  - **Total Duration**: Formatted as MM:SS (e.g., 6:46 for "Schism").
  - **Total Beats**: Summed across all blocks based on measures and time signatures.
  - **Block Count**: Number of sections in the song.
- Displayed in the `#time-calculator` section for quick reference.

### 4. Print-Friendly Output
- Generate a compact, single-page print view with:
  - Song name, total duration, beats, and block count.
  - Copyright notice (e.g., "© 2025 SongMaker by kappter").
- Optimized to avoid page breaks, ensuring all info fits on one sheet.

### 5. Flexible Editing
- Add, remove, or modify blocks directly in the timeline.
- Validate inputs against supported time signatures and other constraints.

### 6. Responsive Design
- Adapts to various screen sizes for seamless use on desktop or mobile.
- Clean, minimalistic UI with toggleable forms and controls.

## Getting Started

### Prerequisites
- A modern web browser (e.g., Chrome, Firefox).
- Basic knowledge of JavaScript for adding new song files.

### Installation
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/kappter/SongMaker.git
   cd SongMaker

# Echoes of Joy – SongMaker

A versatile song creation tool and a portable metronome for musicians and composers. It allows users to build songs by defining structure blocks (e.g., verse, chorus, bridge), selecting root notes and scales (including major, minor, and modal options), and adjusting parameters like tempo, time signature, and emotional feel (e.g., happiness, tension). It supports importing/exporting, printing, and offers a randomized mode for creative inspiration. This makes it ideal for experimenting with song structures and tonal variety, catering to both novice and experienced musicians.

[![SongMaker](https://github.com/kappter/SongMaker/blob/main/tunepix.png?raw=true)](https://kappter.github.io/SongMaker/)

## Features

### Pocket Metronome for Your Creations

* Use SongMaker as a portable metronome tailored to your song’s unique tempo and time signature.
* Plays a metronome beat based on the tempo (60-180 BPM) and time signature (e.g., 4/4, 3/4) of your song blocks, ensuring practice aligns with your creation.
* Supports playback with sound (tick/tock sounds for beats) that can be toggled on or off, making it a versatile tool for musicians on the go.
* Visual feedback during playback highlights the current block and beat, helping you stay in sync with your song’s structure.
### Song Block Creation
* Add individual song blocks (e.g., intro, verse, chorus, pre-chorus, solo, bridge, outro) to build a song structure.
* Customize each block with attributes like measures (1-8), root note (e.g., C, C#, D), mode (e.g., Ionian, Dorian, Aeolian), tempo (60-180 BPM), time signature (e.g., 4/4, 3/4), feel (e.g., Happiness, Tension, Euphoria), and lyrics.
### Random Song Generation
* Generate a complete song with a single click using the "Randomize" feature.
* Creates a logical song structure: starts with an intro, includes verses, pre-choruses (70% chance before choruses), choruses, a potential solo/bridge (50% chance after the second chorus), and ends with an outro.
* Ensures all blocks share the same key (root note and mode) and tempo for a cohesive song, with no deviations.
* Randomizes other attributes like measures, time signature, feel, and lyrics for variety within the structure.
### Block Editing and Management
* Edit block properties (e.g., type, measures, tempo, key, feel, lyrics) via a form interface.
* Delete blocks with a delete button on each block.
* Update block sizes dynamically based on the number of measures, visually reflecting the block’s duration.
### Timeline Visualization
* Displays song blocks in a timeline view using a flexible, wrapping layout (flex-wrap: wrap) for easy arrangement.
* Each block shows a label with its type, time signature, measures, key, mode, tempo, feel, and truncated lyrics (if present).
* Tooltips on hover display full lyrics for each block.
### Print View
* Print songs with a clean, professional layout, including a centered title with a decorative border.
* Displays multiple song blocks per line (using flex-wrap: wrap), with each block fixed at 200px width for consistency.
* Prevents blocks from being split across pages using break-inside: avoid and page-break-inside: avoid.
* Includes a footer on each page: "© 2025 SongMaker by kappter. All rights reserved."
* Hides navigation elements (e.g., Export, Import, Randomize, Print buttons) and other UI components (e.g., play button, sound button, theme button, form content) for a distraction-free print output.
### Style Customization
* Apply visual styles to blocks via a style dropdown, allowing users to change the appearance of blocks (e.g., different colors or themes).
* Styles persist across the app screen and print view.
### Time Calculation
* Calculates and displays the total duration of the song based on the measures and tempo of each block.
* Updates timings dynamically as blocks are added, edited, or removed.
### User Interface Elements
* Navigation Bar: Includes buttons for Export, Import, Randomize, and Print, allowing quick access to core features (visible only on the app screen, hidden in print view).
* Add Block Button: Adds new blocks to the timeline.
* Update Block Button: Updates the selected block’s properties.
* Song Dropdown: Likely allows selection of different songs or templates.
* Time Calculator: Displays calculated timings for the song.
* Current Block Display: Shows details of the currently selected block.
### Responsive Design
* Adapts to different screen sizes with a flexible layout, ensuring blocks wrap naturally on both desktop and mobile devices.
* Maintains readability in print view with adjusted font sizes (11pt for block labels) and spacing.
### Accessibility
* Labels and tooltips provide clear information for each block, improving usability.
* Clean, high-contrast design in print view (black text on white background) ensures readability.

[![EditScreen](https://github.com/kappter/SongMaker/blob/main/hidePara.jpeg?raw=true)](https://kappter.github.io/SongMaker/)

 2025 SongMaker by kappter. All rights reserved.
