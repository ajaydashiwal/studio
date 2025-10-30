
"use client"

import { Pie, PieChart, ResponsiveContainer, Cell, Legend, Tooltip } from "recharts"
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface ChartData {
  name: string
  value: number
  fill: string
}

interface MaintenancePieChartProps {
  data: ChartData[]
}

const chartConfig = {
  paid: {
    label: "Paid",
    color: "hsl(var(--chart-2))",
  },
  due: {
    label: "Due",
    color: "hsl(var(--chart-5))",
  },
}

export default function MaintenancePieChart({ data }: MaintenancePieChartProps) {
  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square h-[250px] w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            strokeWidth={5}
          >
            {data.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.fill} />
            ))}
          </Pie>
           <Legend
            content={({ payload }) => {
              return (
                <ul className="flex flex-col items-center justify-center gap-1 mt-4">
                  {payload?.map((entry) => {
                    const item = data.find(d => d.name === entry.value);
                    return (
                        <li key={`item-${entry.value}`} className="flex items-center gap-2 text-sm">
                            <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: entry.color}} />
                            <span>{entry.value}: {item?.value}</span>
                        </li>
                    )
                  })}
                </ul>
              )
            }}
            verticalAlign="bottom"
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
