"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
};

export default function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  required = false,
  error,
  helperText,
  className = "",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return options;
    }

    return options.filter((option) =>
      option.label.toLowerCase().includes(query),
    );
  }, [options, search]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  function handleSelect(option: SearchableSelectOption) {
    onChange(option.value);
    setOpen(false);
    setSearch("");
  }

  const selectId = `searchable-select-${
    label?.toLowerCase().replace(/\s+/g, "-") || "field"
  }`;

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
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

          {required && <span className="ms-1 text-danger">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Select button */}

        <button
          id={selectId}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setOpen((current) => !current);
            }
          }}
          className={`
            flex
            min-h-10
            w-full
            items-center
            justify-between
            rounded-xl
            border
            bg-surface
            px-3.5
            py-2.5
            text-start
            text-sm
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
          `}
        >
          <span
            className={
              selectedOption
                ? "truncate text-text-primary"
                : "truncate text-text-muted"
            }
          >
            {selectedOption?.label ?? placeholder}
          </span>

          <span
            aria-hidden="true"
            className="
              ms-3
              shrink-0
              text-[10px]
              text-text-muted
            "
          >
            {open ? "▲" : "▼"}
          </span>
        </button>

        {/* Dropdown */}

        {open && (
          <div
            className="
              absolute
              start-0
              end-0
              z-50
              mt-2
              overflow-hidden
              rounded-xl
              border
              border-border
              bg-surface
              shadow-lg
            "
          >
            {/* Search input */}

            <div
              className="
                border-b
                border-border-light
                p-2
              "
            >
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute
                    start-3
                    top-1/2
                    -translate-y-1/2
                    text-sm
                    text-text-muted
                  "
                >
                  🔍
                </span>

                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="
                    min-h-9
                    w-full
                    rounded-lg
                    border
                    border-border
                    bg-surface-muted
                    ps-9
                    pe-3
                    text-sm
                    text-text-primary
                    outline-none
                    placeholder:text-text-muted
                    focus:border-primary
                    focus:ring-2
                    focus:ring-primary/10
                  "
                />
              </div>
            </div>

            {/* Options */}

            <div
              className="
                max-h-64
                overflow-y-auto
                p-1
              "
            >
              {/* Clear selection */}

              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setSearch("");
                }}
                className={`
                  flex
                  w-full
                  items-center
                  rounded-lg
                  px-3
                  py-2.5
                  text-start
                  text-sm
                  transition
                  hover:bg-surface-muted
                  ${
                    value === ""
                      ? "bg-primary-soft font-semibold text-primary"
                      : "text-text-muted"
                  }
                `}
              >
                {placeholder}
              </button>

              {/* Search results */}

              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const selected = option.value === value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={`
                        flex
                        w-full
                        items-center
                        justify-between
                        rounded-lg
                        px-3
                        py-2.5
                        text-start
                        text-sm
                        transition

                        ${
                          selected
                            ? "bg-primary-soft font-semibold text-primary"
                            : "text-text-primary hover:bg-surface-muted"
                        }
                      `}
                    >
                      <span className="truncate">{option.label}</span>

                      {selected && (
                        <span
                          className="
                            ms-3
                            shrink-0
                            text-primary
                          "
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div
                  className="
                    px-3
                    py-6
                    text-center
                    text-xs
                    text-text-muted
                  "
                >
                  No results found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error / helper */}

      {error ? (
        <p
          className="
            mt-1.5
            text-xs
            font-medium
            text-danger
          "
        >
          {error}
        </p>
      ) : helperText ? (
        <p
          className="
            mt-1.5
            text-xs
            text-text-muted
          "
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
