"use client";

import { useState } from "react";
import { useDiagnosisStore } from "@/lib/diagnosis-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

interface Props {
  diagnosisName: string;
}

export function ProfileForm({ diagnosisName }: Props) {
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const { setProfile } = useDiagnosisStore();

  // 規約同意チェック時にGPS許可を求める
  const handleTermsChange = async (checked: boolean) => {
    if (checked) {
      // チェックを入れたらGPS許可ダイアログを表示
      if (typeof window !== "undefined" && navigator.geolocation) {
        try {
          await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            });
          });
          // GPS許可された
          setLocationGranted(true);
        } catch {
          // GPS拒否されても同意は有効
          setLocationGranted(false);
        }
      }
      setAgreed(true);
    } else {
      setAgreed(false);
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
  );
}
