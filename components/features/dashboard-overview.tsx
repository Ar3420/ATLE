"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";

export function DashboardOverview({
  metrics,
}: {
  metrics: {
    totalQuestions: number;
    testsTaken: number;
    rollingAverage: number;
    scoreTrend: Array<{ taken_at: string; percentage: number }>;
    weaknessClusters: Array<{ id: string; cluster_name: string; topic: string; error_count: number }>;
  };
}) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total questions in bank</CardDescription>
            <CardTitle className="text-4xl">{metrics.totalQuestions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tests taken</CardDescription>
            <CardTitle className="text-4xl">{metrics.testsTaken}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Average score (rolling 10)</CardDescription>
            <CardTitle className="text-4xl">
              {formatPercent(metrics.rollingAverage, 1)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Score Trend</CardTitle>
            <CardDescription>Last 10 attempts</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.scoreTrend}>
                <XAxis
                  dataKey="taken_at"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  stroke="#71717a"
                />
                <YAxis domain={[0, 100]} stroke="#71717a" />
                <Tooltip
                  contentStyle={{
                    background: "#09090b",
                    border: "1px solid #27272a",
                    borderRadius: 16,
                  }}
                />
                <Line type="monotone" dataKey="percentage" stroke="#d4b36c" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Weakness Clusters</CardTitle>
            <CardDescription>Highest recurring error groups</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.weaknessClusters.length ? (
              metrics.weaknessClusters.map((cluster) => (
                <div
                  key={cluster.id}
                  className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3"
                >
                  <p className="font-medium text-[#55627e]">{cluster.cluster_name}</p>
                  <p className="text-sm text-[#847962]">{cluster.topic}</p>
                  <p className="mt-1 text-sm text-[#b9892f]">
                    {cluster.error_count} flagged errors
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#9f947c]">No weakness clusters yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
