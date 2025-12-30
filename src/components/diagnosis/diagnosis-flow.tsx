"use client";

import { useEffect, useRef } from "react";
import { useDiagnosisStore } from "@/lib/diagnosis-store";
import { DiagnosisType } from "@/data/diagnosis-types";
import { ProfileForm } from "./profile-form";
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
  channelId?: string;
}

export function DiagnosisFlow({ diagnosis, isDemo, clinicSlug, ctaConfig, clinicName, mainColor, channelId }: Props) {
  const { userAge, currentStep, resultPattern, reset, answers } =
    useDiagnosisStore();
  const hasInitialized = useRef(false);

  // コンポーネントがマウントされたらリセット（ただしプロファイル入力済みで未回答の場合はスキップ）
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // プロファイル入力済みで回答がまだない場合はリセットしない（プロファイルページから遷移）
    if (userAge !== null && answers.length === 0 && resultPattern === null) {
      return;
    }
    // それ以外はリセット（新規開始または再診断）
    reset();
  }, [reset, userAge, answers.length, resultPattern]);

  // プロフィール未入力の場合
  if (userAge === null) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <ProfileForm diagnosisName={diagnosis.name} />
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
          channelId={channelId}
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
      />
    </div>
  );
}
