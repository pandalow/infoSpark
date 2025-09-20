// background.js

// Initialize storage and context menu on installation
chrome.runtime.onInstalled.addListener(async() => {
    console.log('Extension installed, initializing storage');
    chrome.contextMenus.create({
        id: 'add-to-applyday',
        title: 'add to applyday',
        type: 'normal',
        contexts: ['selection']
    });
});
    

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener(async(item, tab) => {
    const itd = item.menuItemId;

    if (itd === 'add-to-applyday' && item.selectionText) {
        const selectedText = item.selectionText;
        const pageUrl = item.pageUrl || (tab && tab.url) || 'unknown';

        console.log('Selected text:', selectedText);
        console.log('Page URL:', pageUrl);

        // Store the selected text with its source URL
        chrome.storage.local.set({
            lastSelectedText: { text: selectedText, url: pageUrl }
        })
    }
});