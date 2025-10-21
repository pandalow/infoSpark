import { useEffect, useState, useRef } from 'react';
import { chromeMessaging } from '../chromeMessaging';

function Context({ aiStatus, enablePrompt }) {
    const [context, setContext] = useState("");
    const [completionOptions, setCompletionOptions] = useState({
        contextLevel: "none", // none, paragraph, fullpage
        maxContextLength: 1000,
        enableContextAware: true
    });
    const [writerOptions, setWriterOptions] = useState({
        tone: "casual",
        length: "medium",
        format: "plain-text",
        sharedContext: ""
    });
    const [rewriterOptions, setRewriterOptions] = useState({
        tone: "as-is",
        format: "as-is",
        length: "as-is",
        sharedContext: "",
    });
    const [isSaving, setIsSaving] = useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = useState('completion');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const isFirstSave = useRef(true);

    useEffect(() => {
        loadContext();
        loadCompletionOptions();
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

    async function loadCompletionOptions() {
        try {
            const savedOptions = await chromeMessaging.getStorage('completionOptions');
            if (savedOptions) {
                setCompletionOptions({ ...completionOptions, ...savedOptions });
            }
        } catch (error) {
            console.error('Error loading completion options:', error);
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

    function handleSaveChatContext() {
        chromeMessaging.setStorage('prompt_content', context);
        chromeMessaging.sendMessage('UPDATE_CHAT_CONTEXT');
        
        // 显示保存成功提示
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    }

    function handleSaveParamsOfWriter() {
        chrome.storage.local.set({
            writerOptions: {
                tone: writerOptions.tone,
                length: writerOptions.length,
                format: writerOptions.format,
                sharedContext: writerOptions.sharedContext
            }
        });
        chromeMessaging.sendMessage('ENABLE_WRITER');
        
        // 显示保存成功提示
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    }

    function handleSaveParamsOfRewriter() {
        chrome.storage.local.set({
            rewriterOptions: {
                tone: rewriterOptions.tone,
                format: rewriterOptions.format,
                length: rewriterOptions.length,
                sharedContext: rewriterOptions.sharedContext
            }
        });
        chromeMessaging.sendMessage('ENABLE_REWRITER');
        
        // 显示保存成功提示
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    }

    function handleSaveCompletionOptions() {
        chrome.storage.local.set({
            completionOptions: {
                contextLevel: completionOptions.contextLevel,
                maxContextLength: completionOptions.maxContextLength,
                enableContextAware: completionOptions.enableContextAware
            }
        });
        chromeMessaging.sendMessage('UPDATE_COMPLETION_OPTIONS');
        
        // 显示保存成功提示
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    }

    return (
        <div className="h-full space-y-6">
            {/* AI Context Configuration */}
            <div className="glass-card-dark p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">Chat Context</h3>
                    <div className="flex items-center gap-2">
                        {saveSuccess && (
                            <span className="text-xs text-green-600">✅ Saved!</span>
                        )}
                        <button
                            onClick={() => handleSaveChatContext()}
                            className="btn-modern btn-primary text-sm px-3 py-1"
                        >
                          Save
                        </button>
                    </div>
                </div>
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

            </div>

            {/* Writer and Rewriter Context Settings */}
            <div className="glass-card-dark p-4">
                {/* Tab Navigation */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">Assistant</h3>
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        <button
                            onClick={() => setActiveSettingsTab('completion')}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${activeSettingsTab === 'completion'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-800'
                                }`}
                        >
                            Completion
                        </button>
                        <button
                            onClick={() => setActiveSettingsTab('writer')}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${activeSettingsTab === 'writer'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-800'
                                }`}
                        >
                            Writer
                        </button>
                        <button
                            onClick={() => setActiveSettingsTab('rewriter')}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${activeSettingsTab === 'rewriter'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-800'
                                }`}
                        >
                            Rewriter
                        </button>
                    </div>
                </div>

                {/* Completion Settings */}
                {activeSettingsTab === 'completion' && (
                    <div className="space-y-4 modern-fade-in">
                        <div>
                            <label className="block text-slate-700 text-sm font-medium mb-2">Context Awareness Level</label>
                            <select className="input-modern"
                                value={completionOptions.contextLevel}
                                onChange={e => setCompletionOptions({ ...completionOptions, contextLevel: e.target.value })}
                            >
                                <option value="none">None - Only current input</option>
                                <option value="paragraph">Paragraph - Current paragraph context</option>
                                <option value="fullpage">Full Page - Entire page context</option>
                            </select>
                            <p className="text-xs text-slate-500 mt-1">
                                Higher levels provide more context but may impact performance
                            </p>
                        </div>
                        
                        <div>
                            <label className="block text-slate-700 text-sm font-medium mb-2">
                                Enable Context Awareness
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="enableContextAware"
                                    checked={completionOptions.enableContextAware}
                                    onChange={e => setCompletionOptions({ ...completionOptions, enableContextAware: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="enableContextAware" className="text-sm text-slate-700">
                                    Use page context to improve completions
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-700 text-sm font-medium mb-2">
                                Max Context Length (characters)
                            </label>
                            <input
                                type="number"
                                className="input-modern"
                                value={completionOptions.maxContextLength}
                                onChange={e => setCompletionOptions({ ...completionOptions, maxContextLength: parseInt(e.target.value) || 1000 })}
                                min="100"
                                max="5000"
                                step="100"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Limit context to prevent performance issues (100-5000 chars)
                            </p>
                        </div>

                        <div className="bg-blue-50 p-3 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 mb-2">Context Levels Explained:</h4>
                            <ul className="text-xs text-blue-700 space-y-1">
                                <li><strong>None:</strong> Only uses your current typing for completion</li>
                                <li><strong>Paragraph:</strong> Uses surrounding paragraph text for better context</li>
                                <li><strong>Full Page:</strong> Uses entire page content for maximum context awareness</li>
                            </ul>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            {saveSuccess && (
                                <div className="flex items-center gap-1 text-green-600">
                                    <span className="text-sm">✅ Saved successfully!</span>
                                </div>
                            )}
                            <button
                                className="btn-modern btn-primary"
                                onClick={handleSaveCompletionOptions}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                )}

                {/* Writer Settings */}
                {activeSettingsTab === 'writer' && (
                    <div className="space-y-4 modern-fade-in">
                        <div>
                            <label className="block text-slate-700 text-sm font-medium mb-2">Tone</label>
                            <select className="input-modern"
                                value={writerOptions.tone}
                                onChange={e => setWriterOptions({ ...writerOptions, tone: e.target.value })}
                            >
                                <option value="casual">Casual</option>
                                <option value="formal">Formal</option>
                                <option value="neutral">Neutral</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-700 text-sm font-medium mb-2">Content Style</label>
                            <select className="input-modern"
                                value={writerOptions.format}
                                onChange={e => setWriterOptions({ ...writerOptions, format: e.target.value })}
                            >
                                <option value="plain-text">Plain Text</option>
                                <option value="markdown">MarkDown</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-700 text-sm font-medium mb-2">Length</label>
                            <select className="input-modern"
                                value={writerOptions.length}
                                onChange={e => setWriterOptions({ ...writerOptions, length: e.target.value })}
                            >
                                <option value="short">Short</option>
                                <option value="medium">Medium</option>
                                <option value="long">Long</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-700 text-sm font-medium mb-2">Shared Context</label>
                            <textarea
                                className="input-modern h-20 resize-none"
                                value={writerOptions.sharedContext}
                                onChange={e => setWriterOptions({ ...writerOptions, sharedContext: e.target.value })}
                                placeholder="Additional context for the writer..."
                            ></textarea>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            {saveSuccess && (
                                <div className="flex items-center gap-1 text-green-600">
                                    <span className="text-sm">✅ Saved successfully!</span>
                                </div>
                            )}
                            <button
                                className="btn-modern btn-primary"
                                onClick={handleSaveParamsOfWriter}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                )}

                {/* Rewriter Settings */}
                {activeSettingsTab === 'rewriter' && (
                    <div className="space-y-4 modern-fade-in">
                        <div>
                            <label className="block text-slate-700 text-sm font-medium mb-2">Tone</label>
                            <select className="input-modern"
                                value={rewriterOptions.tone}
                                onChange={e => setRewriterOptions({ ...rewriterOptions, tone: e.target.value })}
                            >
                                <option value="more-casual">Casual</option>
                                <option value="as-is">As is</option>
                                <option value="more-formal">Formal</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-700 text-sm font-medium mb-2">Content Format</label>
                            <select className="input-modern"
                                value={rewriterOptions.format}
                                onChange={e => setRewriterOptions({ ...rewriterOptions, format: e.target.value })}
                            >
                                <option value="plain-text">Plain Text</option>
                                <option value="markdown">MarkDown</option>
                                <option value="as-is">As is</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-700 text-sm font-medium mb-2">Length</label>
                            <select className="input-modern"
                                value={rewriterOptions.length}
                                onChange={e => setRewriterOptions({ ...rewriterOptions, length: e.target.value })}
                            >
                                <option value="shorter">Shorter</option>
                                <option value="as-is">As is</option>
                                <option value="longer">Long</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-700 text-sm font-medium mb-2">Shared Context</label>
                            <textarea
                                className="input-modern h-20 resize-none"
                                value={rewriterOptions.sharedContext}
                                onChange={e => setRewriterOptions({ ...rewriterOptions, sharedContext: e.target.value })}
                                placeholder="Additional context for the rewriter..."
                            ></textarea>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            {saveSuccess && (
                                <div className="flex items-center gap-1 text-green-600">
                                    <span className="text-sm">✅ Saved successfully!</span>
                                </div>
                            )}
                            <button
                                className="btn-modern btn-primary"
                                onClick={handleSaveParamsOfRewriter}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                )}
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
