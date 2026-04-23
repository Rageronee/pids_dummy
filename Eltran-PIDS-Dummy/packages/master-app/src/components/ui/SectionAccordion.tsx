import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Reusable Accordion Component
export function SectionAccordion({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
  summary,
}: {
  title: string;
  icon: any;
  defaultOpen?: boolean;
  children: React.ReactNode;
  summary?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border border-slate-200 dark:border-slate-800/50 overflow-hidden shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-6 py-5 lg:px-8 flex items-center justify-between bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-4">
          <div className="text-[#ee6f1f]">
            <Icon size={24} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm lg:text-base font-bold text-[#1d2d6a] dark:text-white">
              {title}
            </span>
            {!isOpen && summary && (
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1 hidden sm:block">
                {summary}
              </div>
            )}
          </div>
        </div>
        <div
          className={`p-2 rounded-full transition-transform duration-300 ${isOpen ? "bg-slate-100 dark:bg-slate-800 rotate-180" : "bg-transparent rotate-0"}`}
        >
          <ChevronDown size={20} className="text-slate-400 dark:text-slate-500" />
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2 lg:px-8 lg:pb-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
