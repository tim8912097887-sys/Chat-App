import type { ReactNode } from "react";

interface InputContainerProps {
  id: string;
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

export function InputContainer({
  id,
  label,
  children,
  hint,
  error,
  required = false,
  className = "",
}: InputContainerProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className={["flex min-w-0 flex-col gap-1.5", className].join(" ")}>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-600" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}

      {error ? (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs leading-5 text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
