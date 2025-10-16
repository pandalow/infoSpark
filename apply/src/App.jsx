import { useState, useEffect } from 'react'
import './App.css'
import Context from './components/Context'
import Chat from './components/Chat'
import { chromeMessaging } from './chromeMessaging'

function App() {
  const [activeTab, setActiveTab] = useState('chat')
  const [aiStatus, setAiStatus] = useState({
    prompt: "offline",
    writer: "offline", 
    rewriter: "offline"
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
        if (response && response.success) {
          setAiStatus(response.data)
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
      case 'ready': return 'text-green-600'
      case 'processing': return 'text-amber-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusText = (status) => {
    switch(status) {
      case 'ready': return 'Ready'
      case 'processing': return 'Processing'
      case 'error': return 'Error'
      default: return 'Offline'
    }
  }

  return (
    <div className="h-screen flex flex-col modern-bg p-3">
      <div className="flex-1 flex flex-col max-w-full">
        {/* Sidepanel Header */}
        <header className="mb-4">
          <div className="glass-card-modern p-4">
            {/* Logo和标题行 */}
            <div className="flex items-center gap-3 mb-4">
              <div className="logo-modern">
                <img src="/logo.png" alt="InfoSpark AI" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold modern-gradient-text truncate">
                  InfoSpark AI
                </h1>
                <p className="text-slate-600 text-sm">智能创作助手</p>
              </div>
            </div>

            {/* AI状态栏和Copilot控制 */}
            <div className="flex items-center justify-between bg-slate-50/80 backdrop-filter backdrop-blur-sm rounded-lg p-3 border border-blue-200/50">
              {/* 状态指示器 */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    aiStatus.prompt === 'ready' ? 'bg-green-500' : 
                    aiStatus.prompt === 'processing' ? 'bg-yellow-500' : 
                    'bg-gray-400'
                  }`}></div>
                  <span className="text-slate-600 font-medium">Completion</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    aiStatus.writer === 'ready' ? 'bg-green-500' : 
                    aiStatus.writer === 'processing' ? 'bg-yellow-500' : 
                    'bg-gray-400'
                  }`}></div>
                  <span className="text-slate-600 font-medium">Writer</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    aiStatus.rewriter === 'ready' ? 'bg-green-500' : 
                    aiStatus.rewriter === 'processing' ? 'bg-yellow-500' : 
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
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${enablePrompt ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                  <span className="text-xs font-medium">
                    Copilot {enablePrompt ? 'ON' : 'OFF'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </header>

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
              <span className="text-sm font-medium">Settings</span>
            </button>
          </nav>
        </div>

        {/* Sidepanel内容区域 */}
        <main className="glass-card-modern p-4 flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <div className="modern-fade-in h-full">
              <Chat aiStatus={aiStatus} enablePrompt={enablePrompt} />
            </div>
          )}
          
          {activeTab === 'context' && (
            <div className="modern-fade-in h-full overflow-y-auto">
              <Context 
                aiStatus={aiStatus} 
                enablePrompt={enablePrompt}
                onStatusUpdate={getAiStatus}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
