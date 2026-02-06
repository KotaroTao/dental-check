"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Users, QrCode, CheckCircle, AlertCircle, Clock, Eye, EyeOff, Trash2, ExternalLink, Plus, X, Copy, RefreshCw, Send, Mail, LogIn } from "lucide-react";

interface Plan {
  type: string;
  name: string;
  price: number;
  qrCodeLimit: number | null;
  isAdminOnly?: boolean;
}

interface Clinic {
  id: string;
  slug: string;
  name: string;
  email: string;
  status: string;
  isHidden: boolean;
  createdAt: string;
  subscription: {
    status: string;
    planType: string;
    trialEnd: string | null;
    currentPeriodEnd: string | null;
  } | null;
  channelCount: number;
  sessionCount: number;
  invitationStatus: "none" | "pending" | "expired" | "used";
  inviteUrl: string | null;
}

type TabType = "active" | "hidden";

export default function AdminClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingClinic, setEditingClinic] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // 新規作成モーダル
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", phone: "", planType: "starter" });
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ inviteUrl: string; clinicName: string } | null>(null);

  // 招待URL表示
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchClinics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/clinics?hidden=${activeTab === "hidden"}`);
      if (response.ok) {
        const data = await response.json();
        setClinics(data.clinics);
        setAvailablePlans(data.availablePlans || []);
      }
    } catch (error) {
      console.error("Failed to fetch clinics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchClinics();
  }, [activeTab]);

  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (response.ok) {
        setCreateResult({ inviteUrl: data.inviteUrl, clinicName: data.clinic.name });
        fetchClinics();
      } else {
        setMessage({ type: "error", text: data.error || "作成に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleResendInvite = async (clinicId: string) => {
    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/clinics/${clinicId}/invite`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: data.message });
        fetchClinics();
      } else {
        setMessage({ type: "error", text: data.error || "発行に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyInviteUrl = async (clinicId: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(clinicId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedId(clinicId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleImpersonate = async (clinicId: string) => {
    try {
      const response = await fetch(`/api/admin/clinics/${clinicId}/impersonate`, {
        method: "POST",
      });

      if (response.ok) {
        // ダッシュボードに遷移
        window.location.href = "/dashboard";
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "ログインに失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    }
  };

  const handleUpdatePlan = async (clinicId: string) => {
    if (!selectedPlan) return;

    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/clinics/${clinicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType: selectedPlan }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: "success", text: data.message });
        setEditingClinic(null);
        setSelectedPlan("");
        fetchClinics();
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "更新に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleHidden = async (clinicId: string, currentlyHidden: boolean) => {
    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/clinics/${clinicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !currentlyHidden }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: "success", text: data.message });
        fetchClinics();
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "更新に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (clinicId: string) => {
    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/clinics/${clinicId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: "success", text: data.message });
        setConfirmDelete(null);
        fetchClinics();
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "削除に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (clinic: Clinic) => {
    if (clinic.status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
          <Mail className="w-3 h-3" />
          招待中
        </span>
      );
    }

    const status = clinic.subscription?.status || "unknown";
    switch (status) {
      case "trial":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
            <AlertCircle className="w-3 h-3" />
            トライアル
          </span>
        );
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            有効
          </span>
        );
      case "expired":
      case "grace_period":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">
            <Clock className="w-3 h-3" />
            期限切れ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const getInviteBadge = (clinic: Clinic) => {
    switch (clinic.invitationStatus) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">
            <Send className="w-3 h-3" />
            未設定
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">
            <Clock className="w-3 h-3" />
            期限切れ
          </span>
        );
      case "used":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            設定済み
          </span>
        );
      default:
        return null;
    }
  };

  const getPlanName = (planType: string) => {
    const plan = availablePlans.find((p) => p.type === planType);
    return plan?.name || planType;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP");
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm({ name: "", email: "", phone: "", planType: "starter" });
    setCreateResult(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          医院管理
        </h1>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          新規作成
        </Button>
      </div>

      {/* タブ切り替え */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "active"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          <Eye className="w-4 h-4 inline mr-2" />
          表示中の医院
        </button>
        <button
          onClick={() => setActiveTab("hidden")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "hidden"
              ? "bg-gray-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          <EyeOff className="w-4 h-4 inline mr-2" />
          非表示の医院
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg mb-6 ${
            message.type === "success"
              ? "bg-green-50 text-green-600"
              : "bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-500">読み込み中...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">医院名</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">プラン</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ステータス</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">招待</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                  <QrCode className="w-4 h-4 inline" />
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                  <Users className="w-4 h-4 inline" />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">登録日</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clinics.map((clinic) => (
                <tr key={clinic.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">
                        <Link
                          href={`/admin/clinics/${clinic.id}`}
                          className="hover:text-blue-600 hover:underline"
                        >
                          {clinic.name}
                        </Link>
                      </div>
                      <div className="text-sm text-gray-500">{clinic.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingClinic === clinic.id ? (
                      <select
                        value={selectedPlan}
                        onChange={(e) => setSelectedPlan(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="">選択...</option>
                        {availablePlans.map((plan) => (
                          <option key={plan.type} value={plan.type}>
                            {plan.name} ({plan.price === 0 ? "無料" : `¥${plan.price.toLocaleString()}`})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm">
                        {getPlanName(clinic.subscription?.planType || "starter")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(clinic)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getInviteBadge(clinic)}
                      {clinic.invitationStatus === "pending" && clinic.inviteUrl && (
                        <button
                          onClick={() => handleCopyInviteUrl(clinic.id, clinic.inviteUrl!)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                          title="招待URLをコピー"
                        >
                          {copiedId === clinic.id ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                      {(clinic.invitationStatus === "expired" || (clinic.status === "pending" && clinic.invitationStatus !== "pending")) && (
                        <button
                          onClick={() => handleResendInvite(clinic.id)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                          title="招待URLを再発行"
                          disabled={isUpdating}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm">{clinic.channelCount}</td>
                  <td className="px-4 py-3 text-center text-sm">{clinic.sessionCount}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(clinic.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end flex-wrap">
                      {editingClinic === clinic.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleUpdatePlan(clinic.id)}
                            disabled={isUpdating || !selectedPlan}
                          >
                            {isUpdating ? "..." : "保存"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingClinic(null);
                              setSelectedPlan("");
                            }}
                            disabled={isUpdating}
                          >
                            キャンセル
                          </Button>
                        </>
                      ) : confirmDelete === clinic.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(clinic.id)}
                            disabled={isUpdating}
                          >
                            {isUpdating ? "..." : "削除確定"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmDelete(null)}
                            disabled={isUpdating}
                          >
                            キャンセル
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleImpersonate(clinic.id)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <LogIn className="w-3 h-3 mr-1" />
                            ログイン
                          </Button>
                          <Link href={`/admin/clinics/${clinic.id}`}>
                            <Button size="sm" variant="outline">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              詳細
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingClinic(clinic.id);
                              setSelectedPlan(clinic.subscription?.planType || "starter");
                            }}
                          >
                            プラン変更
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleHidden(clinic.id, clinic.isHidden)}
                            disabled={isUpdating}
                          >
                            {clinic.isHidden ? (
                              <>
                                <Eye className="w-3 h-3 mr-1" />
                                表示
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3 mr-1" />
                                非表示
                              </>
                            )}
                          </Button>
                          {activeTab === "hidden" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setConfirmDelete(clinic.id)}
                              disabled={isUpdating}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              削除
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {clinics.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {activeTab === "active"
                ? "表示中の医院がありません"
                : "非表示の医院がありません"}
            </div>
          )}
        </div>
      )}

      {/* 新規作成モーダル */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeCreateModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {createResult ? (
              <div>
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h2 className="text-lg font-bold">{createResult.clinicName} を作成しました</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    以下の招待URLをクライアントに共有してください
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-500 mb-1">招待URL（7日間有効）</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={createResult.inviteUrl}
                      className="flex-1 text-sm bg-white border rounded px-2 py-1.5 text-gray-700"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(createResult.inviteUrl);
                        setMessage({ type: "success", text: "コピーしました" });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-4">
                  クライアントがこのURLを開くとパスワード設定画面が表示されます。
                  設定完了後、ログインできるようになります。
                </p>

                <Button className="w-full" onClick={closeCreateModal}>
                  閉じる
                </Button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">新規医院アカウント作成</h2>
                  <button
                    onClick={closeCreateModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateClinic} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-name">
                      医院名 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="create-name"
                      placeholder="例: ○○歯科クリニック"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      disabled={isCreating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-email">
                      メールアドレス <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="create-email"
                      type="email"
                      placeholder="example@clinic.com"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      disabled={isCreating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-phone">電話番号（任意）</Label>
                    <Input
                      id="create-phone"
                      placeholder="03-1234-5678"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      disabled={isCreating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-plan">プラン</Label>
                    <select
                      id="create-plan"
                      value={createForm.planType}
                      onChange={(e) => setCreateForm({ ...createForm, planType: e.target.value })}
                      disabled={isCreating}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {availablePlans.map((plan) => (
                        <option key={plan.type} value={plan.type}>
                          {plan.name} ({plan.price === 0 ? "無料" : `¥${plan.price.toLocaleString()}/月`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                    作成後、パスワード設定用の招待URLが発行されます。
                    URLをクライアントに共有してください。
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={isCreating}>
                      {isCreating ? "作成中..." : "アカウントを作成"}
                    </Button>
                    <Button type="button" variant="outline" onClick={closeCreateModal} disabled={isCreating}>
                      キャンセル
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
