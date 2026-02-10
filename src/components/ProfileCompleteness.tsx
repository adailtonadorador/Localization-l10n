import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface ProfileField {
  key: string;
  label: string;
  category: 'basic' | 'contact' | 'address' | 'professional';
  required?: boolean;
}

const PROFILE_FIELDS: ProfileField[] = [
  { key: 'name', label: 'Nome completo', category: 'basic', required: true },
  { key: 'avatar_url', label: 'Foto de perfil', category: 'basic' },
  { key: 'phone', label: 'Telefone', category: 'contact', required: true },
  { key: 'cpf', label: 'CPF', category: 'basic', required: true },
  { key: 'pix_key', label: 'Chave PIX', category: 'professional', required: true },
  { key: 'skills', label: 'Habilidades', category: 'professional', required: true },
  { key: 'cep', label: 'CEP', category: 'address' },
  { key: 'logradouro', label: 'Endereço', category: 'address' },
  { key: 'numero', label: 'Número', category: 'address' },
  { key: 'bairro', label: 'Bairro', category: 'address' },
  { key: 'cidade', label: 'Cidade', category: 'address' },
  { key: 'uf', label: 'Estado', category: 'address' },
];

interface ProfileData {
  name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  cpf?: string | null;
  skills?: string[] | null;
  pix_key?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}

interface ProfileCompletenessProps {
  profile: ProfileData | null;
  workerProfile: ProfileData | null;
  variant?: 'full' | 'compact' | 'mini';
  showEditButton?: boolean;
  className?: string;
}

function isFieldComplete(data: ProfileData, key: string): boolean {
  const value = data[key as keyof ProfileData];
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return !!value && value.toString().trim() !== '';
}

export function ProfileCompleteness({
  profile,
  workerProfile,
  variant = 'full',
  showEditButton = true,
  className,
}: ProfileCompletenessProps) {
  const { completedFields, percentage, missingRequired, missingOptional } = useMemo(() => {
    const mergedData: ProfileData = {
      ...profile,
      ...workerProfile,
    };

    const completed = PROFILE_FIELDS.filter(field => isFieldComplete(mergedData, field.key));
    const missing = PROFILE_FIELDS.filter(field => !isFieldComplete(mergedData, field.key));
    const missingReq = missing.filter(f => f.required);
    const missingOpt = missing.filter(f => !f.required);
    const pct = Math.round((completed.length / PROFILE_FIELDS.length) * 100);

    return {
      completedFields: completed,
      percentage: pct,
      missingRequired: missingReq,
      missingOptional: missingOpt,
    };
  }, [profile, workerProfile]);

  const isComplete = percentage === 100;
  const hasRequiredMissing = missingRequired.length > 0;

  // Mini variant - just the percentage badge
  if (variant === 'mini') {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          isComplete
            ? "bg-emerald-100 text-emerald-700"
            : hasRequiredMissing
            ? "bg-amber-100 text-amber-700"
            : "bg-blue-100 text-blue-700",
          className
        )}
      >
        {isComplete ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <AlertCircle className="h-3.5 w-3.5" />
        )}
        {percentage}% completo
      </div>
    );
  }

  // Compact variant - progress bar with percentage
  if (variant === 'compact') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Perfil</span>
          <span
            className={cn(
              "font-medium",
              isComplete
                ? "text-emerald-600"
                : hasRequiredMissing
                ? "text-amber-600"
                : "text-blue-600"
            )}
          >
            {percentage}% completo
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500 rounded-full",
              isComplete
                ? "bg-emerald-500"
                : hasRequiredMissing
                ? "bg-amber-500"
                : "bg-blue-500"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {hasRequiredMissing && (
          <p className="text-xs text-amber-600">
            {missingRequired.length} campo(s) obrigatório(s) faltando
          </p>
        )}
      </div>
    );
  }

  // Full variant - detailed view with all fields
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Completude do Perfil</h3>
          <span
            className={cn(
              "text-2xl font-bold",
              isComplete
                ? "text-emerald-600"
                : hasRequiredMissing
                ? "text-amber-600"
                : "text-blue-600"
            )}
          >
            {percentage}%
          </span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500 rounded-full",
              isComplete
                ? "bg-emerald-500"
                : hasRequiredMissing
                ? "bg-amber-500"
                : "bg-blue-500"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Status message */}
      {isComplete ? (
        <div className="p-4 bg-emerald-50 border-b border-emerald-100">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Perfil completo!</span>
          </div>
          <p className="text-sm text-emerald-600 mt-1">
            Seu perfil está 100% preenchido. Você está pronto para se candidatar a vagas.
          </p>
        </div>
      ) : hasRequiredMissing ? (
        <div className="p-4 bg-amber-50 border-b border-amber-100">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Complete seu perfil</span>
          </div>
          <p className="text-sm text-amber-600 mt-1">
            Preencha os campos obrigatórios para poder se candidatar a vagas.
          </p>
        </div>
      ) : null}

      {/* Missing fields */}
      {!isComplete && (
        <div className="p-4">
          {missingRequired.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                Campos obrigatórios
              </h4>
              <div className="space-y-1.5">
                {missingRequired.map(field => (
                  <div
                    key={field.key}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <Circle className="h-4 w-4 text-amber-400" />
                    {field.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {missingOptional.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-slate-300 rounded-full" />
                Campos opcionais
              </h4>
              <div className="space-y-1.5">
                {missingOptional.map(field => (
                  <div
                    key={field.key}
                    className="flex items-center gap-2 text-sm text-slate-500"
                  >
                    <Circle className="h-4 w-4 text-slate-300" />
                    {field.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed fields (collapsed) */}
          {completedFields.length > 0 && (
            <details className="mt-4">
              <summary className="text-sm font-medium text-slate-500 cursor-pointer hover:text-slate-700">
                Ver campos preenchidos ({completedFields.length})
              </summary>
              <div className="mt-2 space-y-1.5">
                {completedFields.map(field => (
                  <div
                    key={field.key}
                    className="flex items-center gap-2 text-sm text-slate-500"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {field.label}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Edit button */}
      {showEditButton && !isComplete && (
        <div className="p-4 pt-0">
          <Link to="/worker/profile">
            <Button className="w-full" variant={hasRequiredMissing ? "default" : "outline"}>
              Completar Perfil
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

// Hook to get profile completeness data
export function useProfileCompleteness(profile: ProfileData | null, workerProfile: ProfileData | null) {
  return useMemo(() => {
    const mergedData: ProfileData = {
      ...profile,
      ...workerProfile,
    };

    const completed = PROFILE_FIELDS.filter(field => isFieldComplete(mergedData, field.key));
    const missing = PROFILE_FIELDS.filter(field => !isFieldComplete(mergedData, field.key));
    const missingReq = missing.filter(f => f.required);
    const pct = Math.round((completed.length / PROFILE_FIELDS.length) * 100);

    return {
      percentage: pct,
      isComplete: pct === 100,
      hasRequiredMissing: missingReq.length > 0,
      completedCount: completed.length,
      totalCount: PROFILE_FIELDS.length,
      missingRequiredCount: missingReq.length,
    };
  }, [profile, workerProfile]);
}
