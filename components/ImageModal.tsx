import React from 'react';
import { CloseIcon } from './IconComponents';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image Preview"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-cyan-300 transition-colors z-50"
        aria-label="Close image preview"
      >
        <CloseIcon className="w-8 h-8" />
      </button>
      <div className="relative max-w-[90vw] max-h-[90vh]">
        <img 
          src={imageUrl} 
          alt="Enlarged preview" 
          className="max-w-full max-h-full object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()} // Prevents closing modal when clicking the image
        />
      </div>
    </div>
  );
};