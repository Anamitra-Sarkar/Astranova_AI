"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatWindow } from '@/components/ChatWindow';
import { InputArea } from '@/components/InputArea';
import { useChat } from '@/context/ChatContext';
import { useChat as useVercelChat } from '@ai-sdk/react';
import { v4 as uuidv4 } from 'uuid';
import { FolderCode, ChevronDown, FileText, Share2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

function ChatInterface() {
  const { currentChat, setCurrentChat, saveChat, user, shareChat, chats } = useChat();
  const searchParams = useSearchParams();
  const [showFiles, setShowFiles] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    const chatId = searchParams.get('id');
    if (chatId && chats.length > 0) {
      const chat = chats.find(c => c.id === chatId);
      if (chat) setCurrentChat(chat);
    }
  }, [searchParams, chats, setCurrentChat]);

  const { messages, input, handleInputChange, handleSubmit, setMessages, isLoading, append }: any = useVercelChat({
    api: '/api/chat',
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

      if (currentChat) {
        const updatedChat = {
          ...currentChat,
          history: [...messages, message].map(m => ({
            role: m.role as any,
            content: m.content,
            id: m.id,
            toolInvocations: m.toolInvocations
          })),
          files: newFiles,
          timestamp: new Date()
        };
        saveChat(updatedChat);
      } else {
        let title = 'New Chat';
        try {
          const response = await fetch('/api/title', {
            method: 'POST',
            body: JSON.stringify({ message: messages[0]?.content || '' })
          });
          const data = await response.json();
          title = data.title || title;
        } catch (e) {
          console.error("Title generation failed", e);
        }

        const newChatId = uuidv4();
        const newChat = {
          id: newChatId,
          title: title,
          history: [...messages, message].map(m => ({
            role: m.role as any,
            content: m.content,
            id: m.id,
            toolInvocations: m.toolInvocations
          })),
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
    } catch (e) {
      console.error("Sharing failed", e);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white dark:bg-[#0a0a0a] overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col relative">
        <header className="h-14 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
             <h2 className="text-sm font-semibold truncate max-w-[200px]">
               {currentChat?.title || 'New Conversation'}
             </h2>
             {currentChat && (
               <button 
                onClick={handleShare}
                disabled={isSharing}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  shareUrl 
                    ? "bg-green-500/10 text-green-500 border-green-500/20" 
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-indigo-500 border-transparent"
                )}
               >
                 {shareUrl ? <Check size={14} /> : <Share2 size={14} />}
                 <span>{shareUrl ? 'Copied Link' : 'Share'}</span>
               </button>
             )}
             {currentChat?.files && Object.keys(currentChat.files).length > 0 && (
               <div className="relative">
                 <button 
                  onClick={() => setShowFiles(!showFiles)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 text-xs font-medium hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
                 >
                   <FolderCode size={14} />
                   <span>Workspace ({Object.keys(currentChat.files).length})</span>
                   <ChevronDown size={14} className={cn("transition-transform", showFiles && "rotate-180")} />
                 </button>

                 {showFiles && (
                   <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest p-2 mb-1">Generated Artifacts</p>
                     {Object.entries(currentChat.files).map(([filename, file]) => (
                       <div key={filename} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer group">
                         <div className="flex items-center gap-3 overflow-hidden">
                           <FileText size={16} className="text-gray-400" />
                           <div className="flex flex-col overflow-hidden">
                             <span className="text-xs font-medium truncate">{filename}</span>
                             <span className="text-[9px] text-gray-500 uppercase">{file.language}</span>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             )}
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 rounded-md bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider">
              System Active
            </div>
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
        
        <InputArea onSend={handleSend} disabled={isLoading} />
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-[#0a0a0a]" />}>
      <ChatInterface />
    </Suspense>
  );
}
