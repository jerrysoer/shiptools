"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import WorkflowCard from "@/components/WorkflowCard";
import { WORKFLOWS } from "@/data/workflows";

export default function WorkflowSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 340;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cardWidth = 280 + 16; // card width + gap
    const index = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(Math.min(index, WORKFLOWS.length - 1));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <section className="py-12 sm:py-20">
      <div className="max-w-6xl mx-auto px-6 mb-8">
        <h2 className="font-heading text-3xl sm:text-4xl font-semibold mb-2">
          What will you build today?
        </h2>
        <div className="flex items-center justify-between">
          <p className="text-text-secondary">
            Chain tools together into complete workflows.
          </p>
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              className="p-2 border border-border hover:bg-bg-surface transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-2 border border-border hover:bg-bg-surface transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-hide snap-x snap-mandatory px-6 pb-4"
          style={{ paddingLeft: "max(1.5rem, calc((100vw - 72rem) / 2 + 1.5rem))" }}
        >
          {WORKFLOWS.map((workflow) => (
            <WorkflowCard key={workflow.id} {...workflow} />
          ))}
        </div>

        {/* Right-edge fade — mobile only */}
        <div
          className="absolute right-0 top-0 bottom-4 w-12 pointer-events-none sm:hidden"
          style={{ background: "linear-gradient(to right, transparent, var(--color-bg-primary))" }}
        />
      </div>

      {/* Scroll indicator dots — mobile only */}
      <div className="flex justify-center gap-1.5 mt-3 sm:hidden">
        {WORKFLOWS.map((_, i) => (
          <span
            key={i}
            className={`block w-1.5 h-1.5 rounded-full transition-colors ${
              i === activeIndex ? "bg-text-primary" : "bg-border"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
