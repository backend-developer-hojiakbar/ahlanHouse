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

// Xonadon interfeysi (API va Dialog uchun mos)
interface Apartment {
  id: number;
  room_number: string;
  object_name: string; // API dagi object_name ga mos keladi
}

// Mijoz interfeysi (apartments massivini saqlash uchun yangilangan)
interface Client {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  balance: number;
  apartments: Apartment[]; // Barcha xonadonlar uchun massiv
  kafil_fio: string | null;
  kafil_address: string | null;
  kafil_phone_number: string | null;
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [apartmentFilter, setApartmentFilter] = useState(""); // Bu filtr endi xonadonlar ro'yxati uchun emas, balki qidiruv uchun ishlatilishi mumkin
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [apartmentsOpen, setApartmentsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClientApartments, setSelectedClientApartments] = useState<Apartment[]>([]);
  const [apartmentsLoading, setApartmentsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState<Record<number, boolean>>({});
  const [editLoading, setEditLoading] = useState<Record<number, boolean>>({});

  // Pagination uchun o'zgaruvchilar
  const [currentPage, setCurrentPage] = useState(1);
  const clientsPerPage = 10;

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

  // Mijozning barcha xonadonlarini olish uchun funksiya
  const fetchClientApartments = async (clientId: number): Promise<Apartment[]> => {
    if (!accessToken) {
      // Token yo'qligi haqida ogohlantirish (agar kerak bo'lsa)
      // toast(...)
      return [];
    }

    setApartmentsLoading(true); // Dialog ichidagi yuklanish holatini boshqarish uchun
    let allPayments: any[] = [];
    let nextUrl: string | null = "http://api.ahlan.uz/payments/";

    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`To'lovlarni olishda xatolik: ${response.statusText}`);
        }

        const data = await response.json();
        allPayments = [...allPayments, ...(data.results || [])];
        nextUrl = data.next;
      }

      // Faqat shu mijozga tegishli to'lovlarni filtrlaymiz
      const clientPayments = allPayments.filter(
        (payment: any) => payment.user === clientId
      );

      // Unikal xonadon ID larini ajratib olamiz
      const uniqueApartmentIds = Array.from(new Set(clientPayments.map(p => p.apartment)));

      // Har bir unikal xonadon uchun ma'lumot olamiz
      const apartments: Apartment[] = await Promise.all(
        uniqueApartmentIds.map(async (apartmentId: any) => {
          try {
            const apartmentResponse = await fetch(
              `http://api.ahlan.uz/apartments/${apartmentId}/`,
              {
                method: "GET",
                headers: getAuthHeaders(),
              }
            );

            if (!apartmentResponse.ok) {
               console.error(`Xonadon ${apartmentId} ma'lumotlarini olishda xatolik: ${apartmentResponse.statusText}`);
               // Xatolik bo'lsa ham davom etish uchun null yoki boshqa qiymat qaytarish mumkin
               return null;
              // throw new Error(`Xonadon ${apartmentId} ma'lumotlarini olishda xatolik: ${apartmentResponse.statusText}`);
            }
            const apartmentData = await apartmentResponse.json();
            return {
              id: apartmentId,
              room_number: apartmentData.room_number || "N/A",
              object_name: apartmentData.object_name || "Noma'lum obyekt",
            };
          } catch(error) {
             console.error(`Xonadon ${apartmentId} uchun fetch xatosi:`, error);
             return null; // Xatolik bo'lgan xonadonni o'tkazib yuborish
          }
        })
      );

      // null qiymatlarni filtrlab tashlaymiz
      const validApartments = apartments.filter(apt => apt !== null) as Apartment[];

      // Bu funksiya faqat dialog uchun ishlatilsa, state ni shu yerda yangilaymiz
      setSelectedClientApartments(validApartments);
      return validApartments;

    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "Mijoz xonadonlarini olishda xatolik yuz berdi",
        variant: "destructive",
      });
      setSelectedClientApartments([]); // Xatolik bo'lsa state ni tozalash
      return [];
    } finally {
      setApartmentsLoading(false); // Dialog yuklanishini to'xtatish
    }
  };

  // Mijozlarni olish (har bir mijoz uchun xonadonlarni ham yuklaydi)
 const fetchClients = async () => {
    if (!accessToken) {
      console.warn("Access token not available.");
      // Token yo'q bo'lsa login sahifasiga o'tkazish yoki xabar berish
       if (typeof window !== 'undefined') {
         router.push("/login");
       }
       return;
    }

    setLoading(true);
    let allFormattedClients: Client[] = [];
    let nextUrl: string | null = "http://api.ahlan.uz/users/";
    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          if (response.status === 401 && typeof window !== 'undefined') {
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

        // Har bir mijoz ma'lumotini formatlash va xonadonlarini yuklash
        const formattedClientsBatch: Client[] = await Promise.all(
          mijozClientsList.map(async (client: any): Promise<Client> => {
             // VAQTINCHALIK: Xonadonlarni har safar yuklash o'rniga,
             // kelajakda optimallashtirish uchun faqat kerak bo'lganda yuklash mumkin.
             // Hozirgi talab - ro'yxatda ko'rsatish uchun shu yerda yuklaymiz.
            let clientApartments: Apartment[] = [];
            try {
                // To'lovlar orqali xonadonlarni aniqlash
                let clientPayments: any[] = [];
                let paymentNextUrl: string | null = `http://api.ahlan.uz/payments/?user=${client.id}`; // Foydalanuvchi bo'yicha filtr
                while(paymentNextUrl) {
                    const paymentResponse = await fetch(paymentNextUrl, { headers: getAuthHeaders() });
                    if (!paymentResponse.ok) break; // Xatolik bo'lsa to'xtatish
                    const paymentData = await paymentResponse.json();
                    clientPayments = [...clientPayments, ...(paymentData.results || [])];
                    paymentNextUrl = paymentData.next;
                }

                const uniqueApartmentIds = Array.from(new Set(clientPayments.map(p => p.apartment)));

                clientApartments = await Promise.all(
                    uniqueApartmentIds.map(async (aptId) => {
                        try {
                            const aptResponse = await fetch(`http://api.ahlan.uz/apartments/${aptId}/`, { headers: getAuthHeaders() });
                            if (!aptResponse.ok) return null;
                            const aptData = await aptResponse.json();
                            return {
                                id: aptId,
                                room_number: aptData.room_number || "N/A",
                                object_name: aptData.object_name || "Noma'lum"
                            };
                        } catch { return null; }
                    })
                );
                clientApartments = clientApartments.filter(apt => apt !== null) as Apartment[];

            } catch (error) {
                console.error(`Mijoz ${client.id} uchun xonadonlarni olishda xatolik: `, error);
                clientApartments = []; // Xatolik bo'lsa bo'sh massiv
            }

            return {
              id: client.id,
              name: client.fio || "Noma'lum",
              phone: client.phone_number || "Noma'lum",
              address: client.address || null,
              balance: Number(client.balance) || 0,
              apartments: clientApartments, // Yuklangan xonadonlar massivi
              kafil_fio: client.kafil_fio || null,
              kafil_address: client.kafil_address || null,
              kafil_phone_number: client.kafil_phone_number || null,
            };
          })
        );

        allFormattedClients = [...allFormattedClients, ...formattedClientsBatch];
        nextUrl = data.next;
      }
      setClients(allFormattedClients);
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

  // Mijoz yaratish
  const createClient = async (clientData: any) => {
    if (!accessToken) { /* ... token xatoligi ... */ return; }

    try {
      const response = await fetch("http://api.ahlan.uz/users/", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...clientData, user_type: "mijoz" }),
      });

      if (!response.ok) { /* ... xatolikni qayta ishlash ... */ throw new Error(/*...*/); }

      toast({ title: "Muvaffaqiyat", description: "Yangi mijoz qo‘shildi" });
      await fetchClients(); // Ro'yxatni yangilash
      setOpen(false);
      setCurrentPage(1); // Birinchi sahifaga o'tish
    } catch (error: any) {
      toast({ /* ... xatolik xabari ... */ });
    }
  };

  // Mijozni yangilash
  const updateClient = async (id: number, clientData: any) => {
    if (!accessToken) { /* ... token xatoligi ... */ return; }

    const dataToSend = { ...clientData, user_type: "mijoz" };
    if (!dataToSend.password) delete dataToSend.password; // Parol bo'sh bo'lsa o'chirish

    try {
      const response = await fetch(`http://api.ahlan.uz/users/${id}/`, {
        method: "PUT", // yoki PATCH
        headers: getAuthHeaders(),
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) { /* ... xatolikni qayta ishlash ... */ throw new Error(/*...*/); }

      toast({ title: "Muvaffaqiyat", description: "Mijoz yangilandi" });
      await fetchClients(); // Ro'yxatni yangilash
      setEditOpen(false);
    } catch (error: any) {
       toast({ /* ... xatolik xabari ... */ });
    }
  };

  // Mijozni o'chirish
  const deleteClient = async (id: number) => {
    if (!accessToken) { /* ... token xatoligi ... */ return; }
    if (!window.confirm("Haqiqatan ham bu mijozni o'chirmoqchimisiz?")) return;

    try {
      const response = await fetch(`http://api.ahlan.uz/users/${id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.status === 204) {
        toast({ title: "Muvaffaqiyat", description: "Mijoz o‘chirildi" });
        // O'chirilgandan keyin ro'yxatni yangilash va paginationni to'g'rilash
        const newClients = clients.filter(c => c.id !== id);
        setClients(newClients);
        const totalClientsAfterDelete = newClients.length;
        const totalPagesAfterDelete = Math.ceil(totalClientsAfterDelete / clientsPerPage);
        if (currentPage > totalPagesAfterDelete && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else if (totalClientsAfterDelete > 0 && currentClients.length === 1 && currentPage > 1) {
             // Agar joriy sahifada faqat bitta mijoz qolgan bo'lsa va u o'chirilsa
             setCurrentPage(currentPage - 1);
        } else {
            // Qolgan holatlarda, agar kerak bo'lsa fetchClients() ni chaqirish mumkin,
            // lekin state ni to'g'ridan-to'g'ri yangilash tezroq
            // await fetchClients();
        }
      } else if (!response.ok) { /* ... xatolikni qayta ishlash ... */ throw new Error(/*...*/); }
    } catch (error: any) {
      toast({ /* ... xatolik xabari ... */ });
    }
  };

  // Komponent yuklanganda va token o'zgarganda mijozlarni olish
  useEffect(() => {
    if (accessToken === null) return; // Token hali o'rnatilmagan bo'lsa kutish
    if (!accessToken) {
      if (typeof window !== 'undefined') {
          toast({
              title: "Xatolik",
              description: "Tizimga kirish talab qilinadi",
              variant: "destructive",
          });
          router.push("/login");
      }
      return;
    }
    fetchClients();
  }, [accessToken, router]); // router ni dependency ga qo'shish

  // Input o'zgarishlarini boshqarish (yangi mijoz formasi)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Input o'zgarishlarini boshqarish (tahrirlash formasi)
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Yangi mijoz formasini jo'natish
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
    // Formani tozalash
    setFormData({ fio: "", phone_number: "", password: "", user_type: "mijoz", address: "", balance: "0.0", kafil_fio: "", kafil_address: "", kafil_phone_number: "" });
  };

  // Tahrirlash formasini jo'natish
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    const updatedClient = {
      fio: editFormData.fio,
      phone_number: editFormData.phone_number,
      password: editFormData.password || undefined, // Parol o'zgartirilmasa undefined yuborish
      address: editFormData.address || null,
      balance: parseFloat(editFormData.balance) || 0.0,
      kafil_fio: editFormData.kafil_fio || null,
      kafil_address: editFormData.kafil_address || null,
      kafil_phone_number: editFormData.kafil_phone_number || null,
    };
    updateClient(selectedClient.id, updatedClient);
  };

  // Mijozni ko'rish sahifasiga o'tish
  const handleViewClient = async (clientId: number) => {
    setViewLoading((prev) => ({ ...prev, [clientId]: true }));
    try {
      router.push(`/clients/${clientId}`);
      // Ko'rish tugmasi bosilganda yuklanishni darhol to'xtatmaslik mumkin,
      // chunki sahifa o'zgarishi biroz vaqt oladi.
      // Agar sahifa ochilmasa xatolikni ushlash kerak.
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "Mijozni ko‘rishda xatolik yuz berdi",
        variant: "destructive",
      });
      setViewLoading((prev) => ({ ...prev, [clientId]: false })); // Xatolik bo'lsa false qilish
    }
    // finally qismi kerak emas, chunki sahifa o'zgarishi kerak
  };

  // Tahrirlash dialogini ochish
  const openEditDialog = (client: Client) => {
    setEditLoading((prev) => ({ ...prev, [client.id]: true })); // Yuklanishni boshlash
    setSelectedClient(client);
    setEditFormData({
      fio: client.name,
      phone_number: client.phone,
      password: "", // Parolni ko'rsatmaslik
      user_type: "mijoz",
      address: client.address || "",
      balance: client.balance.toString(),
      kafil_fio: client.kafil_fio || "",
      kafil_address: client.kafil_address || "",
      kafil_phone_number: client.kafil_phone_number || "",
    });
    setEditOpen(true);
    // Dialog ochilgandan so'ng yuklanishni to'xtatish
    // Ma'lumotlar yuklangandan keyin buni qilish mantiqiyroq
    setEditLoading((prev) => ({ ...prev, [client.id]: false }));
  };

  // Xonadonlar dialogini ochish
  const openApartmentsDialog = async (client: Client) => {
    setSelectedClient(client);
    setApartmentsOpen(true); // Dialog ochish
    // Dialog ochilganda xonadonlarni qayta yuklash (eng so'nggi ma'lumot uchun)
    await fetchClientApartments(client.id);
  };

  // Mijozlarni filtr va qidiruv bo'yicha filtrlaymiz
  const filteredClients = clients.filter((client) => {
    const searchTermLower = searchTerm.toLowerCase();
    const nameMatch = client.name.toLowerCase().includes(searchTermLower);
    const phoneMatch = client.phone.includes(searchTerm); // Raqam bo'yicha to'g'ri qidiruv

    // Xonadon raqami bo'yicha filtr (agar xonadonlar mavjud bo'lsa)
    const apartmentMatch = apartmentFilter
      ? client.apartments.some(apt =>
          apt.room_number.toLowerCase().includes(apartmentFilter.toLowerCase())
        )
      : true; // Filtr bo'sh bo'lsa, barcha mijozlar mos keladi

    return (searchTerm === "" || nameMatch || phoneMatch) && apartmentMatch;
  });

  // Pagination uchun hisob-kitoblar
  const totalClients = filteredClients.length;
  const totalPages = Math.ceil(totalClients / clientsPerPage);
  const startIndex = (currentPage - 1) * clientsPerPage;
  const endIndex = startIndex + clientsPerPage;
  const currentClients = filteredClients.slice(startIndex, endIndex);

  // Keyingi sahifaga o'tish
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Oldingi sahifaga o'tish
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Muayyan sahifaga o'tish
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
    }
  };


  // --- JSX Rendering ---
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Page Title and Add Button */}
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Mijozlar</h2>
          {/* Yangi mijoz qo'shish dialogi triggeri */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Yangi mijoz qo'shish
              </Button>
            </DialogTrigger>
            {/* Yangi mijoz qo'shish dialogi kontenti */}
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Yangi mijoz qo'shish</DialogTitle>
                  <DialogDescription>
                    Yangi mijoz ma'lumotlarini kiriting
                  </DialogDescription>
                </DialogHeader>
                {/* Tabs for form sections */}
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general">Umumiy</TabsTrigger>
                    <TabsTrigger value="additional">Qo'shimcha</TabsTrigger>
                    <TabsTrigger value="guarantor">Kafil</TabsTrigger>
                  </TabsList>
                  {/* General Tab */}
                  <TabsContent value="general">
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone_number">Telefon raqami *</Label>
                          <Input id="phone_number" name="phone_number" value={formData.phone_number} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fio">F.I.O. *</Label>
                          <Input id="fio" name="fio" value={formData.fio} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Parol *</Label>
                          <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user_type">Foydalanuvchi turi *</Label>
                          <Input id="user_type" name="user_type" value="Mijoz" disabled />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  {/* Additional Tab */}
                  <TabsContent value="additional">
                    <div className="grid gap-4 py-4">
                       <div className="space-y-2 col-span-2"> {/* Fixed grid layout */}
                          <Label htmlFor="address">Manzil</Label>
                          <Input id="address" name="address" value={formData.address} onChange={handleChange} />
                        </div>
                    </div>
                  </TabsContent>
                  {/* Guarantor Tab */}
                  <TabsContent value="guarantor">
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="kafil_fio">Kafil F.I.O.</Label>
                          <Input id="kafil_fio" name="kafil_fio" value={formData.kafil_fio} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="kafil_phone_number">Kafil telefon raqami</Label>
                          <Input id="kafil_phone_number" name="kafil_phone_number" value={formData.kafil_phone_number} onChange={handleChange} />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="kafil_address">Kafil manzili</Label>
                          <Input id="kafil_address" name="kafil_address" value={formData.kafil_address} onChange={handleChange} />
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

        {/* Main Card for Table and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <Input
                  placeholder="Mijozlarni qidirish (FIO yoki telefon)..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="max-w-sm"
                />
                <Input
                  placeholder="Xonadon raqami bo'yicha filtr..."
                  value={apartmentFilter}
                  onChange={(e) => { setApartmentFilter(e.target.value); setCurrentPage(1); }}
                  className="max-w-sm"
                />
              </div>

              {/* Loading State or Table */}
              {loading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <p className="text-muted-foreground">Mijozlar yuklanmoqda...</p>
                </div>
              ) : (
                <>
                  {/* Clients Table */}
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>No</TableHead>
                          <TableHead>F.I.O.</TableHead>
                          <TableHead>Telefon</TableHead>
                          <TableHead>Manzil</TableHead>
                          <TableHead>Xonadon</TableHead> {/* O'zgartirilgan sarlavha */}
                          <TableHead className="text-right">Amallar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentClients.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                              {searchTerm || apartmentFilter
                                ? `"${searchTerm}" ${apartmentFilter ? `va xonadon "${apartmentFilter}" ` : ''}bo'yicha mijozlar topilmadi.`
                                : "Mijozlar mavjud emas."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentClients.map((client, index) => (
                            <TableRow key={client.id}>
                              <TableCell>{startIndex + index + 1}</TableCell>
                              <TableCell className="font-medium">{client.name}</TableCell>
                              <TableCell>{client.phone}</TableCell>
                              <TableCell>{client.address || "Noma'lum"}</TableCell>
                              {/* === XONADON UCHUN YANGILANGAN QISM === */}
                              <TableCell>
                                {client.apartments && client.apartments.length > 0 ? (
                                  // Agar xonadonlar mavjud bo'lsa, dialog ochish tugmasi
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openApartmentsDialog(client)}
                                  >
                                    <Home className="h-4 w-4 mr-2" />
                                    Xonadonlarni ko‘rish ({client.apartments.length})
                                  </Button>
                                ) : (
                                  // Agar xonadonlar massivi bo'sh bo'lsa
                                  <span className="text-muted-foreground italic text-xs">
                                    Xonadon biriktirilmagan
                                  </span>
                                )}
                              </TableCell>
                              {/* === XONADON QISMI TUGADI === */}
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-1 md:space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewClient(client.id)}
                                    title="Ko'rish"
                                    disabled={viewLoading[client.id]}
                                  >
                                    {viewLoading[client.id] ? ( <span className="animate-pulse text-xs">...</span> ) : ( <Eye className="h-4 w-4" /> )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditDialog(client)}
                                    title="Tahrirlash"
                                    disabled={editLoading[client.id]}
                                  >
                                     {editLoading[client.id] ? ( <span className="animate-pulse text-xs">...</span> ) : ( <Edit className="h-4 w-4" /> )}
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

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between mt-4 space-y-2 sm:space-y-0">
                      <div className="text-sm text-muted-foreground">
                        Jami {totalClients} ta mijozdan {startIndex + 1} - {Math.min(endIndex, totalClients)} ko‘rsatilmoqda.
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrevPage}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {/* Page Numbers (Optimallashtirish mumkin, masalan, faqat bir nechta raqam ko'rsatish) */}
                        {/* Kichik ekranlar uchun oddiyroq pagination ko'rsatish */}
                        <span className="text-sm">
                           Sahifa {currentPage} / {totalPages}
                        </span>
                        {/* Katta ekranlar uchun batafsil pagination
                        <div className="hidden md:flex space-x-1">
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
                        */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Apartments View Dialog */}
        <Dialog open={apartmentsOpen} onOpenChange={setApartmentsOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{selectedClient?.name}ning xonadonlari</DialogTitle>
              <DialogDescription>
                Mijozga biriktirilgan xonadonlar ro‘yxati.
              </DialogDescription>
            </DialogHeader>
            {apartmentsLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-muted-foreground">Xonadonlar yuklanmoqda...</p>
              </div>
            ) : selectedClientApartments.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-muted-foreground">
                  Bu mijozga xonadon biriktirilmagan.
                </p>
              </div>
            ) : (
              <div className="rounded-md border max-h-[400px] overflow-y-auto"> {/* Added scroll */}
                <Table>
                  <TableHeader className="sticky top-0 bg-background"> {/* Sticky header */}
                    <TableRow>
                      <TableHead className="w-[50px]">No</TableHead>
                      <TableHead>Xonadon raqami</TableHead>
                      <TableHead>Obyekt nomi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedClientApartments.map((apartment, index) => (
                      <TableRow key={apartment.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{apartment.room_number}</TableCell>
                        <TableCell>{apartment.object_name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setApartmentsOpen(false)}>Yopish</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Client Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>Mijozni tahrirlash</DialogTitle>
                <DialogDescription>Mijoz ma'lumotlarini yangilang</DialogDescription>
              </DialogHeader>
              {/* Tabs for edit form sections */}
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                   <TabsTrigger value="general">Umumiy</TabsTrigger>
                   <TabsTrigger value="additional">Qo'shimcha</TabsTrigger>
                   <TabsTrigger value="guarantor">Kafil</TabsTrigger>
                 </TabsList>
                 {/* General Edit Tab */}
                 <TabsContent value="general">
                   <div className="grid gap-4 py-4">
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label htmlFor="edit-phone_number">Telefon raqami *</Label>
                         <Input id="edit-phone_number" name="phone_number" value={editFormData.phone_number} onChange={handleEditChange} required />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="edit-fio">F.I.O. *</Label>
                         <Input id="edit-fio" name="fio" value={editFormData.fio} onChange={handleEditChange} required />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="edit-password">Yangi parol</Label>
                         <Input id="edit-password" name="password" type="password" value={editFormData.password} onChange={handleEditChange} placeholder="O'zgartirmasangiz bo'sh qoldiring"/>
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="edit-user_type">Foydalanuvchi turi *</Label>
                         <Input id="edit-user_type" name="user_type" value="Mijoz" disabled />
                       </div>
                     </div>
                   </div>
                 </TabsContent>
                 {/* Additional Edit Tab */}
                 <TabsContent value="additional">
                   <div className="grid gap-4 py-4">
                      <div className="space-y-2 col-span-2"> {/* Fixed grid layout */}
                         <Label htmlFor="edit-address">Manzil</Label>
                         <Input id="edit-address" name="address" value={editFormData.address} onChange={handleEditChange} />
                       </div>
                   </div>
                 </TabsContent>
                 {/* Guarantor Edit Tab */}
                 <TabsContent value="guarantor">
                   <div className="grid gap-4 py-4">
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label htmlFor="edit-kafil_fio">Kafil F.I.O.</Label>
                         <Input id="edit-kafil_fio" name="kafil_fio" value={editFormData.kafil_fio} onChange={handleEditChange} />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="edit-kafil_phone_number">Kafil telefon raqami</Label>
                         <Input id="edit-kafil_phone_number" name="kafil_phone_number" value={editFormData.kafil_phone_number} onChange={handleEditChange} />
                       </div>
                       <div className="space-y-2 col-span-2">
                         <Label htmlFor="edit-kafil_address">Kafil manzili</Label>
                         <Input id="edit-kafil_address" name="kafil_address" value={editFormData.kafil_address} onChange={handleEditChange} />
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
      </div> {/* End Main Content */}
    </div> // End Main Container
  );
}