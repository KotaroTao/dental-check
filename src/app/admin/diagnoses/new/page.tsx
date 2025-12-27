"use client";

import { DiagnosisForm } from "@/components/admin/diagnosis-form";

export default function NewDiagnosisPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">新規診断作成</h1>
      <DiagnosisForm />
    </div>
  );
}
