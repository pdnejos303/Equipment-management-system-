// Path: src/components/forms/BatchPhotoForm.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Upload, Trash2, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FormFooter } from "@/components/ui/FormFooter";
import { useI18n } from "@/lib/i18n";
import { showSuccess, showError } from "@/lib/swal";

interface Props {
  open: boolean;
  onClose: () => void;
  assetIds: string[];
}

async function compressImage(file: File, maxWidth = 1920, quality = 0.82): Promise<File> {
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
      resolve(file);
    };
    img.src = objectUrl;
  });
}

export function BatchPhotoForm({ open, onClose, assetIds }: Props) {
  const { t } = useI18n();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setReplaceExisting(false);
    setSaving(false);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const pickFile = useCallback((picked: File | null | undefined) => {
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      showError(t("photoUpload.selectImage"));
      return;
    }
    setFile(picked);
  }, [t]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      pickFile(e.dataTransfer.files[0]);
    },
    [pickFile]
  );

  const canSubmit = (file !== null || replaceExisting) && assetIds.length > 0 && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    try {
      const fd = new FormData();
      if (file) {
        const compressed = await compressImage(file);
        fd.append("file", compressed);
      }
      fd.append("assetIds", JSON.stringify(assetIds));
      fd.append("replaceExisting", String(replaceExisting));

      const res = await fetch("/api/assets/batch-photos", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }

      const { ok, failed } = (await res.json()) as { ok: number; failed: number };

      if (failed === 0) {
        await showSuccess(
          t("labels.batchPhotoTitle", assetIds.length),
          t("labels.batchPhotoSuccess", ok)
        );
      } else if (ok === 0) {
        showError(t("labels.batchPhotoTitle", assetIds.length), t("labels.batchPhotoFailed"));
      } else {
        await showSuccess(
          t("labels.batchPhotoTitle", assetIds.length),
          t("labels.batchPartialSuccess", ok, failed)
        );
      }

      reset();
      onClose();
      router.refresh();
    } catch (err) {
      console.error("batch photo error:", err);
      showError(t("labels.batchPhotoTitle", assetIds.length), t("labels.batchPhotoFailed"));
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t("labels.batchPhotoTitle", assetIds.length)}
      width="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {t("labels.batchPhotoHelp")}
        </p>

        {/* Drop / preview zone */}
        <div
          className={`relative w-full aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all duration-200 bg-surface-dark ${
            dragOver
              ? "border-brand-500 bg-brand-500/10"
              : previewUrl
              ? "border-border"
              : "border-dashed border-border hover:border-gray-600"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {previewUrl ? (
            <>
              <NextImage
                src={previewUrl}
                alt="preview"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain"
                unoptimized
              />
              <button
                type="button"
                onClick={() => setFile(null)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 hover:bg-red-500 flex items-center justify-center text-white transition"
                aria-label={t("photoUpload.deleteFailed")}
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <label
              htmlFor="batch-photo-upload"
              className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 hover:text-gray-400 transition-colors cursor-pointer"
            >
              <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-3 border border-border">
                <ImagePlus size={28} className="text-gray-500" />
              </div>
              <p className="text-sm font-medium text-gray-400">{t("photoUpload.dragDrop")}</p>
              <p className="text-xs text-gray-600 mt-1">{t("photoUpload.fileTypes")}</p>
            </label>
          )}

          {dragOver && (
            <div className="absolute inset-0 bg-brand-500/10 border-2 border-brand-500 rounded-xl flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <Upload size={32} className="text-brand-500 mx-auto mb-2" />
                <p className="text-brand-500 text-sm font-semibold">{t("photoUpload.dropHere")}</p>
              </div>
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          id="batch-photo-upload"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {/* Replace toggle */}
        <label className="flex items-start gap-3 px-3 py-3 rounded-lg border border-border bg-surface-dark cursor-pointer hover:border-gray-600 transition">
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={(e) => setReplaceExisting(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-surface-dark text-brand-500 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-default)" }}>
              <Trash2 size={14} className="text-red-400" />
              {t("labels.batchPhotoReplace")}
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {t("labels.batchPhotoReplaceHelp")}
            </p>
          </div>
        </label>

        <FormFooter
          cancelLabel={t("editAsset.cancel")}
          onCancel={handleClose}
          submitLabel={
            file && replaceExisting
              ? t("labels.batchPhotoApplyReplace", assetIds.length)
              : file
              ? t("labels.batchPhotoApplyAdd", assetIds.length)
              : t("labels.batchPhotoApplyDelete", assetIds.length)
          }
          submittingLabel={t("editAsset.saving")}
          submitting={saving}
          disabled={!canSubmit}
        />
      </form>
    </Modal>
  );
}
