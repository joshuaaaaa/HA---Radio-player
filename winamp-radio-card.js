class WinampRadioCard extends HTMLElement {
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
  }

  setConfig(config) {
    this.config = { name: config.name || 'Winamp Radio', entity: config.entity || null, ...config };
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

      // Browser player needs special handling after stop
      // Clear any previous media first if it was stopped or idle
      const isBrowserPlayer = entity && entity.entity_id && entity.entity_id.includes('browser');
      if (isBrowserPlayer && (entity.state === 'idle' || entity.state === 'off')) {
        console.log('Browser player detected in idle/off state, clearing before play');
        try {
          await this._hass.callService('media_player', 'clear_playlist', {
            entity_id: this._selectedMediaPlayer
          });
          // Wait a bit for clear to complete
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e) {
          console.log('Clear playlist not supported, continuing anyway');
        }
      }

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

  updatePlaylist() {
    const playlistEl = this.shadowRoot.querySelector('.playlist-items');
    if (!playlistEl) return;

    if (this._stations.length === 0) {
      playlistEl.innerHTML = '';
      return;
    }

    playlistEl.innerHTML = this._stations.map((station, index) => {
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
    const bars = 16;
    const barWidth = Math.floor(canvas.width / bars);
    const heights = new Array(bars).fill(0);

    this._visualizerInterval = setInterval(() => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < bars; i++) {
        // Random height with some smoothing
        heights[i] = heights[i] * 0.7 + Math.random() * canvas.height * 0.3;

        const barHeight = Math.floor(heights[i]);
        const x = i * barWidth;
        const y = canvas.height - barHeight;

        // Draw bar with Winamp-style colors
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(x, y, barWidth - 1, barHeight);
      }
    }, 50); // 20 FPS
  }

  stopVisualizer() {
    if (this._visualizerInterval) {
      clearInterval(this._visualizerInterval);
      this._visualizerInterval = null;

      // Clear canvas
      const canvas = this.shadowRoot.querySelector('.visualizer');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  disconnectedCallback() {
    this.stopVisualizer();
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
          font-family: Arial, sans-serif;
        }

        .winamp-container {
          display: inline-block;
          position: relative;
        }

        /* Main Window - uses authentic MAIN.BMP */
        .main-window {
          width: 275px;
          height: 116px;
          background: url(/local/winamp-skin/MAIN.BMP) no-repeat;
          background-size: 275px 116px;
          position: relative;
          image-rendering: pixelated;
          image-rendering: crisp-edges;
        }

        .track-title {
          position: absolute;
          top: 26px;
          left: 111px;
          width: 155px;
          height: 10px;
          color: #00FF00;
          font-size: 8px;
          font-family: 'Courier New', monospace;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          text-shadow: 0 0 2px #00FF00;
          line-height: 10px;
        }

        /* Visualizer - covers original visualizer on MAIN.BMP */
        .visualizer {
          position: absolute;
          top: 43px;
          left: 24px;
          width: 76px;
          height: 16px;
          background: transparent;
          image-rendering: pixelated;
        }

        /* Volume control - covers original volume slider on MAIN.BMP */
        .volume-control {
          position: absolute;
          top: 57px;
          left: 107px;
          width: 68px;
          height: 13px;
          background: transparent;
          display: flex;
          align-items: center;
        }

        .volume-slider {
          width: 100%;
          height: 8px;
          -webkit-appearance: none;
          background: transparent;
          outline: none;
        }

        .volume-slider::-webkit-slider-track {
          width: 100%;
          height: 8px;
          background: #00FF00;
          border: none;
        }

        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 8px;
          height: 8px;
          background: #FFFFFF;
          cursor: pointer;
          border: 1px solid #000000;
        }

        .volume-slider::-moz-range-track {
          width: 100%;
          height: 8px;
          background: #00FF00;
          border: none;
        }

        .volume-slider::-moz-range-thumb {
          width: 8px;
          height: 8px;
          background: #FFFFFF;
          cursor: pointer;
          border: 1px solid #000000;
        }

        /* Control buttons - from CBUTTONS.BMP */
        .control-buttons {
          position: absolute;
          top: 88px;
          left: 16px;
          display: flex;
          gap: 0;
        }

        .control-btn {
          width: 23px;
          height: 18px;
          background: url(/local/winamp-skin/CBUTTONS.BMP);
          background-size: 136px 36px;
          image-rendering: pixelated;
          cursor: pointer;
          border: none;
          padding: 0;
        }

        .control-btn.eject {
          width: 22px;
          height: 16px;
        }

        .btn-prev { background-position: 0px 0px; }
        .btn-prev:active { background-position: 0px -18px; }

        .btn-play { background-position: -23px 0px; }
        .btn-play:active { background-position: -23px -18px; }

        .btn-pause { background-position: -46px 0px; }
        .btn-pause:active { background-position: -46px -18px; }

        .btn-stop { background-position: -69px 0px; }
        .btn-stop:active { background-position: -69px -18px; }

        .btn-next { background-position: -92px 0px; }
        .btn-next:active { background-position: -92px -18px; }

        .btn-eject { background-position: -114px 0px; }
        .btn-eject:active { background-position: -114px -16px; }

        /* Playlist Window - simple black box */
        .playlist-window {
          width: 275px;
          background: #000000;
          border: 1px solid #404040;
          position: relative;
          margin-top: 0;
        }

        /* Search controls at top */
        .playlist-controls {
          padding: 5px;
          background: #000000;
          border-bottom: 1px solid #404040;
        }

        .player-select, .country-select {
          width: 100%;
          height: 18px;
          background: #000000;
          color: #00FF00;
          border: 1px solid #404040;
          font-size: 9px;
          font-family: Arial, sans-serif;
          padding: 2px;
          margin-bottom: 4px;
        }

        .player-select option, .country-select option {
          background: #000000;
          color: #00FF00;
        }

        /* Playlist body */
        .playlist-body {
          height: 150px;
          background: #000000;
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
          padding: 5px;
        }

        .playlist-display::-webkit-scrollbar {
          width: 6px;
        }

        .playlist-display::-webkit-scrollbar-track {
          background: #000000;
        }

        .playlist-display::-webkit-scrollbar-thumb {
          background: #404040;
        }

        .playlist-items {
          padding: 2px;
        }

        /* Authentic Winamp playlist colors from PLEDIT.TXT */
        .playlist-item {
          color: #00FF00;
          background: transparent;
          font-size: 10px;
          font-family: Arial, sans-serif;
          padding: 1px 2px;
          cursor: pointer;
          display: flex;
          gap: 4px;
          white-space: nowrap;
        }

        .playlist-item:hover {
          background: #0A0A0A;
        }

        .playlist-item.selected {
          background: #1A1A1A;
        }

        .playlist-item.current {
          color: #FFFFFF;
          background: #0000FF;
        }

        .item-number {
          color: inherit;
          min-width: 20px;
        }

        .item-title {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      </style>

      <div class="winamp-container">
        <!-- Main Player Window -->
        <div class="main-window">
          <div class="track-title">Winamp Radio Browser</div>

          <!-- Visualizer -->
          <canvas class="visualizer" width="76" height="16"></canvas>

          <!-- Volume Control -->
          <div class="volume-control">
            <input type="range" class="volume-slider" min="0" max="100" value="15"
                   oninput="this.getRootNode().host.handleVolumeChange(event)">
          </div>

          <!-- Control Buttons -->
          <div class="control-buttons">
            <button class="control-btn btn-prev" title="Previous"></button>
            <button class="control-btn btn-play" onclick="this.getRootNode().host.togglePlay()" title="Play"></button>
            <button class="control-btn btn-pause" onclick="this.getRootNode().host.togglePlay()" title="Pause"></button>
            <button class="control-btn btn-stop" onclick="this.getRootNode().host.stop()" title="Stop"></button>
            <button class="control-btn btn-next" title="Next"></button>
            <button class="control-btn btn-eject eject" title="Eject"></button>
          </div>
        </div>

        <!-- Playlist Window - simple black box -->
        <div class="playlist-window">
          <!-- Search controls -->
          <div class="playlist-controls">
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
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {}

  static getConfigElement() {
    return document.createElement("winamp-radio-card-editor");
  }

  static getStubConfig() {
    return { name: "Winamp Radio" };
  }

  getCardSize() {
    return 3;
  }
}

customElements.define('winamp-radio-card', WinampRadioCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'winamp-radio-card',
  name: 'Winamp Radio Card',
  description: 'Authentic Winamp base-2.91 radio player using real BMP sprite graphics'
});
