import ChatBot from './ChatBot';
import { useState, useEffect } from 'react';

type ChatTab = {
    id: string;
    name: string;
    isActive: boolean;
}

const Chat = () => {
    const [tabId, setTabId] = useState<string>('');
    const [chatTabs, setChatTabs] = useState<ChatTab[]>([]);

    // Load chat tabs from storage on component mount
    useEffect(() => {
        loadChatTabs();
    }, []);

    // Load chat tabs from storage
    const loadChatTabs = () => {
        chrome.storage.local.get(['chatTabs', 'activeTabId'], (data) => {
            if (data.chatTabs && data.chatTabs.length > 0) {
                setChatTabs(data.chatTabs);
                // BUG FIX: Make sure the active tab in state matches the stored activeTabId
                const activeTab = data.chatTabs.find((tab: ChatTab) => tab.id === data.activeTabId);
                setTabId(activeTab ? activeTab.id : data.chatTabs[0].id);
            } else {
                // Create the default tab
                const defaultTab: ChatTab = {
                    id: `chat_${Date.now()}`,
                    name: "Chat Bot Tab",
                    isActive: true
                }

                setChatTabs([defaultTab]);
                setTabId(defaultTab.id);
                saveChatTabs([defaultTab], defaultTab.id);
            }
        })
    }

    // Save chat tabs to storage
    const saveChatTabs = (tabs: ChatTab[], activeId: string) => {
        chrome.storage.local.set({ chatTabs: tabs, activeTabId: activeId });
    }

    // Create a new chat tab
    const createNewTab = () => {
        const newTab: ChatTab = {
            id: `chat_${Date.now()}`,
            name: `Chat Tab ${chatTabs.length + 1}`,
            isActive: false
        };
        const updatedTabs = chatTabs.map(tab => ({ ...tab, isActive: false }));
        updatedTabs.push({ ...newTab, isActive: true });

        setChatTabs(updatedTabs);
        setTabId(newTab.id)
        saveChatTabs(updatedTabs, newTab.id);
    }

    const switchTab = (tabId: string) => {
        // BUG FIX: Update isActive property correctly for all tabs
        const updatedTabs = chatTabs.map(
            (tab: ChatTab) => (
                { ...tab, isActive: tab.id === tabId }
            )
        )

        setChatTabs(updatedTabs);
        setTabId(tabId)
        saveChatTabs(updatedTabs, tabId)
    }
    
    // Close a chat tab
    const closeTab = (tId: string) => {
        if (chatTabs.length === 1) return; // PROTECTION: Don't close the last tab

        const updatedTabs = chatTabs.filter((tab: ChatTab) => tab.id !== tId);
        let newActiveId = tabId;

        // BUG FIX: If closing the current active tab, switch to another tab
        if (tId === tabId) {
            newActiveId = updatedTabs[0].id;
            // IMPORTANT: Update the isActive property for the new active tab
            updatedTabs[0].isActive = true;
        } else {
            // BUG FIX: Make sure isActive states are consistent after closing non-active tab
            updatedTabs.forEach((tab: ChatTab) => {
                tab.isActive = (tab.id === tabId);
            });
        }

        setChatTabs(updatedTabs);
        setTabId(newActiveId);
        saveChatTabs(updatedTabs, newActiveId);

        // CLEANUP: Delete the chat messages for the closed tab
        chrome.storage.local.remove([`chatMessages_${tId}`]);
    }

    return (
        <>
            <div>
                {chatTabs.map((tab) => (
                    <div key={tab.id}>
                        <span onClick={() => switchTab(tab.id)}>
                            {tab.name} {tab.isActive ? '(active)' : ''}
                        </span>
                        {chatTabs.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeTab(tab.id);
                                }}
                            >
                                x
                            </button>
                        )}
                    </div>
                ))}
                <button onClick={createNewTab}> + adding new chat</button>
            </div>
            <div>
                <ChatBot tabId={tabId} />
            </div>
        </>
    );

}

export default Chat;