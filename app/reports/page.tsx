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
import { Loader2 } from "lucide-react"; // Loader ikonkasini import qilish

// --- Interfeyslar (o'zgarishsiz) ---
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

interface RawPaymentsStatistics { // API dan keladigan asl javob strukturasi
    clients?: number;
    total_objects?: number;
    total_apartments?: number;
    free_apartments?: number;
    reserved_apartments?: number;
    average_price?: number;
    total_payments?: number; // API dagi "total_payments" - to'langanlar yig'indisi bo'lishi mumkin
    total_balance?: number; // API dagi "total_balance" - qoldiq summa
    paid_payments?: number;  // API dagi "paid_payments" - to'langan summa
    pending_payments?: number; // API dagi "pending_payments" - kutilayotgan summa
    overdue_payments?: number; // API dagi "overdue_payments" - muddati o'tgan summa
    payments_due_today?: number;
    payments_paid_today?: number;
    by_object?: { [key: string]: { paid: number; pending: number; overdue: number; balance: number } }; // by_object ham summalarni qaytarishi kerak
}


// UI da ishlatiladigan qayta ishlangan statistika strukturasi
interface ProcessedPaymentsStatistics {
  total_balance?: number; // Jami qoldiq
  paid_payments?: number;  // To'langan summa
  pending_payments?: number; // Kutilayotgan summa
  overdue_payments?: number; // Muddati o'tgan summa
  reserved_apartments?: number; // Band xonadonlar soni
  free_apartments?: number; // Bo'sh xonadonlar soni
  total_apartments?: number; // Jami xonadonlar soni
  average_price?: number; // O'rtacha narx
  clients?: number; // Mijozlar soni
  by_object?: { [key: string]: { paid: number; pending: number; overdue: number; balance: number } }; // Obyektlar kesimida
}

interface CalculatedExpenseData {
  total_expenses?: number;
  paid_expenses?: number;
  pending_expenses?: number;
  by_object?: { [key: string]: number };
}

// Umumiy state uchun interfeys
interface StatisticsData extends ProcessedPaymentsStatistics, CalculatedExpenseData {}
// --- Interfeyslar tugadi ---


export default function ReportsPage() {
  const [loading, setLoading] = useState(true); // Asosiy ma'lumotlar yuklanishi
  const [statsLoading, setStatsLoading] = useState(false); // Statistika yuklanishi
  const [reportType, setReportType] = useState<string>("payments");
  const [apiData, setApiData] = useState<StatisticsData | null>(null);
  const [objects, setObjects] = useState<ObjectType[]>([]);
  const [expenses, setExpenses] = useState<ExpenseType[]>([]);
  const [apartments, setApartments] = useState<ApartmentType[]>([]);
  const [selectedObject, setSelectedObject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all"); // Xonadon statusi filtri
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const router = useRouter();

  // Auth headers (o'zgarishsiz)
  const getAuthHeaders = useCallback(() => {
    if (!accessToken) return null;
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
  }, [accessToken]);

  // Ma'lumotlarni yuklash (o'zgarishsiz)
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
        // API paginatsiya ishlatishi mumkin, natijalarni olish
        let results = [];
        if (data.results) {
            results = data.results;
            let nextUrl = data.next;
            while (nextUrl) {
                const nextPageResponse = await fetch(nextUrl, { method: "GET", headers });
                if (!nextPageResponse.ok) break; // Agar keyingi sahifa yuklanmasa to'xtatish
                const nextPageData = await nextPageResponse.json();
                results = results.concat(nextPageData.results || []);
                nextUrl = nextPageData.next;
            }
        } else if (Array.isArray(data)) {
             results = data; // Agar API to'g'ridan-to'g'ri massiv qaytarsa
        }
        return results;
      } catch (error: any) {
        console.error(`Xatolik (${entityName}):`, error);
        toast({ title: "Xatolik", description: error.message, variant: "destructive" });
        throw error; // Xatolikni yuqoriga uzatish
      }
    },
    [getAuthHeaders, router]
  );

  // Tokenni olish (o'zgarishsiz)
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

  // Asosiy ma'lumotlarni yuklash (Obyektlar, Xarajatlar, Xonadonlar)
  useEffect(() => {
    if (!accessToken) return;

    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Ma'lumotlarni parallel ravishda yuklash
        const [objectsData, expensesData, apartmentsData] = await Promise.all([
          fetchData("http://api.ahlan.uz/objects/?page_size=1000", "Obyektlar"), // page_size katta qo'yildi
          fetchData("http://api.ahlan.uz/expenses/?page_size=1000", "Xarajatlar"),
          fetchData("http://api.ahlan.uz/apartments/?page_size=1000", "Xonadonlar"),
        ]);
        setObjects(objectsData);
        setExpenses(expensesData);
        setApartments(apartmentsData);
        // console.log("Fetched Objects:", objectsData);
        // console.log("Fetched Expenses:", expensesData);
        // console.log("Fetched Apartments:", apartmentsData);
      } catch (error) {
        console.error("Asosiy ma'lumotlarni yuklashda xatolik:", error);
        // Xatolik yuz berganda state'larni bo'shatish
        setObjects([]);
        setExpenses([]);
        setApartments([]);
      } finally {
        setLoading(false); // Yuklash tugadi (xato bo'lsa ham)
      }
    };

    loadInitialData();
  }, [accessToken, fetchData]); // fetchData ham dependency sifatida qo'shildi

  // Statistika yuklash va qayta ishlash
  const fetchAndProcessStatistics = useCallback(async () => {
    // Asosiy ma'lumotlar yuklanmaguncha yoki token bo'lmasa kutish
    if (loading || !accessToken) return;

    setStatsLoading(true); // Statistika yuklanishini boshlash
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
      // --- To'lovlar statistikasi ---
      const queryParams = new URLSearchParams();
      // Agar obyekt tanlangan bo'lsa, query parametr qo'shish
      if (selectedObject !== "all") queryParams.append("object", selectedObject);

      const paymentsResponse = await fetch(
        `http://api.ahlan.uz/payments/statistics/?${queryParams.toString()}`,
        { method: "GET", headers }
      );

      let processedPaymentsData: ProcessedPaymentsStatistics = {}; // Boshlang'ich qiymat

      if (paymentsResponse.status === 401) { // Token eskirgan bo'lsa
        localStorage.removeItem("access_token");
        router.push("/login");
        throw new Error("Sessiya muddati tugagan. Iltimos, qayta kiring.");
      }

      if (paymentsResponse.ok) {
        const rawData: RawPaymentsStatistics = await paymentsResponse.json();
        // console.log("Raw Payments Stats:", rawData); // API javobini tekshirish

        // *FIX*: API javobidagi TO'G'RI maydon nomlarini ishlatish
        processedPaymentsData = {
          total_balance: Number(rawData.total_balance) || 0, // Jami qoldiq
          paid_payments: Number(rawData.paid_payments) || 0,   // To'langan summa
          pending_payments: Number(rawData.pending_payments) || 0, // Kutilayotgan summa
          overdue_payments: Number(rawData.overdue_payments) || 0, // Muddati o'tgan summa
          // Quyidagi maydonlar to'g'ri kelishi kerak
          reserved_apartments: rawData.reserved_apartments || 0,
          free_apartments: rawData.free_apartments || 0,
          total_apartments: rawData.total_apartments || 0,
          average_price: rawData.average_price || 0,
          clients: rawData.clients || 0,
          by_object: rawData.by_object || {}, // Bu ham summalarni qaytarishi kerak
        };
      } else if (paymentsResponse.status === 404) { // Agar statistika topilmasa (masalan, filtr bo'yicha)
        console.warn(`To'lovlar statistikasi topilmadi (Filtr: ${selectedObject})`);
        // Barcha qiymatlarni 0 ga tenglashtirish
        processedPaymentsData = {
          total_balance: 0, paid_payments: 0, pending_payments: 0, overdue_payments: 0,
          reserved_apartments: 0, free_apartments: 0, total_apartments: 0, average_price: 0, clients: 0, by_object: {}
        };
      } else { // Boshqa xatoliklar
        throw new Error(
          `To‘lovlar statistikasini yuklashda xatolik: ${paymentsResponse.status} ${paymentsResponse.statusText}`
        );
      }

      // --- Xarajatlar statistikasi (Client-side hisoblash) ---
      let filteredExpenses = expenses;
      if (selectedObject !== "all") {
        filteredExpenses = expenses.filter(
          (exp) => exp.object?.toString() === selectedObject // obyekt ID sini string ga solishtirish
        );
      }

      const total_expenses = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      const paid_expenses = filteredExpenses.filter((exp) => exp.status === "To‘langan").reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      const pending_expenses = filteredExpenses.filter((exp) => exp.status === "Kutilmoqda").reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

      // Obyektlar bo'yicha xarajatlarni hisoblash (obyekt nomlari bilan)
      const expenses_by_object_name: { [key: string]: number } = {};
      objects.forEach((obj) => {
          // Faqat joriy filterga mos keladigan obyektlarni hisoblash
          if (selectedObject === 'all' || obj.id.toString() === selectedObject) {
              const objExpenses = expenses // Barcha xarajatlardan filtrlaymiz
                .filter((exp) => exp.object === obj.id)
                .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
              if (objExpenses > 0) {
                expenses_by_object_name[obj.name] = objExpenses;
              }
          }
      });


      const expenseStats: CalculatedExpenseData = {
        total_expenses,
        paid_expenses,
        pending_expenses,
        by_object: expenses_by_object_name, // Obyekt nomi bo'yicha
      };

      // --- Xonadonlar statistikasi (Client-side hisoblash, API javobidan ustunlik beriladi agar mavjud bo'lsa) ---
      let filteredApartments = apartments;
      if (selectedObject !== "all") {
        filteredApartments = apartments.filter((apt) => apt.object?.toString() === selectedObject);
      }

      // API dan kelgan xonadon sonlarini ishlatish (agar mavjud bo'lsa va 0 dan katta bo'lsa)
      const final_total_apartments = (selectedObject !== 'all' && processedPaymentsData.total_apartments && processedPaymentsData.total_apartments > 0)
        ? processedPaymentsData.total_apartments
        : filteredApartments.length; // Aks holda client-side hisoblash

       const final_reserved_apartments = (selectedObject !== 'all' && processedPaymentsData.reserved_apartments !== undefined)
        ? processedPaymentsData.reserved_apartments
        : filteredApartments.filter((apt) => apt.status === "band").length;

       const final_free_apartments = (selectedObject !== 'all' && processedPaymentsData.free_apartments !== undefined)
        ? processedPaymentsData.free_apartments
        : filteredApartments.filter((apt) => apt.status === "bosh").length;


      // Yakuniy ma'lumotlarni birlashtirish
      setApiData({
        ...processedPaymentsData, // API dan kelgan to'lov statistikasi
        ...expenseStats,          // Hisoblangan xarajat statistikasi
        // Xonadon statistikasini yangilash (API yoki client-side)
        total_apartments: final_total_apartments,
        reserved_apartments: final_reserved_apartments,
        free_apartments: final_free_apartments,
         // average_price va clients API javobidan olinadi
      });

    } catch (error: any) {
      console.error("Statistik ma'lumotlarni yuklashda xatolik:", error);
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
      // Xatolik yuz berganda state'ni bo'sh yoki default qiymatlar bilan o'rnatish
      setApiData({
        total_balance: 0, paid_payments: 0, pending_payments: 0, overdue_payments: 0,
        reserved_apartments: 0, free_apartments: 0, total_apartments: 0, average_price: 0, clients: 0,
        total_expenses: 0, paid_expenses: 0, pending_expenses: 0, by_object: {},
      });
    } finally {
      setStatsLoading(false); // Statistika yuklanishi tugadi
    }
  }, [loading, accessToken, selectedObject, expenses, apartments, objects, getAuthHeaders, router]); // Dependencylarni to'g'rilash


  // Statistika yuklash triggeri (asosiy ma'lumotlar yuklangandan keyin va filtr o'zgarganda)
  useEffect(() => {
    // Asosiy ma'lumotlar yuklanganini tekshirish (loading=false)
    // va token mavjudligini tekshirish
    if (!loading && accessToken) {
      fetchAndProcessStatistics();
    }
    // selectedObject o'zgarganda qayta yuklash uchun dependency qo'shildi
  }, [loading, accessToken, selectedObject, fetchAndProcessStatistics]); // apartments, expenses, objects ni olib tashladik, chunki ular fetchAndProcessStatistics ichida ishlatiladi


  // Valyuta formatlash funksiyasi
  const formatNumber = (value: number | undefined | null): string => {
    // Qiymat mavjud va raqam ekanligini tekshirish
    if (value === undefined || value === null || isNaN(Number(value))) {
      // Agar valyuta belgisi kerak bo'lmasa '0' qaytarish mumkin
      return "0 UZS"; // Yoki $0
    }
    return Number(value).toLocaleString("uz-UZ", { // uz-UZ locale ishlatish
      style: "currency",
      currency: "UZS", // "USD" yoki "UZS"
      minimumFractionDigits: 0, // Kasr qismini ko'rsatmaslik
      maximumFractionDigits: 0,
    });
  };

  // --- Chart ma'lumotlari ---

  // To'lovlar Bar Chart uchun ma'lumotlar
  const paymentsChartData = useMemo(() => {
    if (!apiData) return [];

     // Agar obyekt tanlanmagan bo'lsa, umumiy statistikani ko'rsatish
    if (selectedObject === "all") {
      return [
        {
          name: "Jami", // Bitta ustun
          paid: apiData.paid_payments || 0,
          pending: apiData.pending_payments || 0,
          overdue: apiData.overdue_payments || 0,
          balance: apiData.total_balance || 0 // Balansni ham qo'shish mumkin
        },
      ];
    } else {
      // Tanlangan obyekt uchun statistikani topish
      const selectedObjectData = objects.find((o) => o.id.toString() === selectedObject);
      const objectName = selectedObjectData?.name || `Obyekt #${selectedObject}`;

      // API javobidagi by_object ni tekshirish (agar mavjud bo'lsa)
      const objectStatsFromApi = apiData.by_object?.[objectName];

      if (objectStatsFromApi) {
          // Agar API obyekt bo'yicha ma'lumot bersa
         return [
           {
             name: objectName,
             paid: objectStatsFromApi.paid || 0,
             pending: objectStatsFromApi.pending || 0,
             overdue: objectStatsFromApi.overdue || 0,
             balance: objectStatsFromApi.balance || 0,
           },
         ];
      } else {
         // Agar API obyekt bo'yicha ma'lumot bermasa (yoki eski format bo'lsa),
         // client-side hisoblash kerak bo'lishi mumkin, lekin hozircha bo'sh qaytaramiz
         console.warn(`API javobida "${objectName}" uchun by_object ma'lumoti topilmadi.`);
         return [ { name: objectName, paid: 0, pending: 0, overdue: 0, balance: 0 } ];
      }
    }
  }, [apiData, selectedObject, objects]);


  // Xarajatlar Pie Chart uchun ma'lumotlar
  const expensesChartData = useMemo(
    () =>
      // apiData.by_object xarajatlar uchun hisoblangan client-side ma'lumot
      apiData?.by_object
        ? Object.entries(apiData.by_object)
            .filter(([, value]) => Number(value) > 0) // Faqat 0 dan katta xarajatlar
            .map(([name, value]) => ({
              name,
              value: Number(value) || 0,
            }))
            .sort((a, b) => b.value - a.value) // Kattadan kichikka saralash
        : [],
    [apiData?.by_object] // Faqat shu property o'zgarganda qayta hisoblash
  );

  // Xonadonlar Pie Chart uchun ma'lumotlar
  const apartmentsStatusChartData = useMemo(() => {
    let filteredApts = apartments;

    // Obyekt bo'yicha filtr
    if (selectedObject !== "all") {
      filteredApts = apartments.filter((apt) => apt.object?.toString() === selectedObject);
    }

    // Status nomlarini moslashtirish (UI -> Backend)
    const statusMap: { [key: string]: string } = {
      "Bo‘sh": "bosh",
      "Band qilingan": "band",
      "Sotilgan": "sotilgan",
      "Muddatli": "muddatli",
    };

    // Status bo'yicha filtr (agar tanlangan bo'lsa)
    if (selectedStatus !== "all") {
      const backendStatus = statusMap[selectedStatus];
      if (backendStatus) {
        filteredApts = filteredApts.filter((apt) => apt.status === backendStatus);
      } else {
          filteredApts = []; // Agar status nomi xato bo'lsa
      }
    }

    // Statuslar bo'yicha xonadonlar sonini hisoblash
    const counts: { [key: string]: number } = {
      sotilgan: 0, band: 0, bosh: 0, muddatli: 0,
    };
    filteredApts.forEach(apt => {
        if (counts[apt.status] !== undefined) {
            counts[apt.status]++;
        }
    });


    // Chart uchun ma'lumotlar massivini yaratish
    const data = [
      { name: "Sotilgan", value: counts.sotilgan, color: "#4ade80" }, // Yashil
      { name: "Band qilingan", value: counts.band, color: "#facc15" }, // Sariq
      { name: "Bo‘sh", value: counts.bosh, color: "#3b82f6" },       // Ko'k
      { name: "Muddatli", value: counts.muddatli, color: "#f43f5e" }, // Qizil
    ].filter((item) => item.value > 0); // Faqat soni 0 dan katta statuslarni ko'rsatish

    return data;
  }, [apartments, selectedObject, selectedStatus]); // Dependencylarni to'g'rilash

  // Ranglar palitrasi (o'zgarishsiz)
  const COLORS = ["#4ade80", "#facc15", "#3b82f6", "#f43f5e", "#a855f7", "#6366f1", "#ec4899"];

  // Filtr handlerlari (o'zgarishsiz)
  const handleObjectChange = (value: string) => {
    setSelectedObject(value);
    // Obyekt o'zgarganda status filtrini ham reset qilish mumkin
    // setSelectedStatus("all");
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
  };

  // --- Render ---

  // Asosiy ma'lumotlar yuklanayotgan holat
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
         <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Asosiy ma'lumotlar yuklanmoqda...</span>
      </div>
    );
  }

  // Agar token yo'q bo'lsa (login ga yo'naltirilgan bo'ladi)
  if (!accessToken) {
    return null;
  }

  // Asosiy UI
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      {/* Header (o'zgarishsiz) */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="flex h-16 items-center px-4 container mx-auto">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <UserNav />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6 container mx-auto">
        {/* Sarlavha va Filtrlar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
          <h2 className="text-3xl font-bold tracking-tight">Hisobotlar</h2>
          <div className="flex flex-wrap items-center gap-2">
             {/* Obyekt filtri */}
            <Select value={selectedObject} onValueChange={handleObjectChange}>
              <SelectTrigger className="w-auto md:w-[180px]">
                <SelectValue placeholder="Obyekt tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha obyektlar</SelectItem>
                {objects.length > 0 ? (
                    objects.map((obj) => (
                      <SelectItem key={obj.id} value={obj.id.toString()}>
                        {obj.name}
                      </SelectItem>
                    ))
                ) : (
                    <SelectItem value="loading" disabled>Yuklanmoqda...</SelectItem>
                )}
              </SelectContent>
            </Select>
             {/* Xonadon statusi filtri */}
            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-auto md:w-[180px]">
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
             {/* Filtrlarni tozalash tugmasi */}
            <Button
              variant="outline"
              onClick={() => {
                setSelectedObject("all");
                setSelectedStatus("all");
              }}
              disabled={statsLoading} // Statistika yuklanayotganda o'chirish
            >
              Filtrlarni tozalash
            </Button>
          </div>
        </div>

        {/* Statistika yuklanish indikatori */}
        {statsLoading && (
          <div className="flex items-center justify-center p-6 text-muted-foreground">
             <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Statistika yangilanmoqda...
          </div>
        )}

        {/* Asosiy kontent (Tabs) */}
        <Tabs value={reportType} onValueChange={setReportType} className="space-y-4">
          {/* Tab sarlavhalari */}
          <TabsList>
            <TabsTrigger value="payments">To‘lovlar</TabsTrigger>
            <TabsTrigger value="expenses">Xarajatlar</TabsTrigger>
            <TabsTrigger value="apartments">Xonadonlar</TabsTrigger>
          </TabsList>

          {/* To'lovlar Tab */}
          <TabsContent value="payments" className="space-y-4">
            {/* Agar statistika yuklanmagan yoki ma'lumot yo'q bo'lsa */}
            {!statsLoading && !apiData && (
              <Card className="text-center p-6 text-muted-foreground">
                  To‘lovlar statistikasi topilmadi yoki yuklashda xatolik yuz berdi.
              </Card>
            )}
            {/* Agar ma'lumot mavjud bo'lsa */}
            {!statsLoading && apiData && (
              <>
                {/* Summary Kartochkalar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Jami qoldiq (balans)</CardTitle>
                       {/* Info icon? */}
                    </CardHeader>
                    <CardContent>
                      {/* *FIXED*: apiData.total_balance ishlatildi */}
                      <div className="text-2xl font-bold">{formatNumber(apiData.total_balance)}</div>
                      {/* Qo'shimcha ma'lumot? */}
                       <p className="text-xs text-muted-foreground">Barcha shartnomalar bo'yicha qolgan summa</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">To‘langan</CardTitle>
                      {/* Valyuta ikonka? */}
                    </CardHeader>
                    <CardContent>
                       {/* *FIXED*: apiData.paid_payments ishlatildi */}
                      <div className="text-2xl font-bold text-green-600">
                        {formatNumber(apiData.paid_payments)}
                      </div>
                       {/* <p className="text-xs text-muted-foreground">+20.1% vs last month</p> */}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Muddati o‘tgan</CardTitle>
                       {/* Ogohlantirish ikonka? */}
                    </CardHeader>
                    <CardContent>
                      {/* *FIXED*: apiData.overdue_payments ishlatildi */}
                      <div className="text-2xl font-bold text-red-600">
                        {formatNumber(apiData.overdue_payments)}
                      </div>
                       {/* <p className="text-xs text-muted-foreground">+180.1% vs last month</p> */}
                    </CardContent>
                  </Card>
                </div>
                {/* Bar Chart Kartochkasi */}
                <Card>
                  <CardHeader>
                    <CardTitle>To‘lovlar holati</CardTitle>
                     {/* <CardDescription>Yanvar - Iyun 2024</CardDescription> */}
                  </CardHeader>
                  <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={350}>
                       {/* *FIXED*: paymentsChartData ishlatildi */}
                      <BarChart data={paymentsChartData}>
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
                          // Valyutani millionlarda ko'rsatish
                          tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(120, 120, 120, 0.1)' }}
                          formatter={(value: number) => formatNumber(value)} // Tooltipda ham formatlash
                          />
                        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                        <Bar
                          dataKey="paid"      // apiData.paid_payments dan keladi
                          name="To‘langan"
                          stackId="payments"      // Barcha barlarni bir stackga qo'yish
                          fill="#4ade80" // Yashil
                          radius={[4, 4, 0, 0]} // Ustun chetlarini yumaloqlash
                        />
                        <Bar
                          dataKey="pending"   // apiData.pending_payments dan keladi
                          name="Kutilmoqda" // API da "pending_payments" 0 edi skrinshotda
                          stackId="payments"
                          fill="#facc15" // Sariq
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar
                          dataKey="overdue"   // apiData.overdue_payments dan keladi
                          name="Muddati o‘tgan"
                          stackId="payments"
                          fill="#f43f5e" // Qizil
                           radius={[0, 0, 0, 0]}
                        />
                         {/* Balansni ham qo'shish mumkin
                         <Bar dataKey="balance" name="Qoldiq" stackId="payments" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                         */}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Xarajatlar Tab */}
          <TabsContent value="expenses" className="space-y-4">
             {/* Agar statistika yuklanmagan yoki ma'lumot yo'q bo'lsa */}
            {!statsLoading && (!apiData || expensesChartData.length === 0) && (
              <Card className="text-center p-6 text-muted-foreground">
                  Xarajatlar statistikasi topilmadi yoki yuklashda xatolik yuz berdi.
              </Card>
            )}
             {/* Agar ma'lumot mavjud bo'lsa */}
            {!statsLoading && apiData && expensesChartData.length > 0 && (
              <>
                {/* Xarajatlar Summary Kartochkalari */}
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
                {/* Xarajatlar Pie Chart va Ro'yxat */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Xarajatlar taqsimoti</CardTitle>
                       {/* Obyekt nomi yoki "Barcha obyektlar" */}
                      <CardDescription>
                         {selectedObject === 'all' ? 'Barcha obyektlar' : objects.find(o=>o.id.toString() === selectedObject)?.name} bo'yicha
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center items-center h-[350px]">
                      {expensesChartData.length > 0 ? (
                           <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={expensesChartData} // Hisoblangan ma'lumot
                                cx="50%"
                                cy="50%"
                                labelLine={false} // Chiziqlarni olib tashlash
                                outerRadius={110} // Kattaroq radius
                                innerRadius={60} // Ichki radius (donut chart)
                                fill="#8884d8"
                                dataKey="value"
                                // Labelni Pie ichiga yoki tashqarisiga qo'yish
                                label={({ name, percent }) =>
                                   percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : '' // Faqat 5% dan kattalarni ko'rsatish
                                }
                              >
                                {expensesChartData.map((entry, index) => (
                                  <Cell
                                    key={`cell-expense-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => formatNumber(value)} />
                              {/* Legendani pastga qo'yish */}
                              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "15px" }} />
                            </PieChart>
                          </ResponsiveContainer>
                      ) : (
                          <p className="text-muted-foreground">Ma'lumot yo'q</p>
                      )}
                    </CardContent>
                  </Card>
                  {/* Xarajatlar Ro'yxati Kartochkasi */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Xarajatlar ro‘yxati</CardTitle>
                      <CardDescription>Obyektlar bo‘yicha taqsimot</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {expensesChartData.length > 0 ? (
                           <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                            {expensesChartData.map((item, index) => {
                              const totalExpensesVal = apiData?.total_expenses || 1; // 0 ga bo'lishni oldini olish
                              const percentage = (item.value / totalExpensesVal) * 100;
                              return (
                                <div
                                  key={`expense-item-${index}`}
                                  className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0"
                                >
                                  <div className="flex items-center space-x-2">
                                    <div
                                      className="w-3 h-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    />
                                    <span className="truncate font-medium" title={item.name}>
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
                       ) : (
                           <p className="text-muted-foreground text-center p-4">Xarajatlar topilmadi.</p>
                       )}

                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Xonadonlar Tab */}
          <TabsContent value="apartments" className="space-y-4">
             {/* Agar statistika yuklanmagan yoki ma'lumot yo'q bo'lsa */}
             {!statsLoading && apartmentsStatusChartData.length === 0 && (
              <Card className="text-center p-6 text-muted-foreground">
                Xonadonlar statistikasi topilmadi yoki tanlangan filtr bo‘yicha ma'lumot yo‘q.
              </Card>
            )}
             {/* Agar ma'lumot mavjud bo'lsa */}
            {!statsLoading && apartmentsStatusChartData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {/* Xonadonlar Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Xonadonlar holati</CardTitle>
                    <CardDescription>
                       {/* Jami xonadonlar sonini ko'rsatish */}
                      Jami ({selectedStatus === "all" ? "barcha" : selectedStatus.toLowerCase()}
                      ): {apartmentsStatusChartData.reduce((sum, item) => sum + item.value, 0)} ta
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center items-center h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={apartmentsStatusChartData} // Hisoblangan ma'lumot
                          cx="50%"
                          cy="50%"
                          labelLine={false} // Chiziqsiz label
                          outerRadius={90} // Kichikroq radius
                          fill="#8884d8"
                          dataKey="value"
                           // Labelni formatlash: "Status: Son (Foiz%)"
                           label={({ name, value, percent }) =>
                               percent > 0.03 ? `${value} (${(percent * 100).toFixed(0)}%)` : ''
                           }
                           fontSize={11} // Label shriftini kichraytirish
                        >
                          {apartmentsStatusChartData.map((entry, index) => (
                            <Cell
                              key={`cell-apt-${index}`}
                              fill={entry.color} // Oldindan belgilangan ranglar
                            />
                          ))}
                        </Pie>
                         {/* Tooltip: "Status: Son ta" */}
                        <Tooltip formatter={(value: number, name: string) => [`${value} ta`, name]} />
                         {/* Legendani pastga qo'yish */}
                        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "15px" }}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                 {/* Statuslar bo'yicha Progress Bar'lar */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Statuslar bo‘yicha taqsimot</CardTitle>
                    <CardDescription>
                      Foizli ko‘rsatkichlar ({selectedStatus === "all" ? "barcha statuslar" : selectedStatus})
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-5"> {/* Bo'sh joyni oshirish */}
                      {apartmentsStatusChartData.map((item, index) => {
                        // Foizni hisoblash uchun umumiy xonadonlar soni (filtr hisobga olingan)
                         const totalApartmentsForPercentage = apartmentsStatusChartData.reduce((sum, i) => sum + i.value, 1); // 0 ga bo'lishni oldini olish
                         const percentage = (item.value / totalApartmentsForPercentage) * 100;

                        return (
                          <div key={`apt-progress-${index}`} className="space-y-1.5"> {/* Bo'sh joy */}
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center">
                                <div
                                  className="w-3 h-3 rounded-full mr-2 flex-shrink-0" // Rangli nuqta
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="font-medium">{item.name}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold">{item.value} ta</span>
                                <span className="text-muted-foreground w-10 text-right">
                                  {percentage.toFixed(0)}% {/* Foizni butun son qilib ko'rsatish */}
                                </span>
                              </div>
                            </div>
                             {/* Progress bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700"> {/* Balandlikni oshirish */}
                              <div
                                className="h-2.5 rounded-full" // Balandlikni moslashtirish
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: item.color,
                                  transition: 'width 0.5s ease-in-out' // Animatsiya
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