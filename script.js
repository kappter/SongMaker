function loadSongFromDropdown(filename) {
  if (!filename) {
    console.log("No filename selected");
    return;
  }
  console.log(`Attempting to load: ${filename}`);
  try {
    if (filename === 'pneuma.js') {
      if (typeof loadPneuma === 'function') {
        console.log("Calling loadPneuma");
        loadPneuma();
      } else {
        fetch(filename)
          .then(response => {
            if (!response.ok) throw new Error('Failed to fetch Pneuma file');
            return response.text();
          })
          .then(text => {
            eval(text);
            console.log("Fetched and evaluated pneuma.js");
            loadPneuma();
          })
          .catch(error => {
            console.error(`Failed to load Pneuma: ${error.message}`);
            alert(`Failed to load song: ${error.message}`);
          });
      }
    } else if (filename === 'satisfaction.js') {
      if (typeof loadSatisfaction === 'function') {
        console.log("Calling loadSatisfaction");
        loadSatisfaction();
      } else {
        fetch(filename)
          .then(response => {
            if (!response.ok) throw new Error('Failed to fetch Satisfaction file');
            return response.text();
          })
          .then(text => {
            eval(text);
            console.log("Fetched and evaluated satisfaction.js");
            loadSatisfaction();
          })
          .catch(error => {
            console.error(`Failed to load Satisfaction: ${error.message}`);
            alert(`Failed to load song: ${error.message}`);
          });
      }
    } else if (filename === 'dirtyLaundry.js') {
      if (typeof loadDirtyLaundry === 'function') {
        console.log("Calling loadDirtyLaundry");
        loadDirtyLaundry();
      } else {
        fetch(filename)
          .then(response => {
            if (!response.ok) throw new Error('Failed to fetch Dirty Laundry file');
            return response.text();
          })
          .then(text => {
            eval(text);
            console.log("Fetched and evaluated dirtyLaundry.js");
            loadDirtyLaundry();
          })
          .catch(error => {
            console.error(`Failed to load Dirty Laundry: ${error.message}`);
            alert(`Failed to load song: ${error.message}`);
          });
      }
    } else if (filename === 'invincible.js') {
      if (typeof loadInvincible === 'function') {
        console.log("Calling loadInvincible");
        loadInvincible();
      } else {
        fetch(filename)
          .then(response => {
            if (!response.ok) throw new Error('Failed to fetch Invincible file');
            return response.text();
          })
          .then(text => {
            eval(text);
            console.log("Fetched and evaluated invincible.js");
            loadInvincible();
          })
          .catch(error => {
            console.error(`Failed to load Invincible: ${error.message}`);
            alert(`Failed to load song: ${error.message}`);
          });
      }
    } else if (filename === 'astroworld.js') {
      if (typeof loadAstroworld === 'function') {
        console.log("Calling loadAstroworld");
        loadAstroworld();
      } else {
        fetch(filename)
          .then(response => {
            if (!response.ok) throw new Error('Failed to fetch ASTROWORLD file');
            return response.text();
          })
          .then(text => {
            eval(text);
            console.log("Fetched and evaluated astroworld.js");
            loadAstroworld();
          })
          .catch(error => {
            console.error(`Failed to load ASTROWORLD: ${error.message}`);
            alert(`Failed to load song: ${error.message}`);
          });
      }
    } else if (filename === 'astrothunder.js') {
      if (typeof loadAstrothunder === 'function') {
        console.log("Calling loadAstrothunder");
        loadAstrothunder();
      } else {
        fetch(filename)
          .then(response => {
            if (!response.ok) throw new Error('Failed to fetch ASTROTHUNDER file');
            return response.text();
          })
          .then(text => {
            eval(text);
            console.log("Fetched and evaluated astrothunder.js");
            loadAstrothunder();
          })
          .catch(error => {
            console.error(`Failed to load ASTROTHUNDER: ${error.message}`);
            alert(`Failed to load song: ${error.message}`);
          });
      }
    } else if (filename === 'Echoes of Joy.json') {
      fetch(filename)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to fetch Echoes of Joy file: ${response.statusText}`);
          return response.text(); // Get text first to debug parsing issues
        })
        .then(text => {
          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            throw new Error(`Invalid JSON format in Echoes of Joy.json: ${e.message}`);
          }
          loadSongData(data);
          console.log(`Loaded JSON song: ${filename}`);
        })
        .catch(error => {
          console.error(`Failed to load Echoes of Joy: ${error.message}`);
          alert(`Failed to load song: ${error.message}`);
          // Fallback: Load a different song to avoid a blank timeline
          const fallbackSong = availableSongs.find(song => song !== 'Echoes of Joy.json');
          if (fallbackSong) {
            console.log(`Falling back to ${fallbackSong}`);
            loadSongFromDropdown(fallbackSong);
          }
        });
    } else {
      fetch(filename)
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch song file');
          return response.json();
        })
        .then(data => {
          loadSongData(data);
          console.log(`Loaded JSON song: ${filename}`);
        })
        .catch(error => {
          console.error(`Failed to load JSON song: ${error.message}`);
          alert(`Failed to load song: ${error.message}`);
        });
    }
    songDropdown.value = filename;
  } catch (error) {
    console.error(`Error in loadSongFromDropdown: ${error.message}`);
    alert(`Error loading song: ${error.message}`);
  }
}
