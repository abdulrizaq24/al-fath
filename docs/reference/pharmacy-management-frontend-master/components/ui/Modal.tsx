import { ReactNode, useEffect } from "react";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: ModalSize;
  footer?: ReactNode;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "lg",
  footer,
  closeOnOverlayClick = true,
  showCloseButton = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const sizeClasses: Record<ModalSize, string> = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-6xl",
  };

  function handleOverlayClick() {
    if (closeOnOverlayClick) {
      onClose();
    }
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        overflow-y-auto
        bg-black/45
        px-4
        py-6
        backdrop-blur-[3px]
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onMouseDown={handleOverlayClick}
    >
      <div
        className={`
          flex
          max-h-[90vh]
          w-full
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-border-light
          bg-surface
          shadow-lg
          ${sizeClasses[size]}
        `}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* =====================================================
            HEADER
            ===================================================== */}

        <div
          className="
            flex
            shrink-0
            items-start
            justify-between
            gap-5
            border-b
            border-border-light
            bg-surface
            px-6
            py-5
          "
        >
          <div className="min-w-0">
            <h2
              id="modal-title"
              className="
                text-lg
                font-bold
                tracking-[-0.02em]
                text-text-primary
              "
            >
              {title}
            </h2>

            {description && (
              <p
                className="
                  mt-1.5
                  max-w-2xl
                  text-xs
                  leading-5
                  text-text-muted
                "
              >
                {description}
              </p>
            )}
          </div>

          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-transparent
                text-xl
                leading-none
                text-text-muted
                transition-all
                duration-200
                hover:border-border-light
                hover:bg-surface-muted
                hover:text-text-primary
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-primary
                focus-visible:ring-offset-2
              "
            >
              ×
            </button>
          )}
        </div>

        {/* =====================================================
            BODY
            ===================================================== */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
          "
        >
          {children}
        </div>

        {/* =====================================================
            FOOTER
            ===================================================== */}

        {footer && (
          <div
            className="
              flex
              shrink-0
              items-center
              justify-end
              border-t
              border-border-light
              bg-surface
              px-6
              py-4
            "
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
