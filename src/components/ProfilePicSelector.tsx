import React, { useState, useCallback, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, Loader2, Image as ImageIcon, Upload, Link as LinkIcon } from 'lucide-react';

interface ProfilePicSelectorProps {
  movieUrls: string[];
  actressName: string;
  onClose: () => void;
  onSave: (base64Image: string) => void;
}

export function ProfilePicSelector({ movieUrls, actressName, onClose, onSave }: ProfilePicSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [manualUrl, setManualUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedImage) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setImageLoaded(false);
    }
  }, [selectedImage]);

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      try {
        const allImages: string[] = [];
        // Fetch from first 10 movies to give more options
        const urlsToFetch = movieUrls.slice(0, 10);
        
        const promises = urlsToFetch.map(async (url) => {
          try {
            // If the URL is already a direct image link (poster), use it
            if (url.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
              return [url];
            }
            const resp = await fetch(`/api/movie?url=${encodeURIComponent(url)}`);
            if (!resp.ok) return [];
            const data = await resp.json();
            const imgs = [];
            if (data.poster) imgs.push(data.poster);
            if (data.screenshots && data.screenshots.length > 0) {
              imgs.push(...data.screenshots);
            }
            return imgs;
          } catch (e) {
            return [];
          }
        });

        const results = await Promise.all(promises);
        results.forEach(imgs => allImages.push(...imgs));
        
        // Remove duplicates and filter out empty strings
        setImages(Array.from(new Set(allImages)).filter(Boolean));
      } catch (e) {
        console.error("Failed to fetch movie images", e);
      } finally {
        setLoading(false);
      }
    };
    fetchImages();
  }, [movieUrls]);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleManualUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualUrl.trim()) {
      setSelectedImage(manualUrl.trim());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      if (!url.startsWith('data:')) {
        image.setAttribute('crossOrigin', 'anonymous'); 
        image.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
      } else {
        image.src = url;
      }
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = 512;
    canvas.height = 512;

    ctx.drawImage(
      image,
      pixelCrop.x * scaleX,
      pixelCrop.y * scaleY,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
      0,
      0,
      512,
      512
    );

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleSave = async () => {
    if (!selectedImage) return;
    
    // If no crop area, just save the original
    if (!croppedAreaPixels) {
      onSave(selectedImage);
      return;
    }

    setProcessing(true);
    try {
      const croppedImage = await getCroppedImg(selectedImage, croppedAreaPixels);
      onSave(croppedImage);
    } catch (e) {
      // Fallback: just use the original image if cropping fails due to CORS
      onSave(selectedImage);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-4xl rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-bold text-lg">Select Profile Picture for {actressName}</h3>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative min-h-[400px]">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Loader2 size={48} className="animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading images...</p>
            </div>
          ) : selectedImage ? (
            <div className="flex flex-col h-full">
              <div className="relative flex-1 min-h-[400px] bg-black/10 rounded-xl overflow-hidden mb-4">
                <Cropper
                  image={selectedImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={true}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              <div className="flex items-center gap-4 px-4">
                <span className="text-sm font-medium">Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form onSubmit={handleManualUrlSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input 
                      type="url" 
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      placeholder="Paste image URL..."
                      className="w-full pl-10 pr-3 py-3 rounded-xl border border-border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary transition"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition"
                  >
                    Use URL
                  </button>
                </form>

                <div className="flex gap-2">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 bg-muted text-foreground px-6 py-3 rounded-xl font-bold hover:bg-muted/80 transition flex items-center justify-center gap-2 border border-border"
                  >
                    <Upload size={18} /> Upload Image
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-medium">Or select from movies</span>
                </div>
              </div>

              {images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(img)}
                      className="relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition group shadow-sm"
                    >
                      <img src={img} alt={`Option ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="text-white font-medium flex items-center gap-2">
                          <ImageIcon size={16} /> Select
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ImageIcon size={48} className="mb-4 opacity-20" />
                  <p>No images found in recent movies.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/30">
          {selectedImage ? (
            <>
              <button 
                onClick={() => setSelectedImage(null)} 
                className="px-6 py-2 rounded-xl font-bold hover:bg-accent transition"
                disabled={processing}
              >
                Back to Gallery
              </button>
              <button 
                onClick={handleSave} 
                disabled={processing}
                className="bg-primary text-primary-foreground px-8 py-2 rounded-xl font-bold hover:bg-primary/90 transition flex items-center gap-2 shadow-sm"
              >
                {processing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Save Profile Picture
              </button>
            </>
          ) : (
            <button onClick={onClose} className="px-6 py-2 rounded-xl font-bold hover:bg-accent transition">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
