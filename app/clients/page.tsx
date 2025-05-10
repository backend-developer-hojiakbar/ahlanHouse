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
  object_id: number; // Obyekt ID sini saqlash uchun
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

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [objects, setObjects] = useState<ObjectData[]>([]); // Obyektlar ro'yxati
  const [loading, setLoading] = useState(true);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [objectFilter, setObjectFilter] = useState("all"); // Obyekt filtri
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [apartmentsOpen, setApartmentsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClientApartments, setSelectedClientApartments] = useState<Apartment[]>([]);
  const [apartmentsLoading, setApartmentsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
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

  // Set isMounted to true only on the client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize accessToken on client-side only
  useEffect(() => {
    if (!isMounted) return;
    const token = localStorage.getItem("access_token");
    setAccessToken(token);
    if (token) {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        setUserType(payload.user_type);
      }
    }
  }, [isMounted]);

  const getAuthHeaders = () => ({
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  });

  // Obyektlarni olish
  const fetchObjects = async () => {
    if (!accessToken) return;

    setObjectsLoading(true);
    let allObjects: ObjectData[] = [];
    let nextUrl: string | null = "http://api.ahlan.uz/objects/?limit=100";

    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Obyektlarni olishda xatolik: ${response.statusText}`);
        }

        const data = await response.json();
        allObjects = [...allObjects, ...(data.results || [])];
        nextUrl = data.next;
      }
      setObjects(allObjects);
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "Obyektlarni olishda xatolik yuz berdi",
        variant: "destructive",
      });
      setObjects([]);
    } finally {
      setObjectsLoading(false);
    }
  };

  // Mijozning xonadonlarini olish
  const fetchClientApartments = async (clientId: number): Promise<Apartment[]> => {
    if (!accessToken) return [];

    setApartmentsLoading(true);
    let allPayments: any[] = [];
    let nextUrl: string | null = `http://api.ahlan.uz/payments/?user=${clientId}&limit=100`;

    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          if (response.status === 404) {
            console.warn(`User ${clientId} uchun to'lovlar topilmadi.`);
            setSelectedClientApartments([]);
            return [];
          }
          throw new Error(`To'lovlarni olishda xatolik (${clientId}): ${response.statusText}`);
        }

        const data = await response.json();
        allPayments = [...allPayments, ...(data.results || [])];
        nextUrl = data.next;
      }

      if (allPayments.length === 0) {
        setSelectedClientApartments([]);
        return [];
      }

      const uniqueApartmentIds = Array.from(new Set(allPayments.map((p) => p.apartment)));

      const apartments: Apartment[] = await Promise.all(
        uniqueApartmentIds.map(async (apartmentId: any) => {
          if (!apartmentId) return null;
          try {
            const apartmentResponse = await fetch(
              `http://api.ahlan.uz/apartments/${apartmentId}/`,
              {
                method: "GET",
                headers: getAuthHeaders(),
              }
            );

            if (!apartmentResponse.ok) {
              console.error(
                `Xonadon ${apartmentId} ma'lumotlarini olishda xatolik: ${apartmentResponse.statusText}`
              );
              return null;
            }
            const apartmentData = await apartmentResponse.json();
            // apartment_info dan xonalar sonini olish
            const roomsInfo = allPayments.find((p) => p.apartment === apartmentId)?.apartment_info || "";
            const roomsMatch = roomsInfo.match(/(\d+)\s*xonali/);
            const rooms = roomsMatch ? roomsMatch[1] : "Noma'lum";

            return {
              id: apartmentId,
              room_number: apartmentData.room_number || "N/A",
              object_name: apartmentData.object_name || "Noma'lum obyekt",
              object_id: apartmentData.object || 0, // Obyekt ID sini saqlash
              rooms: rooms,
            };
          } catch (error) {
            console.error(`Xonadon ${apartmentId} uchun fetch xatosi:`, error);
            return null;
          }
        })
      );

      const validApartments = apartments.filter((apt) => apt !== null) as Apartment[];
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
      if (isMounted) {
        router.push("/login");
      }
      return;
    }

    setLoading(true);
    let allFormattedClients: Client[] = [];
    let nextUrl: string | null = "http://api.ahlan.uz/users/?user_type=mijoz&limit=100";
    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          if (response.status === 401 && isMounted) {
            localStorage.removeItem("access_token");
            router.push("/login");
            throw new Error("Sessiya tugagan, qayta kirish kerak");
          }
          throw new Error(`Mijozlarni olishda xatolik: ${response.statusText}`);
        }

        const data = await response.json();
        const clientsList = data.results || [];

        const formattedClientsBatch: Client[] = await Promise.all(
          clientsList.map(async (client: any): Promise<Client> => {
            let clientApartments: Apartment[] = [];
            try {
              clientApartments = await fetchClientApartments(client.id);
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
              apartments: clientApartments,
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
      if (isMounted) {
        toast({
          title: "Xatolik",
          description: error.message || "Mijozlarni olishda xatolik yuz berdi",
          variant: "destructive",
        });
      }
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  // Mijoz yaratish
  const createClient = async (clientData: any) => {
    if (!accessToken) {
      if (isMounted) {
        toast({
          title: "Xatolik",
          description: "Avtorizatsiya tokeni topilmadi.",
          variant: "destructive",
        });
      }
      return;
    }

    try {
      const response = await fetch("http://api.ahlan.uz/users/", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...clientData, user_type: "mijoz" }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: `Server xatosi: ${response.statusText}`,
        }));
        let errorMessage = `Mijoz qo'shishda xatolik (${response.status}):`;
        if (typeof errorData === "object" && errorData !== null) {
          errorMessage +=
            "\n" +
            Object.entries(errorData)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
              .join("\n");
        } else {
          errorMessage += ` ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      if (isMounted) {
        hotToast.success("Yangi mijoz qo‘shildi", {
          position: "top-center",
        });
      }
      await fetchClients();
      setOpen(false);
      setCurrentPage(1);
    } catch (error: any) {
      if (isMounted) {
        toast({
          title: "Xatolik",
          description: error.message || "Mijoz qo'shishda noma'lum xatolik",
          variant: "destructive",
          className: "whitespace-pre-wrap max-w-md",
        });
      }
    }
  };

  // Mijozni yangilash
  const updateClient = async (id: number, clientData: any) => {
    if (!accessToken) {
      if (isMounted) {
        toast({
          title: "Xatolik",
          description: "Avtorizatsiya tokeni topilmadi.",
          variant: "destructive",
        });
      }
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
        const errorData = await response.json().catch(() => ({
          detail: `Server xatosi: ${response.statusText}`,
        }));
        let errorMessage = `Mijozni yangilashda xatolik (${response.status}):`;
        if (typeof errorData === "object" && errorData !== null) {
          errorMessage +=
            "\n" +
            Object.entries(errorData)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
              .join("\n");
        } else {
          errorMessage += ` ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      if (isMounted) {
        hotToast.success("Mijoz yangilandi", {
          position: "top-center",
        });
      }
      await fetchClients();
      setEditOpen(false);
    } catch (error: any) {
      if (isMounted) {
        toast({
          title: "Xatolik",
          description: error.message || "Mijozni yangilashda noma'lum xatolik",
          variant: "destructive",
          className: "whitespace-pre-wrap max-w-md",
        });
      }
    }
  };

  // Mijozni o'chirish
  const deleteClient = async (id: number) => {
    if (!accessToken) {
      if (isMounted) {
        toast({
          title: "Xatolik",
          description: "Avtorizatsiya tokeni topilmadi.",
          variant: "destructive",
        });
      }
      return;
    }
    if (!isMounted || !window.confirm("Haqiqatan ham bu mijozni o'chirmoqchimisiz?")) return;

    try {
      const response = await fetch(`http://api.ahlan.uz/users/${id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.status === 204) {
        if (isMounted) {
          hotToast.success("Mijoz o‘chirildi", {
            position: "top-center",
          });
        }
        const newClients = clients.filter((c) => c.id !== id);
        setClients(newClients);

        const totalClientsAfterDelete = newClients.length;
        const totalPagesAfterDelete = Math.ceil(totalClientsAfterDelete / clientsPerPage);

        if (currentPage > totalPagesAfterDelete && totalPagesAfterDelete > 0) {
          setCurrentPage(totalPagesAfterDelete);
        } else if (currentClients.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else if (totalClientsAfterDelete === 0) {
          setCurrentPage(1);
        }
      } else if (!response.ok) {
        let errorMessage = `Mijozni o'chirishda xatolik (${response.status}): ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData && typeof errorData === "object") {
            errorMessage = Object.entries(errorData)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
              .join("\n");
          }
        } catch (e) {
          /* Ignore if response is not JSON */
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      if (isMounted) {
        toast({
          title: "Xatolik",
          description: error.message || "Mijozni o'chirishda noma'lum xatolik",
          variant: "destructive",
          className: "whitespace-pre-wrap max-w-md",
        });
      }
    }
  };

  // Komponent yuklanganda va token o'zgarganda ma'lumotlarni olish
  useEffect(() => {
    if (!isMounted || accessToken === null) return;
    if (!accessToken) {
      toast({
        title: "Xatolik",
        description: "Tizimga kirish talab qilinadi",
        variant: "destructive",
      });
      router.push("/login");
      return;
    }
    fetchObjects();
    fetchClients();
  }, [accessToken, router, isMounted]);

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
  };

  // Tahrirlash formasini jo'natish
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

  // Tahrirlash dialogini ochish
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

  // Xonadonlar dialogini ochish
  const openApartmentsDialog = async (client: Client) => {
    setSelectedClient(client);
    setSelectedClientApartments([]);
    setApartmentsOpen(true);
    await fetchClientApartments(client.id);
  };

  // Mijozlarni qidiruv va obyekt bo'yicha filtrlaymiz
  const filteredClients = clients.filter((client) => {
    const searchTermLower = searchTerm.toLowerCase();
    const nameMatch = client.name.toLowerCase().includes(searchTermLower);
    const phoneMatch = client.phone.includes(searchTerm);

    const matchesSearch = searchTerm === "" || nameMatch || phoneMatch;

    // Obyekt bo'yicha filtr
    const matchesObject =
      objectFilter === "all" ||
      client.apartments.some((apt) => apt.object_id.toString() === objectFilter);

    return matchesSearch && matchesObject;
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

  // Filtrni tozalash
  const handleClearFilters = () => {
    setSearchTerm("");
    setObjectFilter("all");
    setCurrentPage(1);
  };

  // Render loading state until the component is mounted
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Toaster />
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
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="address">Manzil</Label>
                        <Input
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                        />
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

        {/* Main Card for Table and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Filters - Qidiruv va Obyekt filtri */}
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
                <Select
                  value={objectFilter}
                  onValueChange={(value) => {
                    setObjectFilter(value);
                    setCurrentPage(1);
                  }}
                  disabled={objectsLoading || objects.length === 0}
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
                    {objects.length === 0 && (
                      <p className="p-2 text-sm text-muted-foreground">Obyektlar topilmadi</p>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  disabled={searchTerm === "" && objectFilter === "all"}
                >
                  Filtrlarni tozalash
                </Button>
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
                            <TableCell colSpan={6} className="h-24 text-center">
                              {searchTerm || objectFilter !== "all"
                                ? "Tanlangan filtrlar bo'yicha mijozlar topilmadi."
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
                                {userType === 'admin' && (
                                  <div className="flex justify-end space-x-1 md:space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEditDialog(client)}
                                      title="Tahrirlash"
                                      disabled={editLoading[client.id]}
                                    >
                                      {editLoading[client.id] ? (
                                        <span className="animate-pulse text-xs">...</span>
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
                                )}
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
                        Jami {totalClients} ta mijozdan {startIndex + 1} -{" "}
                        {Math.min(endIndex, totalClients)} ko‘rsatilmoqda.
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
                      <TableHead>Xonalar soni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedClientApartments.map((apartment, index) => (
                      <TableRow key={apartment.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{apartment.room_number}</TableCell>
                        <TableCell>{apartment.object_name}</TableCell>
                        <TableCell>{apartment.rooms}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setApartmentsOpen(false)}>
                Yopish
              </Button>
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
                          placeholder="O'zgartirmasangiz bo'sh qoldiring"
                        />
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
                      <Input
                        id="edit-address"
                        name="address"
                        value={editFormData.address}
                        onChange={handleEditChange}
                      />
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
      <footer className="border-t py-4 px-4 text-center text-sm text-muted-foreground mt-auto">
                Version 1.0 | Barcha huquqlar ximoyalangan | Ushbu Dastur CDCGroup tomonidan yaratilgan | CraDev Company tomonidan qo'llab quvvatlanadi | since 2019
      </footer>
    </div>
  );
}