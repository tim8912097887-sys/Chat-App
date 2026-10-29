import type { ButtonHTMLAttributes } from "react";

type ButtonSize = "sm" | "md" | "lg";

type ButtonVariant = "primary" | "secondary" | "success" | "danger" | "outline";

type ButtonShape = "rounded" | "pill";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize;
  variant?: ButtonVariant;
  shape?: ButtonShape;
  fullWidth?: boolean;
  loading?: boolean;
  unstyled?: boolean;
}

const shapeClasses: Record<ButtonShape, string> = {
  rounded: "rounded-lg",
  pill: "rounded-full",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-600",
  secondary:
    "bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-500",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
  outline:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-indigo-600",
};

export function Button({
  size = "md",
  variant = "primary",
  fullWidth = false,
  loading = false,
  unstyled = false,
  disabled,
  shape = "rounded",
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        "relative inline-flex items-center justify-center gap-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "motion-reduce:transition-none",
        unstyled
          ? ""
          : [
              "font-semibold",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-offset-2 focus-visible:ring-offset-white",
              sizeClasses[size],
              variantClasses[variant],
              shapeClasses[shape],
              fullWidth ? "w-full" : "",
            ].join(" "),
        className,
      ].join(" ")}
      {...props}
    >
      {isDisabled && (
        <svg
          className="absolute size-4 animate-spin motion-reduce:animate-none"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeWidth="3"
          />
          <path
            d="M21 12a9 9 0 0 0-9-9"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      )}

      {children}
    </button>
  );
}
