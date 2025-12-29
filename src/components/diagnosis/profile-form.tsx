"use client";

import { useState } from "react";
import { useDiagnosisStore } from "@/lib/diagnosis-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Loader2 } from "lucide-react";
import Link from "next/link";

interface Props {
  diagnosisName: string;
}

export function ProfileForm({ diagnosisName }: Props) {
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [locationConsent, setLocationConsent] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const { setProfile } = useDiagnosisStore();

  // 位置情報の利用同意チェックボックス
  const handleLocationConsentChange = async (checked: boolean) => {
    if (checked) {
      setLocationConsent(true);
      setIsRequestingLocation(true);

      // GPS許可をリクエスト
      if (typeof window !== "undefined" && navigator.geolocation) {
        try {
          await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            });
          });
          setLocationGranted(true);
        } catch {
          // GPS拒否またはエラー
          setLocationGranted(false);
        }
      }
      setIsRequestingLocation(false);
    } else {
      setLocationConsent(false);
      setLocationGranted(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ageNum = parseInt(age, 10);
    if (ageNum > 0 && ageNum < 120 && gender) {
      setProfile(ageNum, gender, locationGranted);
    }
  };

  const isValid = age && parseInt(age, 10) > 0 && parseInt(age, 10) < 120 && gender && agreed;

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
          <div className="space-y-4">
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

            {/* 位置情報利用同意（任意） */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="location"
                  checked={locationConsent}
                  onCheckedChange={(checked) => handleLocationConsentChange(checked === true)}
                  disabled={isRequestingLocation}
                />
                <div className="flex-1">
                  <Label htmlFor="location" className="text-sm font-normal leading-relaxed cursor-pointer flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    位置情報の利用を許可する
                    <span className="text-gray-400 text-xs">（任意）</span>
                    {isRequestingLocation && (
                      <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                    )}
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    統計データ改善のため、市区町村レベルの位置情報を取得します。
                    <br />
                    正確な住所は保存されません。
                  </p>
                  {locationGranted && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      ✓ 位置情報の取得が許可されました
                    </p>
                  )}
                  {locationConsent && !locationGranted && !isRequestingLocation && (
                    <p className="text-xs text-orange-600 mt-1">
                      ※ ブラウザで位置情報がブロックされています
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            size="xl"
            className="w-full"
            disabled={!isValid}
          >
            診断を始める
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
