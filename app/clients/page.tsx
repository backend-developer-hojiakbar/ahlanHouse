"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Eye, Edit, Trash, ChevronLeft, ChevronRight, Home } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mijoz interfeysi
interface Client {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  balance: number;
  apartment: { room_number: string; object_name: string } | null;
  kafil_fio: string | null;
  kafil_address: string | null;
  kafil_phone_number: string | null;
}

// Xonadon interfeysi (API ga moslashtirildi)
interface Apartment {
  id: number; // apartment ID si
  apartment_info: string; // "Navoiy 108 K - 2 xonali" kabi ma'lumot
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [apartmentsOpen, setApartmentsOpen] = useState(false); // Xonadonlar dialogi uchun
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClientApartments, setSelectedClientApartments] = useState<Apartment[]>([]); // Tanlangan mijozning xonadonlari
  const [apartmentsLoading, setApartmentsLoading] = useState(false); // Xonadonlarni yuklash uchun loader
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState<Record<number, boolean>>({});
  const [editLoading, setEditLoading] = useState<Record<number, boolean>>({});

  // Pagination uchun o'zgaruvchilar
  const [currentPage, setCurrentPage] = useState(1);
  const clientsPerPage = 10; // Har bir sahifada 10 ta mijoz

  const [formData, setFormData] = useState({
    fio: "",
    phone_number: "",
    password: "",
    user_type: "mijoz",
    address: "",
    balance: "0.0",
    kafil_fio: "",
    kafil_address: "",
    kafil_phone_number: "",
  });

  const [editFormData, setEditFormData] = useState({
    fio: "",
    phone_number: "",
    password: "",
    user_type: "mijoz",
    address: "",
    balance: "0.0",
    kafil_fio: "",
    kafil_address: "",
    kafil_phone_number: "",
  });

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
    if (!accessToken) {
      console.warn("Access token not available.");
      return;
    }

    setLoading(true);
    let allFilteredClients: Client[] = [];
    let nextUrl: string | null = "http://api.ahlan.uz/users/";
    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          if (response.status === 401) {
            const confirmLogout = window.confirm(
              "Sessiya tugagan. Qayta kirishni xohlaysizmi?"
            );
            if (confirmLogout) {
              localStorage.removeItem("access_token");
              router.push("/login");
            }
            throw new Error("Sessiya tugagan, qayta kirish kerak");
          }
          throw new Error(`Mijozlarni olishda xatolik: ${response.statusText}`);
        }

        const data = await response.json();
        const clientsList = data.results || [];

        const mijozClientsList = clientsList.filter(
          (client: any) => client.user_type === "mijoz"
        );

        const formattedClients: Client[] = mijozClientsList.map((client: any) => ({
          id: client.id,
          name: client.fio || "Noma'lum",
          phone: client.phone_number || "Noma'lum",
          address: client.address || null,
          balance: Number(client.balance) || 0,
          apartment: client.apartment
            ? {
                room_number: client.apartment.room_number || "N/A",
                object_name: client.apartment.object_name || "Noma'lum obyekt",
              }
            : null,
          kafil_fio: client.kafil_fio || null,
          kafil_address: client.kafil_address || null,
          kafil_phone_number: client.kafil_phone_number || null,
        }));

        allFilteredClients = [...allFilteredClients, ...formattedClients];
        nextUrl = data.next;
      }
      setClients(allFilteredClients);
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "Mijozlarni olishda xatolik yuz berdi",
        variant: "destructive",
      });
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  // Mijozga tegishli xonadonlarni olish funksiyasi
  const fetchClientApartments = async (clientId: number) => {
    if (!accessToken) {
      toast({
        title: "Xatolik",
        description: "Avtorizatsiya tokeni topilmadi",
        variant: "destructive",
      });
      return;
    }

    setApartmentsLoading(true);
    let allPayments: any[] = [];
    let nextUrl: string | null = "http://api.ahlan.uz/payments/";

    try {
      // Pagination orqali barcha ma'lumotlarni olish
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Xonadonlarni olishda xatolik: ${response.statusText}`);
        }

        const data = await response.json();
        allPayments = [...allPayments, ...(data.results || [])];
        nextUrl = data.next;
      }

      // Tanlangan mijozga mos xonadonlarni filtrlab olish
      const clientPayments = allPayments.filter(
        (payment: any) => payment.user === clientId
      );

      // Xonadonlarni formatlash
      const apartments: Apartment[] = clientPayments.map((payment: any) => ({
        id: payment.apartment,
        apartment_info: payment.apartment_info || "Noma'lum xonadon",
      }));

      // Takrorlanadigan xonadonlarni olib tashlash (agar bir xil apartment ID si bo'lsa)
      const uniqueApartments = Array.from(
        new Map(apartments.map((apt) => [apt.id, apt])).values()
      );

      setSelectedClientApartments(uniqueApartments);
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "Xonadonlarni olishda xatolik yuz berdi",
        variant: "destructive",
      });
      setSelectedClientApartments([]);
    } finally {
      setApartmentsLoading(false);
    }
  };

  const createClient = async (clientData: any) => {
    if (!accessToken) {
      toast({
        title: "Xatolik",
        description: "Avtorizatsiya tokeni topilmadi",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("http://api.ahlan.uz/users/", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...clientData, user_type: "mijoz" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage =
          Object.values(errorData).flat().join(", ") || "Mijoz qo‘shishda xatolik";
        throw new Error(errorMessage);
      }

      toast({ title: "Muvaffaqiyat", description: "Yangi mijoz qo‘shildi" });
      await fetchClients();
      setOpen(false);
      setCurrentPage(1);
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "Mijoz qo‘shishda xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };

  const updateClient = async (id: number, clientData: any) => {
    if (!accessToken) {
      toast({
        title: "Xatolik",
        description: "Avtorizatsiya tokeni topilmadi",
        variant: "destructive",
      });
      return;
    }

    const dataToSend = { ...clientData, user_type: "mijoz" };
    if (!dataToSend.password) delete dataToSend.password;

    try {
      const response = await fetch(`http://api.ahlan.uz/users/${id}/`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage =
          Object.values(errorData).flat().join(", ") || "Mijozni yangilashda xatolik";
        throw new Error(errorMessage);
      }

      toast({ title: "Muvaffaqiyat", description: "Mijoz yangilandi" });
      await fetchClients();
      setEditOpen(false);
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "Mijozni yangilashda xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };

  const deleteClient = async (id: number) => {
    if (!accessToken) {
      toast({
        title: "Xatolik",
        description: "Avtorizatsiya tokeni topilmadi",
        variant: "destructive",
      });
      return;
    }

    if (!window.confirm("Haqiqatan ham bu mijozni o'chirmoqchimisiz?")) return;

    try {
      const response = await fetch(`http://api.ahlan.uz/users/${id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.status === 204) {
        toast({ title: "Muvaffaqiyat", description: "Mijoz o‘chirildi" });
        await fetchClients();
        const totalClientsAfterDelete = clients.length - 1;
        const totalPagesAfterDelete = Math.ceil(totalClientsAfterDelete / clientsPerPage);
        if (currentPage > totalPagesAfterDelete && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      } else if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          Object.values(errorData).flat().join(", ") || "Mijozni o‘chirishda xatolik"
        );
      }
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "Mijozni o‘chirishda xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };

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
    fetchClients();
  }, [accessToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newClient = {
      fio: formData.fio,
      phone_number: formData.phone_number,
      password: formData.password,
      address: formData.address || null,
      balance: parseFloat(formData.balance) || 0.0,
      kafil_fio: formData.kafil_fio || null,
      kafil_address: formData.kafil_address || null,
      kafil_phone_number: formData.kafil_phone_number || null,
    };
    createClient(newClient);
    setFormData({
      fio: "",
      phone_number: "",
      password: "",
      user_type: "mijoz",
      address: "",
      balance: "0.0",
      kafil_fio: "",
      kafil_address: "",
      kafil_phone_number: "",
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    const updatedClient = {
      fio: editFormData.fio,
      phone_number: editFormData.phone_number,
      password: editFormData.password || undefined,
      address: editFormData.address || null,
      balance: parseFloat(editFormData.balance) || 0.0,
      kafil_fio: editFormData.kafil_fio || null,
      kafil_address: editFormData.kafil_address || null,
      kafil_phone_number: editFormData.kafil_phone_number || null,
    };
    updateClient(selectedClient.id, updatedClient);
  };

  const handleViewClient = async (clientId: number) => {
    setViewLoading((prev) => ({ ...prev, [clientId]: true }));
    try {
      router.push(`/clients/${clientId}`);
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "Mijozni ko‘rishda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setViewLoading((prev) => ({ ...prev, [clientId]: false }));
    }
  };

  const openEditDialog = (client: Client) => {
    setEditLoading((prev) => ({ ...prev, [client.id]: true }));
    setSelectedClient(client);
    setEditFormData({
      fio: client.name,
      phone_number: client.phone,
      password: "",
      user_type: "mijoz",
      address: client.address || "",
      balance: client.balance.toString(),
      kafil_fio: client.kafil_fio || "",
      kafil_address: client.kafil_address || "",
      kafil_phone_number: client.kafil_phone_number || "",
    });
    setEditOpen(true);
    setEditLoading((prev) => ({ ...prev, [client.id]: false }));
  };

  // Xonadonlarni ko'rish dialogini ochish
  const openApartmentsDialog = async (client: Client) => {
    setSelectedClient(client);
    await fetchClientApartments(client.id);
    setApartmentsOpen(true);
  };

  // Qidiruv va pagination
  const filteredClients = clients.filter((client) => {
    const searchTermLower = searchTerm.toLowerCase();
    const nameMatch = client.name.toLowerCase().includes(searchTermLower);
    const phoneMatch = client.phone.includes(searchTerm);
    return !searchTerm || nameMatch || phoneMatch;
  });

  // Pagination logikasi
  const totalClients = filteredClients.length;
  const totalPages = Math.ceil(totalClients / clientsPerPage);
  const startIndex = (currentPage - 1) * clientsPerPage;
  const endIndex = startIndex + clientsPerPage;
  const currentClients = filteredClients.slice(startIndex, endIndex);

  // Sahifani o'zgartirish funksiyalari
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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
          <h2 className="text-3xl font-bold tracking-tight">Mijozlar</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Yangi mijoz qo'shish
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Yangi mijoz qo'shish</DialogTitle>
                  <DialogDescription>Yangi mijoz ma'lumotlarini kiriting</DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general">Umumiy</TabsTrigger>
                    <TabsTrigger value="additional">Qo'shimcha</TabsTrigger>
                    <TabsTrigger value="guarantor">Kafil</TabsTrigger>
                  </TabsList>
                  <TabsContent value="general">
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone_number">Telefon raqami *</Label>
                          <Input
                            id="phone_number"
                            name="phone_number"
                            value={formData.phone_number}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fio">F.I.O. *</Label>
                          <Input
                            id="fio"
                            name="fio"
                            value={formData.fio}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Parol *</Label>
                          <Input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user_type">Foydalanuvchi turi *</Label>
                          <Input id="user_type" name="user_type" value="Mijoz" disabled />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="additional">
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="address">Manzil</Label>
                          <Input
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="balance">Balans</Label>
                          <Input
                            id="balance"
                            name="balance"
                            type="number"
                            step="0.01"
                            value={formData.balance}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="guarantor">
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="kafil_fio">Kafil F.I.O.</Label>
                          <Input
                            id="kafil_fio"
                            name="kafil_fio"
                            value={formData.kafil_fio}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="kafil_phone_number">Kafil telefon raqami</Label>
                          <Input
                            id="kafil_phone_number"
                            name="kafil_phone_number"
                            value={formData.kafil_phone_number}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="kafil_address">Kafil manzili</Label>
                          <Input
                            id="kafil_address"
                            name="kafil_address"
                            value={formData.kafil_address}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                <DialogFooter>
                  <Button type="submit">Saqlash</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <Input
                  placeholder="Mijozlarni qidirish (FIO yoki telefon)..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="max-w-sm"
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <p className="text-muted-foreground">Mijozlar yuklanmoqda...</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>No</TableHead>
                          <TableHead>F.I.O.</TableHead>
                          <TableHead>Telefon</TableHead>
                          <TableHead>Manzil</TableHead>
                          <TableHead>Balans</TableHead>
                          <TableHead>Xonadon</TableHead>
                          <TableHead className="text-right">Amallar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentClients.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              Mijozlar topilmadi {searchTerm && `"${searchTerm}" uchun`}.
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentClients.map((client, index) => (
                            <TableRow key={client.id}>
                              <TableCell>{startIndex + index + 1}</TableCell>
                              <TableCell className="font-medium">{client.name}</TableCell>
                              <TableCell>{client.phone}</TableCell>
                              <TableCell>{client.address || "Noma'lum"}</TableCell>
                              <TableCell>
                                <span className={client.balance >= 0 ? "text-green-600" : "text-red-600"}>
                                  {client.balance.toLocaleString("us-US", {
                                    style: "currency",
                                    currency: "USD",
                                    minimumFractionDigits: 0,
                                  })}
                                </span>
                              </TableCell>
                              <TableCell>
                                {client.apartment ? (
                                  `№${client.apartment.room_number} (${client.apartment.object_name})`
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openApartmentsDialog(client)}
                                  >
                                    <Home className="h-4 w-4 mr-2" />
                                    Xonadonlarni ko‘rish
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewClient(client.id)}
                                    title="Ko'rish"
                                    disabled={viewLoading[client.id]}
                                  >
                                    {viewLoading[client.id] ? (
                                      <span className="animate-pulse text-xs">Yuklanmoqda...</span>
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditDialog(client)}
                                    title="Tahrirlash"
                                    disabled={editLoading[client.id]}
                                  >
                                    {editLoading[client.id] ? (
                                      <span className="animate-pulse text-xs">Yuklanmoqda...</span>
                                    ) : (
                                      <Edit className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteClient(client.id)}
                                    title="O'chirish"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination qismi */}
                  {totalClients > clientsPerPage && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        {totalClients} ta mijozdan {startIndex + 1} -{" "}
                        {Math.min(endIndex, totalClients)} ko‘rsatilmoqda
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrevPage}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-2" />
                          Oldingi
                        </Button>
                        <div className="flex space-x-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages}
                        >
                          Keyingi
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Xonadonlarni ko'rish dialogi */}
        <Dialog open={apartmentsOpen} onOpenChange={setApartmentsOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {selectedClient?.name} uchun xonadonlar
              </DialogTitle>
              <DialogDescription>
                Quyida ushbu mijozga tegishli xonadonlar ro‘yxati keltirilgan.
              </DialogDescription>
            </DialogHeader>
            {apartmentsLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-muted-foreground">Xonadonlar yuklanmoqda...</p>
              </div>
            ) : selectedClientApartments.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-muted-foreground">Bu mijozga xonadon biriktirilmagan.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Xonadon ID</TableHead>
                      <TableHead>Xonadon ma'lumotlari</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedClientApartments.map((apartment, index) => (
                      <TableRow key={apartment.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{apartment.id}</TableCell>
                        <TableCell>{apartment.apartment_info}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setApartmentsOpen(false)}>Yopish</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mijozni tahrirlash dialogi */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>Mijozni tahrirlash</DialogTitle>
                <DialogDescription>Mijoz ma'lumotlarini yangilang</DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">Umumiy</TabsTrigger>
                  <TabsTrigger value="additional">Qo'shimcha</TabsTrigger>
                  <TabsTrigger value="guarantor">Kafil</TabsTrigger>
                </TabsList>
                <TabsContent value="general">
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-phone_number">Telefon raqami *</Label>
                        <Input
                          id="edit-phone_number"
                          name="phone_number"
                          value={editFormData.phone_number}
                          onChange={handleEditChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-fio">F.I.O. *</Label>
                        <Input
                          id="edit-fio"
                          name="fio"
                          value={editFormData.fio}
                          onChange={handleEditChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-password">Yangi parol</Label>
                        <Input
                          id="edit-password"
                          name="password"
                          type="password"
                          value={editFormData.password}
                          onChange={handleEditChange}
                          placeholder="O'zgartirish uchun kiriting"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-user_type">Foydalanuvchi turi *</Label>
                        <Input
                          id="edit-user_type"
                          name="user_type"
                          value="Mijoz"
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="additional">
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="edit-address">Manzil</Label>
                        <Input
                          id="edit-address"
                          name="address"
                          value={editFormData.address}
                          onChange={handleEditChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-balance">Balans</Label>
                        <Input
                          id="edit-balance"
                          name="balance"
                          type="number"
                          step="0.01"
                          value={editFormData.balance}
                          onChange={handleEditChange}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="guarantor">
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-kafil_fio">Kafil F.I.O.</Label>
                        <Input
                          id="edit-kafil_fio"
                          name="kafil_fio"
                          value={editFormData.kafil_fio}
                          onChange={handleEditChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-kafil_phone_number">Kafil telefon raqami</Label>
                        <Input
                          id="edit-kafil_phone_number"
                          name="kafil_phone_number"
                          value={editFormData.kafil_phone_number}
                          onChange={handleEditChange}
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="edit-kafil_address">Kafil manzili</Label>
                        <Input
                          id="edit-kafil_address"
                          name="kafil_address"
                          value={editFormData.kafil_address}
                          onChange={handleEditChange}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              <DialogFooter>
                <Button type="submit">O'zgarishlarni saqlash</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}