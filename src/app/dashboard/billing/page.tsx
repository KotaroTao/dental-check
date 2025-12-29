"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertCircle, CheckCircle, XCircle, Check, Clock } from "lucide-react";

interface CardInfo {
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
}

interface Plan {
  type: string;
  name: string;
  price: number;
  qrCodeLimit: number | null;
  features: string[];
  description: string;
}

interface SubscriptionInfo {
  status: string;
  planType: string;
  planName: string;
  trialEnd: string | null;
  trialDaysLeft: number | null;
  gracePeriodDaysLeft: number | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  hasCard: boolean;
  card: CardInfo | null;
  planAmount: number;
  qrCodeLimit: number | null;
  qrCodeCount: number;
  remainingQRCodes: number | null;
  canCreateQR: boolean;
  canTrack: boolean;
  message: string | null;
  alertType: "info" | "warning" | "error" | null;
}

declare global {
  interface Window {
    Payjp?: (key: string) => {
      createToken: (
        cardElement: unknown,
        callback: (status: number, response: { id?: string; error?: { message: string } }) => void
      ) => void;
      elements: () => {
        create: (type: string, options?: Record<string, unknown>) => unknown;
      };
    };
  }
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardElement, setCardElement] = useState<unknown>(null);
  const [payjpInstance, setPayjpInstance] = useState<ReturnType<NonNullable<typeof window.Payjp>> | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      const response = await fetch("/api/billing/subscription");
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
        setAvailablePlans(data.availablePlans || []);
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Pay.js SDKを読み込み
  useEffect(() => {
    if (!showCardForm) return;

    const payjpPublicKey = process.env.NEXT_PUBLIC_PAYJP_PUBLIC_KEY;
    if (!payjpPublicKey) {
      setMessage({ type: "error", text: "決済機能が設定されていません" });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.pay.jp/v2/pay.js";
    script.async = true;
    script.onload = () => {
      if (window.Payjp) {
        const payjp = window.Payjp(payjpPublicKey);
        setPayjpInstance(payjp);

        const elements = payjp.elements();
        const card = elements.create("card", {
          style: {
            base: {
              fontSize: "16px",
            },
          },
        });

        const container = document.getElementById("card-element");
        if (container) {
          container.innerHTML = "";
          (card as { mount: (el: HTMLElement) => void }).mount(container);
        }

        setCardElement(card);
      }
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [showCardForm]);

  const handleSubmitCard = async () => {
    if (!payjpInstance || !cardElement) return;

    setIsProcessing(true);
    setMessage(null);

    payjpInstance.createToken(
      cardElement,
      async (status: number, response: { id?: string; error?: { message: string } }) => {
        if (status === 200 && response.id) {
          try {
            const res = await fetch("/api/billing/card", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: response.id }),
            });

            if (res.ok) {
              setMessage({ type: "success", text: "カードを登録しました" });
              setShowCardForm(false);
              fetchSubscription();
            } else {
              const data = await res.json();
              setMessage({ type: "error", text: data.error || "カード登録に失敗しました" });
            }
          } catch {
            setMessage({ type: "error", text: "通信エラーが発生しました" });
          }
        } else {
          setMessage({
            type: "error",
            text: response.error?.message || "カード情報が無効です",
          });
        }
        setIsProcessing(false);
      }
    );
  };

  const handleSubscribe = async (planType?: string) => {
    setIsProcessing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType: planType || selectedPlan || "starter" }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "プランを開始しました" });
        setSelectedPlan(null);
        fetchSubscription();
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "プラン開始に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("本当に解約しますか？現在の期間終了まで利用可能です。")) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
      });

      if (response.ok) {
        setMessage({ type: "success", text: "解約しました。現在の期間終了まで利用可能です。" });
        fetchSubscription();
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "解約に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "無料";
    return `¥${price.toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "trial":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
            <AlertCircle className="w-4 h-4" />
            トライアル中
          </span>
        );
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
            <CheckCircle className="w-4 h-4" />
            有効
          </span>
        );
      case "canceled":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
            <XCircle className="w-4 h-4" />
            解約済み
          </span>
        );
      case "past_due":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-red-100 text-red-700">
            <AlertCircle className="w-4 h-4" />
            支払い遅延
          </span>
        );
      case "expired":
      case "grace_period":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-red-100 text-red-700">
            <Clock className="w-4 h-4" />
            期限切れ
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return <div className="text-gray-500">読み込み中...</div>;
  }

  const needsSubscription =
    subscription?.status === "expired" ||
    subscription?.status === "grace_period" ||
    subscription?.status === "trial";

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">契約・お支払い</h1>

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

      {/* 契約状態アラート */}
      {subscription?.message && subscription?.alertType === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700">{subscription.message}</p>
              {subscription.gracePeriodDaysLeft !== null && subscription.gracePeriodDaysLeft > 0 && (
                <p className="text-red-600 text-sm mt-1">
                  猶予期間: 残り{subscription.gracePeriodDaysLeft}日
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 現在のプラン */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">現在のプラン</h2>
          {subscription && getStatusBadge(subscription.status)}
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">プラン名</span>
            <span className="font-medium">{subscription?.planName || "未契約"}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">料金</span>
            <span className="font-medium">
              {formatPrice(subscription?.planAmount || 0)}/月（税込）
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">QRコード</span>
            <span className="font-medium">
              {subscription?.qrCodeCount || 0} / {subscription?.qrCodeLimit === null ? "無制限" : `${subscription?.qrCodeLimit}枚`}
              {subscription?.remainingQRCodes != null && subscription.remainingQRCodes > 0 && (
                <span className="text-gray-500 text-sm ml-2">
                  （残り{subscription.remainingQRCodes}枚）
                </span>
              )}
            </span>
          </div>

          {subscription?.status === "trial" && subscription.trialDaysLeft !== null && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">トライアル残り</span>
              <span className="font-medium text-blue-600">
                {subscription.trialDaysLeft}日
              </span>
            </div>
          )}

          {subscription?.status === "trial" && subscription.trialEnd && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">トライアル終了日</span>
              <span className="font-medium">{formatDate(subscription.trialEnd)}</span>
            </div>
          )}

          {subscription?.currentPeriodEnd && subscription.status === "active" && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">次回請求日</span>
              <span className="font-medium">
                {formatDate(subscription.currentPeriodEnd)}
              </span>
            </div>
          )}

          {subscription?.canceledAt && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">解約日</span>
              <span className="font-medium text-gray-500">
                {formatDate(subscription.canceledAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* プラン選択 */}
      {needsSubscription && availablePlans.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">プランを選択</h2>
          <p className="text-gray-600 text-sm mb-6">
            {subscription?.status === "trial"
              ? "トライアル終了後に適用されるプランを選択してください"
              : "継続利用するプランを選択してください"}
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {availablePlans.map((plan) => {
              const isCurrentPlan = subscription?.planType === plan.type;
              const isSelected = selectedPlan === plan.type;

              return (
                <div
                  key={plan.type}
                  onClick={() => setSelectedPlan(plan.type)}
                  className={`relative rounded-xl border-2 p-5 cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : isCurrentPlan
                      ? "border-green-300 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {isCurrentPlan && (
                    <span className="absolute -top-3 left-4 bg-green-500 text-white text-xs px-2 py-0.5 rounded">
                      現在のプラン
                    </span>
                  )}

                  <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                  <p className="text-2xl font-bold mb-2">
                    {formatPrice(plan.price)}
                    <span className="text-sm font-normal text-gray-500">/月</span>
                  </p>
                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">
                      QRコード: {plan.qrCodeLimit === null ? "無制限" : `${plan.qrCodeLimit}枚まで`}
                    </div>
                    <ul className="space-y-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedPlan && subscription?.hasCard && (
            <div className="mt-6 flex justify-center">
              <Button
                size="lg"
                onClick={() => handleSubscribe()}
                disabled={isProcessing}
              >
                {isProcessing ? "処理中..." : "このプランで契約する"}
              </Button>
            </div>
          )}

          {selectedPlan && !subscription?.hasCard && (
            <div className="mt-6 text-center">
              <p className="text-orange-600 text-sm mb-4">
                ※ 契約するにはカード登録が必要です
              </p>
              <Button onClick={() => setShowCardForm(true)}>
                カードを登録
              </Button>
            </div>
          )}
        </div>
      )}

      {/* カード情報 */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">お支払い方法</h2>

        {subscription?.card ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-gray-400" />
              <div>
                <p className="font-medium">
                  {subscription.card.brand} **** {subscription.card.last4}
                </p>
                <p className="text-sm text-gray-500">
                  有効期限: {subscription.card.expMonth}/{subscription.card.expYear}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCardForm(true)}
            >
              変更
            </Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 mb-4">カードが登録されていません</p>
            <Button onClick={() => setShowCardForm(true)}>
              カードを登録
            </Button>
          </div>
        )}

        {/* カード入力フォーム */}
        {showCardForm && (
          <div className="mt-6 pt-6 border-t">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                カード情報
              </label>
              <div
                id="card-element"
                className="p-3 border rounded-md bg-white min-h-[44px]"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSubmitCard}
                disabled={isProcessing}
              >
                {isProcessing ? "処理中..." : "カードを登録"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCardForm(false)}
                disabled={isProcessing}
              >
                キャンセル
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        {subscription?.status === "active" && (
          <div className="space-y-4">
            <p className="text-gray-600">
              {subscription.planName}をご利用いただきありがとうございます。
            </p>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
              className="text-red-600 hover:text-red-700"
            >
              {isProcessing ? "処理中..." : "解約する"}
            </Button>
          </div>
        )}

        {subscription?.status === "canceled" && (
          <div className="space-y-4">
            <p className="text-gray-600">
              解約済みです。{subscription.currentPeriodEnd && formatDate(subscription.currentPeriodEnd)}まで利用可能です。
            </p>
            {subscription.hasCard && (
              <Button onClick={() => handleSubscribe(subscription.planType)} disabled={isProcessing}>
                {isProcessing ? "処理中..." : "再度契約する"}
              </Button>
            )}
          </div>
        )}

        {subscription?.status === "past_due" && (
          <div className="space-y-4">
            <p className="text-red-600">
              お支払いに問題があります。カード情報を更新してください。
            </p>
            <Button onClick={() => setShowCardForm(true)}>
              カードを更新
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
