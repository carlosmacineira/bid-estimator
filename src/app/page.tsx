"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  DollarSign,
  TrendingUp,
  BarChart3,
  Plus,
  Upload,
  ArrowRight,
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

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const fmtCompact = (n: number) => {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return fmt(n);
};

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

interface ProjectSummary {
  id: string;
  name: string;
  clientName: string;
  status: string;
  type: string;
  createdAt: string;
  totals?: { grandTotal: number };
}

function CountUp({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(current);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  if (prefix === "$") return <>{fmtCompact(display)}</>;
  return <>{Math.round(display)}</>;
}

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

  const activeProjects = projects.filter((p) => p.status !== "lost");
  const pipelineValue = activeProjects.reduce((s, p) => s + (p.totals?.grandTotal || 0), 0);
  const wonProjects = projects.filter((p) => p.status === "won");
  const wonValue = wonProjects.reduce((s, p) => s + (p.totals?.grandTotal || 0), 0);
  const avgMargin =
    projects.length > 0
      ? projects.reduce((s, p) => s + (p.totals?.grandTotal || 0), 0) / projects.length
      : 0;

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

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const monthProjects = projects.filter((p) => {
      const pd = new Date(p.createdAt);
      return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
    });
    return {
      month,
      value: monthProjects.reduce((s, p) => s + (p.totals?.grandTotal || 0), 0),
    };
  });

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-white/5 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass p-6 h-28 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 glass h-80 animate-pulse" />
          <div className="lg:col-span-2 glass h-80 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-white/95">Dashboard</h1>
        <p className="text-sm text-white/50 mt-1">Welcome back, Manuel</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        {[
          { label: "Active Projects", value: activeProjects.length, icon: FolderKanban, color: "text-blue-400" },
          { label: "Pipeline Value", value: pipelineValue, icon: DollarSign, color: "text-[#CC0000]", prefix: "$" },
          { label: "Won Projects", value: wonProjects.length, icon: TrendingUp, color: "text-emerald-400", subtitle: wonValue > 0 ? fmtCompact(wonValue) : undefined },
          { label: "Avg Estimate", value: avgMargin, icon: BarChart3, color: "text-amber-400", prefix: "$" },
        ].map((metric) => (
          <div key={metric.label} className="glass p-5 group hover:red-glow transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/50 uppercase tracking-wider">{metric.label}</span>
              <metric.icon className={`w-4 h-4 ${metric.color} opacity-60`} />
            </div>
            <div className={`text-2xl font-light price ${metric.color}`}>
              <CountUp value={metric.value} prefix={metric.prefix} />
            </div>
            {metric.subtitle && <p className="text-xs text-white/40 mt-1">{metric.subtitle} total value</p>}
          </div>
        ))}
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white/70">Recent Projects</h2>
            <button
              onClick={() => router.push("/projects")}
              className="text-xs text-white/40 hover:text-[#CC0000] transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentProjects.length === 0 ? (
            <div className="py-12 text-center">
              <FolderKanban className="w-10 h-10 text-white/10 mx-auto mb-2" />
              <p className="text-xs text-white/40">No projects yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/projects/${p.id}`)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{p.name}</p>
                    <p className="text-xs text-white/40">{p.clientName}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                      style={{ backgroundColor: `${STATUS_COLORS[p.status]}20`, color: STATUS_COLORS[p.status] }}
                    >
                      {p.status}
                    </span>
                    <span className="text-sm price text-white/70 w-24 text-right">
                      {fmt(p.totals?.grandTotal || 0)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 glass p-5">
          <h2 className="text-sm font-medium text-white/70 mb-4">Pipeline by Status</h2>
          {statusCounts.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-xs text-white/30">No data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {statusCounts.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={0.8} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(20,20,20,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.8)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {statusCounts.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-white/50">
                  {s.name} ({s.value})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 glass p-5">
          <h2 className="text-sm font-medium text-white/70 mb-4">Monthly Estimates</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickFormatter={(v) => fmtCompact(v)} />
              <Tooltip
                contentStyle={{
                  background: "rgba(20,20,20,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.8)",
                }}
                formatter={(value) => [fmt(Number(value)), "Value"]}
              />
              <Bar dataKey="value" fill="#CC0000" radius={[4, 4, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 glass p-5">
          <h2 className="text-sm font-medium text-white/70 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => router.push("/estimates/new")}
              className="w-full flex items-center gap-3 px-4 py-3 bg-[#CC0000]/10 hover:bg-[#CC0000]/20 border border-[#CC0000]/20 rounded-lg transition-all"
            >
              <Plus className="w-5 h-5 text-[#CC0000]" />
              <div className="text-left">
                <p className="text-sm text-white/90 font-medium">New Estimate</p>
                <p className="text-xs text-white/40">Create a new bid estimate</p>
              </div>
            </button>
            <button
              onClick={() => router.push("/materials")}
              className="w-full flex items-center gap-3 px-4 py-3 glass glass-hover rounded-lg transition-all"
            >
              <Upload className="w-5 h-5 text-white/40" />
              <div className="text-left">
                <p className="text-sm text-white/80">Manage Materials</p>
                <p className="text-xs text-white/40">Update pricing & catalog</p>
              </div>
            </button>
            <button
              onClick={() => router.push("/projects")}
              className="w-full flex items-center gap-3 px-4 py-3 glass glass-hover rounded-lg transition-all"
            >
              <FolderKanban className="w-5 h-5 text-white/40" />
              <div className="text-left">
                <p className="text-sm text-white/80">View Projects</p>
                <p className="text-xs text-white/40">Browse all estimates</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
