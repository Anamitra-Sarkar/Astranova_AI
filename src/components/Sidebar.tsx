"use client";

import React, { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { Plus, MessageSquare, Trash2, LogOut, Settings, User as UserIcon, ShieldCheck, Database, LayoutPanelLeft } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { AuthModal } from './AuthModal';
import { SettingsModal } from './SettingsModal';
import { motion, AnimatePresence } from 'framer-motion';

export function Sidebar() {
  const { chats, currentChat, setCurrentChat, createNewChat, deleteChat, user } = useChat();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <aside className="w-72 h-full bg-background flex flex-col border-r border-border relative z-20 overflow-hidden">
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-10 px-2 group cursor-default">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-black text-2xl shadow-sm group-hover:scale-105 transition-smooth">A</div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight leading-none text-foreground">Aura</h1>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Smart Workspace</span>
          </div>
        </div>

        <button 
          onClick={createNewChat}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3.5 rounded-xl transition-smooth font-bold text-sm mb-8 hover:opacity-90 shadow-sm"
        >
          <Plus size={18} />
          <span>New Workspace</span>
        </button>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
          <div className="flex items-center justify-between px-2 mb-4">
             <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recent</p>
          </div>
          
          <div className="space-y-1">
            <AnimatePresence initial={false}>
              {chats.map((chat) => (
                <motion.div 
                  key={chat.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={() => setCurrentChat(chat)}
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-smooth border",
                    currentChat?.id === chat.id 
                      ? "bg-accent border-border text-foreground shadow-sm" 
                      : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageSquare size={16} className={cn("transition-colors flex-shrink-0", currentChat?.id === chat.id ? "text-primary" : "text-muted-foreground")} />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-medium truncate tracking-tight">{chat.title}</span>
                      <span className="text-[9px] opacity-60 font-medium">{formatDate(chat.timestamp)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all rounded-lg hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {chats.length === 0 && (
              <div className="py-12 text-center flex flex-col items-center gap-3 opacity-20">
                 <LayoutPanelLeft size={32} />
                 <p className="text-[10px] font-bold uppercase tracking-widest">Workspace Empty</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-border space-y-2">
          {user ? (
            <div className="flex items-center gap-3 p-3 mb-4 bg-muted/50 rounded-xl border border-border">
              <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center overflow-hidden border border-border">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={18} className="text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-foreground truncate leading-none mb-1">{user.displayName || 'Authorized User'}</span>
                <span className="text-[9px] text-muted-foreground font-bold tracking-tighter uppercase">Verified Member</span>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full flex items-center justify-center gap-3 p-3.5 hover:bg-muted rounded-xl transition-smooth text-xs font-bold text-primary border border-border mb-4"
            >
               <UserIcon size={18} />
               <span>Member Sign In</span>
            </button>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="flex flex-col items-center gap-2 p-3 hover:bg-muted rounded-xl transition-smooth text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
            >
              <Settings size={18} strokeWidth={1.5} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Settings</span>
            </button>
            {user && (
              <button 
                onClick={handleLogout}
                className="flex flex-col items-center gap-2 p-3 hover:bg-red-500/5 rounded-xl transition-smooth text-muted-foreground hover:text-red-500 border border-transparent hover:border-red-500/10"
              >
                <LogOut size={18} strokeWidth={1.5} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </aside>
  );
}
