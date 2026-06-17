"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatWindow } from '@/components/ChatWindow';
import { InputArea } from '@/components/InputArea';
import { useChat } from '@/context/ChatContext';
import { useChat as useVercelChat } from '@ai-sdk/react';
import { v4 as uuidv4 } from 'uuid';
import { FolderCode, ChevronDown, FileText, Share2, Check, LayoutGrid, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';
import { ModelSelector, ModelType } from '@/components/ModelSelector';
import { motion, AnimatePresence } from 'framer-motion';

function ChatInterface() {
  const { currentChat, setCurrentChat, saveChat, user, shareChat, chats } = useChat();
  const searchParams = useSearchParams();
  const router = useRouter();
  
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

  const chatHelpers: any = useVercelChat({
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

      const updatedHistory = [...chatHelpers.messages, message].map(m => ({
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
            body: JSON.stringify({ message: chatHelpers.messages[0]?.content || '' })
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


  const { messages, input, handleInputChange, handleSubmit, setMessages, isLoading, append } = chatHelpers;

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

  const handleSend = (content: string, image?: string) => {
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
  };

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
    <div className="flex h-screen w-full bg-[#0d0d0d] overflow-hidden text-[#eeeeee]">
      <Sidebar />
      <main className="flex-1 flex flex-col relative border-l border-white/5">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0d0d0d]/80 backdrop-blur-xl z-10">
          <div className="flex items-center gap-4">
             <div className="flex flex-col">
               <h2 className="text-sm font-bold tracking-tight truncate max-w-[200px]">
                 {currentChat?.title || 'New Session'}
               </h2>
               <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Interface Active</span>
               </div>
             </div>
             <div className="h-4 w-[1px] bg-white/10 mx-2" />
             <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
          </div>

          <div className="flex items-center gap-3">
             {currentChat?.files && Object.keys(currentChat.files).length > 0 && (
               <div className="relative">
                 <button 
                  onClick={() => setShowFiles(!showFiles)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-white/5",
                    showFiles ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
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
                      className="absolute top-full right-0 mt-2 w-72 bg-[#161616] border border-white/10 rounded-xl shadow-2xl z-50 p-2 overflow-hidden"
                     >
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] p-3 border-b border-white/5 mb-2">Artifacts</p>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                          {Object.entries(currentChat.files).map(([filename, file]) => (
                            <div key={filename} className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-lg cursor-pointer group transition-standard">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <FileText size={16} className="text-indigo-400 opacity-60" />
                                <div className="flex flex-col overflow-hidden">
                                  <span className="text-xs font-medium truncate text-gray-300">{filename}</span>
                                  <span className="text-[9px] text-gray-600 uppercase font-bold tracking-wider">{file.language}</span>
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
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all border border-white/5",
                  shareUrl 
                    ? "bg-green-500/10 text-green-500 border-green-500/20" 
                    : "bg-white/5 text-gray-400 hover:text-white"
                )}
               >
                 {shareUrl ? <Check size={14} /> : <Share2 size={14} />}
                 <span>{shareUrl ? 'Link Copied' : 'Share'}</span>
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
        
        <div className="max-w-4xl mx-auto w-full px-4">
           <InputArea onSend={handleSend} disabled={isLoading} />
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-[#0d0d0d]" />}>
      <ChatInterface />
    </Suspense>
  );
}
