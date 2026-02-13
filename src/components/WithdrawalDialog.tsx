import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => void;
  jobTitle: string;
}

export function WithdrawalDialog({ open, onOpenChange, onSubmit, jobTitle }: WithdrawalDialogProps) {
  const [reason, setReason] = useState("");

  function handleSubmit() {
    if (reason.trim().length < 10) {
      return;
    }
    onSubmit(reason.trim());
    setReason("");
  }

  function handleCancel() {
    setReason("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>Desistir da Diária</DialogTitle>
              <DialogDescription className="mt-1">
                Você está prestes a desistir da vaga: <strong>{jobTitle}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Motivo da desistência *
            </Label>
            <Textarea
              id="reason"
              placeholder="Por favor, informe o motivo da sua desistência (mínimo 10 caracteres)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {reason.length} / 10 caracteres mínimos
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              Ao desistir, a vaga ficará disponível novamente para outros trabalhadores.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={reason.trim().length < 10}
          >
            Confirmar Desistência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
