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
    this._searchFilter = '';
    this._keyboardListenerAdded = false;
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
      this.updatePlaylistSelection();

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
      this.stopVisualizer(); // Immediately stop visualizer
      this.updatePlaylistSelection();
    } catch (error) {
      console.error('Error stopping:', error);
    }
  }

  async playNext() {
    const filteredStations = this.getFilteredStations();
    if (filteredStations.length === 0) return;

    let nextIndex = this._currentStationIndex + 1;
    if (nextIndex >= this._stations.length) {
      nextIndex = 0; // Loop to beginning
    }

    // Find next station in filtered list
    while (nextIndex !== this._currentStationIndex) {
      const station = this._stations[nextIndex];
      if (this.matchesFilter(station)) {
        await this.playStation(station, nextIndex);
        return;
      }
      nextIndex = (nextIndex + 1) % this._stations.length;
    }
  }

  async playPrevious() {
    const filteredStations = this.getFilteredStations();
    if (filteredStations.length === 0) return;

    let prevIndex = this._currentStationIndex - 1;
    if (prevIndex < 0) {
      prevIndex = this._stations.length - 1; // Loop to end
    }

    // Find previous station in filtered list
    while (prevIndex !== this._currentStationIndex) {
      const station = this._stations[prevIndex];
      if (this.matchesFilter(station)) {
        await this.playStation(station, prevIndex);
        return;
      }
      prevIndex = prevIndex - 1;
      if (prevIndex < 0) prevIndex = this._stations.length - 1;
    }
  }

  async handleVolumeChange(e) {
    if (!this._hass || !this._selectedMediaPlayer) return;

    const volume = parseFloat(e.target.value) / 100; // Convert to 0.0 - 1.0

    try {
      await this._hass.callService('media_player', 'volume_set', {
        entity_id: this._selectedMediaPlayer,
        volume_level: volume
      });
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  }

  handleSearchInput(e) {
    this._searchFilter = e.target.value.toLowerCase();
    this.updatePlaylist();
  }

  matchesFilter(station) {
    if (!this._searchFilter) return true;
    return station.title.toLowerCase().includes(this._searchFilter);
  }

  getFilteredStations() {
    if (!this._searchFilter) return this._stations;
    return this._stations.filter(station => this.matchesFilter(station));
  }

  updatePlaylist() {
    const playlistEl = this.shadowRoot.querySelector('.playlist-items');
    if (!playlistEl) return;

    if (this._stations.length === 0) {
      playlistEl.innerHTML = '';
      return;
    }

    // Filter stations based on search
    const filteredItems = this._stations
      .map((station, index) => ({ station, index }))
      .filter(({ station }) => this.matchesFilter(station));

    if (filteredItems.length === 0 && this._searchFilter) {
      playlistEl.innerHTML = '<div style="padding: 12px; color: #b3b3b3; text-align: center;">No stations found</div>';
      return;
    }

    playlistEl.innerHTML = filteredItems.map(({ station, index }) => {
      const classes = [];
      if (index === this._currentStationIndex) classes.push('current');
      if (index === this._selectedStationIndex) classes.push('selected');

      return `
        <div class="playlist-item ${classes.join(' ')}"
             data-index="${index}">
          <span class="item-number">${(index + 1)}.</span>
          <span class="item-title">${this.escapeHtml(station.title)}</span>
        </div>
      `;
    }).join('');

    playlistEl.querySelectorAll('.playlist-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        this.selectStation(index);
      });

      item.addEventListener('dblclick', () => {
        const index = parseInt(item.dataset.index);
        this.playStation(this._stations[index], index);
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

    // Update volume slider
    const volumeSlider = this.shadowRoot.querySelector('.volume-slider');
    if (volumeSlider && entity.attributes.volume_level !== undefined) {
      volumeSlider.value = Math.round(entity.attributes.volume_level * 100);
    }

    // Update visualizer based on play state
    if (entity.state === 'playing') {
      this.startVisualizer();
    } else {
      this.stopVisualizer();
    }
  }

  startVisualizer() {
    if (this._visualizerInterval) return; // Already running

    const canvas = this.shadowRoot.querySelector('.visualizer');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const bars = 20;
    const barWidth = Math.floor(canvas.width / bars);
    const heights = new Array(bars).fill(0);

    this._visualizerInterval = setInterval(() => {
      // Clear with dark background
      ctx.fillStyle = '#181818';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < bars; i++) {
        // Random height with some smoothing
        heights[i] = heights[i] * 0.7 + Math.random() * canvas.height * 0.3;

        const barHeight = Math.floor(heights[i]);
        const x = i * barWidth;
        const y = canvas.height - barHeight;

        // Draw modern Spotify green bars
        ctx.fillStyle = '#1DB954';
        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
      }
    }, 50); // 20 FPS
  }

  stopVisualizer() {
    if (this._visualizerInterval) {
      clearInterval(this._visualizerInterval);
      this._visualizerInterval = null;

      // Clear canvas with dark background
      const canvas = this.shadowRoot.querySelector('.visualizer');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#181818';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  disconnectedCallback() {
    this.stopVisualizer();
    if (this._keyboardHandler) {
      document.removeEventListener('keydown', this._keyboardHandler);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  render() {
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
        }

        /* Main Window - Modern dark minimalist design */
        .main-window {
          width: 275px;
          height: 116px;
          background: #121212;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          position: relative;
          overflow: hidden;
        }

        .track-title {
          position: absolute;
          top: 12px;
          left: 12px;
          right: 12px;
          height: 18px;
          color: #ffffff;
          font-size: 11px;
          font-weight: 600;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          line-height: 18px;
          z-index: 1;
        }

        /* Visualizer */
        .visualizer {
          position: absolute;
          top: 38px;
          left: 12px;
          width: 80px;
          height: 32px;
          background: #181818;
          border-radius: 4px;
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
          height: 4px;
          -webkit-appearance: none;
          background: transparent;
          outline: none;
        }

        .volume-slider::-webkit-slider-track {
          width: 100%;
          height: 4px;
          background: #535353;
          border-radius: 2px;
        }

        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          background: #1DB954;
          cursor: pointer;
          border-radius: 50%;
          transition: transform 0.2s;
        }

        .volume-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        .volume-slider::-moz-range-track {
          width: 100%;
          height: 4px;
          background: #535353;
          border-radius: 2px;
        }

        .volume-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: #1DB954;
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }

        /* Control buttons - Modern minimalist style */
        .control-buttons {
          position: absolute;
          top: 38px;
          right: 12px;
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .control-btn {
          width: 32px;
          height: 32px;
          background: #282828;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: all 0.2s;
        }

        .control-btn:hover {
          background: #333333;
          transform: scale(1.05);
        }

        .control-btn:active {
          transform: scale(0.95);
        }

        /* Button icons using CSS */
        .control-btn::before {
          content: '';
          width: 0;
          height: 0;
          border-style: solid;
        }

        .btn-prev::before {
          border-width: 5px 7px 5px 0;
          border-color: transparent #b3b3b3 transparent transparent;
          margin-right: -1px;
        }

        .btn-prev::after {
          content: '';
          position: absolute;
          width: 2px;
          height: 10px;
          background: #b3b3b3;
          left: 11px;
        }

        .btn-play {
          background: #1DB954;
        }

        .btn-play:hover {
          background: #1ed760;
        }

        .btn-play::before {
          border-width: 6px 0 6px 10px;
          border-color: transparent transparent transparent #ffffff;
          margin-left: 2px;
        }

        .btn-pause::before {
          content: '';
          width: 3px;
          height: 12px;
          background: #b3b3b3;
          box-shadow: 5px 0 0 #b3b3b3;
        }

        .btn-stop::before {
          content: '';
          width: 10px;
          height: 10px;
          background: #b3b3b3;
          border-radius: 1px;
        }

        .btn-next::before {
          border-width: 5px 0 5px 7px;
          border-color: transparent transparent transparent #b3b3b3;
          margin-left: 1px;
        }

        .btn-next::after {
          content: '';
          position: absolute;
          width: 2px;
          height: 10px;
          background: #b3b3b3;
          right: 11px;
        }

        /* Playlist Window - Modern minimalist design */
        .playlist-window {
          width: 275px;
          background: #121212;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          position: relative;
          margin-top: 8px;
          overflow: hidden;
        }

        /* Search controls at top */
        .playlist-controls {
          padding: 12px;
          background: #181818;
        }

        .player-select, .country-select, .search-input {
          width: 100%;
          height: 36px;
          background: #282828;
          color: #ffffff;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 8px 12px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .search-input {
          cursor: text;
        }

        .search-input::placeholder {
          color: #535353;
        }

        .player-select:hover, .country-select:hover, .search-input:hover {
          background: #333333;
        }

        .player-select:focus, .country-select:focus, .search-input:focus {
          outline: 2px solid #1DB954;
          outline-offset: -2px;
        }

        .player-select option, .country-select option {
          background: #282828;
          color: #ffffff;
        }

        /* Playlist body */
        .playlist-body {
          height: 150px;
          background: #121212;
          position: relative;
        }

        /* Playlist area */
        .playlist-display {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow-y: scroll;
          overflow-x: hidden;
          padding: 8px;
        }

        .playlist-display::-webkit-scrollbar {
          width: 8px;
        }

        .playlist-display::-webkit-scrollbar-track {
          background: #121212;
        }

        .playlist-display::-webkit-scrollbar-thumb {
          background: #282828;
          border-radius: 4px;
        }

        .playlist-display::-webkit-scrollbar-thumb:hover {
          background: #333333;
        }

        .playlist-items {
          padding: 4px;
        }

        /* Modern playlist item styling */
        .playlist-item {
          color: #b3b3b3;
          background: transparent;
          font-size: 11px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 8px 12px;
          cursor: pointer;
          display: flex;
          gap: 8px;
          white-space: nowrap;
          border-radius: 4px;
          margin-bottom: 2px;
          transition: all 0.2s;
        }

        .playlist-item:hover {
          background: #282828;
          color: #ffffff;
        }

        .playlist-item.selected {
          background: #282828;
          color: #ffffff;
        }

        .playlist-item.current {
          color: #1DB954;
          background: #181818;
        }

        .item-number {
          color: #535353;
          min-width: 24px;
          font-size: 10px;
        }

        .item-title {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          color: inherit;
        }
      </style>

      <div class="winamp-container">
        <!-- Main Player Window -->
        <div class="main-window">
          <div class="track-title">Radio Browser</div>

          <!-- Visualizer -->
          <canvas class="visualizer" width="80" height="32"></canvas>

          <!-- Control Buttons -->
          <div class="control-buttons">
            <button class="control-btn btn-prev" onclick="this.getRootNode().host.playPrevious()" title="Previous (←)"></button>
            <button class="control-btn btn-play" onclick="this.getRootNode().host.togglePlay()" title="Play/Pause (Space)"></button>
            <button class="control-btn btn-pause" onclick="this.getRootNode().host.togglePlay()" title="Pause (Space)"></button>
            <button class="control-btn btn-stop" onclick="this.getRootNode().host.stop()" title="Stop"></button>
            <button class="control-btn btn-next" onclick="this.getRootNode().host.playNext()" title="Next (→)"></button>
          </div>

          <!-- Volume Control -->
          <div class="volume-control">
            <input type="range" class="volume-slider" min="0" max="100" value="15"
                   oninput="this.getRootNode().host.handleVolumeChange(event)">
          </div>
        </div>

        <!-- Playlist Window -->
        <div class="playlist-window">
          <!-- Search controls -->
          <div class="playlist-controls">
            <select class="player-select" onchange="this.getRootNode().host.handleMediaPlayerChange(event)">
              <option value="">Select Player...</option>
            </select>
            <select class="country-select" onchange="this.getRootNode().host.handleCountryChange(event)">
              <option value="">Select Country...</option>
            </select>
            <input type="text" class="search-input" placeholder="🔍 Search stations..."
                   oninput="this.getRootNode().host.handleSearchInput(event)">
          </div>

          <!-- Playlist body -->
          <div class="playlist-body">
            <div class="playlist-display">
              <div class="playlist-items"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Add keyboard shortcuts (only once)
    if (!this._keyboardListenerAdded) {
      this._keyboardHandler = (e) => {
        // Don't trigger if user is typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        switch(e.key) {
          case ' ': // Space - Play/Pause
            e.preventDefault();
            this.togglePlay();
            break;
          case 'ArrowLeft': // Left arrow - Previous
            e.preventDefault();
            this.playPrevious();
            break;
          case 'ArrowRight': // Right arrow - Next
            e.preventDefault();
            this.playNext();
            break;
          case 'ArrowUp': // Up arrow - Volume up
            e.preventDefault();
            this.adjustVolume(5);
            break;
          case 'ArrowDown': // Down arrow - Volume down
            e.preventDefault();
            this.adjustVolume(-5);
            break;
        }
      };
      document.addEventListener('keydown', this._keyboardHandler);
      this._keyboardListenerAdded = true;
    }
  }

  adjustVolume(delta) {
    const volumeSlider = this.shadowRoot.querySelector('.volume-slider');
    if (volumeSlider) {
      const newValue = Math.max(0, Math.min(100, parseInt(volumeSlider.value) + delta));
      volumeSlider.value = newValue;
      this.handleVolumeChange({ target: { value: newValue } });
    }
  }

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
