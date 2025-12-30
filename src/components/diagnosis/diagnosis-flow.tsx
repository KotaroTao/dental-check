"use client";

import { useEffect, useRef } from "react";
import { useDiagnosisStore } from "@/lib/diagnosis-store";
import { DiagnosisType } from "@/data/diagnosis-types";
import { QuestionCard } from "./question-card";
import { ResultCard } from "./result-card";
import type { CTAConfig } from "@/types/clinic";

interface Props {
  diagnosis: DiagnosisType;
  isDemo: boolean;
  clinicSlug?: string;
  ctaConfig?: CTAConfig;
  clinicName?: string;
  mainColor?: string;
  sessionId?: string;
  userAge?: number;
}

export function DiagnosisFlow({
  diagnosis,
  isDemo,
  clinicSlug,
  ctaConfig,
  clinicName,
  mainColor,
  sessionId,
  userAge,
}: Props) {
  const { currentStep, resultPattern, reset, answers, _hasHydrated } =
    useDiagnosisStore();
  const hasInitialized = useRef(false);

  // コンポーネントがマウントされたらリセット
  useEffect(() => {
    if (!_hasHydrated) return;
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // 新しいセッションの場合はリセット
    if (answers.length === 0 && resultPattern === null) {
      return;
    }
    reset();
  }, [_hasHydrated, reset, answers.length, resultPattern]);

  // Zustandストアのハイドレーション中はローディング表示
  if (!_hasHydrated) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  // 結果表示
  if (resultPattern !== null) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <ResultCard
          diagnosis={diagnosis}
          isDemo={isDemo}
          clinicSlug={clinicSlug}
          ctaConfig={ctaConfig}
          clinicName={clinicName}
          mainColor={mainColor}
          sessionId={sessionId}
          userAge={userAge}
        />
      </div>
    );
  }

  // 質問表示
  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <QuestionCard
        diagnosis={diagnosis}
        questionIndex={currentStep}
        totalQuestions={diagnosis.questions.length}
        userAge={userAge}
      />
    </div>
  );
}
