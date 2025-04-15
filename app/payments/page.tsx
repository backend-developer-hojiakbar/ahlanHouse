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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://api.ahlan.uz";

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
    documents?: Document[];
    reservation_deadline?: string | null;
    bank_name?: string | null;
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

    const initialFormData = useMemo(() => ({
        apartment: "", user: "", paid_amount: "", additional_info: "", created_at: new Date(),
    }), []);
    const [formData, setFormData] = useState(initialFormData);

    const initialEditFormData = useMemo(() => ({ additional_info: "" }), []);
    const [editFormData, setEditFormData] = useState(initialEditFormData);

    const [filters, setFilters] = useState({
        status: "all", object: "all", apartment: "all",
    });

    // Utility funksiyalar
    const getAuthHeaders = useCallback(() => {
        if (!accessToken) {
            toast({ title: "Xatolik", description: "Avtorizatsiya tokeni topilmadi. Iltimos, qayta tizimga kiring.", variant: "destructive" });
            if (typeof window !== "undefined") { localStorage.removeItem("access_token"); router.push("/login"); }
            return null;
        }
        return { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` };
    }, [accessToken, router]);

    const formatCurrency = useCallback((amount: string | number | undefined | null) => {
        const num = Number(amount);
        if (isNaN(num)) return "$ 0.00";
        return num.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, []);

    const formatDate = useCallback((dateString: string | undefined | null) => {
        if (!dateString) return "-";
        try {
            const date = parseISO(dateString);
            if (!isValid(date)) { const datePart = dateString.split("T")[0]; return datePart || "-"; }
            return format(date, "dd.MM.yyyy", { locale: uz });
        } catch (error) { console.error("Sana formatlashda xato:", error); const datePart = dateString.split("T")[0]; return datePart || "-"; }
    }, []);

    const getStatusBadge = useCallback((status: string | undefined | null) => {
        const lowerStatus = status?.toLowerCase() || "unknown";
        switch (lowerStatus) {
            case "paid": return <Badge className="bg-green-600 hover:bg-green-700 text-white">To‘langan</Badge>;
            case "pending": return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Kutilmoqda</Badge>;
            case "overdue": return <Badge className="bg-red-600 hover:bg-red-700 text-white">Muddati o‘tgan</Badge>;
            default: return <Badge variant="secondary">{status || "Noma'lum"}</Badge>;
        }
    }, []);

    // Ma'lumotlarni olish
    const fetchApiData = useCallback(async <T,>(url: string, token: string, setData: (data: T[]) => void, entityName: string): Promise<boolean> => {
        const headers = { Accept: "application/json", Authorization: `Bearer ${token}` };
        try {
            const response = await fetch(url, { headers });
            if (!response.ok) {
                console.error(`${entityName} Error:`, response.status, await response.text().catch(() => ''));
                if (response.status === 401) throw new Error("Unauthorized");
                toast({ title: "Xatolik", description: `${entityName} yuklashda muammo (${response.status}).`, variant: "destructive" });
                setData([]);
                return false;
            }
            const data = await response.json();
            setData(data.results || []);
            return true;
        } catch (error: any) {
            if (error.message !== "Unauthorized") {
                console.error(`${entityName} yuklashda xato:`, error);
                toast({ title: "Xatolik", description: error.message || `${entityName} yuklashda noma'lum xatolik.`, variant: "destructive" });
            }
            setData([]);
            throw error;
        }
    }, []);

    const fetchPayments = useCallback(
        async (token: string, currentFilters: typeof filters, isInitialLoad: boolean = false): Promise<boolean> => {
            if (!isInitialLoad) setPaymentsLoading(true);
            const headers = { Accept: "application/json", Authorization: `Bearer ${token}` };
            if (!headers.Authorization) return false;

            try {
                let url = `${API_BASE_URL}/payments/?ordering=-created_at&page_size=100`;
                const queryParams = new URLSearchParams();
                if (currentFilters.status !== "all") queryParams.append("status", currentFilters.status);
                if (currentFilters.apartment !== "all") queryParams.append("apartment", currentFilters.apartment);

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
                toast({ title: "Xatolik", description: error.message || "To'lovlarni yuklashda muammo.", variant: "destructive" });
                setPayments([]);
                return false;
            } finally {
                if (isInitialLoad) setLoading(false);
                setPaymentsLoading(false);
            }
        },
        []
    );

    const fetchCoreData = useCallback(async (token: string) => {
        setLoading(true);
        let success = true;
        try {
            const results = await Promise.allSettled([
                fetchApiData<Apartment>(`${API_BASE_URL}/apartments/?page_size=1000`, token, setApartments, 'Xonadonlar'),
                fetchApiData<Client>(`${API_BASE_URL}/users/?page_size=1000`, token, setClients, 'Mijozlar'),
                fetchApiData<ObjectData>(`${API_BASE_URL}/objects/?page_size=1000`, token, setObjects, 'Obyektlar'),
            ]);

            results.forEach(result => {
                if (result.status === 'rejected') {
                    success = false;
                    if (result.reason?.message !== 'Unauthorized') {
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
                toast({ title: "Sessiya tugadi", description: "Iltimos, qayta tizimga kiring.", variant: "destructive" });
                localStorage.removeItem("access_token");
                router.push("/login");
            }
            setApartments([]); setClients([]); setObjects([]); setPayments([]);
            setLoading(false);
        }
    }, [router, filters, fetchPayments, fetchApiData]);

    // Frontendda filtrlangan to‘lovlar
    const filteredPayments = useMemo(() => {
        let result = payments;

        // Status bo‘yicha filtr
        if (filters.status !== "all") {
            result = result.filter(p => p.status.toLowerCase() === filters.status);
        }

        // Obyekt bo‘yicha filtr
        if (filters.object !== "all") {
            const objectId = parseInt(filters.object, 10);
            const objectApartments = apartments.filter(apt => apt.object === objectId).map(apt => apt.id);
            result = result.filter(p => objectApartments.includes(p.apartment));
        }

        // Xonadon bo‘yicha filtr
        if (filters.apartment !== "all") {
            const apartmentId = parseInt(filters.apartment, 10);
            result = result.filter(p => p.apartment === apartmentId);
        }

        return result;
    }, [payments, apartments, filters]);

    // Statistika
    const statistics = useMemo(() => {
        let total_paid = 0, total_pending = 0, total_overdue = 0;
        filteredPayments.forEach(p => {
            const amount = parseFloat(p.paid_amount) || 0;
            switch (p.status?.toLowerCase()) {
                case "paid": total_paid += amount; break;
                case "pending": total_pending += amount; break;
                case "overdue": total_overdue += amount; break;
            }
        });
        return { total_payments: filteredPayments.length, total_paid, total_pending, total_overdue };
    }, [filteredPayments]);

    // Tartib raqami
    const getRowNumber = (index: number) => index + 1;

    // useEffect Hooks
    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) router.push("/login"); else setAccessToken(token);
    }, [router]);

    useEffect(() => {
        if (accessToken) fetchCoreData(accessToken);
    }, [accessToken, fetchCoreData]);

    useEffect(() => {
        if (accessToken && !loading) fetchPayments(accessToken, filters);
    }, [accessToken, filters.status, filters.apartment, loading, fetchPayments]);

    // Handler funksiyalar
    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = useCallback(() => { setIsModalOpen(false); setFormData(initialFormData); }, [initialFormData]);
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSelectChange = (name: string, value: string) => setFormData(prev => ({ ...prev, [name]: value }));
    const handleDateChange = (date: Date | undefined) => { if (date) setFormData(prev => ({ ...prev, created_at: date })); };

    const handleAddPayment = async () => {
        setActionLoading(true);
        const headers = getAuthHeaders(); if (!headers) { setActionLoading(false); return; }
        if (!formData.apartment || !formData.user || !formData.paid_amount || parseFloat(formData.paid_amount) <= 0) {
            toast({ title: "Xatolik", description: "Majburiy (*) maydonlarni to'ldiring va summa musbat bo'lsin.", variant: "destructive" });
            setActionLoading(false); return;
        }
        const paymentData = {
            apartment: parseInt(formData.apartment, 10), user: parseInt(formData.user, 10),
            paid_amount: formData.paid_amount, payment_type: "naqd",
            additional_info: formData.additional_info.trim() || null,
            created_at: format(formData.created_at, "yyyy-MM-dd'T'HH:mm:ss"),
            status: "paid",
        };
        try {
            const response = await fetch(`${API_BASE_URL}/payments/`, { method: "POST", headers, body: JSON.stringify(paymentData) });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: "Server javobini o'qishda xato." }));
                throw new Error(`To'lov qo'shishda xatolik (${response.status}): ${errorData.detail || response.statusText}`);
            }
            toast({ title: "Muvaffaqiyat!", description: "Yangi to'lov qo'shildi." });
            if (accessToken) await fetchPayments(accessToken, filters);
            handleCloseModal();
        } catch (error: any) { toast({ title: "Xatolik", description: error.message || "To'lov qo'shishda xato.", variant: "destructive" });
        } finally { setActionLoading(false); }
    };

    const handleOpenEditModal = (payment: Payment) => { setEditingPayment(payment); setEditFormData({ additional_info: payment.additional_info || "" }); setIsEditModalOpen(true); };
    const handleCloseEditModal = useCallback(() => { setIsEditModalOpen(false); setEditingPayment(null); setEditFormData(initialEditFormData); }, [initialEditFormData]);
    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleUpdatePayment = async () => {
        if (!editingPayment) return;
        setActionLoading(true);
        const headers = getAuthHeaders(); if (!headers) { setActionLoading(false); return; }
        const updatedData = { additional_info: editFormData.additional_info.trim() || null };
        try {
            const response = await fetch(`${API_BASE_URL}/payments/${editingPayment.id}/`, { method: "PATCH", headers, body: JSON.stringify(updatedData) });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: "Server javobini o'qishda xato." }));
                throw new Error(`To'lovni yangilashda xatolik (${response.status}): ${errorData.detail || response.statusText}`);
            }
            toast({ title: "Muvaffaqiyat!", description: `To'lov (ID: ${editingPayment.id}) izohi yangilandi.` });
            if (accessToken) await fetchPayments(accessToken, filters);
            handleCloseEditModal();
        } catch (error: any) { toast({ title: "Xatolik", description: error.message || "To'lovni yangilashda xato.", variant: "destructive" });
        } finally { setActionLoading(false); }
    };

    const handleDeletePayment = async (paymentId: number) => {
        if (deletingPaymentId === paymentId) return;
        if (!window.confirm(`ID ${paymentId} to'lovni o'chirishni tasdiqlaysizmi?`)) return;
        setDeletingPaymentId(paymentId); setActionLoading(true); const headers = getAuthHeaders(); if (!headers) { setDeletingPaymentId(null); setActionLoading(false); return; }
        try {
            const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/`, { method: "DELETE", headers });
            if (!response.ok && response.status !== 204) {
                const errorData = await response.json().catch(() => ({ detail: "Server javobini o'qishda xato." }));
                throw new Error(`To'lovni o'chirishda xatolik (${response.status}): ${errorData.detail || response.statusText}`);
            }
            toast({ title: "Muvaffaqiyat!", description: `To'lov (ID: ${paymentId}) o'chirildi.` });
            setPayments(prev => prev.filter(p => p.id !== paymentId));
        } catch (error: any) { toast({ title: "Xatolik", description: error.message || "To'lovni o'chirishda xato.", variant: "destructive" });
        } finally { setDeletingPaymentId(null); setActionLoading(false); }
    };

    const handleFilterChange = (value: string, field: keyof typeof filters) => {
        setFilters(prev => ({ ...prev, [field]: value, ...(field === 'object' && value !== prev.object && { apartment: "all" }) }));
    };
    const handleClearFilters = () => setFilters({ status: "all", object: "all", apartment: "all" });

    const filteredApartmentsForSelect = useMemo(() => {
        if (filters.object === 'all') {
            return [...apartments].sort((a, b) => (a.room_number || '').localeCompare(b.room_number || ''));
        }
        return apartments
            .filter(apt => apt.object != null && apt.object.toString() === filters.object)
            .sort((a, b) => (a.room_number || '').localeCompare(b.room_number || ''));
    }, [apartments, filters.object]);

    // Render
    if (loading) {
        return (
            <div className="flex min-h-screen flex-col">
                <div className="border-b sticky top-0 bg-background z-10"><div className="flex h-16 items-center px-4"><MainNav className="mx-6" /><div className="ml-auto flex items-center space-x-4"><Search /><UserNav /></div></div></div>
                <div className="flex flex-1 items-center justify-center"><Loader2 className="mr-2 h-8 w-8 animate-spin text-muted-foreground" /><p className="text-muted-foreground">Ma'lumotlar yuklanmoqda...</p></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col">
            <div className="border-b sticky top-0 bg-background z-10"><div className="flex h-16 items-center px-4"><MainNav className="mx-6" /><div className="ml-auto flex items-center space-x-4"><Search /><UserNav /></div></div></div>
            <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                    <h2 className="text-3xl font-bold tracking-tight">To‘lovlar</h2>
                    <Button onClick={handleOpenModal} disabled={actionLoading}><CreditCard className="mr-2 h-4 w-4" /> Yangi To‘lov</Button>
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Jami To‘lovlar</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{statistics.total_payments}</div><p className="text-xs text-muted-foreground">Umumiy yozuvlar soni</p></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">To‘langan Summa</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(statistics.total_paid)}</div><p className="text-xs text-muted-foreground">Jami to'langan summa</p></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Kutilayotgan Summa</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(statistics.total_pending)}</div><p className="text-xs text-muted-foreground">Jami kutilayotgan summa</p></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Muddati O'tgan Summa</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(statistics.total_overdue)}</div><p className="text-xs text-muted-foreground">Jami muddati o'tgan summa</p></CardContent></Card>
                </div>
                <div className="flex flex-wrap gap-4 items-center p-4 border rounded-md bg-card">
                    <Select value={filters.status} onValueChange={(v) => handleFilterChange(v, "status")} disabled={paymentsLoading || actionLoading}>
                        <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Holati bo‘yicha" /></SelectTrigger>
                        <SelectContent><SelectItem value="all">Barcha Holatlar</SelectItem><SelectItem value="paid">To‘langan</SelectItem><SelectItem value="pending">Kutilmoqda</SelectItem><SelectItem value="overdue">Muddati o‘tgan</SelectItem></SelectContent>
                    </Select>
                    <Select value={filters.object} onValueChange={(v) => handleFilterChange(v, "object")} disabled={paymentsLoading || actionLoading || objects.length === 0}>
                        <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Obyekt bo‘yicha" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Barcha Obyektlar</SelectItem>
                            {objects.map((obj) => (<SelectItem key={obj.id} value={obj.id.toString()}>{obj.name}</SelectItem>))}
                            {objects.length === 0 && <p className="p-2 text-sm text-muted-foreground">Obyektlar topilmadi</p>}
                        </SelectContent>
                    </Select>
                    <Select value={filters.apartment} onValueChange={(v) => handleFilterChange(v, "apartment")} disabled={paymentsLoading || actionLoading || (filteredApartmentsForSelect.length === 0 && filters.object !== 'all')}>
                        <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Xonadon bo‘yicha" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Barcha Xonadonlar</SelectItem>
                            {filteredApartmentsForSelect.map((apt) => (
                                <SelectItem key={apt.id} value={apt.id.toString()}>
                                    {apt.room_number} {filters.object === 'all' ? `(${apt.object_name || 'N/A'})` : ''}
                                </SelectItem>
                            ))}
                            {filteredApartmentsForSelect.length === 0 && filters.object !== 'all' && (<p className="p-2 text-sm text-muted-foreground">Tanlangan obyektda xonadon yo'q</p>)}
                            {apartments.length > 0 && filteredApartmentsForSelect.length === 0 && filters.object === 'all' && (<p className="p-2 text-sm text-muted-foreground">Xonadonlar topilmadi</p> )}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleClearFilters} disabled={paymentsLoading || actionLoading || (filters.status === 'all' && filters.object === 'all' && filters.apartment === 'all')}> Tozalash </Button>
                </div>
                <Card>
                    <CardHeader><CardTitle>To‘lovlar Ro‘yxati</CardTitle><CardDescription>Mavjud to‘lovlar.</CardDescription></CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">#</TableHead>
                                        <TableHead>Xonadon</TableHead>
                                        <TableHead>Mijoz</TableHead>
                                        <TableHead className="text-right">To'langan Summa</TableHead>
                                        <TableHead>Sana</TableHead>
                                        <TableHead>Holati</TableHead>
                                        <TableHead>Izoh</TableHead>
                                        <TableHead className="text-right">Amallar</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paymentsLoading ? (
                                        <TableRow><TableCell colSpan={8} className="h-24 text-center"><div className="flex justify-center items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Yuklanmoqda...</div></TableCell></TableRow>
                                    ) : filteredPayments.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} className="h-24 text-center">To‘lovlar topilmadi.</TableCell></TableRow>
                                    ) : (
                                        filteredPayments.map((payment, index) => (
                                            <TableRow key={payment.id} className={cn(deletingPaymentId === payment.id && "opacity-50")}>
                                                <TableCell className="font-medium">{getRowNumber(index)}</TableCell>
                                                <TableCell>{payment.apartment_info || `ID: ${payment.apartment}`}</TableCell>
                                                <TableCell>{payment.user_fio || `ID: ${payment.user}`}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(payment.paid_amount)}</TableCell>
                                                <TableCell>{formatDate(payment.created_at)}</TableCell>
                                                <TableCell>{getStatusBadge(payment.status)}</TableCell>
                                                <TableCell className="max-w-[200px] truncate" title={payment.additional_info || ''}>{payment.additional_info || "-"}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end space-x-1">
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(payment)} disabled={actionLoading} title="Izohni tahrirlash" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                                                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-100 h-8 w-8" onClick={() => handleDeletePayment(payment.id)} disabled={actionLoading || deletingPaymentId === payment.id} title="O‘chirish">
                                                            {deletingPaymentId === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader><DialogTitle>Yangi To‘lov Qo‘shish</DialogTitle><DialogDescription>(*) majburiy maydonlar.</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="apartment" className="text-right">Xonadon <span className="text-red-500">*</span></Label>
                            <Select value={formData.apartment} onValueChange={(v) => handleSelectChange("apartment", v)} disabled={apartments.length === 0}>
                                <SelectTrigger id="apartment" className="col-span-3"><SelectValue placeholder="Xonadonni tanlang..." /></SelectTrigger>
                                <SelectContent>
                                    {apartments.sort((a, b) => (a.room_number || '').localeCompare(b.room_number || '')).map((apt) => (
                                        <SelectItem key={apt.id} value={apt.id.toString()}>
                                            {apt.room_number} ({apt.object_name || 'N/A'})
                                        </SelectItem>
                                    ))}
                                    {apartments.length === 0 && <p className="p-2 text-sm text-muted-foreground">Xonadonlar topilmadi</p>}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="user" className="text-right">Mijoz <span className="text-red-500">*</span></Label>
                            <Select value={formData.user} onValueChange={(v) => handleSelectChange("user", v)} disabled={clients.length === 0}>
                                <SelectTrigger id="user" className="col-span-3"><SelectValue placeholder="Mijozni tanlang..." /></SelectTrigger>
                                <SelectContent>
                                    {clients.sort((a, b) => (a.fio || '').localeCompare(b.fio || '')).map((client) => (
                                        <SelectItem key={client.id} value={client.id.toString()}>{client.fio}</SelectItem>
                                    ))}
                                    {clients.length === 0 && <p className="p-2 text-sm text-muted-foreground">Mijozlar topilmadi</p>}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="paid_amount" className="text-right">Summa ($) <span className="text-red-500">*</span></Label>
                            <Input id="paid_amount" name="paid_amount" type="number" value={formData.paid_amount} onChange={handleFormChange} className="col-span-3" placeholder="500.00" min="0.01" step="0.01" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="created_at" className="text-right">Sana <span className="text-red-500">*</span></Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button id="created_at" variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !formData.created_at && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />{formData.created_at ? format(formData.created_at, "PPP", { locale: uz }) : <span>Sanani tanlang</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={formData.created_at} onSelect={handleDateChange} initialFocus locale={uz} disabled={(date) => date > new Date() || date < new Date("2000-01-01")} />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="additional_info" className="text-right pt-2">Izoh</Label>
                            <Textarea id="additional_info" name="additional_info" value={formData.additional_info} onChange={handleFormChange} className="col-span-3 min-h-[80px]" placeholder="Qo‘shimcha ma’lumot..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseModal} disabled={actionLoading}>Bekor qilish</Button>
                        <Button onClick={handleAddPayment} disabled={actionLoading || !formData.apartment || !formData.user || !formData.paid_amount || parseFloat(formData.paid_amount) <= 0}>
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Saqlash
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader><DialogTitle>To‘lov Izohini Tahrirlash (ID: {editingPayment?.id})</DialogTitle><DialogDescription>Faqat izohni o'zgartirish mumkin.</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Xonadon</Label>
                            <Input value={editingPayment?.apartment_info || `ID: ${editingPayment?.apartment}`} className="col-span-3" disabled />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Mijoz</Label>
                            <Input value={editingPayment?.user_fio || `ID: ${editingPayment?.user}`} className="col-span-3" disabled />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Summa ($)</Label>
                            <Input value={editingPayment ? formatCurrency(editingPayment.paid_amount) : ""} className="col-span-3" disabled />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Sana</Label>
                            <Input value={editingPayment ? formatDate(editingPayment.created_at) : "-"} className="col-span-3" disabled />
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="edit-additional_info" className="text-right pt-2">Izoh</Label>
                            <Textarea id="edit-additional_info" name="additional_info" value={editFormData.additional_info} onChange={handleEditFormChange} className="col-span-3 min-h-[80px]" placeholder="Qo‘shimcha ma’lumot..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseEditModal} disabled={actionLoading}>Bekor qilish</Button>
                        <Button onClick={handleUpdatePayment} disabled={actionLoading}>
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Saqlash
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}