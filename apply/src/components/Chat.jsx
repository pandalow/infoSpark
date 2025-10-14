import { useState } from 'react'
import { chromeMessaging } from '../chromeMessaging'
import { useEffect } from 'react'

function Chat() {
    const [message, setMessage] = useState("")
    const [chatHistory, setChatHistory] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [aiStatus, setAiStatus] = useState({
        prompt: "processing",
        writer: "processing"
    })
    const [enablePrompt, setEnablePrompt] = useState(false)

    useEffect(() => {
        
    }, [])

    async function manageCompletion(type) {
        try {
            chrome.runtime.sendMessage({type: type}, (response) => {
                if (response && response.success) {
                    getAiStatus()
                } else {
                    console.error('Error managing completion:', response.error);
                }
            });
        } catch (error) {
            console.error('Error managing completion:', error);
        }
    }

    function handleEnableClick() {
        setEnablePrompt(!enablePrompt)
        if (!enablePrompt) {
            manageCompletion('CREATE_PROMPT')
        } else {
            manageCompletion('RESET_SESSION')
        }
    }

    async function getAiStatus() {
        chrome.runtime.sendMessage({ type: 'CHECK_STATUS' }, (response) => {
            if (response && response.success) {
                setAiStatus(response.data)
            } else {
                console.error('Error:', response.error);
            }
        });
    }

    async function handleChatWithAI() {
        if (!message.trim()) return;

        const userMessage = {
            role: 'user',
            content: message
        };
        const newHistory = [...chatHistory, userMessage];
        setChatHistory(newHistory);

        const currentMessage = message;
        setMessage('');
        setIsLoading(true);

        try {
            const aiResponse = await chromeMessaging.chatWithAI(currentMessage, newHistory);
            console.log('AI response', aiResponse.response);

            const aiMessage = {
                role: 'assistant',
                content: aiResponse.response
            };
            setChatHistory([...newHistory, aiMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <div>
                <p>ai Status</p>
                <p>prompt {aiStatus.prompt}</p>
                <p>writer {aiStatus.writer}</p>
            </div>
            <div>
                <button onClick={handleEnableClick}>{enablePrompt ? 'Disable Prompt Chat' : 'Enable Prompt Chat'}</button>
            </div>
            <div>
                {chatHistory.map((msg, index) => (
                    <div key={index}>
                        <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong> {msg.content}
                    </div>
                ))}
                {isLoading && <div className="message loading">AI is typing...</div>}
            </div>

            <div>
                <input
                    type='text'
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleChatWithAI()
                        }
                    }}
                    disabled={isLoading}
                />
                <button
                    onClick={handleChatWithAI}
                    disabled={isLoading || !message.trim()}>
                    {isLoading ? 'Sending...' : 'Send'}
                </button>
            </div>
        </>
    )
}

export default Chat