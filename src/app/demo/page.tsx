import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { diagnosisTypes } from "@/data/diagnosis-types";

export default function DemoPage() {
  const diagnoses = Object.values(diagnosisTypes);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            くるくる診断
          </h1>
          <p className="text-gray-600">
            簡単な質問に答えて、お口の健康をチェックしましょう
          </p>
        </div>

        <div className="space-y-4">
          {diagnoses.map((diagnosis) => (
            <Card key={diagnosis.slug} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{diagnosis.name}</CardTitle>
                <CardDescription>{diagnosis.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    <span>{diagnosis.questions.length}問</span>
                    <span className="mx-2">•</span>
                    <span>約2分</span>
                  </div>
                  <Link href={`/demo/${diagnosis.slug}`}>
                    <Button>診断する</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>※この診断は医療行為ではありません</p>
        </div>
      </div>
    </main>
  );
}
