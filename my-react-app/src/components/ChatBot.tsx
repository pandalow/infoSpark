import { useEffect, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import Predefined from "./Predefined";
import promptData from '../../../data/prompt.json';
import { handleContext } from "../service/services";

type Messages = {
    id: string;
    sender: 'user' | 'bot';
    content: string;
    timestamp: number;
};
const CONSTANTS = {
    BOT_NAME: "Apply day",
    USER_NAME: "You",
    DEFAULT_BOT_REPLY: "I'm sorry, I didn't understand that."
}


const ChatBot = ({ tabId }: { tabId: string }) => {
    const [messages, setMessages] = useState<Messages[]>([]);
    const [input, setInput] = useState<string>('');
    const [selectedText, setSelectedText] = useState<string>('');
    const [jd, setJd] = useState<string | null>(null);

    //TODO Adding Session useState, with manage multiple session

    

    //Get storage of JD
    useEffect(() => {
        // Fetch the last JD from chrome storage
        chrome.storage.local.get(`JD_${tabId}`, (data) => {
            if (data[`JD_${tabId}`] && data[`JD_${tabId}`].text && data[`JD_${tabId}`].text.trim() !== "") {
                setJd(data[`JD_${tabId}`].text);
            } else {
                setJd(null);
            }
        });
    }, [tabId]);


    //Get storage of selected text
    useEffect(() => {
        // Fetch the last selected text from chrome storage
        const fetchData = async () => {
            const data = await handleContext('GET_SELECTED_TEXT');
            if (data.selectedText) {
                setSelectedText(data.selectedText);
            }
        };
        fetchData();
    }, []);

    //Get storage of user messages
    useEffect(() => {
        const storageKey = `chatMessages_${tabId}`;
        chrome.storage.local.get(storageKey, (data) => {
            if (data[storageKey]) {
                setMessages(data[storageKey]);
            } else {
                setMessages([]);
            }
        });
    }, [tabId]);

    const saveJDtoStorage = (key: string, value: any) => {
        chrome.storage.local.set({ [key]: value });
    };

    // Store messages to chrome storage
    const storeMessages = (messages: Messages[]) => {
        const storageKey = `chatMessages_${tabId}`;
        chrome.storage.local.set({ [storageKey]: messages });
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
            {!jd || jd.trim() === "" ?
                <div>
                    <span><b>Please Inform which job you want to discuss</b></span>
                    <div><textarea rows={4} cols={50} value={selectedText} onChange={(e) => setSelectedText(e.target.value)} /></div>
                    <button onClick={() => {
                        saveJDtoStorage(`JD_${tabId}`, { text: selectedText });
                        setJd(selectedText);
                    }}>Create</button>
                </div> : 
                <div>
                    <div>
                        {messages.map((msg) => (
                            <div key={msg.id}>
                                <b>{msg.sender === 'user' ? CONSTANTS.USER_NAME : CONSTANTS.BOT_NAME}:</b> {msg.content}
                            </div>
                        ))}
                    </div>
                    <div>
                        {/* put some pre defined messages here for demo */}
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
                </div>
            }
        </>
    );
};


export default ChatBot;