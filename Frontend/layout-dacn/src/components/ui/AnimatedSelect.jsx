import React, { Fragment, useMemo } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";

const normalizeValue = (value) => (value ?? "").toString();

const normalizeOptions = (options = []) =>
  options
    .map((option) => {
      if (typeof option === "string" || typeof option === "number") {
        return {
          value: option,
          label: option.toString(),
          description: "",
          disabled: false,
        };
      }
      if (!option || typeof option !== "object") return null;
      return {
        value: option.value ?? "",
        label: option.label ?? (option.value ?? "").toString(),
        description: option.description ?? "",
        disabled: Boolean(option.disabled),
      };
    })
    .filter(Boolean);

export default function AnimatedSelect({
  label = "",
  value = "",
  onChange,
  options = [],
  placeholder = "-- Ch\u1ecdn --",
  error = "",
  disabled = false,
  icon = null,
  size = "md",
  noDataText = "Kh\u00f4ng c\u00f3 d\u1eef li\u1ec7u ph\u00f9 h\u1ee3p.",
  labelClassName = "",
  buttonClassName = "",
  menuClassName = "",
}) {
  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);
  const currentValue = normalizeValue(value);
  const selectedOption =
    normalizedOptions.find((item) => normalizeValue(item.value) === currentValue) || null;
  const hasValue = selectedOption && normalizeValue(selectedOption.value) !== "";

  const paddingClass = icon
    ? size === "sm"
      ? "pl-8 pr-8 py-1.5 text-xs"
      : "pl-9 pr-9 py-2 text-sm"
    : size === "sm"
    ? "pl-3 pr-8 py-1.5 text-xs"
    : "pl-3 pr-9 py-2 text-sm";

  const baseClass =
    "w-full rounded-xl border bg-white shadow-sm outline-none transition-all duration-200";
  const stateClass = disabled
    ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
    : error
    ? "border-rose-300 text-slate-700 hover:border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
    : "border-slate-200 text-slate-700 hover:border-slate-300 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10";

  return (
    <label className="block">
      {label && (
        <span className={`mb-0.5 block text-xs font-semibold text-slate-600 ${labelClassName}`}>
          {label}
        </span>
      )}

      <Listbox
        value={selectedOption}
        onChange={(next) => onChange?.(next?.value ?? "")}
        disabled={disabled}
      >
        {({ open }) => (
          <div className="relative">
            <Listbox.Button
              className={`${baseClass} ${paddingClass} ${stateClass} ${
                open && !disabled ? "-translate-y-px border-[#0077B6] ring-4 ring-[#0077B6]/10" : ""
              } ${buttonClassName}`}
            >
              {icon && (
                <span
                  className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${
                    open ? "text-sky-600" : "text-slate-400"
                  } transition-colors duration-200`}
                >
                  {icon}
                </span>
              )}

              <span
                className={`block truncate text-left ${
                  hasValue ? "text-slate-800" : "text-slate-400"
                }`}
              >
                {hasValue ? selectedOption.label : placeholder}
              </span>

              <ChevronDown
                size={16}
                className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-200 ${
                  open ? "-rotate-180 text-sky-600" : "text-slate-400"
                }`}
              />
            </Listbox.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1 scale-[0.98]"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-1 scale-[0.98]"
            >
              <Listbox.Options
                className={`absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-sky-100 bg-white/95 p-1.5 shadow-[0_18px_45px_-18px_rgba(2,132,199,0.45)] ring-1 ring-sky-50 backdrop-blur-sm focus:outline-none ${menuClassName}`}
              >
                {normalizedOptions.length === 0 ? (
                  <div className="px-2.5 py-2 text-xs text-slate-500">{noDataText}</div>
                ) : (
                  normalizedOptions.map((item, idx) => (
                    <Listbox.Option
                      key={`${normalizeValue(item.value)}-${idx}`}
                      value={item}
                      disabled={item.disabled}
                    >
                      {({ active, selected, disabled: optionDisabled }) => (
                        <div
                          className={`relative cursor-pointer select-none rounded-lg px-2.5 py-2 pr-8 transition-all duration-150 ${
                            selected
                              ? "bg-blue-50 text-[#0077B6] font-semibold"
                              : active
                              ? "bg-slate-50 text-slate-900"
                              : "text-slate-700 hover:bg-slate-50"
                          } ${optionDisabled ? "cursor-not-allowed opacity-45" : ""}`}
                        >
                          <p className={`truncate text-sm ${selected ? "font-semibold" : "font-medium"}`}>
                            {item.label}
                          </p>
                          {item.description && (
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {item.description}
                            </p>
                          )}
                          {selected && (
                            <Check
                              size={14}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#0077B6]"
                            />
                          )}
                        </div>
                      )}
                    </Listbox.Option>
                  ))
                )}
              </Listbox.Options>
            </Transition>
          </div>
        )}
      </Listbox>

      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </label>
  );
}
