"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useChat } from '@/context/ChatContext';
import { MessageBubble } from '@/components/MessageBubble';
import { Sidebar } from '@/components/Sidebar';
import { Save, LogIn } from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';

export default function SharePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, cloneChat } = useChat();
  const [chat, setChat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const fetchChat = async () => {
      if (!id) return;
      const docRef = doc(db, 'shared_chats', id as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setChat(docSnap.data());
      }
      setLoading(false);
    };
    fetchChat();
  }, [id]);

  const handleSave = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setSaving(true);
    try {
      const newId = await cloneChat(chat);
      router.push(`/?id=${newId}`);
    } catch (error) {
      console.error("Failed to save chat:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0a]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0a0a0a] text-white">
        <h1 className="text-2xl font-bold mb-4">Chat Not Found</h1>
        <p className="text-gray-500">This shared link might have expired or is invalid.</p>
        <button 
          onClick={() => router.push('/')}
          className="mt-6 px-6 py-2 bg-indigo-600 rounded-xl font-medium"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white dark:bg-[#0a0a0a] overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-14 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
             <h2 className="text-sm font-semibold truncate max-w-[300px]">
               Shared: {chat.title}
             </h2>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            {user ? <Save size={14} /> : <LogIn size={14} />}
            <span>{saving ? 'Saving...' : (user ? 'Save to My Account' : 'Sign in to Save')}</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col">
            <div className="p-8 text-center border-b border-gray-100 dark:border-gray-800">
               <h1 className="text-3xl font-bold mb-2 tracking-tight">{chat.title}</h1>
               <p className="text-xs text-gray-500 uppercase tracking-[0.2em]">Shared Conversation Artifact</p>
            </div>
            {chat.history.map((msg: any, i: number) => (
              <MessageBubble 
                key={i} 
                role={msg.role} 
                content={msg.content} 
                toolInvocations={msg.toolInvocations}
              />
            ))}
            <div className="p-12 text-center">
               <button 
                onClick={handleSave}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:scale-105 transition-all shadow-xl shadow-indigo-500/30"
               >
                 <Save size={20} />
                 <span>Continue this conversation in AstraNova</span>
               </button>
            </div>
          </div>
        </div>
      </main>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
