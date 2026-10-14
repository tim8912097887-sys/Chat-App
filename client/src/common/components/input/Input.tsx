import type { InputHTMLAttributes, HTMLInputTypeAttribute } from "react";

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "name" | "type"
> {
  id: string;
  name: string;
  type: HTMLInputTypeAttribute;
}

export function Input({
  id,
  name,
  type,
  className = "",
  ...props
}: InputProps) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      className={[
        "block w-full min-w-0 rounded-lg border border-slate-300",
        "bg-white px-3.5 py-2.5 text-sm text-slate-900",
        "placeholder:text-slate-400",
        "transition-colors duration-150",
        "hover:border-slate-400",
        "focus-visible:border-indigo-600",
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-indigo-600/20",
        "disabled:cursor-not-allowed disabled:bg-slate-100",
        "disabled:text-slate-500 disabled:opacity-80",
        "aria-invalid:border-red-500",
        "aria-invalid:focus-visible:ring-red-500/20",
        "file:mr-3 file:rounded-md file:border-0",
        "file:bg-slate-100 file:px-3 file:py-1.5",
        "file:text-sm file:font-medium file:text-slate-700",
        "file:hover:bg-slate-200",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
