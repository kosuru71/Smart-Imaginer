import React, { useState, useCallback, ChangeEvent, useRef, useEffect } from 'react';
import type { ImageFile, HistoryEntry, AspectRatio } from './types';
import { fileToBase64 } from './utils/fileUtils';
import { createImageWithGemini, editImageWithGemini } from './services/geminiService';
import { UploadIcon, WandIcon, RetryIcon, DownloadIcon, TrashIcon, ExtendIcon, ResetIcon } from './components/IconComponents';
import { ImagePreview } from './components/ImagePreview';
import { StarRating } from './components/StarRating';
import { ImageModal } from './components/ImageModal';
import { canGenerate, incrementGenerationCount, getRemainingGenerations } from './utils/rateLimit';

interface OriginalImage extends ImageFile {
  name: string;
  previewUrl: string;
}

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<OriginalImage | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [remainingGenerations, setRemainingGenerations] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setRemainingGenerations(getRemainingGenerations());
  }, []);

  const performGeneration = useCallback(async (
    editPrompt: string,
    negPrompt: string,
    aspect: AspectRatio,
    imageToEdit?: OriginalImage | null
  ) => {
    if (!canGenerate()) {
      setError("You have reached the daily limit of 20 generations. Please try again tomorrow.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setRating(0);
    
    try {
      const result = imageToEdit
        ? await editImageWithGemini(imageToEdit, editPrompt, negPrompt, aspect)
        : await createImageWithGemini(editPrompt, negPrompt, aspect);

      const fileName = imageToEdit
        ? `edited-${imageToEdit.name}`
        : `created-${editPrompt.slice(0, 20).replace(/\s/g, '_')}-${Date.now()}.png`;
        
      const imageUrl = `data:${result.mimeType};base64,${result.base64}`;
      setGeneratedImage(imageUrl);

      incrementGenerationCount();
      setRemainingGenerations(getRemainingGenerations());

      const newHistoryEntry: HistoryEntry = {
        id: new Date().toISOString(),
        imageUrl: imageUrl,
        fileName: fileName,
        date: new Date().toLocaleString()
      };
      setHistory(prev => [newHistoryEntry, ...prev]);

    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleResetPromptsAndErrors = useCallback(() => {
    setPrompt('');
    setNegativePrompt('');
    setError(null);
  }, []);

  const handleRemoveImage = useCallback(() => {
    setOriginalImage(null);
    setGeneratedImage(null);
    setIsLoading(false);
    setRating(0);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }, []);

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file.');
        return;
      }
      handleRemoveImage();
      handleResetPromptsAndErrors();

      try {
        const base64 = await fileToBase64(file);
        setOriginalImage({
            base64,
            mimeType: file.type,
            name: file.name,
            previewUrl: URL.createObjectURL(file)
        });
      } catch (e) {
        setError('Failed to process image file.');
        console.error(e);
      }
    }
  }, [handleRemoveImage, handleResetPromptsAndErrors]);
  
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    setGeneratedImage(null);
    await performGeneration(prompt, negativePrompt, aspectRatio, originalImage);
  };

  const handleDownload = (imageUrl: string, fileName: string) => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearHistory = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
      setHistory([]);
    }
  }, []);
  
  const handleExtend = useCallback(async () => {
    if (!generatedImage || isLoading) return;

    const parts = generatedImage.split(',');
    if (parts.length < 2) {
        setError("Invalid image format for extension.");
        return;
    }
    const header = parts[0];
    const base64Data = parts[1];
    
    const mimeTypeMatch = header.match(/:(.*?);/);
    if (!mimeTypeMatch) {
        setError("Could not determine image type for extension.");
        return;
    }
    const mimeType = mimeTypeMatch[1];

    const newOriginalImage: OriginalImage = {
        base64: base64Data,
        mimeType: mimeType,
        name: `extended-${originalImage?.name ?? 'image.png'}`,
        previewUrl: generatedImage,
    };

    const extendPrompt = "Generate the next natural progression of the scene. Ensure No existing objects overlap or blur, don't duplicate same characters. Also don't add new objects without the real need as it will change the scene dynamics. dont change the theme, have some variation with the angle movement by some degrees or zoomin naturally. Look at the probable action the characters can do and change the next scene accordingly";
    const extendNegativePrompt = '';

    setOriginalImage(newOriginalImage);
    setGeneratedImage(null);
    setPrompt(extendPrompt);
    setNegativePrompt(extendNegativePrompt);
    setError(null);
    
    createSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    await performGeneration(extendPrompt, extendNegativePrompt, aspectRatio, newOriginalImage);

  }, [generatedImage, originalImage, aspectRatio, isLoading, performGeneration]);

  const handleReset = useCallback(() => {
    if (window.confirm('Are you sure you want to reset the application? This will clear the current image, prompts, and all history.')) {
        setOriginalImage(null);
        setGeneratedImage(null);
        setPrompt('');
        setNegativePrompt('');
        setAspectRatio('1:1');
        setIsLoading(false);
        setError(null);
        setRating(0);
        setHistory([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  }, []);

  const isGenerateDisabled = isLoading || !prompt.trim() || remainingGenerations <= 0;
  const aspectRatioOptions: AspectRatio[] = ['1:1', '16:9', '9:16'];

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
          Gemini Image Editor
        </h1>
        <p className="mt-2 text-lg text-gray-400">
          Transform your images with the power of AI.
        </p>
      </header>
      
      <div className="max-w-7xl mx-auto mb-6 flex justify-end">
        <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-600 hover:text-white transition-colors text-sm"
            aria-label="Reset application state"
        >
            <ResetIcon className="w-5 h-5" />
            Reset to Start
        </button>
      </div>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section ref={createSectionRef} className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 flex flex-col">
          <h2 className="text-2xl font-bold text-gray-200 mb-6">Step 1: Input &amp; Settings</h2>
          <div className="space-y-6 flex flex-col flex-grow">
            <div className='flex-grow flex flex-col'>
                {!originalImage ? (
                    <div className="flex flex-col flex-grow justify-center items-center h-full p-6 border-2 border-gray-600 border-dashed rounded-md text-center">
                        <UploadIcon className="mx-auto h-16 w-16 text-gray-500" />
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-cyan-400 hover:text-cyan-300 focus-within:outline-none px-1 mt-4 text-lg">
                            <span>Upload a file</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} ref={fileInputRef} />
                        </label>
                        <p className="mt-1 text-sm text-gray-500">Or just describe the image you want to create below.</p>
                    </div>
                ) : (
                    <ImagePreview 
                        title="Original"
                        imageUrl={originalImage.previewUrl}
                        onRemove={handleRemoveImage}
                        isLoading={isLoading}
                    />
                )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-300 mb-2">{originalImage ? 'Describe Edit' : 'Describe Image'}</h3>
              <textarea
                rows={3}
                className="shadow-sm block w-full sm:text-sm border-gray-600 bg-gray-900 rounded-md focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-500 disabled:opacity-50 transition-all"
                placeholder={originalImage ? "e.g., 'Add a retro filter', 'Make the background black and white'" : "e.g., 'A photorealistic cat wearing a wizard hat'"}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
              />
            </div>
             <div>
              <h3 className="font-semibold text-gray-300 mb-2">Negative Prompt <span className="text-gray-500 text-sm">(optional)</span></h3>
              <textarea
                rows={2}
                className="shadow-sm block w-full sm:text-sm border-gray-600 bg-gray-900 rounded-md focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-500 disabled:opacity-50 transition-all"
                placeholder="e.g., blurry, text, watermark, ugly"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <h3 className="font-semibold text-gray-300 mb-2">Aspect Ratio</h3>
              <div className="flex space-x-2">
                {aspectRatioOptions.map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    disabled={isLoading}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                      aspectRatio === ratio
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-2">
                <p className="text-center text-sm text-gray-400 mb-2">
                  You have {remainingGenerations} generation{remainingGenerations !== 1 ? 's' : ''} left today.
                </p>
                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerateDisabled}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
                >
                <WandIcon className="w-5 h-5 mr-2" />
                {originalImage ? 'Generate Image' : 'Create Image'}
                </button>
                {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
            </div>
          </div>
        </section>

        {/* Step 2: Result */}
        <section className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 flex flex-col">
            <h2 className="text-2xl font-bold text-gray-200 mb-6">Step 2: Result</h2>
            <div className="flex-grow">
                <ImagePreview 
                  title="Generated" 
                  imageUrl={generatedImage} 
                  isLoading={isLoading} 
                  onDownload={() => generatedImage && handleDownload(generatedImage, `edited-${originalImage?.name ?? 'image.png'}`)}
                  onClick={() => generatedImage && setModalImageUrl(generatedImage)}
                />
            </div>
            {generatedImage && !isLoading && (
                <div className='mt-6 space-y-4'>
                    <div className="flex items-center justify-center space-x-4">
                        <button
                            onClick={() => handleDownload(generatedImage, `edited-${originalImage?.name ?? 'image.png'}`)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            <DownloadIcon className="w-5 h-5"/> Download
                        </button>
                        <button
                            onClick={handleExtend}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            <ExtendIcon className="w-5 h-5"/> Extend
                        </button>
                         <button
                            onClick={handleGenerate}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            <RetryIcon className="w-5 h-5"/> Retry
                        </button>
                    </div>
                     <p className="text-xs text-gray-400 text-center italic px-4 pt-2">
                        Note: If the scene is NOT naturally going to next level, please change the prompt.
                    </p>
                    <div>
                      <h3 className="text-center font-semibold text-gray-300 mb-2">Rate the result</h3>
                      <StarRating rating={rating} onRatingChange={setRating} disabled={!generatedImage || isLoading}/>
                    </div>
                </div>
            )}
        </section>
      </main>

      {history.length > 0 && (
        <section className="max-w-7xl mx-auto mt-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-200">History</h2>
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-2 px-3 py-1 bg-red-600/20 text-red-400 font-semibold rounded-lg hover:bg-red-600/40 transition-colors text-sm"
                aria-label="Clear all history"
              >
                <TrashIcon className="w-4 h-4" />
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {history.map((item) => (
                    <div key={item.id} className="group relative bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                        <img 
                          src={item.imageUrl} 
                          alt="Generated" 
                          className="aspect-square w-full object-cover cursor-pointer"
                          onClick={() => setModalImageUrl(item.imageUrl)}
                        />
                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2 pointer-events-none">
                            <p className="text-xs text-center text-gray-300 mb-2">{item.date}</p>
                            <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(item.imageUrl, item.fileName)
                                }}
                                className="pointer-events-auto flex items-center justify-center gap-2 w-full px-3 py-2 bg-cyan-600 text-white text-sm font-semibold rounded-lg hover:bg-cyan-700 transition-colors"
                            >
                                <DownloadIcon className="w-4 h-4"/> Download
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
      )}
      {modalImageUrl && <ImageModal imageUrl={modalImageUrl} onClose={() => setModalImageUrl(null)} />}
    </div>
  );
};

export default App;