"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";

interface DiagnosisType {
  slug: string;
  name: string;
  description: string | null;
  clinicId: string | null;
}

interface FlyerSummary {
  id: string;
  name: string;
  distributionMethod: string | null;
}

export default function AddChannelToFlyerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const flyerId = params?.id as string;

  const [flyer, setFlyer] = useState<FlyerSummary | null>(null);
  const [diagnosisTypes, setDiagnosisTypes] = useState<DiagnosisType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // 新仕様: 備考のみ任意、それ以外（QRコード名・表示名・タイプ・診断タイプ）は必須。
  // リンク型の場合は redirectUrl も必須（既存APIの要件）。
  const [formData, setFormData] = useState({
    channelType: "diagnosis" as "diagnosis" | "link",
    name: "",
    displayName: "",
    diagnosisTypeSlug: "",
    redirectUrl: "",
    description: "",
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [flyerRes, diagRes] = await Promise.all([
          fetch(`/api/flyers/${flyerId}`),
          fetch("/api/dashboard/diagnoses"),
        ]);
        if (!flyerRes.ok) {
          if (mounted) setError("チラシ情報の取得に失敗しました");
          return;
        }
        const flyerData = await flyerRes.json();
        if (!mounted) return;
        setFlyer({
          id: flyerData.flyer.id,
          name: flyerData.flyer.name,
          distributionMethod: flyerData.flyer.distributionMethod,
        });
        if (diagRes.ok) {
          const diagData = await diagRes.json();
          if (mounted) setDiagnosisTypes(diagData.diagnoses || []);
        }
      } catch {
        if (mounted) setError("通信エラーが発生しました");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [flyerId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("QRコード名（管理用）を入力してください");
      return;
    }
    if (!formData.displayName.trim()) {
      setError("QRコード名（一般表示用）を入力してください");
      return;
    }
    if (formData.channelType === "diagnosis" && !formData.diagnosisTypeSlug) {
      setError("診断タイプを選択してください");
      return;
    }
    if (formData.channelType === "link" && !formData.redirectUrl.trim()) {
      setError("リンク型の場合は、リダイレクト先URLを入力してください");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          displayName: formData.displayName.trim(),
          channelType: formData.channelType,
          diagnosisTypeSlug:
            formData.channelType === "diagnosis"
              ? formData.diagnosisTypeSlug
              : null,
          redirectUrl:
            formData.channelType === "link"
              ? formData.redirectUrl.trim()
              : null,
          description: formData.description.trim() || null,
          // チラシ必須化のためここで紐付け
          flyerId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "QRの作成に失敗しました");
        setIsSaving(false);
        return;
      }
      // 作成後はQR詳細ページに遷移（QRコードのダウンロードなどができる）
      router.push(`/dashboard/channels/${data.channel.id}`);
    } catch {
      setError("通信エラーが発生しました");
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!flyer) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        {error || "チラシが見つかりません"}
      </div>
    );
  }

  // システム共通の診断タイプとクリニック固有の診断タイプを分けて表示する
  const defaultDiagnoses = diagnosisTypes.filter((d) => d.clinicId === null);
  const customDiagnoses = diagnosisTypes.filter((d) => d.clinicId !== null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/flyers/${flyerId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            チラシに戻る
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">QRを追加</h1>
      </div>

      {/* チラシ情報の表示（どのチラシに追加するかを明示） */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="py-3 text-sm">
          <span className="text-gray-500">追加先のチラシ: </span>
          <span className="font-medium">{flyer.name}</span>
          {flyer.distributionMethod && (
            <span className="ml-2 text-xs text-gray-500">
              （配布方法: {flyer.distributionMethod}）
            </span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>QRコード情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* タイプ（診断付き or リンク） */}
            <div className="space-y-2">
              <Label htmlFor="channelType">
                タイプ <span className="text-rose-600 text-xs">必須</span>
              </Label>
              <select
                id="channelType"
                name="channelType"
                value={formData.channelType}
                onChange={handleChange}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="diagnosis">診断付き</option>
                <option value="link">リンク</option>
              </select>
              <p className="text-xs text-gray-500">
                {formData.channelType === "diagnosis"
                  ? "ユーザーが診断に回答してから、結果ページでCTA（予約等）に進めます。"
                  : "QRを読み取ると指定したURLに直接遷移します。"}
              </p>
            </div>

            {/* QRコード名（管理用） */}
            <div className="space-y-2">
              <Label htmlFor="name">
                QRコード名（管理用） <span className="text-rose-600 text-xs">必須</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="例: チラシ表面・上部QR"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-500">
                管理画面で表示される名前。ユーザーには見えません。
              </p>
            </div>

            {/* QRコード名（一般表示用） */}
            <div className="space-y-2">
              <Label htmlFor="displayName">
                QRコード名（一般表示用） <span className="text-rose-600 text-xs">必須</span>
              </Label>
              <Input
                id="displayName"
                name="displayName"
                placeholder="例: お口の健康チェック"
                value={formData.displayName}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-500">
                診断ページなど一般ユーザーに表示される名前。
              </p>
            </div>

            {/* 診断タイプ（診断付きの場合のみ必須） */}
            {formData.channelType === "diagnosis" && (
              <div className="space-y-2">
                <Label htmlFor="diagnosisTypeSlug">
                  診断タイプ <span className="text-rose-600 text-xs">必須</span>
                </Label>
                <select
                  id="diagnosisTypeSlug"
                  name="diagnosisTypeSlug"
                  value={formData.diagnosisTypeSlug}
                  onChange={handleChange}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">選択してください</option>
                  {defaultDiagnoses.length > 0 && (
                    <optgroup label="共通の診断">
                      {defaultDiagnoses.map((d) => (
                        <option key={d.slug} value={d.slug}>
                          {d.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {customDiagnoses.length > 0 && (
                    <optgroup label="医院オリジナル">
                      {customDiagnoses.map((d) => (
                        <option key={d.slug} value={d.slug}>
                          {d.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}

            {/* リダイレクトURL（リンク型の場合のみ必須） */}
            {formData.channelType === "link" && (
              <div className="space-y-2">
                <Label htmlFor="redirectUrl">
                  リダイレクト先URL <span className="text-rose-600 text-xs">必須</span>
                </Label>
                <Input
                  id="redirectUrl"
                  name="redirectUrl"
                  type="url"
                  placeholder="https://example.com/page"
                  value={formData.redirectUrl}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-gray-500">
                  QRを読み取ったときに飛ばす先のURL。
                </p>
              </div>
            )}

            {/* 備考（任意） */}
            <div className="space-y-2">
              <Label htmlFor="description">備考（任意）</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="メモや備考を自由に記入できます"
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    作成中...
                  </>
                ) : (
                  "QRを作成"
                )}
              </Button>
              <Link href={`/dashboard/flyers/${flyerId}`}>
                <Button type="button" variant="outline" disabled={isSaving}>
                  キャンセル
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
