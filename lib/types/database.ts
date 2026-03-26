export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SourceFileLabel =
  | "test"
  | "quiz"
  | "worksheet"
  | "notes"
  | "answer_key"
  | "rubric"
  | "other";

export type SourceFileType = "pdf" | "image" | "text";
export type ProcessingStatus = "pending" | "extracting" | "review_ready" | "failed";
export type QuestionType = "multiple_choice" | "long_response";
export type TestType = "daily" | "weekly" | "custom";
export type ErrorType = "concept" | "pattern" | "execution";

export type Database = {
  public: {
    Tables: {
      users: {
        Row: { id: string; email: string; created_at: string };
        Insert: { id: string; email: string; created_at?: string };
        Update: { id?: string; email?: string; created_at?: string };
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          icon: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color: string;
          icon: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subjects"]["Insert"]>;
        Relationships: [];
      };
      source_files: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          file_path: string;
          file_type: SourceFileType;
          label: SourceFileLabel;
          processing_status: ProcessingStatus;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          file_path: string;
          file_type: SourceFileType;
          label: SourceFileLabel;
          processing_status?: ProcessingStatus;
          uploaded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["source_files"]["Insert"]>;
        Relationships: [];
      };
      pending_questions: {
        Row: {
          id: string;
          user_id: string;
          source_file_id: string;
          question_text: string;
          type: QuestionType;
          topic: string | null;
          subtopic: string | null;
          difficulty: number;
          answer: string;
          explanation: string | null;
          rubric_json: Json | null;
          metadata_json: Json;
          choices_json: Json;
          uncertain: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_file_id: string;
          question_text: string;
          type: QuestionType;
          topic?: string | null;
          subtopic?: string | null;
          difficulty: number;
          answer: string;
          explanation?: string | null;
          rubric_json?: Json | null;
          metadata_json?: Json;
          choices_json?: Json;
          uncertain?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pending_questions"]["Insert"]>;
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          source_file_id: string | null;
          question_text: string;
          type: QuestionType;
          topic: string;
          subtopic: string;
          difficulty: number;
          answer: string;
          explanation: string | null;
          rubric_json: Json | null;
          metadata_json: Json;
          times_used: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          source_file_id?: string | null;
          question_text: string;
          type: QuestionType;
          topic: string;
          subtopic: string;
          difficulty: number;
          answer: string;
          explanation?: string | null;
          rubric_json?: Json | null;
          metadata_json?: Json;
          times_used?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["questions"]["Insert"]>;
        Relationships: [];
      };
      choices: {
        Row: { id: string; question_id: string; text: string; is_correct: boolean };
        Insert: {
          id?: string;
          question_id: string;
          text: string;
          is_correct?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["choices"]["Insert"]>;
        Relationships: [];
      };
      tests: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          type: TestType;
          scope_json: Json;
          config_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          type: TestType;
          scope_json?: Json;
          config_json?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tests"]["Insert"]>;
        Relationships: [];
      };
      test_questions: {
        Row: { test_id: string; question_id: string; order_index: number };
        Insert: { test_id: string; question_id: string; order_index: number };
        Update: Partial<Database["public"]["Tables"]["test_questions"]["Insert"]>;
        Relationships: [];
      };
      attempts: {
        Row: {
          id: string;
          test_id: string;
          user_id: string;
          score: number;
          percentage: number;
          mc_accuracy: number;
          lr_accuracy: number;
          time_taken: number;
          notes: string | null;
          taken_at: string;
        };
        Insert: {
          id?: string;
          test_id: string;
          user_id: string;
          score: number;
          percentage: number;
          mc_accuracy: number;
          lr_accuracy: number;
          time_taken: number;
          notes?: string | null;
          taken_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["attempts"]["Insert"]>;
        Relationships: [];
      };
      attempt_question_results: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string;
          is_correct: boolean;
          error_type: ErrorType | null;
          user_answer: string | null;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          question_id: string;
          is_correct: boolean;
          error_type?: ErrorType | null;
          user_answer?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["attempt_question_results"]["Insert"]
        >;
        Relationships: [];
      };
      weakness_clusters: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          cluster_name: string;
          topic: string;
          subtopic: string;
          error_count: number;
          last_updated: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          cluster_name: string;
          topic: string;
          subtopic: string;
          error_count?: number;
          last_updated?: string;
        };
        Update: Partial<Database["public"]["Tables"]["weakness_clusters"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TableInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
