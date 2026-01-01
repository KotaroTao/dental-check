import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// ファイルサイズ制限を10MBに設定（App Router形式）
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "ファイルが選択されていません" },
        { status: 400 }
      );
    }

    // ファイルサイズチェック (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "ファイルサイズは10MB以下にしてください" },
        { status: 400 }
      );
    }

    // 許可する拡張子
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "JPEG、PNG、WebP、GIF形式のみアップロードできます" },
        { status: 400 }
      );
    }

    // ユニークなファイル名を生成
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${timestamp}-${randomStr}.${ext}`;

    // フォルダ指定（デフォルトはclinic）
    const folder = formData.get("folder") as string || "clinic";
    const allowedFolders = ["clinic", "channels", "diagnoses"];
    const targetFolder = allowedFolders.includes(folder) ? folder : "clinic";

    // 保存先ディレクトリ
    const uploadDir = path.join(process.cwd(), "public", "uploads", targetFolder);

    // ディレクトリがなければ作成
    await mkdir(uploadDir, { recursive: true });

    // ファイルを保存
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // 公開URL
    const url = `/uploads/${targetFolder}/${fileName}`;

    return NextResponse.json({ url, fileName });
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json(
      { error: `アップロードに失敗しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}
