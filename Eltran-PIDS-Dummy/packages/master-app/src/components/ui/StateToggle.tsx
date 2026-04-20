import { useState } from "react";

export function StateToggle({
  value,
  label1 = "auto",
  label2 = "custom",
  onChange,
}: {
  value: string;
  label1?: string;
  label2?: string;
  onChange?: (val: string) => void;
}) {
  const [internalValue, setInternalValue] = useState(value.toLowerCase());
  const isFirst = internalValue === label1.toLowerCase();
  return (
    <button
      type="button"
      onClick={() => {
        const navVal = isFirst ? label2.toLowerCase() : label1.toLowerCase();
        setInternalValue(navVal);
        onChange?.(navVal);
      }}
      className={`px-3 py-1 text-[8px] font-bold rounded-lg transition-all border shadow-sm ${
        isFirst
          ? "bg-[#1d2d6a] text-white border-[#152355] hover:bg-[#152355]"
          : "bg-[#ee6f1f] text-white border-[#d8631c] hover:bg-[#f87a2c]"
      }`}
    >
      {internalValue.charAt(0).toUpperCase() +
        internalValue.slice(1).toLowerCase()}
    </button>
  );
}
