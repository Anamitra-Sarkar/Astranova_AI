"use client";

import React, { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { Sparkles, Layout } from 'lucide-react';
import { motion } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string | any[];
  toolInvocations?: any[];
}

interface ChatWindowProps {
  messages: Message[];
  isLoading?: boolean;
}

export function ChatWindow({ messages, isLoading }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar bg-background">
      <div className="flex flex-col max-w-5xl mx-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[70vh] text-center px-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-8"
            >
              <Sparkles size={24} />
            </motion.div>
            <h2 className="text-2xl font-bold mb-3 tracking-tight">How can I help you today?</h2>
            <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
              Start a new conversation or project. I'm here to help you synthesize ideas and build artifacts.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-12 w-full max-w-lg">
               {[
                 "Draft a project proposal...",
                 "Analyze these market trends...",
                 "Generate a monthly report...",
                 "Refactor this workspace component..."
               ].map((prompt, i) => (
                 <button key={i} className="p-4 rounded-xl border border-border bg-muted/30 text-left text-xs font-medium hover:bg-muted transition-smooth">
                    {prompt}
                 </button>
               ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble 
              key={i} 
              role={msg.role} 
              content={msg.content} 
              toolInvocations={msg.toolInvocations}
            />
          ))
        )}
        
        {isLoading && (
          <div className="flex w-full gap-4 py-8 px-4 md:px-16 animate-pulse opacity-50">
            <div className="w-8 h-8 rounded-lg bg-muted" />
            <div className="flex-1 space-y-3">
              <div className="h-2 bg-muted rounded w-1/4" />
              <div className="h-2 bg-muted rounded w-3/4" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
