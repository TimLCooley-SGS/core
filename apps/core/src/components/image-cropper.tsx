"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@sgscore/ui";

interface ImageCropperProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => void;
  aspect?: number;
  outputWidth?: number;
  outputHeight?: number;
  fileName?: string;
  title?: string;
}

// Defaults match the original card cropper values
const DEFAULT_ASPECT = 3.375 / 2.125;
const DEFAULT_OUTPUT_WIDTH = 675;

export function ImageCropper({
  open,
  imageSrc,
  onClose,
  onCropComplete,
  aspect = DEFAULT_ASPECT,
  outputWidth = DEFAULT_OUTPUT_WIDTH,
  outputHeight,
  fileName = "cropped.png",
  title = "Crop Image",
}: ImageCropperProps) {
  const finalHeight = outputHeight ?? Math.round(outputWidth / aspect);

  const isFreeAspect = aspect === undefined;
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropChange = useCallback(
    (_: unknown, croppedArea: Area) => {
      setCroppedAreaPixels(croppedArea);
    },
    [],
  );

  async function handleSave() {
    if (!croppedAreaPixels) return;
    setProcessing(true);

    try {
      let w = outputWidth;
      let h = finalHeight;

      // For free aspect, compute output dimensions from the crop's actual ratio
      if (isFreeAspect && croppedAreaPixels.width > 0 && croppedAreaPixels.height > 0) {
        const cropAspect = croppedAreaPixels.width / croppedAreaPixels.height;
        const maxDim = 800;
        if (cropAspect >= 1) {
          w = maxDim;
          h = Math.round(maxDim / cropAspect);
        } else {
          h = maxDim;
          w = Math.round(maxDim * cropAspect);
        }
      }

      const file = await cropAndResize(
        imageSrc,
        croppedAreaPixels,
        w,
        h,
        fileName,
      );
      onCropComplete(file);
    } catch {
      // If cropping fails, fall back to the original
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Drag to reposition. Scroll or use the slider to zoom.
            {isFreeAspect
              ? " The image will be resized to fit within 800px."
              : ` The image will be resized to ${outputWidth}x${finalHeight}px.`}
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full bg-muted rounded-md overflow-hidden" style={{ height: 350 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            minZoom={0.1}
            maxZoom={3}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropChange}
            objectFit="contain"
            restrictPosition={false}
          />
        </div>

        <div className="flex items-center gap-3 px-1">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Zoom</span>
          <input
            type="range"
            min={0.1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={processing}
            onClick={handleSave}
          >
            {processing ? "Processing..." : "Crop & Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function cropAndResize(
  imageSrc: string,
  crop: Area,
  targetWidth: number,
  targetHeight: number,
  fileName: string,
): Promise<File> {
  const image = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))),
      "image/png",
      0.92,
    );
  });

  return new File([blob], fileName, { type: "image/png" });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
