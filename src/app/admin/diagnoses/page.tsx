"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";
import { useToast, Toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface DiagnosisType {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  questions: unknown[];
  resultPatterns: unknown[];
  isActive: boolean;
  createdAt: string;
}

export default function AdminDiagnosesPage() {
  const [diagnoses, setDiagnoses] = useState<DiagnosisType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { toast, showToast, hideToast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    variant?: "danger" | "default";
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    fetchDiagnoses();
  }, []);

  const fetchDiagnoses = async () => {
    try {
      const response = await fetch("/api/admin/diagnoses");
      if (response.ok) {
        const data = await response.json();
        setDiagnoses(data.diagnoses);
      } else {
        setError("診断の取得に失敗しました");
      }
    } catch {
      setError("診断の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmDialog({
      title: "診断を削除しますか？",
      message: `「${name}」を削除します。この操作は取り消せません。`,
      confirmText: "削除する",
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const response = await fetch(`/api/admin/diagnoses/${id}`, {
            method: "DELETE",
          });

          if (response.ok) {
            setDiagnoses(diagnoses.filter((d) => d.id !== id));
            showToast("success", "診断を削除しました");
          } else {
            showToast("error", "削除に失敗しました");
          }
        } catch {
          showToast("error", "削除に失敗しました");
        }
      },
    });
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/diagnoses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        setDiagnoses(
          diagnoses.map((d) =>
            d.id === id ? { ...d, isActive: !currentStatus } : d
          )
        );
        showToast("success", currentStatus ? "非公開にしました" : "公開しました");
      } else {
        showToast("error", "更新に失敗しました");
      }
    } catch {
      showToast("error", "更新に失敗しました");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div>
      <Toast toast={toast} onClose={hideToast} />
      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.title || ""}
        message={confirmDialog?.message || ""}
        confirmText={confirmDialog?.confirmText}
        variant={confirmDialog?.variant}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">診断管理</h1>
        <Link href="/admin/diagnoses/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            新規作成
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {diagnoses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            診断がありません。「新規作成」ボタンから作成してください。
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {diagnoses.map((diagnosis) => (
            <Card key={diagnosis.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {diagnosis.name}
                      {!diagnosis.isActive && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                          非公開
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      スラッグ: {diagnosis.slug}
                    </p>
                    <a
                      href={`/demo/${diagnosis.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      診断ページを開く
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(diagnosis.id, diagnosis.isActive)}
                      title={diagnosis.isActive ? "非公開にする" : "公開する"}
                    >
                      {diagnosis.isActive ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </Button>
                    <Link href={`/admin/diagnoses/${diagnosis.id}`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(diagnosis.id, diagnosis.name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {diagnosis.description && (
                  <p className="text-gray-600 text-sm mb-3">
                    {diagnosis.description}
                  </p>
                )}
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>設問数: {(diagnosis.questions as unknown[]).length}</span>
                  <span>結果パターン: {(diagnosis.resultPatterns as unknown[]).length}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
