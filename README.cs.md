# 📻 Radio Browser Card

**🇨🇿 Česky** | **[🇬🇧 English](README.md)**

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)
[![GitHub release](https://img.shields.io/github/release/joshuaaaaa/HA---Radio-card.svg)](https://github.com/joshuaaaaa/HA---Radio-card/releases)
[![License](https://img.shields.io/github/license/joshuaaaaa/HA---Radio-card.svg)](LICENSE)

Moderní **karta rádiového přehrávače** pro Home Assistant! Procházejte a přehrávejte internetové rozhlasové stanice s elegantním tmavým designem inspirovaným populárními hudebními streamovacími službami - kompletně s animovaným vizualizérem, editorem playlistu a plynulými ovládacími prvky.

<img width="421" height="512" alt="image" src="https://github.com/user-attachments/assets/c9bb5118-6fb3-4447-857b-50838c0321f3" />

## ✨ Funkce

- 🎨 **Moderní tmavý design** - Minimalistické tmavé téma (#121212) inspirované designovým jazykem Spotify
- 📊 **Animovaný vizualizér** - Plynulé zelené (#1DB954) vizualizační sloupce s různými styly
- 🎛️ **Kompletní ovládání** - Kruhová tlačítka s Předchozí, Přehrát, Pauza, Stop, Další
- 📋 **Editor playlistu** - Čisté okno playlistu s plynulými hover efekty
- ⭐ **Správa oblíbených** - Ukládejte své oblíbené stanice jedním kliknutím
- 📤 **Export/Import oblíbených** - Zálohujte a obnovujte své oblíbené stanice jako JSON
- 🎨 **Podpora témat** - Tmavé, světlé a vlastní možnosti témat
- 🔊 **Posuvník hlasitosti** - Moderní horizontální posuvník se zeleným akcentem
- 🔇 **Tlačítko ztlumení** - Rychlé ztlumení/zrušení ztlumení
- 📻 **Integrace Radio Browser** - Procházejte a přehrávejte tisíce internetových rozhlasových stanic
- 🌍 **Filtr podle země** - Filtrujte stanice podle země, abyste se vyhnuli načítání 43k+ stanic najednou
- 📊 **Metadata stanic** - Zobrazení datového toku, kodeku a informací o zemi během přehrávání
- 🔍 **Vyhledávání/Filtrování** - Vyhledávání stanic podle názvu v reálném čase
- 🖱️ **Klikněte pro přehrání** - Dvojklik na libovolnou stanici v playlistu pro spuštění přehrávání
- ⏮️⏭️ **Předchozí/Další** - Navigace mezi stanicemi pomocí tlačítek nebo šipek (s opakováním)
- ⌨️ **Klávesové zkratky** - Mezerník (přehrát/pauza), šipky (předchozí/další/hlasitost)
- ⏲️ **Časovač spánku** - Automatické zastavení přehrávání po 15, 30 nebo 60 minutách
- 💾 **Persistence stavu** - Přežije obnovení stránky bez ztráty výběru
- 💫 **Plynulé animace** - Hover efekty, transformace měřítka a přechody všude
- ▶️ **Přehrávání YouTube** - Přehrávejte YouTube videa jako audio (vyžaduje VLC/Kodi/Plex media player)
- 🎵 **Lokální MP3 soubory** - Nahrajte a přehrávejte MP3 soubory přímo v prohlížeči (trvalé uložení)
- 🌐 **Vlastní audio streamy** - Přidejte přímé HTTP/HTTPS URL audio streamů
- 🗑️ **Mazání vlastních stanic** - Odstraňte nahrané MP3, YouTube odkazy nebo vlastní streamy

## 📋 Požadavky

- Home Assistant 2024.1.0 nebo novější
- Nainstalovaná [integrace Radio Browser](https://www.home-assistant.io/integrations/radio_browser/)
- Alespoň jedna entita media playeru podporující streamování URL

## 🚀 Instalace

### HACS (Doporučeno)

1. Otevřete **HACS** ve vaší instanci Home Assistant
2. Klikněte na **Frontend**
3. Klikněte na **⋮** (tři tečky) v pravém horním rohu
4. Vyberte **Vlastní repozitáře**
5. Přidejte URL repozitáře: `https://github.com/joshuaaaaa/HA---Radio-player`
6. Vyberte kategorii: **Dashboard**
7. Klikněte na **Přidat**
8. Najděte **Radio Browser Card** v seznamu
9. Klikněte na **Stáhnout**
10. **Restartujte Home Assistant**
11. Vymažte cache prohlížeče (Ctrl+F5)

### Manuální instalace

1. Stáhněte `radio-browser-card.js` z [nejnovější verze](https://github.com/joshuaaaaa/HA---Radio-card/releases)
2. Zkopírujte `radio-browser-card.js` do složky `config/www`
3. Přidejte do `configuration.yaml`:

```yaml
lovelace:
  resources:
    - url: /local/radio-browser-card.js
      type: module
```

5. Restartujte Home Assistant
6. Vymažte cache prohlížeče (Ctrl+F5)

## ⚙️ Konfigurace

### Základní konfigurace

```yaml
type: custom:radio-browser-card
name: Radio Browser
```

### S předvoleným media playerem

```yaml
type: custom:radio-browser-card
name: Moje rádio
entity: media_player.living_room_speaker
```

### Možnosti konfigurace

| Možnost | Typ | Výchozí | Popis |
|---------|-----|---------|-------|
| `name` | string | `"Radio Browser"` | Zobrazovaný název karty |
| `entity` | string | volitelné | Předvybrat media player (lze změnit v UI) |

## 📖 Jak používat

### 1. Vyberte Media Player

Použijte rozbalovací nabídku v okně Editoru playlistu pro výběr vašeho media playeru.

### 2. Vyberte zemi

Vyberte zemi z rozbalovací nabídky pro načtení stanic. Toto filtruje 43 000+ stanic na zvládnutelný seznam z vaší vybrané země.

### 3. Procházejte stanice

Stanice z vybrané země budou načteny do playlistu.

### 4. Hledejte stanice

Použijte vyhledávací pole pro filtrování stanic podle názvu v reálném čase:
- Pište do vyhledávacího pole pro filtrování výsledků
- Vymažte vyhledávání pro zobrazení všech stanic

### 5. Přehrát stanici

- **Jednoklik** pro výběr stanice
- **Dvojklik** pro přehrání stanice
- Nebo použijte **tlačítko Přehrát** pro přehrání vybrané/první stanice

### 6. Správa oblíbených

- **Klikněte na ikonu ★** vedle libovolné stanice pro přidání do oblíbených
- **Klikněte znovu na ★** pro odstranění z oblíbených
- Když není vybrána žádná země, zobrazuje se **seznam oblíbených**
- Navigujte mezi oblíbenými pomocí tlačítek Předchozí/Další

### 7. Navigace

- **⏭ Další** - Přehrát další stanici (tlačítko nebo → klávesa)
- **⏮ Předchozí** - Přehrát předchozí stanici (tlačítko nebo ← klávesa)
- **▶ Přehrát/Pauza** - Přepnout přehrávání (tlačítko nebo mezerník)
- **⏹ Stop** - Zastavit přehrávání

### 8. Ovládání hlasitosti

- Použijte posuvník pro úpravu hlasitosti
- Nebo použijte **↑/↓ šipky** pro jemné ovládání

### 9. Klávesové zkratky

- **Mezerník** - Přehrát/Pauza
- **← Levá šipka** - Předchozí stanice
- **→ Pravá šipka** - Další stanice
- **↑ Šipka nahoru** - Zvýšit hlasitost (+5%)
- **↓ Šipka dolů** - Snížit hlasitost (-5%)

### 10. Rychlé ztlumení

- **Klikněte na tlačítko 🔊** v pravém horním rohu pro ztlumení/zrušení ztlumení
- Ikona se změní na 🔇 když je ztlumeno
- Obnoví předchozí hlasitost při zrušení ztlumení

### 11. Časovač spánku

- **Klikněte na tlačítko ⏲️** v pravém horním rohu
- Vyberte **15, 30 nebo 60 minut**
- Odpočet časovače se zobrazí v pravém horním rohu
- Přehrávání se automaticky zastaví po vypršení časovače
- Klikněte na **Vypnout** pro zrušení časovače

### 12. Export/Import oblíbených

- **Otevřete nastavení** (tlačítko ⚙️)
- **Export**: Klikněte na 📤 Export pro stažení JSON souboru
- **Import**: Klikněte na 📥 Import pro obnovení z JSON souboru
- Sdílejte oblíbené mezi zařízeními nebo vytvářejte zálohy

### 13. Přehrávání YouTube

Přidejte YouTube videa pro přehrávání jako audio stanice:

1. **Klikněte na tlačítko ▶️ YouTube** v sekci playlistu
2. **Zvolte "OK"** po zobrazení výzvy
3. **Zadejte YouTube URL nebo Video ID**:
   - Celá URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
   - Krátká URL: `https://youtu.be/dQw4w9WgXcQ`
   - Pouze Video ID: `dQw4w9WgXcQ`
4. **Pojmenujte svou stanici** (např. "Relaxační jazz")
5. **Přehrávat přes Home Assistant media player**

**⚠️ DŮLEŽITÉ:** Přehrávání YouTube vyžaduje media player s podporou YouTube:
- ✅ **VLC media player** (doporučeno)
- ✅ **Kodi**
- ✅ **Plex**
- ✅ **Cast zařízení** (Chromecast)
- ❌ **NENÍ podporováno:** browser_mod, jednoduché audio přehrávače

Karta vás upozorní, pokud váš vybraný media player možná nepodporuje YouTube.

### 14. Lokální MP3 soubory

Nahrajte MP3 soubory pro přímé přehrávání ve vašem prohlížeči:

1. **Klikněte na tlačítko 🎵 MP3 Files** v sekci playlistu
2. **Vyberte jeden nebo více MP3 souborů** z vašeho zařízení
3. Soubory jsou **převedeny na base64** a uloženy v localStorage prohlížeče
4. **Přehrávat přímo** bez Home Assistant media playeru
5. **Funguje po obnovení stránky** - soubory přetrvávají v úložišti prohlížeče

**Funkce:**
- ✅ Výběr více souborů
- ✅ Trvalé uložení (přežije obnovení stránky)
- ✅ Přímé přehrávání v prohlížeči
- ✅ Bez limitu velikosti souboru (závisí na prohlížeči)
- ✅ Funguje offline po načtení

**Poznámka:** Velké soubory mohou chvíli trvat při prvním načtení.

### 15. Vlastní audio streamy

Přidejte přímé HTTP/HTTPS URL audio streamů:

1. **Klikněte na tlačítko ▶️ YouTube** v sekci playlistu
2. **Zvolte "Zrušit"** po zobrazení výzvy
3. **Zadejte přímou URL audio streamu**:
   - Příklad: `http://stream.example.com/radio.mp3`
   - Příklad: `https://ice1.somafm.com/groovesalad-128-mp3`
4. **Pojmenujte svou stanici**
5. **Přehrávat přímo** v prohlížeči

**Ideální pro:**
- Internetové rádiové streamy
- Podcasty s přímými URL
- Jakýkoliv HTTP/HTTPS audio stream

### 16. Mazání vlastních stanic

Odstraňte nahrané MP3 soubory, YouTube odkazy nebo vlastní streamy:

1. **Najděte stanici** ve vašem playlistu
2. **Klikněte na ikonu koše 🗑️** vedle názvu stanice
3. **Potvrďte smazání** v dialogu
4. Stanice je trvale odstraněna

**Vizuální indikátory:**
- ▶️ = YouTube stanice
- 🎵 = Lokální MP3 soubor
- 🌐 = Vlastní audio stream

### 17. Informace o stanici

Během přehrávání uvidíte metadata stanice pod názvem:
- 📍 **Země** - Země původu stanice
- 🎵 **Kodek** - Audio formát (MP3, AAC, OGG, FLAC)
- 📊 **Datový tok** - Kvalita streamu v kbps
- ▶️ **YouTube** - Přehrávání z YouTube
- 🎵 **Lokální MP3** - Přehrávání lokálního souboru
- 🌐 **Vlastní stream** - Přehrávání vlastního streamu

## 🎨 Detaily designu

### Hlavní okno

- **Tmavé pozadí** - Čisté tmavé téma (#121212) pro snížené namáhání očí
- **Zaoblené rohy** - Moderní 8px poloměr okrajů pro hladkou estetiku
- **Zobrazení názvu** - Čistý bílý text (600 tloušťka) zobrazující název stanice
- **Vizualizér** - Animované Spotify zelené (#1DB954) sloupce na tmavém pozadí (#181818)
- **Ovládací tlačítka** - Kruhová tlačítka (#282828) s hover stavy a animacemi měřítka
- **Tlačítko Přehrát** - Výrazný zelený akcent (#1DB954) pro primární akci
- **Posuvník hlasitosti** - Elegantní posuvník se zeleným ovladačem (#1DB954) a plynulými přechody

### Okno editoru playlistu

- **Seznam stanic** - Všechny rozhlasové stanice s moderními hover efekty ve stylu karty (#282828)
- **Aktuálně přehrávané** - Zvýrazněno Spotify zelenou (#1DB954)
- **Posuvník** - Minimální tmavý posuvník (#282828) se zaoblenými rohy
- **Rozbalovací nabídky** - Moderní zaoblené výběry (#282828) se zeleným obrysem při fokusu
- **Plynulé interakce** - Všechny prvky mají 200ms přechody

### Barevné schéma

- **Pozadí**: Čistě tmavé (#121212)
- **Karty**: Tmavě šedé (#181818, #282828)
- **Text**: Bílý (#ffffff) a šedý (#b3b3b3)
- **Akcent**: Spotify zelená (#1DB954, #1ed760)
- **Aktuální stanice**: Zelený text na tmavém pozadí
- **Inspirace designu**: Moderní streamovací služby (open-source CSS implementace)

## 🎯 Příklady

### Jednoduché nastavení

```yaml
type: custom:radio-browser-card
name: Radio Player
```

### Obývací pokoj rádio

```yaml
type: custom:radio-browser-card
name: Obývací pokoj rádio
entity: media_player.living_room
```

### Více rádiových přehrávačů

```yaml
# Kuchyně
type: custom:radio-browser-card
name: Kuchyňské rádio
entity: media_player.kitchen

# Ložnice
type: custom:radio-browser-card
name: Rádio v ložnici
entity: media_player.bedroom
```

## 🔧 Kompatibilní Media Playery

### Pro rozhlasové stanice
Funguje s jakýmkoliv media playerem podporujícím streamování URL:

- ✅ Google Cast / Chromecast
- ✅ Sonos
- ✅ Music Player Daemon (MPD)
- ✅ VLC Media Player
- ✅ Spotify Connect
- ✅ Browser Mod
- ✅ A mnoho dalších!

### Pro přehrávání YouTube
**Vyžaduje** media player s podporou YouTube:

- ✅ **VLC Media Player** (doporučeno)
- ✅ **Kodi**
- ✅ **Plex**
- ✅ **Cast zařízení** (Chromecast s podporou YouTube)
- ✅ **MPV**
- ✅ **Mopidy** (s YouTube pluginem)
- ❌ **NENÍ podporováno:** browser_mod, jednoduché audio-only přehrávače

### Pro lokální MP3 & vlastní streamy
Přehrává se **přímo v prohlížeči** - není potřeba media player:

- ✅ Funguje v jakémkoliv moderním prohlížeči
- ✅ Chrome, Firefox, Safari, Edge
- ✅ Podporovány mobilní prohlížeče
- ✅ Není vyžadován Home Assistant media player

## 🐛 Řešení problémů

### Karta se nezobrazuje

1. Vymažte cache prohlížeče (Ctrl+F5 nebo Cmd+Shift+R)
2. Zkontrolujte konzoli prohlížeče na chyby (F12)
3. Ověřte, že zdroj je přidán do configuration.yaml
4. Restartujte Home Assistant

### Žádné stanice v playlistu

1. Ujistěte se, že je nainstalovaná **integrace Radio Browser**
2. **Vyberte media player** z rozbalovací nabídky
3. Počkejte na načtení stanic (může trvat několik sekund)
4. Zkontrolujte konzoli prohlížeče na chyby

### Stanice se nepřehrávají

1. Ověřte, že váš media player podporuje streamování URL
2. Otestujte media player s jiným zdrojem
3. Zkuste jinou stanici
4. Zkontrolujte logy Home Assistant na chyby

### YouTube se nepřehrává

1. **Zkontrolujte kompatibilitu media playeru** - YouTube vyžaduje VLC/Kodi/Plex/Cast
2. **NENÍ kompatibilní** s browser_mod nebo jednoduchými audio přehrávači
3. Karta vás upozorní, pokud přehrávač nepodporuje YouTube
4. Zkuste s VLC media playerem (nejspolehlivější)
5. Zkontrolujte logy Home Assistant na YouTube související chyby

### Lokální MP3 se nepřehrává

1. **Zkontrolujte formát souboru** - musí být platný MP3 soubor
2. **Kompatibilita prohlížeče** - funguje v Chrome, Firefox, Safari, Edge
3. **Velikost souboru** - velmi velké soubory mohou způsobit problémy s prohlížečem
4. **Vymažte cache prohlížeče** pokud se soubor nenačte
5. **Zkontrolujte konzoli prohlížeče** (F12) na chyby
6. Zkuste nejprve s menším MP3 souborem

### Vlastní stream se nepřehrává

1. **Ověřte URL streamu** - musí být přímá HTTP/HTTPS audio URL
2. **Zkontrolujte CORS** - stream musí povolit přístup z prohlížeče
3. **Zkuste v prohlížeči** - vložte URL přímo do prohlížeče pro test
4. **Zkontrolujte formát** - MP3 streamy fungují nejlépe
5. Některé streamy mohou vyžadovat autentizaci

### Nelze smazat vlastní stanici

1. **Hledejte ikonu koše** (🗑️) - viditelná pouze u vlastních stanic
2. **Není viditelná** u stanic radio browser (ty nelze smazat)
3. **Obnovte stránku** pokud tlačítko nereaguje
4. Zkontrolujte konzoli prohlížeče na JavaScript chyby

## 📚 Technické detaily

### Jak to funguje

**Načítání stanic:**
- Používá integraci Radio Browser v Home Assistant
- Procházení stanic podle země pro optimalizaci načítání
- Zobrazení filtrovaných stanic v playlistu

**Přehrávání rozhlasových stanic:**
```javascript
hass.callService('media_player', 'play_media', {
  entity_id: 'media_player.speaker',
  media_content_id: 'media-source://radio_browser/[uuid]',
  media_content_type: 'audio/mpeg'
})
```

**Přehrávání YouTube:**
```javascript
// Odesláno do Home Assistant media playeru (vyžaduje VLC/Kodi/Plex)
hass.callService('media_player', 'play_media', {
  entity_id: 'media_player.vlc',
  media_content_id: 'https://www.youtube.com/watch?v=VIDEO_ID',
  media_content_type: 'music'
})
```

**Lokální MP3 & vlastní streamy:**
```javascript
// Přímé přehrávání v prohlížeči pomocí HTML5 Audio elementu
const audio = document.createElement('audio');
audio.src = 'data:audio/mpeg;base64,BASE64_DATA'; // Pro MP3 soubory
// NEBO
audio.src = 'https://stream.example.com/radio.mp3'; // Pro vlastní streamy
audio.play();
```

**Ukládání souborů:**
- **MP3 soubory**: Převedeny na base64 data URL pomocí FileReader API
- **Uloženo v**: localStorage prohlížeče (trvalé po obnovení stránky)
- **Vlastní stanice**: Uloženy jako JSON v localStorage
- **Formát**:
```javascript
{
  title: "Má písnička",
  media_content_id: "data:audio/mpeg;base64,//uQx...",
  media_content_type: "audio/mpeg",
  source: "local_mp3",
  fileName: "song.mp3"
}
```

### Klíčové funkce

- **Moderní CSS design** - Čisté CSS inspirované designovým jazykem Spotify s tmavým tématem
- **Žádné externí závislosti** - Všechny styly jsou samostatné, nejsou vyžadovány žádné externí obrázky
- **Minimalistické rozhraní** - Čisté UI bez rozptylování se zaměřením na obsah
- **Správa playlistu** - Klikněte pro výběr, dvojklik pro přehrání
- **Vyhledávání v reálném čase** - Filtrování stanic podle názvu při psaní
- **Plná navigace** - Tlačítka Předchozí/Další s podporou klávesnice
- **Klávesové zkratky** - Mezerník, šipky pro kompletní ovládání
- **Ovládání hlasitosti** - Plynulý horizontální posuvník se zeleným ovladačem (#1DB954)
- **Animovaný vizualizér** - Zelené sloupce (#1DB954) založené na canvas, které reagují na přehrávání
- **Open Source design** - Založeno na volně dostupných designových vzorech, žádné proprietární prvky

## 📝 Licence

Tento projekt je licencován pod MIT licencí - viz soubor [LICENSE](LICENSE) pro podrobnosti.

## 🙏 Poděkování

- Vytvořeno pro komunitu Home Assistant
- Používá integraci Radio Browser pro data stanic
- Moderní design inspirovaný Spotify a současnými hudebními streamovacími službami
- Všechny designové prvky vytvořeny pomocí open-source CSS technik
- Reference barevného schématu:
  - [Spotify Clone Design Examples](https://github.com/CodeByAlmas/pure-html-css-spotify-clone)
  - [Modern Music Player UI Patterns](https://dribbble.com/tags/dark_music_player)

## Podpora

Pokud se vám tato karta líbí, prosím ⭐ ohodnoťte tento repozitář!

Našli jste chybu nebo máte požadavek na funkci? Prosím otevřete issue.

## http://buymeacoffee.com/jakubhruby

<img width="150" height="150" alt="qr-code" src="https://github.com/user-attachments/assets/2581bf36-7f7d-4745-b792-d1abaca6e57d" />

---

🎵 **Užijte si svou hudbu!** 📻
