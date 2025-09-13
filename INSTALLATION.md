# Chrome Extension Installation Guide

## Quick Start

### Step 1: Download or Clone
```bash
git clone https://github.com/pandalow/applyday_extension.git
cd applyday_extension
```

### Step 2: Open Chrome Extensions Page
1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)

### Step 3: Load Extension
1. Click "Load unpacked"
2. Select the `applyday_extension` folder
3. The extension should appear in your extensions list

### Step 4: Test the Extension
1. Open `test.html` in a new tab
2. Click the extension icon in the toolbar
3. Try the various features

## Detailed Installation Steps

### For Developers

1. **Prerequisites**
   - Google Chrome (latest version)
   - Basic understanding of web technologies

2. **Enable Developer Mode**
   - Go to `chrome://extensions/`
   - Toggle "Developer mode" ON (top-right corner)
   - This allows loading unpacked extensions

3. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to the downloaded/cloned extension folder
   - Select the folder containing `manifest.json`
   - Click "Select Folder"

4. **Verify Installation**
   - Extension icon should appear in Chrome toolbar
   - Extension should be listed in `chrome://extensions/`
   - No error messages should be displayed

### For End Users (Store Distribution)

1. **Chrome Web Store** (when published)
   - Visit the extension's Chrome Web Store page
   - Click "Add to Chrome"
   - Confirm by clicking "Add extension"

2. **Manual Installation** (from CRX file)
   - Download the `.crx` file
   - Drag and drop into `chrome://extensions/`
   - Confirm installation

## Testing Your Installation

### Quick Test
1. Open any webpage
2. Click the extension icon
3. Try "Highlight Text" button
4. Keywords should be highlighted

### Comprehensive Test
1. Open `test.html` included in the extension
2. Follow the testing instructions on that page
3. Verify all features work as expected

### Expected Behavior
- ✅ Extension icon appears in toolbar
- ✅ Popup opens when clicking icon
- ✅ Auto-highlighting works on pages with keywords
- ✅ Context menu shows extension options
- ✅ Options page opens and saves settings
- ✅ No console errors in DevTools

## Troubleshooting

### Common Issues

**Extension doesn't load:**
- Check that Developer Mode is enabled
- Verify `manifest.json` is in the selected folder
- Check for syntax errors in console

**Icons not showing:**
- Verify icon files exist in `icons/` folder
- Check file permissions
- Try reloading the extension

**Features not working:**
- Check browser console for errors
- Verify permissions in `manifest.json`
- Try refreshing the page

**Settings not saving:**
- Check if storage permission is granted
- Clear extension storage and try again
- Check for console errors

### Debugging Steps

1. **Check Extension Details**
   - Go to `chrome://extensions/`
   - Click "Details" on your extension
   - Look for error messages

2. **Inspect Service Worker**
   - In extension details, click "service worker"
   - Check console for background script errors

3. **Check Content Script**
   - Open DevTools on any webpage
   - Look for content script errors in console

4. **Verify Permissions**
   - Check that all required permissions are listed
   - Ensure permissions match functionality

## Development Setup

### File Structure
```
applyday_extension/
├── manifest.json          # Extension configuration
├── popup.html/css/js      # Popup interface
├── background.js          # Service worker
├── content.js            # Content script
├── options.html/css/js   # Settings page
├── icons/               # Extension icons
└── test.html           # Test page
```

### Key Files to Modify

**For Functionality:**
- `popup.js` - Popup behavior
- `content.js` - Page interaction
- `background.js` - Background tasks

**For Appearance:**
- `popup.css` - Popup styling
- `options.css` - Settings page styling
- `icons/` - Extension icons

**For Configuration:**
- `manifest.json` - Permissions and structure
- `options.js` - Settings management

### Making Changes

1. Edit the relevant files
2. Go to `chrome://extensions/`
3. Click refresh icon on your extension
4. Test your changes

### Best Practices

- Always test after making changes
- Check console for errors
- Use meaningful variable names
- Comment complex functionality
- Follow Chrome extension guidelines

## Publishing (Optional)

### Chrome Web Store

1. **Prepare Package**
   - Zip extension files (exclude `.git`)
   - Ensure all icons are included
   - Test thoroughly

2. **Developer Account**
   - Register at Chrome Web Store Developer Console
   - Pay one-time registration fee

3. **Upload Extension**
   - Create new item in console
   - Upload zip file
   - Fill out store listing details
   - Submit for review

4. **Review Process**
   - Google reviews extension
   - May take several days
   - Address any feedback received

## Support

### Getting Help
- Check Chrome extension documentation
- Review console error messages
- Test with minimal example
- Search Stack Overflow for common issues

### Reporting Issues
- Include browser version
- Describe exact steps to reproduce
- Include console error messages
- Mention when issue started occurring

---

**Note:** This extension is built with Manifest V3, the latest Chrome extension standard. It should work with Chrome, Edge, and other Chromium-based browsers.