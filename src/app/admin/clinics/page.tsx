"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Users, QrCode, CheckCircle, Eye, EyeOff, Trash2, Plus, X, Copy, Send, LogIn, MessageSquare, RotateCcw, AlertTriangle, Search } from "lucide-react";

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
  email: string | null;
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
  ctaConfigured: boolean;
  invitationStatus: "none" | "pending" | "used";
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
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // 検索
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  // 新規作成モーダル
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", planType: "starter" });
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ inviteUrl: string; clinicName: string } | null>(null);

  // 送信文面モーダル
  const [messageClinic, setMessageClinic] = useState<Clinic | null>(null);
  const [editableMessage, setEditableMessage] = useState("");

  const fetchClinics = async (search?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ hidden: String(activeTab === "hidden") });
      if (search) {
        params.set("search", search);
      }
      const response = await fetch(`/api/admin/clinics?${params}`);
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
    fetchClinics(debouncedSearch);
  }, [activeTab, debouncedSearch]);

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
        setEditableMessage(getInviteMessage(data.clinic.name, data.inviteUrl));
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

  const getInviteMessage = (clinicName: string, inviteUrl: string) => {
    return `${clinicName}様

QRくるくる診断DXのアカウントをご用意いたしました。
以下のURLからメールアドレスとパスワードを設定してください。

▼ アカウント設定URL
${inviteUrl}

設定完了後、以下のログインページからログインできます。

▼ ログインページ
https://qrqr-dental.com/login

ご不明な点がございましたらお気軽にお問い合わせください。`;
  };

  const openMessageModal = (clinic: Clinic) => {
    setMessageClinic(clinic);
    setEditableMessage(getInviteMessage(clinic.name, clinic.inviteUrl!));
  };

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setMessage({ type: "success", text: "コピーしました" });
  };

  const handleImpersonate = async (clinicId: string) => {
    try {
      const response = await fetch(`/api/admin/clinics/${clinicId}/impersonate`, {
        method: "POST",
      });

      if (response.ok) {
        // 別タブでダッシュボードを開く
        window.open("/dashboard", "_blank");
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
    if (!deletePassword) {
      setDeleteError("パスワードを入力してください");
      return;
    }
    setIsUpdating(true);
    setDeleteError("");

    try {
      const response = await fetch(`/api/admin/clinics/${clinicId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: "success", text: data.message });
        setConfirmDelete(null);
        setDeletePassword("");
        fetchClinics();
      } else {
        const data = await response.json();
        setDeleteError(data.error || "削除に失敗しました");
      }
    } catch {
      setDeleteError("通信エラーが発生しました");
    } finally {
      setIsUpdating(false);
    }
  };

  const getCtaBadge = (clinic: Clinic) => {
    if (clinic.ctaConfigured) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
          <CheckCircle className="w-3 h-3" />
          設定済み
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700">
        <AlertTriangle className="w-3 h-3" />
        未設定
      </span>
    );
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
    setCreateForm({ name: "", planType: "starter" });
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

      {/* 検索 */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="医院名・メールアドレスで検索..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(""); setDebouncedSearch(""); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
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
        <>
        <div className="space-y-3 md:hidden">
          {clinics.map((clinic) => (
            <div key={clinic.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-medium">{clinic.name}</div>
                  <div className="text-xs text-gray-500">{clinic.email || "メール未設定"}</div>
                </div>
                <span className="text-xs text-gray-500">{getPlanName(clinic.subscription?.planType || "starter")}</span>
              </div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {getCtaBadge(clinic)}
                {getInviteBadge(clinic)}
                {clinic.invitationStatus === "pending" && clinic.inviteUrl && (
                  <button
                    onClick={() => openMessageModal(clinic)}
                    className="p-1 text-gray-400 hover:text-blue-600 rounded"
                    title="送信文面を表示"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="text-xs text-gray-400 ml-auto flex items-center gap-2">
                  <span className="flex items-center gap-0.5"><QrCode className="w-3 h-3" />{clinic.channelCount}</span>
                  <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{clinic.sessionCount}</span>
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {editingClinic === clinic.id ? (
                  <>
                    <select
                      value={selectedPlan}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className="border rounded px-2 py-1 text-sm flex-1"
                    >
                      <option value="">選択...</option>
                      {availablePlans.map((plan) => (
                        <option key={plan.type} value={plan.type}>
                          {plan.name} ({plan.price === 0 ? "無料" : `¥${plan.price.toLocaleString()}`})
                        </option>
                      ))}
                    </select>
                    <Button size="sm" onClick={() => handleUpdatePlan(clinic.id)} disabled={isUpdating || !selectedPlan}>
                      {isUpdating ? "..." : "保存"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingClinic(null); setSelectedPlan(""); }}>
                      取消
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleImpersonate(clinic.id)} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                      <LogIn className="w-3 h-3 mr-1" />ログイン
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingClinic(clinic.id); setSelectedPlan(clinic.subscription?.planType || "starter"); }}>
                      プラン変更
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleToggleHidden(clinic.id, clinic.isHidden)} disabled={isUpdating}>
                      {clinic.isHidden ? <><Eye className="w-3 h-3 mr-1" />表示</> : <><EyeOff className="w-3 h-3 mr-1" />非表示</>}
                    </Button>
                    {activeTab === "hidden" && (
                      <Button size="sm" variant="destructive" onClick={() => { setConfirmDelete(clinic.id); setDeletePassword(""); setDeleteError(""); }} disabled={isUpdating}>
                        <Trash2 className="w-3 h-3 mr-1" />削除
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          {clinics.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {activeTab === "active" ? "表示中の医院がありません" : "非表示の医院がありません"}
            </div>
          )}
        </div>

        {/* デスクトップ: テーブル表示 */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">医院名</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">プラン</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">CTA</th>
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
                      <div className="font-medium">{clinic.name}</div>
                      <div className="text-sm text-gray-500">{clinic.email || "メール未設定"}</div>
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
                  <td className="px-4 py-3 text-center">
                    {getCtaBadge(clinic)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getInviteBadge(clinic)}
                      {clinic.invitationStatus === "pending" && clinic.inviteUrl && (
                        <button
                          onClick={() => openMessageModal(clinic)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                          title="送信文面を表示"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
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
                              onClick={() => { setConfirmDelete(clinic.id); setDeletePassword(""); setDeleteError(""); }}
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
        </>
      )}

      {/* 削除確認モーダル */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => { setConfirmDelete(null); setDeletePassword(""); setDeleteError(""); }}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">医院を完全削除</h2>
                <p className="text-sm text-gray-500">
                  {clinics.find(c => c.id === confirmDelete)?.name}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              この操作は取り消せません。関連するすべてのデータが削除されます。続行するには管理者パスワードを入力してください。
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleDelete(confirmDelete);
              }}
            >
              <div className="space-y-2 mb-4">
                <Label htmlFor="delete-password">管理者パスワード</Label>
                <Input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(""); }}
                  placeholder="パスワードを入力"
                  autoFocus
                  disabled={isUpdating}
                />
                {deleteError && (
                  <p className="text-sm text-red-600">{deleteError}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="destructive"
                  className="flex-1"
                  disabled={isUpdating || !deletePassword}
                >
                  {isUpdating ? "削除中..." : "完全に削除する"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setConfirmDelete(null); setDeletePassword(""); setDeleteError(""); }}
                  disabled={isUpdating}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 送信文面モーダル */}
      {messageClinic && messageClinic.inviteUrl && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setMessageClinic(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{messageClinic.name} - 招待文面</h2>
              <button
                onClick={() => setMessageClinic(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              value={editableMessage}
              onChange={(e) => setEditableMessage(e.target.value)}
              className="w-full text-sm bg-white border rounded-lg p-3 text-gray-700 font-sans leading-relaxed resize-none break-all"
              rows={14}
            />

            <div className="flex gap-2 mt-4">
              <Button
                className="flex-1 gap-1"
                onClick={() => {
                  handleCopyText(editableMessage);
                  setMessageClinic(null);
                }}
              >
                <Copy className="w-3.5 h-3.5" />
                文面をコピー
              </Button>
              <Button
                variant="outline"
                className="gap-1"
                onClick={() => setEditableMessage(getInviteMessage(messageClinic.name, messageClinic.inviteUrl!))}
                title="デフォルト文面に戻す"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 新規作成モーダル */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeCreateModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6"
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
                    文面を編集してコピーしてください
                  </p>
                </div>

                <textarea
                  value={editableMessage}
                  onChange={(e) => setEditableMessage(e.target.value)}
                  className="w-full text-sm bg-white border rounded-lg p-3 text-gray-700 font-sans leading-relaxed resize-none break-all"
                  rows={14}
                />

                <div className="flex gap-2 mt-4">
                  <Button
                    className="flex-1 gap-1"
                    onClick={() => handleCopyText(editableMessage)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    文面をコピー
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1"
                    onClick={() => setEditableMessage(getInviteMessage(createResult.clinicName, createResult.inviteUrl))}
                    title="デフォルト文面に戻す"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" onClick={closeCreateModal}>
                    閉じる
                  </Button>
                </div>
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
                    作成後、招待URLが発行されます。クライアントがURLを開くと、
                    メールアドレスとパスワードを設定してログインできるようになります。
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
