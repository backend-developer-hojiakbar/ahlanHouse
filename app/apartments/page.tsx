"use client";

import { useState, useEffect } from "react";
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

const ALL_STATUSES = [
  { value: "bosh", label: "Bo'sh" },
  { value: "band", label: "Band" },
  { value: "sotilgan", label: "Sotilgan" },
  { value: "muddatli", label: "Muddatli" },
  { value: "ipoteka", label: "Ipoteka" },
  { value: "subsidiya", label: "Subsidiya" },
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

export default function ApartmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyIdParam = searchParams.get("propertyId");

  const [apartments, setApartments] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
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
    property: propertyIdParam || "",
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<any | null>(null);
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

  const getAuthHeaders = () => ({
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  });

  const fetchProperties = async () => {
    if (!accessToken) return;

    let allProperties: any[] = [];
    let currentPage = 1;
    const pageSize = 20;
    let totalPages = 1;

    try {
      while (currentPage <= totalPages) {
        const url = `${API_BASE_URL}/objects/?page=${currentPage}&page_size=${pageSize}`;
        const response = await fetch(url, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Obyektlarni olishda xatolik (${response.status})`);
        }

        const data = await response.json();
        allProperties = [...allProperties, ...(data.results || data)];
        totalPages = Math.ceil(data.count / pageSize);
        currentPage += 1;
      }

      setProperties(allProperties);
    } catch (error) {
      toast({
        title: "Xatolik",
        description: (error as Error).message || "Obyektlarni yuklashda xatolik.",
        variant: "destructive",
      });
    }
  };

  const fetchApartments = async () => {
    if (!accessToken) return;

    setLoading(true);
    let allApartments: any[] = [];
    let currentPage = 1;
    let totalPages = 1;
    const pageSize = 1000;

    try {
      while (currentPage <= totalPages) {
        let url = `${API_BASE_URL}/apartments/`;
        const queryParams = new URLSearchParams();

        if (filters.status && filters.status !== "all") queryParams.append("status", filters.status);
        if (filters.rooms && filters.rooms !== "all") queryParams.append("rooms", filters.rooms);
        if (filters.minPrice) queryParams.append("price__gte", filters.minPrice);
        if (filters.maxPrice) queryParams.append("price__lte", filters.maxPrice);
        if (filters.minArea) queryParams.append("area__gte", filters.minArea);
        if (filters.maxArea) queryParams.append("area__lte", filters.maxArea);
        if (filters.floor && filters.floor !== "all") queryParams.append("floor", filters.floor);
        if (filters.search) queryParams.append("search", filters.search);
        if (filters.property && filters.property !== "all") {
          queryParams.append("object", filters.property);
        }
        if (propertyIdParam && !filters.property) {
          queryParams.append("object", propertyIdParam);
        }

        queryParams.append("page", currentPage.toString());
        queryParams.append("page_size", pageSize.toString());

        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`;
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
          throw new Error(`Xonadonlarni olishda xatolik (${response.status})`);
        }

        const data = await response.json();
        let tempApartments = [...(data.results || data)];

        const detailFetchPromises = tempApartments.map(async (apartment: any) => {
          let payment = null;

          const paymentResponse = await fetch(
            `${API_BASE_URL}/payments/?apartment=${apartment.id}&ordering=-created_at`,
            { method: "GET", headers: getAuthHeaders() }
          );
          if (paymentResponse.ok) {
            const paymentData = await paymentResponse.json();
            if (paymentData.results && paymentData.results.length > 0) {
              payment = paymentData.results[0];
            }
          }

          let objectName = apartment.object_name || "Noma'lum obyekt";
          if (!apartment.object_name && apartment.object) {
            const objectId = typeof apartment.object === "object" ? apartment.object.id : apartment.object;
            const objectResponse = await fetch(`${API_BASE_URL}/objects/${objectId}/`, {
              method: "GET",
              headers: getAuthHeaders(),
            });
            if (objectResponse.ok) {
              const objectData = await objectResponse.json();
              objectName = objectData.name || "Noma'lum obyekt";
            }
          }

          return {
            ...apartment,
            object_name: objectName,
            payment,
          };
        });

        const detailedApartments = await Promise.all(detailFetchPromises);
        allApartments = [...allApartments, ...detailedApartments];
        totalPages = Math.ceil(data.count / pageSize);
        currentPage += 1;
      }

      allApartments.sort((a, b) => {
        if (a.object === b.object) {
          return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
        }
        return a.object - b.object;
      });

      setApartments(allApartments);
    } catch (error) {
      toast({
        title: "Xatolik",
        description: (error as Error).message || "Xonadonlarni yuklashda xatolik.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteApartment = async (id: number) => {
    if (!accessToken) return;
    if (!window.confirm("Haqiqatan ham bu xonadonni o‘chirmoqchimisiz?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/apartments/${id}/`, {
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
        throw new Error(`Xonadonni o‘chirishda xatolik (${response.status})`);
      }

      toast({
        title: "Muvaffaqiyat",
        description: "Xonadon muvaffaqiyatli o‘chirildi.",
      });
      fetchApartments();
    } catch (error) {
      toast({
        title: "Xatolik",
        description: (error as Error).message || "Xonadonni o‘chirishda xatolik.",
        variant: "destructive",
      });
    }
  };

  const updateApartment = async () => {
    if (!accessToken || !selectedApartment) return;

    try {
      const response = await fetch(`${API_BASE_URL}/apartments/${selectedApartment.id}/`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          room_number: editForm.room_number,
          rooms: editForm.rooms,
          area: editForm.area,
          floor: editForm.floor,
          price: editForm.price,
          status: editForm.status,
          object: editForm.object || selectedApartment.object,
        }),
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
        throw new Error(`Xonadonni yangilashda xatolik (${response.status})`);
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
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchProperties();
      fetchApartments();
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken && properties.length > 0) {
      fetchApartments();
    }
  }, [filters, propertyIdParam, accessToken, properties]);

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value === "all" ? "" : value,
    }));
  };

  const openEditModal = (apartment: any) => {
    setSelectedApartment(apartment);
    setEditForm({
      room_number: apartment.room_number || "",
      rooms: apartment.rooms || "",
      area: apartment.area || "",
      floor: apartment.floor || "",
      price: apartment.price || "",
      status: apartment.status || "",
      object: apartment.object || "",
    });
    setEditModalOpen(true);
  };

  const handleEditFormChange = (name: string, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getStatusBadge = (status: string, paymentType?: string) => {
    if (paymentType === "muddatli") {
      return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Muddatli</Badge>;
    }
    switch (status?.toLowerCase()) {
      case "bosh":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Bo'sh</Badge>;
      case "band":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Band</Badge>;
      case "sotilgan":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Sotilgan</Badge>;
      case "ipoteka":
        return <Badge className="bg-purple-500 hover:bg-purple-600 text-white">Ipoteka</Badge>;
      case "subsidiya":
        return <Badge className="bg-teal-500 hover:bg-teal-600 text-white">Subsidiya</Badge>;
      default:
        return <Badge variant="secondary">{status || "Noma'lum"}</Badge>;
    }
  };

  const getPaymentTypeLabel = (paymentType: string) => {
    switch (paymentType?.toLowerCase()) {
      case "naqd":
        return "Naqd (To‘liq)";
      case "muddatli":
        return "Muddatli to‘lov";
      case "ipoteka":
        return "Ipoteka";
      case "subsidiya":
        return "Subsidiya";
      case "band":
        return "Band qilish";
      default:
        return paymentType || "Noma'lum";
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("us-US", { minimumFractionDigits: 0 }) + " $";
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-5">
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
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 20 }).map((_, i) => (
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
                        <span>Band: {new Date(apartment.reservation_date).toLocaleDateString("uz-UZ")}</span>
                      </div>
                    )}
                    {apartment.payment && (
                      <div className="space-y-1 text-xs text-muted-foreground max-h-20 overflow-hidden">
                        <div className="flex items-center">
                          <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                          <span className="truncate">To‘lov turi: {getPaymentTypeLabel(apartment.payment.payment_type)}</span>
                        </div>
                        {apartment.payment.payment_type === "naqd" && (
                          <div className="truncate">
                            <span>Jami to‘langan: {formatCurrency(Number(apartment.payment.total_amount))}</span>
                          </div>
                        )}
                        {apartment.payment.payment_type === "muddatli" && (
                          <div className="space-y-1">
                            <div className="truncate">
                              <span>Boshlang‘ich: {formatCurrency(Number(apartment.payment.initial_payment))}</span>
                            </div>
                            <div className="truncate">
                              <span>Oylik: {formatCurrency(Number(apartment.payment.monthly_payment))}</span>
                            </div>
                            <div className="truncate">
                              <span>Qolgan: {formatCurrency(Number(apartment.payment.total_amount) - Number(apartment.payment.paid_amount))}</span>
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
                            deleteApartment(apartment.id);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> O‘chirish
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="default"
                        variant="destructive"
                        className="w-full font-semibold rounded-md shadow-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteApartment(apartment.id);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> O‘chirish
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
    </div>
  );
} 