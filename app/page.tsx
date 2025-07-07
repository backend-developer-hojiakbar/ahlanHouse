"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDateRangePicker } from "@/components/date-range-picker";
import { CreditCard, DollarSign, Home, Loader2, Users, Truck, Building2, Hammer, Wrench, HardHat, Factory, Warehouse, Construction, Building } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Payment {
  id: number;
  user_fio: string;
  apartment_info: string;
  total_amount: string;
  created_at: string;
  due_date?: string;
  status: string;
}

interface SalesData {
  name: string;
  total: number;
}

const Overview = ({ data }: { data: SalesData[] }) => {
  return (
    <div className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/10 dark:border-sky-700/10">
      <LineChart width={500} height={300} data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-white/20 dark:stroke-sky-700/20" />
        <XAxis dataKey="name" className="text-sm text-slate-700 dark:text-slate-300" />
        <YAxis className="text-sm text-slate-700 dark:text-slate-300" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(8px)'
          }}
          formatter={(value: number) => value.toLocaleString("us-US", { style: "currency", currency: "USD" })}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#0ea5e9"
          strokeWidth={2}
          dot={{ fill: '#0ea5e9', strokeWidth: 2 }}
          activeDot={{ r: 8, fill: '#0284c7' }}
        />
      </LineChart>
    </div>
  );
};

const FloatingIcons = () => {
  const icons = [
    { Icon: require('lucide-react').Rocket, color: 'from-pink-500 via-red-500 to-yellow-500' },
    { Icon: require('lucide-react').Star, color: 'from-yellow-400 via-orange-400 to-pink-500' },
    { Icon: require('lucide-react').Heart, color: 'from-red-400 via-pink-500 to-purple-500' },
    { Icon: require('lucide-react').Cloud, color: 'from-sky-400 via-blue-400 to-indigo-400' },
    { Icon: require('lucide-react').Sun, color: 'from-yellow-300 via-orange-400 to-red-400' },
    { Icon: require('lucide-react').Moon, color: 'from-indigo-400 via-blue-400 to-sky-400' },
    { Icon: require('lucide-react').Zap, color: 'from-yellow-400 via-lime-400 to-green-400' },
    { Icon: require('lucide-react').Flame, color: 'from-orange-500 via-red-500 to-yellow-500' },
    { Icon: require('lucide-react').Feather, color: 'from-teal-400 via-cyan-400 to-blue-400' },
    { Icon: require('lucide-react').Smile, color: 'from-yellow-400 via-pink-400 to-red-400' },
  ];
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {icons.map(({ Icon, color }, index) => {
        const duration = 12 + Math.random() * 10;
        const delay = Math.random() * 5;
        const size = 36 + Math.random() * 32;
        const xStart = Math.random() * window.innerWidth * 0.8;
        const yStart = Math.random() * window.innerHeight * 0.8;
        return (
          <motion.div
            key={index}
            className={`absolute drop-shadow-xl`}
            initial={{
              x: xStart,
              y: yStart,
              scale: 0.8 + Math.random() * 0.6,
              rotate: Math.random() * 360,
              opacity: 0.7 + Math.random() * 0.3,
            }}
            animate={{
              x: [xStart, xStart + 80 * Math.sin(index), xStart + 160 * Math.sin(index * 2), xStart],
              y: [yStart, yStart + 60 * Math.cos(index), yStart - 60 * Math.cos(index * 2), yStart],
              scale: [1, 1.2, 0.9, 1],
              rotate: [0, 360],
              opacity: [0.8, 1, 0.8],
              filter: [
                'blur(0.5px) brightness(1)',
                'blur(1.5px) brightness(1.2)',
                'blur(0.5px) brightness(1)',
              ],
            }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: 'easeInOut',
              times: [0, 0.33, 0.66, 1],
            }}
            style={{
              zIndex: 0,
            }}
          >
            <div className={`bg-gradient-to-br ${color} rounded-full p-2 shadow-2xl`}>
              <Icon size={size} className="text-white drop-shadow-lg" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalApartments: 0,
    soldApartments: 0,
    reservedApartments: 0,
    availableApartments: 0,
    totalClients: 0,
    totalSales: 0,
    totalPayments: 0,
    pendingPayments: 0,
    totalSuppliers: 0,
    averagePrice: 0,
    paymentsDueToday: 0,
    paymentsPaidToday: 0,
  });
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });

  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [modalPayments, setModalPayments] = useState<Payment[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const icons = [
    { Icon: Building2, size: 48 }, { Icon: Home, size: 42 }, { Icon: Hammer, size: 46 },
    { Icon: Wrench, size: 40 }, { Icon: HardHat, size: 48 }, { Icon: Truck, size: 52 },
    { Icon: Building, size: 56 }, { Icon: Factory, size: 48 }, { Icon: Warehouse, size: 46 },
    { Icon: Construction, size: 42 }, { Icon: Building2, size: 46 }, { Icon: Home, size: 48 },
    { Icon: Hammer, size: 44 }, { Icon: Wrench, size: 46 }, { Icon: HardHat, size: 50 },
    { Icon: Building2, size: 48 }, { Icon: Home, size: 42 }, { Icon: Hammer, size: 46 },
    { Icon: Wrench, size: 40 }, { Icon: HardHat, size: 48 }, { Icon: Truck, size: 52 },
    { Icon: Building, size: 56 }, { Icon: Factory, size: 48 }, { Icon: Warehouse, size: 46 },
    { Icon: Construction, size: 42 }, { Icon: Building2, size: 46 }, { Icon: Home, size: 48 },
    { Icon: Hammer, size: 44 }, { Icon: Wrench, size: 46 }, { Icon: HardHat, size: 50 },
    { Icon: Building2, size: 48 }, { Icon: Home, size: 42 }, { Icon: Hammer, size: 46 },
    { Icon: Wrench, size: 40 }, { Icon: HardHat, size: 48 }, { Icon: Truck, size: 52 },
    { Icon: Building, size: 56 }, { Icon: Factory, size: 48 }, { Icon: Warehouse, size: 46 },
    { Icon: Construction, size: 42 },
  ];

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    setAccessToken(token);
  }, [router]);

  const getAuthHeaders = useCallback(
    () => ({
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    }),
    [accessToken]
  );

  useEffect(() => {
    if (!accessToken) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        let url = "http://api.ahlan.uz/payments/statistics/";
        if (dateRange.from && dateRange.to) {
          url += `?created_at__gte=${dateRange.from.toISOString().split("T")[0]}&created_at__lte=${dateRange.to.toISOString().split("T")[0]}`;
        }

        const statsResponse = await fetch(url, { method: "GET", headers: getAuthHeaders() });
        if (!statsResponse.ok) {
          if (statsResponse.status === 401) {
            localStorage.removeItem("access_token");
            router.push("/login");
            return;
          }
          throw new Error("Statistikani olishda xatolik");
        }

        const statsData = await statsResponse.json();

        const soldApartmentsUrl = `http://api.ahlan.uz/apartments/?status__in=paid,sotilgan&page_size=1000`;
        const soldApartmentsResponse = await fetch(
          soldApartmentsUrl,
          { method: "GET", headers: getAuthHeaders() }
        );
        if (!soldApartmentsResponse.ok) {
          throw new Error("Sotilgan xonadonlarni olishda xatolik");
        }
        const soldApartmentsData = await soldApartmentsResponse.json();

        const actualSoldCount = (soldApartmentsData.results || []).filter(
          (apt: { status: string }) => apt.status === 'paid' || apt.status === 'sotilgan'
        ).length;

        const suppliersResponse = await fetch("http://api.ahlan.uz/suppliers/", {
          method: "GET", headers: getAuthHeaders(),
        });
        if (!suppliersResponse.ok) {
          throw new Error("Yetkazib beruvchilarni olishda xatolik");
        }
        const suppliersData = await suppliersResponse.json();
        const totalSuppliers = suppliersData.count || 0;

        setStats({
          totalProperties: statsData.total_objects || 0,
          totalApartments: statsData.total_apartments || 0,
          soldApartments: actualSoldCount,
          reservedApartments: statsData.reserved_apartments || 0,
          availableApartments: statsData.free_apartments || 0,
          totalClients: statsData.clients || 0,
          totalSales: statsData.total_sales || 0,
          totalPayments: statsData.total_payments || 0,
          pendingPayments: statsData.pending_payments || 0,
          totalSuppliers: totalSuppliers,
          averagePrice: statsData.average_price || 0,
          paymentsDueToday: statsData.payments_due_today || 0,
          paymentsPaidToday: statsData.payments_paid_today || 0,
        });
      } catch (error: any) {
        toast({ title: "Xatolik", description: error.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [accessToken, router, dateRange, getAuthHeaders]);

  useEffect(() => {
    if (!accessToken) return;

    const fetchRecentPayments = async () => {
      try {
        let url = "http://api.ahlan.uz/payments/?page_size=5";
        if (dateRange.from && dateRange.to) {
          url += `&created_at__gte=${dateRange.from.toISOString().split("T")[0]}&created_at__lte=${dateRange.to.toISOString().split("T")[0]}`;
        }

        const response = await fetch(url, { method: "GET", headers: getAuthHeaders() });
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("access_token");
            router.push("/login");
            return;
          }
          throw new Error("To'lovlarni olishda xatolik");
        }

        const data = await response.json();
        setRecentPayments(data.results || []);
      } catch (error: any) {
        toast({ title: "Xatolik", description: error.message, variant: "destructive" });
        setRecentPayments([]);
      }
    };

    fetchRecentPayments();
  }, [accessToken, router, dateRange, getAuthHeaders]);

  useEffect(() => {
    if (!accessToken) return;

    const fetchSalesData = async () => {
      try {
        let url = "http://api.ahlan.uz/payments/";
        if (dateRange.from && dateRange.to) {
          url += `?created_at__gte=${dateRange.from.toISOString().split("T")[0]}&created_at__lte=${dateRange.to.toISOString().split("T")[0]}`;
        }

        const response = await fetch(url, { method: "GET", headers: getAuthHeaders() });
        if (!response.ok) throw new Error("Sotuvlar dinamikasini olishda xatolik");

        const data = await response.json();
        const payments = data.results || [];

        const monthlySales = payments.reduce((acc: Record<string, number>, payment: Payment) => {
          if (!payment.created_at || !payment.total_amount) return acc;
          const date = new Date(payment.created_at);
          if (isNaN(date.getTime())) return acc;
          const monthYear = date.toLocaleString("default", { month: "short", year: "numeric" });
          acc[monthYear] = (acc[monthYear] || 0) + parseFloat(payment.total_amount);
          return acc;
        }, {});

        const chartData = Object.entries(monthlySales)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

        setSalesData(chartData);
      } catch (error: any) {
        toast({ title: "Xatolik", description: error.message, variant: "destructive" });
        setSalesData([
          { name: "Yan 2025", total: 40000000 },
          { name: "Fev 2025", total: 50000000 },
          { name: "Mar 2025", total: 60000000 },
        ]);
      }
    };

    fetchSalesData();
  }, [accessToken, router, dateRange, getAuthHeaders]);

  const fetchModalPayments = useCallback(
    async (type: "pending") => {
      if (!accessToken) return;
      setModalLoading(true);
      setModalPayments([]);
      try {
        let url = "http://api.ahlan.uz/payments/?page_size=1000";
        if (dateRange.from && dateRange.to) {
          url += `&created_at__gte=${dateRange.from.toISOString().split("T")[0]}&created_at__lte=${dateRange.to.toISOString().split("T")[0]}`;
        }
        if (type === "pending") {
          url += "&status=pending";
        }

        const response = await fetch(url, { method: "GET", headers: getAuthHeaders() });
        if (!response.ok) throw new Error(`${type} to'lovlarni olishda xatolik`);

        const data = await response.json();
        setModalPayments(data.results || []);
      } catch (error: any) {
        toast({ title: "Xatolik", description: error.message, variant: "destructive" });
        setModalPayments([]);
      } finally {
        setModalLoading(false);
      }
    },
    [accessToken, dateRange, getAuthHeaders]
  );

  const handleOpenPendingModal = () => {
    setPendingModalOpen(true);
    fetchModalPayments("pending");
  };

  const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
    setDateRange(range);
  };

  const formatCurrency = (amount: number | string) => {
    const numericAmount = Number(amount || 0);
    return numericAmount.toLocaleString("us-US", { style: "currency", currency: "USD" });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-[#90EE90]/75 via-[#87CEEB]/75 to-[#D3D3D3]/75 dark:from-[#90EE90]/75 dark:via-[#87CEEB]/75 dark:to-[#D3D3D3]/75">
        <div className="flex items-center space-x-4">
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Construction className="h-12 w-12 text-sky-600 dark:text-sky-400" />
          </motion.div>
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-2xl font-bold text-sky-600 dark:text-sky-400"
            >
              Ahlan House
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-slate-600 dark:text-slate-400"
            >
              Ma'lumotlar yuklanmoqda...
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col relative">
      <div className="fixed inset-0 bg-gradient-to-tr from-[#90EE90]/75 via-[#87CEEB]/75 to-[#D3D3D3]/75 dark:from-[#90EE90]/75 dark:via-[#87CEEB]/75 dark:to-[#D3D3D3]/75 opacity-40 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-[#90EE90]/75 via-transparent to-transparent dark:from-[#90EE90]/75 opacity-35 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-[#87CEEB]/75 via-transparent to-transparent dark:from-[#87CEEB]/75 opacity-35 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#D3D3D3]/75 via-transparent to-transparent dark:from-[#D3D3D3]/75 opacity-35 -z-10" />

      <div className="fixed top-0 left-0 w-[1000px] h-[1000px] bg-[#90EE90]/75 dark:bg-[#90EE90]/75 rounded-full blur-[100px] opacity-35 -z-10" />
      <div className="fixed bottom-0 right-0 w-[1000px] h-[1000px] bg-[#87CEEB]/75 dark:bg-[#87CEEB]/75 rounded-full blur-[100px] opacity-35 -z-10" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#D3D3D3]/75 dark:bg-[#D3D3D3]/75 rounded-full blur-[100px] opacity-35 -z-10" />

      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        {icons.map(({ Icon, size }, index) => (
          <motion.div
            key={index}
            className="absolute text-sky-300/30 dark:text-sky-200/30"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              rotate: Math.random() * 360,
              scale: 0.9 + Math.random() * 0.3,
            }}
            animate={{
              x: [
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth,
              ],
              y: [
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight,
              ],
              rotate: [0, 360],
              scale: [0.9, 1.1, 0.9],
            }}
            whileHover={{
              scale: 1.2,
              x: [
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth,
              ],
              y: [
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight,
              ],
              transition: { duration: 0.5 }
            }}
            style={{
              filter: "blur(0.5px)",
            }}
            transition={{
              duration: 20 + Math.random() * 15,
              repeat: Infinity,
              ease: "linear",
              times: [0, 0.5, 1],
            }}
          >
            <Icon size={size} />
          </motion.div>
        ))}
      </div>

      <div className="border-b border-sky-200/25 dark:border-sky-700/25 backdrop-blur-xl">
        <div className="flex h-16 items-center px-4 bg-white/50 dark:bg-sky-900/35 backdrop-blur-md">
          <MainNav className="mx-6 text-slate-900 dark:text-white" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8 pt-6 relative">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Boshqaruv paneli
          </h2>
          <div className="flex items-center space-x-2">
            <CalendarDateRangePicker
              onDateRangeChange={handleDateRangeChange}
              className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border border-white/10 dark:border-sky-700/10 rounded-lg shadow-sm hover:shadow-xl transition-all duration-300"
            />
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md p-1 rounded-lg shadow-sm border border-white/10 dark:border-sky-700/10">
            <TabsTrigger value="overview" className="rounded-md px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white transition-colors bg-white/5 dark:bg-sky-900/5 backdrop-blur-md hover:bg-white/10 dark:hover:bg-sky-900/10">
              Umumiy ko'rinish
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-md px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white transition-colors bg-white/5 dark:bg-sky-900/5 backdrop-blur-md hover:bg-white/10 dark:hover:bg-sky-900/10">
              Tahlil
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 bg-white/5 dark:bg-sky-900/5 backdrop-blur-md rounded-lg p-4 border border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="relative bg-white/5 dark:bg-sky-900/5 backdrop-blur-md shadow-lg hover:shadow-2xl transition-all duration-300 border border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border-b border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                  <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">
                    Jami Obyektlar
                  </CardTitle>
                  <Home className="h-4 w-4 text-slate-900 dark:text-white" />
                </CardHeader>
                <CardContent className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalProperties}</div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    Tizimdagi faol obyektlar
                  </p>
                </CardContent>
              </Card>
              <Card className="relative bg-white/5 dark:bg-sky-900/5 backdrop-blur-md shadow-lg hover:shadow-2xl transition-all duration-300 border border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border-b border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                  <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">
                    Jami Xonadonlar
                  </CardTitle>
                  <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </CardHeader>
                <CardContent className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalApartments}</div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    Jami mavjud xonadonlar
                  </p>
                </CardContent>
              </Card>
              <Card className="relative bg-white/5 dark:bg-sky-900/5 backdrop-blur-md shadow-lg hover:shadow-2xl transition-all duration-300 border border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border-b border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                  <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">
                    Jami Sotuvlar
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-slate-900 dark:text-white" />
                </CardHeader>
                <CardContent className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(stats.totalSales)}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    Umumiy sotuv miqdori
                  </p>
                </CardContent>
              </Card>
              <Card className="relative bg-white/5 dark:bg-sky-900/5 backdrop-blur-md shadow-lg hover:shadow-2xl transition-all duration-300 border border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border-b border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                  <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">
                    Kutilayotgan To'lovlar
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </CardHeader>
                <CardContent className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(stats.pendingPayments)}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    To'lov kutilmoqda
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4 relative bg-white/5 dark:bg-sky-900/5 backdrop-blur-md shadow-lg hover:shadow-2xl transition-all duration-300 border border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                <CardHeader className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border-b border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                  <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">Sotuvlar Sharhi</CardTitle>
                  <CardDescription className="text-sm text-slate-700 dark:text-slate-300">
                    Oylik sotuvlar ko'rsatkichi
                  </CardDescription>
                </CardHeader>
                <CardContent className="pl-2 bg-white/5 dark:bg-sky-900/5 backdrop-blur-md">
                  <Overview data={salesData} />
                </CardContent>
              </Card>
              <Card className="col-span-3 relative bg-white/5 dark:bg-sky-900/5 backdrop-blur-md shadow-lg hover:shadow-2xl transition-all duration-300 border border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                <CardHeader className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border-b border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                  <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">So'nggi To'lovlar</CardTitle>
                  <CardDescription className="text-sm text-slate-700 dark:text-slate-300">
                    Oxirgi to'lov operatsiyalari
                  </CardDescription>
                </CardHeader>
                <CardContent className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md">
                  <div className="space-y-4">
                    {recentPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="relative flex items-center space-x-4 p-4 bg-white/5 dark:bg-sky-900/5 backdrop-blur-md rounded-lg shadow-sm hover:shadow-xl transition-shadow duration-200 border border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                        <div className="relative bg-white/5 dark:bg-sky-900/5 backdrop-blur-md rounded-lg w-full">
                          <div className="flex items-center space-x-4 p-4 bg-white/5 dark:bg-sky-900/5 backdrop-blur-md">
                            <div className="h-9 w-9 flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-sky-600 dark:from-sky-400 dark:to-sky-500">
                              <Users className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium leading-none text-slate-900 dark:text-white">
                                {payment.user_fio}
                              </p>
                              <p className="text-sm text-slate-700 dark:text-slate-300">{payment.apartment_info}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {formatCurrency(payment.total_amount)}
                              </p>
                              <p className="text-xs text-slate-700 dark:text-slate-300">{formatDate(payment.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 bg-white/5 dark:bg-sky-900/5 backdrop-blur-md rounded-lg p-4 border border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="relative bg-white/5 dark:bg-sky-900/5 backdrop-blur-md shadow-lg hover:shadow-2xl transition-all duration-300 border border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border-b border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                  <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">Jami sotuvlar</CardTitle>
                  <DollarSign className="h-4 w-4 text-slate-900 dark:text-white" />
                </CardHeader>
                <CardContent className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.totalSales)}</div>
                </CardContent>
              </Card>
              <Card className="relative bg-white/5 dark:bg-sky-900/5 backdrop-blur-md shadow-lg hover:shadow-2xl transition-all duration-300 border border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border-b border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                  <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">Sotilgan xonadonlar</CardTitle>
                  <Home className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </CardHeader>
                <CardContent className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.soldApartments}</div>
                </CardContent>
              </Card>
              <Card className="relative bg-white/5 dark:bg-sky-900/5 backdrop-blur-md shadow-lg hover:shadow-2xl transition-all duration-300 border border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border-b border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                  <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">Mijozlar</CardTitle>
                  <Users className="h-4 w-4 text-slate-900 dark:text-white" />
                </CardHeader>
                <CardContent className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalClients}</div>
                </CardContent>
              </Card>
              <Card className="relative bg-white/5 dark:bg-sky-900/5 backdrop-blur-md shadow-lg hover:shadow-2xl transition-all duration-300 border border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-white/5 dark:bg-sky-900/5 backdrop-blur-md border-b border-gradient-to-r from-black/80 via-sky-900/80 to-black/80 dark:from-black/80 dark:via-sky-800/80 dark:to-black/80">
                  <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">Yetkazib beruvchilar</CardTitle>
                  <Truck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </CardHeader>
                <CardContent className="bg-white/5 dark:bg-sky-900/5 backdrop-blur-md">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalSuppliers}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={pendingModalOpen} onOpenChange={setPendingModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col bg-white/30 dark:bg-sky-900/30 backdrop-blur-sm border-2 border-gradient-to-r from-black/70 via-sky-900/70 to-black/70 dark:from-black/70 dark:via-sky-800/70 dark:to-black/70 shadow-xl">
          <DialogHeader className="bg-white/20 dark:bg-sky-900/20 backdrop-blur-sm border-b border-gradient-to-r from-black/70 via-sky-900/70 to-black/70 dark:from-black/70 dark:via-sky-800/70 dark:to-black/70">
            <DialogTitle className="text-slate-900 dark:text-white">Kutilayotgan To'lovlar Ro'yxati</DialogTitle>
            <DialogDescription className="text-slate-700 dark:text-slate-300">
              Quyida filtrlangan kutilayotgan to'lovlar ro'yxati keltirilgan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto bg-white/20 dark:bg-sky-900/20 backdrop-blur-sm rounded-lg">
            {modalLoading ? (
              <div className="flex items-center justify-center h-[200px] bg-white/20 dark:bg-sky-900/20 backdrop-blur-sm">
                <Loader2 className="h-6 w-6 animate-spin text-slate-700 dark:text-slate-300" />
                <span className="ml-2 text-slate-700 dark:text-slate-300">Yuklanmoqda...</span>
              </div>
            ) : modalPayments.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] bg-white/20 dark:bg-sky-900/20 backdrop-blur-sm">
                <p className="text-slate-700 dark:text-slate-300">Kutilayotgan to'lovlar topilmadi.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-white/20 dark:bg-sky-900/20 backdrop-blur-sm border-b-4 border-sky-200/70 dark:border-sky-700/70">
                    <TableHead className="w-[60px] text-slate-900 dark:text-white">ID</TableHead>
                    <TableHead className="text-slate-900 dark:text-white">Mijoz</TableHead>
                    <TableHead className="text-slate-900 dark:text-white">Xonadon</TableHead>
                    <TableHead className="text-slate-900 dark:text-white">Sana</TableHead>
                    <TableHead className="text-slate-900 dark:text-white">Oxirgi muddat</TableHead>
                    <TableHead className="text-right w-[150px] text-slate-900 dark:text-white">Summa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modalPayments.map((payment) => (
                    <TableRow key={payment.id} className="hover:shadow-lg transition-shadow duration-200 backdrop-blur-sm border-b border-gradient-to-r from-black/70 via-sky-900/70 to-black/70 dark:from-black/70 dark:via-sky-800/70 dark:to-black/70">
                      <TableCell className="text-slate-700 dark:text-slate-300">{payment.id}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{payment.user_fio}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{payment.apartment_info}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{formatDate(payment.created_at)}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{formatDate(payment.due_date)}</TableCell>
                      <TableCell className="text-right font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(payment.total_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-white/20 dark:bg-sky-900/20 backdrop-blur-sm font-bold border-t-4 border-sky-200/70 dark:border-sky-700/70">
                    <TableCell colSpan={5} className="text-right text-slate-900 dark:text-white">Jami:</TableCell>
                    <TableCell className="text-right text-slate-900 dark:text-white">
                      {formatCurrency(modalPayments.reduce((sum, p) => sum + Number(p.total_amount || 0), 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter className="bg-white/20 dark:bg-sky-900/20 backdrop-blur-sm border-t border-gradient-to-r from-black/70 via-sky-900/70 to-black/70 dark:from-black/70 dark:via-sky-800/70 dark:to-black/70">
            <Button variant="outline" onClick={() => setPendingModalOpen(false)} disabled={modalLoading} className="border-2 border-gradient-to-r from-black/70 via-sky-900/70 to-black/70 dark:from-black/70 dark:via-sky-800/70 dark:to-black/70 bg-white/20 dark:bg-sky-900/20 hover:bg-white/30 dark:hover:bg-sky-900/30">
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="border-t-2 border-gradient-to-r from-black/70 via-sky-900/70 to-black/70 dark:from-black/70 dark:via-sky-800/70 dark:to-black/70 bg-white/30 dark:bg-sky-900/30 backdrop-blur-sm py-4">
        <div className="container mx-auto text-center text-sm font-semibold text-slate-900 dark:text-white">
          Version 1.0 | Barcha huquqlar himoyalangan. Ushbu Dastur CDCGroup tomonidan yaratilgan. CraDev Company tomonidan qo'llab-quvvatlanadi. 2019 yildan beri
        </div>
      </footer>
    </div>
  );
}