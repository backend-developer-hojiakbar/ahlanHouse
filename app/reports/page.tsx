"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { Search } from "@/components/search"
import { UserNav } from "@/components/user-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from "recharts"
import { Download, FileText, Printer } from "lucide-react"

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState<string>("sales")
  const [apiData, setApiData] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // localStorage dan tokenni olish
        const token = localStorage.getItem("access_token")
        
        if (!token) {
          throw new Error("Token topilmadi. Iltimos, tizimga kiring.")
        }

        const response = await fetch("http://api.ahlan.uz/payments/statistics/", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`, // Tokenni header'ga qo'shish
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`API javobi xato: ${response.status} - ${response.statusText}`)
        }

        const data = await response.json()
        setApiData(data)
        setLoading(false)
      } catch (error) {
        console.error("API dan ma'lumot olishda xatolik:", error)
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Valyutani formatlash funksiyasi
  const formatNumber = (value: number | undefined) => {
    return value !== undefined && !isNaN(value) ? value.toLocaleString("us-US") : "0"
  }

  // API ma'lumotlaridan foydalangan holda chart datalarni tayyorlash
  const salesData = apiData ? [
    { 
      name: "Jami", 
      sales: apiData.total_sales || 0, 
      target: (apiData.average_price || 0) * (apiData.total_apartments || 0) 
    }
  ] : []

  const paymentsData = apiData ? [
    { 
      name: "Jami", 
      paid: apiData.paid_payments || 0, 
      pending: apiData.pending_payments || 0, 
      overdue: apiData.overdue_payments || 0 
    }
  ] : []

  const expensesData = apiData ? [
    { name: "To'lovlar", value: apiData.total_payments || 0 },
  ] : []

  const apartmentsStatusData = apiData ? [
    { name: "Sotilgan", value: apiData.sold_apartments || 0, color: "#4ade80" },
    { name: "Band qilingan", value: apiData.reserved_apartments || 0, color: "#facc15" },
    { name: "Bo'sh", value: apiData.free_apartments || 0, color: "#3b82f6" },
  ] : []

  const COLORS = ["#4ade80", "#facc15", "#3b82f6", "#f43f5e", "#a855f7"]

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Yuklanmoqda...</div>
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="border-b sticky top-0 bg-background z-10">
        <div className="flex h-16 items-center px-4 container mx-auto">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 container mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
          <h2 className="text-3xl font-bold tracking-tight">Hisobotlar</h2>
        </div>

        <Tabs defaultValue="sales" className="space-y-4" onValueChange={setReportType}>
          <TabsList>
            <TabsTrigger value="sales">Sotuvlar</TabsTrigger>
            <TabsTrigger value="payments">To'lovlar</TabsTrigger>
            <TabsTrigger value="expenses">Xarajatlar</TabsTrigger>
            <TabsTrigger value="apartments">Xonadonlar</TabsTrigger>
            <TabsTrigger value="clients">Mijozlar</TabsTrigger>
          </TabsList>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Jami sotuvlar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(apiData?.total_sales)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sotilgan xonadonlar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(apiData?.sold_apartments)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">O'rtacha narx</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(apiData?.average_price)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Yangi mijozlar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(apiData?.clients)}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Sotuvlar dinamikasi</CardTitle>
                <CardDescription>Jami sotuvlar va o'rtacha narxlar</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={salesData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                    <Tooltip formatter={(value: number) => formatNumber(value)} />
                    <Legend />
                    <Bar dataKey="sales" name="Sotuvlar" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="target" name="Maqsad" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Jami to'lovlar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(apiData?.total_payments)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">To'langan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatNumber(apiData?.paid_payments)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Muddati o'tgan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatNumber(apiData?.overdue_payments)}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>To'lovlar dinamikasi</CardTitle>
                <CardDescription>To'lovlar holati</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={paymentsData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                    <Tooltip formatter={(value: number) => formatNumber(value)} />
                    <Legend />
                    <Bar dataKey="paid" name="To'langan" stackId="a" fill="#4ade80" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" name="Kutilmoqda" stackId="a" fill="#facc15" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="overdue" name="Muddati o'tgan" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Xarajatlar taqsimoti</CardTitle>
                  <CardDescription>Jami: {formatNumber(apiData?.total_payments)}</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-[300px] md:h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {expensesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatNumber(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Xarajatlar ro'yxati</CardTitle>
                  <CardDescription>Kategoriyalar bo'yicha foizlar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {expensesData.map((item, index) => {
                      const totalExpenses = expensesData.reduce((sum, i) => sum + (i.value || 0), 0)
                      const percentage = totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0
                      return (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span>{item.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{formatNumber(item.value)}</span>
                            <span className="text-muted-foreground w-10 text-right">{percentage.toFixed(0)}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Apartments Tab */}
          <TabsContent value="apartments" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Xonadonlar holati</CardTitle>
                  <CardDescription>Jami: {formatNumber(apiData?.total_apartments)} ta</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={apartmentsStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${formatNumber(value)}`}
                      >
                        {apartmentsStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatNumber(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Statuslar bo'yicha taqsimot</CardTitle>
                  <CardDescription>Foizli ko'rsatkichlar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {apartmentsStatusData.map((item, index) => {
                      const totalApartments = apiData?.total_apartments || 0
                      const percentage = totalApartments > 0 ? (item.value / totalApartments) * 100 : 0
                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                              <span>{item.name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{formatNumber(item.value)} ta</span>
                              <span className="text-muted-foreground w-10 text-right">{percentage.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${percentage}%`, backgroundColor: item.color }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mijozlar statistikasi</CardTitle>
                <CardDescription>Mijozlar haqida umumiy ma'lumotlar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Jami mijozlar</p>
                    <p className="text-2xl font-bold">{formatNumber(apiData?.clients)}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">O'rtacha xarid</p>
                    <p className="text-2xl font-bold">{formatNumber(apiData?.average_price)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            PDF formatida saqlash
          </Button>
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Excel formatida saqlash
          </Button>
        </div>
      </div>
    </div>
  )
}