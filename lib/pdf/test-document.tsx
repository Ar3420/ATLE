import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToStream,
} from "@react-pdf/renderer";

type PdfQuestion = {
  id: string;
  type: "multiple_choice" | "long_response";
  question_text: string;
  answer: string;
  explanation?: string | null;
  rubric_json?: Record<string, unknown> | null;
  choices?: Array<{ text: string; is_correct: boolean }>;
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 11,
    color: "#111827",
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    marginBottom: 4,
  },
  meta: {
    color: "#4b5563",
    marginBottom: 2,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  question: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  choice: {
    marginTop: 3,
    marginLeft: 10,
  },
  answer: {
    marginTop: 6,
    color: "#047857",
  },
  note: {
    marginTop: 4,
    color: "#6b7280",
  },
  blankLines: {
    marginTop: 8,
    color: "#9ca3af",
  },
});

function TestDocument({
  title,
  createdAt,
  subjects,
  version,
  questions,
}: {
  title: string;
  createdAt: string;
  subjects: string[];
  version: "student" | "key";
  questions: PdfQuestion[];
}) {
  const multipleChoice = questions.filter((question) => question.type === "multiple_choice");
  const longResponse = questions.filter((question) => question.type === "long_response");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>Generated: {new Date(createdAt).toLocaleDateString()}</Text>
          <Text style={styles.meta}>Subjects: {subjects.join(", ") || "Mixed"}</Text>
          <Text style={styles.meta}>Version: {version === "student" ? "Student" : "Answer Key"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section 1. Multiple Choice</Text>
          {multipleChoice.map((question, index) => (
            <View key={question.id} style={styles.question}>
              <Text>{index + 1}. {question.question_text}</Text>
              {(question.choices ?? []).map((choice, choiceIndex) => (
                <Text key={`${question.id}-${choiceIndex}`} style={styles.choice}>
                  {String.fromCharCode(65 + choiceIndex)}. {choice.text}
                  {version === "key" && choice.is_correct ? "  (Correct)" : ""}
                </Text>
              ))}
              {version === "key" ? <Text style={styles.answer}>Answer: {question.answer}</Text> : null}
              {version === "key" && question.explanation ? (
                <Text style={styles.note}>Explanation: {question.explanation}</Text>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section 2. Long Response</Text>
          {longResponse.map((question, index) => (
            <View key={question.id} style={styles.question}>
              <Text>{multipleChoice.length + index + 1}. {question.question_text}</Text>
              {version === "student" ? (
                <Text style={styles.blankLines}>
                  ________________________________________________
                  {"\n"}_______________________________________________
                  {"\n"}_______________________________________________
                </Text>
              ) : null}
              {version === "key" ? <Text style={styles.answer}>Suggested answer: {question.answer}</Text> : null}
              {version === "key" && question.explanation ? (
                <Text style={styles.note}>Explanation: {question.explanation}</Text>
              ) : null}
              {version === "key" && question.rubric_json ? (
                <Text style={styles.note}>Rubric: {JSON.stringify(question.rubric_json)}</Text>
              ) : null}
            </View>
          ))}
        </View>

        {version === "student" && multipleChoice.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bubble Answer Sheet</Text>
            {multipleChoice.map((_, index) => (
              <Text key={`bubble-${index}`} style={styles.choice}>
                {index + 1}. A   B   C   D
              </Text>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export async function buildTestPdfStream(input: {
  title: string;
  createdAt: string;
  subjects: string[];
  version: "student" | "key";
  questions: PdfQuestion[];
}) {
  return renderToStream(<TestDocument {...input} />);
}
