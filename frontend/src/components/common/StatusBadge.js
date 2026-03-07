import React from 'react';
import { cn } from '../../lib/utils';

const STATUS_CONFIG = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-800' },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
  expired: { label: 'Expired', className: 'bg-red-100 text-red-800' },
  inactive: { label: 'Inactive', className: 'bg-slate-100 text-slate-800' },
  on_leave: { label: 'On Leave', className: 'bg-orange-100 text-orange-800' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
  checked: { label: 'Checked', className: 'bg-blue-100 text-blue-800' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-800' },
};

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className
      )}
      data-testid={`status-badge-${status}`}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;
