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
  const [locationConsent, setLocationConsent] = useState(false);
  const { setProfile } = useDiagnosisStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ageNum = parseInt(age, 10);
    if (ageNum > 0 && ageNum < 120 && gender) {
      setProfile(ageNum, gender, locationConsent);
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

          <div className="space-y-3">
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

            <div className="flex items-start space-x-2">
              <Checkbox
                id="location"
                checked={locationConsent}
                onCheckedChange={(checked) => setLocationConsent(checked === true)}
              />
              <Label htmlFor="location" className="text-sm font-normal leading-relaxed cursor-pointer text-gray-600">
                位置情報の利用に同意する（任意）
              </Label>
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
