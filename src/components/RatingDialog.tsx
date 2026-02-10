import { useState } from "react";
import { toast } from "sonner";
import { supabaseUntyped } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star, Loader2 } from "lucide-react";

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  workerId: string;
  workerName: string;
  jobTitle?: string;
  currentRating?: number | null;
  currentFeedback?: string | null;
  onSuccess?: () => void;
}

export function RatingDialog({
  open,
  onOpenChange,
  assignmentId,
  workerId,
  workerName,
  jobTitle,
  currentRating,
  currentFeedback,
  onSuccess,
}: RatingDialogProps) {
  const [rating, setRating] = useState(currentRating || 5);
  const [feedback, setFeedback] = useState(currentFeedback || "");
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const ratingLabels: Record<number, string> = {
    1: "Muito ruim",
    2: "Ruim",
    3: "Regular",
    4: "Bom",
    5: "Excelente",
  };

  async function handleSubmit() {
    setLoading(true);
    try {
      // Update the assignment rating
      const { error: assignmentError } = await supabaseUntyped
        .from("job_assignments")
        .update({ rating, feedback: feedback.trim() || null })
        .eq("id", assignmentId);

      if (assignmentError) throw assignmentError;

      // Calculate and update worker's average rating
      const { data: allRatings } = await supabaseUntyped
        .from("job_assignments")
        .select("rating")
        .eq("worker_id", workerId)
        .not("rating", "is", null);

      if (allRatings && allRatings.length > 0) {
        const totalRating = allRatings.reduce((sum: number, r: { rating: number | null }) => sum + (r.rating || 0), 0);
        const avgRating = totalRating / allRatings.length;

        await supabaseUntyped
          .from("workers")
          .update({ rating: Math.round(avgRating * 100) / 100 })
          .eq("id", workerId);
      }

      toast.success("Avaliação enviada com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Erro ao enviar avaliação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const displayRating = hoveredStar ?? rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Avaliar Trabalhador</DialogTitle>
          <DialogDescription>
            {jobTitle ? (
              <>Avalie o desempenho de <strong>{workerName}</strong> em <strong>{jobTitle}</strong></>
            ) : (
              <>Avalie o desempenho de <strong>{workerName}</strong></>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-3">
            <Label>Nota</Label>
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(null)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded"
                    disabled={loading}
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        star <= displayRating
                          ? "text-amber-400 fill-amber-400"
                          : "text-slate-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-sm font-medium text-slate-600">
                {ratingLabels[displayRating]}
              </span>
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-2">
            <Label htmlFor="feedback">Feedback (opcional)</Label>
            <Textarea
              id="feedback"
              placeholder="Descreva como foi o desempenho do trabalhador..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              disabled={loading}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              O feedback ajuda o trabalhador a melhorar e outros clientes a tomar decisões.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                Enviar Avaliação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Compact inline rating display with edit button
interface RatingDisplayProps {
  rating: number | null;
  feedback?: string | null;
  onEdit?: () => void;
  showEditButton?: boolean;
  size?: "sm" | "md";
}

export function RatingDisplay({
  rating,
  feedback,
  onEdit,
  showEditButton = true,
  size = "md",
}: RatingDisplayProps) {
  if (!rating) {
    return showEditButton && onEdit ? (
      <Button size="sm" variant="outline" onClick={onEdit} className="gap-1">
        <Star className="h-4 w-4" />
        Avaliar
      </Button>
    ) : (
      <span className="text-sm text-muted-foreground">Não avaliado</span>
    );
  }

  const starSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`${starSize} ${
                star <= rating
                  ? "text-amber-400 fill-amber-400"
                  : "text-slate-200"
              }`}
            />
          ))}
        </div>
        {showEditButton && onEdit && (
          <Button size="sm" variant="ghost" onClick={onEdit} className="h-6 px-2 text-xs">
            Editar
          </Button>
        )}
      </div>
      {feedback && (
        <p className="text-xs text-muted-foreground italic">"{feedback}"</p>
      )}
    </div>
  );
}
