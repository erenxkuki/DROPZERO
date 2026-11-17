import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  id,
}: SwitchProps) {
  const autoId = React.useId();
  const controlId = id || autoId;

  return (
    <div className="flex items-start justify-between gap-4">
      {(label || description) && (
        <div className="flex flex-col gap-0.5">
          {label && (
            <label
              htmlFor={controlId}
              className="text-sm font-medium text-[#111111] dark:text-[#F5F5F5] cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-[#666666] dark:text-[#929292] leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}
      <button
        id={controlId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-150',
          'disabled:opacity-45 disabled:cursor-not-allowed',
          checked
            ? 'bg-[#111111] dark:bg-[#F5F5F5] border-transparent'
            : 'bg-[#E5E5E5] dark:bg-[#252525] border-[#D4D4D4] dark:border-[#333333]'
        )}
      >
        <span
          className={cn(
            'pointer-events-none block h-4 w-4 rounded-full transition-transform duration-150',
            checked
              ? 'translate-x-6 bg-[#FAFAFA] dark:bg-[#080808]'
              : 'translate-x-1 bg-[#FFFFFF] dark:bg-[#929292]'
          )}
        />
      </button>
    </div>
  );
}

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  id,
}: CheckboxProps) {
  const autoId = React.useId();
  const controlId = id || autoId;

  return (
    <label
      htmlFor={controlId}
      className={cn(
        'inline-flex items-center gap-2.5 text-sm text-[#111111] dark:text-[#F5F5F5] select-none',
        disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'
      )}
    >
      <button
        id={controlId}
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors duration-150 shrink-0',
          checked
            ? 'bg-[#111111] dark:bg-[#F5F5F5] border-transparent text-[#FAFAFA] dark:text-[#080808]'
            : 'bg-[#FFFFFF] dark:bg-[#101010] border-[#D4D4D4] dark:border-[#333333]'
        )}
      >
        {checked && <Check className="h-3 w-3 stroke-[2.5]" aria-hidden="true" />}
      </button>
      {label && <span>{label}</span>}
    </label>
  );
}
