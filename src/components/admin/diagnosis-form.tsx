"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { QuestionImageUpload } from "./question-image-upload";

interface Choice {
  text: string;
  score: number;
}

interface Question {
  id: number;
  text: string;
  imageUrl?: string | null;
  choices: Choice[];
}

interface ResultPattern {
  minScore: number;
  maxScore: number;
  category: string;
  title: string;
  message: string;
}

interface DiagnosisData {
  id?: string;
  slug: string;
  name: string;
  description: string;
  questions: Question[];
  resultPatterns: ResultPattern[];
  isActive: boolean;
}

// APIから受け取るデータ型（より緩い型定義）
interface InitialData {
  id?: string;
  slug?: string;
  name?: string;
  description?: string | null;
  questions?: unknown[] | null;
  resultPatterns?: unknown[] | null;
  isActive?: boolean;
}

interface Props {
  initialData?: InitialData;
  isEditing?: boolean;
}

// データを正規化する関数（不完全なデータでもクラッシュしないように）
// DBでは "options" フィールド、フォームでは "choices" フィールドを使用する場合がある
function normalizeQuestions(questions: unknown[] | null | undefined): Question[] {
  if (!Array.isArray(questions)) return [];
  return questions.map((q, index) => {
    const question = q as Record<string, unknown> | null | undefined;
    // DBでは "options"、フォームでは "choices" を使用する場合があるため両方対応
    const choices = (question?.choices ?? question?.options) as unknown[] | null | undefined;
    return {
      id: typeof question?.id === "number" ? question.id : index + 1,
      text: typeof question?.text === "string" ? question.text : "",
      imageUrl: typeof question?.imageUrl === "string" ? question.imageUrl : null,
      choices: Array.isArray(choices) ? choices.map(c => {
        const choice = c as Record<string, unknown> | null | undefined;
        return {
          text: typeof choice?.text === "string" ? choice.text : "",
          score: typeof choice?.score === "number" ? choice.score : 0,
        };
      }) : [{ text: "", score: 0 }],
    };
  });
}

function normalizeResultPatterns(patterns: unknown[] | null | undefined): ResultPattern[] {
  if (!Array.isArray(patterns)) return [];
  return patterns.map(p => {
    const pattern = p as Record<string, unknown> | null | undefined;
    return {
      minScore: typeof pattern?.minScore === "number" ? pattern.minScore : 0,
      maxScore: typeof pattern?.maxScore === "number" ? pattern.maxScore : 100,
      category: typeof pattern?.category === "string" ? pattern.category : "",
      title: typeof pattern?.title === "string" ? pattern.title : "",
      message: typeof pattern?.message === "string" ? pattern.message : "",
    };
  });
}

export function DiagnosisForm({ initialData, isEditing = false }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<DiagnosisData>({
    slug: initialData?.slug || "",
    name: initialData?.name || "",
    description: initialData?.description || "",
    questions: normalizeQuestions(initialData?.questions),
    resultPatterns: normalizeResultPatterns(initialData?.resultPatterns),
    isActive: initialData?.isActive ?? true,
  });

  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set([0]));
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set([0]));

  const toggleQuestion = (index: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedQuestions(newExpanded);
  };

  const toggleResult = (index: number) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedResults(newExpanded);
  };

  // 設問の追加
  const addQuestion = () => {
    const newId = formData.questions.length > 0
      ? Math.max(...formData.questions.map((q) => q.id)) + 1
      : 1;
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        { id: newId, text: "", imageUrl: null, choices: [{ text: "", score: 0 }] },
      ],
    });
    setExpandedQuestions(new Set([...Array.from(expandedQuestions), formData.questions.length]));
  };

  // 設問画像の更新
  const updateQuestionImage = (index: number, imageUrl: string | null) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = { ...newQuestions[index], imageUrl };
    setFormData({ ...formData, questions: newQuestions });
  };

  // 設問の削除
  const removeQuestion = (index: number) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index),
    });
  };

  // 設問テキストの更新
  const updateQuestionText = (index: number, text: string) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = { ...newQuestions[index], text };
    setFormData({ ...formData, questions: newQuestions });
  };

  // 選択肢の追加
  const addChoice = (questionIndex: number) => {
    const newQuestions = [...formData.questions];
    newQuestions[questionIndex].choices.push({ text: "", score: 0 });
    setFormData({ ...formData, questions: newQuestions });
  };

  // 選択肢の削除
  const removeChoice = (questionIndex: number, choiceIndex: number) => {
    const newQuestions = [...formData.questions];
    newQuestions[questionIndex].choices = newQuestions[questionIndex].choices.filter(
      (_, i) => i !== choiceIndex
    );
    setFormData({ ...formData, questions: newQuestions });
  };

  // 選択肢の更新
  const updateChoice = (
    questionIndex: number,
    choiceIndex: number,
    field: "text" | "score",
    value: string | number
  ) => {
    const newQuestions = [...formData.questions];
    newQuestions[questionIndex].choices[choiceIndex] = {
      ...newQuestions[questionIndex].choices[choiceIndex],
      [field]: field === "score" ? Number(value) : value,
    };
    setFormData({ ...formData, questions: newQuestions });
  };

  // 結果パターンの追加
  const addResultPattern = () => {
    setFormData({
      ...formData,
      resultPatterns: [
        ...formData.resultPatterns,
        { minScore: 0, maxScore: 100, category: "", title: "", message: "" },
      ],
    });
    setExpandedResults(new Set([...Array.from(expandedResults), formData.resultPatterns.length]));
  };

  // 結果パターンの削除
  const removeResultPattern = (index: number) => {
    setFormData({
      ...formData,
      resultPatterns: formData.resultPatterns.filter((_, i) => i !== index),
    });
  };

  // 結果パターンの更新
  const updateResultPattern = (
    index: number,
    field: keyof ResultPattern,
    value: string | number
  ) => {
    const newPatterns = [...formData.resultPatterns];
    newPatterns[index] = {
      ...newPatterns[index],
      [field]: field === "minScore" || field === "maxScore" ? Number(value) : value,
    };
    setFormData({ ...formData, resultPatterns: newPatterns });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const url = isEditing
        ? `/api/admin/diagnoses/${initialData?.id}`
        : "/api/admin/diagnoses";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "保存に失敗しました");
        return;
      }

      router.push("/admin/diagnoses");
    } catch {
      setError("保存に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      )}

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slug">スラッグ（URL用）</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                placeholder="例: oral-age"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">診断名</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="例: お口年齢診断"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="診断の説明文"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="w-4 h-4"
            />
            <Label htmlFor="isActive">公開する</Label>
          </div>
        </CardContent>
      </Card>

      {/* 設問 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>設問 ({formData.questions.length})</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="w-4 h-4 mr-1" />
            設問を追加
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.questions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              設問がありません。「設問を追加」ボタンで追加してください。
            </p>
          ) : (
            formData.questions.map((question, qIndex) => (
              <div
                key={qIndex}
                className="border rounded-lg overflow-hidden"
              >
                <div
                  className="flex items-center gap-2 p-3 bg-gray-50 cursor-pointer"
                  onClick={() => toggleQuestion(qIndex)}
                >
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">Q{question.id}</span>
                  <span className="text-gray-600 truncate flex-1">
                    {question.text || "(未入力)"}
                  </span>
                  <span className="text-sm text-gray-500">
                    選択肢: {question.choices.length}
                  </span>
                  {expandedQuestions.has(qIndex) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>

                {expandedQuestions.has(qIndex) && (
                  <div className="p-4 space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={question.text}
                        onChange={(e) =>
                          updateQuestionText(qIndex, e.target.value)
                        }
                        placeholder="設問テキスト"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(qIndex)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">設問画像（任意）</Label>
                      <QuestionImageUpload
                        imageUrl={question.imageUrl}
                        onImageChange={(url) => updateQuestionImage(qIndex, url)}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>選択肢</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => addChoice(qIndex)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          追加
                        </Button>
                      </div>
                      {question.choices.map((choice, cIndex) => (
                        <div key={cIndex} className="flex gap-2 items-center">
                          <Input
                            value={choice.text}
                            onChange={(e) =>
                              updateChoice(qIndex, cIndex, "text", e.target.value)
                            }
                            placeholder="選択肢テキスト"
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={choice.score}
                            onChange={(e) =>
                              updateChoice(qIndex, cIndex, "score", e.target.value)
                            }
                            placeholder="点数"
                            className="w-20"
                          />
                          <span className="text-gray-500 text-sm">点</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeChoice(qIndex, cIndex)}
                            className="text-red-600"
                            disabled={question.choices.length <= 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 結果パターン */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>結果パターン ({formData.resultPatterns.length})</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addResultPattern}
          >
            <Plus className="w-4 h-4 mr-1" />
            パターンを追加
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.resultPatterns.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              結果パターンがありません。「パターンを追加」ボタンで追加してください。
            </p>
          ) : (
            formData.resultPatterns.map((pattern, pIndex) => (
              <div
                key={pIndex}
                className="border rounded-lg overflow-hidden"
              >
                <div
                  className="flex items-center gap-2 p-3 bg-gray-50 cursor-pointer"
                  onClick={() => toggleResult(pIndex)}
                >
                  <span className="font-medium">パターン {pIndex + 1}</span>
                  <span className="text-gray-600 truncate flex-1">
                    {pattern.title || "(未入力)"} ({pattern.minScore}-{pattern.maxScore}点)
                  </span>
                  {expandedResults.has(pIndex) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>

                {expandedResults.has(pIndex) && (
                  <div className="p-4 space-y-4">
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <Label>スコア範囲</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="number"
                            value={pattern.minScore}
                            onChange={(e) =>
                              updateResultPattern(pIndex, "minScore", e.target.value)
                            }
                            placeholder="最小"
                            className="w-24"
                          />
                          <span>〜</span>
                          <Input
                            type="number"
                            value={pattern.maxScore}
                            onChange={(e) =>
                              updateResultPattern(pIndex, "maxScore", e.target.value)
                            }
                            placeholder="最大"
                            className="w-24"
                          />
                          <span>点</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeResultPattern(pIndex)}
                        className="text-red-600 self-end"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>結果</Label>
                        <Input
                          value={pattern.category}
                          onChange={(e) =>
                            updateResultPattern(pIndex, "category", e.target.value)
                          }
                          placeholder="例: 要注意"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>タイトル</Label>
                        <Input
                          value={pattern.title}
                          onChange={(e) =>
                            updateResultPattern(pIndex, "title", e.target.value)
                          }
                          placeholder="例: お口の健康に赤信号"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>メッセージ</Label>
                      <Textarea
                        value={pattern.message}
                        onChange={(e) =>
                          updateResultPattern(pIndex, "message", e.target.value)
                        }
                        placeholder="結果に表示するメッセージ"
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 保存ボタン */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "保存中..." : isEditing ? "更新する" : "作成する"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/diagnoses")}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
