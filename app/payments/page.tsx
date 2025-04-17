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
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { format, parseISO, isValid } from "date-fns";
import { uz } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// API bazaviy URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://api.ahlan.uz";

// Interfeyslar
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
    payment_type?: string;
    total_amount?: string;
    initial_payment?: string;
    interest_rate?: number;
    duration_months?: number;
    monthly_payment?: string;
    due_date?: number;
    paid_amount: string;
    status: string;
    additional_info?: string | null;
    created_at: string;
    payment_date?: string | null;
    reservation_deadline?: string | null;
    bank_name?: string | null;
    documents?: Document[];
}

interface OverduePayment {
    month: string;
    amount: number;
    due_date: string;
}

interface Apartment {
    id: number;
    object: number;
    object_name: string;
    room_number: string;
    rooms?: number;
    area?: number;
    floor?: number;
    price?: string;
    status?: string;
    description?: string;
    secret_code?: string;
    balance?: string;
    total_amount?: string; // Jami narx
    overdue_payments?: OverduePayment[];
    total_overdue?: number;
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

export default function PaymentsPage() {
    const router = useRouter();

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

    // Form ma'lumotlari
    const initialFormData = useMemo(
        () => ({
            apartment: "",
            user: "",
            payment_type: "naqd",
            total_amount: "",
            initial_payment: "",
            paid_amount: "",
            duration_months: "",
            due_date: "",
            additional_info: "",
            created_at: new Date(),
        }),
        []
    );
    const [formData, setFormData] = useState(initialFormData);

    const initialEditFormData = useMemo(() => ({ additional_info: "" }), []);
    const [editFormData, setEditFormData] = useState(initialEditFormData);

    // Filtrlar
    const [filters, setFilters] = useState({
        status: "all",
        paymentType: "all",
        object: "all",
        apartment: "all",
        dueDate: "all",
        durationMonths: "all",
    });

    // Utility funksiyalar
    const getAuthHeaders = useCallback(() => {
        if (!accessToken) {
            toast({
                title: "Xatolik",
                description: "Avtorizatsiya tokeni topilmadi. Iltimos, qayta tizimga kiring.",
                variant: "destructive",
            });
            if (typeof window !== "undefined") {
                localStorage.removeItem("access_token");
                router.push("/login");
            }
            return null;
        }
        return {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        };
    }, [accessToken, router]);

    const formatCurrency = useCallback((amount: string | number | undefined | null) => {
        const num = Number(amount);
        if (isNaN(num)) return "0.00";
        return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, []);

    const formatDate = useCallback((dateString: string | undefined | null) => {
        if (!dateString) return "-";
        try {
            const date = parseISO(dateString);
            if (!isValid(date)) {
                const datePart = dateString.split("T")[0];
                return datePart || "-";
            }
            return format(date, "dd.MM.yyyy", { locale: uz });
        } catch (error) {
            console.error("Sana formatlashda xato:", error);
            const datePart = dateString.split("T")[0];
            return datePart || "-";
        }
    }, []);

    const getStatusBadge = useCallback((status: string | undefined | null) => {
        const lowerStatus = status?.toLowerCase() || "unknown";
        switch (lowerStatus) {
            case "paid":
            case "completed":
                return <Badge className="bg-green-600 hover:bg-green-700 text-white">To'langan</Badge>;
            case "pending":
                return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Kutilmoqda</Badge>;
            case "overdue":
                return <Badge className="bg-red-600 hover:bg-red-700 text-white">Muddati o'tgan</Badge>;
            default:
                return <Badge variant="secondary" className="capitalize">{status || "Noma'lum"}</Badge>;
        }
    }, []);

    // Ma'lumotlarni olish funksiyalari
    const fetchApiData = useCallback(
        async <T,>(url: string, token: string, setData: (data: T[]) => void, entityName: string): Promise<boolean> => {
            const headers = { Accept: "application/json", Authorization: `Bearer ${token}` };
            try {
                const response = await fetch(url, { headers });
                if (!response.ok) {
                    console.error(`${entityName} Error:`, response.status, await response.text().catch(() => ""));
                    if (response.status === 401) throw new Error("Unauthorized");
                    toast({
                        title: "Xatolik",
                        description: `${entityName} yuklashda muammo (${response.status}).`,
                        variant: "destructive",
                    });
                    setData([]);
                    return false;
                }
                const data = await response.json();
                let results = [];
                if (data.results) {
                    results = data.results;
                    let nextUrl = data.next;
                    while (nextUrl) {
                        const nextPageResponse = await fetch(nextUrl, { headers });
                        if (!nextPageResponse.ok) break;
                        const nextPageData = await nextPageResponse.json();
                        results = results.concat(nextPageData.results || []);
                        nextUrl = nextPageData.next;
                    }
                } else if (Array.isArray(data)) {
                    results = data;
                }
                setData(results);
                return true;
            } catch (error: any) {
                if (error.message !== "Unauthorized") {
                    console.error(`${entityName} yuklashda xato:`, error);
                    toast({
                        title: "Xatolik",
                        description: error.message || `${entityName} yuklashda noma'lum xatolik.`,
                        variant: "destructive",
                    });
                }
                setData([]);
                throw error;
            }
        },
        []
    );

    const fetchPayments = useCallback(
        async (token: string, currentFilters: typeof filters, isInitialLoad: boolean = false): Promise<boolean> => {
            if (!token) return false;
            if (!isInitialLoad) setPaymentsLoading(true);
            const headers = { Accept: "application/json", Authorization: `Bearer ${token}` };

            try {
                let url = `${API_BASE_URL}/payments/?ordering=-created_at&page_size=100`;
                const queryParams = new URLSearchParams();
                if (currentFilters.status !== "all") queryParams.append("status", currentFilters.status);
                if (currentFilters.paymentType !== "all") queryParams.append("payment_type", currentFilters.paymentType);
                if (currentFilters.apartment !== "all") queryParams.append("apartment", currentFilters.apartment);
                if (currentFilters.dueDate !== "all") queryParams.append("due_date", currentFilters.dueDate);
                if (currentFilters.durationMonths !== "all") queryParams.append("duration_months", currentFilters.durationMonths);
                const queryString = queryParams.toString();
                if (queryString) url += `&${queryString}`;

                const response = await fetch(url, { headers });
                if (!response.ok) {
                    if (response.status === 401) throw new Error("Unauthorized");
                    const errorData = await response.json().catch(() => ({ detail: "Server javobi xato." }));
                    throw new Error(`To'lovlarni olishda xatolik (${response.status}): ${errorData.detail || response.statusText}`);
                }
                const data = await response.json();
                setPayments(data.results || []);
                return true;
            } catch (error: any) {
                console.error("To'lovlarni olishda xato:", error);
                if (error.message === "Unauthorized") throw error;
                toast({
                    title: "Xatolik",
                    description: error.message || "To'lovlarni yuklashda muammo.",
                    variant: "destructive",
                });
                setPayments([]);
                return false;
            } finally {
                if (isInitialLoad) setLoading(false);
                setPaymentsLoading(false);
            }
        },
        []
    );

    // Xonadonlar uchun balance va overdue ma'lumotlarini olish
    const fetchApartmentDetails = useCallback(
        async (token: string, apartments: Apartment[]): Promise<Apartment[]> => {
            const headers = { Accept: "application/json", Authorization: `Bearer ${token}` };
            const updatedApartments = [...apartments];
            for (let i = 0; i < updatedApartments.length; i++) {
                try {
                    // Balans va jami narxni olish
                    const balanceResponse = await fetch(`${API_BASE_URL}/apartments/${updatedApartments[i].id}/get_total_payments/`, {
                        headers,
                    });
                    if (balanceResponse.ok) {
                        const data = await balanceResponse.json();
                        if (data && typeof data === 'object') {
                            updatedApartments[i].balance = String(data.balance || 0);
                            updatedApartments[i].total_amount = String(data.total_amount || 0);
                        } else {
                            updatedApartments[i].balance = "0";
                            updatedApartments[i].total_amount = updatedApartments[i].price || "0";
                        }
                    } else {
                        updatedApartments[i].balance = "0";
                        updatedApartments[i].total_amount = updatedApartments[i].price || "0";
                    }

                    // Muddati o'tgan to'lovlarni olish
                    const overdueResponse = await fetch(`${API_BASE_URL}/apartments/${updatedApartments[i].id}/overdue_payments/`, {
                        headers,
                    });
                    if (overdueResponse.ok) {
                        const overdueData = await overdueResponse.json();
                        updatedApartments[i].overdue_payments = overdueData?.overdue_payments || [];
                        updatedApartments[i].total_overdue = overdueData?.total_overdue || 0;
                    } else {
                        updatedApartments[i].overdue_payments = [];
                        updatedApartments[i].total_overdue = 0;
                    }
                } catch (error) {
                    console.error(`Xonadon ${updatedApartments[i].id} ma'lumotlarini olishda xato:`, error);
                    updatedApartments[i].balance = "0";
                    updatedApartments[i].total_amount = updatedApartments[i].price || "0";
                    updatedApartments[i].overdue_payments = [];
                    updatedApartments[i].total_overdue = 0;
                }
            }
            return updatedApartments;
        },
        []
    );

    const fetchCoreData = useCallback(
        async (token: string) => {
            setLoading(true);
            let success = true;
            try {
                const results = await Promise.allSettled([
                    fetchApiData<Apartment>(`${API_BASE_URL}/apartments/?page_size=1000`, token, (data) => {
                        // Balans va overdue ma'lumotlarini olish
                        fetchApartmentDetails(token, data).then((updatedApartments) => {
                            setApartments(updatedApartments);
                        });
                    }, "Xonadonlar"),
                    fetchApiData<Client>(`${API_BASE_URL}/users/?user_type=mijoz&page_size=1000`, token, setClients, "Mijozlar"),
                    fetchApiData<ObjectData>(`${API_BASE_URL}/objects/?page_size=1000`, token, setObjects, "Obyektlar"),
                ]);
                results.forEach((result) => {
                    if (result.status === "rejected") {
                        success = false;
                        if (result.reason?.message !== "Unauthorized") {
                            console.error("Core data fetch error:", result.reason);
                        }
                    }
                });
                if (success) {
                    const paymentsFetched = await fetchPayments(token, filters, true);
                    if (!paymentsFetched) success = false;
                } else {
                    setLoading(false);
                }
            } catch (error: any) {
                success = false;
                if (error.message === "Unauthorized") {
                    toast({
                        title: "Sessiya tugadi",
                        description: "Iltimos, qayta tizimga kiring.",
                        variant: "destructive",
                    });
                    if (typeof window !== "undefined") {
                        localStorage.removeItem("access_token");
                        router.push("/login");
                    }
                }
                setApartments([]);
                setClients([]);
                setObjects([]);
                setPayments([]);
                setLoading(false);
            }
        },
        [router, filters, fetchPayments, fetchApiData, fetchApartmentDetails]
    );

    // Filtrlangan xonadonlar
    const filteredApartments = useMemo(() => {
        let result = [...apartments];
        if (filters.object !== "all") {
            const objectId = parseInt(filters.object, 10);
            result = result.filter((apt) => apt.object === objectId);
        }
        if (filters.apartment !== "all") {
            const apartmentId = parseInt(filters.apartment, 10);
            result = result.filter((apt) => apt.id === apartmentId);
        }
        return result;
    }, [apartments, filters]);

    // Filtrlangan to'lovlar
    const filteredPayments = useMemo(() => {
        let result = [...payments];
        if (filters.paymentType !== "all") {
            result = result.filter((p) => p.payment_type?.toLowerCase() === filters.paymentType);
        }
        if (filters.status !== "all") {
            result = result.filter((p) => p.status.toLowerCase() === filters.status);
        }
        if (filters.object !== "all") {
            const objectId = parseInt(filters.object, 10);
            const apartmentIdsInObject = apartments.filter((apt) => apt.object === objectId).map((apt) => apt.id);
            result = result.filter((p) => apartmentIdsInObject.includes(p.apartment));
        }
        if (filters.apartment !== "all") {
            const apartmentId = parseInt(filters.apartment, 10);
            result = result.filter((p) => p.apartment === apartmentId);
        }
        if (filters.paymentType === "muddatli" && filters.dueDate !== "all") {
            const dueDate = parseInt(filters.dueDate, 10);
            result = result.filter((p) => p.due_date === dueDate);
        }
        if (filters.paymentType === "muddatli" && filters.durationMonths !== "all") {
            const duration = parseInt(filters.durationMonths, 10);
            result = result.filter((p) => p.duration_months === duration);
        }
        return result;
    }, [payments, apartments, filters]);

    // Statistika
    const statistics = useMemo(() => {
        let total_paid = 0;
        let total_overdue = 0;
        let total_remaining = 0;

        // To'langan va qoldiq summalarni hisoblash
        filteredPayments.forEach((payment) => {
            const paidAmount = parseFloat(payment.paid_amount || "0") || 0;
            const totalAmount = parseFloat(payment.total_amount || "0") || 0;
            const remainingAmount = totalAmount - paidAmount;
            
            total_paid += paidAmount;
            total_remaining += remainingAmount;
        });

        // Muddati o'tgan to'lovlarni hisoblash
        const filteredApartmentIds = new Set(filteredPayments.map(p => p.apartment));
        apartments
            .filter(apt => filteredApartmentIds.has(apt.id))
            .forEach((apartment) => {
                if (apartment.overdue_payments && Array.isArray(apartment.overdue_payments)) {
                    apartment.overdue_payments.forEach((overdue) => {
                        if (overdue && typeof overdue === 'object' && 'amount' in overdue) {
                            total_overdue += parseFloat(overdue.amount?.toString() || "0") || 0;
                        }
                    });
                }
            });

        return {
            total_paid,
            total_overdue,
            total_remaining
        };
    }, [filteredPayments, apartments]);

    // Qoldiqni hisoblash
    const getPaymentBalance = useCallback((payment: Payment) => {
        const totalAmount = parseFloat(payment.total_amount || "0");
        const paidAmount = parseFloat(payment.paid_amount || "0");
        return (totalAmount - paidAmount).toString();
    }, []);

    // Tartib raqami
    const getRowNumber = (index: number) => index + 1;

    // Unique due_date and duration_months for filters
    const uniqueDueDates = useMemo(() => {
        const dueDates = new Set<number>();
        payments
            .filter((p) => p.payment_type === "muddatli" && p.due_date != null)
            .forEach((p) => dueDates.add(p.due_date!));
        return Array.from(dueDates).sort((a, b) => a - b);
    }, [payments]);

    const uniqueDurationMonths = useMemo(() => {
        const durations = new Set<number>();
        payments
            .filter((p) => p.payment_type === "muddatli" && p.duration_months != null)
            .forEach((p) => durations.add(p.duration_months!));
        return Array.from(durations).sort((a, b) => a - b);
    }, [payments]);

    // useEffect Hooks
    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            router.push("/login");
        } else {
            setAccessToken(token);
        }
    }, [router]);

    useEffect(() => {
        if (accessToken) {
            fetchCoreData(accessToken);
        }
    }, [accessToken, fetchCoreData]);

    useEffect(() => {
        if (accessToken && !loading) {
            fetchPayments(accessToken, filters);
        }
    }, [accessToken, filters, loading, fetchPayments]);

    // Handler funksiyalar
    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
        setFormData(initialFormData);
    }, [initialFormData]);
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };
    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };
    const handleDateChange = (date: Date | undefined) => {
        if (date) setFormData((prev) => ({ ...prev, created_at: date }));
    };
    const handleOpenEditModal = (payment: Payment) => {
        setEditingPayment(payment);
        let additionalInfo = payment.additional_info || "";
        try {
            const parsed = JSON.parse(additionalInfo);
            additionalInfo = parsed.comments || "";
        } catch {
            // JSON emas bo'lsa, xom holda qoldiramiz
        }
        setEditFormData({ additional_info: additionalInfo });
        setIsEditModalOpen(true);
    };
    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
        setEditingPayment(null);
        setEditFormData(initialEditFormData);
    }, [initialEditFormData]);
    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setEditFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };
    const handleFilterChange = (value: string, field: keyof typeof filters) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
            ...(field === "object" && value !== prev.object && { apartment: "all" }),
            ...(field === "paymentType" && value !== "muddatli" && { dueDate: "all", durationMonths: "all" }),
        }));
    };
    const handleClearFilters = () => {
        setFilters({
            status: "all",
            paymentType: "all",
            object: "all",
            apartment: "all",
            dueDate: "all",
            durationMonths: "all",
        });
    };

    // Add Payment Handler
    const handleAddPayment = async () => {
        setActionLoading(true);
        const headers = getAuthHeaders();
        if (!headers) {
            setActionLoading(false);
            return;
        }
        if (
            !formData.apartment ||
            !formData.user ||
            !formData.total_amount ||
            !formData.initial_payment ||
            !formData.paid_amount ||
            (formData.payment_type === "muddatli" && (!formData.duration_months || !formData.due_date)) ||
            parseFloat(formData.paid_amount) < 0 ||
            parseFloat(formData.total_amount) <= 0 ||
            parseFloat(formData.initial_payment) < 0 ||
            (formData.payment_type === "muddatli" &&
                (parseInt(formData.duration_months || "0") <= 0 ||
                    parseInt(formData.due_date || "0") < 1 ||
                    parseInt(formData.due_date || "0") > 31))
        ) {
            toast({
                title: "Xatolik",
                description: "Majburiy maydonlarni to'ldiring va to'g'ri qiymatlar kiriting.",
                variant: "destructive",
            });
            setActionLoading(false);
            return;
        }
        const totalAmount = parseFloat(formData.total_amount);
        const initialPayment = parseFloat(formData.initial_payment);
        const paidAmount = parseFloat(formData.paid_amount);
        const durationMonths = parseInt(formData.duration_months || "0");
        const remainingAmount = totalAmount - initialPayment;
        const monthlyPayment = durationMonths > 0 ? remainingAmount / durationMonths : 0;
        const status = paidAmount >= initialPayment ? "paid" : "pending";
        const paymentData = {
            apartment: parseInt(formData.apartment, 10),
            user: parseInt(formData.user, 10),
            payment_type: formData.payment_type,
            total_amount: formData.total_amount,
            initial_payment: formData.initial_payment,
            paid_amount: formData.paid_amount,
            duration_months: formData.payment_type === "muddatli" ? durationMonths : null,
            monthly_payment: formData.payment_type === "muddatli" ? monthlyPayment.toFixed(2) : null,
            due_date: formData.payment_type === "muddatli" ? parseInt(formData.due_date) : null,
            additional_info: formData.additional_info.trim()
                ? JSON.stringify({ comments: formData.additional_info.trim() })
                : null,
            created_at: format(formData.created_at, "yyyy-MM-dd"),
            status: status,
        };
        try {
            const response = await fetch(`${API_BASE_URL}/payments/`, {
                method: "POST",
                headers,
                body: JSON.stringify(paymentData),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: "Server javobini o'qishda xato." }));
                throw new Error(`To'lov qo'shishda xatolik (${response.status}): ${errorData.detail || response.statusText}`);
            }
            const newPayment = await response.json();

            // Update apartment status
            const apartmentId = parseInt(formData.apartment, 10);
            const apartment = apartments.find(apt => apt.id === apartmentId);
            if (apartment) {
                const newStatus = formData.payment_type === "band" ? "band" : "sotilgan";
                const updateResponse = await fetch(`${API_BASE_URL}/apartments/${apartmentId}/`, {
                    method: "PATCH",
                    headers,
                    body: JSON.stringify({ status: newStatus }),
                });
                if (!updateResponse.ok) {
                    throw new Error("Xonadon holatini yangilashda xatolik yuz berdi");
                }
            }

            toast({
                title: "Muvaffaqiyat!",
                description: "Yangi to'lov qo'shildi va xonadon holati yangilandi.",
            });

            // Redirect to apartment detail page
            router.push(`/apartments/${apartmentId}`);

            if (accessToken) {
                await fetchPayments(accessToken, filters);
                const updatedApartments = await fetchApartmentDetails(accessToken, apartments);
                setApartments(updatedApartments);
            }
            handleCloseModal();
        } catch (error: any) {
            console.error("Add payment error:", error);
            toast({
                title: "Xatolik",
                description: error.message || "To'lov qo'shishda xato.",
                variant: "destructive",
            });
        } finally {
            setActionLoading(false);
        }
    };

    // Update Payment Handler
    const handleUpdatePayment = async () => {
        if (!editingPayment) return;
        setActionLoading(true);
        const headers = getAuthHeaders();
        if (!headers) {
            setActionLoading(false);
            return;
        }
        const updatedData = {
            additional_info: editFormData.additional_info.trim()
                ? JSON.stringify({ comments: editFormData.additional_info.trim() })
                : null,
        };
        try {
            const response = await fetch(`${API_BASE_URL}/payments/${editingPayment.id}/`, {
                method: "PATCH",
                headers,
                body: JSON.stringify(updatedData),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: "Server javobini o'qishda xato." }));
                throw new Error(`To'lovni yangilashda xatolik (${response.status}): ${errorData.detail || response.statusText}`);
            }
            toast({
                title: "Muvaffaqiyat!",
                description: `To'lov (ID: ${editingPayment.id}) izohi yangilandi.`,
            });
            if (accessToken) await fetchPayments(accessToken, filters);
            handleCloseEditModal();
        } catch (error: any) {
            console.error("Update payment error:", error);
            toast({
                title: "Xatolik",
                description: error.message || "To'lovni yangilashda xato.",
                variant: "destructive",
            });
        } finally {
            setActionLoading(false);
        }
    };

    // Delete Payment Handler
    const handleDeletePayment = async (paymentId: number) => {
        if (deletingPaymentId === paymentId) return;
        if (!window.confirm(`ID ${paymentId} to'lov yozuvini o'chirishni tasdiqlaysizmi? Bu amalni orqaga qaytarib bo'lmaydi.`)) return;
        setDeletingPaymentId(paymentId);
        setActionLoading(true);
        const headers = getAuthHeaders();
        if (!headers) {
            setDeletingPaymentId(null);
            setActionLoading(false);
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/`, {
                method: "DELETE",
                headers,
            });
            if (!response.ok && response.status !== 204) {
                const errorData = await response.json().catch(() => ({ detail: "Server javobini o'qishda xato." }));
                throw new Error(`To'lovni o'chirishda xatolik (${response.status}): ${errorData.detail || response.statusText}`);
            }
            toast({
                title: "Muvaffaqiyat!",
                description: `To'lov (ID: ${paymentId}) o'chirildi.`,
            });
            setPayments((prev) => prev.filter((p) => p.id !== paymentId));
            if (accessToken) {
                const updatedApartments = await fetchApartmentDetails(accessToken, apartments);
                setApartments(updatedApartments);
            }
        } catch (error: any) {
            console.error("Delete payment error:", error);
            toast({
                title: "Xatolik",
                description: error.message || "To'lovni o'chirishda xato.",
                variant: "destructive",
            });
        } finally {
            setDeletingPaymentId(null);
            setActionLoading(false);
        }
    };

    // Filtered apartments for the select dropdown
    const filteredApartmentsForSelect = useMemo(() => {
        if (filters.object === "all") {
            return [...apartments].sort((a, b) => (a.room_number || "").localeCompare(b.room_number || ""));
        }
        return apartments
            .filter((apt) => apt.object != null && apt.object.toString() === filters.object)
            .sort((a, b) => (a.room_number || "").localeCompare(b.room_number || ""));
    }, [apartments, filters.object]);

    // --- Render qismi ---
    if (loading) {
        return (
            <div className="flex min-h-screen flex-col">
                <div className="border-b sticky top-0 bg-background z-10">
                    <div className="flex h-16 items-center px-4">
                        <MainNav className="mx-6" />
                        <div className="ml-auto flex items-center space-x-4">
                            <Search />
                            <UserNav />
                        </div>
                    </div>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="mr-2 h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">Ma'lumotlar yuklanmoqda...</p>
                </div>
                <footer className="border-t py-4 px-4 text-center text-sm text-muted-foreground mt-auto">
                    Version 1.0 | Barcha huquqlar ximoyalangan | Ushbu Dastur CDCGroup tomonidan yaratilgan | CraDev Company tomonidan qo'llab quvvatlanadi | since 2019
                </footer>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col">
            {/* Header */}
            <div className="border-b sticky top-0 bg-background z-10">
                <div className="flex h-16 items-center px-4">
                    <MainNav className="mx-6" />
                    <div className="ml-auto flex items-center space-x-4">
                        <Search />
                        <UserNav />
                    </div>
                </div>
            </div>

            {/* Asosiy kontent */}
            <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
                {/* Sarlavha va yangi to'lov qo'shish tugmasi */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                    <h2 className="text-3xl font-bold tracking-tight">To'lovlar</h2>
                    <Button onClick={handleOpenModal} disabled={actionLoading}>
                        <CreditCard className="mr-2 h-4 w-4" /> Yangi To'lov
                    </Button>
                </div>

                {/* Statistika kartalari */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Jami To'langan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(statistics.total_paid)}</div>
                            <p className="text-xs text-muted-foreground">Filtr bo'yicha jami to'langan summa</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Jami Qoldiq</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{formatCurrency(statistics.total_remaining)}</div>
                            <p className="text-xs text-muted-foreground">Filtr bo'yicha jami qoldiq summa</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Muddati O'tgan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{formatCurrency(statistics.total_overdue)}</div>
                            <p className="text-xs text-muted-foreground">Filtr bo'yicha muddati o'tgan summa</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filtrlar paneli */}
                <div className="flex flex-wrap gap-4 items-center p-4 border rounded-md bg-card">
                    <Select
                        value={filters.object}
                        onValueChange={(v) => handleFilterChange(v, "object")}
                        disabled={paymentsLoading || actionLoading || objects.length === 0}
                    >
                        <SelectTrigger className="w-full sm:w-auto flex-grow min-w-[150px]">
                            <SelectValue placeholder="Obyekt bo'yicha" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Barcha Obyektlar</SelectItem>
                            {objects.map((obj) => (
                                <SelectItem key={obj.id} value={obj.id.toString()}>
                                    {obj.name}
                                </SelectItem>
                            ))}
                            {objects.length === 0 && <p className="p-2 text-sm text-muted-foreground">Obyektlar topilmadi</p>}
                        </SelectContent>
                    </Select>
                    <Select
                        value={filters.status}
                        onValueChange={(v) => handleFilterChange(v, "status")}
                        disabled={paymentsLoading || actionLoading}
                    >
                        <SelectTrigger className="w-full sm:w-auto flex-grow min-w-[150px]">
                            <SelectValue placeholder="Holati bo'yicha" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Barcha Holatlar</SelectItem>
                            <SelectItem value="paid">To'langan</SelectItem>
                            <SelectItem value="pending">Kutilmoqda</SelectItem>
                            <SelectItem value="overdue">Muddati o'tgan</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select
                        value={filters.paymentType}
                        onValueChange={(v) => handleFilterChange(v, "paymentType")}
                        disabled={paymentsLoading || actionLoading}
                    >
                        <SelectTrigger className="w-full sm:w-auto flex-grow min-w-[150px]">
                            <SelectValue placeholder="To'lov turi bo'yicha" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Barcha Turlar</SelectItem>
                            <SelectItem value="muddatli">Muddatli</SelectItem>
                            <SelectItem value="naqd">Naqd</SelectItem>
                            <SelectItem value="ipoteka">Ipoteka</SelectItem>
                            <SelectItem value="band">Band</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select
                        value={filters.apartment}
                        onValueChange={(v) => handleFilterChange(v, "apartment")}
                        disabled={
                            paymentsLoading ||
                            actionLoading ||
                            (filteredApartmentsForSelect.length === 0 && filters.object !== "all")
                        }
                    >
                        <SelectTrigger className="w-full sm:w-auto flex-grow min-w-[180px]">
                            <SelectValue placeholder="Xonadon bo'yicha" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Barcha Xonadonlar</SelectItem>
                            {filteredApartmentsForSelect.map((apt) => (
                                <SelectItem key={apt.id} value={apt.id.toString()}>
                                    {apt.room_number} {filters.object === "all" ? `(${apt.object_name || "N/A"})` : ""}
                                </SelectItem>
                            ))}
                            {filteredApartmentsForSelect.length === 0 && filters.object !== "all" && (
                                <p className="p-2 text-sm text-muted-foreground">Tanlangan obyektda xonadon yo'q</p>
                            )}
                            {apartments.length === 0 && filters.object === "all" && (
                                <p className="p-2 text-sm text-muted-foreground">Xonadonlar yuklanmagan</p>
                            )}
                        </SelectContent>
                    </Select>
                    {filters.paymentType === "muddatli" && (
                        <>
                            <Select
                                value={filters.dueDate}
                                onValueChange={(v) => handleFilterChange(v, "dueDate")}
                                disabled={paymentsLoading || actionLoading || uniqueDueDates.length === 0}
                            >
                                <SelectTrigger className="w-full sm:w-auto flex-grow min-w-[180px]">
                                    <SelectValue placeholder="To'lov sanasi bo'yicha" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Barcha Sanalar</SelectItem>
                                    {uniqueDueDates.map((due) => (
                                        <SelectItem key={due} value={due.toString()}>
                                            Har oyning {due}-kuni
                                        </SelectItem>
                                    ))}
                                    {uniqueDueDates.length === 0 && (
                                        <p className="p-2 text-sm text-muted-foreground">To'lov sanasi topilmadi</p>
                                    )}
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.durationMonths}
                                onValueChange={(v) => handleFilterChange(v, "durationMonths")}
                                disabled={paymentsLoading || actionLoading || uniqueDurationMonths.length === 0}
                            >
                                <SelectTrigger className="w-full sm:w-auto flex-grow min-w-[150px]">
                                    <SelectValue placeholder="Muddat bo'yicha" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Barcha Muddatlar</SelectItem>
                                    {uniqueDurationMonths.map((duration) => (
                                        <SelectItem key={duration} value={duration.toString()}>
                                            {duration} oy
                                        </SelectItem>
                                    ))}
                                    {uniqueDurationMonths.length === 0 && (
                                        <p className="p-2 text-sm text-muted-foreground">Muddatlar topilmadi</p>
                                    )}
                                </SelectContent>
                            </Select>
                        </>
                    )}
                    <Button
                        variant="outline"
                        onClick={handleClearFilters}
                        disabled={
                            paymentsLoading ||
                            actionLoading ||
                            (filters.status === "all" &&
                                filters.paymentType === "all" &&
                                filters.object === "all" &&
                                filters.apartment === "all" &&
                                filters.dueDate === "all" &&
                                filters.durationMonths === "all")
                        }
                        className="flex-shrink-0"
                    >
                        Tozalash
                    </Button>
                </div>

                {/* To'lovlar jadvali */}
                <Card>
                    <CardHeader>
                        <CardTitle>To'lovlar Ro'yxati</CardTitle>
                        <CardDescription>Mavjud to'lov yozuvlari.</CardDescription>
                    </CardHeader>
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
                                        <TableHead className="text-right">To'langan Summa</TableHead>
                                        <TableHead className="text-right">Qoldiq</TableHead>
                                        <TableHead>Sana</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paymentsLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={14} className="h-24 text-center">
                                                <div className="flex justify-center items-center">
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yuklanmoqda...
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredPayments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={14} className="h-24 text-center">
                                                Tanlangan filtrlar bo'yicha to'lovlar topilmadi.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredPayments.map((payment, index) => {
                                            const apartment = apartments.find((apt) => apt.id === payment.apartment);
                                            return (
                                                <TableRow
                                                    key={payment.id}
                                                    className={cn("hover:bg-muted/50", deletingPaymentId === payment.id && "opacity-50")}
                                                >
                                                    <TableCell className="font-medium">{getRowNumber(index)}</TableCell>
                                                    <TableCell>{apartment?.object_name || "-"}</TableCell>
                                                    <TableCell>{payment.apartment_info || apartment?.room_number || `ID: ${payment.apartment}`}</TableCell>
                                                    <TableCell>{payment.user_fio || `ID: ${payment.user}`}</TableCell>
                                                    <TableCell className="capitalize">{payment.payment_type || "-"}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(payment.total_amount)}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(payment.paid_amount)}</TableCell>
                                                    <TableCell className="text-right font-semibold text-red-600">
                                                        {formatCurrency(getPaymentBalance(payment))}
                                                    </TableCell>
                                                    <TableCell>{formatDate(payment.created_at)}</TableCell>
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

            {/* Yangi to'lov qo'shish modal oynasi */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Yangi To'lov Qo'shish</DialogTitle>
                        <DialogDescription>
                            (*) majburiy maydonlar. Muddatli to'lov uchun to'liq ma'lumot kiriting.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="apartment" className="text-right">
                                Xonadon <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.apartment}
                                onValueChange={(v) => handleSelectChange("apartment", v)}
                                disabled={apartments.length === 0}
                            >
                                <SelectTrigger id="apartment" className="col-span-3">
                                    <SelectValue placeholder="Xonadonni tanlang..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {apartments
                                        .sort((a, b) => (a.room_number || "").localeCompare(b.room_number || ""))
                                        .map((apt) => (
                                            <SelectItem key={apt.id} value={apt.id.toString()}>
                                                {apt.room_number} ({apt.object_name || "N/A"})
                                            </SelectItem>
                                        ))}
                                    {apartments.length === 0 && (
                                        <p className="p-2 text-sm text-muted-foreground">Xonadonlar topilmadi</p>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="user" className="text-right">
                                Mijoz <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.user}
                                onValueChange={(v) => handleSelectChange("user", v)}
                                disabled={clients.length === 0}
                            >
                                <SelectTrigger id="user" className="col-span-3">
                                    <SelectValue placeholder="Mijozni tanlang..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients
                                        .sort((a, b) => (a.fio || "").localeCompare(b.fio || ""))
                                        .map((client) => (
                                            <SelectItem key={client.id} value={client.id.toString()}>
                                                {client.fio} {client.phone_number ? `(${client.phone_number})` : ""}
                                            </SelectItem>
                                        ))}
                                    {clients.length === 0 && (
                                        <p className="p-2 text-sm text-muted-foreground">Mijozlar topilmadi</p>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="payment_type" className="text-right">
                                To'lov Turi <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.payment_type}
                                onValueChange={(v) => handleSelectChange("payment_type", v)}
                            >
                                <SelectTrigger id="payment_type" className="col-span-3">
                                    <SelectValue placeholder="To'lov turini tanlang..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="muddatli">Muddatli</SelectItem>
                                    <SelectItem value="naqd">Naqd</SelectItem>
                                    <SelectItem value="ipoteka">Ipoteka</SelectItem>
                                    <SelectItem value="band">Band</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="total_amount" className="text-right">
                                Umumiy Summa <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="total_amount"
                                name="total_amount"
                                type="number"
                                value={formData.total_amount}
                                onChange={handleFormChange}
                                className="col-span-3"
                                placeholder="Umumiy summatni kiriting..."
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="initial_payment" className="text-right">
                                Boshlang'ich To'lov <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="initial_payment"
                                name="initial_payment"
                                type="number"
                                value={formData.initial_payment}
                                onChange={handleFormChange}
                                className="col-span-3"
                                placeholder="Boshlang'ich to'lov summasi..."
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="paid_amount" className="text-right">
                                To'langan Summa <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="paid_amount"
                                name="paid_amount"
                                type="number"
                                value={formData.paid_amount}
                                onChange={handleFormChange}
                                className="col-span-3"
                                placeholder="To'langan summatni kiriting..."
                            />
                        </div>
                        {formData.payment_type === "muddatli" && (
                            <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="duration_months" className="text-right">
                                        Muddat (oy) <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="duration_months"
                                        name="duration_months"
                                        type="number"
                                        value={formData.duration_months}
                                        onChange={handleFormChange}
                                        className="col-span-3"
                                        placeholder="To'lov muddatini oylar bo'yicha kiriting..."
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="due_date" className="text-right">
                                        To'lov Sanasi <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="due_date"
                                        name="due_date"
                                        type="number"
                                        value={formData.due_date}
                                        onChange={handleFormChange}
                                        className="col-span-3"
                                        placeholder="Har oyning nechinchi kuni (1-31)..."
                                    />
                                </div>
                            </>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="created_at" className="text-right">
                                Sana
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "col-span-3 justify-start text-left font-normal",
                                            !formData.created_at && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.created_at ? (
                                            format(formData.created_at, "PPP", { locale: uz })
                                        ) : (
                                            <span>Sanani tanlang...</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={formData.created_at}
                                        onSelect={handleDateChange}
                                        initialFocus
                                        locale={uz}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="additional_info" className="text-right">
                                Izoh
                            </Label>
                            <Textarea
                                id="additional_info"
                                name="additional_info"
                                value={formData.additional_info}
                                onChange={handleFormChange}
                                className="col-span-3"
                                placeholder="Qo'shimcha ma'lumotlar..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseModal} disabled={actionLoading}>
                            Bekor Qilish
                        </Button>
                        <Button onClick={handleAddPayment} disabled={actionLoading}>
                            {actionLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yuklanmoqda...
                                </>
                            ) : (
                                "Saqlash"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* To'lovni tahrirlash modal oynasi */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>To'lov Izohini Tahrirlash</DialogTitle>
                        <DialogDescription>ID: {editingPayment?.id}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="additional_info" className="text-right">
                                Izoh
                            </Label>
                            <Textarea
                                id="additional_info"
                                name="additional_info"
                                value={editFormData.additional_info}
                                onChange={handleEditFormChange}
                                className="col-span-3"
                                placeholder="Izohni kiriting..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseEditModal} disabled={actionLoading}>
                            Bekor Qilish
                        </Button>
                        <Button onClick={handleUpdatePayment} disabled={actionLoading}>
                            {actionLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yuklanmoqda...
                                </>
                            ) : (
                                "Saqlash"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Footer */}
            <footer className="border-t py-4 px-4 text-center text-sm text-muted-foreground mt-auto">
                Version 1.0 | Barcha huquqlar ximoyalangan | Ushbu Dastur CDCGroup tomonidan yaratilgan | CraDev Company tomonidan qo'llab quvvatlanadi | since 2019
            </footer>
        </div>
    );
}