import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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

    // ファイルサイズチェック (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "ファイルサイズは5MB以下にしてください" },
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

    // 保存先ディレクトリ
    const uploadDir = path.join(process.cwd(), "public", "uploads", "clinic");

    // ディレクトリがなければ作成
    await mkdir(uploadDir, { recursive: true });

    // ファイルを保存
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // 公開URL
    const url = `/uploads/clinic/${fileName}`;

    return NextResponse.json({ url, fileName });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "アップロードに失敗しました" },
      { status: 500 }
    );
  }
}
