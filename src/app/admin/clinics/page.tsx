"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2, Users, QrCode, CheckCircle, AlertCircle, Clock, Eye, EyeOff, Trash2, ExternalLink, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

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
}

type TabType = "active" | "hidden";

export default function AdminClinicsPage() {
  const router = useRouter();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingClinic, setEditingClinic] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

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

  const handleLoginAsClinic = async (clinicId: string) => {
    setLoggingIn(clinicId);
    try {
      const response = await fetch(`/api/admin/clinics/${clinicId}/login`, {
        method: "POST",
      });

      if (response.ok) {
        // ダッシュボードに遷移
        router.push("/dashboard");
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "ログインに失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setLoggingIn(null);
    }
  };

  const getStatusBadge = (status: string) => {
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

  const getPlanName = (planType: string) => {
    const plan = availablePlans.find((p) => p.type === planType);
    return plan?.name || planType;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          医院管理
        </h1>
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
                    {getStatusBadge(clinic.subscription?.status || "unknown")}
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
                            variant="default"
                            onClick={() => handleLoginAsClinic(clinic.id)}
                            disabled={loggingIn === clinic.id}
                          >
                            <LogIn className="w-3 h-3 mr-1" />
                            {loggingIn === clinic.id ? "..." : "ログイン"}
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
    </div>
  );
}
