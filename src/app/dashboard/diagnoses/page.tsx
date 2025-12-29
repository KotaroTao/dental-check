"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Eye, Lock } from "lucide-react";

interface DiagnosisType {
  id: string;
  slug: string;
  clinicId: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function DiagnosesPage() {
  const [diagnoses, setDiagnoses] = useState<DiagnosisType[]>([]);
  const [canCreateCustomDiagnosis, setCanCreateCustomDiagnosis] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchDiagnoses();
  }, []);

  const fetchDiagnoses = async () => {
    try {
      const response = await fetch("/api/dashboard/diagnoses");
      if (response.ok) {
        const data = await response.json();
        setDiagnoses(data.diagnoses);
        setCanCreateCustomDiagnosis(data.canCreateCustomDiagnosis);
      }
    } catch (error) {
      console.error("Failed to fetch diagnoses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/dashboard/diagnoses/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setDiagnoses(diagnoses.filter((d) => d.id !== id));
        setDeleteConfirm(null);
      } else {
        const data = await response.json();
        alert(data.error || "削除に失敗しました");
      }
    } catch {
      alert("削除に失敗しました");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  const systemDiagnoses = diagnoses.filter((d) => d.clinicId === null);
  const customDiagnoses = diagnoses.filter((d) => d.clinicId !== null);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">診断管理</h1>
        {canCreateCustomDiagnosis ? (
          <Link href="/dashboard/diagnoses/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              オリジナル診断を作成
            </Button>
          </Link>
        ) : (
          <Button disabled className="gap-2">
            <Lock className="w-4 h-4" />
            カスタムプラン以上で利用可能
          </Button>
        )}
      </div>

      {/* デフォルト診断 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">デフォルト診断</h2>
        <div className="bg-white rounded-lg shadow divide-y">
          {systemDiagnoses.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              デフォルト診断がありません
            </div>
          ) : (
            systemDiagnoses.map((diagnosis) => (
              <div key={diagnosis.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{diagnosis.name}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      デフォルト
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {diagnosis.description || "説明なし"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    スラッグ: {diagnosis.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/d/${diagnosis.slug}?demo=true`} target="_blank">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* オリジナル診断 */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-gray-700">オリジナル診断</h2>
        <div className="bg-white rounded-lg shadow divide-y">
          {customDiagnoses.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {canCreateCustomDiagnosis ? (
                <>
                  オリジナル診断がありません。
                  <Link href="/dashboard/diagnoses/new" className="text-blue-600 ml-1 hover:underline">
                    作成する
                  </Link>
                </>
              ) : (
                "カスタムプラン以上でオリジナル診断を作成できます"
              )}
            </div>
          ) : (
            customDiagnoses.map((diagnosis) => (
              <div key={diagnosis.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{diagnosis.name}</h3>
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                      オリジナル
                    </span>
                    {!diagnosis.isActive && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                        非公開
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {diagnosis.description || "説明なし"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    スラッグ: {diagnosis.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/d/${diagnosis.slug}?demo=true`} target="_blank">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                  {canCreateCustomDiagnosis && (
                    <>
                      <Link href={`/dashboard/diagnoses/${diagnosis.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      {deleteConfirm === diagnosis.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(diagnosis.id)}
                          >
                            削除
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteConfirm(null)}
                          >
                            キャンセル
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirm(diagnosis.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* プランアップグレード案内 */}
      {!canCreateCustomDiagnosis && (
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
          <h3 className="font-semibold text-lg mb-2">オリジナル診断を作成しませんか？</h3>
          <p className="text-gray-600 mb-4">
            カスタムプラン以上にアップグレードすると、医院独自の診断コンテンツを作成できます。
            患者様により適切なアドバイスを提供し、来院率向上につなげましょう。
          </p>
          <Link href="/dashboard/billing">
            <Button>プランをアップグレード</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
