"use client";

import { useEffect } from "react";
import { useDiagnosisStore } from "@/lib/diagnosis-store";
import { DiagnosisType } from "@/data/diagnosis-types";
import { ProfileForm } from "./profile-form";
import { QuestionCard } from "./question-card";
import { ResultCard } from "./result-card";

interface Props {
  diagnosis: DiagnosisType;
  isDemo: boolean;
  clinicSlug?: string;
}

export function DiagnosisFlow({ diagnosis, isDemo, clinicSlug }: Props) {
  const { userAge, currentStep, resultPattern, reset } =
    useDiagnosisStore();

  // コンポーネントがマウントされたらリセット
  useEffect(() => {
    reset();
  }, [reset]);

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
        <ResultCard diagnosis={diagnosis} isDemo={isDemo} clinicSlug={clinicSlug} />
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
