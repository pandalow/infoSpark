# ApplyDay Extension Template

A comprehensive Chrome extension template with common functionality for web page interaction, highlighting, and analysis.

## Features

- **Auto-highlighting**: Automatically highlight job-related keywords on web pages
- **Page Analysis**: Analyze pages for word count, links, images, and more
- **Manual Highlighting**: Click mode for manual text highlighting
- **Customizable Settings**: Configurable keywords, colors, and behaviors
- **Background Processing**: Service worker for background tasks and notifications
- **Content Scripts**: Interact with web page content
- **Options Page**: Full-featured settings and preferences page
- **Context Menus**: Right-click options for quick actions
- **Local Storage**: Save user preferences and settings

## Installation

### For Development

1. Clone this repository:
   ```bash
   git clone https://github.com/pandalow/applyday_extension.git
   cd applyday_extension
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked" and select the extension directory

5. The extension should now appear in your extensions list

### For Distribution

1. Zip the extension files (excluding `.git` folder)
2. Upload to Chrome Web Store Developer Dashboard
3. Follow Chrome Web Store publishing guidelines

## File Structure

```
applyday_extension/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup interface
├── popup.css              # Popup styling
├── popup.js               # Popup functionality
├── background.js          # Background service worker
├── content.js             # Content script for web pages
├── options.html           # Settings page interface
├── options.css            # Settings page styling
├── options.js             # Settings page functionality
├── icons/                 # Extension icons
│   ├── icon16.png         # 16x16 icon
│   ├── icon48.png         # 48x48 icon
│   └── icon128.png        # 128x128 icon
└── README.md              # This file
```

## Usage

### Basic Functions

1. **Click the extension icon** to open the popup interface
2. **Highlight Text**: Highlight keywords on the current page
3. **Count Words**: Get word statistics for the page
4. **Extract Links**: Find and list all links on the page
5. **Options**: Access advanced settings and preferences

### Settings

Access the options page by:
- Clicking "More Options" in the popup
- Right-clicking the extension icon and selecting "Options"
- Going to `chrome://extensions/` and clicking "Details" > "Extension options"

Available settings:
- Auto-highlight keywords on page load
- Auto-analyze pages for content
- Customize keyword list
- Change highlight colors
- Theme selection (Light/Dark/Auto)
- Export/Import settings

### Keyboard Shortcuts

- **Ctrl+Shift+H**: Toggle highlight mode
- **Ctrl+Shift+A**: Quick analyze current page

### Context Menu

Right-click on any page to access:
- Highlight selected text
- Analyze current page
- Open extension options

## Customization

### Adding New Keywords

1. Open the options page
2. Navigate to the "Keywords" section
3. Add keywords separated by commas
4. Save settings

### Changing Highlight Colors

1. Open the options page
2. Go to "Appearance" section
3. Click the color picker to select a new color
4. Save settings

### Modifying Functionality

The extension is built with modularity in mind:

- **popup.js**: Modify popup interface behavior
- **content.js**: Add new page interaction features
- **background.js**: Add background processing and notifications
- **options.js**: Extend settings and preferences

## Permissions

The extension requires these permissions:

- **storage**: Save user settings and preferences
- **activeTab**: Access the current active tab for analysis
- **scripting**: Inject scripts for highlighting and content analysis
- **contextMenus**: Add right-click context menu options

## Browser Compatibility

- Chrome (Manifest V3)
- Edge (Chromium-based)
- Opera (Chromium-based)
- Brave Browser

## Development

### Prerequisites

- Node.js (optional, for advanced development)
- Chrome Browser
- Basic knowledge of HTML, CSS, and JavaScript

### Making Changes

1. Edit the relevant files
2. Reload the extension in `chrome://extensions/`
3. Test your changes

### Debugging

- Use Chrome DevTools for popup and options pages
- Check the service worker in `chrome://extensions/` developer view
- Use `console.log()` statements for debugging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please:
1. Check the options page help section
2. Review the Chrome extension documentation
3. Open an issue on GitHub

## Changelog

### Version 1.0.0
- Initial release
- Basic highlighting functionality
- Page analysis features
- Comprehensive options page
- Context menu integration
- Auto-highlight capabilities

## Privacy

This extension:
- Does NOT collect personal information
- Stores settings locally only
- Does NOT send data to external servers
- Processes all content locally on your device

## Tips

- Use auto-highlight for consistent keyword highlighting
- Export settings to backup your preferences
- Customize keywords for your specific use case
- Use the context menu for quick access to features
- Check the options page for advanced settings