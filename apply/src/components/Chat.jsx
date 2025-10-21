import { useState } from 'react'
import { chromeMessaging } from '../chromeMessaging'

function Chat({ aiStatus, enablePrompt }) {
    const [message, setMessage] = useState("")
    const [chatHistory, setChatHistory] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    
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
            // Adding error message to chat history
            const errorMessage = {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.'
            };
            setChatHistory([...newHistory, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleChatWithAI();
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* 聊天历史区域 */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-3 px-1">
                {chatHistory.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">
                        <div className="text-2xl mb-2">💬</div>
                        <p className="text-sm">Start a conversation with AI</p>
                        <p className="text-xs text-slate-400 mt-1">Ask anything and get intelligent responses</p>
                    </div>
                ) : (
                    chatHistory.map((msg, index) => (
                        <div
                            key={index}
                            className={`sidepanel-chat-bubble ${
                                msg.role === 'user' 
                                    ? 'sidepanel-chat-bubble-user' 
                                    : 'sidepanel-chat-bubble-ai'
                            }`}
                        >
                            <div className="text-xs opacity-70 mb-1">
                                {msg.role === 'user' ? 'You' : 'AI Assistant'}
                            </div>
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="sidepanel-chat-bubble sidepanel-chat-bubble-ai">
                        <div className="flex items-center gap-2">
                            <div className="loading-dots">
                                <div></div>
                                <div></div>
                                <div></div>
                            </div>
                            <span className="text-sm">AI is thinking...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* 输入区域 */}
            <div className="border-t border-blue-200/50 pt-4">
                <div className="flex gap-2">
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message here..."
                        className="sidepanel-textarea-modern flex-1 min-h-[2.5rem] max-h-24"
                        disabled={isLoading}
                        rows={1}
                    />
                    <button
                        onClick={handleChatWithAI}
                        disabled={isLoading || !message.trim()}
                        className="btn-modern btn-primary px-3 py-2 self-end"
                    >
                        {isLoading ? (
                            <div className="loading-dots">
                                <div></div>
                                <div></div>
                                <div></div>
                            </div>
                        ) : (
                            'Send'
                        )}
                    </button>
                </div>

                {/* 快捷操作 */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <button 
                        className="btn-modern btn-ghost text-xs py-2"
                        onClick={() => setMessage('Help me write a professional email')}
                        disabled={isLoading}
                    >
                        Write Email
                    </button>
                    <button 
                        className="btn-modern btn-ghost text-xs py-2"
                        onClick={() => setMessage('Explain this concept in simple terms')}
                        disabled={isLoading}
                    >
                        Explain
                    </button>
                    <button 
                        className="btn-modern btn-ghost text-xs py-2"
                        onClick={() => setMessage('Improve and rewrite this text')}
                        disabled={isLoading}
                    >
                        Improve Text
                    </button>
                    <button 
                        className="btn-modern btn-ghost text-xs py-2"
                        onClick={() => setChatHistory([])}
                        disabled={isLoading || chatHistory.length === 0}
                    >
                        Clear Chat
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Chat