import { useState } from "react";

// Text-Only Toggle for Carriages
export function TextToggle({
  value,
  label1 = "auto",
  label2 = "custom",
}: {
  value: string;
  label1?: string;
  label2?: string;
}) {
  const [internalValue, setInternalValue] = useState(value.toLowerCase());
  const isFirst = internalValue === label1.toLowerCase();
  return (
    <button
      type="button"
      onClick={() =>
        setInternalValue(isFirst ? label2.toLowerCase() : label1.toLowerCase())
      }
      className={`text-[9px] font-bold transition-colors ${isFirst ? "text-[#1d2d6a] hover:text-[#152355]" : "text-[#ee6f1f] hover:text-[#d8631c]"}`}
    >
      {internalValue.charAt(0).toUpperCase() +
        internalValue.slice(1).toLowerCase()}
    </button>
  );
}
