"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2, Check } from "lucide-react";

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

        <ul className="text-sm text-left space-y-2 max-w-xs mx-auto">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>14日間無料でお試し</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>月額3,000円（税抜）</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>QRコード発行・統計機能付き</span>
          </li>
        </ul>

        <Link href="/signup">
          <Button size="lg" className="w-full max-w-xs">
            医院として登録する
          </Button>
        </Link>
      </div>
    </div>
  );
}
