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
    className: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-500/30',
  },
  assigned: {
    label: 'Atribuída',
    className: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-sm shadow-purple-500/30',
  },
  in_progress: {
    label: 'Em Andamento',
    className: 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-sm shadow-cyan-500/30',
  },
  completed: {
    label: 'Concluída',
    className: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm shadow-green-500/30',
  },
  cancelled: {
    label: 'Cancelada',
    className: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm shadow-red-500/30',
  },
};

const assignmentStatusConfig: Record<AssignmentStatus, StatusConfig> = {
  pending: {
    label: 'Pendente',
    className: 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm shadow-amber-400/30',
  },
  confirmed: {
    label: 'Confirmado',
    className: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-500/30',
  },
  completed: {
    label: 'Concluído',
    className: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm shadow-green-500/30',
  },
  no_show: {
    label: 'Faltou',
    className: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm shadow-red-500/30',
  },
};

const workRecordStatusConfig: Record<WorkRecordStatus, StatusConfig> = {
  pending: {
    label: 'Pendente',
    className: 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm shadow-amber-400/30',
  },
  in_progress: {
    label: 'Em Andamento',
    className: 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-sm shadow-cyan-500/30',
  },
  completed: {
    label: 'Concluído',
    className: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm shadow-green-500/30',
  },
  absent: {
    label: 'Ausente',
    className: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm shadow-red-500/30',
  },
};

const applicationStatusConfig: Record<ApplicationStatus, StatusConfig> = {
  pending: {
    label: 'Pendente',
    className: 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm shadow-amber-400/30',
  },
  approved: {
    label: 'Aprovado',
    className: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm shadow-green-500/30',
  },
  rejected: {
    label: 'Rejeitado',
    className: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm shadow-red-500/30',
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
