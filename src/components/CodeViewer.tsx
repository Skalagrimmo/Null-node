import React, { useState } from 'react';
import { Copy, Check, FileCode, Server, Zap, Cpu, Settings } from 'lucide-react';
import { rustSnippets, RustSnippet } from '../data/rustCode';

export default function CodeViewer() {
  const [activeSnippet, setActiveSnippet] = useState<RustSnippet>(rustSnippets[0]);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Group snippets by phase for categorized sidebar/tabs
  const phases = Array.from(new Set(rustSnippets.map(s => s.phase)));

  const getPhaseIcon = (phase: string) => {
    if (phase.includes('Phase 1')) return <Zap className="w-4 h-4 text-cyan-400" />;
    if (phase.includes('Phase 2')) return <Cpu className="w-4 h-4 text-[#00FF41]" />;
    if (phase.includes('Phase 3')) return <Server className="w-4 h-4 text-indigo-400" />;
    if (phase.includes('Phase 4')) return <FileCode className="w-4 h-4 text-yellow-400" />;
    return <Settings className="w-4 h-4 text-rose-400" />;
  };

  return (
    <div id="rust-code-explorer" className="bg-[#030303]/90 border border-[#00FF41]/20 rounded-xl overflow-hidden flex flex-col font-mono text-xs glow-border-green">
      {/* Title Header */}
      <div className="bg-black p-4 border-b border-[#00FF41]/15 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5 text-[#00FF41]" />
          <div>
            <h4 className="text-sm font-bold text-slate-100 tracking-wider glow-text-green">ANDROID-RUST ENGINE BLUEPRINTS</h4>
            <p className="text-[10px] text-slate-500">Copy optimized wgpu & Bevy templates directly into your Cargo project</p>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00FF41]/10 hover:bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]/20 active:bg-[#00FF41]/40 rounded transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#00FF41]" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'COPIED!' : 'COPY CODE'}</span>
        </button>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[480px]">
        {/* Left Sidebar for categories and files */}
        <div className="md:col-span-4 bg-black border-r border-[#00FF41]/15 p-3 flex flex-col gap-4">
          {phases.map(phase => (
            <div key={phase} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1 bg-slate-900/40 rounded">
                {getPhaseIcon(phase)}
                <span>{phase}</span>
              </div>
              <div className="flex flex-col gap-1.5 pl-2 mt-1">
                {rustSnippets
                  .filter(s => s.phase === phase)
                  .map(s => (
                    <button
                      key={s.title}
                      onClick={() => setActiveSnippet(s)}
                      className={`text-left px-2.5 py-1.5 rounded transition-all text-[11px] truncate ${
                        activeSnippet.title === s.title
                          ? 'bg-[#00FF41]/10 text-[#00FF41] border-l-2 border-[#00FF41] pl-3'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-bold">{s.title}</div>
                      <div className="text-[9px] text-slate-500 italic font-normal mt-0.5">{s.filename}</div>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right Panel showing active code */}
        <div className="md:col-span-8 flex flex-col bg-[#030303] overflow-hidden">
          {/* File description area */}
          <div className="bg-black/40 p-4 border-b border-[#00FF41]/10 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#00FF41]">{activeSnippet.filename}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-bold uppercase">{activeSnippet.language}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              {activeSnippet.description}
            </p>
          </div>

          {/* Active Codeblock Editor display */}
          <div className="relative flex-1 max-h-[520px] overflow-y-auto p-4 bg-black/90 text-slate-300 text-[11px] leading-relaxed selection:bg-[#00FF41]/20 selection:text-[#00FF41]">
            <pre className="font-mono whitespace-pre">{activeSnippet.code}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
