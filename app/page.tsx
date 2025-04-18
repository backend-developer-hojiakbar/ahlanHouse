"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // CardDescription qo'shildi
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDateRangePicker } from "@/components/date-range-picker";
import { CreditCard, DollarSign, Home, Loader2, Users, Truck } from "lucide-react";
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
    <LineChart width={500} height={300} data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip formatter={(value: number) => value.toLocaleString("us-US", { style: "currency", currency: "USD" })} />
      <Legend />
      <Line type="monotone" dataKey="total" stroke="#8884d8" activeDot={{ r: 8 }} />
    </LineChart>
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
        // Asosiy statistikalar
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

        // Sotilgan xonadonlar uchun qo'shimcha so'rov
        // API count noto'g'ri bo'lishi mumkinligi sababli, barcha natijalarni olib, o'zimiz sanaymiz
        const soldApartmentsUrl = `http://api.ahlan.uz/apartments/?status__in=paid,sotilgan&page_size=1000`; // Kerak bo'lsa page_size o'zgartiriladi
        const soldApartmentsResponse = await fetch(
          soldApartmentsUrl,
          { method: "GET", headers: getAuthHeaders() }
        );
        if (!soldApartmentsResponse.ok) {
          throw new Error("Sotilgan xonadonlarni olishda xatolik");
        }
        const soldApartmentsData = await soldApartmentsResponse.json();

        // API count o'rniga 'results' massividan qo'lda sanash
        const actualSoldCount = (soldApartmentsData.results || []).filter(
          (apt: { status: string }) => apt.status === 'paid' || apt.status === 'sotilgan'
        ).length;


        // Yetkazib beruvchilar soni uchun so'rov
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
          soldApartments: actualSoldCount, // Qo'lda sanalgan qiymat ishlatiladi
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
          { name: "Jan 2025", total: 40000000 },
          { name: "Feb 2025", total: 50000000 },
          { name: "Mar 2025", total: 60000000 },
        ]);
      }
    };

    fetchSalesData();
  }, [accessToken, router, dateRange, getAuthHeaders]);

  // Modal uchun to'lovlarni olish
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

  // Modal ochish handleri
  const handleOpenPendingModal = () => {
    setPendingModalOpen(true);
    fetchModalPayments("pending");
  };

  // Sana oralig'ini o'zgartirish
  const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
    setDateRange(range);
  };

  // Formatlash funksiyalari
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p>Ma'lumotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Boshqaruv paneli</h2>
          <div className="flex items-center space-x-2">
            <CalendarDateRangePicker onChange={handleDateRangeChange} />
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Umumiy ko'rinish</TabsTrigger>
            <TabsTrigger value="sales">Sotuvlar</TabsTrigger>
            <TabsTrigger value="payments">To'lovlar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Jami sotuvlar</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</div>
                  <p className="text-xs text-muted-foreground">+20.1% o'tgan oyga nisbatan</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sotilgan xonadonlar</CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.soldApartments}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalApartments ? Math.round((stats.soldApartments / stats.totalApartments) * 100) : 0}% jami xonadonlardan
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Mijozlar</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalClients}</div>
                  <p className="text-xs text-muted-foreground">+12% o'tgan oyga nisbatan</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Yetkazib beruvchilar</CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSuppliers}</div>
                  <p className="text-xs text-muted-foreground">Jami yetkazib beruvchilar soni</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Sotuvlar dinamikasi</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <Overview data={salesData} />
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>So'nggi sotuvlar</CardTitle>
                  <CardDescription>Oxirgi 5 ta sotuv</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {recentPayments.length > 0 ? (
                      recentPayments.map((payment) => (
                        <div key={payment.id} className="flex items-center">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src="/avatars/01.png" alt="Avatar" />
                            <AvatarFallback>{payment.user_fio.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="ml-4 space-y-1">
                            <p className="text-sm font-medium leading-none">{payment.user_fio}</p>
                            <p className="text-sm text-muted-foreground">{payment.apartment_info}</p>
                          </div>
                          <div className="ml-auto font-medium">
                            {formatCurrency(payment.total_amount)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Hozircha sotuvlar mavjud emas.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Jami sotuvlar</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sotilgan xonadonlar</CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.soldApartments}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Band qilingan xonadonlar</CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.reservedApartments}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">O'rtacha narx</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(Math.round(stats.averagePrice))}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Jami to'lovlar</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalPayments)}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalSales ? Math.round((stats.totalPayments / stats.totalSales) * 100) : 0}% jami sotuvlardan
                  </p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer" onClick={handleOpenPendingModal}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Kutilayotgan to'lovlar</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingPayments)}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalSales ? Math.round((stats.pendingPayments / stats.totalSales) * 100) : 0}% jami sotuvlardan
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Yetkazib beruvchilar</CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSuppliers}</div>
                  <p className="text-xs text-muted-foreground">Jami yetkazib beruvchilar soni</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Kutilayotgan to'lovlar modali */}
      <Dialog open={pendingModalOpen} onOpenChange={setPendingModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Kutilayotgan To'lovlar Ro'yxati</DialogTitle>
            <DialogDescription>
              Quyida filtrlangan kutilayotgan to'lovlar ro'yxati keltirilgan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {modalLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Yuklanmoqda...</span>
              </div>
            ) : modalPayments.length === 0 ? (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-muted-foreground">Kutilayotgan to'lovlar topilmadi.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">ID</TableHead>
                    <TableHead>Mijoz</TableHead>
                    <TableHead>Xonadon</TableHead>
                    <TableHead>Sana</TableHead>
                    <TableHead>Oxirgi muddat</TableHead>
                    <TableHead className="text-right w-[150px]">Summa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modalPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.id}</TableCell>
                      <TableCell>{payment.user_fio}</TableCell>
                      <TableCell>{payment.apartment_info}</TableCell>
                      <TableCell>{formatDate(payment.created_at)}</TableCell>
                      <TableCell>{formatDate(payment.due_date)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(payment.total_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted font-bold">
                    <TableCell colSpan={5} className="text-right">Jami:</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(modalPayments.reduce((sum, p) => sum + Number(p.total_amount || 0), 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingModalOpen(false)} disabled={modalLoading}>
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="border-t bg-muted/40 py-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          Version 1.0 | Barcha huquqlar ximoyalangan | Ushbu Dastur CDCGroup tomonidan yaratilgan | CraDev Company tomonidan qo'llab quvvatlanadi | since 2019
        </div>
      </footer>
    </div>
  );
}