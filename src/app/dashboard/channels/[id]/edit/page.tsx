"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

// 診断タイプの表示名
const DIAGNOSIS_TYPE_NAMES: Record<string, string> = {
  "oral-age": "お口年齢診断",
  "child-orthodontics": "子供の矯正タイミングチェック",
};

interface Channel {
  id: string;
  name: string;
  description: string | null;
  diagnosisTypeSlug: string;
  isActive: boolean;
}

export default function EditChannelPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchChannel = async () => {
      try {
        const response = await fetch(`/api/channels/${id}`);
        if (response.ok) {
          const data = await response.json();
          setChannel(data.channel);
          setFormData({
            name: data.channel.name,
            description: data.channel.description || "",
            isActive: data.channel.isActive,
          });
        } else {
          setError("経路が見つかりません");
        }
      } catch {
        setError("データの取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannel();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked,
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("経路名を入力してください");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/channels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "経路の更新に失敗しました");
        return;
      }

      router.push(`/dashboard/channels/${id}`);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-gray-500">読み込み中...</div>;
  }

  if (!channel) {
    return (
      <div className="max-w-xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          ダッシュボードに戻る
        </Link>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-red-600">{error || "経路が見つかりません"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href={`/dashboard/channels/${id}`}
        className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        経路詳細に戻る
      </Link>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-xl font-bold mb-6">経路を編集</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              経路名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="例: チラシ①（駅前配布）"
              value={formData.name}
              onChange={handleChange}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label>診断タイプ</Label>
            <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-600">
              {DIAGNOSIS_TYPE_NAMES[channel.diagnosisTypeSlug] || channel.diagnosisTypeSlug}
            </div>
            <p className="text-xs text-gray-500">
              診断タイプは変更できません
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明（任意）</Label>
            <textarea
              id="description"
              name="description"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="例: 2024年1月から駅前で配布するチラシ用"
              value={formData.description}
              onChange={handleChange}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              disabled={isSaving}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              この経路を有効にする
            </Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isSaving} className="flex-1">
              {isSaving ? "保存中..." : "変更を保存"}
            </Button>
            <Link href={`/dashboard/channels/${id}`}>
              <Button type="button" variant="outline" disabled={isSaving}>
                キャンセル
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
