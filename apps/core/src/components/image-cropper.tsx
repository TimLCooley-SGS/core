"use client";

import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
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
  const isFreeAspect = aspect === undefined;
  const finalHeight = outputHeight ?? Math.round(outputWidth / (aspect || 1));

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [processing, setProcessing] = useState(false);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      imgRef.current = img;

      // Set initial crop to 80% centered
      const { naturalWidth, naturalHeight } = img;
      const cropAspect = isFreeAspect ? naturalWidth / naturalHeight : aspect;
      const pctW = 80;
      const pctH = Math.min(80, (pctW / cropAspect) * (naturalWidth / naturalHeight));
      const adjustedW = Math.min(pctW, pctH * cropAspect * (naturalHeight / naturalWidth));

      setCrop({
        unit: "%",
        x: (100 - adjustedW) / 2,
        y: (100 - pctH) / 2,
        width: adjustedW,
        height: pctH,
      });
    },
    [aspect, isFreeAspect],
  );

  async function handleSave() {
    if (!completedCrop || !imgRef.current) return;
    setProcessing(true);

    try {
      let w = outputWidth;
      let h = finalHeight;

      if (isFreeAspect && completedCrop.width > 0 && completedCrop.height > 0) {
        const cropAspect = completedCrop.width / completedCrop.height;
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
        imgRef.current,
        completedCrop,
        w,
        h,
        fileName,
      );
      onCropComplete(file);
    } catch {
      // If cropping fails, ignore
    } finally {
      setProcessing(false);
    }
  }

  const description = isFreeAspect
    ? "Drag corners to resize. The image will be scaled to fit within 800px."
    : `Drag corners to resize. The image will be resized to ${outputWidth}x${finalHeight}px.`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center bg-muted rounded-md overflow-hidden" style={{ maxHeight: 400 }}>
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={isFreeAspect ? undefined : aspect}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt="Crop preview"
              onLoad={onImageLoad}
              style={{ maxHeight: 400, maxWidth: "100%" }}
            />
          </ReactCrop>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={processing || !completedCrop}
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
  image: HTMLImageElement,
  crop: PixelCrop,
  targetWidth: number,
  targetHeight: number,
  fileName: string,
): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // react-image-crop PixelCrop values are relative to the displayed image size.
  // Scale to natural image dimensions.
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
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
