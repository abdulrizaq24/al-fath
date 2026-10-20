import { SelectHTMLAttributes, ReactNode } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  helperText?: string;
  startContent?: ReactNode;
};

export default function Select({
  label,
  error,
  helperText,
  startContent,
  className = "",
  id,
  children,
  ...props
}: SelectProps) {
  const selectId =
    id || props.name || `select-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="
            mb-2
            block
            text-xs
            font-bold
            text-text-secondary
          "
        >
          {label}

          {props.required && <span className="ms-1 text-danger">*</span>}
        </label>
      )}

      <div className="relative">
        {startContent && (
          <div
            className="
              pointer-events-none
              absolute
              start-3.5
              top-1/2
              z-10
              -translate-y-1/2
              text-text-muted
            "
          >
            {startContent}
          </div>
        )}

        <select
          {...props}
          id={selectId}
          className={`
            w-full
            min-h-10
            appearance-none
            rounded-xl
            border
            bg-surface
            px-3.5
            py-2.5
            pe-10
            text-sm
            text-text-primary
            outline-none
            transition-all
            duration-200

            hover:border-primary/20

            focus:border-primary
            focus:bg-surface
            focus:ring-2
            focus:ring-primary/10

            disabled:cursor-not-allowed
            disabled:bg-surface-muted
            disabled:opacity-60

            ${
              error
                ? `
                  border-danger
                  focus:border-danger
                  focus:ring-danger/10
                `
                : "border-border"
            }

            ${startContent ? "ps-10" : ""}

            ${className}
          `}
        >
          {children}
        </select>

        {/* Dropdown arrow */}
        <span
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            end-3.5
            top-1/2
            -translate-y-1/2
            text-[10px]
            text-text-muted
          "
        >
          ▼
        </span>
      </div>

      {error ? (
        <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-text-muted">{helperText}</p>
      ) : null}
    </div>
  );
}
