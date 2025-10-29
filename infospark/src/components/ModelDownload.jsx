import { useState, useEffect } from 'react'

function ModelDownload({ aiStatus, onComplete }) {
    const [overallProgress, setOverallProgress] = useState(0)
    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadPhase, setDownloadPhase] = useState('checking') // checking, ready, downloading, completed
    const [userInitiated, setUserInitiated] = useState(false)

    // Listen for download progress messages from background
    useEffect(() => {
        const handleMessage = (message) => {
            if (message.type === 'MODEL_DOWNLOAD_PROGRESS') {
                const { modelType, progress } = message.data;
                // Use any model's progress as overall progress (they share the same model)
                setOverallProgress(progress);
            } else if (message.type === 'MODEL_STATUS_CHANGED') {
                const { modelType, status } = message.data;
                
                // If status becomes available, may need to update UI
                if (status === 'available' && downloadPhase === 'downloading') {
                    // Check if all models are completed
                    setTimeout(() => {
                        // This will be detected through aiStatus changes
                    }, 500);
                }
            }
        };

        // Add message listener
        chrome.runtime.onMessage.addListener(handleMessage);
        
        return () => {
            // Cleanup listener
            chrome.runtime.onMessage.removeListener(handleMessage);
        };
    }, [downloadPhase]);

    // Check if download page needs to be shown
    const needsDownload = () => {
        const hasDownloadableOrUnavailable = Object.values(aiStatus).some(status => 
            status === 'downloadable' || status === 'unavailable' || status === 'downloading'
        );
        return hasDownloadableOrUnavailable;
    }

    // Check if all models are ready
    const allModelsReady = () => {
        const ready = Object.values(aiStatus).every(status => status === 'available')
        return ready;
    }

    // Get list of models that need to be downloaded
    const getDownloadableModels = () => {
        const models = []
        if (aiStatus.prompt !== 'available') models.push({ 
            name: 'Language Model (Chat & Completion)', 
            key: 'prompt',
            status: aiStatus.prompt 
        })
        if (aiStatus.writer !== 'available') models.push({ 
            name: 'Writer Model', 
            key: 'writer',
            status: aiStatus.writer 
        })
        if (aiStatus.rewriter !== 'available') models.push({ 
            name: 'Rewriter Model', 
            key: 'rewriter',
            status: aiStatus.rewriter 
        })
        return models
    }

    // Start download process
    const startDownload = async () => {
        setIsDownloading(true)
        setDownloadPhase('downloading')
        setUserInitiated(true)

        try {
            // Call new download API
            chrome.runtime.sendMessage({ type: 'START_MODEL_DOWNLOAD' }, (response) => {
                if (response && response.success) {
                    // Download has started, stay in downloading state
                } else {
                    // If download startup fails, don't immediately revert state
                    // Let state checking logic handle it
                    setTimeout(() => {
                        if (downloadPhase === 'downloading' && !Object.values(aiStatus).some(s => s === 'downloading')) {
                            setIsDownloading(false)
                            setDownloadPhase('ready')
                        }
                    }, 1000)
                }
            })

        } catch (error) {
            setIsDownloading(false)
            setDownloadPhase('ready')
        }
    }

    // Initial state check
    useEffect(() => {
        if (allModelsReady()) {
            setDownloadPhase('completed')
            setTimeout(() => {
                onComplete()
            }, 1500)
        } else if (needsDownload() && downloadPhase === 'checking') {
            // Check if already downloading
            const hasDownloading = Object.values(aiStatus).some(status => status === 'downloading');
            if (hasDownloading) {
                setDownloadPhase('downloading');
                setIsDownloading(true);
                setUserInitiated(true);
            } else {
                setDownloadPhase('ready');
            }
        }
    }, [aiStatus])

    // Special handling: if all status are unavailable, force show download page
    useEffect(() => {
        const allUnavailable = Object.values(aiStatus).every(status => status === 'unavailable');
        
        if (allUnavailable && downloadPhase === 'checking') {
            setDownloadPhase('ready');
        }
    }, [aiStatus, downloadPhase])

    // Monitor download progress
    useEffect(() => {
        if (downloadPhase === 'downloading' && userInitiated) {
            const checkProgress = setInterval(() => {
                if (allModelsReady()) {
                    setDownloadPhase('completed')
                    setIsDownloading(false)
                    clearInterval(checkProgress)
                    setTimeout(() => {
                        onComplete()
                    }, 2000)
                }
            }, 1500)

            return () => clearInterval(checkProgress)
        }
    }, [downloadPhase, userInitiated, aiStatus, onComplete])

    const skipDownload = () => {
        localStorage.setItem('infospark-setup-completed', 'true')
        onComplete()
    }

    if (!needsDownload() || downloadPhase === 'completed') {
        return null
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header bar */}
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-4 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                          d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">InfoSpark AI</h2>
                                <p className="text-blue-100 text-sm">First-time setup</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content area */}
                <div className="p-4">
                    {downloadPhase === 'checking' && (
                        <div className="text-center py-6">
                            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                            <p className="text-gray-600 font-medium">Checking AI model status...</p>
                            <p className="text-gray-500 text-sm mt-1">Please wait a moment</p>
                        </div>
                    )}

                    {downloadPhase === 'ready' && (
                        <div>
                            <div className="text-center mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-1">AI Models Setup</h3>
                                <p className="text-gray-600 text-sm">
                                    Download AI models for private, offline functionality.
                                </p>
                            </div>

                            {/* Models to download */}
                            <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">What you'll get:</h4>
                                <div className="space-y-1.5">
                                    {getDownloadableModels().map((model, index) => (
                                        <div key={index} className="flex items-center gap-2 text-sm">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                            <span className="text-gray-700">{model.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <div className="text-sm">
                                        <span className="font-medium text-amber-800">One-time download (~1-2GB)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {downloadPhase === 'downloading' && (
                        <div>
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Downloading AI Models</h3>
                                <p className="text-gray-600 text-sm">
                                    Please keep this tab open. The models are being downloaded and cached locally.
                                </p>
                            </div>

                            {/* Overall download progress */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold text-gray-700">AI Models Download</h4>
                                    <span className="text-sm font-medium text-blue-600">{overallProgress.toFixed(1)}%</span>
                                </div>
                                
                                {/* Progress bar */}
                                <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                                    <div 
                                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${overallProgress}%` }}
                                    ></div>
                                </div>
                                
                                {/* Model status list */}
                                <div className="space-y-2">
                                    {getDownloadableModels().map((model, index) => {
                                        const isCompleted = aiStatus[model.key] === 'available';
                                        const isDownloading = Object.values(aiStatus).some(status => status === 'downloading') && !isCompleted;
                                        
                                        return (
                                            <div key={index} className="flex items-center gap-3">
                                                <div className="flex-shrink-0">
                                                    {isCompleted ? (
                                                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    ) : isDownloading ? (
                                                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <span className="text-sm text-gray-700">{model.name}</span>
                                                    <span className="ml-2 text-xs text-gray-500">
                                                        {isCompleted ? '✓ Ready' : isDownloading ? 'Downloading...' : 'Waiting...'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mt-0.5 flex-shrink-0"></div>
                                    <div className="text-sm text-blue-700">
                                        <p className="font-medium">Download in progress...</p>
                                        <p className="text-blue-600 mt-1">
                                            Chrome is downloading the shared AI model that powers all three capabilities 
                                            (Chat, Writer, and Rewriter). This may take several minutes.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {downloadPhase === 'completed' && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Setup Complete!</h3>
                            <p className="text-gray-600 text-sm mb-4">
                                Your AI models are ready. InfoSpark will start automatically.
                            </p>
                            <div className="flex items-center justify-center gap-2 text-blue-600 text-sm">
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <span>Launching InfoSpark AI...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom buttons */}
                {downloadPhase === 'ready' && (
                    <div className="p-6 bg-gray-50 border-t">
                        <div className="flex gap-3">
                            <button
                                onClick={startDownload}
                                disabled={isDownloading}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 shadow-lg"
                            >
                                {isDownloading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Starting...</span>
                                    </div>
                                ) : (
                                    'Download & Setup'
                                )}
                            </button>
                            <button
                                onClick={skipDownload}
                                className="px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors text-sm font-medium"
                            >
                                Skip
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-3">
                            This setup is required for optimal performance
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ModelDownload