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
// Use Shadcn's toast directly
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { format, parseISO, isValid } from "date-fns";
import { uz } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// API bazaviy URL
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://api.ahlan.uz";

// Interfeyslar (unchanged)
interface Document { id: number; payment: number; document_type: string; docx_file?: string | null; pdf_file?: string | null; image?: string | null; created_at: string; }
interface Payment { id: number; user: number; user_fio?: string; apartment: number; apartment_info?: string; payment_type?: string; total_amount?: string; initial_payment?: string; interest_rate?: number; duration_months?: number; monthly_payment?: string; due_date?: number; paid_amount: string; status: string; additional_info?: string | null; created_at: string; payment_date?: string | null; reservation_deadline?: string | null; bank_name?: string | null; documents?: Document[]; }
interface OverduePayment { month: string; amount: number; due_date: string; }
interface Apartment { id: number; object: number; object_name: string; room_number: string; rooms?: number; area?: number; floor?: number; price?: string; status?: string; description?: string; secret_code?: string; balance?: string; total_amount?: string; overdue_payments?: OverduePayment[]; total_overdue?: number; }
interface Client { id: number; fio: string; username?: string; phone_number?: string; user_type?: string; }
interface ObjectData { id: number; name: string; total_apartments?: number; floors?: number; address?: string; description?: string; image?: string | null; }


export default function PaymentsPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Holatlar
  const [payments, setPayments] = useState<Payment[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [objects, setObjects] = useState<ObjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);

  // Form ma'lumotlari (unchanged)
  const initialFormData = useMemo( () => ({ apartment: "", user: "", payment_type: "naqd", total_amount: "", initial_payment: "", paid_amount: "", duration_months: "", due_date: "", additional_info: "", created_at: new Date(), payment_date: new Date().toISOString().split("T")[0], bank_name: "", }), [] );
  const [formData, setFormData] = useState(initialFormData);
  const initialEditFormData = useMemo(() => ({ additional_info: "" }), []);
  const [editFormData, setEditFormData] = useState(initialEditFormData);

  // Filtrlar (paymentType filter restored, apartmentRangeFilter removed)
  const [filters, setFilters] = useState({
    object: "all",
    paymentType: "all", // Restored filter
    // Removed apartmentRangeFilter
    dueDate: "all",
    durationMonths: "all",
  });

  // Utility funksiyalar (unchanged)
  const getAuthHeaders = useCallback(/* ... */ () => { if (!accessToken) { toast({ title: "Xatolik", description: "Avtorizatsiya tokeni topilmadi. Iltimos, qayta tizimga kiring.", variant: "destructive" }); if (typeof window !== "undefined") { localStorage.removeItem("access_token"); router.push("/login"); } return null; } return { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }; }, [accessToken, router, toast]);
  const formatCurrency = useCallback(/* ... */ (amount: string | number | undefined | null) => { const num = Number(amount); if (isNaN(num)) return "0.00"; return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }, []);
  const formatDate = useCallback(/* ... */ (dateString: string | undefined | null) => { if (!dateString) return "-"; try { let date = parseISO(dateString); if (!isValid(date)) { const parts = dateString.split('-'); if (parts.length === 3) { date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])); } } if (!isValid(date)) { const datePart = dateString.split("T")[0]; return datePart || "-"; } return format(date, "dd.MM.yyyy", { locale: uz }); } catch (error) { console.error("Sana formatlashda xato:", dateString, error); const datePart = dateString.split("T")[0]; return datePart || "-"; } }, []);
  const getStatusBadge = useCallback(/* ... */ (status: string | undefined | null) => { const lowerStatus = status?.toLowerCase() || "unknown"; switch (lowerStatus) { case "paid": case "completed": return ( <Badge className="bg-green-600 hover:bg-green-700 text-white"> To'liq To'langan </Badge> ); case "partially_paid": return ( <Badge className="bg-blue-500 hover:bg-blue-600 text-white"> Qisman To'langan </Badge> ); case "pending": return ( <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white"> Kutilmoqda </Badge> ); case "overdue": return ( <Badge className="bg-red-600 hover:bg-red-700 text-white"> Muddati O'tgan </Badge> ); case "reserved": return ( <Badge className="bg-orange-500 hover:bg-orange-600 text-white"> Band Qilingan </Badge> ); default: return ( <Badge variant="secondary" className="capitalize"> {status || "Noma'lum"} </Badge> ); } }, []);

  // Ma'lumotlarni olish funksiyalari (fetchApiData, fetchApartmentDetails, fetchCoreData remain the same)
    const fetchApiData = useCallback( /* ... */ async <T,>(url: string, token: string, setData: (data: T[]) => void, entityName: string, options: RequestInit = {}) => { const headers = { Accept: "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}), }; try { const response = await fetch(url, { ...options, headers }); if (!response.ok) { console.error(`${entityName} Error:`, response.status, await response.text().catch(() => "")); if (response.status === 401) throw new Error("Unauthorized"); toast({ title: "Xatolik", description: `${entityName} yuklashda muammo (${response.status}).`, variant: "destructive" }); setData([]); return false; } const data = await response.json(); let results = []; if (data.results) { results = data.results; let nextUrl = data.next; while (nextUrl) { if (!nextUrl.startsWith('http')) { console.warn(`Invalid next URL skipped: ${nextUrl}`); break; } const nextPageResponse = await fetch(nextUrl, { headers }); if (!nextPageResponse.ok) { console.warn(`Failed to fetch next page: ${nextUrl}, Status: ${nextPageResponse.status}`); break; } const nextPageData = await nextPageResponse.json(); results = results.concat(nextPageData.results || []); nextUrl = nextPageData.next; } } else if (Array.isArray(data)) { results = data; } else { console.warn(`${entityName}: Expected array or results field, received different structure.`); setData([]); return true; } setData(results); return true; } catch (error: any) { if (error.message !== "Unauthorized") { console.error(`${entityName} yuklashda xato:`, error); toast({ title: "Xatolik", description: error.message || `${entityName} yuklashda noma'lum xatolik.`, variant: "destructive" }); } setData([]); if (error.message === "Unauthorized") throw error; return false; } }, [toast]);
    const fetchApartmentDetails = useCallback( /* ... */ async (token: string, apartmentsToUpdate: Apartment[]) => { if (!token || apartmentsToUpdate.length === 0) return apartmentsToUpdate; const headers = getAuthHeaders(); if (!headers) return apartmentsToUpdate; const detailPromises = apartmentsToUpdate.map(async (apt) => { try { const [balanceRes, overdueRes] = await Promise.allSettled([ fetch(`${API_BASE_URL}/apartments/${apt.id}/get_total_payments/`, { headers }), fetch(`${API_BASE_URL}/apartments/${apt.id}/overdue_payments/`, { headers }) ]); let balance = "0"; let total_amount = apt.price || "0"; let overdue_payments: OverduePayment[] = []; let total_overdue = 0; if (balanceRes.status === 'fulfilled' && balanceRes.value.ok) { const data = await balanceRes.value.json(); if (data && typeof data === 'object') { balance = String(data.balance || 0); total_amount = String(data.total_amount || apt.price || 0); } } else if (balanceRes.status === 'fulfilled') { console.warn(`Failed to fetch balance for apartment ${apt.id}: Status ${balanceRes.value.status}`); } else { console.error(`Error fetching balance for apartment ${apt.id}:`, balanceRes.reason); } if (overdueRes.status === 'fulfilled' && overdueRes.value.ok) { const overdueData = await overdueRes.value.json(); if (overdueData && typeof overdueData === 'object') { overdue_payments = overdueData.overdue_payments || []; total_overdue = overdueData.total_overdue || 0; } } else if (overdueRes.status === 'fulfilled') { console.warn(`Failed to fetch overdue payments for apartment ${apt.id}: Status ${overdueRes.value.status}`); } else { console.error(`Error fetching overdue payments for apartment ${apt.id}:`, overdueRes.reason); } return { ...apt, balance, total_amount, overdue_payments, total_overdue }; } catch (error) { console.error(`Xonadon ${apt.id} ma'lumotlarini olishda kutilmagan xato:`, error); return { ...apt, balance: "0", total_amount: apt.price || "0", overdue_payments: [], total_overdue: 0 }; } }); const updatedApartments = await Promise.all(detailPromises); return updatedApartments; }, [getAuthHeaders]);

  // Fetch Payments (paymentType filter restored in API query)
  const fetchPayments = useCallback(
    async (
      token: string,
      currentFilters: typeof filters,
      isInitialLoad: boolean = false
    ): Promise<boolean> => {
      if (!token) return false;
      if (!isInitialLoad) setPaymentsLoading(true);

      const headers = getAuthHeaders();
      if (!headers) {
        if (!isInitialLoad) setPaymentsLoading(false);
        return false;
      }

      try {
        let url = `${API_BASE_URL}/payments/?ordering=-created_at`;
        const queryParams = new URLSearchParams();
        // Restore paymentType filter
        if (currentFilters.paymentType !== "all") queryParams.append("payment_type", currentFilters.paymentType);
        if (currentFilters.object !== "all") {
             console.warn("API orqali obyekt bo'yicha filtrlash qo'llab-quvvatlanmasligi mumkin. Client-side filtrlash ishlatiladi.");
        }
        // Keep installment filters if relevant based on paymentType
        if (currentFilters.paymentType === "muddatli") {
             if (currentFilters.dueDate !== "all") queryParams.append("due_date", currentFilters.dueDate);
             if (currentFilters.durationMonths !== "all") queryParams.append("duration_months", currentFilters.durationMonths);
        }
        const queryString = queryParams.toString();
        if (queryString) url += `&${queryString}`;

        let allResults: Payment[] = [];
        let nextUrl: string | null = url;
        while (nextUrl) {
             if (!nextUrl.startsWith('http')) { console.warn(`Invalid next URL: ${nextUrl}`); break; }
             const response = await fetch(nextUrl, { headers });
             if (!response.ok) {
                 if (response.status === 401) throw new Error("Unauthorized");
                 const errorData = await response.json().catch(() => ({ detail: "Server javobi xato." }));
                 throw new Error(`To'lovlarni olishda xatolik (${response.status}): ${errorData.detail || response.statusText}`);
             }
             const data = await response.json();
             allResults = allResults.concat(data.results || []);
             nextUrl = data.next;
        }
        setPayments(allResults);
        return true;
      } catch (error: any) {
        console.error("To'lovlarni olishda xato:", error);
        if (error.message === "Unauthorized") throw error;
        toast({ title: "Xatolik", description: error.message || "To'lovlarni yuklashda muammo.", variant: "destructive" });
        setPayments([]);
        return false;
      } finally {
        if (isInitialLoad) setLoading(false);
        setPaymentsLoading(false);
      }
    },
    [getAuthHeaders, toast]
  );

  const fetchCoreData = useCallback( /* ... */ async (token: string) => { setLoading(true); let success = true; let fetchedApartments: Apartment[] = []; try { const coreFetchPromises = [ fetchApiData<Apartment>(`${API_BASE_URL}/apartments/?page_size=10000`, token, (data) => { fetchedApartments = data; }, "Xonadonlar (Asosiy)"), fetchApiData<Client>(`${API_BASE_URL}/users/?user_type=mijoz&page_size=1000`, token, setClients, "Mijozlar"), fetchApiData<ObjectData>(`${API_BASE_URL}/objects/?page_size=1000`, token, setObjects, "Obyektlar"), ]; const results = await Promise.allSettled(coreFetchPromises); results.forEach((result) => { if (result.status === "rejected") { success = false; if (result.reason?.message === "Unauthorized") throw new Error("Unauthorized"); console.error("Core data fetch error:", result.reason); } }); if (success && fetchedApartments.length > 0) { const detailedApartments = await fetchApartmentDetails(token, fetchedApartments); setApartments(detailedApartments); const paymentsFetched = await fetchPayments(token, filters, true); if (!paymentsFetched) success = false; } else if (success && fetchedApartments.length === 0) { setApartments([]); const paymentsFetched = await fetchPayments(token, filters, true); if (!paymentsFetched) success = false; } else { setLoading(false); } } catch (error: any) { success = false; if (error.message === "Unauthorized") { toast({ title: "Sessiya tugadi", description: "Iltimos, qayta tizimga kiring.", variant: "destructive" }); if (typeof window !== "undefined") { localStorage.removeItem("access_token"); router.push("/login"); } } setApartments([]); setClients([]); setObjects([]); setPayments([]); setLoading(false); } }, [router, filters, fetchPayments, fetchApiData, fetchApartmentDetails, toast]);


  // Filtrlangan xonadonlar (Select uchun - unchanged)
   const filteredApartmentsForSelect = useMemo(() => {
     let result = [...apartments];
     return result.sort((a, b) =>
         (a.room_number || "").localeCompare(b.room_number || "", undefined, { numeric: true })
     );
   }, [apartments]);


  // Filtrlangan to'lovlar (Asosiy jadval uchun - paymentType filtri qaytarildi)
  const filteredPayments = useMemo(() => {
    let result = [...payments];

    // Filter by Object
    if (filters.object !== "all") {
      const objectId = parseInt(filters.object, 10);
      const apartmentIdsInObject = new Set(
           apartments
           .filter((apt) => apt.object === objectId)
           .map((apt) => apt.id)
      );
      result = result.filter((p) => apartmentIdsInObject.has(p.apartment));
    }

    // Filter by Payment Type (RESTORED)
    if (filters.paymentType !== "all") {
      result = result.filter(
        (p) => p.payment_type?.toLowerCase() === filters.paymentType
      );
    }

    // Apartment Range Filter Removed

    // Filter by Due Date and Duration (Conditionally, if paymentType is 'muddatli')
     if (filters.paymentType === "muddatli" && filters.dueDate !== "all") {
       const dueDate = parseInt(filters.dueDate, 10);
       // Ensure we only filter actual 'muddatli' payments
       result = result.filter((p) => p.payment_type === 'muddatli' && p.due_date === dueDate);
     }
     if (filters.paymentType === "muddatli" && filters.durationMonths !== "all") {
       const duration = parseInt(filters.durationMonths, 10);
       // Ensure we only filter actual 'muddatli' payments
       result = result.filter((p) => p.payment_type === 'muddatli' && p.duration_months === duration);
     }

    return result;
  }, [payments, apartments, filters.object, filters.paymentType, filters.dueDate, filters.durationMonths]); // Dependencies updated


  // Statistika (Logic remains the same, relies on filteredPayments)
  const statistics = useMemo(() => {
    let total_paid = 0; let total_overdue = 0; let total_remaining_on_contracts = 0; let total_remaining_on_apartments = 0;
    filteredPayments.forEach((payment) => { const paidAmount = parseFloat(payment.paid_amount || "0") || 0; const totalAmount = parseFloat(payment.total_amount || "0") || 0; total_paid += paidAmount; total_remaining_on_contracts += Math.max(0, totalAmount - paidAmount); });
    const relevantApartmentIds = new Set(filteredPayments.map(p => p.apartment));
    const relevantApartments = apartments.filter(apt => relevantApartmentIds.has(apt.id)); // Filter based on apartments present in filteredPayments
    relevantApartments.forEach((apartment) => { const aptTotal = parseFloat(apartment.total_amount || "0") || 0; const aptPaid = parseFloat(apartment.balance || "0") || 0; total_remaining_on_apartments += Math.max(0, aptTotal - aptPaid); total_overdue += apartment.total_overdue || 0; });
    // Use apartment-based remaining if object is filtered, otherwise contract-based
    const final_total_remaining = filters.object !== 'all' ? total_remaining_on_apartments : total_remaining_on_contracts;
    return { total_paid, total_overdue, total_remaining: final_total_remaining };
  }, [filteredPayments, apartments, filters.object]); // Dependencies updated


  // Qolgan utility funksiyalar (unchanged)
  const getPaymentBalance = useCallback(/* ... */ (payment: Payment) => { const totalAmount = parseFloat(payment.total_amount || "0"); const paidAmount = parseFloat(payment.paid_amount || "0"); return Math.max(0, totalAmount - paidAmount).toString(); }, []);
  const getRowNumber = (index: number) => index + 1;
  const uniqueDueDates = useMemo(/* ... */ () => { const dueDates = new Set<number>(); payments.filter((p) => p.payment_type === "muddatli" && p.due_date != null).forEach((p) => dueDates.add(p.due_date!)); return Array.from(dueDates).sort((a, b) => a - b); }, [payments]);
  const uniqueDurationMonths = useMemo(/* ... */ () => { const durations = new Set<number>(); payments.filter((p) => p.payment_type === "muddatli" && p.duration_months != null).forEach((p) => durations.add(p.duration_months!)); return Array.from(durations).sort((a, b) => a - b); }, [payments]);

  // useEffect Hooks (unchanged)
  useEffect(() => { const token = localStorage.getItem("access_token"); if (!token) { router.push("/login"); } else { setAccessToken(token); } }, [router]);
  useEffect(() => { if (accessToken) { fetchCoreData(accessToken); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [accessToken]);
  useEffect(() => { if (accessToken && !loading && apartments.length > 0) { fetchPayments(accessToken, filters); } }, [accessToken, filters, loading, apartments.length, fetchPayments]);

  // Handler funksiyalar
  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = useCallback(() => { setIsModalOpen(false); setFormData(initialFormData); }, [initialFormData]);
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value })); };
  const handleSelectChange = (name: string, value: string) => { setFormData((prev) => ({ ...prev, [name]: value })); /* No need to reset apartment filter */ };
  const handleDateChange = (date: Date | undefined, fieldName: keyof typeof formData) => { if (date) { setFormData(prev => ({ ...prev, [fieldName]: format(date, 'yyyy-MM-dd') })); } else { setFormData(prev => ({ ...prev, [fieldName]: '' })); } };
  const handleOpenEditModal = (payment: Payment) => { /* ... */ setEditingPayment(payment); let additionalInfo = payment.additional_info || ""; try { const parsed = JSON.parse(additionalInfo); additionalInfo = parsed?.comments || additionalInfo; } catch {} setEditFormData({ additional_info: additionalInfo }); setIsEditModalOpen(true); };
  const handleCloseEditModal = useCallback(() => { setIsEditModalOpen(false); setEditingPayment(null); setEditFormData(initialEditFormData); }, [initialEditFormData]);
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setEditFormData((prev) => ({ ...prev, [e.target.name]: e.target.value })); };

  // Filter Handlers (Updated for paymentType)
  const handleFilterChange = (value: string, field: keyof typeof filters) => { // Add paymentType back
    setFilters((prev) => ({
      ...prev,
      [field]: value,
      // Reset installment filters if paymentType changes away from 'muddatli'
      ...(field === "paymentType" && value !== "muddatli" && { dueDate: "all", durationMonths: "all" }),
      // No need to reset apartment filter when object changes
    }));
  };
  const handleClearFilters = () => {
    setFilters({
      object: "all",
      paymentType: "all", // Restore reset for paymentType
      // apartmentRangeFilter removed
      dueDate: "all",
      durationMonths: "all",
    });
  };

  // Add, Update, Delete Payment Handlers (unchanged)
    const handleAddPayment = async () => { setActionLoading(true); const headers = getAuthHeaders(); if (!headers) { setActionLoading(false); return; } const errors = []; if (!formData.apartment) errors.push("Xonadon tanlanmagan."); if (!formData.user) errors.push("Mijoz tanlanmagan."); if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) errors.push("Umumiy summa > 0 bo'lishi kerak."); if (!formData.initial_payment || parseFloat(formData.initial_payment) < 0) errors.push("Boshlang'ich to'lov >= 0 bo'lishi kerak."); if (!formData.paid_amount || parseFloat(formData.paid_amount) < 0) errors.push("To'langan summa >= 0 bo'lishi kerak."); if (!formData.payment_date) errors.push("To'lov sanasi kiritilmagan."); if (formData.payment_type === "muddatli") { if (!formData.duration_months || parseInt(formData.duration_months) <= 0) errors.push("Muddat (oy) > 0 bo'lishi kerak."); if (!formData.due_date || parseInt(formData.due_date) < 1 || parseInt(formData.due_date) > 31) errors.push("To'lov kuni (1-31) bo'lishi kerak."); } if (formData.payment_type === "ipoteka" && !formData.bank_name?.trim()) { errors.push("Ipoteka uchun bank nomi kiritilishi shart."); } if (errors.length > 0) { toast({ title: "Xatolik", description: errors.join(" "), variant: "destructive" }); setActionLoading(false); return; } const totalAmount = parseFloat(formData.total_amount); const initialPayment = parseFloat(formData.initial_payment); const paidAmount = parseFloat(formData.paid_amount); const durationMonths = parseInt(formData.duration_months || "0"); const remainingForInstallment = totalAmount - initialPayment; const monthlyPayment = (formData.payment_type === "muddatli" && durationMonths > 0) ? remainingForInstallment / durationMonths : null; let status = 'pending'; if (formData.payment_type === 'band') { status = 'reserved'; } else if (formData.payment_type === 'naqd' || formData.payment_type === 'ipoteka') { if (paidAmount >= totalAmount) { status = 'completed'; } else if (paidAmount > 0) { status = 'partially_paid'; } } else if (formData.payment_type === 'muddatli') { if (paidAmount >= initialPayment) { if (paidAmount >= totalAmount) { status = 'completed'; } else { status = 'partially_paid'; } } else if (paidAmount > 0) { status = 'pending'; } } const paymentData = { apartment: parseInt(formData.apartment, 10), user: parseInt(formData.user, 10), payment_type: formData.payment_type, total_amount: totalAmount.toFixed(2), initial_payment: initialPayment.toFixed(2), paid_amount: paidAmount.toFixed(2), duration_months: formData.payment_type === "muddatli" ? durationMonths : null, monthly_payment: monthlyPayment ? monthlyPayment.toFixed(2) : null, due_date: formData.payment_type === "muddatli" ? parseInt(formData.due_date) : null, additional_info: formData.additional_info.trim() ? JSON.stringify({ comments: formData.additional_info.trim() }) : null, created_at: format(formData.created_at, "yyyy-MM-dd"), payment_date: formData.payment_date, bank_name: formData.payment_type === 'ipoteka' ? formData.bank_name.trim() : null, status: status, }; try { const response = await fetch(`${API_BASE_URL}/payments/`, { method: "POST", headers, body: JSON.stringify(paymentData), }); if (!response.ok) { const errorData = await response.json().catch(() => ({ detail: "Server javobini o'qishda xato." })); throw new Error(`To'lov qo'shishda xatolik (${response.status}): ${errorData.detail || response.statusText}`); } const newPayment = await response.json(); const apartmentId = parseInt(formData.apartment, 10); let apartmentToUpdate = apartments.find(apt => apt.id === apartmentId); if (apartmentToUpdate) { let newApartmentStatus = apartmentToUpdate.status; if (formData.payment_type === 'band') { newApartmentStatus = 'reserved'; } else if (['naqd', 'ipoteka', 'muddatli'].includes(formData.payment_type)) { const balanceResponse = await fetch(`${API_BASE_URL}/apartments/${apartmentId}/get_total_payments/`, { headers }); let currentBalance = 0; let currentTotalAmount = parseFloat(apartmentToUpdate.total_amount || apartmentToUpdate.price || '0'); if (balanceResponse.ok) { const balanceData = await balanceResponse.json(); if (balanceData && typeof balanceData === 'object') { currentBalance = parseFloat(balanceData.balance || '0'); currentTotalAmount = parseFloat(balanceData.total_amount || currentTotalAmount.toString()); } } if (currentBalance >= currentTotalAmount && currentTotalAmount > 0) { newApartmentStatus = 'sold'; } else if (apartmentToUpdate.status === 'active') { newApartmentStatus = 'partially_paid'; } } if (newApartmentStatus !== apartmentToUpdate.status) { const updateResponse = await fetch(`${API_BASE_URL}/apartments/${apartmentId}/`, { method: "PATCH", headers, body: JSON.stringify({ status: newApartmentStatus }), }); if (!updateResponse.ok) { console.warn(`Xonadon ${apartmentId} holatini yangilashda xatolik (${updateResponse.status})`); toast({ title: "Ogohlantirish", description: `Xonadon ${apartmentId} holatini yangilashda muammo.`, variant: "destructive"}); } else { const updatedApartments = await fetchApartmentDetails(accessToken!, apartments); setApartments(updatedApartments); } } } toast({ title: "Muvaffaqiyat!", description: "Yangi to'lov yozuvi qo'shildi." }); if (accessToken) { await fetchPayments(accessToken, filters); } handleCloseModal(); } catch (error: any) { console.error("Add payment error:", error); toast({ title: "Xatolik", description: error.message || "To'lov qo'shishda xato.", variant: "destructive" }); } finally { setActionLoading(false); } };
    const handleUpdatePayment = async () => { if (!editingPayment) return; setActionLoading(true); const headers = getAuthHeaders(); if (!headers) { setActionLoading(false); return; } const updatedData = { additional_info: editFormData.additional_info.trim() ? JSON.stringify({ comments: editFormData.additional_info.trim() }) : null, }; try { const response = await fetch( `${API_BASE_URL}/payments/${editingPayment.id}/`, { method: "PATCH", headers, body: JSON.stringify(updatedData), }); if (!response.ok) { const errorData = await response.json().catch(() => ({ detail: "Server javobini o'qishda xato." })); throw new Error(`To'lovni yangilashda xatolik (${response.status}): ${errorData.detail || response.statusText}`); } toast({ title: "Muvaffaqiyat!", description: `To'lov (ID: ${editingPayment.id}) izohi yangilandi.` }); if (accessToken) await fetchPayments(accessToken, filters); handleCloseEditModal(); } catch (error: any) { console.error("Update payment error:", error); toast({ title: "Xatolik", description: error.message || "To'lovni yangilashda xato.", variant: "destructive" }); } finally { setActionLoading(false); } };
    const handleDeletePayment = async (paymentId: number) => { if (deletingPaymentId === paymentId || actionLoading) return; if (!window.confirm(`ID ${paymentId} to'lov yozuvini o'chirishni tasdiqlaysizmi? Bu amalni orqaga qaytarib bo'lmaydi.`)) return; setDeletingPaymentId(paymentId); setActionLoading(true); const headers = getAuthHeaders(); if (!headers) { setDeletingPaymentId(null); setActionLoading(false); return; } const paymentToDelete = payments.find(p => p.id === paymentId); const apartmentId = paymentToDelete?.apartment; try { const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/`, { method: "DELETE", headers }); if (!response.ok && response.status !== 204) { const errorData = await response.json().catch(() => ({ detail: "Server javobini o'qishda xato." })); throw new Error(`To'lovni o'chirishda xatolik (${response.status}): ${errorData.detail || response.statusText}`); } toast({ title: "Muvaffaqiyat!", description: `To'lov (ID: ${paymentId}) o'chirildi.` }); setPayments((prev) => prev.filter((p) => p.id !== paymentId)); if (accessToken && apartmentId) { const updatedApartments = await fetchApartmentDetails(accessToken, apartments); setApartments(updatedApartments); } } catch (error: any) { console.error("Delete payment error:", error); toast({ title: "Xatolik", description: error.message || "To'lovni o'chirishda xato.", variant: "destructive" }); } finally { setDeletingPaymentId(null); setActionLoading(false); } };

  // --- JSX Rendering ---

  if (loading) {
    return ( <div className="flex min-h-screen items-center justify-center"> <Loader2 className="mr-2 h-8 w-8 animate-spin text-muted-foreground" /> <p className="text-muted-foreground">Ma'lumotlar yuklanmoqda...</p> </div> );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="border-b sticky top-0 bg-background z-10">
        <div className="flex h-16 items-center px-4 container mx-auto">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4"> <Search /> <UserNav /> </div>
        </div>
      </div>

     {/* Main Content Area */}
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 container mx-auto">
        {/* Page Title & Add Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
          <h2 className="text-3xl font-bold tracking-tight">To'lovlar</h2>
          <Button onClick={handleOpenModal} disabled={actionLoading || loading}> <CreditCard className="mr-2 h-4 w-4" /> Yangi To'lov </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium"> Jami To'langan </CardTitle></CardHeader> <CardContent><div className="text-2xl font-bold text-green-600"> ${formatCurrency(statistics.total_paid)} </div><p className="text-xs text-muted-foreground"> Filtr bo'yicha to'langan summa </p></CardContent> </Card>
          <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Jami Qoldiq</CardTitle></CardHeader> <CardContent><div className="text-2xl font-bold text-blue-600"> ${formatCurrency(statistics.total_remaining)} </div><p className="text-xs text-muted-foreground"> {filters.object !== 'all' ? "Tanlangan obyekt bo'yicha" : "Filtr bo'yicha"} jami qoldiq </p></CardContent> </Card>
          <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium"> Muddati O'tgan </CardTitle></CardHeader> <CardContent><div className="text-2xl font-bold text-red-600"> ${formatCurrency(statistics.total_overdue)} </div><p className="text-xs text-muted-foreground"> Filtr bo'yicha muddati o'tgan summa </p></CardContent> </Card>
        </div>

        {/* Filters (Payment Type restored, Apartment Range removed) */}
        <div className="flex flex-wrap gap-2 items-center p-4 border rounded-md bg-card">
          {/* Object Filter */}
          <Select value={filters.object} onValueChange={(v) => handleFilterChange(v, "object")} disabled={paymentsLoading || actionLoading || objects.length === 0}>
            <SelectTrigger className="w-full sm:w-auto flex-grow min-w-[150px]"><SelectValue placeholder="Obyekt bo'yicha" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha Obyektlar</SelectItem>
              {objects.map((obj) => (<SelectItem key={obj.id} value={obj.id.toString()}>{obj.name}</SelectItem>))}
            </SelectContent>
          </Select>

          {/* Apartment Range Filter Removed */}

           {/* Payment Type Filter (RESTORED) */}
          <Select value={filters.paymentType} onValueChange={(v) => handleFilterChange(v, "paymentType")} disabled={paymentsLoading || actionLoading}>
            <SelectTrigger className="w-full sm:w-auto flex-grow min-w-[150px]"><SelectValue placeholder="To'lov turi bo'yicha" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha Turlar</SelectItem>
              <SelectItem value="muddatli">Muddatli</SelectItem>
              <SelectItem value="naqd">Naqd</SelectItem>
              <SelectItem value="ipoteka">Ipoteka</SelectItem>
              <SelectItem value="band">Band</SelectItem>
            </SelectContent>
          </Select>

           {/* Installment Specific Filters (Show only if paymentType is 'muddatli') */}
          {filters.paymentType === "muddatli" && (
            <>
              <Select value={filters.dueDate} onValueChange={(v) => handleFilterChange(v, "dueDate")} disabled={paymentsLoading || actionLoading || uniqueDueDates.length === 0}>
                <SelectTrigger className="w-full sm:w-auto flex-grow min-w-[180px]"><SelectValue placeholder="To'lov sanasi bo'yicha" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha Sanalar</SelectItem>
                  {uniqueDueDates.map((due) => (<SelectItem key={due} value={due.toString()}>Har oyning {due}-kuni</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={filters.durationMonths} onValueChange={(v) => handleFilterChange(v, "durationMonths")} disabled={paymentsLoading || actionLoading || uniqueDurationMonths.length === 0}>
                <SelectTrigger className="w-full sm:w-auto flex-grow min-w-[150px]"><SelectValue placeholder="Muddat bo'yicha" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha Muddatlar</SelectItem>
                  {uniqueDurationMonths.map((duration) => (<SelectItem key={duration} value={duration.toString()}>{duration} oy</SelectItem>))}
                </SelectContent>
              </Select>
            </>
          )}

          {/* Clear Filters Button */}
          <Button
            variant="outline"
            onClick={handleClearFilters}
            disabled={
              paymentsLoading || actionLoading ||
              (filters.object === "all" && filters.paymentType === "all" && filters.dueDate === "all" && filters.durationMonths === "all") // Updated condition
            }
            className="flex-shrink-0"
          >
            Tozalash
          </Button>
        </div>

        {/* Payments Table Card (Status va Amallar ustunlari olib tashlangan) */}
        <Card>
          <CardHeader> <CardTitle>To'lovlar Ro'yxati</CardTitle> <CardDescription>Mavjud to'lov yozuvlari.</CardDescription> </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Obyekt</TableHead>
                    <TableHead>Xonadon</TableHead>
                    <TableHead>Mijoz</TableHead>
                    <TableHead>Turi</TableHead>
                    <TableHead className="text-right">Umumiy Summa</TableHead>
                    <TableHead className="text-right">To'langan (shu yozuv)</TableHead>
                    <TableHead>To'lov Sanasi</TableHead>
                    <TableHead>Izoh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsLoading ? (
                    <TableRow><TableCell colSpan={9} className="h-24 text-center"><div className="flex justify-center items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yuklanmoqda...</div></TableCell></TableRow>
                  ) : filteredPayments.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="h-24 text-center">Tanlangan filtrlar bo'yicha to'lovlar topilmadi.</TableCell></TableRow>
                  ) : (
                    filteredPayments.map((payment, index) => {
                      const apartment = apartments.find((apt) => apt.id === payment.apartment);
                      let commentText = payment.additional_info || "-";
                      try { const parsed = JSON.parse(commentText); commentText = parsed?.comments || commentText; } catch {}
                      return (
                        <TableRow key={payment.id} className={cn("hover:bg-muted/50", deletingPaymentId === payment.id && "opacity-50 cursor-not-allowed")}>
                          <TableCell className="font-medium">{getRowNumber(index)}</TableCell>
                          <TableCell>{apartment?.object_name || "-"}</TableCell>
                          <TableCell>{apartment?.room_number || `ID: ${payment.apartment}`}</TableCell>
                          <TableCell>{payment.user_fio || `ID: ${payment.user}`}</TableCell>
                          <TableCell className="capitalize">{payment.payment_type || "-"}</TableCell>
                          <TableCell className="text-right">${formatCurrency(payment.total_amount)}</TableCell>
                          <TableCell className="text-right font-semibold">${formatCurrency(payment.paid_amount)}</TableCell>
                          <TableCell>{formatDate(payment.payment_date)}</TableCell>
                          <TableCell className="max-w-[150px] truncate" title={commentText}>{commentText}</TableCell>
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

      {/* Add Payment Modal (unchanged) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader> <DialogTitle>Yangi To'lov Qo'shish</DialogTitle> <DialogDescription>(*) majburiy maydonlar.</DialogDescription> </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-4 custom-scrollbar">
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-apartment" className="text-right">Xonadon <span className="text-red-500">*</span></Label> <Select value={formData.apartment} onValueChange={(v) => handleSelectChange("apartment", v)} disabled={apartments.length === 0}> <SelectTrigger id="add-apartment" className="col-span-3"><SelectValue placeholder="Xonadonni tanlang..." /></SelectTrigger> <SelectContent> {apartments.sort((a, b) => (a.room_number || "").localeCompare(b.room_number || "", undefined, { numeric: true })).map((apt) => ( <SelectItem key={apt.id} value={apt.id.toString()} disabled={apt.status === 'sold'}> {apt.room_number} ({apt.object_name || "N/A"}) {apt.status && apt.status !== 'active' ? `[${apt.status}]` : ''} </SelectItem> ))} </SelectContent> </Select> </div>
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-user" className="text-right">Mijoz <span className="text-red-500">*</span></Label> <Select value={formData.user} onValueChange={(v) => handleSelectChange("user", v)} disabled={clients.length === 0}> <SelectTrigger id="add-user" className="col-span-3"><SelectValue placeholder="Mijozni tanlang..." /></SelectTrigger> <SelectContent> {clients.sort((a, b) => (a.fio || "").localeCompare(b.fio || "")).map((client) => ( <SelectItem key={client.id} value={client.id.toString()}> {client.fio} {client.phone_number ? `(${client.phone_number})` : ""} </SelectItem> ))} </SelectContent> </Select> </div>
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-payment_type" className="text-right">To'lov Turi <span className="text-red-500">*</span></Label> <Select value={formData.payment_type} onValueChange={(v) => handleSelectChange("payment_type", v)}> <SelectTrigger id="add-payment_type" className="col-span-3"><SelectValue placeholder="To'lov turini tanlang..." /></SelectTrigger> <SelectContent> <SelectItem value="naqd">Naqd</SelectItem> <SelectItem value="muddatli">Muddatli</SelectItem> <SelectItem value="ipoteka">Ipoteka</SelectItem> <SelectItem value="band">Band Qilish</SelectItem> </SelectContent> </Select> </div>
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-total_amount" className="text-right">Umumiy Summa <span className="text-red-500">*</span></Label> <Input id="add-total_amount" name="total_amount" type="number" min="0" step="0.01" value={formData.total_amount} onChange={handleFormChange} className="col-span-3" placeholder="Shartnoma umumiy summasi..."/> </div>
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-initial_payment" className="text-right">Boshlang'ich <span className="text-red-500">*</span></Label> <Input id="add-initial_payment" name="initial_payment" type="number" min="0" step="0.01" value={formData.initial_payment} onChange={handleFormChange} className="col-span-3" placeholder="Boshlang'ich to'lov..."/> </div>
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-paid_amount" className="text-right">To'landi (hozir) <span className="text-red-500">*</span></Label> <Input id="add-paid_amount" name="paid_amount" type="number" min="0" step="0.01" value={formData.paid_amount} onChange={handleFormChange} className="col-span-3" placeholder="Hozir to'lanayotgan summa..."/> </div>
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-payment_date" className="text-right">To'lov Sanasi <span className="text-red-500">*</span></Label> <Input id="add-payment_date" name="payment_date" type="date" value={formData.payment_date} onChange={handleFormChange} className="col-span-3"/> </div>
            {formData.payment_type === "muddatli" && ( <> <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-duration_months" className="text-right">Muddat (oy) <span className="text-red-500">*</span></Label> <Input id="add-duration_months" name="duration_months" type="number" min="1" value={formData.duration_months} onChange={handleFormChange} className="col-span-3" placeholder="Oylar soni..."/> </div> <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-due_date" className="text-right">To'lov Kuni <span className="text-red-500">*</span></Label> <Input id="add-due_date" name="due_date" type="number" min="1" max="31" value={formData.due_date} onChange={handleFormChange} className="col-span-3" placeholder="Har oyning kuni (1-31)..."/> </div> </>)}
            {formData.payment_type === "ipoteka" && ( <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-bank_name" className="text-right">Bank Nomi <span className="text-red-500">*</span></Label> <Input id="add-bank_name" name="bank_name" value={formData.bank_name} onChange={handleFormChange} className="col-span-3" placeholder="Bank nomini kiriting..."/> </div> )}
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-created_at" className="text-right">Yozuv Sanasi</Label> <Popover> <PopoverTrigger asChild> <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !formData.created_at && "text-muted-foreground")}> <CalendarIcon className="mr-2 h-4 w-4" /> {formData.created_at ? format(formData.created_at, "PPP", { locale: uz }) : <span>Sanani tanlang...</span>} </Button> </PopoverTrigger> <PopoverContent className="w-auto p-0" align="start"> <Calendar mode="single" selected={formData.created_at} onSelect={(d) => handleDateChange(d, 'created_at')} initialFocus locale={uz}/> </PopoverContent> </Popover> </div>
            <div className="grid grid-cols-4 items-start gap-4"> <Label htmlFor="add-additional_info" className="text-right">Izoh</Label> <Textarea id="add-additional_info" name="additional_info" value={formData.additional_info} onChange={handleFormChange} className="col-span-3" placeholder="Qo'shimcha ma'lumotlar..."/> </div>
          </div>
          <DialogFooter> <Button variant="outline" onClick={handleCloseModal} disabled={actionLoading}>Bekor Qilish</Button> <Button onClick={handleAddPayment} disabled={actionLoading}> {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yuklanmoqda...</> : "Saqlash"} </Button> </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Modal (unchanged) */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader> <DialogTitle>To'lov Izohini Tahrirlash</DialogTitle> <DialogDescription>ID: {editingPayment?.id}</DialogDescription> </DialogHeader>
          <div className="grid gap-4 py-4"> <div className="grid grid-cols-4 items-start gap-4"> <Label htmlFor="edit-additional_info" className="text-right pt-1">Izoh</Label> <Textarea id="edit-additional_info" name="additional_info" value={editFormData.additional_info} onChange={handleEditFormChange} className="col-span-3" placeholder="Izohni kiriting..."/> </div> </div>
          <DialogFooter> <Button variant="outline" onClick={handleCloseEditModal} disabled={actionLoading}>Bekor Qilish</Button> <Button onClick={handleUpdatePayment} disabled={actionLoading}> {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yuklanmoqda...</> : "Saqlash"} </Button> </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t py-4 px-4 text-center text-sm text-muted-foreground mt-auto">
        Version 1.0 | Barcha huquqlar ximoyalangan | Ushbu Dastur CDCGroup tomonidan yaratilgan | CraDev Company tomonidan qo'llab quvvatlanadi | since 2019
      </footer>
    </div>
  );
}