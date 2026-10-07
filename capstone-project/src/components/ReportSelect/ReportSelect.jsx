import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import "./report-select.css";

/*
    Custom dropdown used by the Reports page filters (replaces the native <select>
    so the option list can be styled).

    options: [{ value, label, hint? }]. hint is a muted note shown after the
             label. An entry may instead be
             { group: "Title", options: [{ value, label }] } to render a titled section.
    placeholder: muted text shown while nothing is selected.
    onChange: receives { target: { value } } (value is a string), same shape a
              native <select> gives, so existing handlers keep working.
*/
function ReportSelect({ value, onChange, options, ariaLabel, placeholder }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const flat = options.flatMap((o) => (o.group ? o.options : [o]));
  const selectedIndex = flat.findIndex((o) => String(o.value) === String(value));
  const selected = flat[selectedIndex];

  // Close when clicking anywhere outside the dropdown
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // Keep the highlighted option visible inside the scrolling list
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const openMenu = () => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const choose = (option) => {
    setOpen(false);
    if (String(option.value) !== String(value)) {
      onChange({ target: { value: String(option.value) } });
    }
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(flat.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (flat[activeIndex]) choose(flat[activeIndex]);
    } else if (e.key.length === 1) {
      // Type a letter to jump to the next option starting with it
      const letter = e.key.toLowerCase();
      const startsWith = (o) => String(o.label).toLowerCase().startsWith(letter);
      const after = flat.findIndex((o, i) => i > activeIndex && startsWith(o));
      const match = after >= 0 ? after : flat.findIndex(startsWith);
      if (match >= 0) setActiveIndex(match);
    }
  };

  const renderOption = (option) => {
    const index = flat.indexOf(option);
    const isSelected = index === selectedIndex;

    return (
      <li
        key={option.value}
        id={`${listId}-${index}`}
        role="option"
        aria-selected={isSelected}
        data-active={index === activeIndex}
        className={`report-select-option${isSelected ? " is-selected" : ""}`}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => choose(option)}
      >
        <span>
          {option.label}
          {option.hint && <small className="report-select-hint">{option.hint}</small>}
        </span>
        {isSelected && <Check size={15} strokeWidth={2.5} />}
      </li>
    );
  };

  return (
    <div className={`report-select${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="report-select-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
      >
        <span className="report-select-value">
          {selected ? selected.label : <span className="report-select-placeholder">{placeholder}</span>}
          {selected?.hint && <small className="report-select-hint">{selected.hint}</small>}
        </span>
        <ChevronDown size={16} className="report-select-chevron" />
      </button>

      {open && (
        <ul className="report-select-menu" id={listId} role="listbox" ref={listRef}>
          {options.map((entry) =>
            entry.group ? (
              <li key={entry.group} role="presentation">
                <div className="report-select-group">{entry.group}</div>
                <ul role="group" aria-label={entry.group}>
                  {entry.options.map(renderOption)}
                </ul>
              </li>
            ) : (
              renderOption(entry)
            )
          )}
        </ul>
      )}
    </div>
  );
}

export default ReportSelect;
