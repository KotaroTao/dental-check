import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { promises as fs } from "fs";
import path from "path";
import { execSync } from "child_process";

const BACKUP_DIR = "/root/backups";
const BACKUP_LOG = path.join(BACKUP_DIR, "backup.log");

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // バックアップファイル一覧
    let backups: { name: string; size: number; date: string }[] = [];
    try {
      const files = await fs.readdir(BACKUP_DIR);
      const tarFiles = files.filter((f) => f.endsWith(".tar.gz")).sort().reverse();
      backups = await Promise.all(
        tarFiles.map(async (f) => {
          const stat = await fs.stat(path.join(BACKUP_DIR, f));
          // ファイル名から日時を抽出 (20260207_073031.tar.gz)
          const match = f.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.tar\.gz$/);
          let date = stat.mtime.toISOString();
          if (match) {
            date = new Date(
              `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`
            ).toISOString();
          }
          return { name: f, size: stat.size, date };
        })
      );
    } catch {
      // backupディレクトリが存在しない場合
    }

    // ログ読み取り（最新20行）
    let logEntries: string[] = [];
    try {
      const logContent = await fs.readFile(BACKUP_LOG, "utf-8");
      logEntries = logContent.trim().split("\n").filter(Boolean).reverse().slice(0, 20);
    } catch {
      // ログファイルが存在しない場合
    }

    // ディスク容量
    let diskInfo = { total: 0, available: 0, usedPercent: 0 };
    try {
      const dfOutput = execSync("df /root --output=size,avail,pcent -B1 | tail -1", {
        encoding: "utf-8",
      }).trim();
      const parts = dfOutput.split(/\s+/);
      if (parts.length >= 3) {
        diskInfo = {
          total: parseInt(parts[0]) || 0,
          available: parseInt(parts[1]) || 0,
          usedPercent: parseInt(parts[2]) || 0,
        };
      }
    } catch {
      // df コマンドが失敗した場合
    }

    // cron登録状況
    let cronRegistered = false;
    try {
      const crontab = execSync("crontab -l 2>/dev/null", { encoding: "utf-8" });
      cronRegistered = crontab.includes("backup_dental.sh");
    } catch {
      // crontab が空の場合
    }

    return NextResponse.json({
      backups,
      logEntries,
      diskInfo,
      cronRegistered,
    });
  } catch (error) {
    console.error("Backup status error:", error);
    return NextResponse.json(
      { error: "バックアップ情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// 手動バックアップ実行
export async function POST() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    try {
      execSync("/root/backup_dental.sh", {
        encoding: "utf-8",
        timeout: 60000,
      });
      return NextResponse.json({ success: true, message: "バックアップが完了しました" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      return NextResponse.json(
        { error: `バックアップに失敗しました: ${message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Manual backup error:", error);
    return NextResponse.json(
      { error: "バックアップの実行に失敗しました" },
      { status: 500 }
    );
  }
}
