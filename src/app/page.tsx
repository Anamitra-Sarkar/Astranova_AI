"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatWindow } from '@/components/ChatWindow';
import { InputArea } from '@/components/InputArea';
import { useChat } from '@/context/ChatContext';
import { useChat as useVercelChat } from '@ai-sdk/react';
import { v4 as uuidv4 } from 'uuid';
import { FolderCode, FileText, Share2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { ModelSelector, ModelType } from '@/components/ModelSelector';
import { motion, AnimatePresence } from 'framer-motion';

function ChatInterface() {
  const { currentChat, setCurrentChat, saveChat, shareChat, chats } = useChat();
  const searchParams = useSearchParams();
  
  const [showFiles, setShowFiles] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>('expert');

  useEffect(() => {
    const chatId = searchParams.get('id');
    if (chatId && chats.length > 0) {
      const chat = chats.find(c => c.id === chatId);
      if (chat) setCurrentChat(chat);
    }
  }, [searchParams, chats, setCurrentChat]);

  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    setMessages, 
    isLoading, 
    append,
    reload,
    stop
  }: any = useVercelChat({
    api: '/api/chat',
    body: { model: selectedModel },
    initialMessages: currentChat?.history.map(m => ({
      id: m.id || uuidv4(),
      role: m.role as any,
      content: m.content,
      toolInvocations: (m as any).toolInvocations
    })) || [],
    onFinish: async (message: any) => {
      const newFiles = { ...(currentChat?.files || {}) };
      message.toolInvocations?.forEach((tool: any) => {
        if (tool.state === 'result') {
          if (tool.toolName === 'file_generator') {
            newFiles[tool.result.filename] = {
              content: tool.result.content,
              language: tool.result.language || 'typescript'
            };
          } else if (tool.toolName === 'file_patcher') {
            const file = newFiles[tool.result.filename];
            if (file) {
              file.content = file.content.replace(tool.result.patch.old_content, tool.result.patch.new_content);
            }
          }
        }
      });

      const updatedHistory = [...messages, message].map(m => ({
        role: m.role as any,
        content: m.content,
        id: m.id,
        toolInvocations: m.toolInvocations
      }));

      if (currentChat) {
        saveChat({
          ...currentChat,
          history: updatedHistory,
          files: newFiles,
          timestamp: new Date()
        });
      } else {
        let title = 'New Conversation';
        try {
          const response = await fetch('/api/title', {
            method: 'POST',
            body: JSON.stringify({ message: messages[0]?.content || '' })
          });
          const data = await response.json();
          title = data.title || title;
        } catch (e) {}

        const newChat = {
          id: uuidv4(),
          title: title,
          history: updatedHistory,
          files: newFiles,
          timestamp: new Date()
        };
        saveChat(newChat);
        setCurrentChat(newChat);
      }
    }
  } as any);

  useEffect(() => {
    if (currentChat) {
      setMessages(currentChat.history.map(m => ({
        id: m.id || uuidv4(),
        role: m.role as any,
        content: m.content,
        toolInvocations: (m as any).toolInvocations
      })));
    } else {
      setMessages([]);
    }
  }, [currentChat, setMessages]);

  const handleSend = useCallback((content: string, image?: string) => {
    if (image) {
      append({
        role: 'user',
        content: [
          { type: 'text', text: content },
          { type: 'image_url', image_url: { url: image } }
        ] as any
      });
    } else {
      append({
        role: 'user',
        content: content
      });
    }
  }, [append]);

  const handleShare = async () => {
    if (!currentChat) return;
    setIsSharing(true);
    try {
      const url = await shareChat(currentChat.id);
      setShareUrl(url);
      navigator.clipboard.writeText(url);
      setTimeout(() => setShareUrl(null), 3000);
    } catch (e) {} finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground selection:bg-indigo-500/10">
      <Sidebar />
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-background/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-6">
             <div className="flex flex-col">
               <h2 className="text-sm font-bold tracking-tight truncate max-w-[250px]">
                 {currentChat?.title || 'Initial Session'}
               </h2>
             </div>
             <div className="h-4 w-[1px] bg-border mx-1" />
             <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
          </div>

          <div className="flex items-center gap-3">
             {currentChat?.files && Object.keys(currentChat.files).length > 0 && (
               <div className="relative">
                 <button 
                  onClick={() => setShowFiles(!showFiles)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-smooth border",
                    showFiles ? "bg-accent border-border text-foreground" : "bg-background border-border text-muted-foreground hover:bg-muted"
                  )}
                 >
                   <FolderCode size={14} />
                   <span>Workspace</span>
                 </button>
                 <AnimatePresence>
                   {showFiles && (
                     <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full right-0 mt-2 w-80 bg-background border border-border rounded-xl shadow-2xl z-50 p-2 overflow-hidden"
                     >
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] p-3 border-b border-border mb-2 text-center">Active Artifacts</p>
                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                          {Object.entries(currentChat.files).map(([filename, file]) => (
                            <div key={filename} className="flex items-center justify-between p-3 hover:bg-muted rounded-lg cursor-pointer group transition-smooth border border-transparent hover:border-border/50">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <FileText size={16} className="text-primary opacity-60" />
                                <div className="flex flex-col overflow-hidden">
                                  <span className="text-xs font-bold truncate">{filename}</span>
                                  <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">{file.language}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>
             )}
             
             {currentChat && (
               <button 
                onClick={handleShare}
                disabled={isSharing}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-smooth border",
                  shareUrl 
                    ? "bg-green-500/10 text-green-600 border-green-500/20" 
                    : "bg-background border-border text-muted-foreground hover:bg-muted"
                )}
               >
                 {shareUrl ? <Check size={14} /> : <Share2 size={14} />}
                 <span>{shareUrl ? 'Link Ready' : 'Share'}</span>
               </button>
             )}
          </div>
        </header>

        <ChatWindow 
          messages={messages.map((m: any) => ({ 
            role: m.role as any, 
            content: m.content,
            toolInvocations: m.toolInvocations
          }))} 
          isLoading={isLoading} 
        />
        
        <div className="max-w-4xl mx-auto w-full px-6">
           <InputArea onSend={handleSend} disabled={isLoading} />
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-background" />}>
      <ChatInterface />
    </Suspense>
  );
}
