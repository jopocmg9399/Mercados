import React, { useState, useRef } from "react";
import { Upload, Loader2, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { getProxyImageUrl } from "../lib/utils";

interface ImageFileUploaderProps {
  value: string;
  onChange: (url: string) => void;
  id?: string;
  placeholder?: string;
}

export function ImageFileUploader({ value, onChange, id, placeholder }: ImageFileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecciona solo archivos de imagen (png, jpg, jpeg, webp).");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target?.result as string;
        if (!base64) throw new Error("Fallo al leer la imagen.");

        const response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: file.name,
            base64: base64,
          }),
        });

        if (!response.ok) {
          throw new Error("No se pudo subir la imagen al servidor.");
        }

        const data = await response.json();
        if (data && data.url) {
          onChange(data.url);
          toast.success(`¡Imagen "${file.name}" cargada físicamente y guardada en el servidor global!`);
        } else {
          throw new Error("Respuesta de carga inválida del servidor.");
        }
      } catch (error) {
        console.error("Error al subir archivo de imagen física:", error);
        toast.error("Error al subir imagen física: " + (error instanceof Error ? error.message : "Desconocido"));
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      toast.error("Error al leer el archivo local.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    toast.info("Imagen retirada.");
  };

  return (
    <div className="grid gap-2 w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelect}
        accept="image/*"
        className="hidden"
        id={id}
      />
      
      {value ? (
        <div className="relative group border-2 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-2 min-h-[140px] transition-all hover:border-indigo-500">
          <img
            src={getProxyImageUrl(value)}
            alt="Preview"
            className="max-h-[140px] w-full object-contain rounded-xl"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl">
            <button
              type="button"
              onClick={triggerSelect}
              disabled={isUploading}
              className="bg-white hover:bg-slate-50 text-slate-900 p-2 rounded-xl hover:scale-105 transition-all text-xs font-black uppercase flex items-center gap-1.5 shadow-lg shadow-black/20 cursor-pointer"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Upload className="h-4 w-4 text-indigo-600" />
              )}
              Reemplazar
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-xl hover:scale-105 transition-all shadow-lg shadow-black/20 cursor-pointer"
              title="Eliminar imagen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerSelect}
          className={`border-3 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-[140px] transition-all gap-2 bg-slate-50 hover:bg-slate-100/50 dark:bg-slate-950 dark:hover:bg-slate-950/80 ${
            isDragging
              ? "border-emerald-500 bg-emerald-50/10 dark:bg-emerald-900/10 scale-[1.01]"
              : "border-slate-200 dark:border-slate-800 hover:border-indigo-500"
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">Cargando imagen física...</span>
            </div>
          ) : (
            <>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                Carga tu foto física aquí
              </p>
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest max-w-[200px] leading-relaxed">
                {placeholder || "Soporta arrastrar y soltar o clic para abrir archivos"}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
