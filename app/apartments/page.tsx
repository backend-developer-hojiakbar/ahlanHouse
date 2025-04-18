"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, useSearchParams } from "next/navigation";
import { Home, Calendar, Plus, Trash2, Edit, CreditCard } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Toaster, toast as hotToast } from "react-hot-toast";

const ALL_STATUSES = [
  { value: "bosh", label: "Bo'sh" },
  { value: "band", label: "Band" },
  { value: "sotilgan", label: "Sotilgan" },
  { value: "muddatli", label: "Muddatli" },
];

const ALL_ROOM_OPTIONS = [
  { value: "1", label: "1 xona" },
  { value: "2", label: "2 xona" },
  { value: "3", label: "3 xona" },
  { value: "4", label: "4 xona" },
];

const ALL_FLOOR_OPTIONS = Array.from({ length: 16 }, (_, i) => ({
  value: (i + 1).toString(),
  label: `${i + 1}-qavat`,
}));

interface Apartment {
  id: number;
  room_number: string;
  rooms: number;
  area: number;
  floor: number;
  price: number;
  status: string;
  object: number | { id: number; name: string };
  object_name: string;
  reservation_date?: string;
  payment?: {
    payment_type: string;
    total_amount: number;
    initial_payment: number;
    monthly_payment: number;
    paid_amount: number;
  };
}

export default function ApartmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyIdParam = searchParams.get("propertyId") || "";

  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [properties, setProperties] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "",
    rooms: "",
    minPrice: "",
    maxPrice: "",
    minArea: "",
    maxArea: "",
    floor: "",
    search: "",
    property: propertyIdParam,
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [apartmentToDelete, setApartmentToDelete] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    room_number: "",
    rooms: "",
    area: "",
    floor: "",
    price: "",
    status: "",
    object: "",
  });

  const API_BASE_URL = "http://api.ahlan.uz";

  // Autentifikatsiya tokenini olish
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast({
          title: "Xatolik",
          description: "Avtorizatsiya qilinmagan. Iltimos, tizimga kiring.",
          variant: "destructive",
        });
        router.push("/login");
      } else {
        setAccessToken(token);
      }
    }
  }, [router]);

  // Auth headers
  const getAuthHeaders = useCallback(
    () => ({
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    }),
    [accessToken]
  );

  // Obyektlarni yuklash
  const fetchProperties = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/objects/?page_size=100`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Obyektlarni olishda xatolik (${response.status})`);
      }

      const data = await response.json();
      setProperties(data.results || []);
    } catch (error) {
      toast({
        title: "Xatolik",
        description: (error as Error).message || "Obyektlarni yuklashda xatolik.",
        variant: "destructive",
      });
    }
  }, [accessToken, getAuthHeaders]);

  // Xonadonlarni yuklash
  const fetchApartments = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      let url = `${API_BASE_URL}/apartments/`;
      const queryParams = new URLSearchParams();

      // Filtrlarni qo'shish
      if (filters.property && filters.property !== "all") {
        queryParams.append("object", filters.property);
      } else if (propertyIdParam && filters.property !== "all") {
        queryParams.append("object", propertyIdParam);
      }
      if (filters.rooms && filters.rooms !== "all") queryParams.append("rooms", filters.rooms);
      if (filters.minPrice) queryParams.append("price__gte", filters.minPrice);
      if (filters.maxPrice) queryParams.append("price__lte", filters.maxPrice);
      if (filters.minArea) queryParams.append("area__gte", filters.minArea);
      if (filters.maxArea) queryParams.append("area__lte", filters.maxArea);
      if (filters.floor && filters.floor !== "all") queryParams.append("floor", filters.floor);
      if (filters.search) queryParams.append("search", filters.search);

      // Status filtrini APIga yuborish
      if (filters.status && filters.status !== "all" && filters.status !== "") {
        if (filters.status.toLowerCase() === "sotilgan") {
          queryParams.append("status__in", "paid,sotilgan");
          console.log("Status filtri qo'shildi (paid,sotilgan):", filters.status);
        } else {
          queryParams.append("status", filters.status.toLowerCase());
          console.log("Status filtri qo'shildi:", filters.status);
        }
      }

      queryParams.append("page_size", "1000");

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
        console.log("API so'rovi URL:", url);
      } else {
         console.log("API so'rovi URL (filtrsiz):", url);
      }

      const response = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("access_token");
          setAccessToken(null);
          toast({
            title: "Sessiya tugadi",
            description: "Iltimos, tizimga qayta kiring.",
            variant: "destructive",
          });
          router.push("/login");
          return;
        }
         const errorData = await response.text();
         console.error("API xato javobi:", errorData);
        throw new Error(`Xonadonlarni olishda xatolik (${response.status})`);
      }

      const data = await response.json();
      let tempApartments = data.results || [];

       // Har bir xonadon uchun to'lov ma'lumotlari va obyekt nomini olish
       const detailFetchPromises = tempApartments.map(async (apartment: any) => {
        let payment = null;
        try {
          const paymentUrl = `${API_BASE_URL}/payments/?apartment=${apartment.id}&ordering=-created_at`;
          const paymentResponse = await fetch(paymentUrl, { method: "GET", headers: getAuthHeaders() });
          if (paymentResponse.ok) {
            const paymentData = await paymentResponse.json();
            if (paymentData.results && paymentData.results.length > 0) {
              payment = paymentData.results[0];
            }
          } else {
             console.warn(`Xonadon ${apartment.id} uchun to'lov ma'lumotlarini olishda javob xatoligi (${paymentResponse.status})`);
          }
        } catch (error) {
          console.warn(`Xonadon ${apartment.id} uchun to'lov ma'lumotlarini olishda xatolik:`, error);
        }
         let objectName = apartment.object_name || "Noma'lum obyekt";
         const currentProperties = properties;
         if (!apartment.object_name && apartment.object) {
           const objectId = typeof apartment.object === "object" ? apartment.object.id : apartment.object;
           const foundProperty = currentProperties.find(p => p.id === objectId);
           if (foundProperty) {
             objectName = foundProperty.name;
           } else {
            try {
                const objectResponse = await fetch(`${API_BASE_URL}/objects/${objectId}/`, { method: "GET", headers: getAuthHeaders() });
                if (objectResponse.ok) {
                  const objectData = await objectResponse.json();
                  objectName = objectData.name || "Noma'lum obyekt";
                } else {
                    console.warn(`Obyekt nomini olishda javob xatoligi (ID: ${objectId}, Status: ${objectResponse.status})`);
                }
            } catch (error) {
                console.warn(`Obyekt nomini olishda xatolik (ID: ${objectId}):`, error);
            }
           }
         }

         // API statusini frontend uchun normallashtirish
         const originalApiStatus = apartment.status; // Asl statusni saqlab qolamiz (agar kerak bo'lsa)
         const displayStatus = originalApiStatus?.toLowerCase() === 'paid' ? 'sotilgan' : originalApiStatus;

         return {
           ...apartment,
           status: displayStatus, // Frontendda ishlatish uchun normallashtirilgan status
           originalStatus: originalApiStatus, // Asl API statusini ham saqlashimiz mumkin
           object_name: objectName,
           payment,
           reservation_date: apartment.reserved_until,
         };
       });

       let detailedApartments = await Promise.all(detailFetchPromises);

       // --- YANGI QO'SHILGAN CLIENT-SIDE FILTER ---
       // Agar "Sotilgan" filtri tanlangan bo'lsa, API natijasini qo'shimcha filtrlaymiz
       if (filters.status.toLowerCase() === 'sotilgan') {
         console.log("Client-side 'Sotilgan' filtrini qo'llash...");
         detailedApartments = detailedApartments.filter(apt =>
           apt.status.toLowerCase() === 'sotilgan' // Faqat normallashtirilgan statusi 'sotilgan' bo'lganlarni qoldiramiz
         );
       }
       // ------------------------------------------

       // Tartiblash
       const currentPropertiesForSort = properties;
       detailedApartments = detailedApartments.sort((a, b) => {
            const aObject = typeof a.object === 'object' ? a.object.id : a.object;
            const bObject = typeof b.object === 'object' ? b.object.id : b.object;
            const aObjectName = currentPropertiesForSort.find(p => p.id === aObject)?.name || a.object_name || '';
            const bObjectName = currentPropertiesForSort.find(p => p.id === bObject)?.name || b.object_name || '';
            const objectNameComparison = aObjectName.localeCompare(bObjectName);
            if (objectNameComparison !== 0) return objectNameComparison;
            const roomNumA = parseInt(a.room_number.replace(/[^0-9]/g, ''), 10) || 0;
            const roomNumB = parseInt(b.room_number.replace(/[^0-9]/g, ''), 10) || 0;
            if (roomNumA !== roomNumB) return roomNumA - roomNumB;
            return a.room_number.localeCompare(b.room_number);
        });


      setApartments(detailedApartments);
    } catch (error) {
      toast({
        title: "Xatolik",
        description: (error as Error).message || "Xonadonlarni yuklashda xatolik.",
        variant: "destructive",
      });
      console.error("Xonadonlarni yuklash xatosi:", error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, filters, propertyIdParam, getAuthHeaders, router, properties]);

  // Xonadonni o'chirish
  const confirmDeleteApartment = useCallback(async () => {
    if (!accessToken || !apartmentToDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/apartments/${apartmentToDelete}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("access_token");
          setAccessToken(null);
          toast({
            title: "Sessiya tugadi",
            description: "Iltimos, tizimga qayta kiring.",
            variant: "destructive",
          });
          router.push("/login");
          return;
        }
        throw new Error(`Xonadonni o'chirishda xatolik (${response.status})`);
      }

      hotToast.success("Muvaffaqiyatli o'chirildi", {
        position: "top-right",
      });
      fetchApartments();
    } catch (error) {
      toast({
        title: "Xatolik",
        description: (error as Error).message || "Xonadonni o'chirishda xatolik.",
        variant: "destructive",
      });
    } finally {
      setDeleteModalOpen(false);
      setApartmentToDelete(null);
    }
  }, [accessToken, apartmentToDelete, fetchApartments, getAuthHeaders, router]);

  // Xonadonni yangilash
  const updateApartment = useCallback(async () => {
    if (!accessToken || !selectedApartment) return;

    try {
      const payload = {
        room_number: editForm.room_number,
        rooms: parseInt(editForm.rooms) || selectedApartment.rooms,
        area: parseFloat(editForm.area) || selectedApartment.area,
        floor: parseInt(editForm.floor) || selectedApartment.floor,
        price: parseFloat(editForm.price) || selectedApartment.price,
        // Tahrirlashda 'sotilgan' ni 'paid' ga o'girish (agar API shuni kutsa)
        status: editForm.status === 'sotilgan' ? 'paid' : (editForm.status || selectedApartment.status),
        object: parseInt(editForm.object) || (typeof selectedApartment.object === 'object' ? selectedApartment.object.id : selectedApartment.object),
      };

      const response = await fetch(`${API_BASE_URL}/apartments/${selectedApartment.id}/`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("access_token");
          setAccessToken(null);
          toast({
            title: "Sessiya tugadi",
            description: "Iltimos, tizimga qayta kiring.",
            variant: "destructive",
          });
          router.push("/login");
          return;
        }
         const errorData = await response.json().catch(() => ({ detail: "Server xatosi yoki javob JSON emas." }));
         throw new Error(`Xonadonni yangilashda xatolik (${response.status}): ${errorData.detail || JSON.stringify(errorData)}`);
      }

      toast({
        title: "Muvaffaqiyat",
        description: "Xonadon muvaffaqiyatli yangilandi.",
      });
      setEditModalOpen(false);
      fetchApartments();
    } catch (error) {
      toast({
        title: "Xatolik",
        description: (error as Error).message || "Xonadonni yangilashda xatolik.",
        variant: "destructive",
      });
       console.error("Yangilash xatosi:", error);
    }
  }, [accessToken, selectedApartment, editForm, fetchApartments, getAuthHeaders, router]);

  // 1. Faqat Obyektlarni yuklash uchun useEffect
  useEffect(() => {
    if (accessToken) {
      fetchProperties();
    }
  }, [accessToken, fetchProperties]);

  // 2. Xonadonlarni yuklash uchun useEffect (Filtrlar yoki token o'zgarganda)
  useEffect(() => {
    if (accessToken) {
      fetchApartments();
    }
  }, [accessToken, filters, propertyIdParam, fetchApartments]);

  // Filtr o'zgarishi
  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value === "all" ? "" : value,
    }));
  };

  // Tahrirlash modalini ochish
  const openEditModal = (apartment: Apartment) => {
    setSelectedApartment(apartment);
    setEditForm({
      room_number: apartment.room_number || "",
      rooms: apartment.rooms.toString() || "",
      area: apartment.area.toString() || "",
      floor: apartment.floor.toString() || "",
      price: apartment.price.toString() || "",
      // Modalda 'sotilgan' ko'rsatish, API 'paid' saqlasa ham
      status: apartment.status === 'paid' ? 'sotilgan' : apartment.status || "",
      object: (typeof apartment.object === "object" ? apartment.object.id : apartment.object).toString() || "",
    });
    setEditModalOpen(true);
  };

  // Tahrirlash formasi o'zgarishi
  const handleEditFormChange = (name: string, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Status badge
  const getStatusBadge = (status: string, paymentType?: string) => {
    // API dan kelgan 'paid' ni 'sotilgan' deb ko'rsatish
    const displayStatus = status?.toLowerCase() === 'paid' ? 'sotilgan' : status?.toLowerCase();

    // Muddatli to'lovni birinchi tekshirish (agar payment mavjud bo'lsa)
    if (paymentType === "muddatli") {
      return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Muddatli</Badge>;
    }

    switch (displayStatus) {
      case "bosh":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Bo'sh</Badge>;
      case "band":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Band</Badge>;
      case "sotilgan": // Endi 'paid' ham shu yerga tushadi
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Sotilgan</Badge>;
      case "pending": // API dan kelgan 'pending' holati uchun
         return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Kutilmoqda</Badge>; // Or "Muddatli"? Let's use "Kutilmoqda"
      case "muddatli": // Bu holat payment mavjud bo'lmaganda yoki boshqa sabab bilan kelishi mumkin
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Muddatli</Badge>;
      default:
        return <Badge variant="secondary">{status || "Noma'lum"}</Badge>;
    }
  };

  // To'lov turi etiketi
  const getPaymentTypeLabel = (paymentType: string) => {
    switch (paymentType?.toLowerCase()) {
      case "naqd":
        return "Naqd (To'liq)";
      case "muddatli":
        return "Muddatli to'lov";
      case "ipoteka":
        return "Ipoteka";
      case "subsidiya":
        return "Subsidiya";
      case "band":
        return "Band qilish";
      case "barter":
        return "Barter";
      default:
        return paymentType || "Noma'lum";
    }
  };

  // Valyuta formatlash
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("us-US", { minimumFractionDigits: 0 }) + " $";
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <Toaster />
      <div className="border-b bg-background">
        <div className="flex h-16 items-center px-4 md:px-6">
          <MainNav className="mx-6 hidden md:flex" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav />
          </div>
        </div>
      </div>

      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Xonadonlar</h2>
          <Link href="/apartments/add" passHref>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yangi xonadon
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="property">Obyekt</Label>
                <Select
                  value={filters.property || "all"}
                  onValueChange={(value) => handleFilterChange("property", value)}
                >
                  <SelectTrigger id="property">
                    <SelectValue placeholder="Barcha obyektlar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barcha obyektlar</SelectItem>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id.toString()}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rooms">Xonalar soni</Label>
                <Select
                  value={filters.rooms || "all"}
                  onValueChange={(value) => handleFilterChange("rooms", value)}
                >
                  <SelectTrigger id="rooms">
                    <SelectValue placeholder="Barcha xonalar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barcha xonalar</SelectItem>
                    {ALL_ROOM_OPTIONS.map((room) => (
                      <SelectItem key={room.value} value={room.value}>
                        {room.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="floor">Qavat</Label>
                <Select
                  value={filters.floor || "all"}
                  onValueChange={(value) => handleFilterChange("floor", value)}
                >
                  <SelectTrigger id="floor">
                    <SelectValue placeholder="Barcha qavatlar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barcha qavatlar</SelectItem>
                    {ALL_FLOOR_OPTIONS.map((floor) => (
                      <SelectItem key={floor.value} value={floor.value}>
                        {floor.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Holati</Label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) => handleFilterChange("status", value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Barcha holatlar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barcha holatlar</SelectItem>
                    {ALL_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i} className="min-h-[300px]">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="mt-4 pt-3 border-t">
                    <Skeleton className="h-9 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : apartments.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Filtrlarga mos xonadonlar topilmadi.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {apartments.map((apartment) => (
              <Card
                key={apartment.id}
                className="overflow-hidden transition-shadow duration-200 hover:shadow-lg cursor-pointer min-h-[300px] flex flex-col"
                onClick={() => router.push(`/apartments/${apartment.id}`)}
              >
                <CardContent className="p-4 space-y-2 flex-grow flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Uy raqami: {apartment.room_number || "N/A"}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {apartment.object_name || "Noma'lum obyekt"}
                      </p>
                    </div>
                    {getStatusBadge(apartment.status, apartment.payment?.payment_type)}
                  </div>

                  <div className="space-y-1 text-sm text-foreground flex-grow">
                    <div className="flex items-center">
                      <Home className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>
                        {apartment.rooms || "?"} xona, {apartment.area || "?"} m²,{" "}
                        {apartment.floor || "?"} - qavat
                      </span>
                    </div>
                    {apartment.status === "band" && apartment.reservation_date && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="mr-1.5 h-3.5 w-3.5" />
                        <span>
                          Band: {new Date(apartment.reservation_date).toLocaleDateString("uz-UZ")}
                        </span>
                      </div>
                    )}
                    {apartment.payment && (
                      <div className="space-y-1 text-xs text-muted-foreground max-h-20 overflow-hidden">
                        <div className="flex items-center">
                          <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                          <span className="truncate">
                            To'lov turi: {getPaymentTypeLabel(apartment.payment.payment_type)}
                          </span>
                        </div>
                        {apartment.payment.payment_type === "naqd" && (
                          <div className="truncate">
                            <span>
                              Jami to'langan: {formatCurrency(Number(apartment.payment.total_amount))}
                            </span>
                          </div>
                        )}
                        {["muddatli", "ipoteka"].includes(apartment.payment.payment_type) && (
                          <div className="space-y-1">
                            <div className="truncate">
                              <span>
                                Boshlang'ich: {formatCurrency(Number(apartment.payment.initial_payment))}
                              </span>
                            </div>
                            <div className="truncate">
                              <span>
                                Oylik: {formatCurrency(Number(apartment.payment.monthly_payment))}
                              </span>
                            </div>
                            <div className="truncate">
                              <span>
                                Qolgan: {formatCurrency(
                                  Number(apartment.payment.total_amount) -
                                    Number(apartment.payment.paid_amount)
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t">
                    {apartment.status === "bosh" ? (
                      <div className="flex space-x-2">
                        <Button
                          size="default"
                          className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-md shadow-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/apartments/${apartment.id}/reserve`);
                          }}
                        >
                          Band qilish
                        </Button>
                        <Button
                          size="default"
                          variant="destructive"
                          className="flex-1 font-semibold rounded-md shadow-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            setApartmentToDelete(apartment.id);
                            setDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> O'chirish
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="default"
                        variant="destructive"
                        className="w-full font-semibold rounded-md shadow-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          setApartmentToDelete(apartment.id);
                          setDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> O'chirish
                      </Button>
                    )}
                    <Button
                      size="default"
                      variant="outline"
                      className="w-full mt-2 font-semibold rounded-md shadow-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(apartment);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" /> Tahrirlash
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {selectedApartment && (
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xonadonni tahrirlash</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="room_number" className="text-right">
                  Xona raqami
                </Label>
                <Input
                  id="room_number"
                  value={editForm.room_number}
                  onChange={(e) => handleEditFormChange("room_number", e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="rooms" className="text-right">
                  Xonalar soni
                </Label>
                <Select
                  value={editForm.rooms}
                  onValueChange={(value) => handleEditFormChange("rooms", value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Xonalar sonini tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROOM_OPTIONS.map((room) => (
                      <SelectItem key={room.value} value={room.value}>
                        {room.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="area" className="text-right">
                  Maydoni (m²)
                </Label>
                <Input
                  id="area"
                  type="number"
                  value={editForm.area}
                  onChange={(e) => handleEditFormChange("area", e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="floor" className="text-right">
                  Qavat
                </Label>
                <Select
                  value={editForm.floor}
                  onValueChange={(value) => handleEditFormChange("floor", value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Qavatni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_FLOOR_OPTIONS.map((floor) => (
                      <SelectItem key={floor.value} value={floor.value}>
                        {floor.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  Narxi ($)
                </Label>
                <Input
                  id="price"
                  type="number"
                  value={editForm.price}
                  onChange={(e) => handleEditFormChange("price", e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Holati
                </Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => handleEditFormChange("status", value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Holatni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="object" className="text-right">
                  Obyekt
                </Label>
                <Select
                  value={editForm.object}
                  onValueChange={(value) => handleEditFormChange("object", value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Obyektni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id.toString()}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                Bekor qilish
              </Button>
              <Button onClick={updateApartment}>Saqlash</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xonadonni o'chirish</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Haqiqatan ham ushbu xonadonni o'chirmoqchimisiz?</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button variant="destructive" onClick={confirmDeleteApartment}>
              O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="border-t bg-muted/40 py-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          Version 1.0 | Barcha huquqlar ximoyalangan | Ushbu Dastur CDCGroup tomonidan yaratilgan | CraDev Company tomonidan qo'llab quvvatlanadi | since 2019
        </div>
      </footer>
    </div>
  );
}