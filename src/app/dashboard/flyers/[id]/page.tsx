"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Upload,
  Trash2,
  ExternalLink,
  Check,
  AlertCircle,
  Plus,
} from "lucide-react";

const METHOD_OPTIONS = [
  "ポスティング",
  "新聞折込",
  "DM",
  "メール",
  "LP (広告から誘導)",
  "その他",
];

interface LinkedChannel {
  id: string;
  name: string;
  code: string;
  channelType: "diagnosis" | "link";
  isActive: boolean;
}

interface FlyerData {
  id: string;
  name: string;
  description: string | null;
  distributionMethod: string | null;
  distributionQuantity: number | null;
  distributionPeriod: string | null;
  budget: number | null;
  imageUrl: string | null;
  imageUrl2: string | null;
  channels: LinkedChannel[];
}

export default function EditFlyerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const [flyer, setFlyer] = useState<FlyerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  // フォーム値（チラシ名 / 配布情報 / 備考）
  // 数値もテキストとして保持し、保存時に親APIで parseInt する。
  // disabled={isSaving} は付けない（自動保存中も入力可能にして、過去の入力途切れ不具合を避ける）
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    distributionMethod: "",
    distributionQuantity: "",
    distributionPeriod: "",
    budget: "",
  });

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  // 初回ロード時は自動保存しないようフラグで抑制
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      try {
        const response = await fetch(`/api/flyers/${id}`);
        if (!response.ok) {
          if (mounted) setError("チラシの取得に失敗しました");
          return;
        }
        const data = await response.json();
        if (!mounted) return;
        setFlyer(data.flyer);
        setFormData({
          name: data.flyer.name,
          description: data.flyer.description || "",
          distributionMethod: data.flyer.distributionMethod || "",
          distributionQuantity:
            data.flyer.distributionQuantity !== null
              ? String(data.flyer.distributionQuantity)
              : "",
          distributionPeriod: data.flyer.distributionPeriod || "",
          budget: data.flyer.budget !== null ? String(data.flyer.budget) : "",
        });
        // 初回読み込み完了 → 以降の入力で自動保存を有効化
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 100);
      } catch {
        if (mounted) setError("通信エラーが発生しました");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const saveData = useCallback(
    async (data: typeof formData) => {
      if (!flyer) return;
      // 必須項目が空のまま自動保存しようとすると 400 になるので、UIで明示的にスキップ
      if (!data.name.trim()) return;
      if (!data.distributionMethod) return;

      setIsSaving(true);
      setError("");
      setSaveSuccess(false);
      try {
        // distributionMethod は必須なので、空文字をAPIに送ると 400 で弾かれる。
        // チラシ画像（imageUrl）も同様だが、こちらは画像専用ハンドラ側で管理。
        const response = await fetch(`/api/flyers/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            description: data.description || null,
            distributionMethod: data.distributionMethod,
            distributionQuantity: data.distributionQuantity || null,
            distributionPeriod: data.distributionPeriod || null,
            budget: data.budget || null,
          }),
        });
        const json = await response.json();
        if (!response.ok) {
          setError(json.error || "保存に失敗しました");
          return;
        }
        setFlyer((prev) => (prev ? { ...prev, ...json.flyer } : json.flyer));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch {
        setError("通信エラーが発生しました");
      } finally {
        setIsSaving(false);
      }
    },
    [id, flyer]
  );

  // フォーム値が変わるたびに 1 秒の debounce で自動保存
  useEffect(() => {
    if (isInitialLoad.current) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      saveData(formData);
    }, 1000);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [formData, saveData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // チラシ画像（表 / 裏）アップロード
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side: "front" | "back"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isFront = side === "front";
    if (isFront) setUploadingFront(true);
    else setUploadingBack(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      if (!uploadRes.ok) throw new Error("upload failed");
      const { url } = await uploadRes.json();

      const patchRes = await fetch(`/api/flyers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isFront ? { imageUrl: url } : { imageUrl2: url }),
      });
      if (!patchRes.ok) throw new Error("save failed");
      const data = await patchRes.json();
      setFlyer((prev) => (prev ? { ...prev, ...data.flyer } : data.flyer));
    } catch {
      setError("画像のアップロードに失敗しました");
    } finally {
      if (isFront) setUploadingFront(false);
      else setUploadingBack(false);
      // 同じファイルを再選択できるよう input をクリア
      e.target.value = "";
    }
  };

  const handleImageRemove = async (side: "front" | "back") => {
    const isFront = side === "front";
    // 表面画像は必須なので「削除」は不可（差し替えのみ可）。ガード。
    if (isFront) {
      setError(
        "チラシ表面の画像は必須のため削除できません。差し替えるには、もう一度アップロードしてください。"
      );
      return;
    }
    try {
      const res = await fetch(`/api/flyers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl2: null }),
      });
      if (!res.ok) throw new Error("remove failed");
      const data = await res.json();
      setFlyer((prev) => (prev ? { ...prev, ...data.flyer } : data.flyer));
    } catch {
      setError("画像の削除に失敗しました");
    }
  };

  const handleDelete = async () => {
    if (!flyer) return;
    const channelCount = flyer.channels.length;
    // 配下QRが残っていれば削除不可（先にQRを別チラシへ移動 or 非表示にしてもらう）
    if (channelCount > 0) {
      setError(
        `このチラシには${channelCount}件のQRが紐付いています。先にQRを別のチラシへ移動するか、非表示にしてからチラシを削除してください。`
      );
      return;
    }
    if (!confirm(`「${flyer.name}」を削除しますか？`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/flyers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "削除に失敗しました");
        setIsDeleting(false);
        return;
      }
      router.push("/dashboard/flyers");
    } catch {
      setError("通信エラーが発生しました");
      setIsDeleting(false);
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
        チラシが見つかりません
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/flyers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              戻る
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">チラシ編集</h1>
        </div>
        {/* 保存中/保存成功インジケータ */}
        <div className="text-sm">
          {isSaving && (
            <span className="text-gray-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              保存中...
            </span>
          )}
          {!isSaving && saveSuccess && (
            <span className="text-green-600 flex items-center gap-1">
              <Check className="w-3 h-3" />
              保存しました
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>チラシ情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              チラシ名 <span className="text-rose-600 text-xs">必須</span>
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="例: 2024年春チラシ"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="distributionMethod">
                配布方法 <span className="text-rose-600 text-xs">必須</span>
              </Label>
              <select
                id="distributionMethod"
                name="distributionMethod"
                value={formData.distributionMethod}
                onChange={handleChange}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">選択してください</option>
                {METHOD_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              {!formData.distributionMethod && (
                <p className="text-xs text-rose-600">
                  ⚠️ 配布方法が未設定です。効果分析のため必ず選択してください。
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="distributionPeriod">配布期間（任意）</Label>
              <Input
                id="distributionPeriod"
                name="distributionPeriod"
                placeholder="例: 2024年1月〜3月"
                value={formData.distributionPeriod}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="distributionQuantity">配布枚数（任意）</Label>
              <div className="relative">
                <Input
                  id="distributionQuantity"
                  name="distributionQuantity"
                  type="number"
                  min="0"
                  placeholder="例: 5000"
                  value={formData.distributionQuantity}
                  onChange={handleChange}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  枚
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">予算（任意）</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ¥
                </span>
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  min="0"
                  placeholder="例: 50000"
                  value={formData.budget}
                  onChange={handleChange}
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          {/* 備考 */}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>チラシ画像</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImageUploader
              label="表面（必須）"
              url={flyer.imageUrl}
              isUploading={uploadingFront}
              onUpload={(e) => handleImageUpload(e, "front")}
              onRemove={() => handleImageRemove("front")}
            />
            <ImageUploader
              label="裏面（任意）"
              url={flyer.imageUrl2}
              isUploading={uploadingBack}
              onUpload={(e) => handleImageUpload(e, "back")}
              onRemove={() => handleImageRemove("back")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle>このチラシに紐付いているQR（{flyer.channels.length}件）</CardTitle>
          {/* このチラシ配下にQRを追加するボタン（Phase 2 でのQR新規作成の主導線） */}
          <Link href={`/dashboard/flyers/${id}/channels/new`}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1" />
              このチラシにQRを追加
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {flyer.channels.length === 0 ? (
            <p className="text-sm text-gray-500">
              まだQRが紐付いていません。「このチラシにQRを追加」ボタンから作成してください。
            </p>
          ) : (
            <div className="divide-y">
              {flyer.channels.map((ch) => (
                <div
                  key={ch.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{ch.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {ch.channelType === "diagnosis" ? "診断付きQR" : "リンク型QR"}
                      {!ch.isActive && (
                        <span className="ml-2 text-gray-400">（非表示）</span>
                      )}
                    </div>
                  </div>
                  <Link href={`/dashboard/channels/${ch.id}`}>
                    <Button variant="outline" size="sm">
                      QR詳細
                      <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardContent className="py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm">
            <div className="font-medium text-red-600">チラシを削除する</div>
            <div className="text-xs text-gray-500 mt-1">
              紐付いているQRが残っている場合は削除できません。先にQRを別のチラシへ移動するか非表示にしてください。
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={handleDelete}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                削除中...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-1" />
                チラシを削除
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ImageUploader({
  label,
  url,
  isUploading,
  onUpload,
  onRemove,
}: {
  label: string;
  url: string | null;
  isUploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {url ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            className="w-full h-40 object-cover rounded border"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRemove}
            className="absolute top-2 right-2 bg-white/90 hover:bg-white"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            削除
          </Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition-colors">
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          ) : (
            <>
              <ImageIcon className="w-8 h-8 text-gray-300" />
              <span className="text-xs text-gray-500 mt-2 flex items-center">
                <Upload className="w-3 h-3 mr-1" />
                クリックして画像をアップロード
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={onUpload}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
