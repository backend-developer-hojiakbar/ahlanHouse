"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { CreditCard, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from "next/dynamic";

// Dynamically import react-select with SSR disabled
const Select = dynamic(() => import("react-select"), { ssr: false });

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [objects, setObjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false); // Yangi detal dialogi uchun
  const [currentPayment, setCurrentPayment] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<any>(null); // Tanlangan to‘lov uchun

  const [formData, setFormData] = useState({
    user: "",
    apartment: "",
    total_amount: "",
  });
  const [filters, setFilters] = useState({
    status: "",
    pageSize: "100",
    object: "",
  });
  const [totalAmount, setTotalAmount] = useState("0");
  const [totalPaid, setTotalPaid] = useState("0");
  const [totalOverdue, setTotalOverdue] = useState("0");
  const [formattedPayments, setFormattedPayments] = useState<any[]>([]);

  const API_BASE_URL = "http://api.ahlan.uz";

  const getAuthHeaders = () => ({
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      setAccessToken(token);
    }
  }, []);

  const fetchClients = async () => {
    let allClients: any[] = [];
    let nextUrl = `${API_BASE_URL}/users/?user_type=mijoz&page_size=100`;
    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error("Mijozlarni olishda xatolik");
        const data = await response.json();
        allClients = [...clients, ...data.results];
        nextUrl = data.next;
      }
      setClients(allClients);
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
    }
  };

  const fetchObjects = async () => {
    let allObjects: any[] = [];
    let nextUrl = `${API_BASE_URL}/objects/?page_size=100`;
    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error("Obyektlarni olishda xatolik");
        const data = await response.json();
        allObjects = [...objects, ...data.results];
        nextUrl = data.next;
      }
      setObjects(allObjects);
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
    }
  };

  const fetchApartments = async () => {
    let allApartments: any[] = [];
    let nextUrl = `${API_BASE_URL}/apartments/?page_size=100`;
    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error("Xonadonlarni olishda xatolik");
        const data = await response.json();
        allApartments = [...apartments, ...data.results];
        nextUrl = data.next;
      }
      setApartments(allApartments);
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    let allPayments: any[] = [];
    let nextUrl = `${API_BASE_URL}/payments/`;

    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append("status", filters.status);
      if (filters.object) queryParams.append("apartment__object", filters.object);
      queryParams.append("page_size", filters.pageSize);

      if (queryParams.toString()) nextUrl += `?${queryParams.toString()}`;

      while (nextUrl) {
        const response = await fetch(nextUrl, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error("To‘lovlarni yuklashda xatolik");
        const data = await response.json();
        allPayments = [...allPayments, ...(data.results || data)];
        nextUrl = data.next;
      }
      setPayments(allPayments);
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentDetails = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/${id}/`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("To‘lov detallarini olishda xatolik");
      const data = await response.json();
      setSelectedPayment(data);
      setDetailOpen(true);
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchClients();
      fetchObjects();
      fetchApartments();
      fetchPayments();
    }
  }, [accessToken, filters]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const total = getTotalAmount();
      const paid = getTotalAmount("paid");
      const overdue = getTotalAmount("overdue");

      setTotalAmount(total.toLocaleString("us-US", { style: "currency", currency: "USD" }));
      setTotalPaid(paid.toLocaleString("us-US", { style: "currency", currency: "USD" }));
      setTotalOverdue(overdue.toLocaleString("us-US", { style: "currency", currency: "USD" }));
    }
  }, [payments]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const formatted = payments.map((payment: any) => ({
        ...payment,
        formattedAmount: Number(payment.paid_amount || 0).toLocaleString("us-US", {
          style: "currency",
          currency: "USD",
        }),
        formattedDate: payment.created_at
          ? new Date(payment.created_at).toLocaleDateString("us-US")
          : "Noma‘lum",
      }));
      setFormattedPayments(formatted);
    }
  }, [payments]);

  const createPayment = async (paymentData: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(paymentData),
      });
      if (!response.ok) throw new Error("To‘lov qo‘shishda xatolik");
      toast({ title: "Muvaffaqiyat", description: "To‘lov muvaffaqiyatli qo‘shildi" });
      fetchPayments();
      setOpen(false);
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
    }
  };

  const fetchPaymentById = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/${id}/`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("To‘lovni olishda xatolik");
      const data = await response.json();
      setCurrentPayment(data);
      setFormData({
        user: data.user?.toString() || "",
        apartment: data.apartment?.toString() || "",
        total_amount: data.total_amount?.toString() || "",
      });
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
    }
  };

  const updatePayment = async (id: number, paymentData: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/${id}/`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(paymentData),
      });
      if (!response.ok) throw new Error("To‘lovni yangilashda xatolik");
      toast({ title: "Muvaffaqiyat", description: "To‘lov muvaffaqiyatli yangilandi" });
      fetchPayments();
      setEditOpen(false);
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
    }
  };

  const deletePayment = async (id: number) => {
    if (typeof window !== "undefined" && !window.confirm("Bu to‘lovni o‘chirishni tasdiqlaysizmi?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/payments/${id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("To‘lovni o‘chirishda xatolik");
      toast({ title: "Muvaffaqiyat", description: "To‘lov muvaffaqiyatli o‘chirildi" });
      fetchPayments();
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string | null) => {
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value || "" };
      if (name === "user" && value) {
        const clientPayments = payments.filter((p: any) => p.user.toString() === value);
        const relatedApartments = [...new Set(clientPayments.map((p: any) => p.apartment?.toString()).filter(Boolean))];
        if (relatedApartments.length > 0) newFormData.apartment = relatedApartments[0];
        else newFormData.apartment = "";
      }
      return newFormData;
    });
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent, action: "save" | "saveAndAdd" | "saveAndContinue") => {
    e.preventDefault();
    if (!formData.user || !formData.apartment || !formData.total_amount) {
      toast({ title: "Xatolik", description: "Barcha zarur maydonlarni to‘ldiring", variant: "destructive" });
      return;
    }
    const paymentData = {
      user: Number(formData.user),
      apartment: Number(formData.apartment),
      payment_type: "naqd",
      total_amount: Number(formData.total_amount),
    };
    createPayment(paymentData).then(() => {
      if (action === "saveAndAdd") {
        setFormData({ user: "", apartment: "", total_amount: "" });
        setOpen(true);
      } else if (action === "saveAndContinue") {
        setOpen(false);
        setEditOpen(true);
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent, action: "save" | "saveAndAdd" | "saveAndContinue") => {
    e.preventDefault();
    const paymentData = {
      user: Number(formData.user),
      apartment: Number(formData.apartment),
      payment_type: "naqd",
      total_amount: Number(formData.total_amount),
    };
    if (currentPayment) {
      updatePayment(currentPayment.id, paymentData).then(() => {
        if (action === "saveAndAdd") {
          setFormData({ user: "", apartment: "", total_amount: "" });
          setEditOpen(false);
          setOpen(true);
        } else if (action === "saveAndContinue") {
          setEditOpen(true);
        }
      });
    }
  };

  const handleOpenEditDialog = (paymentId: number) => {
    fetchPaymentById(paymentId);
    setEditOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">To‘langan</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Kutilmoqda</Badge>;
      case "overdue":
        return <Badge className="bg-red-500">Muddati o‘tgan</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredPayments = formattedPayments.filter((payment: any) =>
    searchTerm &&
    (!payment.user_fio?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !payment.apartment_info?.toLowerCase().includes(searchTerm.toLowerCase()))
      ? false
      : true
  );

  const getTotalAmount = (status = "") =>
    payments
      .filter((p: any) => (status ? p.status === status : true))
      .reduce((total: number, payment: any) => total + Number(payment.paid_amount || 0), 0);

  const getLastPayment = (userId: number) => {
    const userPayments = payments.filter((p: any) => p.user === userId);
    const lastPayment = userPayments.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    return lastPayment
      ? {
          amount: Number(lastPayment.paid_amount).toLocaleString("us-US", { style: "currency", currency: "USD" }),
          date: new Date(lastPayment.created_at).toLocaleDateString("us-US"),
        }
      : { amount: "0 so‘m", date: "Topilmadi" };
  };

  const getTotalPaidAmount = (userId: number) => {
    const userPayments = payments.filter((p: any) => p.user === userId);
    const total = userPayments.reduce((sum: number, p: any) => sum + Number(p.paid_amount || 0), 0);
    return total.toLocaleString("us-US", { style: "currency", currency: "USD" });
  };

  const getRemainingAmount = (payment: any) => {
    const remaining = Number(payment.total_amount) - Number(payment.paid_amount);
    return remaining.toLocaleString("us-US", { style: "currency", currency: "USD" });
  };

  const clientOptions = clients.map((client) => ({
    value: client.id.toString(),
    label: `${client.fio} (${client.phone_number})`,
  }));

  const apartmentOptions = apartments.map((apartment) => ({
    value: apartment.id.toString(),
    label: `№${apartment.room_number} - ${apartment.object_name || "Noma‘lum"}`,
  }));

  const objectOptions = [
    { value: "", label: "Barcha obyektlar" },
    ...objects.map((obj) => ({
      value: obj.id.toString(),
      label: obj.name,
    })),
  ];

  function renderPaymentsTable(paymentsToRender: any[]) {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-[400px]">
          <p className="text-muted-foreground">To‘lovlar ma‘lumotlari yuklanmoqda...</p>
        </div>
      );
    }
    if (paymentsToRender.length === 0) {
      return (
        <div className="flex items-center justify-center h-[200px] border rounded-md">
          <p className="text-muted-foreground">To‘lovlar mavjud emas</p>
        </div>
      );
    }
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mijoz</TableHead>
              <TableHead>Xonadon</TableHead>
              <TableHead>Sana</TableHead>
              <TableHead>Holati</TableHead>
              <TableHead className="text-right">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentsToRender.map((payment: any) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.user_fio || "Noma‘lum"}</TableCell>
                <TableCell>{payment.apartment_info || "Noma‘lum"}</TableCell>
                <TableCell>{payment.formattedDate}</TableCell>
                <TableCell>{getStatusBadge(payment.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => fetchPaymentDetails(payment.id)}>
                      <CreditCard className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(payment.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deletePayment(payment.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
          <h2 className="text-3xl font-bold tracking-tight">To‘lovlar</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Yangi to‘lov qo‘shish</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form>
                <DialogHeader>
                  <DialogTitle>Foydalanuvchi to‘lovlari</DialogTitle>
                  <DialogDescription>Yangi to‘lov ma‘lumotlarini kiriting</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="user">Mijozlar *</Label>
                    <Select
                      options={clientOptions}
                      value={clientOptions.find((option) => option.value === formData.user) || null}
                      onChange={(option) => handleSelectChange("user", option?.value || null)}
                      placeholder="Mijozni tanlang"
                      isSearchable
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apartment">Xonadon *</Label>
                    <Select
                      options={apartmentOptions}
                      value={apartmentOptions.find((option) => option.value === formData.apartment) || null}
                      onChange={(option) => handleSelectChange("apartment", option?.value || null)}
                      placeholder="Xonadonni tanlang"
                      isSearchable
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="total_amount">Nechi pul to‘lashligi *</Label>
                    <Input
                      id="total_amount"
                      name="total_amount"
                      type="number"
                      value={formData.total_amount}
                      onChange={handleChange}
                      placeholder="To‘lov summasini kiriting"
                    />
                  </div>
                </div>
                <DialogFooter className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    onClick={(e) => handleSubmit(e, "save")}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    Saqlash
                  </Button>
                  <Button
                    type="button"
                    onClick={(e) => handleSubmit(e, "saveAndAdd")}
                    variant="outline"
                  >
                    Saqlash va yana qo‘shish
                  </Button>
                  <Button
                    type="button"
                    onClick={(e) => handleSubmit(e, "saveAndContinue")}
                    variant="outline"
                  >
                    Saqlash va tahrirlashda davom etish
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <form>
              <DialogHeader>
                <DialogTitle>Foydalanuvchi to‘lovlari</DialogTitle>
                <DialogDescription>To‘lov ma‘lumotlarini yangilang</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="user">Mijoz *</Label>
                  <Select
                    options={clientOptions}
                    value={clientOptions.find((option) => option.value === formData.user) || null}
                    onChange={(option) => handleSelectChange("user", option?.value || null)}
                    placeholder="Mijozni tanlang"
                    isSearchable
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apartment">Xonadon *</Label>
                  <Select
                    options={apartmentOptions}
                    value={apartmentOptions.find((option) => option.value === formData.apartment) || null}
                    onChange={(option) => handleSelectChange("apartment", option?.value || null)}
                    placeholder="Xonadonni tanlang"
                    isSearchable
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_amount">Nechi pul to‘lashligi *</Label>
                  <Input
                    id="total_amount"
                    name="total_amount"
                    type="number"
                    value={formData.total_amount}
                    onChange={handleChange}
                    placeholder="To‘lov summasini kiriting"
                  />
                </div>
              </div>
              <DialogFooter className="flex justify-end space-x-2">
                <Button
                  type="button"
                  onClick={(e) => handleEditSubmit(e, "save")}
                  className="bg-green-500 hover:bg-green-600"
                >
                  Saqlash
                </Button>
                <Button
                  type="button"
                  onClick={(e) => handleEditSubmit(e, "saveAndAdd")}
                  variant="outline"
                >
                  Saqlash va yana qo‘shish
                </Button>
                <Button
                  type="button"
                  onClick={(e) => handleEditSubmit(e, "saveAndContinue")}
                  variant="outline"
                >
                  Saqlash va tahrirlashda davom etish
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>To‘lov detallari</DialogTitle>
              <DialogDescription>Mijoz va to‘lov bo‘yicha ma’lumotlar</DialogDescription>
            </DialogHeader>
            {selectedPayment && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Mijozning oxirgi to‘lovi</Label>
                  <p>Summasi: {getLastPayment(selectedPayment.user).amount}</p>
                  <p>Sanasi: {getLastPayment(selectedPayment.user).date}</p>
                </div>
                <div className="space-y-2">
                  <Label>Umumiy to‘langan summa</Label>
                  <p>{getTotalPaidAmount(selectedPayment.user)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Qoldiq to‘lov</Label>
                  <p>{getRemainingAmount(selectedPayment)}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailOpen(false)}>
                Yopish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jami to‘lovlar</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAmount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">To‘langan</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalPaid}</div>
              <p className="text-xs text-muted-foreground">
                {totalAmount !== "0 so‘m" ? Math.round((getTotalAmount("paid") / getTotalAmount()) * 100) : 0}% to‘langan
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Muddati o‘tgan</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{totalOverdue}</div>
              <p className="text-xs text-muted-foreground">
                {totalAmount !== "0 so‘m" ? Math.round((getTotalAmount("overdue") / getTotalAmount()) * 100) : 0}% muddati o‘tgan
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Tabs
                defaultValue="all"
                className="space-y-4"
                onValueChange={(value) => handleFilterChange("status", value === "all" ? "" : value)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <TabsList>
                    <TabsTrigger value="all">Barcha to‘lovlar</TabsTrigger>
                    <TabsTrigger value="paid">To‘langan</TabsTrigger>
                    <TabsTrigger value="pending">Kutilmoqda</TabsTrigger>
                    <TabsTrigger value="overdue">Muddati o‘tgan</TabsTrigger>
                  </TabsList>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="To‘lovlarni qidirish..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                    <Select
                      options={objectOptions}
                      value={objectOptions.find((option) => option.value === filters.object) || { value: "", label: "Barcha obyektlar" }}
                      onChange={(option) => handleFilterChange("object", option?.value || "")}
                      placeholder="Obyektni tanlang"
                      isSearchable
                      className="w-[180px]"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilters({ status: "", pageSize: "100", object: "" });
                        setSearchTerm("");
                      }}
                    >
                      Tozalash
                    </Button>
                  </div>
                </div>
                <TabsContent value="all">{renderPaymentsTable(filteredPayments)}</TabsContent>
                <TabsContent value="paid">
                  {renderPaymentsTable(filteredPayments.filter((p: any) => p.status === "paid"))}
                </TabsContent>
                <TabsContent value="pending">
                  {renderPaymentsTable(filteredPayments.filter((p: any) => p.status === "pending"))}
                </TabsContent>
                <TabsContent value="overdue">
                  {renderPaymentsTable(filteredPayments.filter((p: any) => p.status === "overdue"))}
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}