"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDiagnosisStore } from "@/lib/diagnosis-store";
import { DiagnosisType } from "@/data/diagnosis-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  diagnosis: DiagnosisType;
  questionIndex: number;
  totalQuestions: number;
  userAge?: number;
}

export function QuestionCard({ diagnosis, questionIndex, totalQuestions, userAge }: Props) {
  const question = diagnosis.questions[questionIndex];
  const { answers, setAnswer, nextStep, prevStep, calculateResult } =
    useDiagnosisStore();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // 既存の回答があれば復元
  useEffect(() => {
    if (answers[questionIndex] !== undefined) {
      setSelectedIndex(answers[questionIndex].choiceIndex);
    } else {
      setSelectedIndex(null);
    }
  }, [questionIndex, answers]);

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    setAnswer(questionIndex, index, question.choices[index].score);
  };

  const handleNext = () => {
    if (questionIndex < totalQuestions - 1) {
      nextStep();
    } else {
      // 最後の質問の場合は結果を計算
      calculateResult(diagnosis, userAge);
    }
  };

  const handlePrev = () => {
    prevStep();
  };

  const progress = ((questionIndex + 1) / totalQuestions) * 100;
  const isLastQuestion = questionIndex === totalQuestions - 1;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            {diagnosis.name}
          </span>
          <span className="text-sm font-medium">
            {questionIndex + 1} / {totalQuestions}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          <motion.div
            key={questionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <CardTitle className="text-lg mb-6">
              Q{question.id}. {question.text}
            </CardTitle>

            <div className="space-y-3 mb-8">
              {question.choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(index)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedIndex === index
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedIndex === index
                          ? "border-primary bg-primary"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedIndex === index && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-base">{choice.text}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-between gap-4">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={questionIndex === 0}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                戻る
              </Button>
              <Button
                onClick={handleNext}
                disabled={selectedIndex === null}
                className="flex items-center gap-1"
              >
                {isLastQuestion ? "結果を見る" : "次へ"}
                {!isLastQuestion && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
