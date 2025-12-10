# 📻 Radio Browser Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)
[![GitHub release](https://img.shields.io/github/release/joshuaaaaa/HA---Radio-card.svg)](https://github.com/joshuaaaaa/HA---Radio-card/releases)
[![License](https://img.shields.io/github/license/joshuaaaaa/HA---Radio-card.svg)](LICENSE)

A modern **radio player card** for Home Assistant! Browse and play internet radio stations with a sleek dark theme design inspired by popular music streaming services - complete with animated visualizer, playlist editor, and smooth controls.

## ✨ Features

- 🎨 **Modern Dark Design** - Minimalist dark theme (#121212) inspired by Spotify's design language
- 📊 **Animated Visualizer** - Smooth green (#1DB954) audio visualizer bars with multiple styles
- 🎛️ **Full Controls** - Circular buttons with Previous, Play, Pause, Stop, Next
- 📋 **Playlist Editor** - Clean playlist window with smooth hover effects
- ⭐ **Favorites Management** - Save your favorite stations with a click
- 📤 **Export/Import Favorites** - Backup and restore your favorite stations as JSON
- 🎨 **Theme Support** - Dark, Light, and Custom theme options
- 🔊 **Volume Slider** - Modern horizontal slider with green accent
- 🔇 **Mute Button** - Quick mute/unmute toggle
- 📻 **Radio Browser Integration** - Browse and play thousands of internet radio stations
- 🌍 **Country Filter** - Filter stations by country to avoid loading 43k+ stations at once
- 📊 **Station Metadata** - Display bitrate, codec, and country info while playing
- 🔍 **Search/Filter** - Real-time search to filter stations by name
- 🖱️ **Click to Play** - Double-click any station in the playlist to start playing
- ⏮️⏭️ **Previous/Next** - Navigate through stations with buttons or arrow keys (with looping)
- ⌨️ **Keyboard Shortcuts** - Space (play/pause), arrows (prev/next/volume)
- ⏲️ **Sleep Timer** - Auto-stop playback after 15, 30, or 60 minutes
- 💾 **State Persistence** - Survives page reloads without losing your selection
- 💫 **Smooth Animations** - Hover effects, scale transforms, and transitions throughout

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

### 4. Search Stations

Use the search box to filter stations by name in real-time:
- Type in the search field to filter results
- Clear the search to show all stations

### 5. Play a Station

- **Single-click** to select a station
- **Double-click** to play the station
- Or use the **Play button** to play the selected/first station

### 6. Manage Favorites

- **Click the ★ icon** next to any station to add it to favorites
- **Click ★ again** to remove from favorites
- When no country is selected, your **favorites list** is displayed
- Navigate through favorites using Previous/Next buttons

### 7. Navigate

- **⏭ Next** - Play next station (button or → key)
- **⏮ Previous** - Play previous station (button or ← key)
- **▶ Play/Pause** - Toggle playback (button or Space key)
- **⏹ Stop** - Stop playback

### 8. Control Volume

- Use the slider to adjust volume
- Or use **↑/↓ arrow keys** for fine control

### 9. Keyboard Shortcuts

- **Space** - Play/Pause
- **← Left Arrow** - Previous station
- **→ Right Arrow** - Next station
- **↑ Up Arrow** - Volume up (+5%)
- **↓ Down Arrow** - Volume down (-5%)

### 10. Quick Mute

- **Click the 🔊 button** in the top-right to mute/unmute
- Icon changes to 🔇 when muted
- Restores previous volume when unmuted

### 11. Sleep Timer

- **Click the ⏲️ button** in the top-right
- Select **15, 30, or 60 minutes**
- Timer countdown displays in top-right corner
- Playback stops automatically when timer expires
- Click **Off** to cancel the timer

### 12. Export/Import Favorites

- **Open Settings** (⚙️ button)
- **Export**: Click 📤 Export to download JSON file
- **Import**: Click 📥 Import to restore from JSON file
- Share favorites between devices or create backups

### 13. Station Information

While playing, you'll see station metadata below the title:
- 📍 **Country** - Station's country of origin
- 🎵 **Codec** - Audio format (MP3, AAC, OGG, FLAC)
- 📊 **Bitrate** - Stream quality in kbps

## 🎨 Design Details

### Main Window

- **Dark Background** - Pure dark theme (#121212) for reduced eye strain
- **Rounded Corners** - Modern 8px border radius for smooth aesthetics
- **Title Display** - Clean white text (600 weight) showing station name
- **Visualizer** - Animated Spotify green (#1DB954) bars on dark background (#181818)
- **Control Buttons** - Circular buttons (#282828) with hover states and scale animations
- **Play Button** - Prominent green accent (#1DB954) for primary action
- **Volume Slider** - Sleek slider with green thumb (#1DB954) and smooth transitions

### Playlist Editor Window

- **Station List** - All radio stations with modern card-style hover effects (#282828)
- **Current Playing** - Highlighted with Spotify green (#1DB954)
- **Scrollbar** - Minimal dark scrollbar (#282828) with rounded design
- **Dropdown Selects** - Modern rounded selects (#282828) with green focus outline
- **Smooth Interactions** - All elements feature 200ms transitions

### Color Scheme

- **Background**: Pure dark (#121212)
- **Cards**: Dark gray (#181818, #282828)
- **Text**: White (#ffffff) and gray (#b3b3b3)
- **Accent**: Spotify green (#1DB954, #1ed760)
- **Current Station**: Green text on dark background
- **Design Inspiration**: Modern streaming services (open-source CSS implementation)

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

- **Modern CSS Design** - Pure CSS inspired by Spotify's design language with dark theme
- **No External Dependencies** - All styling is self-contained, no external images required
- **Minimalist Interface** - Clean, distraction-free UI with focus on content
- **Playlist Management** - Click to select, double-click to play
- **Real-time Search** - Filter stations by name as you type
- **Full Navigation** - Previous/Next buttons with keyboard support
- **Keyboard Shortcuts** - Space, Arrow keys for complete control
- **Volume Control** - Smooth horizontal slider with green accent thumb (#1DB954)
- **Animated Visualizer** - Canvas-based green bars (#1DB954) that respond to playback
- **Open Source Design** - Based on freely available design patterns, no proprietary assets

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
- Modern design inspired by Spotify and contemporary music streaming services
- All design elements created using open-source CSS techniques
- Color scheme references:
  - [Spotify Clone Design Examples](https://github.com/CodeByAlmas/pure-html-css-spotify-clone)
  - [Modern Music Player UI Patterns](https://dribbble.com/tags/dark_music_player)

## Support

If you like this card, please ⭐ star this repository!

Found a bug or have a feature request? Please open an issue.

## http://buymeacoffee.com/jakubhruby

<img width="150" height="150" alt="qr-code" src="https://github.com/user-attachments/assets/2581bf36-7f7d-4745-b792-d1abaca6e57d" />

---

🎵 **Enjoy your music!** 📻
