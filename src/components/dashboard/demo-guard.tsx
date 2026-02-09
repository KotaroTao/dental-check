"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";

/**
 * D5: デモモード共通化
 *
 * デモアカウント制限のモーダル表示を1箇所にまとめるコンポーネント。
 * 以前は各ページに同じモーダルUIが重複していた。
 *
 * 使い方:
 *   const { DemoModal, showDemoModal } = useDemoGuard();
 *
 *   <button onClick={() => {
 *     if (isDemo) { showDemoModal(); return; }
 *     // 通常処理
 *   }}>
 *
 *   <DemoModal />  // ページ末尾に置く
 */

export function useDemoGuard() {
  const [isOpen, setIsOpen] = useState(false);

  const showDemoModal = useCallback(() => setIsOpen(true), []);
  const hideDemoModal = useCallback(() => setIsOpen(false), []);

  /** デモならモーダルを出してtrueを返す。デモでなければfalseを返す */
  const guardDemo = useCallback(
    (isDemo: boolean): boolean => {
      if (isDemo) {
        setIsOpen(true);
        return true; // ブロックされた
      }
      return false; // 通過OK
    },
    []
  );

  function DemoModal() {
    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={hideDemoModal}
      >
        <div
          className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                デモアカウントです
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                デモアカウントでは、データの閲覧のみ可能です。
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
            <p className="text-sm text-blue-800">
              QRコードや診断の新規作成・編集を行うには、正式なアカウントでのご登録が必要です。
            </p>
          </div>

          <Button
            className="w-full"
            onClick={hideDemoModal}
          >
            閉じる
          </Button>

          <button
            onClick={hideDemoModal}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return { DemoModal, showDemoModal, hideDemoModal, guardDemo };
}
