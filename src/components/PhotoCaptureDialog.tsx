import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, AlertCircle } from "lucide-react";

interface PhotoCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (photoData: string) => void;
  title: string;
  description: string;
}

type CaptureState = 'loading' | 'preview' | 'captured' | 'error';

export function PhotoCaptureDialog({ open, onOpenChange, onSubmit, title, description }: PhotoCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [captureState, setCaptureState] = useState<CaptureState>('loading');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setCaptureState('loading');
      setCapturedImage(null);
    }
    return () => stopCamera();
  }, [open]);

  async function startCamera() {
    setCaptureState('loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCaptureState('preview');
    } catch (err: any) {
      console.error('Camera error:', err);
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Permissão de câmera negada. Autorize o acesso nas configurações do navegador.'
          : 'Câmera não disponível. Verifique se outro aplicativo está usando a câmera.'
      );
      setCaptureState('error');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const MAX_WIDTH = 1280;
    let width = video.videoWidth || 640;
    let height = video.videoHeight || 480;
    if (width > MAX_WIDTH) {
      height = Math.round((height * MAX_WIDTH) / width);
      width = MAX_WIDTH;
    }
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    // Watermark: date + time
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const watermark = `${dateStr}  ${timeStr}`;

    const fontSize = Math.max(14, Math.round(width * 0.03));
    const padding = 10;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    const textWidth = ctx.measureText(watermark).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(
      width - textWidth - padding * 2 - 6,
      height - fontSize - padding * 2,
      textWidth + padding * 2,
      fontSize + padding * 2
    );
    ctx.fillStyle = 'white';
    ctx.fillText(watermark, width - padding - 6, height - padding);

    const imageData = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(imageData);
    setCaptureState('captured');
    stopCamera();
  }

  function retakePhoto() {
    setCapturedImage(null);
    startCamera();
  }

  function handleSubmit() {
    if (capturedImage) {
      onSubmit(capturedImage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Live camera preview */}
          {(captureState === 'loading' || captureState === 'preview') && (
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
              {captureState === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                  <span className="ml-3 text-white text-sm">Abrindo câmera...</span>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Captured image */}
          {captureState === 'captured' && capturedImage && (
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <img src={capturedImage} alt="Foto capturada" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Error state */}
          {captureState === 'error' && (
            <div className="flex flex-col items-center gap-3 p-6 bg-red-50 rounded-lg text-center">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}

          {/* Hidden canvas for photo processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          {captureState === 'preview' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={capturePhoto} className="gap-2">
                <Camera className="h-4 w-4" />
                Tirar Foto
              </Button>
            </>
          )}

          {captureState === 'captured' && (
            <>
              <Button variant="outline" onClick={retakePhoto} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Repetir
              </Button>
              <Button onClick={handleSubmit}>Confirmar</Button>
            </>
          )}

          {captureState === 'error' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button onClick={startCamera}>Tentar novamente</Button>
            </>
          )}

          {captureState === 'loading' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
