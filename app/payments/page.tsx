"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, Edit, Trash, CreditCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { format, parseISO, isValid } from "date-fns";
import { uz } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { debounce } from "lodash"; // Debounce uchun

const API_BASE_URL = "http://api.ahlan.uz";

// Interfeyslar
interface Payment {
  id: number;
  apartment: number;
  user: number;
  paid_amount: string;
  total_amount?: string;
  status: string;
  created_at: string;
  additional_info?: string;
  apartment_info?: string;
  user_fio?: string;
  payment_type?: string;
  initial_payment?: string;
  monthly_payment?: string;
  interest_rate?: number;
  duration_months?: number;
  due_date?: number;
  reservation_deadline?: string | null;
  bank_name?: string | null;
  documents?: string[];
}

interface Apartment {
  id: number;
  room_number: string;
  object: { id: number; name: string };
  price?: string;
}

interface Client {
  id: number;
  fio: string;
}

interface Object {
  id: number;
  name: string;
}

// Komponent
export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [objects, setObjects] = useState<Object[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);

  // Forma ma'lumotlari
  const [formData, setFormData] = useState({
    apartment: "",
    user: "",
    paid_amount: "",
    additional_info: "",
    created_at: new Date(),
  });

  const [editFormData, setEditFormData] = useState({
    additional_info: "",
  });

  // Filtrlar
  const [filters, setFilters] = useState({
    status: "all",
    object: "all",
    apartment: "all",
    search: "",
  });

  // Utility funksiyalar
  const getAuthHeaders = useCallback(() => {
    if (!accessToken) {
      toast({
        title: "Xatolik",
        description: "Tizimga kirish talab qilinadi.",
        variant: "destructive",
      });
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        router.push("/login");
      }
      return null;
    }
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
  }, [accessToken, router]);

  const formatCurrency = useCallback((amount: string | number | undefined | null) => {
    const num = Number(amount);
    if (isNaN(num)) return "$ 0.00";
    return num.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, []);

  const formatDate = useCallback((dateString: string | undefined | null) => {
    if (!dateString) return "-";
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return dateString.split("T")[0] || "-";
      return format(date, "dd.MM.yyyy", { locale: uz });
    } catch {
      return dateString.split("T")[0] || "-";
    }
  }, []);

  const getStatusBadge = useCallback((status: string | undefined | null) => {
    const lowerStatus = status?.toLowerCase() || "unknown";
    switch (lowerStatus) {
      case "paid":
        return <Badge className="bg-green-600 hover:bg-green-700 text-white">To‘langan</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Kutilmoqda</Badge>;
      case "overdue":
        return <Badge className="bg-red-600 hover:bg-red-700 text-white">Muddati o‘tgan</Badge>;
      default:
        return <Badge variant="secondary">{status || "Noma'lum"}</Badge>;
    }
  }, []);

  // Ma'lumotlarni olish
  const fetchCoreData = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers) return;
    setLoading(true);

    try {
      const [apartmentsRes, clientsRes, objectsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/apartments/?page_size=1000`, { headers }),
        fetch(`${API_BASE_URL}/users/?page_size=1000`, { headers }),
        fetch(`${API_BASE_URL}/objects/?page_size=1000`, { headers }),
      ]);

      if (!apartmentsRes.ok || !clientsRes.ok || !objectsRes.ok) {
        if (
          apartmentsRes.status === 401 ||
          clientsRes.status === 401 ||
          objectsRes.status === 401
        ) {
          throw new Error("Unauthorized");
        }
        throw new Error("Ma'lumotlarni yuklashda xatolik.");
      }

      const apartmentsData = await apartmentsRes.json();
      const clientsData = await clientsRes.json();
      const objectsData = await objectsRes.json();

      setApartments(apartmentsData.results || []);
      setClients(clientsData.results || []);
      setObjects(objectsData.results || []);

      await fetchPayments(headers);
    } catch (error: any) {
      console.error("Ma'lumotlarni yuklashda xato:", error);
      if (error.message === "Unauthorized") {
        toast({
          title: "Sessiya tugadi",
          description: "Iltimos, qayta tizimga kiring.",
          variant: "destructive",
        });
        localStorage.removeItem("access_token");
        router.push("/login");
      } else {
        toast({
          title: "Xatolik",
          description: "Ma'lumotlarni yuklashda muammo.",
          variant: "destructive",
        });
      }
      setLoading(false);
    }
  }, [getAuthHeaders, router]);

  const fetchPayments = useCallback(
    async (headers: HeadersInit | null = null) => {
      const currentHeaders = headers || getAuthHeaders();
      if (!currentHeaders) return;

      try {
        let url = `${API_BASE_URL}/payments/?ordering=-created_at&page_size=100`;
        if (filters.status !== "all") url += `&status=${filters.status}`;
        if (filters.object !== "all") url += `&apartment__object=${filters.object}`;
        if (filters.apartment !== "all") url += `&apartment=${filters.apartment}`;
        if (filters.search) {
          url += `&search=${encodeURIComponent(filters.search)}`;
        }

        const response = await fetch(url, { headers: currentHeaders });

        if (!response.ok) {
          if (response.status === 401) throw new Error("Unauthorized");
          const errorData = await response.json().catch(() => ({
            detail: "Server javobini o‘qishda xato.",
          }));
          throw new Error(`To‘lovlarni olishda xato: ${errorData.detail || response.statusText}`);
        }

        const data = await response.json();
        setPayments(data.results || []);
      } catch (error: any) {
        console.error("To‘lovlarni olishda xato:", error);
        if (error.message === "Unauthorized") {
          toast({
            title: "Sessiya tugadi",
            description: "Iltimos, qayta tizimga kiring.",
            variant: "destructive",
          });
          localStorage.removeItem("access_token");
          router.push("/login");
        } else {
          toast({
            title: "Xatolik",
            description: error.message || "To‘lovlarni yuklashda muammo.",
            variant: "destructive",
          });
        }
        setPayments([]);
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders, filters, router]
  );

  // Statistika
  const statistics = useMemo(() => {
    let total_paid = 0;
    let total_pending = 0;
    let total_overdue = 0;

    payments.forEach((payment) => {
      const amount = parseFloat(payment.paid_amount) || 0;
      switch (payment.status?.toLowerCase()) {
        case "paid":
          total_paid += amount;
          break;
        case "pending":
          total_pending += amount;
          break;
        case "overdue":
          total_overdue += amount;
          break;
      }
    });

    return {
      total_payments: payments.length,
      total_paid,
      total_pending,
      total_overdue,
    };
  }, [payments]);

  // useEffect
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token) {
        router.push("/login");
      } else {
        setAccessToken(token);
      }
    }
  }, [router]);

  useEffect(() => {
    if (accessToken) {
      fetchCoreData();
    }
  }, [accessToken, fetchCoreData]);

  useEffect(() => {
    if (accessToken && !loading) {
      fetchPayments();
    }
  }, [accessToken, filters, fetchPayments, loading]);

  // Handlerlar
  const handleOpenModal = () => setIsModalOpen(true);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      apartment: "",
      user: "",
      paid_amount: "",
      additional_info: "",
      created_at: new Date(),
    });
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) setFormData((prev) => ({ ...prev, created_at: date }));
  };

  const handleAddPayment = async () => {
    setPaymentLoading(true);
    const headers = getAuthHeaders();
    if (
      !headers ||
      !formData.apartment ||
      !formData.user ||
      !formData.paid_amount ||
      parseFloat(formData.paid_amount) <= 0
    ) {
      toast({
        title: "Xatolik",
        description: "Barcha majburiy maydonlarni to‘ldiring va summa musbat bo‘lsin.",
        variant: "destructive",
      });
      setPaymentLoading(false);
      return;
    }

    const paymentData = {
      apartment: parseInt(formData.apartment, 10),
      user: parseInt(formData.user, 10),
      paid_amount: formData.paid_amount,
      payment_type: "naqd",
      additional_info: formData.additional_info,
      created_at: format(formData.created_at, "yyyy-MM-dd"),
      status: "paid",
    };

    try {
      const response = await fetch(`${API_BASE_URL}/payments/`, {
        method: "POST",
        headers,
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: "Server javobini o‘qishda xato.",
        }));
        throw new Error(errorData.detail || "To‘lov qo‘shishda xato.");
      }

      toast({
        title: "Muvaffaqiyat",
        description: "To‘lov qo‘shildi.",
      });
      await fetchPayments();
      handleCloseModal();
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "To‘lov qo‘shishda xato.",
        variant: "destructive",
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleOpenEditModal = (payment: Payment) => {
    setEditingPayment(payment);
    setEditFormData({
      additional_info: payment.additional_info || "",
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingPayment(null);
    setEditFormData({ additional_info: "" });
  };

  const handleEditFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdatePayment = async () => {
    setPaymentLoading(true);
    const headers = getAuthHeaders();
    if (!headers || !editingPayment) {
      toast({
        title: "Xatolik",
        description: "Tahrirlash uchun ma'lumot topilmadi.",
        variant: "destructive",
      });
      setPaymentLoading(false);
      return;
    }

    const updatedData = {
      additional_info: editFormData.additional_info,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/payments/${editingPayment.id}/`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: "Server javobini o‘qishda xato.",
        }));
        throw new Error(errorData.detail || "To‘lovni yangilashda xato.");
      }

      toast({
        title: "Muvaffaqiyat",
        description: "To‘lov yangilandi.",
      });
      await fetchPayments();
      handleCloseEditModal();
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "To‘lovni yangilashda xato.",
        variant: "destructive",
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    const headers = getAuthHeaders();
    if (!headers || deletingPaymentId === paymentId) return;

    if (!window.confirm(`ID: ${paymentId} to‘lovni o‘chirishni tasdiqlaysizmi?`)) {
      return;
    }

    setDeletingPaymentId(paymentId);
    try {
      const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({
          detail: "Server javobini o‘qishda xato.",
        }));
        throw new Error(errorData.detail || "To‘lovni o‘chirishda xato.");
      }

      toast({
        title: "Muvaffaqiyat",
        description: `To‘lov (ID: ${paymentId}) o‘chirildi.`,
      });
      await fetchPayments();
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "To‘lovni o‘chirishda xato.",
        variant: "destructive",
      });
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setFilters((prev) => ({ ...prev, search: value }));
    }, 300),
    []
  );

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  const handleFilterChange = (
    value: string,
    field: "status" | "object" | "apartment"
  ) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: "all",
      object: "all",
      apartment: "all",
      search: "",
    });
  };

  // Render
  if (loading && !payments.length) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="border-b sticky top-0 bg-background z-10">
          <div className="flex h-16 items-center px-4">
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              <Search />
              <UserNav />
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="mr-2 h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Ma'lumotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="border-b sticky top-0 bg-background z-10">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
          <h2 className="text-3xl font-bold tracking-tight">To‘lovlar</h2>
          <Button onClick={handleOpenModal}>
            <CreditCard className="mr-2 h-4 w-4" /> Yangi To‘lov
          </Button>
        </div>

        {/* Statistika */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jami To‘lovlar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_payments}</div>
              <p className="text-xs text-muted-foreground">Umumiy yozuvlar soni</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">To‘langan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statistics.total_paid)}</div>
              <p className="text-xs text-muted-foreground">Muvaffaqiyatli to‘lovlar</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kutilmoqda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statistics.total_pending)}</div>
              <p className="text-xs text-muted-foreground">Kutilayotgan to‘lovlar</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Muddati o‘tgan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statistics.total_overdue)}</div>
              <p className="text-xs text-muted-foreground">Muddati o‘tgan to‘lovlar</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtrlar */}
        <div className="flex flex-wrap gap-4 items-center">
          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange(value, "status")}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Holati bo‘yicha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha Holatlar</SelectItem>
              <SelectItem value="paid">To‘langan</SelectItem>
              <SelectItem value="pending">Kutilmoqda</SelectItem>
              <SelectItem value="overdue">Muddati o‘tgan</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.object}
            onValueChange={(value) => handleFilterChange(value, "object")}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Obyekt bo‘yicha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha Obyektlar</SelectItem>
              {objects.map((obj) => (
                <SelectItem key={obj.id} value={obj.id.toString()}>
                  {obj.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.apartment}
            onValueChange={(value) => handleFilterChange(value, "apartment")}
          >
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Xonadon bo‘yicha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha Xonadonlar</SelectItem>
              {apartments
                .sort((a, b) => a.room_number.localeCompare(b.room_number))
                .map((apt) => (
                  <SelectItem key={apt.id} value={apt.id.toString()}>
                    {apt.room_number} {apt.object?.name ? `(${apt.object.name})` : ""}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Mijoz FIOsi yoki xonadon nomi bo‘yicha qidirish..."
            value={filters.search}
            onChange={handleSearchInputChange}
            className="w-full sm:max-w-xs"
          />
          <Button variant="outline" onClick={handleClearFilters}>
            Filtrlarni tozalash
          </Button>
        </div>

        {/* Jadval */}
        <Card>
          <CardHeader>
            <CardTitle>To‘lovlar Ro‘yxati</CardTitle>
            <CardDescription>Filtrlangan to‘lovlar va ularning holati.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">No</TableHead>
                    <TableHead>Xonadon</TableHead>
                    <TableHead>Mijoz</TableHead>
                    <TableHead className="text-right">Summa</TableHead>
                    <TableHead>Sana</TableHead>
                    <TableHead>Holati</TableHead>
                    <TableHead className="text-right">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex justify-center items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Yuklanmoqda...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        Filtrlarga mos to‘lovlar topilmadi.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment, index) => {
                      const apartmentDisplay = payment.apartment_info
                        ? payment.apartment_info
                        : `Xonadon ID: ${payment.apartment}`;
                      const clientDisplay = payment.user_fio
                        ? payment.user_fio
                        : `Mijoz ID: ${payment.user}`;

                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{apartmentDisplay}</TableCell>
                          <TableCell>{clientDisplay}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(payment.paid_amount)}
                          </TableCell>
                          <TableCell>{formatDate(payment.created_at)}</TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditModal(payment)}
                                title="Tahrirlash"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeletePayment(payment.id)}
                                disabled={deletingPaymentId === payment.id}
                                title="O‘chirish"
                              >
                                {deletingPaymentId === payment.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Yangi to‘lov modali */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Yangi To‘lov Qo‘shish</DialogTitle>
            <DialogDescription>
              Yangi to‘lov ma’lumotlarini to‘ldiring. (*) majburiy.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="apartment" className="text-right">
                Xonadon *
              </Label>
              <Select
                value={formData.apartment}
                onValueChange={(value) => handleSelectChange("apartment", value)}
              >
                <SelectTrigger id="apartment" className="col-span-3">
                  <SelectValue placeholder="Xonadonni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {apartments.map((apt) => (
                    <SelectItem key={apt.id} value={apt.id.toString()}>
                      {apt.room_number} {apt.object?.name ? `(${apt.object.name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user" className="text-right">
                Mijoz *
              </Label>
              <Select
                value={formData.user}
                onValueChange={(value) => handleSelectChange("user", value)}
              >
                <SelectTrigger id="user" className="col-span-3">
                  <SelectValue placeholder="Mijozni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.fio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paid_amount" className="text-right">
                Summa ($) *
              </Label>
              <Input
                id="paid_amount"
                name="paid_amount"
                type="number"
                value={formData.paid_amount}
                onChange={handleFormChange}
                className="col-span-3"
                placeholder="Masalan: 800.00"
                min="0.01"
                step="0.01"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="created_at" className="text-right">
                Sana *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="created_at"
                    variant="outline"
                    className={cn(
                      "col-span-3 justify-start text-left font-normal",
                      !formData.created_at && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.created_at ? (
                      format(formData.created_at, "PPP", { locale: uz })
                    ) : (
                      <span>Sanani tanlang</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.created_at}
                    onSelect={handleDateChange}
                    initialFocus
                    locale={uz}
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="additional_info" className="text-right pt-2">
                Izoh
              </Label>
              <Textarea
                id="additional_info"
                name="additional_info"
                value={formData.additional_info}
                onChange={handleFormChange}
                className="col-span-3 min-h-[80px]"
                placeholder="Qo‘shimcha ma’lumot (ixtiyoriy)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal} disabled={paymentLoading}>
              Bekor qilish
            </Button>
            <Button
              onClick={handleAddPayment}
              disabled={
                paymentLoading ||
                !formData.apartment ||
                !formData.user ||
                !formData.paid_amount ||
                parseFloat(formData.paid_amount) <= 0
              }
            >
              {paymentLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tahrirlash modali */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>To‘lovni Tahrirlash (ID: {editingPayment?.id})</DialogTitle>
            <DialogDescription>
              Faqat izohni tahrirlash mumkin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Xonadon</Label>
              <Input
                value={
                  editingPayment?.apartment_info ||
                  apartments.find((a) => a.id === editingPayment?.apartment)?.room_number ||
                  `ID: ${editingPayment?.apartment}`
                }
                className="col-span-3"
                disabled
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Mijoz</Label>
              <Input
                value={
                  editingPayment?.user_fio ||
                  clients.find((c) => c.id === editingPayment?.user)?.fio ||
                  `ID: ${editingPayment?.user}`
                }
                className="col-span-3"
                disabled
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-paid_amount" className="text-right">
                Summa ($)
              </Label>
              <Input
                id="edit-paid_amount"
                value={editingPayment?.paid_amount || ""}
                className="col-span-3"
                disabled
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-created_at" className="text-right">
                Sana
              </Label>
              <Input
                id="edit-created_at"
                value={editingPayment ? formatDate(editingPayment.created_at) : "-"}
                className="col-span-3"
                disabled
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="edit-additional_info" className="text-right pt-2">
                Izoh
              </Label>
              <Textarea
                id="edit-additional_info"
                name="additional_info"
                value={editFormData.additional_info}
                onChange={handleEditFormChange}
                className="col-span-3 min-h-[80px]"
                placeholder="Qo‘shimcha ma’lumot..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseEditModal}
              disabled={paymentLoading}
            >
              Bekor qilish
            </Button>
            <Button onClick={handleUpdatePayment} disabled={paymentLoading}>
              {paymentLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}