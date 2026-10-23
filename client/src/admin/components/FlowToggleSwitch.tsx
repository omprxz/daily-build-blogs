import React from 'react';

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
      className={`inline-flex items-center gap-2 cursor-pointer select-none focus:outline-none transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      title={checked ? `Flow is active (${activeLabel})` : `Flow is paused (${inactiveLabel})`}
    >
      <div
        className={`relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out shrink-0 ${
          size === 'sm' ? 'w-8 h-4.5 p-0.5' : 'w-11 h-6 p-0.5'
        } ${
          checked
            ? 'bg-emerald-600 hover:bg-emerald-500'
            : 'bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-500'
        }`}
      >
        <span
          className={`inline-block rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out shrink-0 ${
            size === 'sm'
              ? `w-3.5 h-3.5 ${checked ? 'translate-x-3.5' : 'translate-x-0'}`
              : `w-5 h-5 ${checked ? 'translate-x-5' : 'translate-x-0'}`
          }`}
        />
      </div>
      <span
        className={`font-bold transition-colors select-none ${
          size === 'sm' ? 'text-[11px]' : 'text-xs'
        } ${
          checked
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400'
        }`}
      >
        {checked ? activeLabel : inactiveLabel}
      </span>
    </button>
  );
};
