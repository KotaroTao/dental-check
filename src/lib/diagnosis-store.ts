import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DiagnosisType, ResultPattern } from "@/data/diagnosis-types";

interface Answer {
  choiceIndex: number;
  score: number;
}

interface DiagnosisState {
  // ハイドレーション状態
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // 診断進行状態
  currentStep: number;
  answers: Answer[];

  // 結果
  totalScore: number | null;
  resultPattern: ResultPattern | null;
  oralAge: number | null;

  // アクション
  setAnswer: (step: number, choiceIndex: number, score: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  calculateResult: (diagnosis: DiagnosisType, userAge?: number) => void;
  reset: () => void;
}

export const useDiagnosisStore = create<DiagnosisState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      currentStep: 0,
      answers: [],
      totalScore: null,
      resultPattern: null,
      oralAge: null,

      setAnswer: (step, choiceIndex, score) => {
        const answers = [...get().answers];
        answers[step] = { choiceIndex, score };
        set({ answers });
      },

      nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),

      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(0, state.currentStep - 1),
        })),

      calculateResult: (diagnosis, userAge) => {
        const { answers } = get();
        const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);

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
          currentStep: 0,
          answers: [],
          totalScore: null,
          resultPattern: null,
          oralAge: null,
        }),
    }),
    {
      name: "diagnosis-store",
      // sessionStorageを使用（タブを閉じるとクリア）
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          // サーバーサイドではダミーストレージを返す
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return sessionStorage;
      }),
      // ハイドレーション完了時にフラグを立てる
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
      // _hasHydratedは永続化しない
      partialize: (state) => ({
        currentStep: state.currentStep,
        answers: state.answers,
        totalScore: state.totalScore,
        resultPattern: state.resultPattern,
        oralAge: state.oralAge,
      }),
    }
  )
);
