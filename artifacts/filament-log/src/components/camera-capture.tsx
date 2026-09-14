import React, { useRef, useState, useCallback, useEffect } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Camera, ImageIcon, Upload, X, CropIcon, Check, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CameraCaptureProps {
  value?: string;
  onChange: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  className?: string;
  compact?: boolean;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number) {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, 1, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

async function getCroppedWebP(image: HTMLImageElement, crop: PixelCrop, quality = 0.85): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const maxDim = 1600;
  const cropW = crop.width * scaleX;
  const cropH = crop.height * scaleY;
  const scale = Math.min(1, maxDim / Math.max(cropW, cropH));

  canvas.width = Math.round(cropW * scale);
  canvas.height = Math.round(cropH * scale);

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    cropW,
    cropH,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/webp",
      quality
    );
  });
}

export function CameraCapture({ value, onChange, onUploadingChange, className, compact }: CameraCaptureProps) {
  const { toast } = useToast();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [preview, setPreview] = useState<string | undefined>(value);
  const [isUploading, setIsUploading] = useState(false);

  const setUploading = (v: boolean) => {
    setIsUploading(v);
    onUploadingChange?.(v);
  };

  useEffect(() => {
    if (!isUploading) setPreview(value);
  }, [value, isUploading]);

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [pasteZoneOpen, setPasteZoneOpen] = useState(false);
  const pasteZoneRef = useRef<HTMLDivElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height));
  }, []);

  const uploadBlob = async (blob: Blob, filename: string) => {
    setUploading(true);
    try {
      const metaRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: filename, size: blob.size, contentType: "image/webp" }),
      });
      if (!metaRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await metaRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": "image/webp" },
        body: blob,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      onChange(`/api/storage${objectPath}`);
    } catch {
      setPreview(value);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async () => {
    if (!imgRef.current || !completedCrop) return;
    const blob = await getCroppedWebP(imgRef.current, completedCrop);
    const objectUrl = URL.createObjectURL(blob);
    setPreview(objectUrl);
    setCropSrc(null);
    await uploadBlob(blob, `photo-${Date.now()}.webp`);
  };

  const handleCropCancel = () => setCropSrc(null);

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    setPreview(undefined);
    onChange("");
  };

  const loadBlobAsCropSrc = (blob: Blob) => {
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(blob);
  };

  const handlePasteButtonClick = () => {
    setPasteZoneOpen(true);
    setTimeout(() => pasteZoneRef.current?.focus(), 100);
  };

  const handlePasteEvent = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (blob) {
          loadBlobAsCropSrc(blob);
          setPasteZoneOpen(false);
          return;
        }
      }
    }
    toast({ title: "No image found — copy an image first", variant: "destructive" });
  }, [toast]);

  return (
    <div className={cn("space-y-4", className)}>
      <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} className="hidden" />
      <input type="file" accept="image/*" ref={galleryInputRef} onChange={handleFileChange} className="hidden" />

      {/* Crop dialog */}
      <Dialog open={!!cropSrc} onOpenChange={(open) => !open && handleCropCancel()}>
        <DialogContent className="max-w-sm p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CropIcon className="w-4 h-4" /> Crop photo
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {cropSrc && (
              <ReactCrop
                crop={crop}
                onChange={(_, pct) => setCrop(pct)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop={false}
                className="max-h-[60vh]"
              >
                <img
                  ref={imgRef}
                  src={cropSrc}
                  onLoad={onImageLoad}
                  alt="Crop"
                  className="max-h-[60vh] object-contain"
                />
              </ReactCrop>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={handleCropCancel}>
              <X className="w-4 h-4 mr-1.5" /> Cancel
            </Button>
            <Button className="flex-1" onClick={handleCropConfirm} disabled={!completedCrop}>
              <Check className="w-4 h-4 mr-1.5" /> Use photo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Paste zone dialog */}
      <Dialog open={pasteZoneOpen} onOpenChange={setPasteZoneOpen}>
        <DialogContent className="max-w-sm p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ClipboardPaste className="w-4 h-4" /> Paste image
            </DialogTitle>
          </DialogHeader>
          <div
            ref={pasteZoneRef}
            tabIndex={0}
            onPaste={handlePasteEvent}
            className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/30 rounded-lg bg-muted/20 focus:outline-none focus:border-primary/50 focus:bg-primary/5 transition-colors cursor-text"
          >
            <ClipboardPaste className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Press {navigator.userAgent.includes("Mac") ? "⌘V" : "Ctrl+V"} to paste</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Copy an image first, then paste here</p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => setPasteZoneOpen(false)}>
            Cancel
          </Button>
        </DialogContent>
      </Dialog>

      {compact ? (
        <div className="w-full h-full relative group">
          {preview ? (
            <img src={preview} alt="Other" className={cn("w-full h-full object-cover", isUploading && "opacity-50")} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="w-5 h-5 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
            <button type="button" title="Camera" onClick={() => cameraInputRef.current?.click()} className="p-1 rounded hover:bg-white/20">
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
            <button type="button" title="Gallery" onClick={() => galleryInputRef.current?.click()} className="p-1 rounded hover:bg-white/20">
              <ImageIcon className="w-3.5 h-3.5 text-white" />
            </button>
            <button type="button" title="Paste" onClick={handlePasteButtonClick} className="p-1 rounded hover:bg-white/20">
              <ClipboardPaste className="w-3.5 h-3.5 text-white" />
            </button>
            {preview && (
              <button type="button" title="Clear" onClick={handleClear} className="p-1 rounded hover:bg-white/20">
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        </div>
      ) : preview ? (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-lg border border-border bg-muted aspect-square">
            <img
              src={preview}
              alt="Print preview"
              className={cn("w-full h-full object-cover object-center transition-all duration-300", isUploading && "opacity-50 grayscale")}
            />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="bg-background/90 text-foreground px-3 py-1.5 rounded-full text-xs font-medium flex items-center shadow-sm">
                  <Upload className="w-3 h-3 mr-2 animate-bounce" /> Uploading…
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-row gap-2">
            <Button type="button" variant="outline" size="icon" title="Camera" onClick={() => cameraInputRef.current?.click()} disabled={isUploading}>
              <Camera className="w-4 h-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" title="Gallery" onClick={() => galleryInputRef.current?.click()} disabled={isUploading}>
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" title="Paste from clipboard" onClick={handlePasteButtonClick} disabled={isUploading}>
              <ClipboardPaste className="w-4 h-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" title="Clear" onClick={handleClear} disabled={isUploading}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/30">
          <div className="flex bg-primary/10 p-3 rounded-full mb-4">
            <Camera className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground mb-3">Add a photo</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="icon" title="Camera" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="w-4 h-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" title="Gallery" onClick={() => galleryInputRef.current?.click()}>
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" title="Paste from clipboard" onClick={handlePasteButtonClick}>
              <ClipboardPaste className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
