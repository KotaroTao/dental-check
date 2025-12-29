import { Clock } from "lucide-react";

interface ExpiredPageProps {
  clinicName: string;
  logoUrl?: string | null;
}

export function ExpiredPage({ clinicName, logoUrl }: ExpiredPageProps) {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* 医院ヘッダー */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={clinicName}
                className="h-8 w-auto"
              />
            )}
            <span className="font-medium text-gray-800">{clinicName}</span>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="flex items-center justify-center min-h-[calc(100vh-60px)] p-4">
        <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>

          <h1 className="text-xl font-bold text-gray-800 mb-2">
            このキャンペーンは終了しました
          </h1>

          <p className="text-gray-600 mb-6">
            ご利用いただきありがとうございます。<br />
            このQRコードの有効期限が切れました。
          </p>

          <div className="text-sm text-gray-500">
            ご不明な点がございましたら、<br />
            {clinicName}までお問い合わせください。
          </div>
        </div>
      </div>
    </main>
  );
}
