"use client";

import React, { useState } from 'react';
import { Zap, Brain, Eye, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export type ModelType = 'expert' | 'fast' | 'vision';

interface ModelSelectorProps {
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
}

const models = [
  { id: 'expert', name: 'Expert', icon: Brain, description: 'High reasoning & complex coding' },
  { id: 'fast', name: 'Fast', icon: Zap, description: 'Rapid response & simple tasks' },
  { id: 'vision', name: 'Vision', icon: Eye, description: 'Image analysis & multi-modal' }
];

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentModel = models.find(m => m.id === selectedModel) || models[0];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-standard border border-white/5 text-xs font-medium text-gray-400 hover:text-white"
      >
        <currentModel.icon size={14} className="text-indigo-400" />
        <span>{currentModel.name}</span>
        <ChevronDown size={12} className={cn("transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="absolute top-full left-0 mt-2 w-56 bg-[#161616] border border-white/10 rounded-xl shadow-2xl z-50 p-1 overflow-hidden"
            >
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id as ModelType);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex flex-col gap-0.5 p-2.5 rounded-lg text-left transition-standard hover:bg-white/5",
                    selectedModel === model.id ? "bg-white/5" : ""
                  )}
                >
                  <div className="flex items-center gap-2">
                    <model.icon size={14} className={selectedModel === model.id ? "text-indigo-400" : "text-gray-500"} />
                    <span className={cn("text-xs font-bold", selectedModel === model.id ? "text-white" : "text-gray-400")}>
                      {model.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-600 pl-6 leading-tight">{model.description}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
