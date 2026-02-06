"use client";

import { useState, useEffect, useRef } from "react";
import { CTA_TYPE_NAMES } from "./types";

export function HistoryCTAPopover({
  ctaClickCount,
  ctaByType,
}: {
  ctaClickCount: number;
  ctaByType: Record<string, number>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (ctaClickCount === 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={handleClick}
        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
          ctaClickCount > 0
            ? "bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer"
            : "bg-gray-100 text-gray-400 cursor-default"
        }`}
      >
        {ctaClickCount}
      </button>
      {isOpen && position && (
        <div
          ref={popoverRef}
          className="fixed z-[9999] min-w-[120px] bg-white rounded-lg shadow-lg border p-2"
          style={{
            left: position.x,
            top: position.y - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="text-[10px] font-medium text-gray-500 mb-1">CTA内訳</div>
          <div className="space-y-0.5">
            {Object.entries(ctaByType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="flex justify-between text-xs text-gray-600">
                  <span>{CTA_TYPE_NAMES[type] || type}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-white" />
        </div>
      )}
    </div>
  );
}
