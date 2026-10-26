import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils.js';

interface FlowToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  size?: 'sm' | 'md';
}

export const FlowToggleSwitch: React.FC<FlowToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  activeLabel = 'Active',
  inactiveLabel = 'Paused',
  size = 'md',
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 cursor-pointer select-none focus:outline-none transition-all",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      title={checked ? `Flow is active (${activeLabel})` : `Flow is paused (${inactiveLabel})`}
    >
      <div
        className={cn(
          "relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out shrink-0",
          size === 'sm' ? 'w-8 h-4.5 p-0.5' : 'w-11 h-6 p-0.5',
          checked
            ? 'bg-emerald-600 dark:bg-emerald-500'
            : 'bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-500'
        )}
      >
        <motion.span
          className={cn(
            "rounded-full bg-white shadow-xs shrink-0 block",
            size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'
          )}
          animate={{
            x: checked ? (size === 'sm' ? 14 : 20) : 0,
          }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 500, damping: 30 }
          }
        />
      </div>
      <span
        className={cn(
          "font-bold transition-colors select-none",
          size === 'sm' ? 'text-[11px]' : 'text-xs',
          checked
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400'
        )}
      >
        {checked ? activeLabel : inactiveLabel}
      </span>
    </button>
  );
};

export default FlowToggleSwitch;
