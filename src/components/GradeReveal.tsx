"use client";

import type { PrivacyGrade } from "@/lib/types";
import { GRADE_TEXT_CLASSES, GRADE_GLOW_CLASSES, GRADE_LABELS, GRADE_SUBTITLE } from "@/lib/constants";

interface GradeRevealProps {
  grade: PrivacyGrade;
  score: number;
  domain: string;
}

export default function GradeReveal({ grade, score, domain }: GradeRevealProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <p className="text-text-secondary text-sm font-mono">
        Privacy audit for <span className="text-text-primary">{domain}</span>
      </p>

      <div className={`grade-reveal ${GRADE_GLOW_CLASSES[grade]}`}>
        <span
          className={`text-8xl font-heading font-bold ${GRADE_TEXT_CLASSES[grade]}`}
        >
          {grade}
        </span>
      </div>

      <div className="text-center">
        <p className={`text-lg font-semibold ${GRADE_TEXT_CLASSES[grade]}`}>
          {GRADE_LABELS[grade]}
        </p>
        <p className="text-text-tertiary text-sm mt-1">
          Score: {score}/100
        </p>
        <p className="text-text-tertiary text-xs mt-1">
          {GRADE_SUBTITLE}
        </p>
      </div>
    </div>
  );
}
