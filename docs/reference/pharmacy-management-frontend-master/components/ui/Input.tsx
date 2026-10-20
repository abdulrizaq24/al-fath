import { InputHTMLAttributes, ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helperText?: string;
  startContent?: ReactNode;
  endContent?: ReactNode;
};

export default function Input({
  label,
  error,
  helperText,
  startContent,
  endContent,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId =
    id || props.name || `input-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
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
              -translate-y-1/2
              text-text-muted
            "
          >
            {startContent}
          </div>
        )}

        <input
          {...props}
          id={inputId}
          className={`
            w-full
            min-h-10
            rounded-xl
            border
            bg-surface
            px-3.5
            py-2.5
            text-sm
            text-text-primary
            outline-none
            transition-all
            duration-200

            placeholder:text-text-muted

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

            ${endContent ? "pe-10" : ""}

            ${className}
          `}
        />

        {endContent && (
          <div
            className="
              pointer-events-none
              absolute
              end-3.5
              top-1/2
              -translate-y-1/2
              text-text-muted
            "
          >
            {endContent}
          </div>
        )}
      </div>

      {error ? (
        <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-text-muted">{helperText}</p>
      ) : null}
    </div>
  );
}
