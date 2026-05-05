interface TypingIndicatorProps {
  agentName: string
}

export default function TypingIndicator({ agentName }: TypingIndicatorProps) {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse-slow" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-slate-500 mb-1.5 font-medium">
          {agentName} is aan het denken...
        </p>
        <div className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms`, animationDuration: '1.2s' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
