import { ReactNode } from "react";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

export default function Badge({
  children,
  variant = "neutral",
  className = "",
}: BadgeProps) {
  const variantClasses: Record<BadgeVariant, string> = {
    success: `
      bg-success-soft
      text-success
    `,

    warning: `
      bg-warning-soft
      text-warning
    `,

    danger: `
      bg-danger-soft
      text-danger
    `,

    info: `
      bg-info-soft
      text-info
    `,

    neutral: `
      bg-surface-muted
      text-text-secondary
    `,
  };

  return (
    <span
      className={`
        inline-flex
        min-h-6
        items-center
        justify-center
        rounded-full
        px-2.5
        py-1
        text-[11px]
        font-bold
        leading-none
        whitespace-nowrap
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
