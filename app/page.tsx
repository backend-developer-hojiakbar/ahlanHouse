"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDateRangePicker } from "@/components/date-range-picker";
import { Building, Home, Users, CreditCard, DollarSign, TrendingUp, BarChart, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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

// Interfeyslar
interface Payment {
  id: number;
  user_fio: string;
  apartment_info: string;
  total_amount: string;
  created_at: string;
  due_date?: string;
  status: string;
}

interface Object {
  id: number;
  name: string;
  address: string;
  description: string;
  total_apartments: number;
  floors: number;
}

// Overview komponenti
const Overview = ({ data }) => {
  return (
    <LineChart width={500} height={300} data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip formatter={(value) => value.toLocaleString("us-US", { style: "currency", currency: "USD" })} />
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
    overduePayments: 0,
    averagePrice: 0,
    paymentsDueToday: 0,
    paymentsPaidToday: 0,
  });
  const [objects, setObjects] = useState<Object[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [loadingObjects, setLoadingObjects] = useState(true);

  // Pagination uchun state’lar
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 6; // Har bir sahifada 6 ta obyekt

  // Modal uchun state’lar
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [overdueModalOpen, setOverdueModalOpen] = useState(false);
  const [remainingModalOpen, setRemainingModalOpen] = useState(false);
  const [modalPayments, setModalPayments] = useState<Payment[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Access token olish
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      setAccessToken(token);
    }
  }, []);

  // API so‘rovlar uchun umumiy header
  const getAuthHeaders = useCallback(() => ({
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`,
  }), [accessToken]);

  // Statistika ma'lumotlarini olish (sana oralig‘i bilan)
  useEffect(() => {
    if (accessToken === null) return;

    if (!accessToken) {
      toast({
        title: "Xatolik",
        description: "Tizimga kirish talab qilinadi",
        variant: "destructive",
      });
      router.push("/login");
      return;
    }

    const fetchStats = async () => {
      try {
        let url = "http://api.ahlan.uz/payments/statistics/";
        if (dateRange.from && dateRange.to) {
          url += `?created_at__gte=${dateRange.from.toISOString().split("T")[0]}&created_at__lte=${dateRange.to.toISOString().split("T")[0]}`;
        }

        const response = await fetch(url, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Sessiya tugagan, qayta kirish kerak");
          }
          throw new Error("Statistikani olishda xatolik");
        }

        const data = await response.json();
        setStats({
          totalProperties: data.total_objects || 0,
          totalApartments: data.total_apartments || 0,
          soldApartments: data.sold_apartments || 0,
          reservedApartments: data.reserved_apartments || 0,
          availableApartments: data.free_apartments || 0,
          totalClients: data.clients || 0,
          totalSales: data.total_sales || 0,
          totalPayments: data.total_payments || 0,
          pendingPayments: data.pending_payments || 0,
          overduePayments: data.overdue_payments || 0,
          averagePrice: data.average_price || 0,
          paymentsDueToday: data.payments_due_today || 0,
          paymentsPaidToday: data.payments_paid_today || 0,
        });
        setLoading(false);
      } catch (error: any) {
        toast({
          title: "Xatolik",
          description: error.message || "Statistikani olishda xatolik yuz berdi",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    fetchStats();
  }, [accessToken, router, dateRange, getAuthHeaders]);

  // Obyektlar ro‘yxatini olish (pagination bilan)
  useEffect(() => {
    if (accessToken === null) return;

    if (!accessToken) {
      router.push("/login");
      return;
    }

    const fetchObjects = async () => {
      setLoadingObjects(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.append("page", currentPage.toString());
        queryParams.append("page_size", itemsPerPage.toString());

        const response = await fetch(`http://api.ahlan.uz/objects/?${queryParams.toString()}`, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Sessiya tugagan, qayta kirish kerak");
          }
          throw new Error("Obyektlarni olishda xatolik");
        }

        const data = await response.json();
        const objectsList = data.results || data || [];
        setObjects(objectsList);
        setTotalPages(Math.ceil(data.count / itemsPerPage));
        setLoadingObjects(false);
      } catch (error: any) {
        toast({
          title: "Xatolik",
          description: error.message || "Obyektlarni olishda xatolik yuz berdi",
          variant: "destructive",
        });
        setObjects([
          { id: 1, name: "Ahlan Residence", address: "Toshkent", description: "Test", total_apartments: 48, floors: 12 },
          { id: 2, name: "Ahlan Tower", address: "Toshkent", description: "Test", total_apartments: 36, floors: 9 },
        ]);
        setTotalPages(1);
        setLoadingObjects(false);
      }
    };

    fetchObjects();
  }, [accessToken, router, currentPage, getAuthHeaders]);

  // So'nggi to'lovlarni olish (sana oralig‘i bilan)
  useEffect(() => {
    if (accessToken === null) return;

    if (!accessToken) {
      router.push("/login");
      return;
    }

    const fetchRecentPayments = async () => {
      try {
        let url = "http://api.ahlan.uz/payments/?page_size=5";
        if (dateRange.from && dateRange.to) {
          url += `&created_at__gte=${dateRange.from.toISOString().split("T")[0]}&created_at__lte=${dateRange.to.toISOString().split("T")[0]}`;
        }

        const response = await fetch(url, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Sessiya tugagan, qayta kirish kerak");
          }
          throw new Error("To'lovlarni olishda xatolik");
        }

        const data = await response.json();
        const paymentsList = data.results || [];
        setRecentPayments(paymentsList);
      } catch (error: any) {
        toast({
          title: "Xatolik",
          description: error.message || "To'lovlarni olishda xatolik yuz berdi",
          variant: "destructive",
        });
        setRecentPayments([]);
      }
    };

    fetchRecentPayments();
  }, [accessToken, router, dateRange, getAuthHeaders]);

  // Sotuvlar dinamikasi uchun ma'lumotlarni olish (Payments endpointidan)
  useEffect(() => {
    if (accessToken === null) return;

    if (!accessToken) {
      router.push("/login");
      return;
    }

    const fetchSalesData = async () => {
      try {
        let url = "http://api.ahlan.uz/payments/";
        if (dateRange.from && dateRange.to) {
          url += `?created_at__gte=${dateRange.from.toISOString().split("T")[0]}&created_at__lte=${dateRange.to.toISOString().split("T")[0]}`;
        }

        const response = await fetch(url, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("Sotuvlar dinamikasini olishda xatolik");
        }

        const data = await response.json();
        const payments = data.results || [];

        // Oylik sotuvlarni hisoblash
        const monthlySales = payments.reduce((acc: any, payment: Payment) => {
          const date = new Date(payment.created_at);
          const monthYear = date.toLocaleString("default", { month: "short", year: "numeric" });
          acc[monthYear] = (acc[monthYear] || 0) + parseFloat(payment.total_amount);
          return acc;
        }, {});

        // Diagramma uchun ma'lumotlarni tayyorlash
        const chartData = Object.entries(monthlySales)
          .map(([name, total]) => ({
            name,
            total,
          }))
          .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime()); // Oylarni tartiblash

        setSalesData(chartData);
      } catch (error: any) {
        toast({
          title: "Xatolik",
          description: error.message || "Sotuvlar dinamikasini olishda xatolik yuz berdi",
          variant: "destructive",
        });
        setSalesData([
          { name: "Jan 2025", total: 40000000 },
          { name: "Feb 2025", total: 50000000 },
          { name: "Mar 2025", total: 60000000 },
        ]);
      }
    };

    fetchSalesData();
  }, [accessToken, router, dateRange, getAuthHeaders]);

  // Modal uchun to‘lovlarni olish
  const fetchModalPayments = useCallback(
    async (type: "pending" | "overdue" | "remaining") => {
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
        } else if (type === "overdue") {
          const today = new Date().toISOString().split("T")[0];
          url += `&status=pending&due_date__lt=${today}`;
        }

        const response = await fetch(url, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`${type} to‘lovlarni olishda xatolik`);
        }

        const data = await response.json();
        let payments = data.results || [];

        // "To‘lov qilinishi kerak" uchun filtr
        if (type === "remaining") {
          const allPaymentsResponse = await fetch("http://api.ahlan.uz/payments/?page_size=1000", {
            method: "GET",
            headers: getAuthHeaders(),
          });
          const allPaymentsData = await allPaymentsResponse.json();
          const allPayments = allPaymentsData.results || [];
          payments = allPayments.filter((payment: Payment) => payment.status === "pending");
        }

        setModalPayments(payments);
      } catch (error: any) {
        toast({
          title: "Xatolik",
          description: error.message || "To‘lovlarni olishda xatolik yuz berdi",
          variant: "destructive",
        });
        setModalPayments([]);
      } finally {
        setModalLoading(false);
      }
    },
    [accessToken, dateRange, getAuthHeaders]
  );

  // Modal ochish handlerlari
  const handleOpenPendingModal = () => {
    setPendingModalOpen(true);
    fetchModalPayments("pending");
  };

  const handleOpenOverdueModal = () => {
    setOverdueModalOpen(true);
    fetchModalPayments("overdue");
  };

  const handleOpenRemainingModal = () => {
    setRemainingModalOpen(true);
    fetchModalPayments("remaining");
  };

  // Sana oralig‘ini o‘zgartirish
  const handleDateRangeChange = (range: any) => {
    setDateRange(range);
  };

  // Pagination handler
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
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

  if (loading || loadingObjects) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Yuklanmoqda...</p>
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
            <TabsTrigger value="properties">Obyektlar</TabsTrigger>
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
                  <CardTitle className="text-sm font-medium">Muddati o'tgan to'lovlar</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.overduePayments)}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalSales ? Math.round((stats.overduePayments / stats.totalSales) * 100) : 0}% jami sotuvlardan
                  </p>
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

          <TabsContent value="properties" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Jami obyektlar</CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalProperties}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Jami xonadonlar</CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalApartments}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bo'sh xonadonlar</CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.availableApartments}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalApartments ? Math.round((stats.availableApartments / stats.totalApartments) * 100) : 0}% jami xonadonlardan
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Obyektlar</CardTitle>
                <CardDescription>Barcha obyektlar ro'yxati</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingObjects ? (
                  <div className="flex items-center justify-center h-[200px]">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Yuklanmoqda...</span>
                  </div>
                ) : objects.length === 0 ? (
                  <div className="flex items-center justify-center h-[200px]">
                    <p className="text-muted-foreground">Obyektlar topilmadi.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {objects.map((object) => (
                        <Card key={object.id}>
                          <CardHeader>
                            <CardTitle>{object.name}</CardTitle>
                            <CardDescription>{object.address}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p>{object.description}</p>
                            <p>Jami xonadonlar: {object.total_apartments}</p>
                            <p>Qavatlar soni: {object.floors}</p>
                          </CardContent>
                          <div className="p-4 pt-0">
                            <Button
                              className="w-full"
                              variant="outline"
                              onClick={() => router.push(`/properties/${object.id}`)}
                            >
                              Batafsil
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1 || loadingObjects}
                        >
                          <ChevronLeft className="h-4 w-4 mr-2" /> Oldingi
                        </Button>
                        <span className="text-sm text-muted-foreground">{currentPage} / {totalPages} sahifa</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages || loadingObjects}
                        >
                          Keyingi <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
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
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(Math.round(stats.averagePrice))}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <Card className="cursor-pointer" onClick={handleOpenOverdueModal}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Muddati o'tgan to'lovlar</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.overduePayments)}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalSales ? Math.round((stats.overduePayments / stats.totalSales) * 100) : 0}% jami sotuvlardan
                  </p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer" onClick={handleOpenRemainingModal}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">To'lov qilinishi kerak</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(stats.totalSales - stats.totalPayments)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalSales ? Math.round(((stats.totalSales - stats.totalPayments) / stats.totalSales) * 100) : 0}% jami sotuvlardan
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Kutilayotgan to‘lovlar modali */}
        <Dialog open={pendingModalOpen} onOpenChange={setPendingModalOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Kutilayotgan To‘lovlar Ro‘yxati</DialogTitle>
              <DialogDescription>
                Quyida filtrlangan kutilayotgan to‘lovlar ro‘yxati keltirilgan.
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
                  <p className="text-muted-foreground">Kutilayotgan to‘lovlar topilmadi.</p>
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

        {/* Muddati o‘tgan to‘lovlar modali */}
        <Dialog open={overdueModalOpen} onOpenChange={setOverdueModalOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Muddati O‘tgan To‘lovlar Ro‘yxati</DialogTitle>
              <DialogDescription>
                Quyida filtrlangan muddati o‘tgan to‘lovlar ro‘yxati keltirilgan.
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
                  <p className="text-muted-foreground">Muddati o‘tgan to‘lovlar topilmadi.</p>
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
              <Button variant="outline" onClick={() => setOverdueModalOpen(false)} disabled={modalLoading}>
                Yopish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* To‘lov qilinishi kerak modali */}
        <Dialog open={remainingModalOpen} onOpenChange={setRemainingModalOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>To‘lov Qilinishi Kerak Bo‘lgan Ro‘yxat</DialogTitle>
              <DialogDescription>
                Quyida to‘lov qilinishi kerak bo‘lgan ro‘yxat keltirilgan.
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
                  <p className="text-muted-foreground">To‘lov qilinishi kerak bo‘lganlar topilmadi.</p>
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
              <Button variant="outline" onClick={() => setRemainingModalOpen(false)} disabled={modalLoading}>
                Yopish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}