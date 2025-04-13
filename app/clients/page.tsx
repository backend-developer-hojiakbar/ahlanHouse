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
// Eye va apartmentFilter bilan bog'liq elementlar olib tashlandi
import { Plus, Edit, Trash, ChevronLeft, ChevronRight, Home } from "lucide-react";
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

// Xonadon interfeysi
interface Apartment {
  id: number;
  room_number: string;
  object_name: string;
}

// Mijoz interfeysi
interface Client {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  balance: number;
  apartments: Apartment[];
  kafil_fio: string | null;
  kafil_address: string | null;
  kafil_phone_number: string | null;
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  // apartmentFilter state olib tashlandi
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [apartmentsOpen, setApartmentsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClientApartments, setSelectedClientApartments] = useState<Apartment[]>([]);
  const [apartmentsLoading, setApartmentsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState<Record<number, boolean>>({});

  // Pagination
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

  // Mijozning xonadonlarini olish
  const fetchClientApartments = async (clientId: number): Promise<Apartment[]> => {
    if (!accessToken) return [];

    setApartmentsLoading(true);
    let allPayments: any[] = [];
    // API endpoint ni to'g'rilash kerak bo'lishi mumkin
    let nextUrl: string | null = `http://api.ahlan.uz/payments/?user=${clientId}&limit=100`; // User bo'yicha filtr va limit

    try {
        // To'g'ridan-to'g'ri user bo'yicha filtrlab so'rov yuborish
      while (nextUrl) {
          const response = await fetch(nextUrl, {
              method: "GET",
              headers: getAuthHeaders(),
          });

          if (!response.ok) {
              // Agar 404 (Not Found) qaytarsa, demak bu user uchun to'lov yo'q
              if (response.status === 404) {
                  console.warn(`User ${clientId} uchun to'lovlar topilmadi.`);
                  setSelectedClientApartments([]);
                  return [];
              }
              throw new Error(`To'lovlarni olishda xatolik (${clientId}): ${response.statusText}`);
          }

          const data = await response.json();
          allPayments = [...allPayments, ...(data.results || [])];
          nextUrl = data.next; // Keyingi sahifa uchun URL
      }

      // Agar to'lovlar topilmasa
      if (allPayments.length === 0) {
        setSelectedClientApartments([]);
        return [];
      }

      const uniqueApartmentIds = Array.from(new Set(allPayments.map(p => p.apartment)));

      const apartments: Apartment[] = await Promise.all(
        uniqueApartmentIds.map(async (apartmentId: any) => {
          if (!apartmentId) return null; // ID null bo'lsa o'tkazib yuborish
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
               return null;
            }
            const apartmentData = await apartmentResponse.json();
            return {
              id: apartmentId,
              room_number: apartmentData.room_number || "N/A",
              object_name: apartmentData.object_name || "Noma'lum obyekt",
            };
          } catch(error) {
             console.error(`Xonadon ${apartmentId} uchun fetch xatosi:`, error);
             return null;
          }
        })
      );

      const validApartments = apartments.filter(apt => apt !== null) as Apartment[];
      setSelectedClientApartments(validApartments);
      return validApartments;

    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "Mijoz xonadonlarini olishda xatolik yuz berdi",
        variant: "destructive",
      });
      setSelectedClientApartments([]);
      return [];
    } finally {
      setApartmentsLoading(false);
    }
  };

  // Mijozlarni olish
 const fetchClients = async () => {
    if (!accessToken) {
      console.warn("Access token not available.");
       if (typeof window !== 'undefined') {
         router.push("/login");
       }
       return;
    }

    setLoading(true);
    let allFormattedClients: Client[] = [];
    let nextUrl: string | null = "http://api.ahlan.uz/users/?user_type=mijoz&limit=100"; // Mijozlarni filtrlab olish va limit
    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          if (response.status === 401 && typeof window !== 'undefined') {
            // ... (sessiya tugaganligi haqida xabar)
            localStorage.removeItem("access_token");
            router.push("/login");
            throw new Error("Sessiya tugagan, qayta kirish kerak");
          }
          throw new Error(`Mijozlarni olishda xatolik: ${response.statusText}`);
        }

        const data = await response.json();
        const clientsList = data.results || [];

        // user_type bo'yicha filtr API darajasida qilinganligi uchun bu yerda kerak emas
        // const mijozClientsList = clientsList.filter( ... );

        const formattedClientsBatch: Client[] = await Promise.all(
          clientsList.map(async (client: any): Promise<Client> => {
            // Optimallashtirish: Xonadonlarni faqat dialog ochilganda yuklash
            // Hozircha eski logikani qoldiramiz, lekin kelajakda o'zgartirish mumkin
            let clientApartments: Apartment[] = [];
            try {
                // To'g'ridan-to'g'ri mijoz ID si bo'yicha to'lovlarni so'rash optimallashtirilgan
                clientApartments = await fetchClientApartments(client.id);
                // fetchClientApartments state ni yangilagani uchun bu yerda qayta set qilish shart emas
            } catch (error) {
                console.error(`Mijoz ${client.id} uchun xonadonlarni olishda xatolik: `, error);
                clientApartments = [];
            }

            return {
              id: client.id,
              name: client.fio || "Noma'lum",
              phone: client.phone_number || "Noma'lum",
              address: client.address || null,
              balance: Number(client.balance) || 0,
              apartments: clientApartments, // Yuklangan xonadonlar
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
    if (!accessToken) { toast({ title: "Xatolik", description: "Avtorizatsiya tokeni topilmadi.", variant: "destructive" }); return; }

    try {
      const response = await fetch("http://api.ahlan.uz/users/", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...clientData, user_type: "mijoz" }),
      });

       if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: `Server xatosi: ${response.statusText}` }));
            let errorMessage = `Mijoz qo'shishda xatolik (${response.status}):`;
            if (typeof errorData === 'object' && errorData !== null) {
                 errorMessage += "\n" + Object.entries(errorData)
                     .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                     .join('\n');
            } else {
                 errorMessage += ` ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

      toast({ title: "Muvaffaqiyat", description: "Yangi mijoz qo‘shildi" });
      await fetchClients(); // Ro'yxatni yangilash
      setOpen(false);
      setCurrentPage(1); // Yangi mijoz qo'shilganda birinchi sahifaga o'tish
    } catch (error: any) {
      toast({
         title: "Xatolik",
         description: error.message || "Mijoz qo'shishda noma'lum xatolik",
         variant: "destructive",
         className: "whitespace-pre-wrap max-w-md", // Xato xabarini to'liq ko'rsatish
        });
    }
  };

  // Mijozni yangilash
  const updateClient = async (id: number, clientData: any) => {
    if (!accessToken) { toast({ title: "Xatolik", description: "Avtorizatsiya tokeni topilmadi.", variant: "destructive" }); return; }

    const dataToSend = { ...clientData, user_type: "mijoz" };
    if (!dataToSend.password) delete dataToSend.password; // Parol bo'sh bo'lsa, yubormaslik

    try {
      const response = await fetch(`http://api.ahlan.uz/users/${id}/`, {
        method: "PUT", // yoki PATCH
        headers: getAuthHeaders(),
        body: JSON.stringify(dataToSend),
      });

        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ detail: `Server xatosi: ${response.statusText}` }));
             let errorMessage = `Mijozni yangilashda xatolik (${response.status}):`;
             if (typeof errorData === 'object' && errorData !== null) {
                  errorMessage += "\n" + Object.entries(errorData)
                      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                      .join('\n');
             } else {
                 errorMessage += ` ${response.statusText}`;
             }
             throw new Error(errorMessage);
         }

      toast({ title: "Muvaffaqiyat", description: "Mijoz yangilandi" });
      await fetchClients(); // Ro'yxatni yangilash
      setEditOpen(false);
    } catch (error: any) {
       toast({
         title: "Xatolik",
         description: error.message || "Mijozni yangilashda noma'lum xatolik",
         variant: "destructive",
         className: "whitespace-pre-wrap max-w-md", // Xato xabarini to'liq ko'rsatish
       });
    }
  };

  // Mijozni o'chirish
  const deleteClient = async (id: number) => {
    if (!accessToken) { toast({ title: "Xatolik", description: "Avtorizatsiya tokeni topilmadi.", variant: "destructive" }); return; }
    if (!window.confirm("Haqiqatan ham bu mijozni o'chirmoqchimisiz?")) return;

    try {
      const response = await fetch(`http://api.ahlan.uz/users/${id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.status === 204) {
        toast({ title: "Muvaffaqiyat", description: "Mijoz o‘chirildi" });
        // State dan darhol o'chirish
        const newClients = clients.filter(c => c.id !== id);
        setClients(newClients);

        // Paginationni to'g'rilash
        const totalClientsAfterDelete = newClients.length;
        const totalPagesAfterDelete = Math.ceil(totalClientsAfterDelete / clientsPerPage);

        // Agar joriy sahifa endi mavjud bo'lmasa (oxirgi sahifadagi yagona element o'chirilgan bo'lsa)
        if (currentPage > totalPagesAfterDelete && totalPagesAfterDelete > 0) {
          setCurrentPage(totalPagesAfterDelete);
        } else if (currentClients.length === 1 && currentPage > 1) {
            // Agar joriy sahifada faqat bitta element bo'lib, u o'chirilgan bo'lsa
            setCurrentPage(currentPage - 1);
        } else if (totalClientsAfterDelete === 0) {
            setCurrentPage(1); // Agar umuman mijoz qolmasa
        }
        // Agar o'sha sahifada boshqa elementlar bo'lsa, qayta fetch qilish shart emas
        // await fetchClients(); // Agar serverdan qayta yuklash zarur bo'lsa

      } else if (!response.ok) {
          let errorMessage = `Mijozni o'chirishda xatolik (${response.status}): ${response.statusText}`;
           try {
               const errorData = await response.json();
               if (errorData && typeof errorData === 'object') {
                   errorMessage = Object.entries(errorData)
                       .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                       .join('\n');
               }
           } catch (e) { /* Ignore if response is not JSON */ }
           throw new Error(errorMessage);
       }
    } catch (error: any) {
      toast({
         title: "Xatolik",
         description: error.message || "Mijozni o'chirishda noma'lum xatolik",
         variant: "destructive",
         className: "whitespace-pre-wrap max-w-md", // Xato xabarini to'liq ko'rsatish
       });
    }
  };

  // Komponent yuklanganda va token o'zgarganda mijozlarni olish
  useEffect(() => {
    if (accessToken === null) return; // Hali token yuklanmagan bo'lsa kutish
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
  }, [accessToken, router]); // accessToken o'zgarganda fetch qilish

  // Input o'zgarishlarini boshqarish
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
    // Formani tozalash (agar muvaffaqiyatli bo'lsa, createClient ichida bajarilishi mumkin)
    // setFormData({ fio: "", phone_number: "", password: "", user_type: "mijoz", address: "", balance: "0.0", kafil_fio: "", kafil_address: "", kafil_phone_number: "" });
  };

  // Tahrirlash formasini jo'natish
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    const updatedClient = {
      fio: editFormData.fio,
      phone_number: editFormData.phone_number,
      password: editFormData.password || undefined, // Parol o'zgartirilmasa undefined
      address: editFormData.address || null,
      balance: parseFloat(editFormData.balance) || 0.0,
      kafil_fio: editFormData.kafil_fio || null,
      kafil_address: editFormData.kafil_address || null,
      kafil_phone_number: editFormData.kafil_phone_number || null,
    };
    updateClient(selectedClient.id, updatedClient);
  };

  // Tahrirlash dialogini ochish
  const openEditDialog = (client: Client) => {
    setEditLoading((prev) => ({ ...prev, [client.id]: true }));
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
    setEditLoading((prev) => ({ ...prev, [client.id]: false }));
  };

  // Xonadonlar dialogini ochish
  const openApartmentsDialog = async (client: Client) => {
    setSelectedClient(client);
    setSelectedClientApartments([]); // Eskisini tozalash
    setApartmentsOpen(true); // Dialog ochish
    await fetchClientApartments(client.id); // Xonadonlarni yuklash
  };

  // Mijozlarni qidiruv bo'yicha filtrlaymiz
  const filteredClients = clients.filter((client) => {
    const searchTermLower = searchTerm.toLowerCase();
    const nameMatch = client.name.toLowerCase().includes(searchTermLower);
    const phoneMatch = client.phone.includes(searchTerm);

    // apartmentMatch olib tashlandi
    return searchTerm === "" || nameMatch || phoneMatch;
  });

  // Pagination hisob-kitoblari
  const totalClients = filteredClients.length;
  const totalPages = Math.ceil(totalClients / clientsPerPage);
  const startIndex = (currentPage - 1) * clientsPerPage;
  const endIndex = startIndex + clientsPerPage;
  const currentClients = filteredClients.slice(startIndex, endIndex);

  // Pagination funksiyalari
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
          {/* Yangi mijoz qo'shish dialogi */}
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
                  <DialogDescription>
                    Yangi mijoz ma'lumotlarini kiriting
                  </DialogDescription>
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
                  <TabsContent value="additional">
                    <div className="grid gap-4 py-4">
                       <div className="space-y-2 col-span-2">
                          <Label htmlFor="address">Manzil</Label>
                          <Input id="address" name="address" value={formData.address} onChange={handleChange} />
                        </div>
                    </div>
                  </TabsContent>
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
              {/* Filters - Faqat qidiruv qoldi */}
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <Input
                  placeholder="Mijozlarni qidirish (FIO yoki telefon)..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} // Qidiruvda 1-sahifaga o'tish
                  className="max-w-sm"
                />
                {/* Xonadon raqami bo'yicha filtr inputi olib tashlandi */}
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
                          <TableHead>Xonadon</TableHead>
                          <TableHead className="text-right">Amallar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentClients.length === 0 ? (
                          <TableRow>
                             {/* Colspan 6 ga o'zgartirildi, chunki bitta ustun kamaydi */}
                            <TableCell colSpan={6} className="h-24 text-center">
                              {searchTerm
                                ? `"${searchTerm}" bo'yicha mijozlar topilmadi.` // Xabar soddalashtirildi
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
                              <TableCell>
                                {client.apartments && client.apartments.length > 0 ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openApartmentsDialog(client)}
                                  >
                                    <Home className="h-4 w-4 mr-2" />
                                    Xonadonlarni ko‘rish ({client.apartments.length})
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">
                                    Xonadon biriktirilmagan
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-1 md:space-x-2">
                                  {/* Ko'rish tugmasi yo'q */}
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
                        <span className="text-sm">
                           Sahifa {currentPage} / {totalPages}
                        </span>
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
              <div className="rounded-md border max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
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
                 <TabsContent value="additional">
                   <div className="grid gap-4 py-4">
                      <div className="space-y-2 col-span-2">
                         <Label htmlFor="edit-address">Manzil</Label>
                         <Input id="edit-address" name="address" value={editFormData.address} onChange={handleEditChange} />
                       </div>
                   </div>
                 </TabsContent>
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