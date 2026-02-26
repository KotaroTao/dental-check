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
  ctaConfig?: CTAConfig;
  clinicName?: string;
  mainColor?: string;
  channelId?: string;
  channelDisplayName?: string;
}

export function DiagnosisFlow({ diagnosis, isDemo, ctaConfig, clinicName, mainColor, channelId, channelDisplayName }: Props) {
  const { userAge, currentStep, resultPattern, reset, answers, _hasHydrated } =
    useDiagnosisStore();
  const hasInitialized = useRef(false);

  // コンポーネントがマウントされたらリセット（ただしプロファイル入力済みで未回答の場合はスキップ）
  // Zustandストアのハイドレーション完了を待つ
  useEffect(() => {
    if (!_hasHydrated) return;
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // プロファイル入力済みで回答がまだない場合はリセットしない（プロファイルページから遷移）
    if (userAge !== null && answers.length === 0 && resultPattern === null) {
      return;
    }
    // それ以外はリセット（新規開始または再診断）
    reset();
  }, [_hasHydrated, reset, userAge, answers.length, resultPattern]);

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

  // プロフィール未入力の場合
  if (userAge === null) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <ProfileForm diagnosisName={diagnosis.name} channelDisplayName={channelDisplayName} />
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
