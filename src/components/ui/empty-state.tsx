import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Briefcase, Users, FileText, Calendar } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
  children?: ReactNode;
  variant?: 'default' | 'compact' | 'card';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  children,
  variant = 'default',
}: EmptyStateProps) {
  const isCompact = variant === 'compact';
  const isCard = variant === 'card';

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        isCompact ? "py-6" : "py-12",
        isCard && "bg-slate-50/50 rounded-xl border border-dashed border-slate-200",
        className
      )}
    >
      <div
        className={cn(
          "rounded-full flex items-center justify-center mb-4",
          isCompact
            ? "w-10 h-10 bg-slate-100"
            : "w-14 h-14 bg-slate-100"
        )}
      >
        <Icon
          className={cn(
            "text-slate-400",
            isCompact ? "h-5 w-5" : "h-7 w-7"
          )}
        />
      </div>

      <h3
        className={cn(
          "font-semibold text-slate-900",
          isCompact ? "text-sm" : "text-base"
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            "text-muted-foreground mt-1 max-w-sm",
            isCompact ? "text-xs" : "text-sm"
          )}
        >
          {description}
        </p>
      )}

      {children}

      {(action || secondaryAction) && (
        <div className={cn("flex gap-3 mt-4", isCompact && "mt-3")}>
          {action && (
            action.href ? (
              <a href={action.href}>
                <Button size={isCompact ? "sm" : "default"}>
                  {action.label}
                </Button>
              </a>
            ) : (
              <Button size={isCompact ? "sm" : "default"} onClick={action.onClick}>
                {action.label}
              </Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <a href={secondaryAction.href}>
                <Button variant="outline" size={isCompact ? "sm" : "default"}>
                  {secondaryAction.label}
                </Button>
              </a>
            ) : (
              <Button variant="outline" size={isCompact ? "sm" : "default"} onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// Pre-built empty states for common use cases
export function NoJobsFound({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <EmptyState
      icon={Briefcase}
      title="Nenhuma vaga encontrada"
      description="Tente ajustar seus filtros ou buscar por outros termos"
      action={onClearFilters ? { label: "Limpar filtros", onClick: onClearFilters } : undefined}
      variant="card"
    />
  );
}

export function NoWorkersFound({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="Nenhum trabalhador encontrado"
      description="Tente ajustar seus filtros de busca"
      action={onClearFilters ? { label: "Limpar filtros", onClick: onClearFilters } : undefined}
      variant="card"
    />
  );
}

export function NoApplications() {
  return (
    <EmptyState
      icon={FileText}
      title="Nenhuma candidatura"
      description="Você ainda não se candidatou a nenhuma vaga"
      action={{ label: "Buscar vagas", href: "/worker/jobs" }}
      variant="card"
    />
  );
}

export function NoUpcomingJobs() {
  return (
    <EmptyState
      icon={Calendar}
      title="Nenhum trabalho agendado"
      description="Você não tem trabalhos confirmados para os próximos dias"
      action={{ label: "Buscar vagas", href: "/worker/jobs" }}
      variant="compact"
    />
  );
}
