"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

// Interfeyslar
interface ObjectType {
  id: number;
  name: string;
  total_apartments: number;
  floors: number;
  address: string;
  description: string;
  image: string | null;
}

interface ExpenseType {
  id: number;
  amount: number;
  status: string; // "To‘langan", "Kutilmoqda"
  object: number;
}

interface ApartmentType {
  id: number;
  object: number;
  object_name: string;
  room_number: string;
  status: string; // "bosh", "band", "sotilgan", "muddatli"
  rooms: number;
  area: number;
  floor: number;
  price: string;
  balance: string;
  total_payments: string;
  reservation_amount: string | null;
  reserved_until: string | null;
  secret_code: string;
  description: string;
}

interface PaymentsStatisticsData {
  total_payments?: number;
  paid_payments?: number;
  pending_payments?: number;
  overdue_payments?: number;
  reserved_apartments?: number;
  free_apartments?: number;
  total_apartments?: number;
  average_price?: number;
  clients?: number;
}

interface CalculatedExpenseData {
  total_expenses?: number;
  paid_expenses?: number;
  pending_expenses?: number;
  by_object?: { [key: string]: number };
}

interface StatisticsData extends PaymentsStatisticsData, CalculatedExpenseData {}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [reportType, setReportType] = useState<string>("payments");
  const [apiData, setApiData] = useState<StatisticsData | null>(null);
  const [objects, setObjects] = useState<ObjectType[]>([]);
  const [expenses, setExpenses] = useState<ExpenseType[]>([]);
  const [apartments, setApartments] = useState<ApartmentType[]>([]);
  const [selectedObject, setSelectedObject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const router = useRouter();

  // Auth headers
  const getAuthHeaders = useCallback(() => {
    if (!accessToken) return null;
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
  }, [accessToken]);

  // Ma'lumotlarni yuklash
  const fetchData = useCallback(
    async (url: string, entityName: string) => {
      const headers = getAuthHeaders();
      if (!headers) {
        throw new Error("Avtorizatsiya tokeni topilmadi.");
      }
      try {
        const response = await fetch(url, { method: "GET", headers });
        if (response.status === 401) {
          localStorage.removeItem("access_token");
          router.push("/login");
          throw new Error("Sessiya muddati tugagan. Iltimos, qayta kiring.");
        }
        if (!response.ok) {
          throw new Error(`${entityName} yuklashda xatolik: ${response.statusText}`);
        }
        const data = await response.json();
        return data.results || [];
      } catch (error: any) {
        toast({ title: "Xatolik", description: error.message, variant: "destructive" });
        throw error;
      }
    },
    [getAuthHeaders, router]
  );

  // Tokenni olish
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      setAccessToken(token);
    } else {
      toast({
        title: "Kirish talab qilinadi",
        description: "Iltimos, tizimga kiring.",
        variant: "destructive",
      });
      setLoading(false);
      router.push("/login");
    }
  }, [router]);

  // Asosiy ma'lumotlarni yuklash
  useEffect(() => {
    if (!accessToken) return;

    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [objectsData, expensesData, apartmentsData] = await Promise.all([
          fetchData("http://api.ahlan.uz/objects/?page_size=1000", "Obyektlar"),
          fetchData("http://api.ahlan.uz/expenses/?page_size=1000", "Xarajatlar"),
          fetchData("http://api.ahlan.uz/apartments/?page_size=1000", "Xonadonlar"),
        ]);
        setObjects(objectsData);
        setExpenses(expensesData);
        setApartments(apartmentsData);
      } catch (error) {
        console.error("Asosiy ma'lumotlarni yuklashda xatolik:", error);
        setObjects([]);
        setExpenses([]);
        setApartments([]);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [accessToken, fetchData]);

  // Statistika yuklash
  const fetchAndProcessStatistics = useCallback(async () => {
    if (loading || !accessToken) return;

    setStatsLoading(true);
    const headers = getAuthHeaders();
    if (!headers) {
      toast({
        title: "Xatolik",
        description: "Avtorizatsiya tokeni topilmadi.",
        variant: "destructive",
      });
      setStatsLoading(false);
      return;
    }

    try {
      // To'lovlar statistikasi
      const queryParams = new URLSearchParams();
      if (selectedObject !== "all") queryParams.append("object", selectedObject);

      const paymentsResponse = await fetch(
        `http://api.ahlan.uz/payments/statistics/?${queryParams.toString()}`,
        { method: "GET", headers }
      );
      let paymentsData: PaymentsStatisticsData = {};
      if (paymentsResponse.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login");
        throw new Error("Sessiya muddati tugagan. Iltimos, qayta kiring.");
      }
      if (paymentsResponse.ok) {
        paymentsData = await paymentsResponse.json();
      } else if (paymentsResponse.status === 404) {
        console.warn(`To'lovlar statistikasi topilmadi (Obyekt: ${selectedObject})`);
        paymentsData = {
          total_payments: 0,
          paid_payments: 0,
          pending_payments: 0,
          overdue_payments: 0,
          reserved_apartments: 0,
          free_apartments: 0,
          total_apartments: 0,
          average_price: 0,
          clients: 0,
        };
      } else {
        throw new Error(
          `To‘lovlar statistikasini yuklashda xatolik: ${paymentsResponse.statusText}`
        );
      }

      // Xarajatlar statistikasi
      let filteredExpenses = expenses;
      if (selectedObject !== "all") {
        filteredExpenses = expenses.filter(
          (exp) => exp.object.toString() === selectedObject
        );
      }

      const total_expenses = filteredExpenses.reduce(
        (sum, exp) => sum + Number(exp.amount || 0),
        0
      );
      const paid_expenses = filteredExpenses
        .filter((exp) => exp.status === "To‘langan")
        .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      const pending_expenses = filteredExpenses
        .filter((exp) => exp.status === "Kutilmoqda")
        .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

      const by_object: { [key: string]: number } = {};
      objects.forEach((obj) => {
        const objExpenses = filteredExpenses
          .filter((exp) => exp.object === obj.id)
          .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
        if (objExpenses > 0) {
          by_object[obj.name] = objExpenses;
        }
      });

      // Xonadonlar statistikasi
      let filteredApartments = apartments;
      if (selectedObject !== "all") {
        filteredApartments = apartments.filter(
          (apt) => apt.object.toString() === selectedObject
        );
      }

      const total_apartments = filteredApartments.length;
      const reserved_apartments = filteredApartments.filter((apt) => apt.status === "band").length;
      const free_apartments = filteredApartments.filter((apt) => apt.status === "bosh").length;
      const average_price = filteredApartments.length
        ? filteredApartments.reduce((sum, apt) => sum + Number(apt.price || 0), 0) /
          filteredApartments.length
        : 0;

      const expenseStats: CalculatedExpenseData = {
        total_expenses,
        paid_expenses,
        pending_expenses,
        by_object,
      };

      // Yakuniy ma'lumotlarni birlashtirish
      setApiData({
        ...paymentsData,
        ...expenseStats,
        reserved_apartments,
        free_apartments,
        total_apartments,
        average_price,
        clients: paymentsData.clients || 0,
      });
    } catch (error: any) {
      console.error("Statistik ma'lumotlarni yuklashda xatolik:", error);
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
      setApiData({
        total_payments: 0,
        paid_payments: 0,
        pending_payments: 0,
        overdue_payments: 0,
        reserved_apartments: 0,
        free_apartments: 0,
        total_apartments: 0,
        average_price: 0,
        clients: 0,
        total_expenses: 0,
        paid_expenses: 0,
        pending_expenses: 0,
        by_object: {},
      });
    } finally {
      setStatsLoading(false);
    }
  }, [loading, accessToken, selectedObject, expenses, apartments, objects, getAuthHeaders, router]);

  // Statistika yuklash triggeri
  useEffect(() => {
    if (
      !loading &&
      accessToken &&
      objects.length >= 0 &&
      expenses.length >= 0 &&
      apartments.length >= 0
    ) {
      fetchAndProcessStatistics();
    }
  }, [
    loading,
    accessToken,
    selectedObject,
    objects,
    expenses,
    apartments,
    fetchAndProcessStatistics,
  ]);

  // Helper funksiyalar
  const formatNumber = (value: number | undefined | null): string => {
    return value !== undefined && value !== null && !isNaN(value)
      ? value.toLocaleString("uz-UZ", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
      : "0 USD";
  };

  // Chart ma'lumotlari
  const paymentsData = useMemo(
    () =>
      apiData
        ? [
            {
              name:
                selectedObject === "all"
                  ? "Jami"
                  : objects.find((o) => o.id.toString() === selectedObject)?.name ||
                    "Noma'lum",
              paid: apiData.paid_payments || 0,
              pending: apiData.pending_payments || 0,
              overdue: apiData.overdue_payments || 0,
            },
          ]
        : [],
    [apiData, selectedObject, objects]
  );

  const expensesData = useMemo(
    () =>
      apiData?.by_object
        ? Object.entries(apiData.by_object)
            .filter(([, value]) => value > 0)
            .map(([name, value]) => ({
              name,
              value: Number(value) || 0,
            }))
            .sort((a, b) => b.value - a.value) // Eng katta xarajatlarni yuqoriga chiqarish
        : [],
    [apiData]
  );

  // Xonadonlar statusi bo'yicha ma'lumotlarni hisoblash
  const apartmentsStatusData = useMemo(() => {
    let filteredApartments = apartments;
    if (selectedObject !== "all") {
      filteredApartments = apartments.filter(
        (apt) => apt.object.toString() === selectedObject
      );
    }

    // Status moslashtirish
    const statusMap: { [key: string]: string } = {
      "Bo‘sh": "bosh",
      "Band qilingan": "band",
      "Sotilgan": "sotilgan",
      "Muddatli": "muddatli",
    };

    // Status bo'yicha filtr
    if (selectedStatus !== "all") {
      const backendStatus = statusMap[selectedStatus];
      filteredApartments = filteredApartments.filter(
        (apt) => apt.status === backendStatus
      );
    }

    // Statuslar bo'yicha hisoblash
    const counts = {
      sotilgan: filteredApartments.filter((apt) => apt.status === "sotilgan").length,
      band: filteredApartments.filter((apt) => apt.status === "band").length,
      bosh: filteredApartments.filter((apt) => apt.status === "bosh").length,
      muddatli: filteredApartments.filter((apt) => apt.status === "muddatli").length,
    };

    const data = [
      { name: "Sotilgan", value: counts.sotilgan, color: "#4ade80" },
      { name: "Band qilingan", value: counts.band, color: "#facc15" },
      { name: "Bo‘sh", value: counts.bosh, color: "#3b82f6" },
      { name: "Muddatli", value: counts.muddatli, color: "#f43f5e" },
    ].filter((item) => item.value > 0);

    // Agar status tanlangan bo'lsa, faqat shu statusni qaytarish
    if (selectedStatus !== "all") {
      return data.filter((item) => item.name === selectedStatus);
    }

    return data;
  }, [apartments, selectedObject, selectedStatus]);

  const COLORS = ["#4ade80", "#facc15", "#3b82f6", "#f43f5e", "#a855f7", "#6366f1", "#ec4899"];

  // Filtr handlerlari
  const handleObjectChange = (value: string) => {
    setSelectedObject(value);
    setSelectedStatus("all");
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
  };

  // Render
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Asosiy ma'lumotlar yuklanmoqda...</p>
      </div>
    );
  }

  if (!accessToken) {
    return null; // useEffect login ga yo‘naltiradi
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="flex h-16 items-center px-4 container mx-auto">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <UserNav />
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6 container mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
          <h2 className="text-3xl font-bold tracking-tight">Hisobotlar</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedObject} onValueChange={handleObjectChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Obyekt tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha obyektlar</SelectItem>
                {objects.map((obj) => (
                  <SelectItem key={obj.id} value={obj.id.toString()}>
                    {obj.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Xonadon statusi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha statuslar</SelectItem>
                <SelectItem value="Bo‘sh">Bo‘sh</SelectItem>
                <SelectItem value="Band qilingan">Band qilingan</SelectItem>
                <SelectItem value="Sotilgan">Sotilgan</SelectItem>
                <SelectItem value="Muddatli">Muddatli</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedObject("all");
                setSelectedStatus("all");
              }}
            >
              Filtrlarni tozalash
            </Button>
          </div>
        </div>

        {statsLoading && (
          <div className="flex items-center justify-center p-4 text-muted-foreground">
            Statistika yangilanmoqda...
          </div>
        )}

        <Tabs value={reportType} onValueChange={setReportType} className="space-y-4">
          <TabsList>
            <TabsTrigger value="payments">To‘lovlar</TabsTrigger>
            <TabsTrigger value="expenses">Xarajatlar</TabsTrigger>
            <TabsTrigger value="apartments">Xonadonlar</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4">
            {!statsLoading && !apiData && (
              <p className="text-muted-foreground">To‘lovlar ma'lumoti topilmadi.</p>
            )}
            {apiData && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Jami kutilayotgan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatNumber(apiData.total_payments)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">To‘langan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatNumber(apiData.paid_payments)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Muddati o‘tgan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatNumber(apiData.overdue_payments)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>To‘lovlar holati</CardTitle>
                  </CardHeader>
                  <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={paymentsData}>
                        <XAxis
                          dataKey="name"
                          stroke="#888888"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#888888"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                        />
                        <Tooltip formatter={(value: number) => formatNumber(value)} />
                        <Legend />
                        <Bar
                          dataKey="paid"
                          name="To‘langan"
                          stackId="a"
                          fill="#4ade80"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="pending"
                          name="Kutilmoqda"
                          stackId="a"
                          fill="#facc15"
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar
                          dataKey="overdue"
                          name="Muddati o‘tgan"
                          stackId="a"
                          fill="#f43f5e"
                          radius={[0, 0, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            {!statsLoading && (!apiData || expensesData.length === 0) && (
              <p className="text-muted-foreground">Xarajatlar ma'lumoti topilmadi.</p>
            )}
            {apiData && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Jami xarajatlar</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatNumber(apiData.total_expenses)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">To‘langan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatNumber(apiData.paid_expenses)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Kutilayotgan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">
                        {formatNumber(apiData.pending_expenses)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Xarajatlar taqsimoti (Obyekt bo‘yicha)</CardTitle>
                      <CardDescription>
                        Jami: {formatNumber(apiData.total_expenses)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center items-center h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expensesData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(1)}%`
                            }
                          >
                            {expensesData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatNumber(value)} />
                          <Legend
                            wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                            layout="vertical"
                            align="right"
                            verticalAlign="middle"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Xarajatlar ro‘yxati</CardTitle>
                      <CardDescription>Obyektlar bo‘yicha taqsimot</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                        {expensesData.map((item, index) => {
                          const totalExpensesVal = apiData?.total_expenses || 0;
                          const percentage =
                            totalExpensesVal > 0 ? (item.value / totalExpensesVal) * 100 : 0;
                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between text-sm border-b pb-2"
                            >
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="truncate" title={item.name}>
                                  {item.name}
                                </span>
                              </div>
                              <div className="flex items-center space-x-3 flex-shrink-0">
                                <span className="font-medium">{formatNumber(item.value)}</span>
                                <span className="text-muted-foreground w-12 text-right">
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="apartments" className="space-y-4">
            {!statsLoading && apartmentsStatusData.length === 0 && (
              <p className="text-muted-foreground">
                Xonadonlar ma'lumoti topilmadi yoki tanlangan filtr bo‘yicha ma'lumot yo‘q.
              </p>
            )}
            {apartmentsStatusData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Xonadonlar holati</CardTitle>
                    <CardDescription>
                      Jami ({selectedStatus === "all" ? "barcha" : selectedStatus.toLowerCase()}
                      ): {apartmentsStatusData.reduce((sum, item) => sum + item.value, 0)} ta
                    </CardDescription>
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
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {apartmentsStatusData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value} ta`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Statuslar bo‘yicha taqsimot</CardTitle>
                    <CardDescription>
                      Foizli ko‘rsatkichlar (
                      {selectedStatus === "all" ? "barcha statuslar" : selectedStatus})
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {apartmentsStatusData.map((item, index) => {
                        const totalApartmentsForPercentage = apartments.filter(
                          (apt) =>
                            selectedObject === "all" ||
                            apt.object.toString() === selectedObject
                        ).length;
                        const percentage =
                          totalApartmentsForPercentage > 0
                            ? (item.value / totalApartmentsForPercentage) * 100
                            : 0;
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center">
                                <div
                                  className="w-3 h-3 rounded-full mr-2"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span>{item.name}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{item.value} ta</span>
                                <span className="text-muted-foreground w-10 text-right">
                                  {percentage.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: item.color,
                                }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}