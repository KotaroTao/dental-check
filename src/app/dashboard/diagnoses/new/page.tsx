"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
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

export default function NewDiagnosisPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
  });

  const [questions, setQuestions] = useState<Question[]>([
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

  const [resultPatterns, setResultPatterns] = useState<ResultPattern[]>([
    {
      id: crypto.randomUUID(),
      minScore: 0,
      maxScore: 10,
      category: "",
      title: "",
      description: "",
      advice: "",
    },
  ]);

  // 展開/折りたたみ状態
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

  const addQuestion = () => {
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
    setExpandedQuestions(new Set([...Array.from(expandedQuestions), questions.length]));
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
        category: "",
        title: "",
        description: "",
        advice: "",
      },
    ]);
    setExpandedResults(new Set([...Array.from(expandedResults), resultPatterns.length]));
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
      const response = await fetch("/api/dashboard/diagnoses", {
        method: "POST",
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
        setError(data.error || "作成に失敗しました");
      }
    } catch {
      setError("作成に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

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

      <h1 className="text-2xl font-bold mb-6">オリジナル診断を作成</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本情報 */}
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  診断名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="例: 歯周病リスクチェック"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">
                  スラッグ <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value.toLowerCase() })
                  }
                  placeholder="例: periodontal-check"
                />
                <p className="text-xs text-gray-500">
                  英小文字、数字、ハイフンのみ。URLに使用されます
                </p>
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
                placeholder="診断の説明を入力"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* 設問 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>設問 ({questions.length})</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
              <Plus className="w-4 h-4 mr-1" />
              設問を追加
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((question, qIndex) => (
              <div key={question.id} className="border rounded-lg overflow-hidden">
                <div
                  className="flex items-center gap-2 p-3 bg-gray-50 cursor-pointer"
                  onClick={() => toggleQuestion(qIndex)}
                >
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">Q{qIndex + 1}</span>
                  <span className="text-gray-600 truncate flex-1">
                    {question.text || "(未入力)"}
                  </span>
                  <span className="text-sm text-gray-500">
                    選択肢: {question.options.length}
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
                        onChange={(e) => updateQuestion(question.id, e.target.value)}
                        placeholder="設問テキスト"
                        className="flex-1"
                      />
                      {questions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(question.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">設問画像（任意）</Label>
                      <QuestionImageUpload
                        imageUrl={question.imageUrl}
                        onImageChange={(url) => updateQuestionImage(question.id, url)}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>選択肢</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => addOption(question.id)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          追加
                        </Button>
                      </div>
                      {question.options.map((option, oIndex) => (
                        <div key={option.id} className="flex gap-2 items-center">
                          <Input
                            value={option.text}
                            onChange={(e) =>
                              updateOption(question.id, option.id, "text", e.target.value)
                            }
                            placeholder={`選択肢 ${oIndex + 1}`}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={option.score}
                            onChange={(e) =>
                              updateOption(question.id, option.id, "score", parseInt(e.target.value) || 0)
                            }
                            placeholder="点数"
                            className="w-20"
                          />
                          <span className="text-gray-500 text-sm">点</span>
                          {question.options.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOption(question.id, option.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 結果パターン */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>結果パターン ({resultPatterns.length})</CardTitle>
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
            {resultPatterns.map((pattern, pIndex) => (
              <div key={pattern.id} className="border rounded-lg overflow-hidden">
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
                              updateResultPattern(pattern.id, "minScore", parseInt(e.target.value) || 0)
                            }
                            placeholder="最小"
                            className="w-24"
                          />
                          <span>〜</span>
                          <Input
                            type="number"
                            value={pattern.maxScore}
                            onChange={(e) =>
                              updateResultPattern(pattern.id, "maxScore", parseInt(e.target.value) || 0)
                            }
                            placeholder="最大"
                            className="w-24"
                          />
                          <span>点</span>
                        </div>
                      </div>
                      {resultPatterns.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeResultPattern(pattern.id)}
                          className="text-red-600 self-end"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>結果</Label>
                        <Input
                          value={pattern.category}
                          onChange={(e) =>
                            updateResultPattern(pattern.id, "category", e.target.value)
                          }
                          placeholder="例: 要注意"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>
                          タイトル <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={pattern.title}
                          onChange={(e) =>
                            updateResultPattern(pattern.id, "title", e.target.value)
                          }
                          placeholder="例: お口の健康に赤信号"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>説明</Label>
                      <Textarea
                        value={pattern.description}
                        onChange={(e) =>
                          updateResultPattern(pattern.id, "description", e.target.value)
                        }
                        placeholder="結果の説明"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>アドバイス</Label>
                      <Textarea
                        value={pattern.advice}
                        onChange={(e) =>
                          updateResultPattern(pattern.id, "advice", e.target.value)
                        }
                        placeholder="患者様へのアドバイス"
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 送信ボタン */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "作成中..." : "診断を作成"}
          </Button>
          <Link href="/dashboard/diagnoses">
            <Button type="button" variant="outline">
              キャンセル
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
