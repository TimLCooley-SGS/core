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

// Credit card aspect ratio: 3.375 / 2.125
const CARD_ASPECT = 3.375 / 2.125;
// Output dimensions
const OUTPUT_WIDTH = 675;
const OUTPUT_HEIGHT = Math.round(OUTPUT_WIDTH / CARD_ASPECT); // 425

interface ImageCropperProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => void;
}

export function ImageCropper({
  open,
  imageSrc,
  onClose,
  onCropComplete,
}: ImageCropperProps) {
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
      const file = await cropAndResize(
        imageSrc,
        croppedAreaPixels,
        OUTPUT_WIDTH,
        OUTPUT_HEIGHT,
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
          <DialogTitle>Crop Card Image</DialogTitle>
          <DialogDescription>
            Drag to reposition. Scroll or use the slider to zoom. The image will
            be resized to {OUTPUT_WIDTH}x{OUTPUT_HEIGHT}px.
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full bg-muted rounded-md overflow-hidden" style={{ height: 350 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={CARD_ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropChange}
          />
        </div>

        <div className="flex items-center gap-3 px-1">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Zoom</span>
          <input
            type="range"
            min={1}
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

/**
 * Crops the source image to the given pixel area, then resizes to the
 * target dimensions. Returns a File ready for upload.
 */
async function cropAndResize(
  imageSrc: string,
  crop: Area,
  targetWidth: number,
  targetHeight: number,
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

  return new File([blob], "card-front.png", { type: "image/png" });
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
