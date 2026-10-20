import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const variantClasses: Record<ButtonVariant, string> = {
    primary: `
      bg-primary
      text-white
      shadow-sm
      hover:bg-primary-dark
      hover:shadow-md
      active:translate-y-px
    `,

    secondary: `
      border
      border-border
      bg-surface
      text-text-primary
      shadow-sm
      hover:bg-surface-muted
      hover:border-primary/20
      active:translate-y-px
    `,

    danger: `
      bg-danger
      text-white
      shadow-sm
      hover:bg-red-700
      hover:shadow-md
      active:translate-y-px
    `,

    ghost: `
      bg-transparent
      text-text-secondary
      hover:bg-surface-muted
      hover:text-text-primary
    `,
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: `
      min-h-9
      rounded-lg
      px-3
      py-2
      text-xs
    `,

    md: `
      min-h-10
      rounded-xl
      px-4
      py-2.5
      text-sm
    `,

    lg: `
      min-h-11
      rounded-xl
      px-5
      py-3
      text-sm
    `,
  };

  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      className={`
        inline-flex
        items-center
        justify-center
        gap-2
        whitespace-nowrap
        font-semibold
        leading-none
        transition-all
        duration-200
        ease-out

        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-primary
        focus-visible:ring-offset-2

        disabled:pointer-events-none
        disabled:cursor-not-allowed
        disabled:opacity-50

        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
