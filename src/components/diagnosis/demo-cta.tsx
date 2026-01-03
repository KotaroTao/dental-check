"use client";

import { Button } from "@/components/ui/button";
import { Building2, Eye, Copy } from "lucide-react";
import { useState } from "react";

export function DemoCTA() {
  const [copied, setCopied] = useState<"email" | "password" | null>(null);

  const copyToClipboard = async (text: string, field: "email" | "password") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // フォールバック
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* デモアカウントアクセス案内 */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-6 border-2 border-emerald-200">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <Eye className="w-6 h-6 text-emerald-600" />
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 text-lg">
              管理画面をお試しいただけます
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              下記のデモアカウントでログインして
              <br />
              医院向け管理画面をご覧いただけます
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 text-left space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">メールアドレス</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                  test@gmail.com
                </code>
                <button
                  onClick={() => copyToClipboard("test@gmail.com", "email")}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="コピー"
                >
                  <Copy className={`w-4 h-4 ${copied === "email" ? "text-emerald-600" : "text-gray-400"}`} />
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">パスワード</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                  testtest
                </code>
                <button
                  onClick={() => copyToClipboard("testtest", "password")}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="コピー"
                >
                  <Copy className={`w-4 h-4 ${copied === "password" ? "text-emerald-600" : "text-gray-400"}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="/login"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="w-full max-w-xs bg-emerald-600 hover:bg-emerald-700">
                デモアカウントでログイン
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* 医院向け案内 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900">
              この診断を医院で活用しませんか？
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              チラシやホームページに設置して
              <br />
              集患につなげることができます
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm font-medium text-yellow-800">
              現在リリース準備中
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              正式リリースはLINEアプリ
              <br />
              「ポチッとデンタル」にてお知らせします
            </p>
          </div>

          <div className="pt-2">
            <a
              href="https://lin.ee/xaT03Sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="w-full max-w-xs bg-[#06C755] hover:bg-[#05b34d]">
                ポチッとデンタルに登録（無料）
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
