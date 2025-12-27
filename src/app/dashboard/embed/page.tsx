"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Code, Copy, Check, ExternalLink, FileCode, MousePointer } from "lucide-react";

interface EmbedCode {
  type: string;
  name: string;
  description: string;
  embedUrl: string;
  directUrl: string;
  iframeCode: string;
  scriptCode: string;
  buttonCode: string;
}

interface EmbedData {
  clinic: {
    id: string;
    slug: string;
    name: string;
  };
  embedCodes: EmbedCode[];
}

type CodeType = "iframe" | "script" | "button";

export default function EmbedPage() {
  const [data, setData] = useState<EmbedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<Record<string, CodeType>>({});

  useEffect(() => {
    fetchEmbedCodes();
  }, []);

  const fetchEmbedCodes = async () => {
    try {
      const response = await fetch("/api/embed");
      if (response.ok) {
        const result = await response.json();
        setData(result);
        // デフォルトでiframeを選択
        const defaults: Record<string, CodeType> = {};
        result.embedCodes.forEach((code: EmbedCode) => {
          defaults[code.type] = "iframe";
        });
        setSelectedType(defaults);
      }
    } catch (error) {
      console.error("Failed to fetch embed codes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const getCode = (embedCode: EmbedCode, type: CodeType): string => {
    switch (type) {
      case "iframe":
        return embedCode.iframeCode;
      case "script":
        return embedCode.scriptCode;
      case "button":
        return embedCode.buttonCode;
      default:
        return embedCode.iframeCode;
    }
  };

  if (isLoading) {
    return <div className="text-gray-500">読み込み中...</div>;
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
        <p className="text-gray-500">埋め込みコードを取得できませんでした</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">埋め込みコード</h1>
        <p className="text-gray-600 mt-1">
          診断ツールをあなたのWebサイトに埋め込むためのコードを取得できます
        </p>
      </div>

      {/* 使い方ガイド */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="font-medium text-blue-900 mb-3">📝 使い方</h2>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li>埋め込みたい診断タイプを選択します</li>
          <li>埋め込み方法（iframe / ウィジェット / ボタン）を選択します</li>
          <li>コードをコピーしてWebサイトのHTMLに貼り付けます</li>
        </ol>
      </div>

      {/* 埋め込みコード一覧 */}
      <div className="space-y-6">
        {data.embedCodes.map((embedCode) => (
          <div
            key={embedCode.type}
            className="bg-white rounded-xl shadow-sm border overflow-hidden"
          >
            {/* ヘッダー */}
            <div className="border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-lg">{embedCode.name}</h3>
                  <p className="text-sm text-gray-500">{embedCode.description}</p>
                </div>
                <a
                  href={embedCode.embedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                >
                  プレビュー
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* 埋め込みタイプ選択 */}
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="flex gap-2">
                <Button
                  variant={selectedType[embedCode.type] === "iframe" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType({ ...selectedType, [embedCode.type]: "iframe" })}
                  className="gap-2"
                >
                  <Code className="w-4 h-4" />
                  iframe
                </Button>
                <Button
                  variant={selectedType[embedCode.type] === "script" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType({ ...selectedType, [embedCode.type]: "script" })}
                  className="gap-2"
                >
                  <FileCode className="w-4 h-4" />
                  ウィジェット
                </Button>
                <Button
                  variant={selectedType[embedCode.type] === "button" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType({ ...selectedType, [embedCode.type]: "button" })}
                  className="gap-2"
                >
                  <MousePointer className="w-4 h-4" />
                  ボタン
                </Button>
              </div>
            </div>

            {/* 埋め込み方法の説明 */}
            <div className="px-6 py-3 bg-gray-50 border-b">
              <p className="text-sm text-gray-600">
                {selectedType[embedCode.type] === "iframe" && (
                  <>
                    <strong>iframe:</strong> 最も一般的な方法。サイズを自由に調整できます。
                  </>
                )}
                {selectedType[embedCode.type] === "script" && (
                  <>
                    <strong>ウィジェット:</strong> JavaScriptで自動的にiframeを生成します。高さ自動調整に対応。
                  </>
                )}
                {selectedType[embedCode.type] === "button" && (
                  <>
                    <strong>ボタン:</strong> クリックすると新しいタブで診断ページを開きます。
                  </>
                )}
              </p>
            </div>

            {/* コード表示 */}
            <div className="px-6 py-4">
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
                  <code>{getCode(embedCode, selectedType[embedCode.type])}</code>
                </pre>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 gap-1"
                  onClick={() => copyToClipboard(
                    getCode(embedCode, selectedType[embedCode.type]),
                    `${embedCode.type}-${selectedType[embedCode.type]}`
                  )}
                >
                  {copiedCode === `${embedCode.type}-${selectedType[embedCode.type]}` ? (
                    <>
                      <Check className="w-4 h-4" />
                      コピーしました
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      コピー
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 注意事項 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h3 className="font-medium text-yellow-900 mb-2">⚠️ 注意事項</h3>
        <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
          <li>埋め込みコードは契約中のみ動作します</li>
          <li>トライアル期間終了後は有料プランへの登録が必要です</li>
          <li>アクセス統計は「経路」ページで確認できます</li>
        </ul>
      </div>
    </div>
  );
}
