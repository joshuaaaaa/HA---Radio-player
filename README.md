# 📻 Winamp Radio Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)
[![GitHub release](https://img.shields.io/github/release/joshuaaaaa/HA---Radio-card.svg)](https://github.com/joshuaaaaa/HA---Radio-card/releases)
[![License](https://img.shields.io/github/license/joshuaaaaa/HA---Radio-card.svg)](LICENSE)

A nostalgic **Winamp-style radio player** for Home Assistant! Browse and play internet radio stations with the iconic Winamp interface - complete with green LED display, playlist editor, and classic controls.

<img width="293" height="348" alt="image" src="https://github.com/user-attachments/assets/39aabd0a-1a70-434d-91bf-c078a5ddaf24" />



## ✨ Features

- 🎮 **Classic Winamp Design** - Authentic Winamp 2.x interface with pixel-perfect styling
- 💚 **Green LED Display** - Iconic glowing green digital display
- 📊 **Visualizer** - Animated audio visualizer bars
- 🎛️ **Full Controls** - Previous, Play, Pause, Stop, Next buttons
- 📋 **Playlist Editor** - Classic Winamp playlist window with station list
- 🔊 **Volume Slider** - Vertical volume control slider (golden/orange gradient)
- 📻 **Radio Browser Integration** - Browse and play thousands of internet radio stations
- 🌍 **Country Filter** - Filter stations by country to avoid loading 43k+ stations at once
- 🖱️ **Click to Play** - Click any station in the playlist to start playing
- ⌨️ **Next/Previous** - Navigate through stations with arrow buttons
- 🎨 **Metallic UI** - Classic silver/gray Winamp aesthetic
- 💫 **Nostalgic Experience** - "It really whips the llama's ass!"

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
8. Find **Winamp Radio Card** in the list
9. Click **Download**
10. **Copy Winamp skin files:**
    - Navigate to `config/custom_components/winamp-radio-card/` (or wherever HACS installed it)
    - Copy the `winamp-skin` folder to `config/www/`
    - Final path should be: `config/www/winamp-skin/`
11. **Restart Home Assistant**
12. Clear browser cache (Ctrl+F5)

> **Note:** HACS cannot automatically copy files to the `www` folder, so you must manually copy the `winamp-skin` folder containing the authentic Winamp BMP graphics.

### Manual Installation

1. Download `winamp-radio-card.js` and the `winamp-skin` folder from the [latest release](https://github.com/joshuaaaaa/HA---Radio-card/releases)
2. Copy `winamp-radio-card.js` to your `config/www` folder
3. Copy the `winamp-skin` folder to your `config/www` folder
   - Final structure:
     - `config/www/winamp-radio-card.js`
     - `config/www/winamp-skin/MAIN.BMP`
     - `config/www/winamp-skin/PLEDIT.BMP`
     - `config/www/winamp-skin/CBUTTONS.BMP`
     - etc.
4. Add to your `configuration.yaml`:

```yaml
lovelace:
  resources:
    - url: /local/winamp-radio-card.js
      type: module
```

5. Restart Home Assistant
6. Clear browser cache (Ctrl+F5)

## ⚙️ Configuration

### Basic Configuration

```yaml
type: custom:winamp-radio-card
name: Winamp Radio
```

### With Pre-selected Media Player

```yaml
type: custom:winamp-radio-card
name: My Winamp
entity: media_player.living_room_speaker
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | `"Winamp Radio"` | Display name in titlebar |
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

- **Titlebar** - Blue Windows 95-style titlebar with minimize/maximize/close buttons
- **LED Display** - Green glowing digital display showing time and station info
- **Bitrate/KHz** - Shows stream quality information
- **Visualizer** - Animated bars that pulse with the music
- **Control Buttons** - Classic Winamp button styling with 3D effects
- **Sliders** - Volume and Balance vertical sliders

### Playlist Editor Window

- **Station List** - All radio stations displayed with numbers
- **Current Playing** - Highlighted in yellow
- **Scrollbar** - Classic Windows 95-style scrollbar
- **Controls** - ADD, REM, SEL, MISC, LIST buttons (classic Winamp layout)
- **Info Bar** - Shows total number of stations

### Color Scheme

- **Background**: Silver/gray metallic gradient (`#C0C0C0`)
- **Display Background**: Black (`#0A0A0A`)
- **Display Text**: Green (`#00FF00`)
- **Current Station**: Yellow (`#FFFF00`)
- **Titlebar**: Blue gradient (`#3366FF` → `#000080`)

## 🎯 Examples

### Simple Setup

```yaml
type: custom:winamp-radio-card
name: Winamp
```

### Living Room Radio

```yaml
type: custom:winamp-radio-card
name: Living Room Winamp
entity: media_player.living_room
```

### Multiple Winamp Players

```yaml
# Kitchen
type: custom:winamp-radio-card
name: Kitchen Winamp
entity: media_player.kitchen

# Bedroom
type: custom:winamp-radio-card
name: Bedroom Winamp
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

## 🎨 Design Inspiration

This card is a faithful recreation of the legendary **Winamp media player**:
- [Winamp Skin Museum](https://skins.webamp.org/) - Classic Winamp skins
- [WinampHeritage.com](https://winampheritage.com/skins) - Winamp skin archives
- [Winamp Wikipedia](https://en.wikipedia.org/wiki/Winamp) - History and design

## 📚 Technical Details

### How It Works

**Loading Stations:**
- Browses all Radio Browser categories
- Loads all playable stations into memory
- Displays them in the playlist without filtering

**Playback:**
```javascript
hass.callService('media_player', 'play_media', {
  entity_id: 'media_player.speaker',
  media_content_id: 'media-source://radio_browser/[uuid]',
  media_content_type: 'audio/mpeg'
})
```

### Key Features

- **Authentic Winamp Styling** - CSS gradients, inset/outset borders, 3D effects
- **LED Display** - Green monospace font with text-shadow glow
- **Playlist Management** - Click to play, current track highlighting
- **Volume Control** - Click-to-set vertical slider
- **Animated Visualizer** - CSS animations for audio bars

## 🕹️ Easter Eggs

- The visualizer animates even when paused (just like Winamp!)
- Titlebar buttons are functional (but don't minimize the actual window)
- Classic "Winamp Playlist Editor" title
- Green LED display with authentic glow effect

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

- Inspired by the legendary **Winamp** media player by Nullsoft
- Built for the Home Assistant community
- "Winamp, it really whips the llama's ass!"
- Uses the Radio Browser integration for station data

## Support

If you like this card, please ⭐ star this repository!

Found a bug or have a feature request? Please open an issue.



## http://buymeacoffee.com/jakubhruby


<img width="150" height="150" alt="qr-code" src="https://github.com/user-attachments/assets/2581bf36-7f7d-4745-b792-d1abaca6e57d" />

---

🎵 **It really whips the llama's ass!** 🦙
