"use client";

import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

export function DemoCTA() {
  return (
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
  );
}
