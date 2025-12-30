"use client";

import { useState } from "react";
import { useDiagnosisStore } from "@/lib/diagnosis-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Props {
  diagnosisName: string;
}

export function ProfileForm({ diagnosisName }: Props) {
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [showLocationStep, setShowLocationStep] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const { setProfile, setLocation } = useDiagnosisStore();

  // フォーム送信 → 位置情報ステップへ
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ageNum = parseInt(age, 10);
    if (ageNum > 0 && ageNum < 120 && gender && agreed) {
      setShowLocationStep(true);
    }
  };

  // 位置情報を許可して診断開始
  const handleAllowLocation = async () => {
    setIsRequestingLocation(true);
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (typeof window !== "undefined" && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch {
        // GPS拒否またはエラー → 続行
      }
    }

    setIsRequestingLocation(false);
    const ageNum = parseInt(age, 10);
    setProfile(ageNum, gender!, latitude !== null);
    setLocation(latitude, longitude);
  };

  // 位置情報をスキップして診断開始
  const handleSkipLocation = () => {
    const ageNum = parseInt(age, 10);
    setProfile(ageNum, gender!, false);
    setLocation(null, null);
  };

  const isValid = age && parseInt(age, 10) > 0 && parseInt(age, 10) < 120 && gender && agreed;

  // 位置情報許可ステップ
  if (showLocationStep) {
    return (
      <Card>
        <CardHeader className="text-center pb-2">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-10 h-10 text-blue-600" />
          </div>
          <CardTitle className="text-xl">位置情報のご協力のお願い</CardTitle>
          <CardDescription className="mt-2">
            診断精度向上のため、位置情報の提供にご協力ください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 rounded-lg p-4 text-sm text-gray-700">
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">✓</span>
                <span>市区町村レベルの統計データとして利用</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">✓</span>
                <span>正確な住所は保存されません</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">✓</span>
                <span>地域の歯科健康データの改善に貢献</span>
              </li>
            </ul>
          </div>

          {/* メインボタン: 許可して診断開始 */}
          <Button
            onClick={handleAllowLocation}
            size="xl"
            className="w-full gap-2 text-base"
            disabled={isRequestingLocation}
          >
            {isRequestingLocation ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                位置情報を取得中...
              </>
            ) : (
              <>
                <MapPin className="w-5 h-5" />
                位置情報を許可して診断を開始
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </Button>

          {/* サブリンク: スキップ */}
          <div className="text-center">
            <button
              onClick={handleSkipLocation}
              disabled={isRequestingLocation}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              位置情報なしで診断を開始 →
            </button>
          </div>

          <p className="text-xs text-center text-gray-400">
            ※ ブラウザの許可ダイアログが表示されます
          </p>
        </CardContent>
      </Card>
    );
  }

  // プロフィール入力フォーム
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{diagnosisName}</CardTitle>
        <CardDescription>
          まずは簡単なプロフィールを教えてください
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="age">年齢 *</Label>
            <Input
              id="age"
              type="number"
              placeholder="例: 35"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min={1}
              max={120}
              required
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label>性別 *</Label>
            <RadioGroup
              value={gender || ""}
              onValueChange={(value) => setGender(value || null)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="male" id="male" />
                <Label htmlFor="male" className="font-normal cursor-pointer">
                  男性
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="female" id="female" />
                <Label htmlFor="female" className="font-normal cursor-pointer">
                  女性
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="font-normal cursor-pointer">
                  回答しない
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 利用規約同意 */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
            />
            <Label htmlFor="terms" className="text-sm font-normal leading-relaxed cursor-pointer">
              <Link href="/terms" target="_blank" className="text-blue-600 hover:underline">
                利用規約
              </Link>
              ・
              <Link href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                プライバシーポリシー
              </Link>
              に同意する <span className="text-red-500">*</span>
            </Label>
          </div>

          <Button
            type="submit"
            size="xl"
            className="w-full"
            disabled={!isValid}
          >
            次へ
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
