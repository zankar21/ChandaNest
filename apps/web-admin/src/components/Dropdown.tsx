import { useEffect, useRef, useState } from "react";

type DropdownProps = {
  trigger: React.ReactNode | ((open: boolean) => React.ReactNode);
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
};

export default function Dropdown({ trigger, children, align = "left", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current) return;
      if (ref.current.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  const resolvedTrigger = typeof trigger === "function" ? trigger(open) : trigger;

  return (
    <div ref={ref} className={`relative ${className || ""}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 focus:outline-none ${open ? "bg-surface" : ""}`}
        aria-expanded={open}
      >
        {resolvedTrigger}
      </button>
      {open && (
        <div
          className={`absolute z-50 mt-2 min-w-[220px] card-glass-strong p-2 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}


