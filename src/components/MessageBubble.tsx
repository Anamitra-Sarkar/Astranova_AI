"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import { Copy, Check, User, Bot, FileCode, Edit3, Search } from 'lucide-react';
import { useState } from 'react';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolInvocations?: any[];
}

export function MessageBubble({ role, content, toolInvocations }: MessageBubbleProps) {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      "flex w-full gap-4 py-6 px-4 md:px-8 group",
      isUser ? "bg-transparent" : "bg-gray-50/5 dark:bg-white/5"
    )}>
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <User size={18} />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
            <Bot size={18} />
          </div>
        )}
      </div>
      
      <div className="flex-1 space-y-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[10px] uppercase tracking-[0.2em] opacity-40">
            {isUser ? 'Observer' : 'AstraNova'}
          </span>
          <button 
            onClick={copyToClipboard}
            className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors opacity-0 group-hover:opacity-100"
            title="Copy message"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
        </div>

        {content && (
          <div className="markdown-content prose prose-sm dark:prose-invert max-w-none leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <div className="relative my-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                       <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        className="!m-0 !bg-gray-900"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-indigo-500 font-mono text-[0.9em]" {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}

        {toolInvocations && toolInvocations.map((toolInvocation: any) => {
          const { toolName, toolCallId, state } = toolInvocation;

          if (state === 'result') {
            const { result } = toolInvocation;
            return (
              <div key={toolCallId} className="flex flex-col gap-2 mt-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {toolName === 'search' && <Search size={14} className="text-blue-400" />}
                  {toolName === 'file_generator' && <FileCode size={14} className="text-green-400" />}
                  {toolName === 'file_patcher' && <Edit3 size={14} className="text-orange-400" />}
                  <span>{toolName.replace('_', ' ')}</span>
                </div>
                
                <div className="p-4 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
                  {toolName === 'file_generator' && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-white">{result.message}</p>
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={result.language || 'typescript'}
                        PreTag="div"
                        className="rounded-lg !bg-black/50 border border-white/5"
                      >
                        {result.content}
                      </SyntaxHighlighter>
                    </div>
                  )}
                  {toolName === 'file_patcher' && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-white">{result.message}</p>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                           <span className="text-[10px] text-red-500 font-bold uppercase mb-1 block">Removed</span>
                           <pre className="text-xs text-gray-400 overflow-x-auto">{result.patch.old_content}</pre>
                        </div>
                        <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                           <span className="text-[10px] text-green-500 font-bold uppercase mb-1 block">Added</span>
                           <pre className="text-xs text-gray-300 overflow-x-auto">{result.patch.new_content}</pre>
                        </div>
                      </div>
                    </div>
                  )}
                  {toolName === 'search' && (
                    <p className="text-sm text-gray-400">Search completed with {result?.results?.length || 0} results.</p>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={toolCallId} className="flex items-center gap-2 mt-4 animate-pulse">
              <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-800" />
              <span className="text-xs text-gray-500">Executing {toolName}...</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
