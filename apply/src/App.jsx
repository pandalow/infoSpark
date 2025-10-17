import { useState, useEffect } from 'react'
import './App.css'
import Context from './components/Context'
import Chat from './components/Chat'
import Guide from './components/Guide'

function App() {
  const [activeTab, setActiveTab] = useState('chat')
  const [showGuide, setShowGuide] = useState(false)
  const [aiStatus, setAiStatus] = useState({
    prompt: "unavailable",
    writer: "unavailable", 
    rewriter: "unavailable"
  })
  const [enablePrompt, setEnablePrompt] = useState(false)

  useEffect(() => {
    // 获取AI状态
    getAiStatus()
    // 定期更新状态
    const interval = setInterval(getAiStatus, 5000)
    return () => clearInterval(interval)
  }, [])

 async function getAiStatus() {
  try {
    chrome.runtime.sendMessage({ type: 'CHECK_STATUS' }, (response) => {
      if (response && response.success && response.data) {
        setAiStatus({
          prompt: response.data.prompt ?? "unavailable",
          writer: response.data.writer ?? "unavailable",
          rewriter: response.data.rewriter ?? "unavailable"
        })
      }
    })
  } catch (error) {
    console.error('Error getting AI status:', error)
  }
}
  async function manageCompletion(type) {
    try {
      chrome.runtime.sendMessage({ type: type }, (response) => {
        if (response && response.success) {
          getAiStatus()
        } else {
          console.error('Error managing completion:', response.error)
        }
      })
    } catch (error) {
      console.error('Error managing completion:', error)
    }
  }

  function handleEnableClick() {
    setEnablePrompt(!enablePrompt)
    if (!enablePrompt) {
      manageCompletion('CREATE_COMPLETION_SESSION')
    } else {
      manageCompletion('RESET_SESSION')
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'available': return 'text-green-600'
      case 'downloadable': return 'text-amber-600'
      case 'unavailable': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusText = (status) => {
    switch(status) {
      case 'available': return 'Available'
      case 'downloadable': return 'Downloading...'
      case 'unavailable': return 'Unavailable'
      default: return 'Offline'
    }
  }

  return (
    <div className="min-h-screen flex flex-col modern-bg p-3">
      <div className="flex-1 flex flex-col max-w-full">
        {/* Compact Header */}
        <header className="mb-3">
          <div className="glass-card-modern p-3">
            {/* 第一行：Logo + InfoSpark 标题 */}
            <div className="flex items-center gap-2 mb-2">
              <div className="logo-modern w-5 h-5">
                <img src="/logo.png" alt="InfoSpark AI" className="w-full h-full object-contain" />
              </div>
              <span className="text-sm font-medium modern-gradient-text animate-pulse">
                InfoSpark - Your local AI Copilot
              </span>
            </div>

            {/* 第二行：状态 + Copilot 控制 */}
            <div className="flex items-center justify-between bg-slate-50/80 backdrop-filter backdrop-blur-sm rounded-lg p-2 border border-blue-200/50">
              {/* 状态指示器 */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    aiStatus.prompt === 'available' ? 'bg-green-500' : 
                    aiStatus.prompt === 'downloadable' ? 'bg-yellow-500' : 
                    'bg-gray-400'
                  }`}></div>
                  <span className="text-slate-600 font-medium">Completion</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    aiStatus.writer === 'available' ? 'bg-green-500' : 
                    aiStatus.writer === 'downloadable' ? 'bg-yellow-500' : 
                    'bg-gray-400'
                  }`}></div>
                  <span className="text-slate-600 font-medium">Writer</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    aiStatus.rewriter === 'available' ? 'bg-green-500' : 
                    aiStatus.rewriter === 'downloadable' ? 'bg-yellow-500' : 
                    'bg-gray-400'
                  }`}></div>
                  <span className="text-slate-600 font-medium">Rewriter</span>
                </div>
              </div>
              
              {/* Copilot控制按钮 */}
              <button
                onClick={handleEnableClick}
                className={`sidepanel-toggle-btn ${enablePrompt ? 'active' : ''}`}
              >
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${enablePrompt ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                  <span className="text-xs font-medium">
                    Copilot {enablePrompt ? 'ON' : 'OFF'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Guide 展开/收起行 */}
        <div className="mb-3">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="w-full guide-toggle-btn flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">📚 Quick Guide</span>
            </div>
            <svg 
              className={`w-4 h-4 transition-transform text-slate-600 ${showGuide ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Guide 展开内容 */}
          {showGuide && (
            <div className="mt-2 modern-fade-in">
              <div className="glass-card-modern p-3">
                <Guide />
              </div>
            </div>
          )}
        </div>

        {/* Sidepanel导航 */}
        <div className="mb-3">
          <nav className="sidepanel-tab-container">
            <button
              onClick={() => setActiveTab('chat')}
              className={`sidepanel-tab ${activeTab === 'chat' ? 'active' : ''}`}
            >
              <span className="text-sm font-medium">Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('context')}
              className={`sidepanel-tab ${activeTab === 'context' ? 'active' : ''}`}
            >
              <span className="text-sm font-medium">Context</span>
            </button>
          </nav>
        </div>

        {/* Sidepanel内容区域 */}
        <main className="glass-card-modern p-4 flex-1 min-h-0">
          {activeTab === 'chat' && (
            <div className="modern-fade-in h-full">
              <Chat aiStatus={aiStatus} enablePrompt={enablePrompt} />
            </div>
          )}
          
          {activeTab === 'context' && (
            <div className="modern-fade-in overflow-y-auto">
              <Context 
                aiStatus={aiStatus} 
                enablePrompt={enablePrompt}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
