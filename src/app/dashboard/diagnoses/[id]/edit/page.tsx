"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";
import { QuestionImageUpload } from "@/components/admin/question-image-upload";

interface Question {
  id: string;
  text: string;
  imageUrl?: string | null;
  options: {
    id: string;
    text: string;
    score: number;
  }[];
}

interface ResultPattern {
  id: string;
  minScore: number;
  maxScore: number;
  category: string;
  title: string;
  description: string;
  advice: string;
}

export default function EditDiagnosisPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    isActive: true,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [resultPatterns, setResultPatterns] = useState<ResultPattern[]>([]);

  // 選択肢スコアの選択肢（0〜10）
  const scoreOptions = Array.from({ length: 11 }, (_, i) => i);

  // 質問の最大スコア合計を計算（各質問の最高スコアの合計）
  const calculatedMaxScore = questions.reduce((total, question) => {
    const maxOptionScore = Math.max(...question.options.map((o) => o.score), 0);
    return total + maxOptionScore;
  }, 0);
  // 最低でも10は選べるようにする
  const maxTotalScore = Math.max(calculatedMaxScore, 10);

  useEffect(() => {
    const fetchDiagnosis = async () => {
      try {
        const response = await fetch(`/api/dashboard/diagnoses/${id}`);
        if (response.ok) {
          const data = await response.json();
          const diagnosis = data.diagnosis;
          setFormData({
            name: diagnosis.name,
            slug: diagnosis.slug,
            description: diagnosis.description || "",
            isActive: diagnosis.isActive,
          });

          // 質問データを正規化（idがない場合は生成）
          const rawQuestions = diagnosis.questions || [];
          const normalizedQuestions = rawQuestions.length > 0
            ? rawQuestions.map((q: Record<string, unknown>) => ({
                id: q.id || crypto.randomUUID(),
                text: q.text || "",
                imageUrl: (q.imageUrl as string | null | undefined) || null,
                options: Array.isArray(q.options)
                  ? q.options.map((o: Record<string, unknown>) => ({
                      id: o.id || crypto.randomUUID(),
                      text: o.text || "",
                      score: typeof o.score === "number" ? o.score : 0,
                    }))
                  : [
                      { id: crypto.randomUUID(), text: "", score: 0 },
                      { id: crypto.randomUUID(), text: "", score: 1 },
                    ],
              }))
            : [
                {
                  id: crypto.randomUUID(),
                  text: "",
                  imageUrl: null,
                  options: [
                    { id: crypto.randomUUID(), text: "", score: 0 },
                    { id: crypto.randomUUID(), text: "", score: 1 },
                  ],
                },
              ];
          setQuestions(normalizedQuestions);

          // 結果パターンを正規化（idがない場合は生成）
          const rawPatterns = diagnosis.resultPatterns || [];
          const normalizedPatterns = rawPatterns.length > 0
            ? rawPatterns.map((p: Record<string, unknown>) => ({
                id: p.id || crypto.randomUUID(),
                minScore: typeof p.minScore === "number" ? p.minScore : 0,
                maxScore: typeof p.maxScore === "number" ? p.maxScore : 10,
                category: p.category || "normal",
                title: p.title || "",
                description: p.description || "",
                advice: p.advice || "",
              }))
            : [
                {
                  id: crypto.randomUUID(),
                  minScore: 0,
                  maxScore: 10,
                  category: "good",
                  title: "",
                  description: "",
                  advice: "",
                },
              ];
          setResultPatterns(normalizedPatterns);
        } else {
          const data = await response.json();
          setError(data.error || "診断の取得に失敗しました");
        }
      } catch {
        setError("診断の取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiagnosis();
  }, [id]);

  // 質問の上限
  const MAX_QUESTIONS = 200;

  const addQuestion = () => {
    if (questions.length >= MAX_QUESTIONS) {
      setError(`質問は最大${MAX_QUESTIONS}件までです`);
      return;
    }
    setQuestions([
      ...questions,
      {
        id: crypto.randomUUID(),
        text: "",
        imageUrl: null,
        options: [
          { id: crypto.randomUUID(), text: "", score: 0 },
          { id: crypto.randomUUID(), text: "", score: 1 },
        ],
      },
    ]);
  };

  const updateQuestionImage = (questionId: string, imageUrl: string | null) => {
    setQuestions(
      questions.map((q) => (q.id === questionId ? { ...q, imageUrl } : q))
    );
  };

  const removeQuestion = (questionId: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((q) => q.id !== questionId));
    }
  };

  const updateQuestion = (questionId: string, text: string) => {
    setQuestions(
      questions.map((q) => (q.id === questionId ? { ...q, text } : q))
    );
  };

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: [
                ...q.options,
                { id: crypto.randomUUID(), text: "", score: q.options.length },
              ],
            }
          : q
      )
    );
  };

  const removeOption = (questionId: string, optionId: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId && q.options.length > 1
          ? { ...q, options: q.options.filter((o) => o.id !== optionId) }
          : q
      )
    );
  };

  const updateOption = (
    questionId: string,
    optionId: string,
    field: "text" | "score",
    value: string | number
  ) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((o) =>
                o.id === optionId ? { ...o, [field]: value } : o
              ),
            }
          : q
      )
    );
  };

  const addResultPattern = () => {
    setResultPatterns([
      ...resultPatterns,
      {
        id: crypto.randomUUID(),
        minScore: 0,
        maxScore: 10,
        category: "normal",
        title: "",
        description: "",
        advice: "",
      },
    ]);
  };

  const removeResultPattern = (patternId: string) => {
    if (resultPatterns.length > 1) {
      setResultPatterns(resultPatterns.filter((p) => p.id !== patternId));
    }
  };

  const updateResultPattern = (
    patternId: string,
    field: keyof ResultPattern,
    value: string | number
  ) => {
    setResultPatterns(
      resultPatterns.map((p) =>
        p.id === patternId ? { ...p, [field]: value } : p
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // バリデーション
    if (!formData.name.trim()) {
      setError("診断名を入力してください");
      setIsSubmitting(false);
      return;
    }

    if (!formData.slug.trim()) {
      setError("スラッグを入力してください");
      setIsSubmitting(false);
      return;
    }

    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      setError("スラッグは英小文字、数字、ハイフンのみ使用できます");
      setIsSubmitting(false);
      return;
    }

    const emptyQuestions = questions.filter((q) => !q.text.trim());
    if (emptyQuestions.length > 0) {
      setError("すべての質問にテキストを入力してください");
      setIsSubmitting(false);
      return;
    }

    const emptyOptions = questions.some((q) =>
      q.options.some((o) => !o.text.trim())
    );
    if (emptyOptions) {
      setError("すべての選択肢にテキストを入力してください");
      setIsSubmitting(false);
      return;
    }

    const emptyPatterns = resultPatterns.filter((p) => !p.title.trim());
    if (emptyPatterns.length > 0) {
      setError("すべての結果パターンにタイトルを入力してください");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/dashboard/diagnoses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          questions,
          resultPatterns,
        }),
      });

      if (response.ok) {
        router.push("/dashboard/diagnoses");
      } else {
        const data = await response.json();
        setError(data.error || "更新に失敗しました");
      }
    } catch {
      setError("更新に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/diagnoses"
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          診断管理に戻る
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">診断を編集</h1>
        <Button
          type="button"
          variant={formData.isActive ? "default" : "outline"}
          size="lg"
          onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
          className={
            formData.isActive
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }
        >
          {formData.isActive ? (
            <>
              <Eye className="w-5 h-5 mr-2" />
              公開中
            </>
          ) : (
            <>
              <EyeOff className="w-5 h-5 mr-2" />
              非公開
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 基本情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">基本情報</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                診断名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2"
                placeholder="例: 歯周病リスクチェック"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                スラッグ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value.toLowerCase() })
                }
                className="w-full border rounded-lg px-3 py-2"
                placeholder="例: periodontal-check"
              />
              <p className="text-xs text-gray-500 mt-1">
                英小文字、数字、ハイフンのみ。URLに使用されます
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">説明</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
                placeholder="診断の説明を入力"
              />
            </div>
          </div>
        </div>

        {/* 質問 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">質問</h2>
              <p className="text-sm text-gray-500 mt-1">
                {questions.length} / {MAX_QUESTIONS} 件
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addQuestion}
              disabled={questions.length >= MAX_QUESTIONS}
            >
              <Plus className="w-4 h-4 mr-1" />
              質問を追加
            </Button>
          </div>
          <div className="space-y-6">
            {questions.map((question, qIndex) => (
              <div key={question.id} className="border rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <GripVertical className="w-5 h-5 text-gray-400 mt-2" />
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">
                      質問 {qIndex + 1}
                    </label>
                    <input
                      type="text"
                      value={question.text}
                      onChange={(e) => updateQuestion(question.id, e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="質問を入力"
                    />
                  </div>
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(question.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
                <div className="ml-7 mb-3">
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    質問画像（任意）
                  </label>
                  <QuestionImageUpload
                    imageUrl={question.imageUrl}
                    onImageChange={(url) => updateQuestionImage(question.id, url)}
                  />
                </div>
                <div className="ml-7 space-y-2">
                  <label className="block text-sm font-medium text-gray-600">
                    選択肢
                  </label>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <span className="flex-1">選択肢テキスト</span>
                    <span className="w-20 text-center">スコア</span>
                    {question.options.length > 1 && <span className="w-8" />}
                  </div>
                  {question.options.map((option, oIndex) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) =>
                          updateOption(question.id, option.id, "text", e.target.value)
                        }
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                        placeholder={`選択肢 ${oIndex + 1}`}
                      />
                      <select
                        value={option.score}
                        onChange={(e) =>
                          updateOption(
                            question.id,
                            option.id,
                            "score",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-20 border rounded-lg px-2 py-2 text-sm text-center bg-white"
                      >
                        {scoreOptions.map((score) => (
                          <option key={score} value={score}>
                            {score}
                          </option>
                        ))}
                      </select>
                      {question.options.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(question.id, option.id)}
                        >
                          <Trash2 className="w-4 h-4 text-gray-400" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addOption(question.id)}
                    className="text-blue-600"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    選択肢を追加
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 結果パターン */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">結果パターン</h2>
              <p className="text-sm text-gray-500 mt-1">
                スコア範囲: 0〜{maxTotalScore}点（質問の最大スコア合計）
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addResultPattern}
            >
              <Plus className="w-4 h-4 mr-1" />
              パターンを追加
            </Button>
          </div>
          <div className="space-y-6">
            {resultPatterns.map((pattern, pIndex) => (
              <div key={pattern.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">パターン {pIndex + 1}</span>
                  {resultPatterns.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeResultPattern(pattern.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      最小スコア
                    </label>
                    <select
                      value={pattern.minScore}
                      onChange={(e) =>
                        updateResultPattern(
                          pattern.id,
                          "minScore",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full border rounded-lg px-3 py-2 bg-white"
                    >
                      {Array.from({ length: maxTotalScore + 1 }, (_, i) => i).map(
                        (score) => (
                          <option key={score} value={score}>
                            {score}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      最大スコア
                    </label>
                    <select
                      value={pattern.maxScore}
                      onChange={(e) =>
                        updateResultPattern(
                          pattern.id,
                          "maxScore",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full border rounded-lg px-3 py-2 bg-white"
                    >
                      {Array.from({ length: maxTotalScore + 1 }, (_, i) => i).map(
                        (score) => (
                          <option key={score} value={score}>
                            {score}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      タイトル <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pattern.title}
                      onChange={(e) =>
                        updateResultPattern(pattern.id, "title", e.target.value)
                      }
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="例: お口の健康は良好です"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      説明
                    </label>
                    <textarea
                      value={pattern.description}
                      onChange={(e) =>
                        updateResultPattern(pattern.id, "description", e.target.value)
                      }
                      className="w-full border rounded-lg px-3 py-2"
                      rows={2}
                      placeholder="結果の説明"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      アドバイス
                    </label>
                    <textarea
                      value={pattern.advice}
                      onChange={(e) =>
                        updateResultPattern(pattern.id, "advice", e.target.value)
                      }
                      className="w-full border rounded-lg px-3 py-2"
                      rows={2}
                      placeholder="患者様へのアドバイス"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 送信ボタン */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/diagnoses">
            <Button type="button" variant="outline">
              キャンセル
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : "変更を保存"}
          </Button>
        </div>
      </form>
    </div>
  );
}
