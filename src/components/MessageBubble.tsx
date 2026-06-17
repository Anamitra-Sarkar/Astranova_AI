"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import { Copy, Check, User, Search, FileText, Edit, Sparkles, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { DownloadButton } from './DownloadButton';

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
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full gap-4 py-8 px-4 md:px-16 transition-smooth",
        isUser ? "bg-transparent" : "bg-muted/30 border-y border-border/50"
      )}
    >
      <div className="flex-shrink-0 mt-1">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm border",
          isUser ? "bg-background border-border text-foreground" : "bg-primary border-primary text-primary-foreground"
        )}>
          {isUser ? <User size={14} /> : 'A'}
        </div>
      </div>
      
      <div className="flex-1 space-y-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {isUser ? 'Personal' : 'Aura Assistant'}
          </span>
          {!isUser && textContent && (
            <button 
              onClick={copyToClipboard}
              className="p-1.5 rounded-lg hover:bg-muted transition-smooth text-muted-foreground hover:text-foreground"
              title="Copy"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          )}
        </div>

        {imageUrl && (
          <div className="mb-4 inline-block overflow-hidden rounded-xl border border-border shadow-md">
            <img src={imageUrl} alt="Contextual data" className="max-h-80 w-auto object-contain" />
          </div>
        )}

        {textContent && (
          <div className="markdown-content prose dark:prose-invert prose-sm max-w-none leading-relaxed text-foreground/90">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <div className="relative my-6 rounded-xl overflow-hidden border border-border shadow-sm group">
                       <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{match[1]}</span>
                       </div>
                       <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        className="!m-0 !p-6"
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-[0.9em]" {...props}>
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
              <div key={toolCallId} className="flex flex-col gap-3 mt-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  {toolName === 'search' && <Search size={14} />}
                  {toolName === 'generate_document' && <FileText size={14} />}
                  {toolName === 'file_generator' && <Sparkles size={14} />}
                  {toolName === 'file_patcher' && <Edit size={14} />}
                  <span>Action: {toolName.replace('_', ' ')}</span>
                </div>
                
                <div className="p-5 rounded-xl bg-background border border-border shadow-sm">
                  {toolName === 'generate_document' && (
                    <div className="flex flex-col gap-4">
                       <p className="text-xs font-medium">{result.message}</p>
                       <DownloadButton 
                         title={result.title} 
                         content={result.content} 
                         type={result.type} 
                         filename={result.filename} 
                       />
                    </div>
                  )}
                  {toolName === 'file_generator' && (
                    <div className="space-y-4">
                      <p className="text-xs font-medium text-muted-foreground">Synthesis of '{result.filename}' complete.</p>
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={result.language || 'typescript'}
                        PreTag="div"
                        className="rounded-lg border border-border !p-4"
                      >
                        {result.content}
                      </SyntaxHighlighter>
                    </div>
                  )}
                  {toolName === 'file_patcher' && (
                    <div className="space-y-4">
                      <p className="text-xs font-medium text-muted-foreground">Refinement of '{result.filename}' synchronized.</p>
                      <div className="grid grid-cols-1 gap-1 font-mono text-[11px]">
                        <div className="p-3 rounded bg-red-500/5 border border-red-500/10 opacity-50">
                           <pre className="overflow-x-auto whitespace-pre-wrap">{result.patch.old_content}</pre>
                        </div>
                        <div className="p-3 rounded bg-green-500/5 border border-green-500/10">
                           <pre className="overflow-x-auto whitespace-pre-wrap">{result.patch.new_content}</pre>
                        </div>
                      </div>
                    </div>
                  )}
                  {toolName === 'search' && (
                    <div className="flex items-center gap-3">
                       <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                       <p className="text-xs text-muted-foreground font-medium">Research integration successful.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={toolCallId} className="flex items-center gap-3 mt-6 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Processing {toolName}...</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
