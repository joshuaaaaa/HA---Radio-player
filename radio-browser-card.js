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

    // Restore state after page reload
    this._restoreState();
  }

  setConfig(config) {
    this.config = { name: config.name || 'Radio Browser', entity: config.entity || null, ...config };
    if (this.config.entity) {
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
      // Only restore if state is less than 5 minutes old
      if (Date.now() - state.timestamp < 5 * 60 * 1000) {
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
    // If no country selected, show favorites
    let stations = this._stations.length > 0 ? this._stations : this._favorites;

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

    if (!this._selectedMediaPlayer || !this._hass.states[this._selectedMediaPlayer]) {
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

    this._mediaPlayers.forEach(player => {
      const option = document.createElement('option');
      option.value = player.entity_id;
      option.textContent = player.name;
      option.selected = player.entity_id === this._selectedMediaPlayer;
      selectEl.appendChild(option);
    });
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

    this._stations = [];
    this.updatePlaylist();

    try {
      const result = await this._hass.callWS({
        type: 'media_player/browse_media',
        entity_id: this._selectedMediaPlayer,
        media_content_id: countryId,
        media_content_type: 'app'
      });

      if (result && result.children) {
        this._stations = result.children.filter(item => item.can_play || !item.children);
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

    if (this._selectedMediaPlayer) {
      this.loadCountries();
    } else {
      this.updatePlaylist();
    }
  }

  handleCountryChange(e) {
    this._selectedCountry = e.target.value;
    this._currentStationIndex = -1;

    if (this._selectedCountry) {
      this.loadStationsByCountry(this._selectedCountry);
    } else {
      this._stations = [];
      this.updatePlaylist();
    }
  }

  async playStation(station, index) {
    if (!this._hass || !this._selectedMediaPlayer) return;

    // Validate station object
    if (!station || !station.media_content_id) {
      console.error('Invalid station object:', station);
      return;
    }

    try {
      const entity = this._hass.states[this._selectedMediaPlayer];
      const isBrowserPlayer = entity && entity.entity_id && entity.entity_id.includes('browser');

      // Set safe default volume (15%) before playing if volume is too high or not set
      if (entity && (entity.attributes.volume_level === undefined || entity.attributes.volume_level > 0.3)) {
        await this._hass.callService('media_player', 'volume_set', {
          entity_id: this._selectedMediaPlayer,
          volume_level: 0.15
        });
        // Update slider to reflect safe volume
        const volumeSlider = this.shadowRoot.querySelector('.volume-slider');
        if (volumeSlider) volumeSlider.value = 15;
      }

      console.log('Playing station:', station.title, 'ID:', station.media_content_id);

      // Call play_media service
      await this._hass.callService('media_player', 'play_media', {
        entity_id: this._selectedMediaPlayer,
        media_content_id: station.media_content_id,
        media_content_type: station.media_content_type
      });

      this._currentStationIndex = index;
      this._selectedStationIndex = index;
      this._isPlaying = true;

      // Store station metadata for display
      this._currentStationMetadata = {
        title: station.title,
        media_content_id: station.media_content_id,
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
      // Reset state on error
      this._isPlaying = false;
      this.stopVisualizer();
    }
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
    } catch (error) {
      console.error('Error stopping:', error);
    }
  }

  async handleVolumeChange(e) {
    if (!this._hass || !this._selectedMediaPlayer) return;

    const volumePercent = parseFloat(e.target.value);
    const volume = volumePercent / 100; // Convert to 0.0 - 1.0

    // Update slider gradient
    const volumeSlider = this.shadowRoot.querySelector('.volume-slider');
    if (volumeSlider) {
      volumeSlider.style.setProperty('--volume-percent', volumePercent + '%');
    }

    try {
      await this._hass.callService('media_player', 'volume_set', {
        entity_id: this._selectedMediaPlayer,
        volume_level: volume
      });
    } catch (error) {
      console.error('Error setting volume:', error);
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

      return `
        <div class="playlist-item ${classes.join(' ')}"
             data-index="${actualIndex}"
             data-is-favorite="${showingFavorites}">
          <span class="item-number">${(displayIndex + 1)}.</span>
          <span class="item-title">${this.escapeHtml(station.title)}</span>
          <span class="favorite-icon ${isFav ? 'active' : ''}" data-station-index="${actualIndex}">★</span>
        </div>
      `;
    }).join('');

    // Add event listeners
    playlistEl.querySelectorAll('.playlist-item').forEach(item => {
      const starBtn = item.querySelector('.favorite-icon');
      const index = parseInt(item.dataset.index);
      const isFavoriteList = item.dataset.isFavorite === 'true';
      const sourceList = isFavoriteList ? this._favorites : this._stations;

      // Favorite toggle
      if (starBtn) {
        starBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFavorite(sourceList[index]);
        });
      }

      // Select station
      item.addEventListener('click', () => {
        this.selectStation(index);
      });

      // Play station on double-click
      item.addEventListener('dblclick', () => {
        this.playStation(sourceList[index], index);
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
      : 15;

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
          position: fixed;
          background: ${colors.surfaceLight};
          border-radius: 8px;
          padding: 12px;
          display: none;
          min-width: 200px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          z-index: 1000;
          border: 1px solid ${colors.surfaceLighter};
        }

        .settings-menu.active {
          display: block;
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

        .favorite-icon {
          color: ${colors.textTertiary};
          font-size: 14px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
          user-select: none;
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
  }

  toggleSettings(e) {
    e.stopPropagation();
    const menu = this.shadowRoot.querySelector('.settings-menu');
    const btn = e.currentTarget;

    if (menu) {
      const isActive = menu.classList.contains('active');

      if (!isActive) {
        // Calculate position
        const btnRect = btn.getBoundingClientRect();
        menu.style.top = `${btnRect.bottom + 4}px`;
        menu.style.right = `${window.innerWidth - btnRect.right}px`;
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
