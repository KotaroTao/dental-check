"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface CardInfo {
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
}

interface SubscriptionInfo {
  status: string;
  trialEnd: string | null;
  trialDaysLeft: number | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  hasCard: boolean;
  card: CardInfo | null;
  planAmount: number;
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

  const handleSubscribe = async () => {
    setIsProcessing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/billing/subscribe", {
        method: "POST",
      });

      if (response.ok) {
        setMessage({ type: "success", text: "有料プランを開始しました" });
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
      default:
        return null;
    }
  };

  if (isLoading) {
    return <div className="text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="max-w-2xl">
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

      {/* 現在のプラン */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">現在のプラン</h2>
          {subscription && getStatusBadge(subscription.status)}
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">プラン名</span>
            <span className="font-medium">月額プラン</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">料金</span>
            <span className="font-medium">
              ¥{subscription?.planAmount?.toLocaleString() || "3,300"}/月（税込）
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

          {subscription?.currentPeriodEnd && subscription.status !== "trial" && (
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
        {subscription?.status === "trial" && (
          <div className="space-y-4">
            <p className="text-gray-600">
              トライアル期間終了後、自動的に有料プランへ移行します。
            </p>
            {!subscription.hasCard && (
              <p className="text-orange-600 text-sm">
                ※ 継続利用にはカード登録が必要です
              </p>
            )}
            {subscription.hasCard && (
              <Button onClick={handleSubscribe} disabled={isProcessing}>
                {isProcessing ? "処理中..." : "今すぐ有料プランを開始"}
              </Button>
            )}
          </div>
        )}

        {subscription?.status === "active" && (
          <div className="space-y-4">
            <p className="text-gray-600">
              有料プランをご利用いただきありがとうございます。
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
              解約済みです。現在の期間終了まで利用可能です。
            </p>
            {subscription.hasCard && (
              <Button onClick={handleSubscribe} disabled={isProcessing}>
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
