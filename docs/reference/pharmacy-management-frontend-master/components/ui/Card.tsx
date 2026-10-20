import { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
};

export default function Card({
  children,
  className = "",
  padding = "md",
}: CardProps) {
  const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
  };

  return (
    <section
      className={`
        w-full
        rounded-2xl
        border
        border-border-light
        bg-surface
        shadow-sm
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      {children}
    </section>
  );
}
