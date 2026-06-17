"use client";

import React, { useState } from 'react';
import { FileDown, Check, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

interface DownloadButtonProps {
  title: string;
  content: string;
  type: 'pdf' | 'docx';
  filename: string;
}

export function DownloadButton({ title, content, type, filename }: DownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const generatePDF = async () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(title, 20, 20);
    doc.setFontSize(12);
    
    const splitText = doc.splitTextToSize(content, 170);
    doc.text(splitText, 20, 40);
    
    doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  };

  const generateDOCX = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: content,
                size: 24,
              }),
            ],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename.endsWith('.docx') ? filename : `${filename}.docx`);
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      if (type === 'pdf') {
        await generatePDF();
      } else {
        await generateDOCX();
      }
      setIsDone(true);
      setTimeout(() => setIsDone(false), 3000);
    } catch (e) {
      console.error("Download failed", e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button 
      onClick={handleDownload}
      disabled={isGenerating}
      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-smooth shadow-sm disabled:opacity-50"
    >
      {isGenerating ? <Loader2 size={14} className="animate-spin" /> : (isDone ? <Check size={14} /> : <FileDown size={14} />)}
      <span>{isGenerating ? 'Synthesizing...' : (isDone ? 'Downloaded' : `Download ${type.toUpperCase()}`)}</span>
    </button>
  );
}
