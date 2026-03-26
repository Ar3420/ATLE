import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { GenerateTestInput } from "@/lib/validation";
import type { TableRow } from "@/lib/types/database";

type QuestionWithChoices = TableRow<"questions"> & {
  choices: TableRow<"choices">[];
};

export async function getSubjects(userId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getSourceFiles(userId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("source_files")
    .select("*")
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getQuestions(
  userId: string,
  filters?: {
    subjectId?: string;
    topic?: string;
    subtopic?: string;
    type?: string;
    difficulty?: string;
    search?: string;
  },
) {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("questions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (filters?.subjectId) query = query.eq("subject_id", filters.subjectId);
  if (filters?.topic) query = query.ilike("topic", `%${filters.topic}%`);
  if (filters?.subtopic) query = query.ilike("subtopic", `%${filters.subtopic}%`);
  if (filters?.type) query = query.eq("type", filters.type as "multiple_choice" | "long_response");
  if (filters?.difficulty) query = query.eq("difficulty", Number(filters.difficulty));
  if (filters?.search) query = query.ilike("question_text", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw error;

  const questions = data ?? [];
  const questionIds = questions.map((question) => question.id);

  const { data: choices } = questionIds.length
    ? await supabase
        .from("choices")
        .select("*")
        .in("question_id", questionIds)
    : { data: [] as TableRow<"choices">[] };

  const choiceMap = new Map<string, TableRow<"choices">[]>();
  for (const choice of choices ?? []) {
    choiceMap.set(choice.question_id, [...(choiceMap.get(choice.question_id) ?? []), choice]);
  }

  return questions.map((question) => ({
    ...question,
    choices: choiceMap.get(question.id) ?? [],
  })) as QuestionWithChoices[];
}

export async function getPendingQuestions(userId: string, sourceFileId: string) {
  const supabase = createServerSupabaseClient();
  const [{ data: sourceFile, error: sourceFileError }, { data: pending, error: pendingError }] =
    await Promise.all([
      supabase
        .from("source_files")
        .select("*")
        .eq("user_id", userId)
        .eq("id", sourceFileId)
        .single(),
      supabase
        .from("pending_questions")
        .select("*")
        .eq("user_id", userId)
        .eq("source_file_id", sourceFileId)
        .order("created_at", { ascending: true }),
    ]);

  if (sourceFileError) throw sourceFileError;
  if (pendingError) throw pendingError;

  return {
    sourceFile,
    pendingQuestions: (pending ?? []).map((item) => ({
      ...item,
      choices: Array.isArray(item.choices_json) ? item.choices_json : [],
    })),
  };
}

export async function getTests(userId: string) {
  const supabase = createServerSupabaseClient();
  const [{ data: tests, error: testsError }, { data: testQuestions }, { data: attempts }] =
    await Promise.all([
      supabase.from("tests").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("test_questions").select("*"),
      supabase.from("attempts").select("*").eq("user_id", userId).order("taken_at", { ascending: false }),
    ]);

  if (testsError) throw testsError;

  return (tests ?? []).map((test) => {
    const matchingQuestions = (testQuestions ?? []).filter((item) => item.test_id === test.id);
    const latestAttempt = (attempts ?? []).find((attempt) => attempt.test_id === test.id) ?? null;

    return {
      ...test,
      question_count: matchingQuestions.length,
      latest_attempt: latestAttempt,
    };
  });
}

export async function getTestDetail(userId: string, testId: string) {
  const supabase = createServerSupabaseClient();
  const [
    { data: test, error: testError },
    { data: testQuestions, error: tqError },
    { data: attempts, error: attemptsError },
  ] = await Promise.all([
    supabase.from("tests").select("*").eq("user_id", userId).eq("id", testId).single(),
    supabase.from("test_questions").select("*").eq("test_id", testId).order("order_index"),
    supabase.from("attempts").select("*").eq("user_id", userId).eq("test_id", testId).order("taken_at", { ascending: false }),
  ]);

  if (testError) throw testError;
  if (tqError) throw tqError;
  if (attemptsError) throw attemptsError;

  const questionIds = (testQuestions ?? []).map((item) => item.question_id);
  const { data: questions, error: questionsError } = questionIds.length
    ? await supabase.from("questions").select("*").in("id", questionIds)
    : { data: [], error: null };

  if (questionsError) throw questionsError;

  const { data: choices } = questionIds.length
    ? await supabase.from("choices").select("*").in("question_id", questionIds)
    : { data: [] as TableRow<"choices">[] };

  const choiceMap = new Map<string, TableRow<"choices">[]>();
  for (const choice of choices ?? []) {
    choiceMap.set(choice.question_id, [...(choiceMap.get(choice.question_id) ?? []), choice]);
  }

  const orderedQuestions = (testQuestions ?? [])
    .map((link) => {
      const question = (questions ?? []).find((item) => item.id === link.question_id);
      if (!question) return null;
      return {
        ...question,
        order_index: link.order_index,
        choices: choiceMap.get(question.id) ?? [],
      };
    })
    .filter(Boolean);

  const latestAttempt = attempts?.[0] ?? null;
  let latestResults: TableRow<"attempt_question_results">[] = [];

  if (latestAttempt) {
    const { data } = await supabase
      .from("attempt_question_results")
      .select("*")
      .eq("attempt_id", latestAttempt.id);
    latestResults = data ?? [];
  }

  return {
    test,
    questions: orderedQuestions,
    attempts: attempts ?? [],
    latestAttempt,
    latestResults,
  };
}

export async function getDashboardData(userId: string) {
  const supabase = createServerSupabaseClient();
  const [
    { count: questionCount },
    { count: testsCount },
    { data: attempts },
    { data: weaknessClusters },
  ] = await Promise.all([
    supabase.from("questions").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("tests").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("attempts")
      .select("*")
      .eq("user_id", userId)
      .order("taken_at", { ascending: false })
      .limit(10),
    supabase
      .from("weakness_clusters")
      .select("*")
      .eq("user_id", userId)
      .order("error_count", { ascending: false })
      .limit(3),
  ]);

  const averageScore =
    attempts && attempts.length
      ? attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / attempts.length
      : 0;

  return {
    totalQuestions: questionCount ?? 0,
    testsTaken: testsCount ?? 0,
    rollingAverage: averageScore,
    scoreTrend: (attempts ?? []).slice().reverse(),
    weaknessClusters: weaknessClusters ?? [],
  };
}

export async function getSubjectDetail(userId: string, subjectId: string) {
  const subjects = await getSubjects(userId);
  const subject = subjects.find((item) => item.id === subjectId);
  if (!subject) {
    throw new Error("Subject not found");
  }

  const questions = await getQuestions(userId, { subjectId });
  const supabase = createServerSupabaseClient();
  const { data: results } = await supabase
    .from("attempt_question_results")
    .select("*");

  const relevantQuestionIds = new Set(questions.map((question) => question.id));
  const relevantResults = (results ?? []).filter((result) => relevantQuestionIds.has(result.question_id));
  const accuracy = relevantResults.length
    ? (relevantResults.filter((item) => item.is_correct).length / relevantResults.length) * 100
    : 0;

  return {
    subject,
    questions,
    stats: {
      questionCount: questions.length,
      accuracy,
    },
  };
}

export async function getQuestionGenerationContext(userId: string) {
  const [subjects, questions, weaknessClusters, tests] = await Promise.all([
    getSubjects(userId),
    getQuestions(userId),
    createServerSupabaseClient()
      .from("weakness_clusters")
      .select("*")
      .eq("user_id", userId)
      .order("error_count", { ascending: false }),
    createServerSupabaseClient()
      .from("tests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const recentTestIds = (tests.data ?? []).map((test) => test.id);
  const supabase = createServerSupabaseClient();
  const { data: recentLinks } = recentTestIds.length
    ? await supabase.from("test_questions").select("*").in("test_id", recentTestIds)
    : { data: [] as TableRow<"test_questions">[] };

  return {
    subjects: subjects.filter((subject) => subject.is_active),
    questionCount: questions.length,
    weaknessClusters: weaknessClusters.data ?? [],
    recentQuestionIds: new Set((recentLinks ?? []).map((item) => item.question_id)),
  };
}

export async function getGenerationCandidates(
  userId: string,
  input: GenerateTestInput,
) {
  const supabase = createServerSupabaseClient();
  const questions = await getQuestions(userId);
  const { data: weaknessClusters } = await supabase
    .from("weakness_clusters")
    .select("*")
    .eq("user_id", userId);
  const { data: tests } = await supabase
    .from("tests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(3);

  const recentTestIds = (tests ?? []).map((test) => test.id);
  const { data: recentLinks } = recentTestIds.length
    ? await supabase.from("test_questions").select("*").in("test_id", recentTestIds)
    : { data: [] as TableRow<"test_questions">[] };

  const recentQuestionIds = new Set((recentLinks ?? []).map((item) => item.question_id));
  const weaknessMap = new Map<string, number>();

  for (const cluster of weaknessClusters ?? []) {
    for (const question of questions) {
      if (question.topic === cluster.topic && question.subtopic === cluster.subtopic) {
        weaknessMap.set(question.id, cluster.error_count);
      }
    }
  }

  let candidates = questions.map((question) => ({
    ...question,
    weakness_count: weaknessMap.get(question.id) ?? 0,
  }));

  if (input.mode === "standard") {
    candidates = candidates.filter((question) => input.subject_ids.includes(question.subject_id));
  } else {
    candidates = candidates.filter((question) => question.subject_id === input.subject_id);
    if (input.topic) {
      candidates = candidates.filter((question) => question.topic === input.topic);
    }
    if (input.subtopic) {
      candidates = candidates.filter((question) => question.subtopic === input.subtopic);
    }
  }

  return {
    candidates,
    recentQuestionIds,
  };
}

export async function getAnalyticsData(userId: string, filters?: {
  subjectId?: string;
  testType?: string;
  startDate?: string;
  endDate?: string;
}) {
  const supabase = createServerSupabaseClient();
  const [subjects, attempts, tests, results, questions, weaknessClusters] = await Promise.all([
    getSubjects(userId),
    supabase.from("attempts").select("*").eq("user_id", userId).order("taken_at", { ascending: true }),
    supabase.from("tests").select("*").eq("user_id", userId),
    supabase.from("attempt_question_results").select("*"),
    supabase.from("questions").select("*").eq("user_id", userId),
    supabase.from("weakness_clusters").select("*").eq("user_id", userId).order("error_count", { ascending: false }).limit(10),
  ]);

  let filteredAttempts = attempts.data ?? [];
  if (filters?.testType) {
    const allowedTestIds = (tests.data ?? [])
      .filter((test) => test.type === filters.testType)
      .map((test) => test.id);
    filteredAttempts = filteredAttempts.filter((attempt) => allowedTestIds.includes(attempt.test_id));
  }
  if (filters?.startDate) {
    filteredAttempts = filteredAttempts.filter((attempt) => attempt.taken_at >= filters.startDate!);
  }
  if (filters?.endDate) {
    filteredAttempts = filteredAttempts.filter((attempt) => attempt.taken_at <= filters.endDate!);
  }

  const questionMap = new Map((questions.data ?? []).map((question) => [question.id, question]));
  const attemptIdSet = new Set(filteredAttempts.map((attempt) => attempt.id));
  const filteredResults = (results.data ?? []).filter((result) => attemptIdSet.has(result.attempt_id));

  const filteredBySubject = filters?.subjectId
    ? filteredResults.filter((result) => questionMap.get(result.question_id)?.subject_id === filters.subjectId)
    : filteredResults;

  const scoreOverTime = filteredAttempts.map((attempt) => ({
    date: attempt.taken_at,
    percentage: attempt.percentage,
  }));

  const subjectPerformance = subjects.map((subject) => {
    const subjectResults = filteredBySubject.filter(
      (result) => questionMap.get(result.question_id)?.subject_id === subject.id,
    );
    const correct = subjectResults.filter((result) => result.is_correct).length;
    return {
      subject: subject.name,
      score: subjectResults.length ? (correct / subjectResults.length) * 100 : 0,
    };
  });

  const mcVsLrAccuracy = filteredAttempts.map((attempt) => ({
    date: attempt.taken_at,
    mc_accuracy: attempt.mc_accuracy,
    lr_accuracy: attempt.lr_accuracy,
  }));

  const errorTypeDistribution = ["concept", "pattern", "execution"].map((type) => ({
    type,
    count: filteredBySubject.filter((result) => result.error_type === type).length,
  }));

  const topicHeatmapMap = new Map<string, { correct: number; total: number; subject: string; topic: string }>();
  for (const result of filteredBySubject) {
    const question = questionMap.get(result.question_id);
    if (!question) continue;
    const subject = subjects.find((item) => item.id === question.subject_id)?.name ?? "Unknown";
    const key = `${subject}::${question.topic}`;
    const current = topicHeatmapMap.get(key) ?? {
      correct: 0,
      total: 0,
      subject,
      topic: question.topic,
    };
    current.total += 1;
    current.correct += result.is_correct ? 1 : 0;
    topicHeatmapMap.set(key, current);
  }

  const topicHeatmap = Array.from(topicHeatmapMap.values()).map((item) => ({
    subject: item.subject,
    topic: item.topic,
    accuracy: item.total ? (item.correct / item.total) * 100 : 0,
  }));

  return {
    scoreOverTime,
    subjectPerformance,
    mcVsLrAccuracy,
    errorTypeDistribution,
    topicHeatmap,
    weaknessClusters: weaknessClusters.data ?? [],
  };
}

export async function getTopicsForSubject(userId: string, subjectId?: string) {
  const questions = await getQuestions(userId, subjectId ? { subjectId } : undefined);
  const topics = Array.from(new Set(questions.map((question) => question.topic))).sort();
  const subtopics = Array.from(new Set(questions.map((question) => question.subtopic))).sort();

  return { topics, subtopics };
}
