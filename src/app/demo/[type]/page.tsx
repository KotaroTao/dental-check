import { notFound } from "next/navigation";
import { getDiagnosisType } from "@/data/diagnosis-types";
import { DiagnosisFlow } from "@/components/diagnosis/diagnosis-flow";

interface Props {
  params: { type: string };
}

export default function DemoDiagnosisPage({ params }: Props) {
  const diagnosis = getDiagnosisType(params.type);

  if (!diagnosis) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <DiagnosisFlow diagnosis={diagnosis} isDemo={true} />
    </main>
  );
}

export function generateStaticParams() {
  return [
    { type: "oral-age" },
    { type: "child-orthodontics" },
  ];
}
