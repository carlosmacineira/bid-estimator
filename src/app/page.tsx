"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  DollarSign,
  TrendingUp,
  BarChart3,
  Plus,
  Upload,
  ArrowRight,
  Zap,
  FileText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ─── Formatters ─── */

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n);

const fmtFull = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

/* ─── Constants ─── */

const STATUS_COLORS: Record<string, string> = {
  draft: "#6B7280",
  submitted: "#F59E0B",
  won: "#10B981",
  lost: "#EF4444",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost",
};

/* ─── Types ─── */

interface ProjectSummary {
  id: string;
  name: string;
  clientName: string;
  status: string;
  type: string;
  createdAt: string;
  totals?: { grandTotal: number };
}

/* ─── CountUp with requestAnimationFrame ─── */

function CountUp({
  value,
  prefix = "",
}: {
  value: number;
  prefix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }

    const duration = 900;
    let startTime: number | null = null;
    const startValue = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for a smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (value - startValue) * eased;

      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(value);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  if (prefix === "$") return <>{fmtCompact(display)}</>;
  return <>{Math.round(display)}</>;
}

/* ─── Glass Tooltip for Recharts ─── */

const glassTooltipStyle: React.CSSProperties = {
  background: "rgba(10, 10, 10, 0.92)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "10px",
  padding: "8px 12px",
  fontSize: "12px",
  color: "rgba(255, 255, 255, 0.85)",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
  lineHeight: "1.5",
};

/* ─── Skeleton Loader ─── */

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/[0.04] ${className ?? ""}`}
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header skeleton */}
      <div className="space-y-2">
        <SkeletonPulse className="h-7 w-44" />
        <SkeletonPulse className="h-4 w-56" />
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass p-4 sm:p-5 space-y-3">
            <SkeletonPulse className="h-3 w-20" />
            <SkeletonPulse className="h-7 w-24" />
            <SkeletonPulse className="h-2 w-16" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 glass p-5 space-y-4">
          <SkeletonPulse className="h-4 w-32" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonPulse key={i} className="h-11 w-full" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 glass p-5 space-y-4">
          <SkeletonPulse className="h-4 w-32" />
          <SkeletonPulse className="h-48 w-full rounded-full mx-auto max-w-[200px]" />
        </div>
      </div>

      {/* Bottom skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 glass p-5">
          <SkeletonPulse className="h-4 w-36 mb-4" />
          <SkeletonPulse className="h-48 w-full" />
        </div>
        <div className="lg:col-span-2 glass p-5 space-y-3">
          <SkeletonPulse className="h-4 w-28" />
          <SkeletonPulse className="h-14 w-full" />
          <SkeletonPulse className="h-14 w-full" />
          <SkeletonPulse className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}

/* ─── Empty State ─── */

function EmptyState({ onNewEstimate }: { onNewEstimate: () => void }) {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      <div className="space-y-2 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white/95">
          Dashboard
        </h1>
        <p className="text-sm text-white/45">
          Welcome back, Manuel
        </p>
      </div>

      <div className="glass p-8 sm:p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
        {/* Illustration */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <FileText className="w-9 h-9 text-white/15" />
          </div>
          <div className="absolute -top-1 -right-1 w-7 h-7 rounded-lg bg-[#CC0000]/15 border border-[#CC0000]/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-[#CC0000]" />
          </div>
        </div>

        <h2 className="text-lg font-medium text-white/80 mb-2">
          No projects yet
        </h2>
        <p className="text-sm text-white/40 max-w-sm mb-8 leading-relaxed">
          Create your first bid estimate to start tracking your electrical
          contracting pipeline and project performance.
        </p>

        <button
          onClick={onNewEstimate}
          className="flex items-center gap-2.5 px-5 py-2.5 bg-[#CC0000] hover:bg-[#E60000] text-white text-sm font-medium rounded-xl transition-all duration-200 shadow-lg shadow-[#CC0000]/20"
        >
          <Plus className="w-4 h-4" />
          Create First Estimate
        </button>
      </div>
    </div>
  );
}

/* ─── Custom Donut Label ─── */

function DonutCenterLabel({
  total,
}: {
  total: number;
}) {
  return (
    <text
      x="50%"
      y="50%"
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-white/80"
    >
      <tspan x="50%" dy="-0.4em" fontSize="20" fontWeight="600" fontFamily="SF Mono, Fira Code, ui-monospace, monospace">
        {total}
      </tspan>
      <tspan x="50%" dy="1.6em" fontSize="10" fill="rgba(255,255,255,0.4)" letterSpacing="0.05em">
        TOTAL
      </tspan>
    </text>
  );
}

/* ═══════════════════════════════════════════════
   MAIN DASHBOARD PAGE
   ═══════════════════════════════════════════════ */

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ─── Computed values ─── */

  const activeProjects = projects.filter((p) => p.status !== "lost");
  const pipelineValue = activeProjects.reduce(
    (s, p) => s + (p.totals?.grandTotal || 0),
    0
  );
  const wonProjects = projects.filter((p) => p.status === "won");
  const wonValue = wonProjects.reduce(
    (s, p) => s + (p.totals?.grandTotal || 0),
    0
  );
  const avgEstimate =
    projects.length > 0
      ? projects.reduce((s, p) => s + (p.totals?.grandTotal || 0), 0) /
        projects.length
      : 0;

  /* Pipeline by Status */
  const statusCounts = Object.entries(
    projects.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    color: STATUS_COLORS[status] || "#6B7280",
  }));

  /* Monthly estimates (last 6 months) */
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const monthProjects = projects.filter((p) => {
      const pd = new Date(p.createdAt);
      return (
        pd.getMonth() === d.getMonth() &&
        pd.getFullYear() === d.getFullYear()
      );
    });
    return {
      month,
      value: monthProjects.reduce(
        (s, p) => s + (p.totals?.grandTotal || 0),
        0
      ),
      count: monthProjects.length,
    };
  });

  /* Recent projects */
  const recentProjects = [...projects]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 8);

  const handleNavigate = useCallback(
    (path: string) => () => router.push(path),
    [router]
  );

  /* ─── States ─── */

  if (loading) return <DashboardSkeleton />;

  if (projects.length === 0) {
    return <EmptyState onNewEstimate={() => router.push("/estimates/new")} />;
  }

  /* ─── Metrics config ─── */

  const metrics = [
    {
      label: "Active Projects",
      value: activeProjects.length,
      icon: FolderKanban,
      color: "#3B82F6",
      prefix: "",
      subtitle: null,
    },
    {
      label: "Pipeline Value",
      value: pipelineValue,
      icon: DollarSign,
      color: "#CC0000",
      prefix: "$",
      subtitle: null,
    },
    {
      label: "Won Projects",
      value: wonProjects.length,
      icon: TrendingUp,
      color: "#10B981",
      prefix: "",
      subtitle: wonValue > 0 ? `${fmtCompact(wonValue)} value` : null,
    },
    {
      label: "Avg Estimate",
      value: avgEstimate,
      icon: BarChart3,
      color: "#F59E0B",
      prefix: "$",
      subtitle: null,
    },
  ];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-5 sm:space-y-6 max-w-[1400px] mx-auto">
      {/* ─── Header ─── */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold tracking-tight text-white/95">
          Manny Source Electric Corp.
        </h1>
        <p className="text-sm text-white/45 mt-1">
          Bid Estimator Dashboard
        </p>
      </div>

      {/* ─── Metric Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="glass p-4 sm:p-5 group hover:red-glow transition-all duration-300 cursor-default"
          >
            {/* Top row: label + icon */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/45 uppercase tracking-wider font-medium">
                {metric.label}
              </span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-300"
                style={{ backgroundColor: `${metric.color}12` }}
              >
                <metric.icon
                  className="w-3.5 h-3.5 opacity-70"
                  style={{ color: metric.color }}
                />
              </div>
            </div>

            {/* Value */}
            <div
              className="text-xl sm:text-2xl font-semibold price tracking-tight"
              style={{ color: metric.color }}
            >
              <CountUp value={metric.value} prefix={metric.prefix} />
            </div>

            {/* Optional subtitle */}
            {metric.subtitle && (
              <p className="text-[11px] text-white/35 mt-1.5 price">
                {metric.subtitle}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ─── Middle Row: Recent Projects + Pipeline Donut ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 stagger">
        {/* Recent Projects */}
        <div className="lg:col-span-3 glass p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs text-white/50 uppercase tracking-wider font-medium">
              Recent Projects
            </h2>
            <button
              onClick={handleNavigate("/projects")}
              className="text-xs text-white/35 hover:text-[#CC0000] transition-colors duration-200 flex items-center gap-1 group/link"
            >
              View all
              <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform duration-200" />
            </button>
          </div>

          {recentProjects.length === 0 ? (
            <div className="py-12 text-center">
              <FolderKanban className="w-10 h-10 text-white/[0.07] mx-auto mb-3" />
              <p className="text-xs text-white/30">No projects yet</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {recentProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/projects/${p.id}`)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors duration-150 text-left group/row"
                >
                  {/* Left: Project info */}
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm text-white/80 truncate group-hover/row:text-white/95 transition-colors duration-150">
                      {p.name}
                    </p>
                    <p className="text-xs text-white/35 truncate mt-0.5">
                      {p.clientName}
                    </p>
                  </div>

                  {/* Right: Status pill + amount */}
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span
                      className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full capitalize font-medium whitespace-nowrap"
                      style={{
                        backgroundColor: `${STATUS_COLORS[p.status]}18`,
                        color: STATUS_COLORS[p.status],
                      }}
                    >
                      {p.status}
                    </span>
                    <span className="text-xs sm:text-sm price text-white/60 w-20 sm:w-24 text-right tabular-nums">
                      {fmt(p.totals?.grandTotal || 0)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline by Status (Donut) */}
        <div className="lg:col-span-2 glass p-4 sm:p-5">
          <h2 className="text-xs text-white/50 uppercase tracking-wider font-medium mb-4">
            Pipeline by Status
          </h2>

          {statusCounts.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-xs text-white/25">No data yet</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusCounts}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={82}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    animationBegin={200}
                    animationDuration={800}
                  >
                    {statusCounts.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.color}
                        opacity={0.85}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={glassTooltipStyle}
                    itemStyle={{ color: "rgba(255,255,255,0.85)" }}
                    cursor={false}
                  />
                  {/* Center label */}
                  <text
                    x="50%"
                    y="46%"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="rgba(255,255,255,0.85)"
                    fontSize="20"
                    fontWeight="600"
                    fontFamily="SF Mono, Fira Code, ui-monospace, monospace"
                  >
                    {projects.length}
                  </text>
                  <text
                    x="50%"
                    y="58%"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="rgba(255,255,255,0.35)"
                    fontSize="9"
                    letterSpacing="0.1em"
                  >
                    TOTAL
                  </text>
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-3">
                {statusCounts.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-xs text-white/45">
                      {s.name}
                    </span>
                    <span className="text-xs price text-white/30">
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── Bottom Row: Monthly Chart + Quick Actions ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 stagger">
        {/* Monthly Estimates Bar Chart */}
        <div className="lg:col-span-3 glass p-4 sm:p-5">
          <h2 className="text-xs text-white/50 uppercase tracking-wider font-medium mb-4">
            Monthly Estimates
          </h2>

          <ResponsiveContainer width="100%" height={210}>
            <BarChart
              data={monthlyData}
              margin={{ top: 4, right: 4, bottom: 0, left: -12 }}
            >
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "rgba(255,255,255,0.35)",
                  fontSize: 11,
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "rgba(255,255,255,0.25)",
                  fontSize: 10,
                }}
                tickFormatter={(v: number) => fmtCompact(v)}
                width={52}
              />
              <Tooltip
                contentStyle={glassTooltipStyle}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                formatter={(value) => [fmtFull(Number(value)), "Value"]}
                labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }}
              />
              <Bar
                dataKey="value"
                fill="#CC0000"
                radius={[6, 6, 0, 0]}
                opacity={0.8}
                maxBarSize={48}
                animationBegin={300}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 glass p-4 sm:p-5">
          <h2 className="text-xs text-white/50 uppercase tracking-wider font-medium mb-4">
            Quick Actions
          </h2>

          <div className="space-y-2.5">
            {/* Primary: New Estimate */}
            <button
              onClick={handleNavigate("/estimates/new")}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-[#CC0000]/10 hover:bg-[#CC0000]/[0.18] border border-[#CC0000]/20 hover:border-[#CC0000]/30 rounded-xl transition-all duration-200 group/action"
            >
              <div className="w-9 h-9 rounded-lg bg-[#CC0000]/15 flex items-center justify-center group-hover/action:bg-[#CC0000]/25 transition-colors duration-200">
                <Plus className="w-4 h-4 text-[#CC0000]" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm text-white/90 font-medium">
                  New Estimate
                </p>
                <p className="text-[11px] text-white/35 mt-0.5">
                  Create a new bid estimate
                </p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover/action:text-[#CC0000]/60 group-hover/action:translate-x-0.5 transition-all duration-200" />
            </button>

            {/* Secondary: Manage Materials */}
            <button
              onClick={handleNavigate("/materials")}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.1] rounded-xl transition-all duration-200 group/action"
            >
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center group-hover/action:bg-white/[0.08] transition-colors duration-200">
                <Upload className="w-4 h-4 text-white/40" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm text-white/75">Manage Materials</p>
                <p className="text-[11px] text-white/30 mt-0.5">
                  Update pricing & catalog
                </p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-white/10 group-hover/action:text-white/30 group-hover/action:translate-x-0.5 transition-all duration-200" />
            </button>

            {/* Secondary: View Projects */}
            <button
              onClick={handleNavigate("/projects")}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.1] rounded-xl transition-all duration-200 group/action"
            >
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center group-hover/action:bg-white/[0.08] transition-colors duration-200">
                <FolderKanban className="w-4 h-4 text-white/40" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm text-white/75">View Projects</p>
                <p className="text-[11px] text-white/30 mt-0.5">
                  Browse all estimates
                </p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-white/10 group-hover/action:text-white/30 group-hover/action:translate-x-0.5 transition-all duration-200" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
