export const STORAGE_BUCKET = "source-materials";

export const SUBJECT_ICONS = [
  "Sigma",
  "FlaskConical",
  "BookOpen",
  "Landmark",
  "Atom",
  "Binary",
  "Globe2",
  "ScrollText",
] as const;

export const SOURCE_FILE_LABELS = [
  "test",
  "quiz",
  "worksheet",
  "notes",
  "answer_key",
  "rubric",
  "other",
] as const;

export const QUESTION_TYPES = ["multiple_choice", "long_response"] as const;
export const TEST_TYPES = ["daily", "weekly", "custom"] as const;
export const ERROR_TYPES = ["concept", "pattern", "execution"] as const;
