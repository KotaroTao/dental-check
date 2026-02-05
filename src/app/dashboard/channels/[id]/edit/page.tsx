"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

// 編集ページはチャンネル詳細ページに統合されました
// 既存のリンクやブックマークからのアクセスをリダイレクト
export default function EditChannelRedirect() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    // ハッシュを保持してリダイレクト
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    router.replace(`/dashboard/channels/${id}${hash}`);
  }, [id, router]);

  return <div className="text-gray-500">リダイレクト中...</div>;
}
