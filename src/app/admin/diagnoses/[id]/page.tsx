"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DiagnosisForm } from "@/components/admin/diagnosis-form";

interface Question {
  id: number;
  text: string;
  choices: { text: string; score: number }[];
}

interface ResultPattern {
  minScore: number;
  maxScore: number;
  category: string;
  title: string;
  message: string;
}

interface DiagnosisData {
  id: string;
  slug: string;
  name: string;
  description: string;
  questions: Question[];
  resultPatterns: ResultPattern[];
  isActive: boolean;
}

export default function EditDiagnosisPage() {
  const params = useParams();
  const [diagnosis, setDiagnosis] = useState<DiagnosisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDiagnosis = async () => {
      try {
        const response = await fetch(`/api/admin/diagnoses/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setDiagnosis(data.diagnosis);
        } else {
          setError("診断の取得に失敗しました");
        }
      } catch {
        setError("診断の取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiagnosis();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
    );
  }

  if (!diagnosis) {
    return (
      <div className="bg-yellow-50 text-yellow-600 p-4 rounded-lg">
        診断が見つかりません
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">診断を編集: {diagnosis.name}</h1>
      <DiagnosisForm initialData={diagnosis} isEditing />
    </div>
  );
}
