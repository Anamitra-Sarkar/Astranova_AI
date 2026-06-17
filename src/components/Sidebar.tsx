"use client";

import React, { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { Plus, MessageSquare, Trash2, Pin, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { AuthModal } from './AuthModal';

export function Sidebar() {
  const { chats, currentChat, setCurrentChat, createNewChat, deleteChat, user } = useChat();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <aside className="w-64 h-full bg-gray-900 text-gray-300 flex flex-col border-r border-gray-800">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
          <h1 className="text-xl font-bold text-white tracking-tight">AstraNova</h1>
        </div>

        <button 
          onClick={createNewChat}
          className="w-full flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 font-medium mb-6"
        >
          <Plus size={18} />
          <span>New Chat</span>
        </button>

        <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-2 custom-scrollbar">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 px-2 mb-2">Recent</p>
          {chats.map((chat) => (
            <div 
              key={chat.id}
              onClick={() => setCurrentChat(chat)}
              className={cn(
                "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all",
                currentChat?.id === chat.id 
                  ? "bg-gray-800 text-white shadow-inner" 
                  : "hover:bg-gray-800/50 hover:text-gray-200"
              )}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={16} className={currentChat?.id === chat.id ? "text-indigo-400" : "text-gray-500"} />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm truncate font-medium">{chat.title}</span>
                  <span className="text-[10px] opacity-40">{formatDate(chat.timestamp)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                  className="p-1 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {chats.length === 0 && (
            <p className="text-sm text-gray-600 px-2 py-4 italic">No recent chats</p>
          )}
        </div>
      </div>

      <div className="mt-auto p-4 space-y-2 border-t border-gray-800 bg-gray-900/50">
        {user ? (
          <div className="flex items-center gap-3 p-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full" />
              ) : (
                <UserIcon size={16} />
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-white truncate">{user.displayName || 'User'}</span>
              <span className="text-xs text-gray-500 truncate">{user.email}</span>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full flex items-center gap-2 p-2 hover:bg-gray-800 rounded-lg transition-colors text-sm"
          >
             <UserIcon size={18} />
             <span>Sign In</span>
          </button>
        )}
        
        <button className="w-full flex items-center gap-2 p-2 hover:bg-gray-800 rounded-lg transition-colors text-sm">
          <Settings size={18} />
          <span>Settings</span>
        </button>
        
        {user && (
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 p-2 hover:bg-red-900/20 hover:text-red-400 rounded-lg transition-colors text-sm"
          >
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        )}
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </aside>
  );
}
