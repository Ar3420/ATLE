import { addDays, isAfter, parseISO } from "date-fns";

import type { GenerateTestInput } from "@/lib/validation";
import type { TableRow } from "@/lib/types/database";

type CandidateQuestion = TableRow<"questions"> & {
  subject_name?: string;
  last_used_at?: string | null;
  weakness_count?: number;
};

function normalizeDifficultyScore(targetDifficulty: number, actualDifficulty: number) {
  const delta = Math.abs(targetDifficulty - actualDifficulty);
  return Math.max(0, 1 - delta / 4);
}

export function buildDifficultyTargets(
  difficultyDistribution: Record<string, number>,
  count: number,
) {
  const totalWeight = Object.values(difficultyDistribution).reduce(
    (sum, value) => sum + value,
    0,
  );

  return [1, 2, 3, 4, 5].map((difficulty) => {
    const weight = difficultyDistribution[String(difficulty)] ?? 0;
    return {
      difficulty,
      targetCount:
        totalWeight === 0
          ? Math.round(count / 5)
          : Math.round((weight / totalWeight) * count),
    };
  });
}

function computeSelectionScore(
  question: CandidateQuestion,
  targetDifficulty: number,
  subjectUsageCount: number,
  weaknessWeighting: boolean,
) {
  const weaknessRelevance = weaknessWeighting
    ? Math.min(1, (question.weakness_count ?? 0) / 5)
    : 0.25;

  const lastUsed = question.last_used_at ? parseISO(question.last_used_at) : null;
  const recencyPenalty =
    !lastUsed || isAfter(new Date(), addDays(lastUsed, 21)) ? 1 : 0.3;

  const difficultyFit = normalizeDifficultyScore(
    targetDifficulty,
    question.difficulty,
  );
  const subjectBalance = Math.max(0, 1 - subjectUsageCount / 5);

  return (
    weaknessRelevance * 0.4 +
    recencyPenalty * 0.25 +
    difficultyFit * 0.2 +
    subjectBalance * 0.15
  );
}

export function selectQuestions(
  candidates: CandidateQuestion[],
  input: GenerateTestInput,
  recentQuestionIds = new Set<string>(),
) {
  const totalCount =
    input.mode === "standard" ? input.mc_count + input.lr_count : input.total_count;
  const difficultyTargets = buildDifficultyTargets(
    input.difficulty_distribution,
    totalCount,
  );

  const subjectCounts = new Map<string, number>();
  const topicCounts = new Map<string, number>();
  const selected: CandidateQuestion[] = [];

  const prefiltered = candidates.filter((candidate) => !recentQuestionIds.has(candidate.id));

  for (const bucket of difficultyTargets) {
    const bucketPool = prefiltered
      .filter((candidate) => candidate.difficulty === bucket.difficulty)
      .sort((a, b) => {
        const aScore = computeSelectionScore(
          a,
          bucket.difficulty,
          subjectCounts.get(a.subject_id) ?? 0,
          input.weakness_weight,
        );
        const bScore = computeSelectionScore(
          b,
          bucket.difficulty,
          subjectCounts.get(b.subject_id) ?? 0,
          input.weakness_weight,
        );
        return bScore - aScore;
      });

    for (const question of bucketPool) {
      if (selected.length >= totalCount) {
        break;
      }

      const currentTopicCount = topicCounts.get(question.topic) ?? 0;
      const projectedTopicShare = (currentTopicCount + 1) / (selected.length + 1);

      if (projectedTopicShare > 0.4) {
        continue;
      }

      if (selected.some((item) => item.id === question.id)) {
        continue;
      }

      selected.push(question);
      subjectCounts.set(question.subject_id, (subjectCounts.get(question.subject_id) ?? 0) + 1);
      topicCounts.set(question.topic, currentTopicCount + 1);

      if ((selected.filter((item) => item.difficulty === bucket.difficulty).length ?? 0) >= bucket.targetCount && bucket.targetCount > 0) {
        break;
      }
    }
  }

  if (selected.length < totalCount) {
    for (const question of prefiltered) {
      if (selected.length >= totalCount) {
        break;
      }
      if (selected.some((item) => item.id === question.id)) {
        continue;
      }
      const currentTopicCount = topicCounts.get(question.topic) ?? 0;
      const projectedTopicShare = (currentTopicCount + 1) / (selected.length + 1);
      if (projectedTopicShare > 0.4) {
        continue;
      }
      selected.push(question);
      topicCounts.set(question.topic, currentTopicCount + 1);
    }
  }

  if (input.mode === "standard") {
    const mc = selected.filter((question) => question.type === "multiple_choice").slice(0, input.mc_count);
    const lr = selected.filter((question) => question.type === "long_response").slice(0, input.lr_count);
    return [...mc, ...lr];
  }

  if (input.question_type === "multiple_choice") {
    return selected.filter((question) => question.type === "multiple_choice").slice(0, input.total_count);
  }

  if (input.question_type === "long_response") {
    return selected.filter((question) => question.type === "long_response").slice(0, input.total_count);
  }

  return selected.slice(0, input.total_count);
}
