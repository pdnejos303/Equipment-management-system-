// Path: src/components/PhotoUpload.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import NextImage from "next/image";
import { X, Star, Upload, ImagePlus } from "lucide-react";
import type { AssetPhoto } from "@/types";
import { showError } from "@/lib/swal";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

// ── Client-side image compression ──────────────────────────
// Resizes to maxWidth and converts to JPEG at given quality.
// Runs entirely in the browser — no server round-trip for compression.

async function compressImage(
  file: File,
  maxWidth = 1920,
  quality = 0.82
): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d")!;
      // White background so transparent PNGs look right as JPEG
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          const outName = file.name.replace(/\.[^.]+$/, ".jpg");
          resolve(new File([blob!], outName, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Fallback: send original if canvas fails
      resolve(file);
    };

    img.src = objectUrl;
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ── Component ───────────────────────────────────────────────

interface PhotoUploadProps {
  assetId: string;
  photos: AssetPhoto[];
  onPhotosChange: (photos: AssetPhoto[]) => void;
  readOnly?: boolean;
}

export function PhotoUpload({
  assetId,
  photos,
  onPhotosChange,
  readOnly = false,
}: PhotoUploadProps) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        showError(t("photoUpload.selectImage"));
        return;
      }

      setUploading(true);
      setCompressionInfo(t("photoUpload.compressing"));

      try {
        // Compress before upload
        const originalSize = file.size;
        const compressed = await compressImage(file);
        const savedPct = Math.round((1 - compressed.size / originalSize) * 100);
        setCompressionInfo(
          savedPct > 5
            ? t("photoUpload.compressed", formatBytes(originalSize), formatBytes(compressed.size), savedPct)
            : `${formatBytes(compressed.size)}`
        );

        const formData = new FormData();
        formData.append("file", compressed);
        formData.append("assetId", assetId);
        formData.append("isPrimary", String(photos.length === 0));

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const photo: AssetPhoto = await res.json();
        onPhotosChange([...photos, photo]);
      } catch (err) {
        console.error("Upload error:", err);
        showError(t("photoUpload.uploadFailed"));
      } finally {
        setUploading(false);
        setTimeout(() => setCompressionInfo(null), 3000);
      }
    },
    [assetId, photos, onPhotosChange]
  );

  const deletePhoto = async (photoId: string) => {
    try {
      const res = await fetch(`/api/upload?photoId=${photoId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onPhotosChange(photos.filter((p) => p.id !== photoId));
      }
    } catch (err) {
      console.error("Delete error:", err);
      showError(t("photoUpload.deleteFailed"));
    }
  };

  const setPrimary = async (photoId: string) => {
    // Optimistic update
    onPhotosChange(photos.map((p) => ({ ...p, isPrimary: p.id === photoId })));
    try {
      await fetch(`/api/upload?photoId=${photoId}`, { method: "PATCH" });
    } catch {
      // silent — optimistic state is good enough
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (readOnly) return;
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) uploadFile(file);
    },
    [uploadFile, readOnly]
  );

  const primaryPhoto = photos.find((p) => p.isPrimary) || photos[0];

  return (
    <>
      <div>
        {/* Main photo — constrained aspect, fits any orientation */}
        <div
          className={cn(
            "relative w-full aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all duration-200 bg-surface-dark",
            dragOver ? "border-brand-500 bg-brand-500/10 scale-[0.99]" : "",
            primaryPhoto && !dragOver ? "border-border" : "",
            !primaryPhoto && !dragOver && !readOnly
              ? "border-dashed border-border hover:border-gray-600"
              : "",
            !primaryPhoto && readOnly ? "border-dashed border-border" : ""
          )}
          onDragOver={(e) => {
            e.preventDefault();
            if (!readOnly) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {primaryPhoto ? (
            <button
              type="button"
              onClick={() => setLightboxSrc(primaryPhoto.url)}
              className="absolute inset-0 w-full h-full cursor-zoom-in"
              aria-label="View full size"
            >
              <NextImage
                src={primaryPhoto.url}
                alt="Equipment photo"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain"
                priority={false}
              />
            </button>
          ) : readOnly ? (
            <div className="flex flex-col items-center justify-center h-full bg-surface-dark text-gray-700">
              <ImagePlus size={28} className="mb-2" />
              <p className="text-xs">{t("photoUpload.noPhotos")}</p>
            </div>
          ) : (
            <label
              htmlFor={`photo-upload-${assetId}`}
              className="flex flex-col items-center justify-center h-full cursor-pointer text-gray-600 hover:text-gray-400 transition-colors bg-surface-dark"
            >
              <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-3 border border-border">
                <ImagePlus size={28} className="text-gray-500" />
              </div>
              <p className="text-sm font-medium text-gray-400">{t("photoUpload.dragDrop")}</p>
              <p className="text-xs text-gray-600 mt-1">{t("photoUpload.fileTypes")}</p>
            </label>
          )}

          {/* Drag overlay */}
          {dragOver && (
            <div className="absolute inset-0 bg-brand-500/10 border-2 border-brand-500 rounded-xl flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <Upload size={32} className="text-brand-500 mx-auto mb-2" />
                <p className="text-brand-500 text-sm font-semibold">{t("photoUpload.dropHere")}</p>
              </div>
            </div>
          )}

          {/* Uploading overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
              <div className="text-amber-400 text-sm font-medium">
                {compressionInfo || t("photoUpload.uploading")}
              </div>
            </div>
          )}
        </div>

        {/* Compression info toast */}
        {compressionInfo && !uploading && (
          <p className="text-[11px] text-green-500 mt-1.5 text-center animate-fade-in">
            ✓ {compressionInfo}
          </p>
        )}

        {/* Thumbnails */}
        {photos.length > 0 && (
          <div className="grid grid-cols-5 gap-2 mt-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square">
                <NextImage
                  src={photo.url}
                  alt=""
                  fill
                  sizes="120px"
                  className={cn(
                    "object-cover rounded-lg cursor-pointer border-2 transition-all",
                    photo.isPrimary
                      ? "border-brand-500 ring-1 ring-brand-500/30"
                      : "border-transparent hover:border-gray-600"
                  )}
                  onClick={() =>
                    readOnly
                      ? setLightboxSrc(photo.url)
                      : setPrimary(photo.id)
                  }
                />

                {/* Primary badge */}
                {photo.isPrimary && (
                  <div className="absolute top-1 left-1 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center shadow-sm">
                    <Star size={10} className="text-black fill-black" />
                  </div>
                )}

                {/* Delete (edit-mode only) */}
                {!readOnly && (
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                  >
                    <X size={10} className="text-white" />
                  </button>
                )}
              </div>
            ))}

            {/* Add more button */}
            {!readOnly && (
              <div className="aspect-square">
                <label
                  htmlFor={`photo-upload-${assetId}`}
                  className="w-full h-full rounded-lg border-2 border-dashed border-border flex items-center justify-center text-gray-600 hover:border-gray-500 hover:text-gray-400 transition-colors bg-surface-dark hover:bg-surface-hover cursor-pointer"
                >
                  <Upload size={16} />
                </label>
              </div>
            )}
          </div>
        )}

        {!readOnly && (
          <input
            ref={fileRef}
            id={`photo-upload-${assetId}`}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = "";
            }}
          />
        )}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-overlay-in"
          onClick={() => setLightboxSrc(null)}
        >
          <NextImage
            src={lightboxSrc}
            alt="Full size"
            width={1920}
            height={1920}
            sizes="90vw"
            className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </>
  );
}
