"use client";

import React from 'react';
import { useTheme } from 'next-themes';
import { X, Moon, Sun, Monitor, Shield, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex h-[500px]">
          {/* Sidebar */}
          <div className="w-48 border-r border-border bg-muted/30 p-4 flex flex-col gap-1">
             <h2 className="text-sm font-bold px-3 mb-4">Settings</h2>
             <button className="flex items-center gap-3 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-medium">
               <User size={16} />
               <span>Profile</span>
             </button>
             <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-muted-foreground text-xs font-medium">
               <Shield size={16} />
               <span>Security</span>
             </button>
             <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-muted-foreground text-xs font-medium">
               <Bell size={16} />
               <span>Notifications</span>
             </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col">
             <div className="flex items-center justify-between p-4 border-b border-border">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Personalization</span>
                <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-smooth">
                  <X size={18} />
                </button>
             </div>
             
             <div className="flex-1 p-6 space-y-8 overflow-y-auto">
                <section>
                   <h3 className="text-sm font-bold mb-4">Interface Appearance</h3>
                   <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'light', name: 'Light', icon: Sun },
                        { id: 'dark', name: 'Dark', icon: Moon },
                        { id: 'system', name: 'System', icon: Monitor }
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-smooth",
                            theme === t.id 
                              ? "bg-accent border-primary text-accent-foreground" 
                              : "bg-background border-border text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <t.icon size={20} />
                          <span className="text-[10px] font-bold uppercase">{t.name}</span>
                        </button>
                      ))}
                   </div>
                </section>

                <section>
                   <h3 className="text-sm font-bold mb-2">Account Status</h3>
                   <div className="p-4 rounded-xl bg-muted/50 border border-border flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                         <span className="text-xs font-medium">Aura Personal Tier</span>
                         <span className="text-[10px] text-muted-foreground">Unlimited messages & 5GB Workspace</span>
                      </div>
                      <button className="px-3 py-1.5 bg-primary text-primary-foreground text-[10px] font-black uppercase rounded-lg">Upgrade</button>
                   </div>
                </section>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
