"use client";

import { useState } from "react";
import { useDiagnosisStore } from "@/lib/diagnosis-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, X } from "lucide-react";
import Link from "next/link";

interface Props {
  diagnosisName: string;
}

export function ProfileForm({ diagnosisName }: Props) {
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const { setProfile } = useDiagnosisStore();

  // GPS許可ダイアログを表示
  const handleTermsChange = (checked: boolean) => {
    if (checked) {
      setAgreed(true);
      // カスタムダイアログを表示
      setShowLocationDialog(true);
    } else {
      setAgreed(false);
      setLocationGranted(false);
    }
  };

  // 位置情報を許可
  const handleAllowLocation = async () => {
    setIsRequestingLocation(true);
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
    setShowLocationDialog(false);
  };

  // 位置情報を拒否
  const handleDenyLocation = () => {
    setLocationGranted(false);
    setShowLocationDialog(false);
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
    <>
      {/* GPS許可確認ダイアログ */}
      {showLocationDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 relative">
            <button
              onClick={handleDenyLocation}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                位置情報の利用許可
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                診断結果の統計データ改善のため、<br />
                位置情報（市区町村レベル）を取得します。
              </p>
              <p className="text-xs text-gray-400 mt-2">
                ※正確な住所は保存されません
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleAllowLocation}
                className="w-full"
                disabled={isRequestingLocation}
              >
                {isRequestingLocation ? "取得中..." : "許可する"}
              </Button>
              <Button
                onClick={handleDenyLocation}
                variant="outline"
                className="w-full"
              >
                許可しない
              </Button>
            </div>
          </div>
        </div>
      )}

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

            <div className="space-y-1">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreed}
                  onCheckedChange={(checked) => handleTermsChange(checked === true)}
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
              <p className="text-xs text-gray-500 ml-6">
                ※位置情報は市区町村レベルで統計目的に利用されます
                {locationGranted && (
                  <span className="text-green-600 ml-1">（許可済み）</span>
                )}
              </p>
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
    </>
  );
}
