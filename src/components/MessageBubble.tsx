"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import { Copy, Check, Terminal, Cpu, FileCode, Edit3, Search, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string | any[];
  toolInvocations?: any[];
}

export function MessageBubble({ role, content, toolInvocations }: MessageBubbleProps) {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const textContent = typeof content === 'string' 
    ? content 
    : Array.isArray(content) 
      ? content.find(c => c.type === 'text')?.text || '' 
      : '';

  const imageUrl = Array.isArray(content) 
    ? content.find(c => c.type === 'image_url')?.image_url?.url 
    : null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full gap-4 py-8 px-4 md:px-12 transition-standard",
        isUser ? "bg-transparent" : "bg-[#111111]/30 border-y border-white/[0.02]"
      )}
    >
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-white/5 flex items-center justify-center text-gray-400 shadow-xl">
            <Terminal size={18} strokeWidth={1.5} />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-xl shadow-indigo-500/5">
            <Cpu size={18} strokeWidth={1.5} />
          </div>
        )}
      </div>
      
      <div className="flex-1 space-y-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[9px] uppercase tracking-[0.3em] text-gray-500">
            {isUser ? 'Observer' : 'AstraNova Interface'}
          </span>
          {!isUser && textContent && (
            <button 
              onClick={copyToClipboard}
              className="p-1.5 rounded-md hover:bg-white/5 transition-standard text-gray-600 hover:text-gray-300"
              title="Copy Output"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          )}
        </div>

        {imageUrl && (
          <div className="mb-4 inline-block overflow-hidden rounded-xl border border-white/5 shadow-2xl">
            <img src={imageUrl} alt="Visual Data" className="max-h-80 w-auto object-contain bg-black/20" />
          </div>
        )}

        {textContent && (
          <div className="markdown-content prose prose-invert prose-sm max-w-none leading-relaxed text-gray-300 selection:bg-indigo-500/30">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <div className="relative my-6 rounded-xl overflow-hidden border border-white/5 shadow-2xl group">
                       <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/[0.03]">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{match[1]}</span>
                       </div>
                       <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        className="!m-0 !bg-[#050505] !p-6"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className="bg-white/5 px-1.5 py-0.5 rounded text-indigo-400 font-mono text-[0.9em]" {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {textContent}
            </ReactMarkdown>
          </div>
        )}

        {toolInvocations && toolInvocations.map((toolInvocation: any) => {
          const { toolName, toolCallId, state } = toolInvocation;

          if (state === 'result') {
            const { result } = toolInvocation;
            return (
              <div key={toolCallId} className="flex flex-col gap-2 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">
                  {toolName === 'search' && <Search size={14} className="text-blue-500/50" />}
                  {toolName === 'file_generator' && <FileCode size={14} className="text-emerald-500/50" />}
                  {toolName === 'file_patcher' && <Edit3 size={14} className="text-amber-500/50" />}
                  <span>Laboratory Task: {toolName.replace('_', ' ')}</span>
                </div>
                
                <div className="p-5 rounded-xl bg-black border border-white/[0.03] shadow-inner">
                  {toolName === 'file_generator' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium italic">
                         <Check size={12} className="text-emerald-500" />
                         <span>Synthesized: {result.message}</span>
                      </div>
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={result.language || 'typescript'}
                        PreTag="div"
                        className="rounded-lg !bg-white/[0.01] border border-white/[0.02] !p-4"
                      >
                        {result.content}
                      </SyntaxHighlighter>
                    </div>
                  )}
                  {toolName === 'file_patcher' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium italic">
                         <Check size={12} className="text-emerald-500" />
                         <span>Modified: {result.message}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1 font-mono text-[11px]">
                        <div className="p-3 rounded bg-red-500/[0.03] border border-red-500/10 opacity-60">
                           <span className="text-[9px] text-red-500/50 font-bold uppercase mb-2 block tracking-widest">Removal</span>
                           <pre className="text-gray-500 overflow-x-auto whitespace-pre-wrap">{result.patch.old_content}</pre>
                        </div>
                        <div className="p-3 rounded bg-emerald-500/[0.03] border border-emerald-500/10">
                           <span className="text-[9px] text-emerald-500/50 font-bold uppercase mb-2 block tracking-widest">Insertion</span>
                           <pre className="text-gray-300 overflow-x-auto whitespace-pre-wrap">{result.patch.new_content}</pre>
                        </div>
                      </div>
                    </div>
                  )}
                  {toolName === 'search' && (
                    <div className="flex items-center gap-3">
                       <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                       <p className="text-xs text-gray-500 font-medium tracking-tight">Analysis complete. Global data nodes synchronized.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={toolCallId} className="flex items-center gap-3 mt-6">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
              <span className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">Executing Interface Logic: {toolName}...</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
