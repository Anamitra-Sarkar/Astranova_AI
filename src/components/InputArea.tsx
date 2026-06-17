"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, StopCircle, X, Image as ImageIcon } from 'lucide-react';

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
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <div className="p-4 bg-transparent border-t border-gray-100 dark:border-gray-800">
      <div className="max-w-4xl mx-auto flex flex-col gap-2">
        {selectedImage && (
          <div className="relative inline-block w-fit">
            <img src={selectedImage} alt="Selected" className="h-20 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg"
            >
              <X size={12} />
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="relative group">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Interface with AstraNova..."
            className="w-full bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white rounded-2xl p-4 pl-12 pr-24 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all border border-gray-200 dark:border-gray-800"
            disabled={disabled}
          />
          <div className="absolute left-3 bottom-3 flex items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-indigo-500 transition-colors"
              disabled={disabled}
            >
              <Paperclip size={20} />
            </button>
          </div>
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-indigo-500 transition-colors"
              disabled={disabled}
            >
              <Mic size={20} />
            </button>
            <button
              type="submit"
              disabled={(!input.trim() && !selectedImage) || disabled}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
      <p className="text-[10px] text-center text-gray-500 mt-2 tracking-widest uppercase">
        AstraNova Neural Interface • Lab V2
      </p>
    </div>
  );
}
