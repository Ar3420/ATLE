"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type AnalyticsData = {
  scoreOverTime: Array<{ date: string; percentage: number }>;
  subjectPerformance: Array<{ subject: string; score: number }>;
  mcVsLrAccuracy: Array<{ date: string; mc_accuracy: number; lr_accuracy: number }>;
  errorTypeDistribution: Array<{ type: string; count: number }>;
  topicHeatmap: Array<{ subject: string; topic: string; accuracy: number }>;
  weaknessClusters: Array<{ id: string; cluster_name: string; error_count: number }>;
};

export function AnalyticsDashboard({
  data,
  subjects,
}: {
  data: AnalyticsData;
  subjects: Array<{ id: string; name: string }>;
}) {
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    subject: "",
    testType: "",
  });

  const filtered = useMemo(() => {
    const withinRange = (date: string) => {
      if (filters.startDate && date < filters.startDate) return false;
      if (filters.endDate && date > filters.endDate) return false;
      return true;
    };

    return {
      scoreOverTime: data.scoreOverTime.filter((item) => withinRange(item.date)),
      subjectPerformance: filters.subject
        ? data.subjectPerformance.filter(
            (item) =>
              item.subject ===
              subjects.find((subject) => subject.id === filters.subject)?.name,
          )
        : data.subjectPerformance,
      mcVsLrAccuracy: data.mcVsLrAccuracy.filter((item) => withinRange(item.date)),
      errorTypeDistribution: data.errorTypeDistribution,
      topicHeatmap: filters.subject
        ? data.topicHeatmap.filter(
            (item) =>
              item.subject ===
              subjects.find((subject) => subject.id === filters.subject)?.name,
          )
        : data.topicHeatmap,
      weaknessClusters: data.weaknessClusters,
    };
  }, [data, filters, subjects]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Input
            type="date"
            value={filters.startDate}
            onChange={(event) =>
              setFilters((current) => ({ ...current, startDate: event.target.value }))
            }
          />
          <Input
            type="date"
            value={filters.endDate}
            onChange={(event) =>
              setFilters((current) => ({ ...current, endDate: event.target.value }))
            }
          />
          <Select
            value={filters.subject}
            onChange={(event) =>
              setFilters((current) => ({ ...current, subject: event.target.value }))
            }
            options={subjects.map((subject) => ({
              label: subject.name,
              value: subject.id,
            }))}
            placeholder="All subjects"
          />
          <Select
            value={filters.testType}
            onChange={(event) =>
              setFilters((current) => ({ ...current, testType: event.target.value }))
            }
            options={[
              { label: "daily", value: "daily" },
              { label: "weekly", value: "weekly" },
              { label: "custom", value: "custom" },
            ]}
            placeholder="All test types"
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <MetricChart title="Score Over Time">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filtered.scoreOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="percentage" stroke="#d4b36c" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </MetricChart>

        <MetricChart title="Subject Performance">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filtered.subjectPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="score" fill="#e4bd62" />
            </BarChart>
          </ResponsiveContainer>
        </MetricChart>

        <MetricChart title="MC vs LR Accuracy">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filtered.mcVsLrAccuracy}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="mc_accuracy" stroke="#cf9b3f" />
              <Line type="monotone" dataKey="lr_accuracy" stroke="#6d7894" />
            </LineChart>
          </ResponsiveContainer>
        </MetricChart>

        <MetricChart title="Error Type Distribution">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filtered.errorTypeDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#d9ae59" />
            </BarChart>
          </ResponsiveContainer>
        </MetricChart>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Topic Accuracy Heatmap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filtered.topicHeatmap.map((item) => (
              <div
                key={`${item.subject}-${item.topic}`}
                className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3"
              >
                <div>
                  <p className="font-medium text-[#55627e]">{item.subject}</p>
                  <p className="text-sm text-[#9f947c]">{item.topic}</p>
                </div>
                <div
                  className="rounded-full px-3 py-1 text-sm font-medium"
                  style={{
                    backgroundColor: `rgba(34, 197, 94, ${Math.max(
                      0.1,
                      item.accuracy / 100,
                    )})`,
                  }}
                >
                  {item.accuracy.toFixed(1)}%
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weakness Cluster Trend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filtered.weaknessClusters.map((cluster) => (
              <div
                key={cluster.id}
                className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3"
              >
                <p className="font-medium text-[#55627e]">{cluster.cluster_name}</p>
                <p className="mt-1 text-sm text-[#b9892f]">{cluster.error_count} errors</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricChart({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-80">{children}</CardContent>
    </Card>
  );
}
