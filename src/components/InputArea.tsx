"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface InputAreaProps {
  onSend: (message: string, image?: string) => void;
  disabled?: boolean;
}

export function InputArea({ onSend, disabled }: InputAreaProps) {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || selectedImage) && !disabled) {
      onSend(input.trim(), selectedImage || undefined);
      setInput('');
      setSelectedImage(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  return (
    <div className="relative py-4 md:py-8">
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-0 mb-4 z-20"
          >
            <div className="relative group p-1 bg-[#1a1a1a] rounded-xl border border-white/10 shadow-2xl">
              <img src={selectedImage} alt="Selected" className="h-32 w-auto rounded-lg object-cover" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-standard"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className={cn(
        "relative flex flex-col w-full bg-[#111111] border rounded-2xl transition-standard shadow-2xl",
        disabled ? "opacity-50 border-white/5" : "border-white/10 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20"
      )}>
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Transmit a query to AstraNova..."
          className="w-full bg-transparent text-[#eeeeee] text-sm md:text-base p-4 pr-32 resize-none focus:outline-none placeholder:text-gray-600 min-h-[56px] leading-relaxed custom-scrollbar"
          disabled={disabled}
        />
        
        <div className="absolute right-3 bottom-3 flex items-center gap-2">
          <div className="flex items-center gap-1 pr-2 border-r border-white/5 mr-1">
             <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-gray-300 transition-standard rounded-lg hover:bg-white/5"
                disabled={disabled}
                title="Attach Data"
              >
                <Paperclip size={18} />
              </button>
              <button
                type="button"
                className="p-2 text-gray-500 hover:text-gray-300 transition-standard rounded-lg hover:bg-white/5"
                disabled={disabled}
                title="Voice Input"
              >
                <Mic size={18} />
              </button>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={(!input.trim() && !selectedImage) || disabled}
            className={cn(
              "p-2 rounded-xl transition-all shadow-lg flex items-center justify-center",
              (input.trim() || selectedImage) && !disabled
                ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 shadow-indigo-500/20"
                : "bg-white/5 text-gray-700 cursor-not-allowed"
            )}
          >
            <Send size={18} />
          </button>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
      </div>

      <div className="flex items-center justify-center gap-4 mt-3">
         <p className="text-[9px] text-gray-700 tracking-[0.3em] uppercase font-bold">
           AstraNova Cognitive Interface • Lab v2.0
         </p>
      </div>
    </div>
  );
}
