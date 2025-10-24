import React from 'react';
import { DownloadIcon, ImageIcon, SparklesIcon, TrashIcon } from './IconComponents';

interface ImagePreviewProps {
  title: string;
  imageUrl: string | null;
  isLoading?: boolean;
  onDownload?: () => void;
  onRemove?: () => void;
  onClick?: () => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ title, imageUrl, isLoading = false, onDownload, onRemove, onClick }) => {
  const isClickable = !!onClick && !!imageUrl && !isLoading;
  return (
    <div className="w-full flex flex-col items-center">
      <h3 className="text-lg font-semibold text-cyan-300 mb-3">{title}</h3>
      <div 
        className={`w-full aspect-square bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center relative group overflow-hidden ${isClickable ? 'cursor-pointer' : ''}`}
        onClick={isClickable ? onClick : undefined}
        >
        {!imageUrl && !isLoading && (
          <div className="text-center text-gray-400">
            {title === "Original" ? <ImageIcon className="w-16 h-16 mx-auto" /> : <SparklesIcon className="w-16 h-16 mx-auto" />}
            <p className="mt-2 text-sm">
                {title === "Original" ? "Upload an image to start" : "Your edited image will appear here"}
            </p>
          </div>
        )}
        {imageUrl && (
          <>
            <img src={imageUrl} alt={title} className="w-full h-full object-contain" />
            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {onDownload && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent modal from opening when clicking download
                            onDownload();
                        }}
                        className="p-2 bg-cyan-600/80 text-white rounded-full hover:bg-cyan-700 transition-colors backdrop-blur-sm"
                        aria-label="Download generated image"
                    >
                        <DownloadIcon className="w-6 h-6"/>
                    </button>
                )}
                {onRemove && (
                     <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                        className="p-2 bg-red-600/80 text-white rounded-full hover:bg-red-700 transition-colors backdrop-blur-sm disabled:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Remove original image"
                        disabled={isLoading}
                    >
                        <TrashIcon className="w-6 h-6"/>
                    </button>
                )}
            </div>
          </>
        )}
        {isLoading && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm transition-opacity">
            <div className="w-16 h-16 border-4 border-dashed border-cyan-400 rounded-full animate-spin"></div>
            <p className="text-white mt-4 text-lg">Generating...</p>
          </div>
        )}
      </div>
    </div>
  );
};