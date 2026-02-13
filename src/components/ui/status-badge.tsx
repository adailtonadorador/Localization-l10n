import { cn } from "@/lib/utils";

// Job Status Types
export type JobStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

// Assignment Status Types
export type AssignmentStatus = 'pending' | 'confirmed' | 'completed' | 'no_show';

// Work Record Status Types
export type WorkRecordStatus = 'pending' | 'in_progress' | 'completed' | 'absent';

// Application Status Types
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

// Combined status type
export type StatusType = JobStatus | AssignmentStatus | WorkRecordStatus | ApplicationStatus;

interface StatusConfig {
  label: string;
  className: string;
}

const jobStatusConfig: Record<JobStatus, StatusConfig> = {
  open: {
    label: 'Aberta',
    className: 'bg-blue-500 text-white',
  },
  assigned: {
    label: 'Atribuída',
    className: 'bg-purple-500 text-white',
  },
  in_progress: {
    label: 'Em Andamento',
    className: 'bg-blue-500 text-white',
  },
  completed: {
    label: 'Concluída',
    className: 'bg-slate-500 text-white',
  },
  cancelled: {
    label: 'Cancelada',
    className: 'bg-red-500 text-white',
  },
};

const assignmentStatusConfig: Record<AssignmentStatus, StatusConfig> = {
  pending: {
    label: 'Pendente',
    className: 'bg-amber-500 text-white',
  },
  confirmed: {
    label: 'Confirmado',
    className: 'bg-blue-500 text-white',
  },
  completed: {
    label: 'Concluído',
    className: 'bg-slate-500 text-white',
  },
  no_show: {
    label: 'Faltou',
    className: 'bg-red-500 text-white',
  },
};

const workRecordStatusConfig: Record<WorkRecordStatus, StatusConfig> = {
  pending: {
    label: 'Pendente',
    className: 'bg-amber-500 text-white',
  },
  in_progress: {
    label: 'Em Andamento',
    className: 'bg-blue-500 text-white',
  },
  completed: {
    label: 'Concluído',
    className: 'bg-blue-500 text-white',
  },
  absent: {
    label: 'Ausente',
    className: 'bg-red-500 text-white',
  },
};

const applicationStatusConfig: Record<ApplicationStatus, StatusConfig> = {
  pending: {
    label: 'Pendente',
    className: 'bg-amber-500 text-white',
  },
  approved: {
    label: 'Aprovado',
    className: 'bg-blue-500 text-white',
  },
  rejected: {
    label: 'Rejeitado',
    className: 'bg-red-500 text-white',
  },
};

type StatusBadgeType = 'job' | 'assignment' | 'workRecord' | 'application';

interface StatusBadgeProps {
  status: string;
  type?: StatusBadgeType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

function getStatusConfig(status: string, type: StatusBadgeType): StatusConfig {
  switch (type) {
    case 'job':
      return jobStatusConfig[status as JobStatus] || { label: status, className: 'bg-gray-500 text-white' };
    case 'assignment':
      return assignmentStatusConfig[status as AssignmentStatus] || { label: status, className: 'bg-gray-500 text-white' };
    case 'workRecord':
      return workRecordStatusConfig[status as WorkRecordStatus] || { label: status, className: 'bg-gray-500 text-white' };
    case 'application':
      return applicationStatusConfig[status as ApplicationStatus] || { label: status, className: 'bg-gray-500 text-white' };
    default:
      return { label: status, className: 'bg-gray-500 text-white' };
  }
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

export function StatusBadge({ status, type = 'job', className, size = 'md' }: StatusBadgeProps) {
  const config = getStatusConfig(status, type);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold',
        sizeClasses[size],
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

// Export configs for use elsewhere if needed
export { jobStatusConfig, assignmentStatusConfig, workRecordStatusConfig, applicationStatusConfig };
