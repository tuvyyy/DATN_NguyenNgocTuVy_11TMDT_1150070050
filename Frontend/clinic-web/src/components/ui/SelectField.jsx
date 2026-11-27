import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import "./SelectField.css";

// A controlled, select-only combobox. The popup lives outside scroll containers.
export default function SelectField({ label, "aria-label": ariaLabel, value, options = [], onChange, disabled = false, hideLabel = false, className = "" }) {
  const id = useId();
  const trigger = useRef(null);
  const popup = useRef(null);
  const search = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState(null);
  const selected = options.findIndex(option => String(option.value) === String(value));
  const name = ariaLabel || label;

  const show = (last = false) => {
    if (disabled || !options.length) return;
    search.current = { text: "", at: 0 };
    setActive(selected >= 0 ? selected : last ? options.length - 1 : 0);
    setOpen(true);
  };
  const choose = index => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
    trigger.current?.focus();
  };
  const move = (offset, start = active) => {
    for (let i = 1; i <= options.length; i++) {
      const next = (start + offset * i + options.length) % options.length;
      if (!options[next].disabled) { setActive(next); break; }
    }
  };

  useLayoutEffect(() => {
    if (!open || !trigger.current) return undefined;
    const place = () => {
      const rect = trigger.current.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 10;
      const above = rect.top - 10;
      const upwards = below < Math.min(270, options.length * 38 + 12) && above > below;
      const width = Math.min(Math.max(rect.width, 160), window.innerWidth - 16);
      setPosition({ position: "fixed", width, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        maxHeight: Math.min(280, Math.max(96, (upwards ? above : below) - 6)),
        ...(upwards ? { bottom: window.innerHeight - rect.top + 5 } : { top: rect.bottom + 5 }) });
    };
    const closeOnScroll = event => { if (!(event.target instanceof Node) || !popup.current?.contains(event.target)) setOpen(false); };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", closeOnScroll, true); };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return undefined;
    const outside = event => {
      if (!trigger.current?.contains(event.target) && !popup.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("focusin", outside); };
  }, [open]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => {
    if (open) popup.current?.querySelector(`[data-option-index="${active}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, open]);

  const keyDown = event => {
    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      if (!open) show(event.key === "ArrowUp"); else move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(active); else show();
    } else if (event.key === "Escape") {
      if (open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
    } else if (event.key === "Tab") setOpen(false);
    else if (open && (event.key === "Home" || event.key === "End")) {
      event.preventDefault(); move(event.key === "Home" ? 1 : -1, event.key === "Home" ? options.length - 1 : 0);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const text = (now - search.current.at < 700 ? search.current.text : "") + event.key.toLocaleLowerCase("vi");
      search.current = { text, at: now };
      const index = options.findIndex(option => !option.disabled && option.label.toLocaleLowerCase("vi").startsWith(text));
      if (index >= 0) { setActive(index); setOpen(true); }
    }
  };

  return <div className={`ui-select ${className}`}>
    {label && <label htmlFor={id} className={hideLabel ? "ui-select-label-hidden" : "ui-select-label"}>{label}</label>}
    <button ref={trigger} id={id} type="button" role="combobox" aria-label={name} aria-haspopup="listbox"
      aria-expanded={open} aria-controls={open ? `${id}-options` : undefined}
      aria-activedescendant={open ? `${id}-option-${active}` : undefined} disabled={disabled}
      className={`ui-select-trigger${open ? " is-open" : ""}`} onClick={() => open ? setOpen(false) : show()} onKeyDown={keyDown}>
      <span>{options[selected]?.label || "Chọn…"}</span><ChevronDown size={15} aria-hidden="true" />
    </button>
    {open && position && createPortal(<ul ref={popup} id={`${id}-options`} role="listbox" aria-label={name} className="ui-select-popup" style={position}>
      {options.map((option, index) => <li key={String(option.value)} id={`${id}-option-${index}`} role="option"
        data-option-index={index} aria-selected={index === selected} aria-disabled={option.disabled || undefined}
        className={`${index === active ? "is-active" : ""}${index === selected ? " is-selected" : ""}`}
        onMouseEnter={() => !option.disabled && setActive(index)} onPointerDown={event => event.preventDefault()} onClick={() => choose(index)}>
        <span>{option.label}{option.description && <small>{option.description}</small>}</span>{index === selected && <Check size={15} aria-hidden="true" />}
      </li>)}
    </ul>, document.body)}
  </div>;
}
