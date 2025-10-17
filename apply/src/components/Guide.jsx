
function Guide() {
    return (
        <div className="space-y-3 text-sm">
            <div className="border-l-4 border-blue-400 pl-3">
                <div className="text-blue-600 font-medium mb-1">💬 Smart Chat</div>
                <p className="text-slate-600">Ask AI about current page content and get contextual responses</p>
            </div>
            <div className="border-l-4 border-green-400 pl-3">
                <div className="text-green-600 font-medium mb-1">✍️ Web Writing</div>
                <p className="text-slate-600">Auto-complete text in any input field with AI assistance</p>
            </div>
            <div className="border-l-4 border-purple-400 pl-3">
                <div className="text-purple-600 font-medium mb-1">🔧 Content Tools</div>
                <p className="text-slate-600">Improve and rewrite existing text with one click</p>
            </div>
            <div className="border-l-4 border-orange-400 pl-3">
                <div className="text-orange-600 font-medium mb-1">⚙️ Context Setup</div>
                <p className="text-slate-600">Configure AI behavior, tone, and writing preferences</p>
            </div>
        </div>
    );
}
export default Guide;