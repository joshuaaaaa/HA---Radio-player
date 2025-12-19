class RadioBrowserCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._stations = [];
    this._countries = [];
    this._mediaPlayers = [];
    this._selectedMediaPlayer = null;
    this._selectedCountry = '';
    this._currentStationIndex = -1;
    this._selectedStationIndex = -1;
    this._isPlaying = false;
    this._volume = 10;
    this._visualizerInterval = null;
    this._favorites = this.loadFavorites();
    this._searchQuery = '';
    this._visualizerStyle = localStorage.getItem('radio_visualizer_style') || 'bars';
    this._theme = localStorage.getItem('radio_theme') || 'dark';
    this._keyboardHandler = null;
    this._isMuted = false;
    this._volumeBeforeMute = 50;
    this._sleepTimer = null;
    this._sleepTimerInterval = null;
    this._sleepTimerMinutes = 0;
    this._currentStationMetadata = null;
    this._customStations = this.loadCustomStations();
    this._audioElement = null;
    this._isUsingDirectPlayback = false;
    this._keepaliveInterval = null;
    this._pageHidden = false;
    this._wakeLock = null;

    // Restore state after page reload
    this._restoreState();

    // Setup visibility change handler to keep playback alive
    this._setupVisibilityHandler();

    // Setup keepalive to prevent connection timeout
    this._startKeepalive();
  }

  setConfig(config) {
    this.config = { name: config.name || 'Radio Browser', entity: config.entity || null, ...config };
    // Only use config entity if no saved state exists (don't override user's selection)
    if (this.config.entity && !this._selectedMediaPlayer) {
      this._selectedMediaPlayer = this.config.entity;
    }
    this.render();
  }

  set hass(hass) {
    const oldHass = this._hass;
    this._hass = hass;

    if (!oldHass || Object.keys(oldHass.states).length !== Object.keys(hass.states).length) {
      this.updateMediaPlayers();
    }

    if (this._selectedMediaPlayer && this._countries.length === 0) {
      this.loadCountries();
    }

    this.updateDisplay();
  }

  // Favorites management
  loadFavorites() {
    try {
      const stored = localStorage.getItem('radio_favorites');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  saveFavorites() {
    try {
      localStorage.setItem('radio_favorites', JSON.stringify(this._favorites));
    } catch (e) {
      console.error('Error saving favorites:', e);
    }
  }

  // Custom stations management (YouTube, MP3)
  loadCustomStations() {
    try {
      const stored = localStorage.getItem('radio_custom_stations');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  saveCustomStations() {
    try {
      localStorage.setItem('radio_custom_stations', JSON.stringify(this._customStations));
    } catch (e) {
      console.error('Error saving custom stations:', e);
    }
  }

  // YouTube URL handling
  parseYouTubeUrl(url) {
    // Support various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  addYouTubeUrl() {
    const choice = confirm('What do you want to add?\n\nOK = YouTube URL (requires VLC or YouTube-compatible HA media player)\nCancel = Direct MP3/Stream URL (plays directly in browser)');

    if (choice) {
      // YouTube URL mode
      const url = prompt('Enter YouTube URL or Video ID:\n\nExample:\n- https://www.youtube.com/watch?v=dQw4w9WgXcQ\n- dQw4w9WgXcQ');
      if (!url) return;

      const videoId = this.parseYouTubeUrl(url.trim());
      if (!videoId) {
        alert('Invalid YouTube URL!\n\nPlease enter:\n- Full URL: https://www.youtube.com/watch?v=VIDEO_ID\n- Short URL: https://youtu.be/VIDEO_ID\n- Or just the Video ID');
        return;
      }

      const title = prompt('Enter a name for this station:', `YouTube: ${videoId}`);
      if (!title) return;

      const station = {
        title: title,
        media_content_id: `https://www.youtube.com/watch?v=${videoId}`,
        media_content_type: 'music',
        source: 'youtube',
        can_play: true
      };

      this._customStations.push(station);
      this.saveCustomStations();
      this.refreshStationList();
      alert('✅ YouTube station added!\n\n⚠️ IMPORTANT:\nYouTube playback requires a Home Assistant media player with YouTube support:\n- VLC media player\n- Kodi\n- Plex\n- Or other YouTube-compatible player\n\nIt will NOT work with browser_mod or simple audio players.');
    } else {
      // Direct audio stream URL mode
      const url = prompt('Enter direct audio stream URL:\n\nExample:\n- http://stream.example.com/radio.mp3\n- https://ice1.somafm.com/groovesalad-128-mp3');
      if (!url || !url.trim()) return;

      const title = prompt('Enter a name for this station:', 'Custom Stream');
      if (!title) return;

      const station = {
        title: title,
        media_content_id: url.trim(),
        media_content_type: 'audio/mpeg',
        source: 'custom_stream',
        can_play: true
      };

      this._customStations.push(station);
      this.saveCustomStations();
      this.refreshStationList();
      alert('✅ Audio stream added successfully!\n\nThis will play directly in your browser.');
    }
  }

  // Local MP3 file handling
  addLocalMP3() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/mp3,audio/mpeg,audio/*';
    input.multiple = true;

    input.onchange = async (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      let addedCount = 0;

      for (const file of files) {
        try {
          // Read file as base64 data URL for persistence
          const dataUrl = await this.readFileAsDataURL(file);

          const station = {
            title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
            media_content_id: dataUrl,
            media_content_type: 'audio/mpeg',
            source: 'local_mp3',
            can_play: true,
            fileName: file.name
          };

          this._customStations.push(station);
          addedCount++;
        } catch (error) {
          console.error('Error reading file:', file.name, error);
          alert(`Error reading file ${file.name}: ${error.message}`);
        }
      }

      if (addedCount > 0) {
        this.saveCustomStations();
        this.refreshStationList();
        alert(`Added ${addedCount} MP3 file(s) successfully!`);
      }
    };

    input.click();
  }

  // Read file as data URL (base64) for persistence
  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  // Check if media player is likely to support YouTube
  isYouTubeCompatiblePlayer(entityId) {
    const id = entityId.toLowerCase();
    // List of player types that typically support YouTube
    const compatibleKeywords = ['vlc', 'kodi', 'plex', 'cast', 'chromecast', 'youtube', 'mpv', 'mopidy'];
    return compatibleKeywords.some(keyword => id.includes(keyword));
  }

  // Get human-readable error message for audio errors
  getAudioErrorMessage(errorCode) {
    switch (errorCode) {
      case 1: // MEDIA_ERR_ABORTED
        return 'Playback aborted by user';
      case 2: // MEDIA_ERR_NETWORK
        return 'Network error - check your connection';
      case 3: // MEDIA_ERR_DECODE
        return 'File format error - corrupt or unsupported format';
      case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
        return 'File not supported - unsupported audio format or CORS issue';
      default:
        return 'Unknown playback error';
    }
  }

  // Refresh station list to include custom stations
  refreshStationList() {
    // If we have a country selected, reload stations from that country
    if (this._selectedCountry) {
      this.loadStationsByCountry(this._selectedCountry);
    } else {
      // Otherwise just show custom stations and favorites
      this.updatePlaylist();
    }
  }

  // Remove custom station
  removeCustomStation(station) {
    if (!station) {
      console.error('No station provided for removal');
      return;
    }

    const index = this._customStations.findIndex(s => s.media_content_id === station.media_content_id);
    if (index >= 0) {
      this._customStations.splice(index, 1);
      this.saveCustomStations();
      this.refreshStationList();
      console.log('Removed custom station:', station.title);
    } else {
      console.error('Station not found in custom stations:', station);
    }
  }

  toggleFavorite(station) {
    const index = this._favorites.findIndex(fav => fav.media_content_id === station.media_content_id);
    if (index >= 0) {
      this._favorites.splice(index, 1);
    } else {
      this._favorites.push(station);
    }
    this.saveFavorites();
    this.updatePlaylist();
  }

  isFavorite(station) {
    return this._favorites.some(fav => fav.media_content_id === station.media_content_id);
  }

  // Export/Import favorites
  exportFavorites() {
    const data = {
      version: '1.0',
      exported: new Date().toISOString(),
      favorites: this._favorites
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `radio-favorites-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importFavorites() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.favorites && Array.isArray(data.favorites)) {
            this._favorites = data.favorites;
            this.saveFavorites();
            this.updatePlaylist();
            alert(`Imported ${data.favorites.length} favorite stations!`);
          } else {
            alert('Invalid file format');
          }
        } catch (error) {
          alert('Error importing favorites: ' + error.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // State persistence to survive page reloads
  _saveState() {
    try {
      const state = {
        selectedMediaPlayer: this._selectedMediaPlayer,
        selectedCountry: this._selectedCountry,
        currentStationIndex: this._currentStationIndex,
        isPlaying: this._isPlaying,
        volume: this._volume,
        searchQuery: this._searchQuery,
        timestamp: Date.now()
      };
      localStorage.setItem('radio_card_state', JSON.stringify(state));
    } catch (e) {
      console.error('Error saving state:', e);
    }
  }

  _restoreState() {
    try {
      const stored = localStorage.getItem('radio_card_state');
      if (!stored) return;

      const state = JSON.parse(stored);
      // Only restore if state is less than 30 minutes old
      if (Date.now() - state.timestamp < 30 * 60 * 1000) {
        this._selectedMediaPlayer = state.selectedMediaPlayer;
        this._selectedCountry = state.selectedCountry;
        this._currentStationIndex = state.currentStationIndex;
        this._searchQuery = state.searchQuery || '';
        this._volume = state.volume || 10;
        // Don't auto-restore playing state, user needs to click play
      }
    } catch (e) {
      console.error('Error restoring state:', e);
    }
  }

  // Mute functionality
  toggleMute() {
    if (!this._hass || !this._selectedMediaPlayer) return;

    const volumeSlider = this.shadowRoot.querySelector('.volume-slider');
    if (!volumeSlider) return;

    if (this._isMuted) {
      // Unmute - restore previous volume
      this._isMuted = false;
      volumeSlider.value = this._volumeBeforeMute;
      this.handleVolumeChange({ target: { value: this._volumeBeforeMute } });
    } else {
      // Mute - save current volume and set to 0
      this._volumeBeforeMute = parseInt(volumeSlider.value);
      this._isMuted = true;
      volumeSlider.value = 0;
      this.handleVolumeChange({ target: { value: 0 } });
    }

    // Update mute button icon
    this.updateMuteButton();
  }

  updateMuteButton() {
    const muteBtn = this.shadowRoot.querySelector('.btn-mute');
    if (muteBtn) {
      muteBtn.textContent = this._isMuted ? '🔇' : '🔊';
      muteBtn.title = this._isMuted ? 'Unmute' : 'Mute';
    }
  }

  // Sleep timer functionality
  setSleepTimer(minutes) {
    // Clear existing timer
    if (this._sleepTimerInterval) {
      clearInterval(this._sleepTimerInterval);
      this._sleepTimerInterval = null;
    }

    if (minutes === 0) {
      this._sleepTimer = null;
      this._sleepTimerMinutes = 0;
      this.updateSleepTimerDisplay();
      // Close the menu
      this.closeSleepTimerMenu();
      return;
    }

    this._sleepTimerMinutes = minutes;
    this._sleepTimer = Date.now() + (minutes * 60 * 1000);

    // Update display every second
    this._sleepTimerInterval = setInterval(() => {
      const remaining = this._sleepTimer - Date.now();

      if (remaining <= 0) {
        // Timer expired - stop playback
        this.stop();
        clearInterval(this._sleepTimerInterval);
        this._sleepTimerInterval = null;
        this._sleepTimer = null;
        this._sleepTimerMinutes = 0;
        this.updateSleepTimerDisplay();
      } else {
        this.updateSleepTimerDisplay();
      }
    }, 1000);

    this.updateSleepTimerDisplay();

    // Close the menu after setting timer
    this.closeSleepTimerMenu();
  }

  updateSleepTimerDisplay() {
    const display = this.shadowRoot.querySelector('.sleep-timer-display');
    if (!display) return;

    if (!this._sleepTimer) {
      display.textContent = '';
      display.style.display = 'none';
      return;
    }

    const remaining = Math.max(0, this._sleepTimer - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    display.textContent = `⏲️ ${minutes}:${seconds.toString().padStart(2, '0')}`;
    display.style.display = 'block';
  }

  toggleSleepTimerMenu() {
    const menu = this.shadowRoot.querySelector('.sleep-timer-menu');
    if (menu) {
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
  }

  closeSleepTimerMenu() {
    const menu = this.shadowRoot.querySelector('.sleep-timer-menu');
    if (menu) {
      menu.style.display = 'none';
    }
  }

  // Search functionality
  handleSearchInput(e) {
    this._searchQuery = e.target.value.toLowerCase();
    this.updatePlaylist();
  }

  getFilteredStations() {
    // If no country selected, show custom stations and favorites
    let stations = this._stations.length > 0 ? this._stations : [...this._customStations, ...this._favorites];

    if (this._searchQuery) {
      stations = stations.filter(station =>
        station.title.toLowerCase().includes(this._searchQuery)
      );
    }
    return stations;
  }

  // Theme management
  setTheme(theme) {
    this._theme = theme;
    localStorage.setItem('radio_theme', theme);

    // Store visualizer state before re-render
    const wasPlaying = this._visualizerInterval !== null;

    this.render();

    // Restart visualizer if it was running
    if (wasPlaying && this._isPlaying) {
      this.startVisualizer();
    }
  }

  // Visualizer style management
  setVisualizerStyle(style) {
    this._visualizerStyle = style;
    localStorage.setItem('radio_visualizer_style', style);
    this.stopVisualizer();
    if (this._isPlaying) {
      this.startVisualizer();
    }
  }

  // Navigation
  async playPrevious() {
    if (this._currentStationIndex > 0) {
      const newIndex = this._currentStationIndex - 1;
      await this.playStation(this._stations[newIndex], newIndex);
    }
  }

  async playNext() {
    if (this._currentStationIndex < this._stations.length - 1) {
      const newIndex = this._currentStationIndex + 1;
      await this.playStation(this._stations[newIndex], newIndex);
    }
  }

  updateMediaPlayers() {
    if (!this._hass) return;

    this._mediaPlayers = Object.keys(this._hass.states)
      .filter(entity_id => entity_id.startsWith('media_player.'))
      .map(entity_id => ({
        entity_id,
        name: this._hass.states[entity_id].attributes.friendly_name || entity_id
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Only auto-select first player if user hasn't selected one yet
    // Don't reset selection if player temporarily disappears from states
    if (!this._selectedMediaPlayer) {
      if (this._mediaPlayers.length > 0) {
        this._selectedMediaPlayer = this._mediaPlayers[0].entity_id;
      }
    }

    const selectEl = this.shadowRoot?.querySelector('.player-select');
    if (selectEl) {
      this.updatePlayerSelect();
    }
  }

  updatePlayerSelect() {
    const selectEl = this.shadowRoot.querySelector('.player-select');
    if (!selectEl) return;

    selectEl.innerHTML = '<option value="">Select Player...</option>';

    // Check if selected player is in the list
    const selectedPlayerInList = this._mediaPlayers.some(p => p.entity_id === this._selectedMediaPlayer);

    // Add all available players
    this._mediaPlayers.forEach(player => {
      const option = document.createElement('option');
      option.value = player.entity_id;
      option.textContent = player.name;
      option.selected = player.entity_id === this._selectedMediaPlayer;
      selectEl.appendChild(option);
    });

    // If selected player is not in list (temporarily unavailable), show it anyway
    if (this._selectedMediaPlayer && !selectedPlayerInList) {
      const option = document.createElement('option');
      option.value = this._selectedMediaPlayer;
      option.textContent = `${this._selectedMediaPlayer} (temporarily unavailable)`;
      option.selected = true;
      selectEl.appendChild(option);
    }
  }

  async loadCountries() {
    if (!this._hass || !this._selectedMediaPlayer) return;
    if (!this._hass.states[this._selectedMediaPlayer]) return;

    try {
      const result = await this._hass.callWS({
        type: 'media_player/browse_media',
        entity_id: this._selectedMediaPlayer,
        media_content_id: 'media-source://radio_browser',
        media_content_type: 'app'
      });

      if (result && result.children) {
        this._countries = result.children
          .filter(item => item.media_content_id && item.media_content_id.includes('/country/') && item.can_expand)
          .sort((a, b) => a.title.localeCompare(b.title));

        this.updateCountrySelect();
      }
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  }

  updateCountrySelect() {
    const selectEl = this.shadowRoot.querySelector('.country-select');
    if (!selectEl) return;

    selectEl.innerHTML = '<option value="">Select Country...</option>';

    this._countries.forEach(country => {
      const option = document.createElement('option');
      option.value = country.media_content_id;
      option.textContent = country.title;
      option.selected = country.media_content_id === this._selectedCountry;
      selectEl.appendChild(option);
    });
  }

  async loadStationsByCountry(countryId) {
    if (!this._hass || !this._selectedMediaPlayer || !countryId) return;

    this.updatePlaylist();

    try {
      const result = await this._hass.callWS({
        type: 'media_player/browse_media',
        entity_id: this._selectedMediaPlayer,
        media_content_id: countryId,
        media_content_type: 'app'
      });

      if (result && result.children) {
        const radioStations = result.children.filter(item => item.can_play || !item.children);
        // Merge radio stations with custom stations
        this._stations = [...radioStations, ...this._customStations];
        this.updatePlaylist();
      }
    } catch (error) {
      console.error('Error loading stations:', error);
    }
  }

  handleMediaPlayerChange(e) {
    this._selectedMediaPlayer = e.target.value;
    this._countries = [];
    this._stations = [];
    this._selectedCountry = '';
    this._currentStationIndex = -1;

    // Save selected media player to survive page reloads
    this._saveState();

    if (this._selectedMediaPlayer) {
      this.loadCountries();
    } else {
      this.updatePlaylist();
    }
  }

  handleCountryChange(e) {
    this._selectedCountry = e.target.value;
    this._currentStationIndex = -1;

    // Save selected country to survive page reloads
    this._saveState();

    if (this._selectedCountry) {
      this.loadStationsByCountry(this._selectedCountry);
    } else {
      this._stations = [];
      this.updatePlaylist();
    }
  }

  async playStation(station, index) {
    // Validate station object
    if (!station || !station.media_content_id) {
      console.error('Invalid station object:', station);
      return;
    }

    // For local MP3 and custom streams, use direct browser playback
    if (station.source === 'local_mp3' || station.source === 'custom_stream') {
      this.playDirectInBrowser(station, index);
      return;
    }

    // Check if browser_mod player is selected
    const entity = this._hass?.states[this._selectedMediaPlayer];
    const isBrowserPlayer = entity && entity.entity_id && entity.entity_id.includes('browser');

    // For browser_mod players, use direct HTML5 playback for radio stations
    // This prevents timeout issues with browser_mod API
    if (isBrowserPlayer && station.source !== 'youtube') {
      console.log('Using direct playback for browser_mod player to avoid timeout issues');
      this.playDirectInBrowser(station, index);
      return;
    }

    // For YouTube and non-browser players, use Home Assistant media player
    if (!this._hass || !this._selectedMediaPlayer) return;

    try {
      // Set safe default volume (10%) before playing if volume is too high or not set
      if (entity && (entity.attributes.volume_level === undefined || entity.attributes.volume_level > 0.3)) {
        await this._hass.callService('media_player', 'volume_set', {
          entity_id: this._selectedMediaPlayer,
          volume_level: 0.10
        });
        // Update slider to reflect safe volume
        const volumeSlider = this.shadowRoot.querySelector('.volume-slider');
        if (volumeSlider) volumeSlider.value = 10;
      }

      console.log('Playing station:', station.title, 'ID:', station.media_content_id, 'Type:', station.media_content_type);

      // Special handling for YouTube
      if (station.source === 'youtube') {
        // Check if player supports YouTube
        const playerName = entity.attributes.friendly_name || entity.entity_id;
        if (!this.isYouTubeCompatiblePlayer(entity.entity_id)) {
          const proceed = confirm(`⚠️ Player "${playerName}" may not support YouTube playback.\n\nYouTube works best with:\n- VLC media player\n- Kodi\n- Plex\n- Cast devices\n\nDo you want to try anyway?`);
          if (!proceed) {
            return;
          }
        }
      }

      // Call play_media service
      await this._hass.callService('media_player', 'play_media', {
        entity_id: this._selectedMediaPlayer,
        media_content_id: station.media_content_id,
        media_content_type: station.media_content_type
      });

      // Stop direct playback if it was running
      if (this._audioElement) {
        this._audioElement.pause();
        this._isUsingDirectPlayback = false;
      }

      this._currentStationIndex = index;
      this._selectedStationIndex = index;
      this._isPlaying = true;

      // Request wake lock to keep playback active when page is hidden
      this._requestWakeLock();

      // Store station metadata for display
      this._currentStationMetadata = {
        title: station.title,
        media_content_id: station.media_content_id,
        source: station.source || 'radio',
        // Extract additional metadata if available
        bitrate: this.extractBitrate(station),
        codec: this.extractCodec(station),
        country: this.extractCountry(station)
      };

      // Save state to survive page reloads
      this._saveState();

      this.updatePlaylistSelection();
      this.updateStationInfo();

      // Wait longer for browser player to actually start playing
      const waitTime = isBrowserPlayer ? 2000 : 1500;
      setTimeout(() => {
        const currentEntity = this._hass.states[this._selectedMediaPlayer];
        if (currentEntity && currentEntity.state === 'playing') {
          this.startVisualizer();
        }
      }, waitTime);
    } catch (error) {
      console.error('Error playing station:', error);
      alert(`Error playing station: ${error.message}`);
      // Reset state on error
      this._isPlaying = false;
      this.stopVisualizer();
    }
  }

  // Play custom stations directly in browser
  playDirectInBrowser(station, index) {
    console.log('Playing directly in browser:', station.title, 'Type:', station.source);

    // Initialize audio element if not exists
    if (!this._audioElement) {
      this._audioElement = this.shadowRoot.querySelector('.direct-audio');
      if (!this._audioElement) {
        console.error('Audio element not found in shadow DOM');
        return;
      }

      // Setup audio event listeners
      this._audioElement.addEventListener('play', () => {
        this._isPlaying = true;
        this.startVisualizer();
      });

      this._audioElement.addEventListener('pause', () => {
        this._isPlaying = false;
        this.stopVisualizer();
      });

      this._audioElement.addEventListener('ended', () => {
        this._isPlaying = false;
        this.stopVisualizer();
        // Auto-play next if available
        this.playNext();
      });

      this._audioElement.addEventListener('error', (e) => {
        console.error('Audio playback error:', e, this._audioElement.error);
        const errorMsg = this._audioElement.error ?
          this.getAudioErrorMessage(this._audioElement.error.code) :
          'Unknown error';
        alert(`❌ Playback Error\n\n${errorMsg}\n\nFile: ${this._currentStationMetadata?.title || 'Unknown'}`);
        this._isPlaying = false;
        this.stopVisualizer();
      });
    }

    // Stop any Home Assistant playback
    if (this._hass && this._selectedMediaPlayer) {
      this._hass.callService('media_player', 'media_stop', {
        entity_id: this._selectedMediaPlayer
      }).catch(err => console.log('Stop error:', err));
    }

    // Set source based on type
    if (station.source === 'local_mp3' || station.source === 'custom_stream') {
      // Local MP3 or custom stream - use URL directly
      this._audioElement.src = station.media_content_id;
    } else {
      console.error('Unsupported source type for direct playback:', station.source);
      return;
    }

    // Set volume from slider
    const volumeSlider = this.shadowRoot.querySelector('.volume-slider');
    if (volumeSlider) {
      this._audioElement.volume = parseInt(volumeSlider.value) / 100;
    }

    // Play the audio
    this._audioElement.play().then(() => {
      this._isUsingDirectPlayback = true;
      this._currentStationIndex = index;
      this._selectedStationIndex = index;
      this._isPlaying = true;

      // Request wake lock to keep playback active when page is hidden
      this._requestWakeLock();

      // Store station metadata for display
      this._currentStationMetadata = {
        title: station.title,
        media_content_id: station.media_content_id,
        source: station.source || 'local',
        bitrate: this.extractBitrate(station),
        codec: this.extractCodec(station),
        country: this.extractCountry(station)
      };

      this.updatePlaylistSelection();
      this.updateStationInfo();
      this._saveState();
    }).catch(err => {
      console.error('Play error:', err);
      alert(`Error playing: ${err.message}`);
      this._isPlaying = false;
    });
  }

  // Extract metadata from station object
  extractBitrate(station) {
    // Radio Browser API includes bitrate in the media_content_id or title sometimes
    if (station.title && station.title.includes('kbps')) {
      const match = station.title.match(/(\d+)\s*kbps/i);
      if (match) return match[1] + ' kbps';
    }
    // Could also check station object properties if available
    return null;
  }

  extractCodec(station) {
    if (station.media_content_id) {
      const url = station.media_content_id.toLowerCase();
      if (url.includes('.mp3') || url.includes('mp3')) return 'MP3';
      if (url.includes('.aac') || url.includes('aac')) return 'AAC';
      if (url.includes('.ogg') || url.includes('ogg')) return 'OGG';
      if (url.includes('flac')) return 'FLAC';
    }
    return null;
  }

  extractCountry(station) {
    // The country is stored in _selectedCountry when browsing by country
    if (this._selectedCountry) {
      // Find the country object to get its title
      const country = this._countries.find(c => c.media_content_id === this._selectedCountry);
      return country ? country.title : null;
    }
    return null;
  }

  updateStationInfo() {
    const infoEl = this.shadowRoot.querySelector('.station-info');
    if (!infoEl || !this._currentStationMetadata) return;

    const parts = [];

    // Show source for custom stations
    if (this._currentStationMetadata.source === 'youtube') {
      parts.push('▶️ YouTube');
    } else if (this._currentStationMetadata.source === 'local_mp3') {
      parts.push('🎵 Local MP3');
    } else if (this._currentStationMetadata.source === 'custom_stream') {
      parts.push('🌐 Custom Stream');
    }

    if (this._currentStationMetadata.country) {
      parts.push(`📍 ${this._currentStationMetadata.country}`);
    }
    if (this._currentStationMetadata.codec) {
      parts.push(`🎵 ${this._currentStationMetadata.codec}`);
    }
    if (this._currentStationMetadata.bitrate) {
      parts.push(`📊 ${this._currentStationMetadata.bitrate}`);
    }

    infoEl.textContent = parts.join(' • ');
    infoEl.style.display = parts.length > 0 ? 'block' : 'none';
  }

  selectStation(index) {
    this._selectedStationIndex = index;
    this.updatePlaylistSelection();
  }

  updatePlaylistSelection() {
    // Just update CSS classes without rebuilding entire playlist
    const playlistEl = this.shadowRoot.querySelector('.playlist-items');
    if (!playlistEl) return;

    playlistEl.querySelectorAll('.playlist-item').forEach((item, idx) => {
      item.classList.remove('current', 'selected');
      if (idx === this._currentStationIndex) item.classList.add('current');
      if (idx === this._selectedStationIndex) item.classList.add('selected');
    });
  }

  async togglePlay() {
    // If using direct playback, toggle audio element
    if (this._isUsingDirectPlayback && this._audioElement) {
      if (this._audioElement.paused) {
        this._audioElement.play();
      } else {
        this._audioElement.pause();
      }
      return;
    }

    if (!this._hass || !this._selectedMediaPlayer) return;

    const entity = this._hass.states[this._selectedMediaPlayer];
    if (!entity) return;

    // If nothing is playing or paused, play selected or first station
    if (entity.state !== 'playing' && entity.state !== 'paused') {
      // If we have a selected station, play it
      if (this._selectedStationIndex >= 0) {
        const station = this._stations[this._selectedStationIndex];
        if (station) {
          await this.playStation(station, this._selectedStationIndex);
          return;
        }
      }

      // If no station selected but we have stations, play first one
      if (this._stations.length > 0) {
        await this.playStation(this._stations[0], 0);
        return;
      }

      return; // No stations available
    }

    // Otherwise toggle play/pause
    try {
      await this._hass.callService('media_player', 'media_play_pause', {
        entity_id: this._selectedMediaPlayer
      });
    } catch (error) {
      console.error('Error toggling play:', error);
    }
  }

  async stop() {
    // Stop direct playback if active
    if (this._isUsingDirectPlayback && this._audioElement) {
      this._audioElement.pause();
      this._audioElement.currentTime = 0;
      this._isUsingDirectPlayback = false;
      this._isPlaying = false;
      this._currentStationIndex = -1;
      this._currentStationMetadata = null;
      this.stopVisualizer();
      this.updatePlaylistSelection();
      this.updateStationInfo();
      this._saveState();
      // Release wake lock when stopping
      this._releaseWakeLock();
      return;
    }

    if (!this._hass || !this._selectedMediaPlayer) return;

    try {
      await this._hass.callService('media_player', 'media_stop', {
        entity_id: this._selectedMediaPlayer
      });
      this._isPlaying = false;
      this._currentStationIndex = -1;
      this._currentStationMetadata = null;
      this.stopVisualizer(); // Immediately stop visualizer
      this.updatePlaylistSelection();
      this.updateStationInfo();
      this._saveState();
      // Release wake lock when stopping
      this._releaseWakeLock();
    } catch (error) {
      console.error('Error stopping:', error);
    }
  }

  async handleVolumeChange(e) {
    const volumePercent = parseFloat(e.target.value);
    const volume = volumePercent / 100; // Convert to 0.0 - 1.0

    // Update slider gradient
    const volumeSlider = this.shadowRoot.querySelector('.volume-slider');
    if (volumeSlider) {
      volumeSlider.style.setProperty('--volume-percent', volumePercent + '%');
    }

    // Update direct playback volume if active
    if (this._audioElement) {
      this._audioElement.volume = volume;
    }

    // Also update Home Assistant player volume if connected
    if (this._hass && this._selectedMediaPlayer) {
      try {
        await this._hass.callService('media_player', 'volume_set', {
          entity_id: this._selectedMediaPlayer,
          volume_level: volume
        });
      } catch (error) {
        console.error('Error setting volume:', error);
      }
    }
  }

  updatePlaylist() {
    const playlistEl = this.shadowRoot.querySelector('.playlist-items');
    if (!playlistEl) return;

    const filteredStations = this.getFilteredStations();
    const showingFavorites = this._stations.length === 0 && this._favorites.length > 0;

    if (filteredStations.length === 0) {
      const message = this._searchQuery ?
        'No stations found' :
        (showingFavorites ? 'No favorite stations yet. Add some by clicking ★' : 'Select a country to see stations');
      playlistEl.innerHTML = `<div style="padding: 16px; color: #b3b3b3; text-align: center;">${message}</div>`;
      return;
    }

    // Show header for favorites
    const headerHtml = showingFavorites ?
      '<div style="padding: 8px 12px; color: #1DB954; font-size: 11px; font-weight: 600;">⭐ Favorite Stations</div>' : '';

    playlistEl.innerHTML = headerHtml + filteredStations.map((station, displayIndex) => {
      const sourceList = this._stations.length > 0 ? this._stations : this._favorites;
      const actualIndex = sourceList.indexOf(station);
      const classes = [];
      if (actualIndex === this._currentStationIndex) classes.push('current');
      if (actualIndex === this._selectedStationIndex) classes.push('selected');
      const isFav = this.isFavorite(station);
      const isCustom = station.source === 'youtube' || station.source === 'local_mp3' || station.source === 'custom_stream';
      const sourceBadge = station.source === 'youtube' ? '▶️' : (station.source === 'local_mp3' ? '🎵' : (station.source === 'custom_stream' ? '🌐' : ''));

      // Store station data directly in the element for reliable access
      return `
        <div class="playlist-item ${classes.join(' ')}"
             data-index="${actualIndex}"
             data-display-index="${displayIndex}"
             data-is-favorite="${showingFavorites}">
          <span class="item-number">${(displayIndex + 1)}.</span>
          ${sourceBadge ? `<span class="source-badge">${sourceBadge}</span>` : ''}
          <span class="item-title">${this.escapeHtml(station.title)}</span>
          ${isCustom ? '<span class="remove-icon" data-display-index="' + displayIndex + '">🗑️</span>' : ''}
          <span class="favorite-icon ${isFav ? 'active' : ''}" data-display-index="${displayIndex}">★</span>
        </div>
      `;
    }).join('');

    // Add event listeners
    playlistEl.querySelectorAll('.playlist-item').forEach((item, itemIndex) => {
      const starBtn = item.querySelector('.favorite-icon');
      const removeBtn = item.querySelector('.remove-icon');
      const actualIndex = parseInt(item.dataset.index);
      const displayIndex = parseInt(item.dataset.displayIndex);
      const isFavoriteList = item.dataset.isFavorite === 'true';
      const sourceList = isFavoriteList ? this._favorites : this._stations;

      // Get the actual station from filteredStations using display index
      const station = filteredStations[displayIndex];

      // Favorite toggle
      if (starBtn) {
        starBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (station) {
            this.toggleFavorite(station);
          }
        });
      }

      // Remove custom station
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (station && confirm(`Remove "${station.title}"?`)) {
            console.log('Removing station:', station);
            this.removeCustomStation(station);
          }
        });
      }

      // Select station
      item.addEventListener('click', () => {
        this.selectStation(actualIndex);
      });

      // Play station on double-click
      item.addEventListener('dblclick', () => {
        if (station) {
          this.playStation(station, actualIndex);
        }
      });
    });
  }

  updateDisplay() {
    if (!this._hass || !this._selectedMediaPlayer) return;

    const entity = this._hass.states[this._selectedMediaPlayer];
    if (!entity) return;

    const titleEl = this.shadowRoot.querySelector('.track-title');
    if (titleEl && entity.attributes.media_title) {
      titleEl.textContent = entity.attributes.media_title;
    }

    // Update volume slider and gradient
    const volumeSlider = this.shadowRoot.querySelector('.volume-slider');
    if (volumeSlider && entity.attributes.volume_level !== undefined) {
      const volumePercent = Math.round(entity.attributes.volume_level * 100);
      volumeSlider.value = volumePercent;
      volumeSlider.style.setProperty('--volume-percent', volumePercent + '%');
    }

    // Update visualizer based on play state
    if (entity.state === 'playing') {
      this.startVisualizer();
    } else {
      this.stopVisualizer();
    }

    // Update station info if playing
    if (this._currentStationMetadata) {
      this.updateStationInfo();
    }
  }

  startVisualizer() {
    if (this._visualizerInterval) return; // Already running

    const canvas = this.shadowRoot.querySelector('.visualizer');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const primaryColor = this.getThemeColors().primary;

    if (this._visualizerStyle === 'bars') {
      this.startBarsVisualizer(ctx, canvas, primaryColor);
    } else if (this._visualizerStyle === 'waveform') {
      this.startWaveformVisualizer(ctx, canvas, primaryColor);
    } else if (this._visualizerStyle === 'circle') {
      this.startCircleVisualizer(ctx, canvas, primaryColor);
    }
  }

  startBarsVisualizer(ctx, canvas, color) {
    const bars = 20;
    const barWidth = Math.floor(canvas.width / bars);
    const heights = new Array(bars).fill(0);

    this._visualizerInterval = setInterval(() => {
      ctx.fillStyle = this.getThemeColors().visualizerBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < bars; i++) {
        heights[i] = heights[i] * 0.7 + Math.random() * canvas.height * 0.3;
        const barHeight = Math.floor(heights[i]);
        const x = i * barWidth;
        const y = canvas.height - barHeight;
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
      }
    }, 50);
  }

  startWaveformVisualizer(ctx, canvas, color) {
    const points = 60;
    const heights = new Array(points).fill(canvas.height / 2);
    let offset = 0;

    this._visualizerInterval = setInterval(() => {
      ctx.fillStyle = this.getThemeColors().visualizerBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < points; i++) {
        const targetHeight = canvas.height / 2 + (Math.sin((i + offset) * 0.3) * Math.random() * canvas.height * 0.3);
        heights[i] = heights[i] * 0.8 + targetHeight * 0.2;
        const x = (canvas.width / points) * i;
        if (i === 0) {
          ctx.moveTo(x, heights[i]);
        } else {
          ctx.lineTo(x, heights[i]);
        }
      }
      ctx.stroke();
      offset += 0.5;
    }, 50);
  }

  startCircleVisualizer(ctx, canvas, color) {
    const bars = 30;
    const heights = new Array(bars).fill(0);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const baseRadius = Math.min(centerX, centerY) * 0.3;

    this._visualizerInterval = setInterval(() => {
      ctx.fillStyle = this.getThemeColors().visualizerBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < bars; i++) {
        heights[i] = heights[i] * 0.7 + Math.random() * 15;
        const angle = (i / bars) * Math.PI * 2;
        const innerRadius = baseRadius;
        const outerRadius = baseRadius + heights[i];

        const x1 = centerX + Math.cos(angle) * innerRadius;
        const y1 = centerY + Math.sin(angle) * innerRadius;
        const x2 = centerX + Math.cos(angle) * outerRadius;
        const y2 = centerY + Math.sin(angle) * outerRadius;

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }, 50);
  }

  getThemeColors() {
    const themes = {
      dark: {
        background: '#121212',
        surface: '#181818',
        surfaceLight: '#282828',
        surfaceLighter: '#333333',
        primary: '#1DB954',
        primaryHover: '#1ed760',
        text: '#ffffff',
        textSecondary: '#b3b3b3',
        textTertiary: '#535353',
        visualizerBg: '#181818'
      },
      light: {
        background: '#ffffff',
        surface: '#f5f5f5',
        surfaceLight: '#e0e0e0',
        surfaceLighter: '#d0d0d0',
        primary: '#1DB954',
        primaryHover: '#1ed760',
        text: '#000000',
        textSecondary: '#666666',
        textTertiary: '#999999',
        visualizerBg: '#f0f0f0'
      },
      custom: {
        background: this.config?.theme_background || '#121212',
        surface: this.config?.theme_surface || '#181818',
        surfaceLight: this.config?.theme_surface_light || '#282828',
        surfaceLighter: this.config?.theme_surface_lighter || '#333333',
        primary: this.config?.theme_primary || '#1DB954',
        primaryHover: this.config?.theme_primary_hover || '#1ed760',
        text: this.config?.theme_text || '#ffffff',
        textSecondary: this.config?.theme_text_secondary || '#b3b3b3',
        textTertiary: this.config?.theme_text_tertiary || '#535353',
        visualizerBg: this.config?.theme_visualizer_bg || '#181818'
      }
    };
    return themes[this._theme] || themes.dark;
  }

  stopVisualizer() {
    if (this._visualizerInterval) {
      clearInterval(this._visualizerInterval);
      this._visualizerInterval = null;

      // Clear canvas with theme background
      const canvas = this.shadowRoot.querySelector('.visualizer');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = this.getThemeColors().visualizerBg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  setupKeyboardShortcuts() {
    if (this._keyboardHandler) return;

    this._keyboardHandler = (e) => {
      // Only handle if card is visible and not typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      switch(e.code) {
        case 'Space':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.adjustVolume(5);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.adjustVolume(-5);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.playPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.playNext();
          break;
      }
    };

    document.addEventListener('keydown', this._keyboardHandler);
  }

  adjustVolume(delta) {
    const volumeSlider = this.shadowRoot.querySelector('.volume-slider');
    if (!volumeSlider) return;

    const currentVolume = parseInt(volumeSlider.value);
    const newVolume = Math.max(0, Math.min(100, currentVolume + delta));
    volumeSlider.value = newVolume;

    this.handleVolumeChange({ target: { value: newVolume } });
  }

  disconnectedCallback() {
    this.stopVisualizer();
    if (this._keyboardHandler) {
      document.removeEventListener('keydown', this._keyboardHandler);
      this._keyboardHandler = null;
    }
    // Clean up sleep timer
    if (this._sleepTimerInterval) {
      clearInterval(this._sleepTimerInterval);
      this._sleepTimerInterval = null;
    }
    // Clean up keepalive interval
    if (this._keepaliveInterval) {
      clearInterval(this._keepaliveInterval);
      this._keepaliveInterval = null;
    }
    // Release wake lock
    this._releaseWakeLock();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  render() {
    const colors = this.getThemeColors();

    // Get current volume from entity or use default
    const currentVolume = this._hass && this._selectedMediaPlayer && this._hass.states[this._selectedMediaPlayer]?.attributes?.volume_level !== undefined
      ? Math.round(this._hass.states[this._selectedMediaPlayer].attributes.volume_level * 100)
      : 10;

    this.shadowRoot.innerHTML = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .winamp-container {
          display: inline-block;
          position: relative;
          width: 100%;
          max-width: 400px;
        }

        /* Main Window - Modern minimalist design with dynamic colors */
        .main-window {
          width: 100%;
          min-height: 116px;
          background: ${colors.background};
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          position: relative;
          overflow: hidden;
        }

        /* Settings bar - below playlist */
        .settings-bar {
          display: flex;
          gap: 8px;
          padding: 12px;
          background: ${colors.background};
          border-radius: 8px;
          margin-top: 8px;
          justify-content: center;
          align-items: center;
          position: relative;
        }

        .settings-btn {
          width: 28px;
          height: 28px;
          background: ${colors.surfaceLight};
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          color: ${colors.textSecondary};
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .settings-btn:hover {
          background: ${colors.surfaceLighter};
          color: ${colors.text};
          transform: scale(1.05);
        }

        .settings-btn:active {
          transform: scale(0.95);
        }

        .settings-menu {
          position: absolute;
          background: ${colors.surfaceLight};
          border-radius: 8px;
          padding: 12px;
          display: none;
          min-width: 200px;
          max-width: 280px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          z-index: 1000;
          border: 1px solid ${colors.surfaceLighter};
          top: auto;
          bottom: 100%;
          right: 0;
          margin-bottom: 4px;
        }

        .settings-menu.active {
          display: block;
        }

        @media (max-width: 600px) {
          .settings-menu {
            right: 0;
            left: 0;
            min-width: auto;
            max-width: 100%;
            margin: 0 12px 4px 12px;
          }
        }

        .settings-group {
          margin-bottom: 12px;
        }

        .settings-group:last-child {
          margin-bottom: 0;
        }

        .settings-label {
          font-size: 10px;
          color: ${colors.textTertiary};
          margin-bottom: 4px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .settings-options {
          display: flex;
          gap: 4px;
        }

        .settings-option {
          flex: 1;
          padding: 6px;
          background: ${colors.surface};
          border: 1px solid transparent;
          border-radius: 4px;
          font-size: 10px;
          color: ${colors.textSecondary};
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }

        .settings-option:hover {
          background: ${colors.surfaceLighter};
          color: ${colors.text};
        }

        .settings-option.active {
          background: ${colors.primary};
          color: white;
          border-color: ${colors.primary};
        }

        .track-title {
          position: absolute;
          top: 12px;
          left: 12px;
          right: 120px;
          height: 18px;
          color: ${colors.text};
          font-size: 11px;
          font-weight: 600;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          line-height: 18px;
          z-index: 1;
        }

        .station-info {
          position: absolute;
          top: 30px;
          left: 12px;
          right: 120px;
          height: 16px;
          color: ${colors.primary};
          font-size: 10px;
          font-weight: 500;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          line-height: 16px;
          z-index: 2;
          background: ${colors.surfaceLight};
          padding: 2px 6px;
          border-radius: 3px;
        }

        .sleep-timer-display {
          position: absolute;
          top: 12px;
          right: 12px;
          height: 18px;
          color: ${colors.primary};
          font-size: 10px;
          font-weight: 600;
          line-height: 18px;
          z-index: 1;
          background: ${colors.surfaceLight};
          padding: 2px 8px;
          border-radius: 4px;
        }

        /* Visualizer */
        .visualizer {
          position: absolute;
          top: 38px;
          left: 12px;
          width: 80px;
          height: 32px;
          background: ${colors.visualizerBg};
          border-radius: 4px;
        }

        @media (max-width: 400px) {
          .visualizer {
            width: 60px;
            height: 28px;
          }
        }

        /* Volume control */
        .volume-control {
          position: absolute;
          top: 78px;
          left: 12px;
          right: 12px;
          height: 26px;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .volume-slider {
          width: 100%;
          height: 6px;
          -webkit-appearance: none;
          background: linear-gradient(to right, ${colors.primary} 0%, ${colors.primary} var(--volume-percent, 50%), ${colors.surfaceLight} var(--volume-percent, 50%), ${colors.surfaceLight} 100%);
          outline: none;
          border-radius: 3px;
          cursor: pointer;
        }

        .volume-slider::-webkit-slider-track {
          width: 100%;
          height: 6px;
          background: transparent;
          border-radius: 3px;
        }

        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: ${colors.primary};
          cursor: pointer;
          border-radius: 50%;
          transition: transform 0.2s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .volume-slider::-webkit-slider-thumb:hover {
          transform: scale(1.3);
          box-shadow: 0 2px 8px rgba(29, 185, 84, 0.5);
        }

        .volume-slider::-moz-range-track {
          width: 100%;
          height: 6px;
          background: ${colors.surfaceLight};
          border-radius: 3px;
        }

        .volume-slider::-moz-range-progress {
          height: 6px;
          background: ${colors.primary};
          border-radius: 3px;
        }

        .volume-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: ${colors.primary};
          cursor: pointer;
          border-radius: 50%;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .volume-slider::-moz-range-thumb:hover {
          transform: scale(1.3);
        }

        /* Control buttons - Modern flat style */
        .control-buttons {
          position: absolute;
          top: 38px;
          right: 12px;
          display: flex;
          gap: 6px;
          align-items: center;
        }

        @media (max-width: 400px) {
          .control-buttons {
            gap: 4px;
          }
        }

        .control-btn {
          width: 36px;
          height: 36px;
          background: ${colors.surfaceLight};
          border-radius: 8px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          color: ${colors.textSecondary};
          transition: all 0.15s ease;
          font-family: system-ui, -apple-system, sans-serif;
        }

        @media (max-width: 400px) {
          .control-btn {
            width: 30px;
            height: 30px;
            font-size: 14px;
          }
        }

        .control-btn:hover {
          background: ${colors.surfaceLighter};
          color: ${colors.text};
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .control-btn:active {
          transform: translateY(0);
          box-shadow: none;
        }

        .btn-play {
          background: ${colors.primary};
          color: white;
          font-size: 18px;
        }

        .btn-play:hover {
          background: ${colors.primaryHover};
          color: white;
        }

        /* Button icons using Unicode symbols */
        .btn-prev::before {
          content: '⏮';
        }

        .btn-play::before {
          content: '▶';
        }

        .btn-pause::before {
          content: '⏸';
        }

        .btn-stop::before {
          content: '⏹';
        }

        .btn-next::before {
          content: '⏭';
        }

        /* Playlist Window - Modern minimalist design */
        .playlist-window {
          width: 100%;
          background: ${colors.background};
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          position: relative;
          margin-top: 8px;
          overflow: hidden;
        }

        /* Search controls at top */
        .playlist-controls {
          padding: 12px;
          background: ${colors.surface};
        }

        .search-input {
          width: 100%;
          height: 36px;
          background: ${colors.surfaceLight};
          color: ${colors.text};
          border: 1px solid transparent;
          border-radius: 4px;
          font-size: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 8px 12px;
          margin-bottom: 8px;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: ${colors.primary};
          background: ${colors.surfaceLighter};
        }

        .search-input::placeholder {
          color: ${colors.textTertiary};
        }

        .player-select, .country-select {
          width: 100%;
          height: 36px;
          background: ${colors.surfaceLight};
          color: ${colors.text};
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 8px 12px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .player-select:hover, .country-select:hover {
          background: ${colors.surfaceLighter};
        }

        .player-select:focus, .country-select:focus {
          outline: 2px solid ${colors.primary};
          outline-offset: -2px;
        }

        .player-select option, .country-select option {
          background: ${colors.surfaceLight};
          color: ${colors.text};
        }

        /* Custom source buttons */
        .custom-sources {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        .custom-source-btn {
          flex: 1;
          height: 32px;
          background: ${colors.surfaceLight};
          color: ${colors.text};
          border: 1px solid ${colors.surfaceLighter};
          border-radius: 4px;
          font-size: 11px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .custom-source-btn:hover {
          background: ${colors.surfaceLighter};
          border-color: ${colors.primary};
          color: ${colors.primary};
          transform: translateY(-1px);
        }

        .custom-source-btn:active {
          transform: translateY(0);
        }

        /* Playlist body */
        .playlist-body {
          min-height: 150px;
          max-height: 400px;
          background: ${colors.background};
          position: relative;
        }

        @media (max-width: 600px) {
          .playlist-body {
            max-height: 300px;
          }
        }

        /* Playlist area */
        .playlist-display {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 8px;
        }

        .playlist-display::-webkit-scrollbar {
          width: 8px;
        }

        .playlist-display::-webkit-scrollbar-track {
          background: ${colors.background};
        }

        .playlist-display::-webkit-scrollbar-thumb {
          background: ${colors.surfaceLight};
          border-radius: 4px;
        }

        .playlist-display::-webkit-scrollbar-thumb:hover {
          background: ${colors.surfaceLighter};
        }

        .playlist-items {
          padding: 4px;
        }

        /* Modern playlist item styling */
        .playlist-item {
          color: ${colors.textSecondary};
          background: transparent;
          font-size: 11px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 8px 12px;
          cursor: pointer;
          display: flex;
          gap: 8px;
          align-items: center;
          border-radius: 4px;
          margin-bottom: 2px;
          transition: all 0.2s;
        }

        .playlist-item:hover {
          background: ${colors.surfaceLight};
          color: ${colors.text};
        }

        .playlist-item.selected {
          background: ${colors.surfaceLight};
          color: ${colors.text};
        }

        .playlist-item.current {
          color: ${colors.primary};
          background: ${colors.surface};
        }

        .item-number {
          color: ${colors.textTertiary};
          min-width: 24px;
          font-size: 10px;
        }

        .item-title {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: inherit;
        }

        .source-badge {
          font-size: 12px;
          margin-right: 4px;
          user-select: none;
        }

        .remove-icon {
          color: ${colors.textTertiary};
          font-size: 12px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
          user-select: none;
          margin-left: 4px;
        }

        .remove-icon:hover {
          color: #ff4444;
          background: ${colors.surfaceLight};
          transform: scale(1.2);
        }

        .favorite-icon {
          color: ${colors.textTertiary};
          font-size: 14px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
          user-select: none;
          margin-left: 4px;
        }

        .favorite-icon:hover {
          color: ${colors.primary};
          background: ${colors.surfaceLight};
          transform: scale(1.2);
        }

        .favorite-icon.active {
          color: ${colors.primary};
        }
      </style>

      <div class="winamp-container">
        <!-- Main Player Window -->
        <div class="main-window">
          <div class="track-title">Radio Browser</div>
          <div class="station-info" style="display: none;"></div>
          <div class="sleep-timer-display" style="display: none;"></div>

          <!-- Visualizer -->
          <canvas class="visualizer" width="80" height="32"></canvas>

          <!-- Control Buttons -->
          <div class="control-buttons">
            <button class="control-btn btn-prev" onclick="this.getRootNode().host.playPrevious()" title="Previous (←)"></button>
            <button class="control-btn btn-play" onclick="this.getRootNode().host.togglePlay()" title="Play (Space)"></button>
            <button class="control-btn btn-pause" onclick="this.getRootNode().host.togglePlay()" title="Pause (Space)"></button>
            <button class="control-btn btn-stop" onclick="this.getRootNode().host.stop()" title="Stop"></button>
            <button class="control-btn btn-next" onclick="this.getRootNode().host.playNext()" title="Next (→)"></button>
          </div>

          <!-- Volume Control -->
          <div class="volume-control">
            <input type="range" class="volume-slider" min="0" max="100" value="${currentVolume}"
                   oninput="this.getRootNode().host.handleVolumeChange(event)"
                   title="Volume (↑↓)">
          </div>
        </div>

        <!-- Playlist Window -->
        <div class="playlist-window">
          <!-- Search controls -->
          <div class="playlist-controls">
            <input type="text" class="search-input" placeholder="🔍 Search stations..."
                   value="${this._searchQuery}"
                   oninput="this.getRootNode().host.handleSearchInput(event)">
            <select class="player-select" onchange="this.getRootNode().host.handleMediaPlayerChange(event)">
              <option value="">Select Player...</option>
            </select>
            <select class="country-select" onchange="this.getRootNode().host.handleCountryChange(event)">
              <option value="">Select Country...</option>
            </select>
            <!-- Custom source buttons -->
            <div class="custom-sources">
              <button class="custom-source-btn" onclick="this.getRootNode().host.addYouTubeUrl()" title="Add YouTube URL">
                <span>▶️</span>
                <span>YouTube</span>
              </button>
              <button class="custom-source-btn" onclick="this.getRootNode().host.addLocalMP3()" title="Add local MP3 files">
                <span>🎵</span>
                <span>MP3 Files</span>
              </button>
            </div>
          </div>

          <!-- Playlist body -->
          <div class="playlist-body">
            <div class="playlist-display">
              <div class="playlist-items"></div>
            </div>
          </div>
        </div>

        <!-- Settings Bar (below playlist) -->
        <div class="settings-bar">
          <button class="settings-btn" onclick="this.getRootNode().host.toggleSettings(event)" title="Settings">⚙️</button>
          <button class="settings-btn btn-mute" onclick="this.getRootNode().host.toggleMute()" title="Mute">🔊</button>
          <button class="settings-btn" onclick="this.getRootNode().host.toggleSleepTimerMenu()" title="Sleep Timer">⏲️</button>

          <!-- Settings Menu -->
          <div class="settings-menu" id="settings-menu">
            <div class="settings-group">
              <div class="settings-label">Theme</div>
              <div class="settings-options">
                <button class="settings-option ${this._theme === 'dark' ? 'active' : ''}"
                        onclick="this.getRootNode().host.setTheme('dark')">Dark</button>
                <button class="settings-option ${this._theme === 'light' ? 'active' : ''}"
                        onclick="this.getRootNode().host.setTheme('light')">Light</button>
                <button class="settings-option ${this._theme === 'custom' ? 'active' : ''}"
                        onclick="this.getRootNode().host.setTheme('custom')">Custom</button>
              </div>
            </div>
            <div class="settings-group">
              <div class="settings-label">Visualizer</div>
              <div class="settings-options">
                <button class="settings-option ${this._visualizerStyle === 'bars' ? 'active' : ''}"
                        onclick="this.getRootNode().host.setVisualizerStyle('bars')">Bars</button>
                <button class="settings-option ${this._visualizerStyle === 'waveform' ? 'active' : ''}"
                        onclick="this.getRootNode().host.setVisualizerStyle('waveform')">Wave</button>
                <button class="settings-option ${this._visualizerStyle === 'circle' ? 'active' : ''}"
                        onclick="this.getRootNode().host.setVisualizerStyle('circle')">Circle</button>
              </div>
            </div>
            <div class="settings-group">
              <div class="settings-label">Favorites</div>
              <div class="settings-options">
                <button class="settings-option" onclick="this.getRootNode().host.exportFavorites()">📤 Export</button>
                <button class="settings-option" onclick="this.getRootNode().host.importFavorites()">📥 Import</button>
              </div>
            </div>
          </div>

          <!-- Sleep Timer Menu -->
          <div class="settings-menu sleep-timer-menu" style="display: none;">
            <div class="settings-group">
              <div class="settings-label">Sleep Timer</div>
              <div class="settings-options">
                <button class="settings-option" onclick="this.getRootNode().host.setSleepTimer(15)">15 min</button>
                <button class="settings-option" onclick="this.getRootNode().host.setSleepTimer(30)">30 min</button>
                <button class="settings-option" onclick="this.getRootNode().host.setSleepTimer(60)">60 min</button>
                <button class="settings-option" onclick="this.getRootNode().host.setSleepTimer(0)">Off</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Hidden audio element for direct browser playback (local MP3) -->
        <audio class="direct-audio" style="display: none;"></audio>
      </div>
    `;

    this.setupEventListeners();
    this.setupKeyboardShortcuts();

    // Restore state after re-render
    if (this._mediaPlayers.length > 0) {
      this.updatePlayerSelect();
    }
    if (this._countries.length > 0) {
      this.updateCountrySelect();
    }
    if (this._stations.length > 0 || this._favorites.length > 0) {
      this.updatePlaylist();
    }
    if (this._hass && this._selectedMediaPlayer) {
      this.updateDisplay();
    }

    // Initialize volume slider gradient on render
    setTimeout(() => {
      const volumeSlider = this.shadowRoot.querySelector('.volume-slider');
      if (volumeSlider) {
        const volumeValue = parseInt(volumeSlider.value) || 10;
        volumeSlider.style.setProperty('--volume-percent', volumeValue + '%');
      }
    }, 0);
  }

  toggleSettings(e) {
    e.stopPropagation();
    const menu = this.shadowRoot.querySelector('.settings-menu');
    const btn = e.currentTarget;

    if (menu) {
      const isActive = menu.classList.contains('active');

      if (!isActive) {
        // Position is handled by CSS (absolute positioning relative to settings-bar)
        menu.classList.add('active');

        // Close menu when clicking outside
        const closeHandler = (event) => {
          const path = event.composedPath();
          if (!path.includes(menu) && !path.includes(btn)) {
            menu.classList.remove('active');
            document.removeEventListener('click', closeHandler);
          }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
      } else {
        menu.classList.remove('active');
      }
    }
  }

  // Keep playback alive when page is hidden/minimized
  _setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      this._pageHidden = document.hidden;

      if (document.hidden) {
        console.log('Page hidden - maintaining playback');
        // Request wake lock if playing to prevent sleep
        this._requestWakeLock();
      } else {
        console.log('Page visible - checking playback state');
        // Release wake lock when page is visible
        this._releaseWakeLock();
        // Verify playback is still active
        if (this._isPlaying) {
          this._verifyPlayback();
        }
      }
    });
  }

  // Keepalive ping to prevent WebSocket timeout
  _startKeepalive() {
    // Clear any existing interval
    if (this._keepaliveInterval) {
      clearInterval(this._keepaliveInterval);
    }

    // Ping every 30 seconds to keep connection alive
    this._keepaliveInterval = setInterval(() => {
      if (this._hass && this._isPlaying) {
        // Check if player is still playing
        if (this._selectedMediaPlayer && this._hass.states[this._selectedMediaPlayer]) {
          const entity = this._hass.states[this._selectedMediaPlayer];
          if (entity.state !== 'playing' && !this._isUsingDirectPlayback) {
            console.warn('Playback stopped unexpectedly, attempting recovery...');
            // Try to resume playback
            this._recoverPlayback();
          }
        }
      }
    }, 30000); // 30 seconds
  }

  // Request wake lock to keep device awake during playback
  async _requestWakeLock() {
    if ('wakeLock' in navigator && this._isPlaying) {
      try {
        this._wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake Lock activated');

        this._wakeLock.addEventListener('release', () => {
          console.log('Wake Lock released');
        });
      } catch (err) {
        console.log('Wake Lock not available:', err);
      }
    }
  }

  // Release wake lock
  async _releaseWakeLock() {
    if (this._wakeLock) {
      try {
        await this._wakeLock.release();
        this._wakeLock = null;
      } catch (err) {
        console.log('Error releasing wake lock:', err);
      }
    }
  }

  // Verify playback is still active
  _verifyPlayback() {
    if (!this._isPlaying) return;

    if (this._isUsingDirectPlayback && this._audioElement) {
      // Check HTML5 audio element
      if (this._audioElement.paused) {
        console.log('Direct playback paused, resuming...');
        this._audioElement.play().catch(err => {
          console.error('Error resuming direct playback:', err);
        });
      }
    } else if (this._hass && this._selectedMediaPlayer) {
      // Check Home Assistant player
      const entity = this._hass.states[this._selectedMediaPlayer];
      if (entity && entity.state !== 'playing') {
        console.log('HA player not playing, attempting recovery...');
        this._recoverPlayback();
      }
    }
  }

  // Attempt to recover playback after interruption
  async _recoverPlayback() {
    if (!this._isPlaying || this._currentStationIndex === -1) return;

    try {
      const station = this._getCurrentStation();
      if (station) {
        console.log('Recovering playback for:', station.title);

        if (this._isUsingDirectPlayback && this._audioElement) {
          // Resume direct playback
          await this._audioElement.play();
        } else if (this._hass && this._selectedMediaPlayer) {
          // Restart HA media player
          await this._hass.callService('media_player', 'play_media', {
            entity_id: this._selectedMediaPlayer,
            media_content_id: station.media_content_id,
            media_content_type: station.media_content_type
          });
        }
      }
    } catch (err) {
      console.error('Error recovering playback:', err);
    }
  }

  // Get current playing station
  _getCurrentStation() {
    const allStations = [...this._favorites, ...this._customStations, ...this._stations];
    return allStations[this._currentStationIndex];
  }

  setupEventListeners() {}

  static getConfigElement() {
    return document.createElement("radio-browser-card-editor");
  }

  static getStubConfig() {
    return { name: "Radio Browser" };
  }

  getCardSize() {
    return 3;
  }
}

customElements.define('radio-browser-card', RadioBrowserCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'radio-browser-card',
  name: 'Radio Browser Card',
  description: 'Modern radio player card for Home Assistant with gradient design and smooth controls'
});
