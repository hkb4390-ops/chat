import React from 'react';
import { Check } from 'lucide-react';

interface VerifiedBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ className = '', size = 'md' }) => {
  const sizeMap = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const iconSizeMap = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-blue-500 text-white shadow-sm shadow-blue-500/30 shrink-0 ${sizeMap[size]} ${className}`}
      title="Verified Official Account"
    >
      <Check className={`${iconSizeMap[size]} stroke-[3.5] text-white`} />
    </span>
  );
};
