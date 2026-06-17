"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id?: string;
  timestamp?: any;
  toolInvocations?: any[];
}

interface Chat {
  id: string;
  title: string;
  history: Message[];
  timestamp: any;
  isPinned?: boolean;
  isPublic?: boolean;
  files?: Record<string, { content: string; language: string }>;
}

interface ChatContextType {
  user: User | null;
  loading: boolean;
  chats: Chat[];
  currentChat: Chat | null;
  setCurrentChat: (chat: Chat | null) => void;
  createNewChat: () => void;
  deleteChat: (id: string) => Promise<void>;
  saveChat: (chat: Chat) => Promise<void>;
  shareChat: (id: string) => Promise<string>;
  cloneChat: (chat: Chat) => Promise<string>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setChats([]);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'chats'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Chat[];
      setChats(chatList);
    });

    return () => unsubscribe();
  }, [user]);

  const createNewChat = () => {
    setCurrentChat(null);
  };

  const deleteChat = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'chats', id));
    if (currentChat?.id === id) {
      setCurrentChat(null);
    }
  };

  const saveChat = async (chat: Chat) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'chats', chat.id), chat, { merge: true });
  };

  const shareChat = async (id: string) => {
    if (!user) return "";
    const chatRef = doc(db, 'users', user.uid, 'chats', id);
    const chatSnap = await getDoc(chatRef);
    
    if (chatSnap.exists()) {
      const chatData = chatSnap.data() as Chat;
      await setDoc(doc(db, 'shared_chats', id), { 
        ...chatData, 
        ownerId: user.uid,
        isPublic: true,
        sharedAt: new Date() 
      });
      await setDoc(chatRef, { isPublic: true }, { merge: true });
    }
    return `${window.location.origin}/share/${id}`;
  };

  const cloneChat = async (chat: Chat) => {
    if (!user) throw new Error("Must be logged in to save chat");
    const newId = uuidv4();
    const clonedChat = {
      ...chat,
      id: newId,
      timestamp: new Date(),
      isPublic: false
    };
    await setDoc(doc(db, 'users', user.uid, 'chats', newId), clonedChat);
    return newId;
  };

  return (
    <ChatContext.Provider value={{
      user,
      loading,
      chats,
      currentChat,
      setCurrentChat,
      createNewChat,
      deleteChat,
      saveChat,
      shareChat,
      cloneChat
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
