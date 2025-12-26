import { create } from "zustand";
import { DiagnosisType, ResultPattern } from "@/data/diagnosis-types";

interface DiagnosisState {
  // プロフィール
  userAge: number | null;
  userGender: string | null;

  // 診断進行状態
  currentStep: number;
  answers: number[];

  // 結果
  totalScore: number | null;
  resultPattern: ResultPattern | null;
  oralAge: number | null;

  // アクション
  setProfile: (age: number, gender: string | null) => void;
  setAnswer: (step: number, score: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  calculateResult: (diagnosis: DiagnosisType) => void;
  reset: () => void;
}

export const useDiagnosisStore = create<DiagnosisState>((set, get) => ({
  userAge: null,
  userGender: null,
  currentStep: 0,
  answers: [],
  totalScore: null,
  resultPattern: null,
  oralAge: null,

  setProfile: (age, gender) => set({ userAge: age, userGender: gender }),

  setAnswer: (step, score) => {
    const answers = [...get().answers];
    answers[step] = score;
    set({ answers });
  },

  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),

  prevStep: () =>
    set((state) => ({
      currentStep: Math.max(0, state.currentStep - 1),
    })),

  calculateResult: (diagnosis) => {
    const { answers, userAge } = get();
    const totalScore = answers.reduce((sum, score) => sum + score, 0);

    const resultPattern =
      diagnosis.resultPatterns.find(
        (p) => totalScore >= p.minScore && totalScore <= p.maxScore
      ) || diagnosis.resultPatterns[diagnosis.resultPatterns.length - 1];

    let oralAge: number | null = null;
    if (
      diagnosis.slug === "oral-age" &&
      userAge &&
      resultPattern.ageModifier !== undefined
    ) {
      oralAge = userAge + resultPattern.ageModifier;
    }

    set({ totalScore, resultPattern, oralAge });
  },

  reset: () =>
    set({
      userAge: null,
      userGender: null,
      currentStep: 0,
      answers: [],
      totalScore: null,
      resultPattern: null,
      oralAge: null,
    }),
}));
