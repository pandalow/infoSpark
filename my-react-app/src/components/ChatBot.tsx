import { useEffect, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import Predefined from "./Predefined";
import promptData from '../../../data/prompt.json';

type Messages = {
    id:string;
    sender: 'user' | 'bot';
    content: string;
    timestamp: number;
};
const CONSTANTS = {
    BOT_NAME: "Apply day",
    USER_NAME: "You",
    DEFAULT_BOT_REPLY: "I'm sorry, I didn't understand that."
}

type SelectedTextData = {
  text: string;
  url: string;
};


const ChatBot = ({ tabId }: { tabId: string }) => {
    const [messages, setMessages] = useState<Messages[]>([]);
    const [input, setInput] = useState<string>('');
    const [selectedText, setSelectedText] = useState<string>('');
    const [selectedTextUrl, setSelectedTextUrl] = useState<string>('');

    useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      // Fetch the last selected text from chrome storage
      chrome.storage.local.get('lastSelectedText', (data: { [key: string]: SelectedTextData }) => {
        if (data.lastSelectedText) {
          setSelectedText(data.lastSelectedText.text);
          setSelectedTextUrl(data.lastSelectedText.url);
        }
      });
    }
  }, []);

    //Get storage of user messages
    useEffect(() =>{

        const storageKey = `chatMessages_${tabId}`;
        chrome.storage.local.get(storageKey, (data) => {
            if(data[storageKey]){
                setMessages(data[storageKey]);   
            } else {
                setMessages([]);
            }
        });
    }, [tabId]);

    // Store messages to chrome storage
    const storeMessages = (messages: Messages[]) => {
        const storageKey = `chatMessages_${tabId}`;
        chrome.storage.local.set({ [storageKey] : messages });
    };

    // Simulate bot reply for now
    const fakeBotReply = (userMessage: string) => {
    // Will replace with actual AI integration later
    return new Promise<Messages>((resolve) => {
      setTimeout(() => {
        resolve({
          id: uuidv4(),
          sender: 'bot',
          content: `Bot reply to: "${userMessage}, This is ā test response."`,
          timestamp: Date.now(),
        });
      }, 800);
    });
  };
  // Handle sending message
    const handleSend = async (message?: string) => {
        const text = message || input;
        if (!text.trim()) return;

        const userMessage: Messages = {
            id: uuidv4(),
            sender: 'user',
            content: text,
            timestamp: Date.now(),
        };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');

        const botMessage = await fakeBotReply(text);
        const finalMessages = [...updatedMessages, botMessage];
        setMessages(finalMessages);
        storeMessages(finalMessages);
    };


    return (
        <>

            <div><b>Selected:</b>{selectedText}</div>
            <div><b>Source URL:</b>{selectedTextUrl}</div>
            <div>
                {messages.map((msg) => (
                    <div key={msg.id}>
                        <b>{msg.sender === 'user' ? CONSTANTS.USER_NAME : CONSTANTS.BOT_NAME}:</b> {msg.content}
                    </div>
                ))
                    }
            </div>
            <div>
                // put some pre defined messages here for demo
                {promptData.predefinedMessages.map((msg: string, index: number) => (
                    <Predefined key={index} handleSend={() => handleSend(msg)} message={msg} />
                ))}
            </div>
            <div>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSend();
                    }}
                />
                <button onClick={() => handleSend()}>Send</button>
            </div>
        </>
    );};


export default ChatBot;