"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Building2, Users, QrCode, CheckCircle, AlertCircle, Clock } from "lucide-react";

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

export default function AdminClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingClinic, setEditingClinic] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    try {
      const response = await fetch("/api/admin/clinics");
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

  if (isLoading) {
    return <div className="text-gray-500">読み込み中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          医院管理
        </h1>
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
                    <div className="font-medium">{clinic.name}</div>
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
                  {editingClinic === clinic.id ? (
                    <div className="flex gap-2 justify-end">
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
                    </div>
                  ) : (
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
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {clinics.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            登録されている医院がありません
          </div>
        )}
      </div>
    </div>
  );
}
