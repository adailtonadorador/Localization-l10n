import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  name?: string;
  onUploadComplete: (url: string) => void;
  onError?: (error: string) => void;
  size?: "sm" | "md" | "lg";
  required?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
};

const iconSizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  name,
  onUploadComplete,
  onError,
  size = "md",
  required = false,
  className,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "??";

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      onError?.("Formato inválido. Use JPG, PNG, WebP ou GIF.");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      onError?.("A imagem deve ter no máximo 5MB.");
      return;
    }

    setUploading(true);

    try {
      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Delete old avatar if exists
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split("/avatars/")[1];
        if (oldPath) {
          await supabase.storage.from("avatars").remove([oldPath]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      onUploadComplete(publicUrl);
    } catch (error) {
      console.error("Upload error:", error);
      onError?.("Erro ao fazer upload da imagem. Tente novamente.");
      setPreviewUrl(currentAvatarUrl || null);
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleRemove() {
    setPreviewUrl(null);
    onUploadComplete("");
  }

  function triggerFileInput() {
    fileInputRef.current?.click();
  }

  const hasAvatar = !!previewUrl;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative group">
        <Avatar className={cn(sizeClasses[size], "ring-4 ring-slate-100 shadow-lg")}>
          <AvatarImage src={previewUrl || ""} className="object-cover" />
          <AvatarFallback className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xl font-bold">
            {uploading ? (
              <Loader2 className={cn(iconSizeClasses[size], "animate-spin")} />
            ) : (
              initials
            )}
          </AvatarFallback>
        </Avatar>

        {/* Overlay button */}
        <button
          type="button"
          onClick={triggerFileInput}
          disabled={uploading}
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full",
            "bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity",
            "cursor-pointer disabled:cursor-not-allowed"
          )}
        >
          <Camera className="h-6 w-6 text-white" />
        </button>

        {/* Remove button */}
        {hasAvatar && !required && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Upload button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={triggerFileInput}
        disabled={uploading}
        className="gap-2"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            {hasAvatar ? "Alterar Foto" : "Adicionar Foto"}
          </>
        )}
      </Button>

      {required && !hasAvatar && (
        <p className="text-xs text-red-500">* Foto obrigatória</p>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
