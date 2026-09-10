import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { CategoryChartModel } from "@/lib/categoryChart";

/* Recharts lives in this module only, so it ships as a separate lazily-loaded chunk. */

const tooltipStyle = { background: "#282828", border: "1px solid #3c3c3c", borderRadius: 12, fontSize: 11, color: "#eff1f6" };

export function CashFlowArea({
  data,
  format,
  gradientId = "cashflow",
  showXAxis = false,
}: {
  data: { month: string; income: number; expense: number }[];
  format: (value: number) => string;
  gradientId?: string;
  showXAxis?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffa116" stopOpacity={0.42} />
            <stop offset="100%" stopColor="#ffa116" stopOpacity={0} />
          </linearGradient>
        </defs>
        {showXAxis && <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />}
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => format(Number(value))} />
        <Area type="monotone" dataKey="income" stroke="#2cbb5d" strokeWidth={2} fill={`url(#${gradientId})`} />
        <Area type="monotone" dataKey="expense" stroke="#ef4743" strokeWidth={2} fill="transparent" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Stacked bars: one bar per period, each segment a category (top 5 + "Lainnya"). */
export function CategoryStackedBars({
  model,
  format,
  compactAxis,
}: {
  model: CategoryChartModel;
  format: (value: number) => string;
  compactAxis: (value: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={model.stacked} barGap={4} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="currentColor" opacity={0.08} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={52} tickFormatter={(value) => compactAxis(Number(value))} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [format(Number(value)), String(name)]} />
        {model.keys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="spend"
            fill={model.colorFor(key)}
            radius={index === model.keys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
            maxBarSize={96}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonut({
  model,
  format,
  innerRadius = 45,
  outerRadius = 68,
  emptyLabel = "No data",
}: {
  model: CategoryChartModel;
  format: (value: number) => string;
  innerRadius?: number;
  outerRadius?: number;
  emptyLabel?: string;
}) {
  const data = model.slices.length ? model.slices : [{ category: emptyLabel, current: 1, previous: 0, isOthers: true }];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="current" nameKey="category" innerRadius={innerRadius} outerRadius={outerRadius} paddingAngle={3} stroke="none">
          {data.map((slice) => (
            <Cell key={slice.category} fill={model.slices.length ? model.colorFor(slice.category) : "#3c3c3c"} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [format(Number(value)), String(name)]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="grid w-full place-items-center rounded-xl bg-secondary/30" style={{ height }} data-testid="chart-skeleton">
      <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
