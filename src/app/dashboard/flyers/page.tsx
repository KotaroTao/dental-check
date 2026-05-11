"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Image as ImageIcon,
  Plus,
  Pencil,
  Loader2,
} from "lucide-react";

interface Flyer {
  id: string;
  name: string;
  distributionMethod: string | null;
  distributionQuantity: number | null;
  distributionPeriod: string | null;
  budget: number | null;
  imageUrl: string | null;
  imageUrl2: string | null;
  channelCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function FlyersListPage() {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await fetch("/api/flyers");
        if (!response.ok) {
          if (mounted) setError("チラシ一覧の取得に失敗しました");
          return;
        }
        const data = await response.json();
        if (mounted) setFlyers(data.flyers);
      } catch {
        if (mounted) setError("通信エラーが発生しました");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">チラシ管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            1枚のチラシに複数のQRを掲載する場合は、チラシを作成して各QRを紐付けてください。
          </p>
        </div>
        <Link href="/dashboard/flyers/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" />
            新規チラシ作成
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {flyers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500 space-y-3">
            <p>まだチラシが登録されていません。</p>
            <p className="text-xs text-gray-400">
              ※チラシを使わずに各QRに直接「配布枚数」「予算」を入力することもできます。
              <br />
              チラシ機能は、1枚のチラシに複数のQRを掲載するときに便利です。
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flyers.map((f) => (
            <Card key={f.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="truncate">{f.name}</span>
                  <Link href={`/dashboard/flyers/${f.id}`}>
                    <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs">
                      <Pencil className="w-3 h-3 mr-1" />
                      編集
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex gap-2">
                  <FlyerThumb url={f.imageUrl} alt="表" />
                  <FlyerThumb url={f.imageUrl2} alt="裏" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Stat
                    label="配布枚数"
                    value={f.distributionQuantity !== null ? `${f.distributionQuantity.toLocaleString()}枚` : "—"}
                  />
                  <Stat
                    label="予算"
                    value={f.budget !== null ? `¥${f.budget.toLocaleString()}` : "—"}
                  />
                  <Stat label="配布方法" value={f.distributionMethod || "—"} />
                  <Stat label="配布期間" value={f.distributionPeriod || "—"} />
                </div>
                <div className="text-xs text-gray-500">
                  紐付けQR: <span className="font-medium text-gray-800">{f.channelCount}件</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FlyerThumb({ url, alt }: { url: string | null; alt: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt}
        className="w-20 h-20 object-cover rounded border"
      />
    );
  }
  return (
    <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center">
      <ImageIcon className="w-6 h-6 text-gray-300" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded px-2 py-1.5">
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className="text-xs font-medium truncate">{value}</div>
    </div>
  );
}
