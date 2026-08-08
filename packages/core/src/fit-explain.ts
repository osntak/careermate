import { fitRepo, jobRepo } from '@careermate/db';

export interface ExplainableFitAnalysis {
  job_id: string;
  overall_score: number | null;
  requirement_coverage: number | null;
  evidence_strength: number;
  matched_requirements: string[];
  missing_requirements: string[];
  strengths: string[];
  risks: string[];
  recommended_actions: string[];
  explanation: string;
}

function ratio(matched: number, missing: number): number | null {
  const total = matched + missing;
  return total === 0 ? null : Math.round((matched / total) * 100);
}

export function getExplainableFitAnalysis(jobId: string): ExplainableFitAnalysis | null {
  const job = jobRepo.get(jobId);
  const fit = fitRepo.getByJob(jobId);
  if (!job || !fit) return null;

  const matched = fit.matched_keywords ?? [];
  const missing = fit.missing_keywords ?? [];
  const coverage = ratio(matched.length, missing.length);
  const evidenceItems = (fit.strengths ?? []).filter((item) => item.trim().length > 0);
  const evidenceStrength = Math.min(100, evidenceItems.length * 20 + matched.length * 5);
  const risks = [
    ...(fit.gaps ?? []),
    ...missing.map((item) => `근거가 부족한 요구사항: ${item}`),
  ];
  const actions = fit.recommendations?.length
    ? fit.recommendations
    : missing.map((item) => `${item} 요구에 연결할 실제 경험 또는 학습 근거를 보완하세요.`);

  const explanationParts = [
    coverage == null
      ? '요구사항 충족률을 계산할 수 있는 매칭 정보가 아직 없습니다.'
      : `저장된 키워드 기준 요구사항 충족률은 ${coverage}%입니다.`,
    evidenceStrength >= 70
      ? '강점과 근거가 비교적 충분합니다.'
      : evidenceStrength >= 40
        ? '일부 근거는 있지만 지원 문서에서 더 구체적으로 연결할 필요가 있습니다.'
        : '현재 분석에는 구체적인 경험 근거가 부족합니다.',
    risks.length > 0 ? `확인할 위험 요소가 ${risks.length}개 있습니다.` : '명시된 주요 위험 요소는 없습니다.',
  ];

  return {
    job_id: jobId,
    overall_score: fit.score,
    requirement_coverage: coverage,
    evidence_strength: evidenceStrength,
    matched_requirements: matched,
    missing_requirements: missing,
    strengths: fit.strengths ?? [],
    risks,
    recommended_actions: actions,
    explanation: explanationParts.join(' '),
  };
}
