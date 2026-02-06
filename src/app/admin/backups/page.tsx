"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Database, HardDrive, Clock, CheckCircle, AlertTriangle, RefreshCw, Play, Copy } from "lucide-react";

interface Backup {
  name: string;
  size: number;
  date: string;
}

interface BackupData {
  backups: Backup[];
  logEntries: string[];
  diskInfo: { total: number; available: number; usedPercent: number };
  cronRegistered: boolean;
}

export default function AdminBackupsPage() {
  const [data, setData] = useState<BackupData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/backups");
      if (response.ok) {
        setData(await response.json());
      }
    } catch {
      // エラー処理
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleManualBackup = async () => {
    setIsRunning(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/backups", { method: "POST" });
      const result = await response.json();
      if (response.ok) {
        setMessage({ type: "success", text: result.message });
        fetchData();
      } else {
        setMessage({ type: "error", text: result.error });
      }
    } catch {
      setMessage({ type: "error", text: "バックアップの実行に失敗しました" });
    } finally {
      setIsRunning(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLogStatus = (entry: string): "ok" | "error" | "warning" => {
    if (entry.includes("ERROR")) return "error";
    if (entry.includes("WARNING")) return "warning";
    return "ok";
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(id);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const restoreCommands = [
    {
      id: "list",
      label: "バックアップ一覧確認",
      command: "ls -lh ~/backups/*.tar.gz",
    },
    {
      id: "extract",
      label: "バックアップ展開",
      command: "cd ~/backups && tar xzf YYYYMMDD_HHMMSS.tar.gz",
    },
    {
      id: "restore-db",
      label: "データベース復元",
      command:
        "export PGPASSWORD=\"DentalCheck2025Secure\" && pg_restore -h localhost -U dental_user -d dental_check --clean --if-exists YYYYMMDD_HHMMSS/database.dump",
    },
    {
      id: "restore-uploads",
      label: "アップロード画像復元",
      command: "tar xzf YYYYMMDD_HHMMSS/uploads.tar.gz -C /var/www/dental-check/public/",
    },
    {
      id: "restore-env",
      label: ".env復元",
      command: "cp YYYYMMDD_HHMMSS/env_backup /var/www/dental-check/.env",
    },
    {
      id: "restart",
      label: "アプリ再起動",
      command: "cd /var/www/dental-check && npm run build && pm2 restart dental-app",
    },
    {
      id: "full-guide",
      label: "別サーバーへの完全移行手順",
      command: "cat /var/www/dental-check/docs/server-setup.md",
    },
  ];

  if (isLoading) {
    return (
      <div className="text-gray-500">読み込み中...</div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="w-6 h-6" />
          バックアップ管理
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            更新
          </Button>
          <Button size="sm" onClick={handleManualBackup} disabled={isRunning}>
            <Play className="w-4 h-4 mr-1" />
            {isRunning ? "実行中..." : "手動バックアップ"}
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ステータスカード */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Clock className="w-4 h-4" />
            自動バックアップ
          </div>
          <div className="text-lg font-semibold">
            {data?.cronRegistered ? (
              <span className="text-green-600">有効（毎日 3:00）</span>
            ) : (
              <span className="text-red-600">未設定</span>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Database className="w-4 h-4" />
            バックアップ数
          </div>
          <div className="text-lg font-semibold">
            {data?.backups.length || 0} 件
            <span className="text-sm text-gray-500 ml-1">
              （合計 {formatSize(data?.backups.reduce((sum, b) => sum + b.size, 0) || 0)}）
            </span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <HardDrive className="w-4 h-4" />
            ディスク空き容量
          </div>
          <div className="text-lg font-semibold">
            {data?.diskInfo ? (
              <span className={data.diskInfo.usedPercent > 90 ? "text-red-600" : ""}>
                {formatSize(data.diskInfo.available)}
                <span className="text-sm text-gray-500 ml-1">
                  （使用率 {data.diskInfo.usedPercent}%）
                </span>
              </span>
            ) : (
              "不明"
            )}
          </div>
        </div>
      </div>

      {/* バックアップ一覧 */}
      <div className="bg-white rounded-xl shadow-sm border mb-6">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">バックアップ一覧</h2>
        </div>
        {data?.backups.length === 0 ? (
          <div className="p-4 text-gray-500 text-sm">バックアップがありません</div>
        ) : (
          <div className="divide-y">
            {data?.backups.map((backup) => (
              <div key={backup.name} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm">{backup.name}</div>
                  <div className="text-xs text-gray-500">{formatDate(backup.date)}</div>
                </div>
                <div className="text-sm text-gray-600">{formatSize(backup.size)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ログ */}
      <div className="bg-white rounded-xl shadow-sm border mb-6">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">実行ログ</h2>
        </div>
        {data?.logEntries.length === 0 ? (
          <div className="p-4 text-gray-500 text-sm">ログがありません</div>
        ) : (
          <div className="divide-y">
            {data?.logEntries.map((entry, i) => {
              const status = getLogStatus(entry);
              return (
                <div key={i} className="px-4 py-2 flex items-start gap-2">
                  {status === "ok" && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />}
                  {status === "error" && <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
                  {status === "warning" && <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />}
                  <span className="font-mono text-xs text-gray-700 break-all">{entry}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 復元手順 */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">復元手順</h2>
          <p className="text-xs text-gray-500 mt-1">
            SSHでサーバーにログインし、以下のコマンドを順番に実行してください。
            YYYYMMDD_HHMMSS は復元したいバックアップの日時に置き換えてください。
          </p>
        </div>
        <div className="divide-y">
          {restoreCommands.map((cmd, i) => (
            <div key={cmd.id} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">
                  {i + 1}. {cmd.label}
                </span>
                <button
                  onClick={() => copyToClipboard(cmd.command, cmd.id)}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  {copiedCommand === cmd.id ? "コピー済み" : "コピー"}
                </button>
              </div>
              <pre className="bg-gray-900 text-green-400 text-xs p-2 rounded overflow-x-auto">
                {cmd.command}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
