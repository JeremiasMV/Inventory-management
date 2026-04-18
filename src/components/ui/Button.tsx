import type { ButtonHTMLAttributes, ReactNode } from "react"

type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "ghost"
  | "outline"

type ButtonSize = "sm" | "md" | "lg" | "icon"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500",
  secondary:
    "bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-200 disabled:text-emerald-500",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-200 disabled:text-rose-500",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 disabled:text-slate-400",
  outline:
    "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200",
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-sm",
  icon: "h-9 w-9 p-0",
}

export default function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-150 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  )
}
