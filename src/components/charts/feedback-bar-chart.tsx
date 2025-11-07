
"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card } from "../ui/card";

interface ChartData {
  name: string;
  value: number;
}

interface FeedbackBarChartProps {
  data: ChartData[];
}

const chartConfig = {
  value: {
    label: "Count",
    color: "hsl(var(--chart-1))",
  },
  Collections: {
     label: "Collections",
     color: "hsl(var(--chart-2))",
  },
  Expenditure: {
      label: "Expenditure",
      color: "hsl(var(--chart-5))",
  }
};

export default function FeedbackBarChart({ data }: FeedbackBarChartProps) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart accessibilityLayer data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }} barCategoryGap="40%">
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis allowDecimals={false} />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar dataKey="value" fill="var(--color-value)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
