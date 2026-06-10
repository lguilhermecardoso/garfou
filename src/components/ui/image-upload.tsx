"use client";

/**
 * ImageUpload — Componente reutilizável de upload de imagem para R2.
 *
 * Suporta: drag-and-drop, clique para selecionar, preview, remoção.
 * Envia para POST /api/upload e retorna a URL pública.
 */

import { useRef, useState } from "react";
import { ImageIcon, Upload, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

interface Props {
  /** Current image URL (controlled) */
  value: string | null | undefined;
  /** Called with the new public URL after upload, or null on removal */
  onChange: (url: string | null) => void;
  /** R2 folder (e.g. "logos", "banners", "products") */
  folder: string;
  /** Hint text shown in the drop zone */
  label?: string;
  /** Aspect ratio CSS class (default: aspect-video for banners, aspect-square for logos) */
  aspectRatio?: "square" | "video" | "banner";
  /** Max image width in px for preview (default 400) */
  maxPreviewWidth?: number;
  disabled?: boolean;
}

const ASPECT_CLASSES = {
  square: "aspect-square",
  video: "aspect-video",
  banner: "aspect-[3/1]",
};

export function ImageUpload({
  value,
  onChange,
  folder,
  label = "Clique ou arraste uma imagem",
  aspectRatio = "video",
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (disabled || uploading) return;

    // Client-side validation
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error("Formato não suportado. Use JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB.");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Erro no upload.");
        return;
      }
      onChange(json.url);
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const aspectClass = ASPECT_CLASSES[aspectRatio];

  if (value) {
    return (
      <div className={`relative w-full overflow-hidden rounded-xl ${aspectClass}`}>
        <Image
          src={value}
          alt="Imagem carregada"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 600px"
          unoptimized
        />
        {!disabled && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all hover:bg-black/40 hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow transition-colors hover:bg-neutral-100"
            >
              <Upload className="h-3.5 w-3.5" />
              Trocar
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white shadow transition-colors hover:bg-red-600"
            >
              <X className="h-3.5 w-3.5" />
              Remover
            </button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`relative flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors ${aspectClass} ${
        dragOver
          ? "border-primary-400 bg-primary-50"
          : "hover:border-primary-300 hover:bg-primary-50/50 border-neutral-300 bg-neutral-50"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {uploading ? (
        <>
          <Loader2 className="text-primary-500 h-8 w-8 animate-spin" />
          <span className="text-sm text-neutral-500">Enviando...</span>
        </>
      ) : (
        <>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-200">
            <ImageIcon className="h-5 w-5 text-neutral-500" />
          </div>
          <span className="text-center text-sm font-medium text-neutral-600">{label}</span>
          <span className="text-xs text-neutral-400">JPEG, PNG ou WebP · Máx. 5MB</span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || uploading}
      />
    </div>
  );
}
