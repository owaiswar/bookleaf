import React from 'react';
import { TicketPriority } from '../types/index.js';
import { AlertCircle, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

interface PriorityBadgeProps {
  priority: TicketPriority;
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, showIcon = true }) => {
  const normalized = (priority || 'medium').toLowerCase() as TicketPriority;

  const config: Record<
    TicketPriority,
    { bg: string; text: string; border: string; label: string; icon: React.ReactNode }
  > = {
    critical: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-300 font-semibold',
      label: 'Critical',
      icon: <AlertCircle className="w-3.5 h-3.5 text-red-600" />
    },
    high: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      label: 'High',
      icon: <ArrowUp className="w-3.5 h-3.5 text-orange-600" />
    },
    medium: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      label: 'Medium',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
    },
    low: {
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      border: 'border-slate-200',
      label: 'Low',
      icon: <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
    }
  };

  const item = config[normalized] || config.medium;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${item.bg} ${item.text} ${item.border}`}
    >
      {showIcon && item.icon}
      {item.label}
    </span>
  );
};
