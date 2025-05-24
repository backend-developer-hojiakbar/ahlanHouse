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
import {
    Home, Calendar, Plus, Trash2, Edit, CreditCard,
    LayoutGrid,
    List,
} from "lucide-react";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Toaster, toast as hotToast } from "react-hot-toast";

// Constants
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
const ITEMS_PER_PAGE = 24;

// Interfaces
interface Document {
  id: number;
  payment: number;
  document_type: string;
  docx_file?: string | null;
  pdf_file?: string | null;
  image?: string | null;
  created_at: string;
}
interface Payment {
  id: number;
  user: number;
  user_fio?: string;
  apartment: number;
  apartment_info?: string;
  payment_type: string;
  total_amount: number | string;
  initial_payment: number | string;
  monthly_payment: number | string;
  paid_amount: number | string;
  created_at: string;
}
interface OverduePayment {
  month: string;
  amount: number;
  due_date: string;
}
interface Apartment {
  id: number;
  room_number: string;
  rooms: number;
  area: number;
  floor: number;
  price: number | string;
  status: string;
  object: number | { id: number; name: string };
  object_name: string;
  reservation_date?: string;
  payment?: Payment | null;
  originalStatus?: string;
  calculatedTotalPaid?: number | null;
  calculatedRemaining?: number | null;
  calculatedTotalAmount?: number | null;
}
interface Client {
  id: number;
  fio: string;
  username?: string;
  phone_number?: string;
  user_type?: string;
}
interface ObjectData {
  id: number;
  name: string;
  total_apartments?: number;
  floors?: number;
  address?: string;
  description?: string;
  image?: string | null;
}

// Foydalanuvchi ma'lumotlari uchun interfeys
interface CurrentUser {
  fio: string;
  user_type: 'admin' | 'sotuvchi' | 'buxgalter' | 'mijoz' | string;
}


export default function ApartmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyIdParam = searchParams.get("propertyId") || "";

  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [properties, setProperties] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

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
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDebtorsModal, setShowDebtorsModal] = useState(false);
  const [debtors, setDebtors] = useState<Apartment[]>([]);

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
        }
      }
    }
  }, [router]);

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


  const getAuthHeaders = useCallback(
    () => ({
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    }),
    [accessToken]
  );

  const fetchProperties = useCallback(async () => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${API_BASE_URL}/objects/?page_size=1000`, {
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

  const fetchApartments = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/apartments/`;
      const queryParams = new URLSearchParams();

      if (filters.property && filters.property !== "all") queryParams.append("object", filters.property);
      else if (propertyIdParam && filters.property !== "all" && !filters.property) queryParams.append("object", propertyIdParam);
      if (filters.rooms && filters.rooms !== "all") queryParams.append("rooms", filters.rooms);
      if (filters.minPrice) queryParams.append("price__gte", filters.minPrice);
      if (filters.maxPrice) queryParams.append("price__lte", filters.maxPrice);
      if (filters.minArea) queryParams.append("area__gte", filters.minArea);
      if (filters.maxArea) queryParams.append("area__lte", filters.maxArea);
      if (filters.floor && filters.floor !== "all") queryParams.append("floor", filters.floor);
      if (filters.search) queryParams.append("search", filters.search);
      if (filters.status && filters.status !== "all" && filters.status !== "") {
        if (filters.status.toLowerCase() === "sotilgan") queryParams.append("status__in", "paid,sotilgan");
        else if (filters.status.toLowerCase() === "muddatli") queryParams.append("status__in", "paid,sotilgan,muddatli,ipoteka,subsidiya,pending");
        else queryParams.append("status", filters.status.toLowerCase());
      }
      queryParams.append("page_size", ITEMS_PER_PAGE.toString());
      queryParams.append("page", currentPage.toString());

      if (queryParams.toString()) url += `?${queryParams.toString()}`;

      const response = await fetch(url, { method: "GET", headers: getAuthHeaders() });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("access_token");
          setCurrentUser(null);
          setAccessToken(null);
          toast({ title: "Sessiya tugadi", description: "Iltimos, tizimga qayta kiring.", variant: "destructive" });
          router.push("/login");
          return;
        }
        throw new Error(`Xonadonlarni olishda xatolik (${response.status})`);
      }

      const data = await response.json();
      let tempApartments = data.results || [];
      setTotalPages(Math.ceil((data.count || 0) / ITEMS_PER_PAGE));

      const detailFetchPromises = tempApartments.map(async (apartment: any) => {
        let allPayments: Payment[] = [];
        let calculatedTotalPaid: number | null = 0;
        let calculatedRemaining: number | null = null;
        let calculatedTotalAmount: number | null = parseFloat(apartment.price as string) || 0;
        let primaryPayment: Payment | null = null;

        if (apartment.status?.toLowerCase() !== 'bosh') {
          try {
            const paymentUrl = `${API_BASE_URL}/payments/?apartment=${apartment.id}&ordering=created_at&page_size=500`;
            const paymentResponse = await fetch(paymentUrl, { method: "GET", headers: getAuthHeaders() });
            if (paymentResponse.ok) {
              const paymentData = await paymentResponse.json();
              allPayments = paymentData.results || [];
              if (allPayments.length > 0) {
                primaryPayment = allPayments[0];
                const firstPaymentTotal = parseFloat(primaryPayment.total_amount as string);
                if (!isNaN(firstPaymentTotal) && firstPaymentTotal > 0) calculatedTotalAmount = firstPaymentTotal;
                if (primaryPayment.user) {
                  try {
                    const userResponse = await fetch(`${API_BASE_URL}/users/${primaryPayment.user}/`, { method: 'GET', headers: getAuthHeaders() });
                    if (userResponse.ok) {
                      const userInfo = await userResponse.json();
                      primaryPayment.user_fio = userInfo.fio || userInfo.username || 'Noma\'lum';
                    }
                  } catch (error) {/* Mijoz ma'lumotini olishda xatolik */}
                }
                calculatedTotalPaid = allPayments.reduce((sum, p) => sum + (isNaN(parseFloat(p.paid_amount as string)) ? 0 : parseFloat(p.paid_amount as string)), 0);
                calculatedRemaining = (calculatedTotalAmount ?? 0) - (calculatedTotalPaid ?? 0);
              } else {
                calculatedTotalPaid = 0;
                calculatedRemaining = calculatedTotalAmount;
              }
            }
          } catch (error) {/* Xonadon uchun to'lovlarni olishda umumiy xatolik */}
        } else {
          calculatedTotalPaid = 0;
          calculatedRemaining = calculatedTotalAmount;
        }

        let objectName = apartment.object_name || "Noma'lum obyekt";
        if (!apartment.object_name && apartment.object && properties.length > 0) {
          const objectId = typeof apartment.object === "object" ? apartment.object.id : apartment.object;
          const foundProperty = properties.find(p => p.id === objectId);
          if (foundProperty) objectName = foundProperty.name;
        }
        const originalApiStatus = apartment.status;
        const displayStatus = originalApiStatus?.toLowerCase() === 'paid' ? 'sotilgan' : originalApiStatus;

        return {
          ...apartment,
          price: parseFloat(apartment.price as string) || 0,
          status: displayStatus,
          originalStatus: originalApiStatus,
          object_name: objectName,
          calculatedTotalPaid,
          calculatedRemaining,
          calculatedTotalAmount,
          payment: primaryPayment,
          reservation_date: apartment.reserved_until,
        };
      });
      let detailedApartments: Apartment[] = await Promise.all(detailFetchPromises);
      if (filters.status.toLowerCase() === 'muddatli') detailedApartments = detailedApartments.filter(apt => apt.payment?.payment_type.toLowerCase() === 'muddatli');
      else if (filters.status.toLowerCase() === 'sotilgan') detailedApartments = detailedApartments.filter(apt => apt.status.toLowerCase() === 'sotilgan');

      detailedApartments = detailedApartments.sort((a, b) => {
        const aObject = typeof a.object === 'object' ? a.object.id : a.object;
        const bObject = typeof b.object === 'object' ? b.object.id : b.object;
        const aObjectName = properties.find(p => p.id === aObject)?.name || a.object_name || '';
        const bObjectName = properties.find(p => p.id === bObject)?.name || b.object_name || '';
        const objectNameComparison = aObjectName.localeCompare(bObjectName);
        if (objectNameComparison !== 0) return objectNameComparison;
        const roomNumA = parseInt(a.room_number.replace(/[^0-9]/g, ''), 10) || 0;
        const roomNumB = parseInt(b.room_number.replace(/[^0-9]/g, ''), 10) || 0;
        if (roomNumA !== roomNumB) return roomNumA - roomNumB;
        return a.room_number.localeCompare(b.room_number);
      });
      setApartments(detailedApartments);
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message || "Xonadonlarni yuklashda xatolik.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [accessToken, filters, propertyIdParam, getAuthHeaders, router, properties, currentPage]);

  const confirmDeleteApartment = useCallback(async () => {
    if (!canPerformSensitiveActions(currentUser)) {
        hotToast.error("Bu amalni bajarish uchun sizda ruxsat yo'q.", {position: "top-center"});
        setDeleteModalOpen(false);
        return;
    }
    if (!accessToken || !apartmentToDelete) return;
    try {
      const response = await fetch(`${API_BASE_URL}/apartments/${apartmentToDelete}/`, { method: "DELETE", headers: getAuthHeaders() });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("access_token");
          setCurrentUser(null);
          setAccessToken(null);
          toast({ title: "Sessiya tugadi", description: "Iltimos, tizimga qayta kiring.", variant: "destructive" });
          router.push("/login");
          return;
        }
        throw new Error(`Xonadonni o'chirishda xatolik (${response.status})`);
      }
      hotToast.success("Muvaffaqiyatli o'chirildi", { position: "top-right" });
      fetchApartments();
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message || "Xonadonni o'chirishda xatolik.", variant: "destructive" });
    } finally {
      setDeleteModalOpen(false);
      setApartmentToDelete(null);
    }
  }, [accessToken, apartmentToDelete, fetchApartments, getAuthHeaders, router, currentUser]);

  const updateApartment = useCallback(async () => {
    if (!canPerformSensitiveActions(currentUser)) {
        hotToast.error("Bu amalni bajarish uchun sizda ruxsat yo'q.", {position: "top-center"});
        setEditModalOpen(false);
        return;
    }
    if (!accessToken || !selectedApartment) return;
    try {
      const payload = {
        room_number: editForm.room_number,
        rooms: parseInt(editForm.rooms) || selectedApartment.rooms,
        area: parseFloat(editForm.area) || selectedApartment.area,
        floor: parseInt(editForm.floor) || selectedApartment.floor,
        price: parseFloat(editForm.price) || parseFloat(selectedApartment.price as string),
        status: editForm.status === 'sotilgan' ? 'paid' : (editForm.status || selectedApartment.status),
        object: parseInt(editForm.object) || (typeof selectedApartment.object === "object" ? selectedApartment.object.id : selectedApartment.object),
      };
      const response = await fetch(`${API_BASE_URL}/apartments/${selectedApartment.id}/`, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("access_token");
          setCurrentUser(null);
          setAccessToken(null);
          toast({ title: "Sessiya tugadi", description: "Iltimos, tizimga qayta kiring.", variant: "destructive" });
          router.push("/login");
          return;
        }
        const errorData = await response.json().catch(() => ({ detail: "Server xatosi." }));
        throw new Error(`Xonadonni yangilashda xatolik (${response.status}): ${errorData.detail || JSON.stringify(errorData)}`);
      }
      toast({ title: "Muvaffaqiyat", description: "Xonadon muvaffaqiyatli yangilandi." });
      setEditModalOpen(false);
      fetchApartments();
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message || "Xonadonni yangilashda xatolik.", variant: "destructive" });
    }
  }, [accessToken, selectedApartment, editForm, fetchApartments, getAuthHeaders, router, currentUser]);

  useEffect(() => { if (accessToken) fetchProperties(); }, [accessToken, fetchProperties]);
  useEffect(() => { if (accessToken && (properties.length > 0 || !propertyIdParam)) fetchApartments(); }, [accessToken, filters, propertyIdParam, fetchApartments, properties, currentPage]);


  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value === "all" ? "" : value }));
    setCurrentPage(1);
  };

  const openEditModal = (apartment: Apartment) => {
    if (!canPerformSensitiveActions(currentUser)) {
        hotToast.error("Bu amalni bajarish uchun sizda ruxsat yo'q.", {position: "top-center"});
        return;
    }
    setSelectedApartment(apartment);
    setEditForm({
      room_number: apartment.room_number || "",
      rooms: apartment.rooms.toString() || "",
      area: apartment.area.toString() || "",
      floor: apartment.floor.toString() || "",
      price: (apartment.price as number).toString() || "",
      status: apartment.status === 'paid' ? 'sotilgan' : apartment.status || "",
      object: (typeof apartment.object === "object" ? apartment.object.id : apartment.object).toString() || "",
    });
    setEditModalOpen(true);
  };

  const handleEditFormChange = (name: string, value: string) => {
    setEditForm((prev) => {
      const updatedForm = { ...prev, [name]: value };
      if (name === 'area' && selectedApartment?.object_name) {
        const parsedArea = parseFloat(value);
        const objectInfo = properties.find(p => p.id.toString() === updatedForm.object);
        let pricePerSqM = 550;
        if (objectInfo && objectInfo.name.toLowerCase().includes("qorasaroy")) {
            pricePerSqM = 600;
        }
        if (!isNaN(parsedArea)) {
          updatedForm.price = (parsedArea * pricePerSqM).toString();
        } else {
          updatedForm.price = "";
        }
      }
      return updatedForm;
    });
  };

  const getStatusBadge = (status: string, paymentType?: string) => {
    const lowerStatus = status?.toLowerCase();
    if (paymentType?.toLowerCase() === "muddatli") return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Muddatli</Badge>;
    switch (lowerStatus) {
      case "bosh": return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Bo'sh</Badge>;
      case "band": return <Badge className="bg-red-500 hover:bg-red-600 text-white">Band</Badge>;
      case "sotilgan": return <Badge className="bg-green-500 hover:bg-green-600 text-white">Sotilgan</Badge>;
      case "pending": return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Kutilmoqda</Badge>;
      case "ipoteka": return <Badge className="bg-purple-500 hover:bg-purple-600 text-white">Ipoteka</Badge>;
      case "subsidiya": return <Badge className="bg-teal-500 hover:bg-teal-600 text-white">Subsidiya</Badge>;
      default: return <Badge variant="secondary">{status || "Noma'lum"}</Badge>;
    }
  };

  const getPaymentTypeLabel = (paymentType: string | undefined) => {
    switch (paymentType?.toLowerCase()) {
      case "naqd": return "Naqd (To'liq)";
      case "muddatli": return "Muddatli to'lov";
      case "ipoteka": return "Ipoteka";
      case "subsidiya": return "Subsidiya";
      case "band": return "Band qilish";
      case "barter": return "Barter";
      default: return paymentType || "Noma'lum";
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount == null || isNaN(Number(amount))) return "-";
    return Number(amount).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 }).replace('$', '') + ' $';
  };

  const toggleViewMode = () => setViewMode((prevMode) => (prevMode === "grid" ? "table" : "grid"));

  const renderApartmentTable = (apartmentsToRender: Apartment[]) => {
    const showSensitiveControls = canPerformSensitiveActions(currentUser);
    return (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] text-center">#</TableHead>
                  <TableHead className="w-[100px] min-w-[100px]">Obyekt</TableHead>
                  <TableHead className="w-[70px]">Xona</TableHead>
                  <TableHead className="w-[60px]">Qavat</TableHead>
                  <TableHead className="w-[70px]">Xonalar</TableHead>
                  <TableHead className="w-[90px]">Maydon (m²)</TableHead>
                  <TableHead className="w-[110px] text-right">Jami Narx ($)</TableHead>
                  <TableHead className="w-[100px]">Holati</TableHead>
                  <TableHead className="w-[120px]">To'lov Turi</TableHead>
                  <TableHead className="w-[110px] text-right">Qoldiq ($)</TableHead>
                  {showSensitiveControls && <TableHead className="w-[100px] text-right">Amallar</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {apartmentsToRender.length === 0 ? (
                  <TableRow><TableCell colSpan={showSensitiveControls ? 11 : 10} className="h-24 text-center">Xonadonlar topilmadi.</TableCell></TableRow>
                ) : (
                  apartmentsToRender.map((apartment, index) => {
                    const remainingAmount = apartment.calculatedRemaining;
                    const displayTotalAmount = apartment.calculatedTotalAmount ?? apartment.price;
                    const isBosh = apartment.status?.toLowerCase() === 'bosh';
                    return (
                      <TableRow key={apartment.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/apartments/${apartment.id}`)}>
                        <TableCell className="text-center font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                        <TableCell className="text-xs truncate max-w-[100px]" title={apartment.object_name || "Noma'lum obyekt"}>{apartment.object_name || "Noma'lum obyekt"}</TableCell>
                        <TableCell className="font-medium">{apartment.room_number}</TableCell>
                        <TableCell>{apartment.floor}</TableCell>
                        <TableCell>{apartment.rooms}</TableCell>
                        <TableCell>{apartment.area}</TableCell>
                        <TableCell className="text-right">{formatCurrency(displayTotalAmount)}</TableCell>
                        <TableCell>{getStatusBadge(apartment.status, apartment.payment?.payment_type)}</TableCell>
                        <TableCell>{apartment.payment ? getPaymentTypeLabel(apartment.payment.payment_type) : isBosh ? '-' : 'N/A'}</TableCell>
                        <TableCell className={`text-right ${remainingAmount !== null && remainingAmount < 0 ? 'text-orange-600' : remainingAmount !== null && remainingAmount > 0 ? 'text-red-600' : ''}`}>{isBosh || remainingAmount === null ? '-' : formatCurrency(remainingAmount)}</TableCell>
                        {showSensitiveControls && (
                            <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditModal(apartment); }} title="Tahrirlash" disabled={loading}><Edit className="h-4 w-4 text-yellow-500" /></Button>
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setApartmentToDelete(apartment.id); setDeleteModalOpen(true); }} title="O'chirish" disabled={loading}><Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" /></Button>
                            </div>
                            </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const handlePageChange = (page: number) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <Dialog open={showDebtorsModal} onOpenChange={setShowDebtorsModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>Qarzdorlar ro'yxati</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Card><CardContent className="pt-4"><div className="text-sm font-medium">Umumiy qarzdorlar</div><div className="text-2xl font-bold">{debtors.length}</div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-sm font-medium">Umumiy summa</div><div className="text-2xl font-bold text-blue-600">{formatCurrency(debtors.reduce((sum, apt) => sum + (apt.calculatedTotalAmount ?? 0), 0))}</div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-sm font-medium">To'langan summa</div><div className="text-2xl font-bold text-green-600">{formatCurrency(debtors.reduce((sum, apt) => sum + (apt.calculatedTotalPaid ?? 0), 0))}</div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-sm font-medium">Qoldiq summa</div><div className="text-2xl font-bold text-red-600">{formatCurrency(debtors.reduce((sum, apt) => sum + (apt.calculatedRemaining ?? 0), 0))}</div></CardContent></Card>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted z-10">
                <TableRow>
                  <TableHead>Xonadon</TableHead><TableHead>Obyekt</TableHead><TableHead>Mijoz</TableHead>
                  <TableHead>To'lov turi</TableHead><TableHead className="text-right">Jami summa</TableHead>
                  <TableHead className="text-right">To'langan</TableHead><TableHead className="text-right">Qoldiq</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debtors.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center h-24">Qarzdorlar topilmadi</TableCell></TableRow>
                ) : (
                  debtors.map((debtor) => (
                    <TableRow key={debtor.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setShowDebtorsModal(false); router.push(`/apartments/${debtor.id}`); }}>
                      <TableCell>{debtor.room_number}</TableCell><TableCell>{debtor.object_name}</TableCell>
                      <TableCell>{debtor.payment?.user_fio || '-'}</TableCell><TableCell>{getPaymentTypeLabel(debtor.payment?.payment_type)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(debtor.calculatedTotalAmount)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(debtor.calculatedTotalPaid)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(debtor.calculatedRemaining)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="mt-auto pt-4 border-t">
            <Button variant="outline" onClick={()=>setShowDebtorsModal(false)}>Yopish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster />
      <header className="border-b bg-background sticky top-0 z-20">
        <div className="flex h-16 items-center px-4 md:px-6 container mx-auto">
          <MainNav className="mx-6 hidden md:flex" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav />
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 container mx-auto">
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Xonadonlar</h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={toggleViewMode} title={viewMode === 'grid' ? "Jadval ko'rinishi" : "Kartochka ko'rinishi"} disabled={loading}>
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            </Button>
            <Button variant="outline" onClick={() => {
                const debtorsList = apartments.filter(apt => (apt.calculatedRemaining ?? 0) > 0 && apt.status?.toLowerCase() !== 'bosh').sort((a, b) => (b.calculatedRemaining ?? 0) - (a.calculatedRemaining ?? 0));
                setDebtors(debtorsList); setShowDebtorsModal(true);
              }} disabled={loading}>Qarzdorlar</Button>
            <Link href="/apartments/add" passHref><Button disabled={loading}><Plus className="mr-2 h-4 w-4" /> Yangi xonadon</Button></Link>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              <div className="space-y-1.5">
                <Label htmlFor="property">Obyekt</Label>
                <Select value={filters.property || "all"} onValueChange={(value) => handleFilterChange("property", value)}>
                  <SelectTrigger id="property"><SelectValue placeholder="Barcha obyektlar" /></SelectTrigger>
                  <SelectContent>{properties.map((property) => (<SelectItem key={property.id} value={property.id.toString()}>{property.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rooms">Xonalar soni</Label>
                <Select value={filters.rooms || "all"} onValueChange={(value) => handleFilterChange("rooms", value)}>
                  <SelectTrigger id="rooms"><SelectValue placeholder="Barcha xonalar" /></SelectTrigger>
                  <SelectContent>{ALL_ROOM_OPTIONS.map((room) => (<SelectItem key={room.value} value={room.value}>{room.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="floor">Qavat</Label>
                <Select value={filters.floor || "all"} onValueChange={(value) => handleFilterChange("floor", value)}>
                  <SelectTrigger id="floor"><SelectValue placeholder="Barcha qavatlar" /></SelectTrigger>
                  <SelectContent>{ALL_FLOOR_OPTIONS.map((floor) => (<SelectItem key={floor.value} value={floor.value}>{floor.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Holati</Label>
                <Select value={filters.status || "all"} onValueChange={(value) => handleFilterChange("status", value)}>
                  <SelectTrigger id="status"><SelectValue placeholder="Barcha holatlar" /></SelectTrigger>
                  <SelectContent>{ALL_STATUSES.map((status) => (<SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="search">Qidiruv</Label>
                <Input id="search" placeholder="Xona raqami, mijoz..." value={filters.search} onChange={(e) => handleFilterChange("search", e.target.value)}/>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <Card key={i} className="min-h-[300px]"><CardContent className="p-4 space-y-3"><div className="flex justify-between"><Skeleton className="h-6 w-20" /><Skeleton className="h-5 w-16" /></div><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-2/3" /><div className="mt-4 pt-3 border-t"><Skeleton className="h-9 w-full" /></div></CardContent></Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
                {Array.from({ length: 11 }).map((_, i)=>(<TableHead key={i}><Skeleton className="h-4 w-full"/></TableHead>))}
            </TableRow></TableHeader><TableBody>
                {Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}>
                    {Array.from({ length: 11 }).map((_,j)=>(<TableCell key={j}><Skeleton className="h-4 w-full"/></TableCell>))}
                </TableRow>))}
            </TableBody></Table></CardContent></Card>
          )
        ) : apartments.length === 0 ? (
          <Card><CardContent className="flex items-center justify-center h-40"><p className="text-muted-foreground">Filtrlarga mos xonadonlar topilmadi.</p></CardContent></Card>
        ) : viewMode === 'grid' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {apartments.map((apartment) => {
                const remainingAmount = apartment.calculatedRemaining; const totalPaid = apartment.calculatedTotalPaid;
                const totalAmount = apartment.calculatedTotalAmount ?? apartment.price; const isBosh = apartment.status?.toLowerCase() === 'bosh';
                const showSensitiveControls = canPerformSensitiveActions(currentUser);
                return (
                  <Card key={apartment.id} className="overflow-hidden transition-shadow duration-200 hover:shadow-lg cursor-pointer min-h-[300px] flex flex-col" onClick={() => router.push(`/apartments/${apartment.id}`)}>
                    <CardContent className="p-4 space-y-2 flex-grow flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <div><h3 className="text-lg font-semibold">№ {apartment.room_number || "N/A"}</h3><p className="text-xs text-muted-foreground truncate" title={apartment.object_name || "Noma'lum obyekt"}>{apartment.object_name || "Noma'lum obyekt"}</p></div>
                        {getStatusBadge(apartment.status, apartment.payment?.payment_type)}
                      </div>
                      <div className="space-y-2 text-sm text-foreground flex-grow">
                        <div className="flex items-center"><Home className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" /><span>{apartment.rooms || "?"} xona, {apartment.area || "?"} m², {apartment.floor || "?"}-qavat</span></div>
                        {!isBosh && remainingAmount !== null && totalPaid !== null && (
                          <div className="space-y-2 text-xs border-t pt-2 mt-2">
                            {apartment.payment && (<div className="flex items-center"><CreditCard className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">{getPaymentTypeLabel(apartment.payment.payment_type)}</span></div>)}
                            {apartment.payment?.user_fio && (<div className="flex items-center"><span className="text-muted-foreground">Mijoz:</span><span className="ml-1 font-medium">{apartment.payment.user_fio}</span></div>)}
                            <div className="grid grid-cols-2 gap-1">
                              <div className="text-muted-foreground">Jami:</div><div className="text-right font-medium">{formatCurrency(totalAmount)}</div>
                              <div className="text-muted-foreground">To'langan:</div><div className="text-right font-medium text-green-600">{formatCurrency(totalPaid)}</div>
                              <div className="text-muted-foreground">Qoldiq:</div><div className={`text-right font-medium ${remainingAmount < 0 ? 'text-orange-600' : remainingAmount > 0 ? 'text-red-600' : ''}`}>{formatCurrency(remainingAmount)}</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-auto pt-3 border-t">
                        {showSensitiveControls && ( // Cheklov bu yerda
                            <div className="flex space-x-2">
                                <Button size="sm" variant="outline" className="flex-1" onClick={(e) => { e.stopPropagation(); openEditModal(apartment); }} title="Tahrirlash" disabled={loading}><Edit className="mr-1 h-3.5 w-3.5" /> Tahrir</Button>
                                <Button size="sm" variant="destructive" className="flex-1" onClick={(e) => { e.stopPropagation(); setApartmentToDelete(apartment.id); setDeleteModalOpen(true); }} title="O'chirish" disabled={loading}><Trash2 className="mr-1 h-3.5 w-3.5" /> O'chir</Button>
                            </div>
                        )}
                        {/* "Band qilish / Sotish" tugmasi cheklovsiz qoladi */}
                        {apartment.status === "bosh" && (<Button size="sm" className={`w-full ${showSensitiveControls ? 'mt-2' : ''} bg-yellow-500 hover:bg-yellow-600 text-black font-semibold`} onClick={(e) => { e.stopPropagation(); router.push(`/apartments/${apartment.id}/reserve`); }}>Band qilish / Sotish</Button>)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {totalPages > 1 && (<div className="flex justify-between items-center mt-6 pt-4 border-t">
              <Button variant="outline" disabled={currentPage === 1 || loading} onClick={() => handlePageChange(currentPage - 1)}>Oldingi</Button>
              <span>Sahifa {currentPage} / {totalPages}</span>
              <Button variant="outline" disabled={currentPage === totalPages || loading} onClick={() => handlePageChange(currentPage + 1)}>Keyingi</Button>
            </div>)}
          </div>
        ) : (
          <div className="space-y-4">
            {renderApartmentTable(apartments)}
            {totalPages > 1 && (<div className="flex justify-between items-center mt-4">
              <Button variant="outline" disabled={currentPage === 1 || loading} onClick={() => handlePageChange(currentPage - 1)}>Oldingi</Button>
              <span>Sahifa {currentPage} / {totalPages}</span>
              <Button variant="outline" disabled={currentPage === totalPages || loading} onClick={() => handlePageChange(currentPage + 1)}>Keyingi</Button>
            </div>)}
          </div>
        )}
      </main>

      {selectedApartment && (
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Xonadonni tahrirlash</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit_room_number" className="text-right">Xona raqami</Label><Input id="edit_room_number" value={editForm.room_number} onChange={(e) => handleEditFormChange("room_number", e.target.value)} className="col-span-3"/></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit_rooms" className="text-right">Xonalar soni</Label><Select value={editForm.rooms} onValueChange={(value) => handleEditFormChange("rooms", value)}><SelectTrigger className="col-span-3"><SelectValue placeholder="Xonalar sonini tanlang" /></SelectTrigger><SelectContent>{ALL_ROOM_OPTIONS.map((room) => (<SelectItem key={room.value} value={room.value}>{room.label}</SelectItem>))}</SelectContent></Select></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit_area" className="text-right">Maydoni (m²)</Label><Input id="edit_area" type="number" value={editForm.area} onChange={(e) => handleEditFormChange("area", e.target.value)} className="col-span-3"/></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit_floor" className="text-right">Qavat</Label><Select value={editForm.floor} onValueChange={(value) => handleEditFormChange("floor", value)}><SelectTrigger className="col-span-3"><SelectValue placeholder="Qavatni tanlang" /></SelectTrigger><SelectContent>{ALL_FLOOR_OPTIONS.map((floor) => (<SelectItem key={floor.value} value={floor.value}>{floor.label}</SelectItem>))}</SelectContent></Select></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit_price" className="text-right">Narxi ($)</Label><Input id="edit_price" type="number" value={editForm.price} onChange={(e) => handleEditFormChange("price", e.target.value)} className="col-span-3"/></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit_status" className="text-right">Holati</Label><Select value={editForm.status} onValueChange={(value) => handleEditFormChange("status", value)}><SelectTrigger className="col-span-3"><SelectValue placeholder="Holatni tanlang" /></SelectTrigger><SelectContent>{ALL_STATUSES.map((status) => (<SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>))}</SelectContent></Select></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit_object" className="text-right">Obyekt</Label><Select value={editForm.object} onValueChange={(value) => handleEditFormChange("object", value)}><SelectTrigger className="col-span-3"><SelectValue placeholder="Obyektni tanlang" /></SelectTrigger><SelectContent>{properties.map((property) => (<SelectItem key={property.id} value={property.id.toString()}>{property.name}</SelectItem>))}</SelectContent></Select></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>Bekor qilish</Button>
              <Button onClick={updateApartment} disabled={loading}>Saqlash</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Xonadonni o'chirish</DialogTitle></DialogHeader>
          <div className="py-4"><p>Haqiqatan ham ushbu xonadonni o'chirmoqchimisiz?</p></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Bekor qilish</Button>
            <Button variant="destructive" onClick={confirmDeleteApartment} disabled={loading}>O'chirish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="border-t bg-muted/40 py-4 mt-auto">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          Version 1.1 | Barcha huquqlar himoyalangan | Ahlan Group LLC © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}