# 📻 Radio Browser Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)
[![GitHub release](https://img.shields.io/github/release/joshuaaaaa/HA---Radio-card.svg)](https://github.com/joshuaaaaa/HA---Radio-card/releases)
[![License](https://img.shields.io/github/license/joshuaaaaa/HA---Radio-card.svg)](LICENSE)

A modern **radio player card** for Home Assistant! Browse and play internet radio stations with a sleek gradient design - complete with animated visualizer, playlist editor, and smooth controls.

## ✨ Features

- 🎨 **Modern Gradient Design** - Beautiful purple gradient with glass morphism effects
- 📊 **Animated Visualizer** - Smooth gradient audio visualizer bars
- 🎛️ **Full Controls** - Previous, Play, Pause, Stop, Next buttons
- 📋 **Playlist Editor** - Modern playlist window with station list
- 🔊 **Volume Slider** - Horizontal volume control slider
- 📻 **Radio Browser Integration** - Browse and play thousands of internet radio stations
- 🌍 **Country Filter** - Filter stations by country to avoid loading 43k+ stations at once
- 🖱️ **Click to Play** - Double-click any station in the playlist to start playing
- ⌨️ **Next/Previous** - Navigate through stations with arrow buttons
- 💫 **Smooth Animations** - Hover effects and transitions throughout

## 📋 Requirements

- Home Assistant 2024.1.0 or newer
- [Radio Browser Integration](https://www.home-assistant.io/integrations/radio_browser/) installed
- At least one media player entity that supports URL streaming

## 🚀 Installation

### HACS (Recommended)

1. Open **HACS** in your Home Assistant instance
2. Click on **Frontend**
3. Click the **⋮** (three dots) in the top right corner
4. Select **Custom repositories**
5. Add repository URL: `https://github.com/joshuaaaaa/HA---Radio-card`
6. Select category: **Dashboard**
7. Click **Add**
8. Find **Radio Browser Card** in the list
9. Click **Download**
10. **Restart Home Assistant**
11. Clear browser cache (Ctrl+F5)

### Manual Installation

1. Download `radio-browser-card.js` from the [latest release](https://github.com/joshuaaaaa/HA---Radio-card/releases)
2. Copy `radio-browser-card.js` to your `config/www` folder
3. Add to your `configuration.yaml`:

```yaml
lovelace:
  resources:
    - url: /local/radio-browser-card.js
      type: module
```

5. Restart Home Assistant
6. Clear browser cache (Ctrl+F5)

## ⚙️ Configuration

### Basic Configuration

```yaml
type: custom:radio-browser-card
name: Radio Browser
```

### With Pre-selected Media Player

```yaml
type: custom:radio-browser-card
name: My Radio
entity: media_player.living_room_speaker
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | `"Radio Browser"` | Display name shown in the card |
| `entity` | string | optional | Pre-select a media player (can be changed in UI) |

## 📖 How to Use

### 1. Select Media Player

Use the dropdown in the Playlist Editor window to select your media player.

### 2. Select Country

Choose a country from the dropdown to load stations. This filters the 43,000+ stations to a manageable list from your selected country.

### 3. Browse Stations

Stations from the selected country will be loaded into the playlist.

### 4. Play a Station

- **Click** any station in the playlist to start playing
- Or use the **Play button** to play the current/first station

### 4. Navigate

- **⏭ Next** - Play next station in the list
- **⏮ Previous** - Play previous station in the list
- **⏸ Pause** - Pause playback
- **⏹ Stop** - Stop playback

### 5. Control Volume

Click anywhere on the vertical Volume slider to set the volume level.

## 🎨 Design Details

### Main Window

- **Modern Gradient** - Purple gradient background (`#667eea` → `#764ba2`)
- **Glass Morphism** - Translucent elements with backdrop blur effects
- **Title Display** - Clean white text showing station name
- **Visualizer** - Animated gradient bars that respond to playback
- **Control Buttons** - Circular buttons with smooth hover animations
- **Volume Slider** - Modern rounded slider with smooth transitions

### Playlist Editor Window

- **Station List** - All radio stations with smooth hover effects
- **Current Playing** - Highlighted with increased opacity
- **Scrollbar** - Modern minimal scrollbar design
- **Dropdown Selects** - Player and country selection with glass morphism
- **Smooth Interactions** - All elements feature smooth transitions

### Color Scheme

- **Primary Gradient**: Purple (`#667eea` → `#764ba2`)
- **Text**: White with various opacity levels
- **Accent**: White overlays with transparency
- **Current Station**: White with 25% opacity background
- **Glass Effects**: Backdrop blur with semi-transparent backgrounds

## 🎯 Examples

### Simple Setup

```yaml
type: custom:radio-browser-card
name: Radio Player
```

### Living Room Radio

```yaml
type: custom:radio-browser-card
name: Living Room Radio
entity: media_player.living_room
```

### Multiple Radio Players

```yaml
# Kitchen
type: custom:radio-browser-card
name: Kitchen Radio
entity: media_player.kitchen

# Bedroom
type: custom:radio-browser-card
name: Bedroom Radio
entity: media_player.bedroom
```

## 🔧 Compatible Media Players

Works with any media player supporting URL streaming:

- ✅ Google Cast / Chromecast
- ✅ Sonos
- ✅ Music Player Daemon (MPD)
- ✅ VLC Media Player
- ✅ Spotify Connect
- ✅ Browser Mod
- ✅ And many more!

## 🐛 Troubleshooting

### Card doesn't appear

1. Clear browser cache (Ctrl+F5 or Cmd+Shift+R)
2. Check browser console for errors (F12)
3. Verify resource is added to configuration.yaml
4. Restart Home Assistant

### No stations in playlist

1. Make sure **Radio Browser integration** is installed
2. **Select a media player** from the dropdown
3. Wait for stations to load (may take a few seconds)
4. Check browser console for errors

### Stations don't play

1. Verify your media player supports URL streaming
2. Test the media player with another source
3. Try a different station
4. Check Home Assistant logs for errors

## 📚 Technical Details

### How It Works

**Loading Stations:**
- Uses Home Assistant's Radio Browser integration
- Browses stations by country to optimize loading
- Displays filtered stations in the playlist

**Playback:**
```javascript
hass.callService('media_player', 'play_media', {
  entity_id: 'media_player.speaker',
  media_content_id: 'media-source://radio_browser/[uuid]',
  media_content_type: 'audio/mpeg'
})
```

### Key Features

- **Modern CSS Design** - Pure CSS with gradients, backdrop filters, and smooth transitions
- **No External Dependencies** - All styling is self-contained, no external images required
- **Glass Morphism** - Modern translucent effects with backdrop blur
- **Playlist Management** - Click to select, double-click to play
- **Volume Control** - Smooth horizontal slider with gradient thumb
- **Animated Visualizer** - Canvas-based gradient bars that respond to playback

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the Home Assistant community
- Uses the Radio Browser integration for station data
- Modern design inspired by contemporary UI/UX trends

## Support

If you like this card, please ⭐ star this repository!

Found a bug or have a feature request? Please open an issue.

## http://buymeacoffee.com/jakubhruby

<img width="150" height="150" alt="qr-code" src="https://github.com/user-attachments/assets/2581bf36-7f7d-4745-b792-d1abaca6e57d" />

---

🎵 **Enjoy your music!** 📻
