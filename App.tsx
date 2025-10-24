import React, { useState, useCallback, ChangeEvent, useRef } from 'react';
import type { ImageFile, HistoryEntry, AspectRatio } from './types';
import { fileToBase64 } from './utils/fileUtils';
import { editImageWithGemini } from './services/geminiService';
import { UploadIcon, WandIcon, RetryIcon, DownloadIcon } from './components/IconComponents';
import { ImagePreview } from './components/ImagePreview';
import { StarRating } from './components/StarRating';
import { ImageModal } from './components/ImageModal';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      handleRemoveImage(); // Clear previous images
      handleResetPromptsAndErrors(); // Clear prompts for new image

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
    if (!originalImage) {
      setError('Please upload an image first.');
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter an editing prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    setRating(0);

    try {
      const generatedData = await editImageWithGemini(originalImage, prompt, negativePrompt, aspectRatio);
      const imageUrl = `data:${originalImage.mimeType};base64,${generatedData}`;
      setGeneratedImage(imageUrl);

      const newHistoryEntry: HistoryEntry = {
        id: new Date().toISOString(),
        imageUrl: imageUrl,
        fileName: `edited-${originalImage.name}`,
        date: new Date().toLocaleString()
      };
      setHistory(prev => [newHistoryEntry, ...prev]);

    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
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
  
  const isGenerateDisabled = isLoading || !originalImage || !prompt.trim();
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
      
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Step 1: Create */}
        <section className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 flex flex-col">
          <h2 className="text-2xl font-bold text-gray-200 mb-6">Step 1: Create</h2>
          <div className="space-y-6 flex flex-col flex-grow">
            <div className='flex-grow flex flex-col'>
                {!originalImage ? (
                    <div className="flex flex-col flex-grow justify-center items-center h-full p-6 border-2 border-gray-600 border-dashed rounded-md text-center">
                        <UploadIcon className="mx-auto h-16 w-16 text-gray-500" />
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-cyan-400 hover:text-cyan-300 focus-within:outline-none px-1 mt-4 text-lg">
                            <span>Upload a file</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} ref={fileInputRef} />
                        </label>
                        <p className="mt-1 text-sm text-gray-500">PNG, JPG, WEBP</p>
                    </div>
                ) : (
                    <ImagePreview 
                        title="Original"
                        imageUrl={originalImage.previewUrl}
                        onRemove={handleRemoveImage}
                    />
                )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-300 mb-2">Describe Edit</h3>
              <textarea
                rows={3}
                className="shadow-sm block w-full sm:text-sm border-gray-600 bg-gray-900 rounded-md focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-500 disabled:opacity-50 transition-all"
                placeholder="e.g., 'Add a retro filter', 'Make the background black and white'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={!originalImage || isLoading}
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
                disabled={!originalImage || isLoading}
              />
            </div>
            <div>
              <h3 className="font-semibold text-gray-300 mb-2">Aspect Ratio</h3>
              <div className="flex space-x-2">
                {aspectRatioOptions.map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    disabled={!originalImage || isLoading}
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
                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerateDisabled}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
                >
                <WandIcon className="w-5 h-5 mr-2" />
                Generate Image
                </button>
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
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            <DownloadIcon className="w-5 h-5"/> Download
                        </button>
                         <button
                            onClick={handleGenerate}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            <RetryIcon className="w-5 h-5"/> Retry
                        </button>
                    </div>
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
            <h2 className="text-2xl font-bold text-gray-200 mb-6">History</h2>
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
