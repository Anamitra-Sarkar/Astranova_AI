"use client";

import React, { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { Plus, MessageSquare, Trash2, LogOut, Settings, User as UserIcon, ShieldCheck, Database } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { AuthModal } from './AuthModal';
import { motion, AnimatePresence } from 'framer-motion';

export function Sidebar() {
  const { chats, currentChat, setCurrentChat, createNewChat, deleteChat, user } = useChat();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <aside className="w-72 h-full bg-[#0a0a0a] flex flex-col border-r border-white/5 relative z-20">
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-10 px-2 group cursor-default">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] group-hover:scale-110 transition-standard">A</div>
          <div className="flex flex-col">
            <h1 className="text-lg font-black text-white tracking-tighter leading-none">AstraNova</h1>
            <span className="text-[10px] font-bold text-indigo-500/50 uppercase tracking-[0.3em] mt-1">Cognitive Lab</span>
          </div>
        </div>

        <button 
          onClick={createNewChat}
          className="w-full flex items-center justify-center gap-2 bg-[#111111] hover:bg-[#161616] text-white px-4 py-3.5 rounded-xl transition-all border border-white/5 font-bold text-sm mb-8 hover:border-indigo-500/30 group"
        >
          <Plus size={18} className="text-indigo-500 group-hover:rotate-90 transition-transform duration-300" />
          <span>New Session</span>
        </button>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
          <div className="flex items-center justify-between px-2 mb-4">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">History</p>
             <Database size={12} className="text-gray-700" />
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
                    "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-standard border",
                    currentChat?.id === chat.id 
                      ? "bg-white/[0.03] border-indigo-500/20 text-white shadow-inner" 
                      : "bg-transparent border-transparent text-gray-500 hover:bg-white/[0.02] hover:text-gray-300"
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageSquare size={16} className={cn("transition-colors flex-shrink-0", currentChat?.id === chat.id ? "text-indigo-500" : "text-gray-700")} />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-bold truncate tracking-tight">{chat.title}</span>
                      <span className="text-[9px] opacity-40 font-medium">{formatDate(chat.timestamp)}</span>
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
              <div className="py-12 text-center flex flex-col items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-white/[0.02] flex items-center justify-center">
                    <Database size={14} className="text-gray-800" />
                 </div>
                 <p className="text-[10px] text-gray-700 font-bold uppercase tracking-widest italic">Vault Empty</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-white/5 space-y-2">
          {user ? (
            <div className="flex items-center gap-3 p-3 mb-4 bg-white/[0.02] rounded-xl border border-white/5">
              <div className="w-9 h-9 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={18} className="text-indigo-400" />
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-black text-white truncate leading-none mb-1">{user.displayName || 'Authorized User'}</span>
                <div className="flex items-center gap-1">
                   <ShieldCheck size={10} className="text-green-500" />
                   <span className="text-[9px] text-gray-500 font-bold tracking-tighter uppercase">Verified Access</span>
                </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full flex items-center gap-3 p-3.5 hover:bg-white/[0.03] rounded-xl transition-standard text-xs font-bold text-indigo-400 border border-indigo-500/10 mb-4"
            >
               <UserIcon size={18} />
               <span>Establish Connection</span>
            </button>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            <button className="flex flex-col items-center gap-2 p-3 hover:bg-white/[0.03] rounded-xl transition-standard text-gray-500 hover:text-gray-300 border border-transparent hover:border-white/5">
              <Settings size={18} strokeWidth={1.5} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Settings</span>
            </button>
            {user && (
              <button 
                onClick={handleLogout}
                className="flex flex-col items-center gap-2 p-3 hover:bg-red-500/5 rounded-xl transition-standard text-gray-600 hover:text-red-500 border border-transparent hover:border-red-500/10"
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
    </aside>
  );
}
