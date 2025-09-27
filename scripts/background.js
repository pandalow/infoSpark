// background.js

let globalState = {
    selectedText: '',
}

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
        console.log('Selected text:', selectedText);

        // Store the selected text with its source URL
        globalState.selectedText = selectedText;

    }
});

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((Message, sender, sendResponse) => {
    switch (Message.type) {
        case 'GET_SELECTED_TEXT':
            sendResponse({ selectedText: globalState.selectedText });
            break;
        case 'CLEAR_SELECTED_TEXT':
            globalState.selectedText = '';
            sendResponse({ success: true });
            break;
    }
    return true; // Indicate that we will send a response asynchronously
});

