# Sister Memorial App

A localhost web application for creating a continuous, peaceful memorial display to honor and remember loved ones.

## Overview

The Sister Memorial App provides an infinite looping sequence of photos, quotes, videos, and mixed content with smooth transitions and optional background audio. The app is designed to run in a web browser as a meditative, ambient tribute experience.

## Features

- **Continuous Looping**: Seamless infinite playback of memorial content
- **Multiple Content Types**: Photos, quotes/text, videos, and mixed content (photo + text)
- **Smooth Transitions**: Fade, dissolve, slide, and blur transition effects
- **Customizable Timing**: Adjustable content duration (1-60 seconds) and transition duration (0.5-5 seconds)
- **Background Audio**: Optional audio playback with fade in/out (currently disabled by default)
- **Pause/Resume Controls**: Tap to pause, view controls, and navigate content
- **Gesture Controls**: Keyboard shortcuts for navigation (Space, Arrow keys)
- **Content Management**: Easy-to-use interface for adding, removing, and viewing content
- **Local Storage**: All content stored locally in browser localStorage
- **Responsive Design**: Works on desktop and mobile browsers

## Project Structure

```
looping/
├── index.html                          # Main HTML file
├── css/
│   └── styles.css                      # All styles
├── js/
│   ├── models/
│   │   ├── MemorialContent.js         # Content item model
│   │   ├── LoopSettings.js            # Settings model
│   │   └── LoopState.js               # State management
│   ├── services/
│   │   ├── ContentStorage.js          # localStorage persistence
│   │   ├── ContentManager.js          # Content CRUD operations
│   │   ├── AnimationEngine.js         # Transitions and animations
│   │   └── AudioPlayer.js             # Audio playback
│   ├── controllers/
│   │   └── MemorialLoopController.js  # Main loop controller
│   └── app.js                         # Application entry point
└── README.md                           # This file
```

## Getting Started

### Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- No server required - runs completely in the browser

### Installation

1. Clone or download this repository
2. Open `index.html` in your web browser

That's it! No build process, no dependencies, no server required.

### First Time Setup

1. When you first open the app, you'll see an onboarding screen
2. Click "Get Started" to open the content manager
3. Add your first piece of content:
   - Select content type (Photo, Quote, Video, or Mixed)
   - Upload or enter your content
   - Optionally add a caption
   - Set the display duration
   - Click "Add Content"
4. Close the content manager to start the memorial loop

## Usage

### Basic Controls

- **Tap/Click Screen**: Pause or resume the loop
- **Space Bar**: Pause or resume the loop
- **Left Arrow**: Skip to previous item
- **Right Arrow**: Skip to next item
- **Settings Button (⚙)**: Open settings panel

### Adding Content

1. Pause the loop
2. Click the settings button
3. Click "Manage Content"
4. Choose content type and upload/enter content
5. Click "Add Content"

### Content Types

- **Photo**: Upload any image file (JPEG, PNG, etc.)
- **Quote**: Enter text that will be displayed with a gradient background
- **Video**: Upload a video file (MP4, WebM, etc.)
- **Mixed**: Combine a photo background with text overlay

### Settings

- **Transition Style**: Choose from fade, dissolve, slide, or blur
- **Default Duration**: Set how long each item displays (1-60 seconds)
- **Transition Duration**: Set transition animation time (0.5-5 seconds)
- **Background Audio**: Enable/disable audio playback (requires audio file)
- **Auto-start on Launch**: Start loop automatically when opening the app
- **Enable Gesture Controls**: Enable keyboard shortcuts

### Keyboard Shortcuts

- `Space`: Pause/Resume
- `Left Arrow`: Previous item
- `Right Arrow`: Next item
- `Escape`: Close settings/content manager panels

## Technical Details

### Architecture

The app follows a clean MVC-like architecture:

- **Models**: Data structures for content, settings, and state
- **Services**: Business logic for storage, content management, animations, and audio
- **Controllers**: Main loop controller that orchestrates all services
- **Views**: HTML and CSS for UI, with vanilla JavaScript for interactivity

### Data Storage

All content and settings are stored in browser `localStorage`:

- **Content**: Stored as JSON with Base64-encoded images/videos
- **Settings**: User preferences persisted across sessions
- **Note**: localStorage has size limits (~5-10MB depending on browser)

### Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Performance

- Efficient content preloading
- GPU-accelerated CSS transitions
- Memory-conscious content management
- Optimized for 60fps playback

## Development

### Technology Stack

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with flexbox, transitions, and animations
- **Vanilla JavaScript (ES6+)**: No frameworks or libraries
- **Web APIs**: FileReader, localStorage, Audio

### Code Style

- ES6+ class syntax
- Async/await for asynchronous operations
- Clear separation of concerns
- Comprehensive inline documentation
- Defensive programming with error handling

## Known Limitations

- localStorage size limits may restrict the number of photos/videos
- Large video files may cause performance issues
- Audio playback requires user interaction (browser security policy)
- No cloud sync or backup (browser-local only)

## Future Enhancements

Potential features for future versions:

- Cloud storage integration
- Multiple memorial collections
- Advanced animation effects
- Social sharing capabilities
- Mobile app version
- Audio file selection from library

## License

This project is created as a memorial tribute application.

## Acknowledgments

Built with compassion and care to honor the memory of loved ones.
