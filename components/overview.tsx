"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

const data = [
  {
    name: "Yan",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Fev",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Mar",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Apr",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "May",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Iyun",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Iyul",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Avg",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Sen",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Okt",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Noy",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "Dek",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
]

export function Overview() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip formatter={(value) => [`$${value}`, "Sotuvlar"]} labelFormatter={(label) => `${label} oyi`} />
        <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

