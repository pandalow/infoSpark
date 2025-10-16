import { useEffect, useState, useRef } from 'react';
import { chromeMessaging } from '../chromeMessaging';

function Context({ aiStatus, enablePrompt, onStatusUpdate }) {
    const [context, setContext] = useState("");
    const [isHide, setIsHide] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const isFirstSave = useRef(true);

    useEffect(() => {
        loadContext();
    }, []);

    async function loadContext() {
        try {
            const savedContext = await chromeMessaging.getStorage('prompt_content');
            if (savedContext) {
                setContext(savedContext);
            }
            isFirstSave.current = false;
        } catch (error) {
            console.error('Error loading context:', error);
            isFirstSave.current = false;
        }
    }

    const handleChange = async (e) => {
        const value = e.target.value;
        setContext(value);
        
        if (!isFirstSave.current) {
            setIsSaving(true);
            try {
                await chromeMessaging.setStorage('prompt_content', value);
                setTimeout(() => setIsSaving(false), 500);
            } catch (error) {
                console.error('Error saving context:', error);
                setIsSaving(false);
            }
        }
    };

    return (
        <div className="h-full space-y-6">
            {/* AI Context Configuration */}
            <div className="glass-card-dark p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">AI Context</h3>
                    <button
                        onClick={() => setIsHide(!isHide)}
                        className="btn-modern btn-ghost text-sm px-3 py-1"
                    >
                        {isHide ? 'Configure' : 'Hide'}
                    </button>
                </div>
                
                {!isHide && (
                    <div className="space-y-3 modern-fade-in">
                        <textarea
                            value={context}
                            onChange={handleChange}
                            placeholder="Define the AI's role and behavior..."
                            className="input-modern h-32 resize-none"
                        />
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                                <span>Tips: Detailed context helps AI understand better</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {isSaving && (
                                    <div className="flex items-center gap-1 text-green-600">
                                        <div className="loading-dots">
                                            <div></div>
                                            <div></div>
                                            <div></div>
                                        </div>
                                        <span className="text-xs">Saving...</span>
                                    </div>
                                )}
                                <span className="text-slate-500">{context.length} characters</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Usage Guide */}
            <div className="glass-card-dark p-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Usage Guide</h3>
                <div className="space-y-4 text-sm">
                    <div className="border-l-4 border-blue-400 pl-3">
                        <div className="text-blue-600 font-medium mb-1">Smart Chat</div>
                        <p className="text-slate-600">Engage with AI for professional advice</p>
                    </div>
                    <div className="border-l-4 border-green-400 pl-3">
                        <div className="text-green-600 font-medium mb-1">Web Writing</div>
                        <p className="text-slate-600">Auto-completion in text fields</p>
                    </div>
                    <div className="border-l-4 border-purple-400 pl-3">
                        <div className="text-purple-600 font-medium mb-1">Content Optimization</div>
                        <p className="text-slate-600">One-click content improvement</p>
                    </div>
                </div>
            </div>

            {/* Advanced Settings */}
            <div className="glass-card-dark p-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Advanced Settings</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-slate-700 text-sm font-medium mb-2">Response Speed</label>
                        <select className="input-modern">
                            <option value="fast">Fast Mode</option>
                            <option value="balanced">Balanced Mode</option>
                            <option value="accurate">Accurate Mode</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-slate-700 text-sm font-medium mb-2">Content Style</label>
                        <select className="input-modern">
                            <option value="professional">Professional</option>
                            <option value="casual">Casual</option>
                            <option value="creative">Creative</option>
                        </select>
                    </div>
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                    <button className="btn-modern btn-ghost">
                        Reset Settings
                    </button>
                    <button 
                        className="btn-modern btn-primary"
                        onClick={onStatusUpdate}
                    >
                        Save Settings
                    </button>
                </div>
            </div>

            {/* System Info */}
            <div className="glass-card-dark p-3">
                <div className="flex items-center justify-between text-sm text-slate-600">
                    <div className="flex items-center gap-4">
                        <span>InfoSpark AI v1.0</span>
                        <span>•</span>
                        <span>Secure & Encrypted</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>Status: Normal</span>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Context;
