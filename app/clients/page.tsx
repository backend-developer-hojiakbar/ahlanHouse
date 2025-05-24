"use client";

import { useState, useEffect, useCallback } from "react"; // useCallback qo'shildi
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
import { Toaster, toast as hotToast } from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Xonadon interfeysi
interface Apartment {
  id: number;
  room_number: string;
  object_name: string;
  object_id: number;
  rooms?: string;
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

// Obyekt interfeysi
interface ObjectData {
  id: number;
  name: string;
}

// Foydalanuvchi ma'lumotlari uchun interfeys (avvalgi sahifalardan)
interface CurrentUser {
  fio: string;
  user_type: 'admin' | 'sotuvchi' | 'buxgalter' | 'mijoz' | string;
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [objects, setObjects] = useState<ObjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [objectFilter, setObjectFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [apartmentsOpen, setApartmentsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClientApartments, setSelectedClientApartments] = useState<Apartment[]>([]);
  const [apartmentsLoading, setApartmentsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  // const [userType, setUserType] = useState<string | null>(null); // O'RNIGA currentUser ISHLATILADI
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null); // QO'SHILDI
  const [editLoading, setEditLoading] = useState<Record<number, boolean>>({});

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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const token = localStorage.getItem("access_token");
    setAccessToken(token);
    if (token) {
      const userTypeFromStorage = localStorage.getItem("user_type");
      const userFioFromStorage = localStorage.getItem("user_fio");

      if (userTypeFromStorage && userFioFromStorage) {
        setCurrentUser({
          user_type: userTypeFromStorage as CurrentUser['user_type'],
          fio: userFioFromStorage,
        });
      } else {
        console.warn("Foydalanuvchi user_type yoki fio localStorage da topilmadi.");
        setCurrentUser(null);
        // Agar login kerak bo'lsa:
        // hotToast.error("Foydalanuvchi ma'lumotlari topilmadi. Iltimos, qayta kiring.");
        // router.push("/login");
      }
    } else {
        // Token yo'q bo'lsa login'ga yo'naltirish
        // hotToast.error("Avtorizatsiya qilinmagan. Tizimga kiring.");
        // router.push("/login");
    }
  }, [isMounted, router]);

  // Sezgir amallar uchun ruxsatni tekshirish funksiyasi
  const canPerformSensitiveActions = useCallback((user: CurrentUser | null): boolean => {
    if (!user) {
      return false;
    }
    const isRestrictedRole = user.user_type === 'sotuvchi' || user.user_type === 'buxgalter';
    const hasSardorInFio = user.fio.toLowerCase().includes('sardor');

    if (isRestrictedRole || hasSardorInFio) {
      return false;
    }
    return true;
  }, []);

  const getAuthHeaders = useCallback(() => ({ // useCallback qo'shildi
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  }), [accessToken]);

  const fetchObjects = useCallback(async () => { // useCallback qo'shildi
    if (!accessToken) return;
    setObjectsLoading(true);
    let allObjects: ObjectData[] = [];
    let nextUrl: string | null = "http://api.ahlan.uz/objects/?limit=100"; // limitni oshirish mumkin

    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          method: "GET",
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error(`Obyektlarni olishda xatolik: ${response.statusText}`);
        const data = await response.json();
        allObjects = [...allObjects, ...(data.results || [])];
        nextUrl = data.next;
      }
      setObjects(allObjects);
    } catch (error: any) {
      if (isMounted) toast({ title: "Xatolik", description: error.message || "Obyektlarni olishda xatolik", variant: "destructive" });
      setObjects([]);
    } finally {
      setObjectsLoading(false);
    }
  }, [accessToken, getAuthHeaders, isMounted]);

  const fetchClientApartments = useCallback(async (clientId: number): Promise<Apartment[]> => { // useCallback qo'shildi
    if (!accessToken) return [];
    setApartmentsLoading(true);
    let allPayments: any[] = [];
    let nextUrl: string | null = `http://api.ahlan.uz/payments/?user=${clientId}&limit=100`;

    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, { method: "GET", headers: getAuthHeaders() });
        if (!response.ok) {
          if (response.status === 404) return [];
          throw new Error(`To'lovlarni olishda xatolik (${clientId}): ${response.statusText}`);
        }
        const data = await response.json();
        allPayments = [...allPayments, ...(data.results || [])];
        nextUrl = data.next;
      }
      if (allPayments.length === 0) return [];

      const uniqueApartmentIds = Array.from(new Set(allPayments.map((p) => p.apartment).filter(id => id != null)));

      const apartmentsPromises = uniqueApartmentIds.map(async (apartmentId: any) => {
        try {
          const aptResponse = await fetch(`http://api.ahlan.uz/apartments/${apartmentId}/`, { headers: getAuthHeaders() });
          if (!aptResponse.ok) return null;
          const aptData = await aptResponse.json();
          const roomsInfo = allPayments.find((p) => p.apartment === apartmentId)?.apartment_info || "";
          const roomsMatch = roomsInfo.match(/(\d+)\s*xonali/);
          return {
            id: apartmentId,
            room_number: aptData.room_number || "N/A",
            object_name: aptData.object_name || "Noma'lum obyekt",
            object_id: aptData.object || 0,
            rooms: roomsMatch ? roomsMatch[1] : "Noma'lum",
          };
        } catch (error) { return null; }
      });
      const apartments = (await Promise.all(apartmentsPromises)).filter(apt => apt !== null) as Apartment[];
      // setSelectedClientApartments(apartments); // Bu yerda emas, openApartmentsDialog ichida
      return apartments;
    } catch (error: any) {
      if (isMounted) toast({ title: "Xatolik", description: error.message || "Mijoz xonadonlarini olishda xatolik", variant: "destructive" });
      return [];
    } finally {
      setApartmentsLoading(false);
    }
  }, [accessToken, getAuthHeaders, isMounted]);

  const fetchClients = useCallback(async () => { // useCallback qo'shildi
    if (!accessToken) {
      if (isMounted) router.push("/login");
      return;
    }
    setLoading(true);
    let allFormattedClients: Client[] = [];
    let nextUrl: string | null = "http://api.ahlan.uz/users/?user_type=mijoz&limit=100";
    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, { method: "GET", headers: getAuthHeaders() });
        if (!response.ok) {
          if (response.status === 401 && isMounted) {
            localStorage.removeItem("access_token");
            setCurrentUser(null); // Foydalanuvchini tozalash
            router.push("/login");
          }
          throw new Error(`Mijozlarni olishda xatolik: ${response.statusText}`);
        }
        const data = await response.json();
        const clientsList = data.results || [];

        const formattedClientsBatchPromises = clientsList.map(async (client: any): Promise<Client> => {
          const clientApartments = await fetchClientApartments(client.id);
          return {
            id: client.id,
            name: client.fio || "Noma'lum",
            phone: client.phone_number || "Noma'lum",
            address: client.address || null,
            balance: Number(client.balance) || 0,
            apartments: clientApartments,
            kafil_fio: client.kafil_fio || null,
            kafil_address: client.kafil_address || null,
            kafil_phone_number: client.kafil_phone_number || null,
          };
        });
        const formattedClientsBatch = await Promise.all(formattedClientsBatchPromises);
        allFormattedClients = [...allFormattedClients, ...formattedClientsBatch];
        nextUrl = data.next;
      }
      setClients(allFormattedClients);
    } catch (error: any) {
      if (isMounted) toast({ title: "Xatolik", description: error.message || "Mijozlarni olishda xatolik", variant: "destructive" });
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, getAuthHeaders, isMounted, router, fetchClientApartments]);

  useEffect(() => {
    if (!isMounted || accessToken === null) return;
    if (!accessToken) {
      if (isMounted) {
        toast({ title: "Xatolik", description: "Tizimga kirish talab qilinadi", variant: "destructive" });
        router.push("/login");
      }
      return;
    }
    fetchObjects();
    fetchClients();
  }, [accessToken, isMounted, router, fetchObjects, fetchClients]); // fetchObjects va fetchClients qo'shildi

  const createClient = async (clientData: any) => {
    if (!accessToken) {
      if (isMounted) toast({ title: "Xatolik", description: "Avtorizatsiya tokeni topilmadi.", variant: "destructive" });
      return;
    }
    // Mijoz qo'shish uchun cheklov yo'q
    try {
      const response = await fetch("http://api.ahlan.uz/users/", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...clientData, user_type: "mijoz" }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `Server xatosi: ${response.statusText}` }));
        throw new Error(Object.entries(errorData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n") || response.statusText);
      }
      if (isMounted) hotToast.success("Yangi mijoz qo‘shildi", { position: "top-center" });
      await fetchClients();
      setOpen(false);
      setCurrentPage(1); // Birinchi sahifaga o'tish
    } catch (error: any) {
      if (isMounted) toast({ title: "Xatolik", description: error.message || "Mijoz qo'shishda xatolik", variant: "destructive", className: "whitespace-pre-wrap max-w-md" });
    }
  };

  const updateClient = async (id: number, clientData: any) => {
    if (!canPerformSensitiveActions(currentUser)) { // Cheklov
        if (isMounted) hotToast.error("Bu amalni bajarish uchun sizda ruxsat yo'q.", {position: "top-center"});
        return;
    }
    if (!accessToken) {
      if (isMounted) toast({ title: "Xatolik", description: "Avtorizatsiya tokeni topilmadi.", variant: "destructive" });
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
        const errorData = await response.json().catch(() => ({ detail: `Server xatosi: ${response.statusText}` }));
        throw new Error(Object.entries(errorData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n") || response.statusText);
      }
      if (isMounted) hotToast.success("Mijoz yangilandi", { position: "top-center" });
      await fetchClients();
      setEditOpen(false);
    } catch (error: any) {
      if (isMounted) toast({ title: "Xatolik", description: error.message || "Mijozni yangilashda xatolik", variant: "destructive", className: "whitespace-pre-wrap max-w-md" });
    }
  };

  const deleteClient = async (id: number) => {
    if (!canPerformSensitiveActions(currentUser)) { // Cheklov
        if (isMounted) hotToast.error("Bu amalni bajarish uchun sizda ruxsat yo'q.", {position: "top-center"});
        return;
    }
    if (!accessToken) {
      if (isMounted) toast({ title: "Xatolik", description: "Avtorizatsiya tokeni topilmadi.", variant: "destructive" });
      return;
    }
    if (!isMounted || !window.confirm("Haqiqatan ham bu mijozni o'chirmoqchimisiz?")) return;

    try {
      const response = await fetch(`http://api.ahlan.uz/users/${id}/`, { method: "DELETE", headers: getAuthHeaders() });
      if (response.status === 204) {
        if (isMounted) hotToast.success("Mijoz o‘chirildi", { position: "top-center" });
        const newClients = clients.filter((c) => c.id !== id);
        setClients(newClients);
        // Paginationni to'g'irlash
        const totalAfterDelete = newClients.length;
        const newTotalPages = Math.ceil(totalAfterDelete / clientsPerPage);
        if (currentPage > newTotalPages && newTotalPages > 0) setCurrentPage(newTotalPages);
        else if (currentClients.length === 1 && currentPage > 1 && totalAfterDelete > 0) setCurrentPage(currentPage - 1);
        else if (totalAfterDelete === 0) setCurrentPage(1);

      } else if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(Object.entries(errorData).map(([k,v])=>`${k}: ${v}`).join("\n") || response.statusText);
      }
    } catch (error: any) {
      if (isMounted) toast({ title: "Xatolik", description: error.message || "Mijozni o'chirishda xatolik", variant: "destructive", className: "whitespace-pre-wrap max-w-md" });
    }
  };

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
    createClient({
      fio: formData.fio,
      phone_number: formData.phone_number,
      password: formData.password,
      address: formData.address || null,
      balance: parseFloat(formData.balance) || 0.0,
      kafil_fio: formData.kafil_fio || null,
      kafil_address: formData.kafil_address || null,
      kafil_phone_number: formData.kafil_phone_number || null,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    updateClient(selectedClient.id, {
      fio: editFormData.fio,
      phone_number: editFormData.phone_number,
      password: editFormData.password || undefined,
      address: editFormData.address || null,
      balance: parseFloat(editFormData.balance) || 0.0,
      kafil_fio: editFormData.kafil_fio || null,
      kafil_address: editFormData.kafil_address || null,
      kafil_phone_number: editFormData.kafil_phone_number || null,
    });
  };

  const openEditDialog = (client: Client) => {
    if (!canPerformSensitiveActions(currentUser)) { // Cheklov
        if (isMounted) hotToast.error("Bu amalni bajarish uchun sizda ruxsat yo'q.", {position: "top-center"});
        return;
    }
    setEditLoading((prev) => ({ ...prev, [client.id]: true })); // Buni o'chirib qo'ysa ham bo'ladi, agar ishlatilmayotgan bo'lsa
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

  const openApartmentsDialog = async (client: Client) => {
    setSelectedClient(client);
    setSelectedClientApartments([]); // Eski ma'lumotlarni tozalash
    setApartmentsOpen(true);
    // fetchClientApartments allaqachon apartmentsLoading'ni boshqaradi
    const apartments = await fetchClientApartments(client.id);
    setSelectedClientApartments(apartments); // Yangi ma'lumotlarni o'rnatish
  };

  const filteredClients = clients.filter((client) => {
    const searchTermLower = searchTerm.toLowerCase();
    const nameMatch = client.name.toLowerCase().includes(searchTermLower);
    const phoneMatch = client.phone.includes(searchTerm);
    const matchesSearch = searchTerm === "" || nameMatch || phoneMatch;
    const matchesObject = objectFilter === "all" || client.apartments.some((apt) => apt.object_id.toString() === objectFilter);
    return matchesSearch && matchesObject;
  });

  const totalClients = filteredClients.length;
  const totalPages = Math.ceil(totalClients / clientsPerPage);
  const startIndex = (currentPage - 1) * clientsPerPage;
  const endIndex = startIndex + clientsPerPage;
  const currentClients = filteredClients.slice(startIndex, endIndex);

  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  const handleClearFilters = () => { setSearchTerm(""); setObjectFilter("all"); setCurrentPage(1); };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Toaster />
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="flex h-16 items-center px-4 container mx-auto">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav />
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6 container mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 mb-6">
          <h2 className="text-3xl font-bold tracking-tight">Mijozlar</h2>
          {/* Yangi mijoz qo'shish tugmasi hamma uchun ochiq */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Yangi mijoz qo'shish</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                <DialogHeader><DialogTitle>Yangi mijoz qo'shish</DialogTitle><DialogDescription>Yangi mijoz ma'lumotlarini kiriting</DialogDescription></DialogHeader>
                <div className="flex-1 overflow-y-auto py-4 pr-2">
                    <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="general">Umumiy</TabsTrigger>
                        <TabsTrigger value="additional">Qo'shimcha</TabsTrigger>
                        <TabsTrigger value="guarantor">Kafil</TabsTrigger>
                    </TabsList>
                    <TabsContent value="general" className="mt-4">
                        <div className="grid gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5"><Label htmlFor="phone_number">Telefon raqami *</Label><Input id="phone_number" name="phone_number" value={formData.phone_number} onChange={handleChange} required /></div>
                            <div className="space-y-1.5"><Label htmlFor="fio">F.I.O. *</Label><Input id="fio" name="fio" value={formData.fio} onChange={handleChange} required /></div>
                            <div className="space-y-1.5"><Label htmlFor="password">Parol *</Label><Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required /></div>
                            <div className="space-y-1.5"><Label htmlFor="user_type">Foydalanuvchi turi</Label><Input id="user_type" name="user_type" value="Mijoz" disabled className="bg-muted/50" /></div>
                        </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="additional" className="mt-4">
                        <div className="grid gap-4">
                        <div className="space-y-1.5 col-span-2"><Label htmlFor="address">Manzil</Label><Input id="address" name="address" value={formData.address} onChange={handleChange}/></div>
                        </div>
                    </TabsContent>
                    <TabsContent value="guarantor" className="mt-4">
                        <div className="grid gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5"><Label htmlFor="kafil_fio">Kafil F.I.O.</Label><Input id="kafil_fio" name="kafil_fio" value={formData.kafil_fio} onChange={handleChange}/></div>
                            <div className="space-y-1.5"><Label htmlFor="kafil_phone_number">Kafil telefon raqami</Label><Input id="kafil_phone_number" name="kafil_phone_number" value={formData.kafil_phone_number} onChange={handleChange}/></div>
                            <div className="space-y-1.5 col-span-full"><Label htmlFor="kafil_address">Kafil manzili</Label><Input id="kafil_address" name="kafil_address" value={formData.kafil_address} onChange={handleChange}/></div>
                        </div>
                        </div>
                    </TabsContent>
                    </Tabs>
                </div>
                <DialogFooter className="pt-4 border-t mt-auto">
                  <Button type="button" variant="outline" onClick={()=> setOpen(false)}>Bekor qilish</Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">Saqlash</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <Input placeholder="Mijozlarni qidirish (FIO yoki telefon)..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="max-w-sm"/>
                <Select value={objectFilter} onValueChange={(value) => { setObjectFilter(value); setCurrentPage(1); }} disabled={objectsLoading || objects.length === 0}>
                  <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Obyekt bo‘yicha" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barcha Obyektlar</SelectItem>
                    {objects.map((obj) => (<SelectItem key={obj.id} value={obj.id.toString()}>{obj.name}</SelectItem>))}
                    {objectsLoading && <div className="p-2 text-sm text-muted-foreground">Obyektlar yuklanmoqda...</div>}
                    {!objectsLoading && objects.length === 0 && <div className="p-2 text-sm text-muted-foreground">Obyektlar topilmadi</div>}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleClearFilters} disabled={searchTerm === "" && objectFilter === "all"}>Filtrlarni tozalash</Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-[300px] border rounded-md"><p className="text-muted-foreground">Mijozlar yuklanmoqda...</p></div>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">ID</TableHead>
                          <TableHead>F.I.O.</TableHead>
                          <TableHead>Telefon</TableHead>
                          <TableHead>Manzil</TableHead>
                          <TableHead className="w-[200px]">Xonadonlar</TableHead>
                          {/* Amallar ustuni faqat ruxsat bo'lsa ko'rsatiladi */}
                          {canPerformSensitiveActions(currentUser) && <TableHead className="text-right w-[100px]">Amallar</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentClients.length === 0 ? (
                          <TableRow><TableCell colSpan={canPerformSensitiveActions(currentUser) ? 6 : 5} className="h-24 text-center text-muted-foreground">{searchTerm || objectFilter !== "all" ? "Filtrga mos mijozlar topilmadi." : "Mijozlar mavjud emas."}</TableCell></TableRow>
                        ) : (
                          currentClients.map((client) => (
                            <TableRow key={client.id}>
                              <TableCell>{client.id}</TableCell>
                              <TableCell className="font-medium">{client.name}</TableCell>
                              <TableCell>{client.phone}</TableCell>
                              <TableCell className="max-w-[200px] truncate" title={client.address || ""}>{client.address || "-"}</TableCell>
                              <TableCell>
                                {client.apartments && client.apartments.length > 0 ? (
                                  <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => openApartmentsDialog(client)}>
                                    <Home className="h-4 w-4 mr-1 text-sky-600" /> Ko‘rish ({client.apartments.length})
                                  </Button>
                                ) : (<span className="text-xs text-muted-foreground italic">Yo'q</span>)}
                              </TableCell>
                              {/* Tahrirlash/O'chirish tugmalari faqat ruxsat bo'lsa ko'rsatiladi */}
                              {canPerformSensitiveActions(currentUser) && (
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-1">
                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(client)} title="Tahrirlash" disabled={editLoading[client.id]}>
                                      {editLoading[client.id] ? <span className="animate-pulse text-xs">...</span> : <Edit className="h-4 w-4 text-yellow-500" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => deleteClient(client.id)} title="O'chirish" className="hover:text-red-700">
                                      <Trash className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between mt-4 space-y-2 sm:space-y-0">
                      <div className="text-sm text-muted-foreground">Jami {totalClients} mijozdan {startIndex + 1}-{Math.min(endIndex, totalClients)} ko‘rsatilmoqda.</div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4 mr-1" />Oldingi</Button>
                        <span className="text-sm">Sahifa {currentPage}/{totalPages}</span>
                        <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>Keyingi<ChevronRight className="h-4 w-4 ml-1" /></Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog open={apartmentsOpen} onOpenChange={setApartmentsOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
            <DialogHeader><DialogTitle>{selectedClient?.name}ning xonadonlari</DialogTitle><DialogDescription>Mijozga biriktirilgan xonadonlar ro‘yxati.</DialogDescription></DialogHeader>
            <div className="flex-1 overflow-y-auto pr-2">
                {apartmentsLoading ? (
                <div className="flex items-center justify-center h-[200px]"><p className="text-muted-foreground">Xonadonlar yuklanmoqda...</p></div>
                ) : selectedClientApartments.length === 0 ? (
                <div className="py-4 text-center"><p className="text-muted-foreground">Bu mijozga xonadon biriktirilmagan.</p></div>
                ) : (
                <div className="rounded-md border">
                    <Table>
                    <TableHeader className="sticky top-0 bg-muted z-10"><TableRow><TableHead className="w-[50px]">ID</TableHead><TableHead>Xonadon #</TableHead><TableHead>Obyekt</TableHead><TableHead>Xonalar</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {selectedClientApartments.map((apartment) => (
                        <TableRow key={apartment.id}><TableCell>{apartment.id}</TableCell><TableCell>{apartment.room_number}</TableCell><TableCell>{apartment.object_name}</TableCell><TableCell>{apartment.rooms}</TableCell></TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </div>
                )}
            </div>
            <DialogFooter className="pt-4 border-t mt-auto"><Button variant="outline" onClick={() => setApartmentsOpen(false)}>Yopish</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
            <form onSubmit={handleEditSubmit} className="flex-1 flex flex-col">
              <DialogHeader><DialogTitle>Mijozni tahrirlash</DialogTitle><DialogDescription>Mijoz ma'lumotlarini yangilang</DialogDescription></DialogHeader>
              <div className="flex-1 overflow-y-auto py-4 pr-2">
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general">Umumiy</TabsTrigger>
                    <TabsTrigger value="additional">Qo'shimcha</TabsTrigger>
                    <TabsTrigger value="guarantor">Kafil</TabsTrigger>
                  </TabsList>
                  <TabsContent value="general" className="mt-4">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label htmlFor="edit-phone_number">Telefon raqami *</Label><Input id="edit-phone_number" name="phone_number" value={editFormData.phone_number} onChange={handleEditChange} required /></div>
                        <div className="space-y-1.5"><Label htmlFor="edit-fio">F.I.O. *</Label><Input id="edit-fio" name="fio" value={editFormData.fio} onChange={handleEditChange} required /></div>
                        <div className="space-y-1.5"><Label htmlFor="edit-password">Yangi parol</Label><Input id="edit-password" name="password" type="password" value={editFormData.password} onChange={handleEditChange} placeholder="O'zgartirmasangiz bo'sh qoldiring"/></div>
                        <div className="space-y-1.5"><Label htmlFor="edit-user_type">Foydalanuvchi turi</Label><Input id="edit-user_type" name="user_type" value="Mijoz" disabled className="bg-muted/50"/></div>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="additional" className="mt-4">
                    <div className="grid gap-4">
                      <div className="space-y-1.5 col-span-2"><Label htmlFor="edit-address">Manzil</Label><Input id="edit-address" name="address" value={editFormData.address} onChange={handleEditChange}/></div>
                    </div>
                  </TabsContent>
                  <TabsContent value="guarantor" className="mt-4">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label htmlFor="edit-kafil_fio">Kafil F.I.O.</Label><Input id="edit-kafil_fio" name="kafil_fio" value={editFormData.kafil_fio} onChange={handleEditChange}/></div>
                        <div className="space-y-1.5"><Label htmlFor="edit-kafil_phone_number">Kafil telefon raqami</Label><Input id="edit-kafil_phone_number" name="kafil_phone_number" value={editFormData.kafil_phone_number} onChange={handleEditChange}/></div>
                        <div className="space-y-1.5 col-span-full"><Label htmlFor="edit-kafil_address">Kafil manzili</Label><Input id="edit-kafil_address" name="kafil_address" value={editFormData.kafil_address} onChange={handleEditChange}/></div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              <DialogFooter className="pt-4 border-t mt-auto">
                <Button type="button" variant="outline" onClick={()=> setEditOpen(false)}>Bekor qilish</Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">O'zgarishlarni saqlash</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
      <footer className="border-t py-4 text-center text-sm text-muted-foreground mt-auto bg-background">
        <div className="container mx-auto">
             Version 1.1 | Barcha huquqlar himoyalangan | Ahlan Group LLC © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}