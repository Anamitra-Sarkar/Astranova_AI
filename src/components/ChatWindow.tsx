"use client";

import React, { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { useChat } from '@/context/ChatContext';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
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
    <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="flex flex-col">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-4">
            <div className="w-20 h-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center text-indigo-600 mb-6 animate-pulse">
              <span className="text-4xl font-bold">A</span>
            </div>
            <h2 className="text-3xl font-bold mb-2 tracking-tight">AstraNova</h2>
            <p className="text-gray-500 max-w-md mx-auto leading-relaxed text-sm">
              Cognitive reasoning and creative synthesis. 
              Autonomous interface active. 
              How shall we proceed today?
            </p>
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
          <div className="flex w-full gap-4 py-6 px-4 md:px-8 bg-gray-50/5 dark:bg-white/5 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-indigo-600/20" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
