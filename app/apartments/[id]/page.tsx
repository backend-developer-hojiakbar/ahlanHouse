"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
    Building,
    Home,
    User,
    FileText,
    CreditCard,
    Edit,
    CalendarIcon,
    Download,
    Trash,
    Loader2,
    CheckCircle,
    XCircle,
    Clock,
    FileSpreadsheet,
    Info, // Popover uchun icon
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isValid, parse, addMonths, setDate, isPast, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { uz } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import * as XLSX from 'xlsx';

// API Base URL
const API_BASE_URL = "http://api.ahlan.uz";

// --- Helper Components ---
function InfoItem({
    label,
    value,
    className = "",
    alignRight = false,
    boldValue = false,
    capitalizeValue = false,
}: {
    label: string;
    value: React.ReactNode;
    className?: string;
    alignRight?: boolean;
    boldValue?: boolean;
    capitalizeValue?: boolean;
}) {
    return (
        <div
            className={`flex ${
                alignRight
                    ? "justify-between items-center"
                    : "flex-col sm:flex-row sm:justify-between sm:items-center"
            } gap-x-2`}
        >
            <span className="text-xs text-muted-foreground whitespace-nowrap">
                {label}
            </span>
            <span
                className={`text-sm ${boldValue ? "font-semibold" : ""} ${
                    alignRight ? "text-right" : "text-left sm:text-right"
                } ${capitalizeValue ? "capitalize" : ""} ${className} break-words`}
            >
                {value === undefined || value === null || value === "" ? "-" : value}
            </span>
        </div>
    );
}

function EditInput({ label, id, ...props }: any) {
    return (
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={id} className="text-right text-sm">
                {label}
            </Label>
            <Input id={id} {...props} className="col-span-3" />
        </div>
    );
}
// --- End Helper Components ---

// Payment Schedule Item Interface
interface PaymentScheduleItem {
    monthIndex: number;
    monthYear: string;
    dueDate: Date;
    dueDateFormatted: string;
    dueAmount: number;
    status: 'paid' | 'overdue' | 'upcoming' | 'partially_paid';
    paidAmount: number;
    paymentDate?: Date | null;
}

// Jadval render uchun status icon/ranglarini olish funksiyasi (Komponentdan tashqarida)
const getScheduleStatusStyle = (status: PaymentScheduleItem['status']) => {
    switch (status) {
        case 'paid':
            return { icon: CheckCircle, color: "text-green-600 dark:text-green-500", bgColor: "bg-green-500 hover:bg-green-600", borderColor: "border-green-600", text: "To'langan" };
        case 'overdue':
            return { icon: XCircle, color: "text-red-600 dark:text-red-500", bgColor: "bg-red-500 hover:bg-red-600", borderColor: "border-red-600", text: "Muddati o'tgan" };
        case 'partially_paid':
            return { icon: CheckCircle, color: "text-yellow-600 dark:text-yellow-500", bgColor: "bg-yellow-400 hover:bg-yellow-500", borderColor: "border-yellow-500", text: "Qisman to'langan" };
        case 'upcoming':
        default:
            return { icon: Clock, color: "text-gray-500 dark:text-gray-400", bgColor: "bg-gray-300 hover:bg-gray-400", borderColor: "border-gray-400", text: "Kutilmoqda" };
    }
};

// --- YANGI KOMPONENT: To'lov Jadvali Grafigi ---
function PaymentTimelineGraph({
    scheduleData,
    formatCurrency,
    formatDate,
}: {
    scheduleData: PaymentScheduleItem[];
    formatCurrency: (amount: number | string | null | undefined) => string;
    formatDate: (date: string | Date | null | undefined, format?: string) => string;
}) {
    if (!scheduleData || scheduleData.length === 0) return null;

    return (
        <div className="w-full overflow-x-auto pb-2"> {/* Gorizontal skroll uchun */}
            <div className="flex h-10 rounded-md border dark:border-gray-700 min-w-[600px]"> {/* Minimal kenglik */}
                {scheduleData.map((item) => {
                    const { icon: StatusIcon, bgColor, borderColor, text: statusText } = getScheduleStatusStyle(item.status);
                    return (
                        <Popover key={item.monthIndex}>
                            <PopoverTrigger asChild>
                                <div
                                    className={cn(
                                        "flex-1 flex items-center justify-center cursor-pointer relative transition-colors duration-200",
                                        "border-r dark:border-gray-700 last:border-r-0", // Segmentlar orasidagi chiziq
                                        bgColor // Holatga qarab rang
                                    )}
                                    style={{ minWidth: `${Math.max(50, 600 / scheduleData.length)}px` }} // Teng taqsimlash + minimal kenglik
                                    title={`${item.monthYear} - ${statusText}`} // Tooltip
                                >
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-60 text-sm" side="top" align="center">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">{item.monthYear}</h4>
                                    <p className="text-xs text-muted-foreground">
                                        {item.dueDateFormatted} sanasigacha
                                    </p>
                                    <div className="flex items-center justify-between border-t pt-2 mt-2">
                                        <span className="text-muted-foreground">Summa:</span>
                                        <span className="font-semibold">{formatCurrency(item.dueAmount)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Holati:</span>
                                        <span className={`flex items-center font-medium ${getScheduleStatusStyle(item.status).color.replace('text-', 'text-xs text-')}`}> {/* Rangni moslash */}
                                            <StatusIcon className="h-3.5 w-3.5 mr-1" />
                                            {statusText}
                                        </span>
                                    </div>
                                    {item.status === 'paid' && item.paymentDate && (
                                        <div className="flex items-center justify-between text-xs border-t pt-1.5 mt-1.5">
                                            <span className="text-muted-foreground">To'landi:</span>
                                            <span>{formatDate(item.paymentDate)}</span>
                                        </div>
                                    )}
                                    {item.status === 'partially_paid' && (
                                        <div className="flex items-center justify-between text-xs border-t pt-1.5 mt-1.5">
                                            <span className="text-muted-foreground">To'langan:</span>
                                            <span className="font-medium">{formatCurrency(item.paidAmount)}</span>
                                        </div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    );
                })}
            </div>
             {/* Legend (Ranglar tavsifi) */}
             <div className="flex justify-center flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                 <div className="flex items-center"><span className="h-2.5 w-2.5 rounded-full bg-green-500 mr-1.5 flex-shrink-0"></span> To'langan</div>
                 <div className="flex items-center"><span className="h-2.5 w-2.5 rounded-full bg-red-500 mr-1.5 flex-shrink-0"></span> Muddati o'tgan</div>
                 <div className="flex items-center"><span className="h-2.5 w-2.5 rounded-full bg-yellow-400 mr-1.5 flex-shrink-0"></span> Qisman</div>
                 <div className="flex items-center"><span className="h-2.5 w-2.5 rounded-full bg-gray-300 mr-1.5 flex-shrink-0"></span> Kutilmoqda</div>
             </div>
        </div>
    );
}
// --- Grafik Komponent tugadi ---


export default function ApartmentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [apartment, setApartment] = useState<any>(null);
    const [overduePayments, setOverduePayments] = useState<any>(null);
    const [overdueReport, setOverdueReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [paymentForm, setPaymentForm] = useState({ amount: "", description: "" });

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({ room_number: "", floor: "", rooms: "", area: "", price: "", description: "", status: "", object: "" });

    const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<any>(null);
    const [editPaymentForm, setEditPaymentForm] = useState({ amount: "", description: "", date: new Date() });
    const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
    const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);

    const [isOverduePaymentModalOpen, setIsOverduePaymentModalOpen] = useState(false);
    const [overduePaymentForm, setOverduePaymentForm] = useState({ amount: "", payment_date: new Date(), payment_id: null as number | null });
    const [overduePaymentLoading, setOverduePaymentLoading] = useState(false);

    const [totalPaid, setTotalPaid] = useState(0);
    const [remainingAmount, setRemainingAmount] = useState(0);

    const [paymentScheduleData, setPaymentScheduleData] = useState<PaymentScheduleItem[]>([]);

    // --- Utility Functions ---
    const getAuthHeaders = useCallback(
        (token = accessToken) => {
            if (!token) {
                console.error("Auth token is missing!");
                return null;
            }
            return {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };
        },
        [accessToken]
    );

    const formatCurrency = useCallback((amount: string | number | null | undefined) => {
        const num = Number(amount);
        if (amount === null || amount === undefined || amount === "" || isNaN(num))
            return "0 $";
        return num.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }, []);

     const formatDate = useCallback((dateInput: string | Date | null | undefined, outputFormat = "dd.MM.yyyy") => {
        if (!dateInput) return "-";
        let date: Date;
        try {
            if (dateInput instanceof Date && isValid(dateInput)) {
                date = dateInput;
            } else if (typeof dateInput === 'string') {
                date = parseISO(dateInput);
                if (!isValid(date)) {
                    date = parse(dateInput, 'yyyy-MM-dd', new Date());
                     if (!isValid(date)) {
                        date = parse(dateInput.split('T')[0], 'dd.MM.yyyy', new Date());
                     }
                     if (!isValid(date)) {
                        const simpleDate = new Date(dateInput.split('T')[0]);
                         if (isValid(simpleDate)) date = simpleDate;
                         else throw new Error("Cannot parse date string");
                    }
                }
            } else {
                throw new Error("Invalid date input type");
            }

            if (!isValid(date)) {
                 console.warn("Date parsing resulted in invalid date (formatDate):", dateInput);
                return typeof dateInput === 'string' ? dateInput.split("T")[0] || "-" : "-";
            }
            return format(date, outputFormat, { locale: uz });
        } catch (e) {
            console.warn("Date formatting/parsing error (formatDate):", e, "Original input:", dateInput);
            return typeof dateInput === 'string' ? dateInput.split("T")[0] || "-" : "-";
        }
    }, []);

    const formatDateTime = useCallback((dateInput: string | Date | null | undefined) => {
        if (!dateInput) return "-";
        let date: Date;
         try {
             if (dateInput instanceof Date && isValid(dateInput)) {
                 date = dateInput;
             } else if (typeof dateInput === 'string') {
                 date = parseISO(dateInput);
                 if (!isValid(date)) {
                     const simpleDateTime = new Date(dateInput);
                     if (isValid(simpleDateTime)) date = simpleDateTime;
                     else throw new Error("Cannot parse date-time string");
                 }
             } else {
                 throw new Error("Invalid date-time input type");
             }

             if (!isValid(date)) {
                 console.warn("Date parsing resulted in invalid date (formatDateTime):", dateInput);
                 return typeof dateInput === 'string' ? dateInput : "-";
             }
             return format(date, "dd.MM.yyyy HH:mm", { locale: uz });
         } catch (e) {
             console.warn("Date formatting/parsing error (formatDateTime):", e, "Original input:", dateInput);
             return typeof dateInput === 'string' ? dateInput : "-";
         }
    }, []);


    const recalculateTotals = useCallback((currentApartmentData: any) => {
        if (!currentApartmentData || !currentApartmentData.payments) return { totalPaid: 0, remainingAmount: 0 };

        const payments = currentApartmentData.payments || [];
        const relevantPayments = payments.filter((p: any) =>
             (p.status === 'paid' || p.paid_amount > 0) &&
             p.payment_type !== 'band'
        );

        const totalPaidFromPayments = relevantPayments.reduce( (sum: number, p: any) => sum + (parseFloat(p.paid_amount) || 0), 0 );
        const mainPayment = payments.find((p:any) => ['muddatli', 'ipoteka', 'subsidiya', 'sotilgan', 'naqd'].includes(p.payment_type)) || payments[0];
        const totalAmount = mainPayment?.total_amount ? parseFloat(mainPayment.total_amount) : (currentApartmentData.price ? parseFloat(currentApartmentData.price) : 0);
        const newRemainingAmount = Math.max(0, totalAmount - totalPaidFromPayments);

        return { totalPaid: totalPaidFromPayments, remainingAmount: newRemainingAmount };
    }, []);


    const generatePaymentSchedule = useCallback((mainPayment: any, allPayments: any[]): PaymentScheduleItem[] => {
        if (!mainPayment || mainPayment.payment_type !== 'muddatli' || !mainPayment.created_at || !mainPayment.duration_months || !mainPayment.monthly_payment || !mainPayment.due_date) {
            return [];
        }
        const schedule: PaymentScheduleItem[] = [];
        let contractStartDate: Date;
        try { contractStartDate = parseISO(mainPayment.created_at); if (!isValid(contractStartDate)) throw new Error("Invalid contract start date"); } catch (e) { console.error("Error parsing contract start date:", mainPayment.created_at, e); return []; }
        const durationMonths = parseInt(mainPayment.duration_months, 10); const monthlyPayment = parseFloat(mainPayment.monthly_payment); const dueDayOfMonth = parseInt(mainPayment.due_date, 10); const now = new Date();
        const sortedPayments = [...allPayments]
            .filter(p => p.status === 'paid' && p.payment_type !== 'band' && p.paid_amount && parseFloat(p.paid_amount) > 0 && p.created_at)
            .map(p => ({ ...p, created_at_date: parseISO(p.created_at), paid_amount_num: parseFloat(p.paid_amount) || 0, }))
            .filter(p => isValid(p.created_at_date)).sort((a, b) => a.created_at_date.getTime() - b.created_at_date.getTime());
        let paymentPool = sortedPayments.map(p => ({ amount: p.paid_amount_num, date: p.created_at_date }));
        for (let i = 0; i < durationMonths; i++) {
            let monthDueDate: Date; try { let targetMonth = addMonths(contractStartDate, i + 1); monthDueDate = setDate(targetMonth, dueDayOfMonth); if (monthDueDate.getDate() !== dueDayOfMonth) { const lastDayOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0); monthDueDate = lastDayOfMonth; } if (!isValid(monthDueDate)) throw new Error("Invalid calculated due date"); } catch (e) { console.error(`Error calculating due date for month ${i}:`, e); continue; }
            let paidAmountForMonth = 0; let paymentDateForMonth: Date | null = null; const tempPaymentPool: typeof paymentPool = [];
            for (const payment of paymentPool) { if (payment.amount <= 0) continue; let amountToAllocate = 0; if (paidAmountForMonth < monthlyPayment) { amountToAllocate = Math.min(payment.amount, monthlyPayment - paidAmountForMonth); paidAmountForMonth += amountToAllocate; payment.amount -= amountToAllocate; paymentDateForMonth = payment.date; } if (payment.amount > 0) { tempPaymentPool.push(payment); } } paymentPool = tempPaymentPool;
            let status: PaymentScheduleItem['status'] = 'upcoming'; const isOverdue = isPast(monthDueDate) && startOfDay(monthDueDate) < startOfDay(now);
            if (paidAmountForMonth >= monthlyPayment) { status = 'paid'; } else if (paidAmountForMonth > 0) { status = isOverdue ? 'overdue' : 'partially_paid'; } else { status = isOverdue ? 'overdue' : 'upcoming'; }
            schedule.push({ monthIndex: i + 1, monthYear: format(monthDueDate, "MMMM yyyy", { locale: uz }), dueDate: monthDueDate, dueDateFormatted: formatDate(monthDueDate), dueAmount: monthlyPayment, status: status, paidAmount: paidAmountForMonth, paymentDate: status === 'paid' ? paymentDateForMonth : null, });
        } return schedule;
    }, [formatDate]);

    const fetchApartmentDetails = useCallback(
        async (token: string): Promise<any | null> => {
             if (!token || !params.id) { setLoading(false); return null; } setLoading(true); setApartment(null); setPaymentScheduleData([]); try { const apartmentId = params.id; const headers = getAuthHeaders(token); if (!headers) throw new Error("Avtorizatsiya tokeni yo'q."); const responses = await Promise.all([ fetch(`${API_BASE_URL}/apartments/${apartmentId}/`, { method: "GET", headers }).catch((e) => e), fetch(`${API_BASE_URL}/payments/?apartment=${apartmentId}&ordering=created_at&page_size=1000`, { method: "GET", headers }).catch((e) => e), fetch(`${API_BASE_URL}/apartments/${apartmentId}/overdue_payments/`, { method: "GET", headers }).catch((e) => e), fetch(`${API_BASE_URL}/apartments/overdue_payments_report/?apartment_id=${apartmentId}`, { method: "GET", headers }).catch((e) => e), ]); const [apartmentResponse, paymentsResponse, overduePaymentsResponse, overdueReportResponse] = responses; if (!(apartmentResponse instanceof Response) || !apartmentResponse.ok) { if (apartmentResponse?.status === 404) throw new Error(`Xonadon (ID: ${apartmentId}) topilmadi.`); if (apartmentResponse?.status === 401) { localStorage.removeItem("access_token"); router.push("/login"); throw new Error("Sessiya muddati tugagan. Iltimos, qayta kiring."); } const errorText = await apartmentResponse?.text?.().catch(() => "Server xatosi"); throw new Error(`Xonadon ma'lumotlarini olishda xatolik (${apartmentResponse?.status}): ${errorText}`); } const apartmentData = await apartmentResponse.json(); let allPayments: any[] = []; let clientId = null; if (paymentsResponse instanceof Response && paymentsResponse.ok) { const paymentData = await paymentsResponse.json(); allPayments = paymentData.results || []; if (allPayments.length > 0) { const mainPaymentCandidate = allPayments.find(p => ['muddatli', 'ipoteka', 'subsidiya', 'sotilgan', 'naqd'].includes(p.payment_type)) || allPayments[0]; clientId = mainPaymentCandidate?.user; if (mainPaymentCandidate) { allPayments = [mainPaymentCandidate, ...allPayments.filter(p => p.id !== mainPaymentCandidate.id)]; } } } else { console.warn("To'lovlarni olishda ogohlantirish:", paymentsResponse?.status); } let overduePaymentsData = null; if (overduePaymentsResponse instanceof Response && overduePaymentsResponse.ok) { overduePaymentsData = await overduePaymentsResponse.json(); } else { console.warn("Muddati o'tgan to'lovlarni olishda ogohlantirish:", overduePaymentsResponse?.status); } let overdueReportData = null; if (overdueReportResponse instanceof Response && overdueReportResponse.ok) { overdueReportData = await overdueReportResponse.json(); } else { console.warn("Muddati o'tgan hisobotni olishda ogohlantirish:", overdueReportResponse?.status); } if (!clientId && apartmentData.owners && apartmentData.owners.length > 0) { clientId = apartmentData.owners[0]; if (typeof clientId === 'object' && clientId !== null) { clientId = clientId.id; } } const detailFetchPromises = []; const objectId = typeof apartmentData.object === "object" ? apartmentData.object.id : apartmentData.object; if (objectId) { detailFetchPromises.push( fetch(`${API_BASE_URL}/objects/${objectId}/`, { method: "GET", headers }) .then(res => res.ok ? res.json() : Promise.resolve({ id: objectId, name: "Noma'lum obyekt" })) .catch(() => Promise.resolve({ id: objectId, name: "Noma'lum obyekt (Xato)" })) ); } else { detailFetchPromises.push(Promise.resolve(null)); } if (clientId) { detailFetchPromises.push( fetch(`${API_BASE_URL}/users/${clientId}/`, { method: "GET", headers }) .then(res => res.ok ? res.json() : null) .catch(() => null) ); } else { detailFetchPromises.push(Promise.resolve(null)); } const mainPaymentIdForDocs = allPayments[0]?.id; if (mainPaymentIdForDocs) { detailFetchPromises.push( fetch(`${API_BASE_URL}/documents/?payment=${mainPaymentIdForDocs}&page_size=50`, { method: "GET", headers }) .then(res => res.ok ? res.json() : { results: [] }) .then(d => d.results || []) .catch(() => []) ); } else { detailFetchPromises.push(Promise.resolve([])); } const [objectData, clientData, documentsData] = await Promise.all(detailFetchPromises); const completeApartmentData = { ...apartmentData, object: objectData || apartmentData.object, payments: allPayments, client: clientData, documents: documentsData, }; setApartment(completeApartmentData); setOverduePayments(overduePaymentsData); setOverdueReport(overdueReportData); const { totalPaid: calculatedTotalPaid, remainingAmount: calculatedRemainingAmount } = recalculateTotals(completeApartmentData); setTotalPaid(calculatedTotalPaid); setRemainingAmount(calculatedRemainingAmount); setEditForm({ room_number: apartmentData.room_number || "", floor: apartmentData.floor?.toString() || "", rooms: apartmentData.rooms?.toString() || "", area: apartmentData.area?.toString() || "", price: apartmentData.price || "", description: apartmentData.description || "", status: apartmentData.status || "", object: objectId?.toString() || "", }); if (completeApartmentData.payments && completeApartmentData.payments.length > 0 && completeApartmentData.payments[0].payment_type === 'muddatli') { const schedule = generatePaymentSchedule(completeApartmentData.payments[0], completeApartmentData.payments); setPaymentScheduleData(schedule); } setLoading(false); return completeApartmentData; } catch (error: any) { console.error("Xonadon tafsilotlarini olishda xato:", error); toast({ title: "Xatolik", description: error.message || "Ma'lumotlarni olishda noma'lum xatolik.", variant: "destructive", }); setApartment(null); setPaymentScheduleData([]); setLoading(false); return null; }
        },
        [params.id, router, getAuthHeaders, recalculateTotals, generatePaymentSchedule, toast] // toast qo'shildi
    );


    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            router.push("/login");
        } else {
            setAccessToken(token);
        }
    }, [router]);

    useEffect(() => {
        if (accessToken && params.id) {
            fetchApartmentDetails(accessToken);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken, params.id]);


    const handleOpenPaymentModal = useCallback(() => {
         if (!apartment?.client?.id) { toast({ title: "Xatolik", description: "To'lov qo'shish uchun avval mijoz biriktirilishi kerak.", variant: "destructive", }); return; }
         setSelectedDate(new Date());
         setPaymentForm({ amount: "", description: "" });
         setIsPaymentModalOpen(true);
    }, [apartment, toast]); // toast qo'shildi

    const handleClosePaymentModal = () => { setIsPaymentModalOpen(false); setPaymentForm({ amount: "", description: "" }); };
    const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setPaymentForm((prev) => ({ ...prev, [name]: value })); };

    const handleAddPayment = async () => {
        setPaymentLoading(true);
        const headers = getAuthHeaders();
        if (!headers || !apartment?.client?.id || !selectedDate || !params.id) {
            toast({ title: "Xatolik", description: "Mijoz ID, Xonadon ID, sana yoki avtorizatsiya tokeni topilmadi.", variant: "destructive", });
            setPaymentLoading(false); return;
        }
        const clientId = apartment.client.id;
        const paymentAmount = Number(paymentForm.amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            toast({ title: "Xatolik", description: "Summa musbat son bo'lishi kerak.", variant: "destructive", });
            setPaymentLoading(false); return;
        }
        const mainPayment = apartment.payments?.[0];
        const mainPaymentTotalAmount = mainPayment?.total_amount ?? apartment.price;
        const paymentData = { apartment: params.id, user: clientId, paid_amount: paymentAmount.toString(), payment_type: "naqd", additional_info: paymentForm.description, created_at: format(selectedDate, "yyyy-MM-dd'T'HH:mm:ssxxx"), total_amount: mainPaymentTotalAmount, status: "paid", main_payment: mainPayment?.id };
        try {
            const response = await fetch(`${API_BASE_URL}/payments/`, { method: "POST", headers, body: JSON.stringify(paymentData) });
            if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(`To'lov qo'shishda xatolik (${response.status}): ${JSON.stringify(e)}`); }
            const newPayment = await response.json();
            toast({ title: "Muvaffaqiyat", description: "To'lov muvaffaqiyatli qo'shildi" });
            let updatedApartmentData = null;
            if (accessToken) { updatedApartmentData = await fetchApartmentDetails(accessToken); } // Await refetch
            if (updatedApartmentData) {
                 const { totalPaid: newTotalPaid, remainingAmount: newRemainingAmount } = recalculateTotals(updatedApartmentData);
                 generateReceiptPDF( { id: newPayment.id, amount: paymentAmount.toFixed(2), description: paymentForm.description, date: selectedDate }, updatedApartmentData, newTotalPaid, newRemainingAmount );
            } else { console.warn("Updated apartment data not available after adding payment for PDF generation."); }
            handleClosePaymentModal();
        } catch (error: any) { toast({ title: "Xatolik", description: error.message || "To'lov qo'shishda noma'lum xatolik.", variant: "destructive", });
        } finally { setPaymentLoading(false); }
    };


    const handleOpenOverduePaymentModal = useCallback((payment: any, mainPaymentId: number) => {
         if (!payment || !mainPaymentId) { console.error("Overdue payment data or main payment ID is missing."); toast({ title: "Xatolik", description: "Muddati o'tgan to'lov ma'lumoti topilmadi.", variant: "destructive" }); return; }
         setOverduePaymentForm({ amount: payment.amount?.toString() || "0", payment_date: new Date(), payment_id: mainPaymentId, });
         setIsOverduePaymentModalOpen(true);
    }, [toast]); // toast qo'shildi
    const handleCloseOverduePaymentModal = () => { setIsOverduePaymentModalOpen(false); setOverduePaymentForm({ amount: "", payment_date: new Date(), payment_id: null }); };
    const handleOverduePaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setOverduePaymentForm((prev) => ({ ...prev, [name]: value })); };
    const handleOverduePaymentDateChange = (date: Date | undefined) => { if (date) { setOverduePaymentForm((prev) => ({ ...prev, payment_date: date })); } };
    const handlePayOverduePayment = async () => {
        setOverduePaymentLoading(true);
        const headers = getAuthHeaders();
        if (!headers || !overduePaymentForm.payment_id || !overduePaymentForm.payment_date || !apartment?.client?.id || !params.id) {
            toast({ title: "Xatolik", description: "Kerakli ma'lumotlar (To'lov ID, sana, mijoz ID, xonadon ID, token) topilmadi.", variant: "destructive", });
            setOverduePaymentLoading(false); return;
        }
        const paymentAmount = Number(overduePaymentForm.amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            toast({ title: "Xatolik", description: "Summa musbat son bo'lishi kerak.", variant: "destructive", });
            setOverduePaymentLoading(false); return;
        }
        const paymentData = { apartment: params.id, user: apartment.client.id, paid_amount: paymentAmount.toString(), payment_type: "naqd", additional_info: `Muddati o'tgan to'lov (Asosiy ID: ${overduePaymentForm.payment_id})`, created_at: format(overduePaymentForm.payment_date, "yyyy-MM-dd'T'HH:mm:ssxxx"), total_amount: apartment.payments?.[0]?.total_amount ?? apartment.price, status: "paid", main_payment: overduePaymentForm.payment_id };
        try {
            const response = await fetch(`${API_BASE_URL}/payments/`, { method: "POST", headers, body: JSON.stringify(paymentData), });
            if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(`Muddati o'tgan to'lovni yopishda xatolik (${response.status}): ${e.detail || JSON.stringify(e)}`); }
            const newPayment = await response.json();
            toast({ title: "Muvaffaqiyat", description: "Muddati o'tgan to'lov muvaffaqiyatli yopildi", });
            let updatedApartmentData = null;
            if (accessToken) { updatedApartmentData = await fetchApartmentDetails(accessToken); } // Await refetch
            if (updatedApartmentData) {
                const { totalPaid: newTotalPaid, remainingAmount: newRemainingAmount } = recalculateTotals(updatedApartmentData);
                generateReceiptPDF( { id: newPayment.id, amount: paymentAmount.toFixed(2), description: paymentData.additional_info, date: overduePaymentForm.payment_date }, updatedApartmentData, newTotalPaid, newRemainingAmount );
            } else { console.warn("Updated apartment data not available after paying overdue for PDF generation."); }
            handleCloseOverduePaymentModal();
        } catch (error: any) { toast({ title: "Xatolik", description: error.message || "Muddati o'tgan to'lovni yopishda noma'lum xatolik.", variant: "destructive", });
        } finally { setOverduePaymentLoading(false); }
    };


    const handleOpenEditModal = useCallback(() => {
        if (apartment) { setEditForm({ room_number: apartment.room_number || "", floor: apartment.floor?.toString() || "", rooms: apartment.rooms?.toString() || "", area: apartment.area?.toString() || "", price: apartment.price || "", description: apartment.description || "", status: apartment.status || "", object: apartment.object?.id?.toString() || "", }); }
        setIsEditModalOpen(true);
    }, [apartment]);
    const handleCloseEditModal = () => { setIsEditModalOpen(false); };
    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setEditForm((prev) => ({ ...prev, [name]: value })); };
    const handleUpdateApartment = useCallback(async () => {
        setEditLoading(true); const apartmentId = params.id; const headers = getAuthHeaders(); if (!headers || !apartmentId || !editForm.object) { toast({ title: "Xatolik", description: "Xonadon ID, Obyekt ID yoki token topilmadi.", variant: "destructive", }); setEditLoading(false); return; } if (!editForm.room_number || !editForm.floor || !editForm.rooms || !editForm.area || !editForm.price) { toast({ title: "Xatolik", description: "Kerakli (*) maydonlarni to'ldiring.", variant: "destructive", }); setEditLoading(false); return; } const apartmentData = { room_number: editForm.room_number, floor: parseInt(editForm.floor, 10), rooms: parseInt(editForm.rooms, 10), area: parseFloat(editForm.area), price: parseFloat(editForm.price), description: editForm.description, object: parseInt(editForm.object, 10), }; if (isNaN(apartmentData.floor) || isNaN(apartmentData.rooms) || isNaN(apartmentData.area) || isNaN(apartmentData.price) || isNaN(apartmentData.object)) { toast({ title: "Xatolik", description: "Raqamli maydonlarda xatolik.", variant: "destructive", }); setEditLoading(false); return; }
        try { const response = await fetch(`${API_BASE_URL}/apartments/${apartmentId}/`, { method: "PUT", headers, body: JSON.stringify(apartmentData) }); if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(`Xonadonni yangilashda xatolik (${response.status}): ${JSON.stringify(e)}`); } toast({ title: "Muvaffaqiyat", description: "Xonadon muvaffaqiyatli yangilandi" }); handleCloseEditModal(); if (accessToken) fetchApartmentDetails(accessToken); } catch (error: any) { toast({ title: "Xatolik", description: error.message || "Xonadonni yangilashda noma'lum xatolik.", variant: "destructive", }); } finally { setEditLoading(false); }
    }, [params.id, editForm, getAuthHeaders, accessToken, fetchApartmentDetails, handleCloseEditModal, toast]); // toast qo'shildi


    const handleOpenEditPaymentModal = useCallback((payment: any) => {
        if (!payment) return; setEditingPayment(payment); let paymentDate = new Date(); if (payment.created_at) { try { const parsed = parseISO(payment.created_at); if (isValid(parsed)) { paymentDate = parsed; } } catch (e) { console.error("Error parsing date for edit modal", e); } } setEditPaymentForm({ amount: payment.paid_amount || "", description: payment.additional_info || "", date: paymentDate, }); setIsEditPaymentModalOpen(true);
    }, []);
    const handleCloseEditPaymentModal = () => { setIsEditPaymentModalOpen(false); setEditingPayment(null); setEditPaymentForm({ amount: "", description: "", date: new Date(), }); };
    const handleEditPaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setEditPaymentForm((prev) => ({ ...prev, [name]: value })); };
    const handleEditPaymentDateChange = (date: Date | undefined) => { if (date) { setEditPaymentForm((prev) => ({ ...prev, date })); } };
    const handleUpdatePayment = useCallback(async () => {
        setIsUpdatingPayment(true); const headers = getAuthHeaders(); if (!headers || !editingPayment?.id || !editPaymentForm.date) { toast({ title: "Xatolik", description: "To'lov ID, sana yoki token topilmadi.", variant: "destructive", }); setIsUpdatingPayment(false); return; } const updatedData = { additional_info: editPaymentForm.description, created_at: format(editPaymentForm.date, "yyyy-MM-dd'T'HH:mm:ssxxx"), };
        try { const response = await fetch(`${API_BASE_URL}/payments/${editingPayment.id}/`, { method: "PATCH", headers, body: JSON.stringify(updatedData), }); if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(`To'lovni yangilashda xatolik (${response.status}): ${JSON.stringify(e)}`); } toast({ title: "Muvaffaqiyat", description: "To'lov muvaffaqiyatli yangilandi." }); handleCloseEditPaymentModal(); if (accessToken) { await fetchApartmentDetails(accessToken); } } catch (error: any) { toast({ title: "Xatolik", description: error.message || "To'lovni yangilashda noma'lum xatolik.", variant: "destructive", }); } finally { setIsUpdatingPayment(false); }
    }, [editingPayment, editPaymentForm, getAuthHeaders, accessToken, fetchApartmentDetails, handleCloseEditPaymentModal, toast]); // toast qo'shildi

    const handleDeletePayment = useCallback(async (paymentId: number) => {
        const headers = getAuthHeaders(); if (!headers || deletingPaymentId) return; if (!window.confirm(`IDsi ${paymentId} bo'lgan to'lovni o'chirishga ishonchingiz komilmi? Bu amalni qaytarib bo'lmaydi.`)) { return; } setDeletingPaymentId(paymentId);
        try { const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/`, { method: "DELETE", headers, }); if (!response.ok && response.status !== 204) { const e = await response.json().catch(() => ({})); throw new Error(`To'lovni o'chirishda xatolik (${response.status}): ${JSON.stringify(e)}`); } toast({ title: "Muvaffaqiyat!", description: `To'lov (ID: ${paymentId}) muvaffaqiyatli o'chirildi.` }); if (accessToken) { await fetchApartmentDetails(accessToken); } } catch (error: any) { toast({ title: "Xatolik", description: error.message || "To'lovni o'chirishda noma'lum xatolik.", variant: "destructive", }); } finally { setDeletingPaymentId(null); }
    }, [getAuthHeaders, deletingPaymentId, accessToken, fetchApartmentDetails, toast]); // toast qo'shildi


    const getStatusBadge = useCallback((status: string | undefined) => { switch (status) { case "bosh": return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Bo'sh</Badge>; case "band": return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Band</Badge>; case "muddatli": return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Muddatli</Badge>; case "sotilgan": return <Badge className="bg-green-500 hover:bg-green-600 text-white">Sotilgan</Badge>; case "ipoteka": return <Badge className="bg-purple-500 hover:bg-purple-600 text-white">Ipoteka</Badge>; case "subsidiya": return <Badge className="bg-teal-500 hover:bg-teal-600 text-white">Subsidiya</Badge>; default: return <Badge variant="secondary">{status || "Noma'lum"}</Badge>; } }, []);
    const getPaymentStatusBadge = useCallback((status: string | undefined) => { switch (status?.toLowerCase()) { case "paid": return <Badge className="bg-green-600 hover:bg-green-700 text-white">To'langan</Badge>; case "active": return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Aktiv</Badge>; case "pending": return <Badge variant="outline" className="text-yellow-600 border-yellow-500">Kutilmoqda</Badge>; case "overdue": return <Badge variant="destructive">Muddati o'tgan</Badge>; case "completed": return <Badge className="bg-green-600 hover:bg-green-700 text-white">Yakunlangan</Badge>; default: return <Badge variant="secondary">{status || "Noma'lum"}</Badge>; } }, []);
    const getMainPaymentTypeLabel = useCallback((paymentType: string | undefined) => { switch (paymentType) { case "naqd": return "Naqd"; case "muddatli": return "Muddatli to'lov"; case "ipoteka": return "Ipoteka"; case "subsidiya": return "Subsidiya"; case "band": return "Band qilish"; default: return paymentType || "Noma'lum"; } }, []);
    const handleDownloadContract = useCallback(async (paymentId: number) => { const headers = getAuthHeaders(); if (!headers || !paymentId || !accessToken) { toast({title: "Xatolik", description: "Shartnoma ID yoki token topilmadi.", variant: "destructive"}); return; }; const payment = apartment?.payments?.find((p: any) => p.id === paymentId); if (payment?.payment_type === "band") { toast({ title: "Ma'lumot", description: "'Band qilish' uchun alohida shartnoma generatsiya qilinmaydi.", variant: "default"}); return; } toast({ title: "Boshlanmoqda...", description: "Shartnoma generatsiya qilinmoqda...", duration: 2000 }); try { const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/download_contract/`, { method: "GET", headers: { Authorization: `Bearer ${accessToken}` }, }); if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(`Shartnoma yuklashda xatolik (${response.status}): ${e.detail || JSON.stringify(e) || "Noma'lum server xatosi"}`); } const blob = await response.blob(); const contentDisposition = response.headers.get("content-disposition"); let filename = `shartnoma_${paymentId}_${apartment?.room_number || ''}.docx`; if (contentDisposition) { const matchUtf8 = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i); if (matchUtf8 && matchUtf8[1]) { try { filename = decodeURIComponent(matchUtf8[1]); } catch (e) { console.warn("Could not decode UTF-8 filename, falling back", e); const matchSimple = contentDisposition.match(/filename="?([^"]+)"?/i); if (matchSimple && matchSimple[1]) { filename = matchSimple[1]; } } } else { const matchSimple = contentDisposition.match(/filename="?([^"]+)"?/i); if (matchSimple && matchSimple[1]) { filename = matchSimple[1]; } } } const url = window.URL.createObjectURL(blob); const a = document.createElement("a"); a.style.display = "none"; a.href = url; a.download = filename; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove(); toast({ title: "Muvaffaqiyat", description: `"${filename}" yuklab olindi.` }); } catch (error: any) { toast({ title: "Xatolik", description: error.message || "Shartnomani yuklashda noma'lum xatolik.", variant: "destructive", }); } }, [getAuthHeaders, accessToken, apartment, toast]); // toast qo'shildi
    const generateReceiptPDF = useCallback(( paymentData: { id: number | string; amount: string; description: string; date: string | Date }, apartmentData: any, currentTotalPaid: number, currentRemainingAmount: number ) => { if (!apartmentData) { console.error("Apartment data is missing for PDF generation."); toast({ title: "Xatolik", description: "Kvitansiya uchun xonadon ma'lumoti topilmadi.", variant: "destructive"}); return; } const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' }); const pageWidth = doc.internal.pageSize.getWidth(); const pageHeight = doc.internal.pageSize.getHeight(); const margin = 12; const contentWidth = pageWidth - margin * 2; const lineHeight = 5; let yPosition = margin; doc.setDrawColor(0, 80, 120); doc.setLineWidth(0.4); doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin); yPosition = margin + 2; const headerTextX = pageWidth - margin - 1; const companyName = "AHLAN HOUSE"; const companyAddress = "Qo'qon sh., Po'stindo'st k., 7a"; const companyContacts = "ahlanhouse@gmail.com | +998 98 7270077"; doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 80, 120); doc.text(companyName, headerTextX, yPosition + 6, { align: 'right' }); doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80); doc.text(companyAddress, headerTextX, yPosition + 10, { align: 'right' }); doc.text(companyContacts, headerTextX, yPosition + 14, { align: 'right' }); doc.setTextColor(0); yPosition += 14 + 4; doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 40); doc.text("TO'LOV KVITANSIYASI", pageWidth / 2, yPosition, { align: 'center' }); yPosition += lineHeight * 2.5; doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100); const receiptGenDate = format(new Date(), "dd.MM.yyyy HH:mm"); doc.text(`Kvitansiya yaratildi: ${receiptGenDate}`, margin, yPosition); yPosition += lineHeight * 1.5; doc.setTextColor(0); doc.setLineWidth(0.15); doc.setDrawColor(200); doc.line(margin, yPosition, pageWidth - margin, yPosition); yPosition += lineHeight * 1.5; const col1StartX = margin; const col2StartX = pageWidth / 2 + margin / 3; const labelWidth = 35; const colValueWidth = (contentWidth / 2) - labelWidth - 2; let yCol1 = yPosition; let yCol2 = yPosition; const defaultFontSize = 8.5; const addColInfo = (col: 1 | 2, label: string, value: string | number | null | undefined, isBold = false, labelColor = [0, 0, 0], valueColor = [0, 0, 0], fontSize = defaultFontSize) => { let currentY = col === 1 ? yCol1 : yCol2; const startX = col === 1 ? col1StartX : col2StartX; const valueX = startX + labelWidth; const effectiveValue = value === undefined || value === null || value === "" ? "-" : String(value); doc.setFontSize(fontSize); doc.setFont('helvetica', 'bold'); doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]); doc.text(`${label}:`, startX, currentY, { baseline: 'top' }); doc.setFont('helvetica', isBold ? 'bold' : 'normal'); doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]); const splitValue = doc.splitTextToSize(effectiveValue, colValueWidth); doc.text(splitValue, valueX, currentY, { baseline: 'top' }); doc.setTextColor(0); doc.setFont('helvetica', 'normal'); const lines = Array.isArray(splitValue) ? splitValue.length : 1; const heightNeeded = lines * (lineHeight * (fontSize / defaultFontSize)) + (lineHeight * 0.3); if (col === 1) yCol1 += heightNeeded; else yCol2 += heightNeeded; }; doc.setFontSize(9.5); doc.setFont('helvetica','bold'); doc.setTextColor(0, 80, 120); doc.text("To'lovchi Ma'lumotlari", col1StartX, yPosition); doc.text("Obyekt Ma'lumotlari", col2StartX, yPosition); yPosition += lineHeight * 1.8; yCol1 = yPosition; yCol2 = yPosition; addColInfo(1, "Mijoz F.I.O", apartmentData?.client?.fio, true, [0,0,0],[0,0,0], 9); addColInfo(1, "Telefon", apartmentData?.client?.phone_number); addColInfo(1, "Shartnoma №", apartmentData?.payments?.[0]?.id); addColInfo(1, "Shartnoma sanasi", formatDate(apartmentData?.payments?.[0]?.created_at)); addColInfo(2, "Obyekt Nomi", apartmentData?.object?.name); addColInfo(2, "Xonadon №", apartmentData?.room_number, true, [0,0,0],[0,0,0], 9); addColInfo(2, "Qavat / Xona", `${apartmentData?.floor ?? "-"} / ${apartmentData?.rooms ?? "-"}x`); addColInfo(2, "Maydon", `${apartmentData?.area || "-"} m²`); yPosition = Math.max(yCol1, yCol2) + lineHeight * 1.5; doc.setLineWidth(0.15); doc.setDrawColor(200); doc.line(margin, yPosition, pageWidth - margin, yPosition); yPosition += lineHeight * 1.5; doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 80, 120); doc.text("To'lov Tafsilotlari (Ushbu Kvitansiya)", margin, yPosition); yPosition += lineHeight * 1.8; yCol1 = yPosition; yCol2 = yPosition; addColInfo(1, "To'lov sanasi/vaqti", formatDateTime(paymentData.date)); addColInfo(2, "To'lov ID", paymentData.id); addColInfo(1, "To'langan summa", formatCurrency(paymentData.amount), true, [0, 100, 0], [0, 100, 0], 9.5); addColInfo(2, "To'lov usuli", "Naqd"); yPosition = Math.max(yCol1, yCol2); if (paymentData.description) { yPosition += lineHeight * 0.75; doc.setFont('helvetica', 'bold'); doc.setTextColor(80); doc.setFontSize(defaultFontSize); doc.text("Izoh:", margin, yPosition, { baseline: 'top' }); doc.setFont('helvetica', 'italic'); doc.setTextColor(50); const descStartX = margin + 15; const descWidth = contentWidth - 15; const splitDescription = doc.splitTextToSize(paymentData.description, descWidth); doc.text(splitDescription, descStartX, yPosition, { baseline: 'top' }); yPosition += (Array.isArray(splitDescription) ? splitDescription.length : 1) * lineHeight + lineHeight * 0.75; doc.setTextColor(0); doc.setFont('helvetica', 'normal'); } else { yPosition += lineHeight; } doc.setLineWidth(0.15); doc.setDrawColor(200); const footerStartEstimate = pageHeight - margin - 25; if (yPosition < footerStartEstimate - lineHeight) { doc.line(margin, yPosition, pageWidth - margin, yPosition); yPosition += lineHeight * 1.5; } else { yPosition += lineHeight * 0.5; } if (yPosition < footerStartEstimate - (lineHeight * 4)) { doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 80, 120); doc.text("Umumiy Balans", margin, yPosition); yPosition += lineHeight * 1.8; yCol1 = yPosition; yCol2 = yPosition; const totalPrice = parseFloat(apartmentData?.payments?.[0]?.total_amount || apartmentData?.price) || 0; addColInfo(1, "Shartnoma summasi", formatCurrency(totalPrice)); addColInfo(1, "Jami to'langan", formatCurrency(currentTotalPaid), false, [0,0,0], [0, 100, 0], 9); addColInfo(1, "Qoldiq summa", formatCurrency(currentRemainingAmount), true, [200, 0, 0], [200, 0, 0], 9.5); yPosition = Math.max(yCol1, yCol2); } else { console.warn("PDF Receipt: Not enough space for Balance Summary."); } const footerStartY = pageHeight - margin - 15; doc.setFontSize(7); doc.setTextColor(120); let footerY = footerStartY; doc.setTextColor(40); doc.setFontSize(7.5); if (footerY < pageHeight - margin / 2 + 2) { doc.text( "Qabul qildi (Kassir): __________________", margin, footerY ); doc.text( "To'ladi (Mijoz): __________________", pageWidth - margin, footerY, { align: "right" } ); } let paymentDateFormatted = "xxxxxx"; try { const dateToFormat = paymentData.date instanceof Date ? paymentData.date : parseISO(String(paymentData.date)); if(isValid(dateToFormat)) { paymentDateFormatted = format(dateToFormat, "yyyyMMdd_HHmm"); } } catch (e) { console.error("Error formatting date for PDF filename", e); } const filename = `Kvitansiya-${apartmentData?.room_number || 'ID' + apartmentData?.id}-${paymentDateFormatted}-A5L.pdf`; doc.save(filename); }, [formatCurrency, formatDate, formatDateTime, toast]); // toast qo'shildi
    const handleExportToExcel = useCallback(() => { if (!paymentScheduleData || paymentScheduleData.length === 0 || !apartment) { toast({ title: "Xatolik", description: "Eksport uchun to'lov jadvali ma'lumotlari topilmadi.", variant: "destructive" }); return; } const dataForExport = paymentScheduleData.map(item => { let statusText = getScheduleStatusStyle(item.status).text; return { "№": item.monthIndex, "Oy / Yil": item.monthYear, "To'lov Sanasi": item.dueDateFormatted, "Summa ($)": item.dueAmount, "Holati": statusText, "Haqiqiy To'lov Sanasi": item.paymentDate ? formatDate(item.paymentDate) : "-", "Haqiqatda To'langan ($)": item.status === 'partially_paid' || item.status === 'paid' ? item.paidAmount : 0, }; }); const ws = XLSX.utils.json_to_sheet(dataForExport); ws['!cols'] = [ { wch: 5 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, {wch: 25} ]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "To'lov Jadvali"); const fileName = `Tollov_Jadvali_${apartment.room_number || apartment.id}_${format(new Date(), "yyyy-MM-dd")}.xlsx`; XLSX.writeFile(wb, fileName); toast({ title: "Muvaffaqiyat", description: `"${fileName}" fayli yuklab olindi.` }); }, [paymentScheduleData, apartment, formatCurrency, formatDate, toast]); // toast qo'shildi


    // --- Render Logic ---
    if (loading) { return ( <div className="flex min-h-screen flex-col"> <div className="border-b sticky top-0 bg-background z-10"> <div className="flex h-16 items-center px-4"> <MainNav className="mx-6" /> <div className="ml-auto flex items-center space-x-4"><Search /><UserNav /></div> </div> </div> <div className="flex-1 flex items-center justify-center"> <Loader2 className="mr-2 h-8 w-8 animate-spin text-muted-foreground" /> <p className="text-muted-foreground">Yuklanmoqda...</p> </div> </div> ); }
    if (!apartment) { return ( <div className="flex min-h-screen flex-col"> <div className="border-b sticky top-0 bg-background z-10"> <div className="flex h-16 items-center px-4"> <MainNav className="mx-6" /> <div className="ml-auto flex items-center space-x-4"><Search /><UserNav /></div> </div> </div> <div className="flex-1 space-y-4 p-8 pt-6"> <div className="flex items-center justify-between space-y-2"> <h2 className="text-2xl font-bold tracking-tight text-red-600">Xonadon topilmadi</h2> <Button variant="outline" onClick={() => router.push("/apartments")}> <Home className="mr-2 h-4 w-4" /> Barcha xonadonlar </Button> </div> <p className="text-muted-foreground">ID ({params.id}) bo'yicha xonadon mavjud emas yoki ma'lumotlarni yuklashda xatolik yuz berdi.</p> </div> </div> ); }

    const mainPayment = apartment.payments?.[0];
    const allPayments = apartment.payments || [];
    const documents = apartment.documents || [];
    const lastThreePayments = [...allPayments].filter(p => p.paid_amount > 0).slice(0, 3);

    return (
         <div className="flex min-h-screen flex-col">
            {/* Header */}
            <div className="border-b sticky top-0 bg-background z-10"> <div className="flex h-16 items-center px-4"> <MainNav className="mx-6" /> <div className="ml-auto flex items-center space-x-4"><Search /><UserNav /></div> </div> </div>

            {/* Asosiy Kontent Maydoni */}
            <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
                {/* Sahifa Sarlavhasi va Amallar */}
                <div className="flex items-center justify-between space-y-2 flex-wrap gap-y-2">
                  <div> <h2 className="text-3xl font-bold tracking-tight">Xonadon № {apartment.room_number}</h2> <p className="text-muted-foreground">{apartment.object?.name || "Noma'lum obyekt"}</p> </div>
                  <div className="flex space-x-2 flex-wrap gap-2 justify-end"> <Button variant="outline" size="sm" onClick={() => router.push("/apartments")}><Home className="mr-2 h-4 w-4" /> Barcha xonadonlar</Button> {apartment.object?.id && (<Link href={`/objects/${apartment.object.id}`} passHref><Button variant="outline" size="sm"><Building className="mr-2 h-4 w-4" /> Obyektga qaytish</Button></Link>)} {apartment.status === "bosh" && (<Button size="sm" onClick={() => router.push(`/apartments/${apartment.id}/reserve`)}><User className="mr-2 h-4 w-4" /> Band qilish / Sotish</Button>)} <Button variant="outline" size="sm" onClick={handleOpenEditModal}><Edit className="mr-2 h-4 w-4" /> Tahrirlash</Button> {mainPayment && mainPayment.payment_type !== 'band' && ( <Button variant="outline" size="sm" onClick={() => handleDownloadContract(mainPayment.id)}> <Download className="mr-2 h-4 w-4" /> Shartnoma </Button> )} </div>
                </div>

                {/* Asosiy Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Chap Ustun: Rasm va Tafsilotlar (+ Yangi Grafik Jadval) */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardContent className="p-0">
                                {/* Rasm bloki */}
                                <div className="relative h-[250px] md:h-[350px] bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden"> <img src={apartment.image || apartment.object?.image || "/placeholder.svg?h=350&w=600&text=Rasm+Yo'q"} alt={`Xonadon ${apartment.room_number}`} className="w-full h-full object-cover" onError={(e) => { const t = e.target as HTMLImageElement; t.src = "/placeholder.svg?h=350&w=600&text=Rasm+Yuklanmadi"; t.onerror = null; }} loading="lazy" /> <div className="absolute top-4 right-4">{getStatusBadge(apartment.status)}</div> </div>
                                {/* Asosiy ma'lumotlar va Tavsif */}
                                <div className="p-4 md:p-6">
                                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 border-b pb-4 dark:border-gray-700"> <InfoItem label="Qavat" value={apartment.floor ?? "-"} /> <InfoItem label="Xonalar" value={`${apartment.rooms || "-"} xona`} /> <InfoItem label="Maydon" value={`${apartment.area || "-"} m²`} /> <InfoItem label="Narx" value={formatCurrency(apartment.price)} className="text-green-600 dark:text-green-500 font-semibold"/> </div>
                                   <h3 className="text-lg font-semibold mb-2">Tavsif</h3> <p className="text-sm text-muted-foreground break-words min-h-[40px] mb-6"> {apartment.description || <span className="italic">Tavsif kiritilmagan</span>} </p>

                                   {/* --- TO'LOV JADVALI (GRAFIK KO'RINISH) --- */}
                                   {mainPayment && mainPayment.payment_type === 'muddatli' && paymentScheduleData.length > 0 && (
                                       <div className="mt-6 pt-6 border-t dark:border-gray-700">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-lg font-semibold">To'lov Jadvali</h3>
                                                <Button variant="outline" size="sm" onClick={handleExportToExcel}> <FileSpreadsheet className="mr-2 h-4 w-4" /> Yuklash (Excel) </Button>
                                            </div>
                                            <PaymentTimelineGraph scheduleData={paymentScheduleData} formatCurrency={formatCurrency} formatDate={formatDate} />
                                       </div>
                                   )}
                                   {/* --- Grafik Jadval tugadi --- */}

                                </div>
                            </CardContent>
                        </Card>
                    </div> {/* Chap ustun tugadi */}


                    {/* O'ng Ustun: Xulosa Karta (Yopishqoq) */}
                    <div className="lg:sticky top-20 self-start space-y-6">
                        <Card className="shadow-sm">
                            <CardHeader className="pb-3"><CardTitle className="text-lg">Umumiy ma'lumot</CardTitle></CardHeader>
                            <CardContent className="pt-0">
                                <div className="space-y-3 text-sm">
                                    <InfoItem label="Holati:" value={getStatusBadge(apartment.status)} alignRight />
                                    {apartment.client ? (
                                      <div className="border-t pt-3 space-y-1 dark:border-gray-700"> <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Mijoz</h4> <InfoItem label="F.I.O:" value={apartment.client.fio || "N/A"} alignRight boldValue /> <InfoItem label="Telefon:" value={apartment.client.phone_number || "-"} alignRight /> {apartment.client.kafil_fio && ( <div className="border-t pt-2 mt-2 dark:border-gray-600"> <h5 className="text-xs font-semibold text-muted-foreground mb-0.5 uppercase tracking-wider">Kafil</h5> <InfoItem label="Kafil FIO:" value={apartment.client.kafil_fio} alignRight /> <InfoItem label="Kafil Tel:" value={apartment.client.kafil_phone_number || "-"} alignRight/> </div> )} </div>
                                    ) : apartment.status !== 'bosh' ? (<p className="text-xs text-muted-foreground italic border-t pt-3 dark:border-gray-700">Mijoz biriktirilmagan.</p>) : null}
                                    {mainPayment ? (
                                      <div className="border-t pt-3 space-y-1 dark:border-gray-700">
                                          <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Shartnoma (#{mainPayment.id})</h4>
                                          <InfoItem label="Turi:" value={getMainPaymentTypeLabel(mainPayment.payment_type)} alignRight capitalizeValue />
                                          <InfoItem label="Sana:" value={formatDate(mainPayment.created_at)} alignRight />
                                          {(mainPayment.payment_type === 'muddatli' || mainPayment.payment_type === 'ipoteka') && (
                                              <>
                                                <InfoItem label="Boshlang'ich:" value={formatCurrency(mainPayment.initial_payment)} alignRight boldValue />
                                                <InfoItem label="Oylik to'lov:" value={formatCurrency(mainPayment.monthly_payment)} alignRight boldValue />
                                                <InfoItem label="Muddat / Foiz:" value={`${mainPayment.duration_months || "-"} oy / ${mainPayment.interest_rate ?? 0}%`} alignRight />
                                                {mainPayment.due_date && <InfoItem label="To'lov kuni:" value={`Har oy ${mainPayment.due_date}-sanasi`} alignRight />}
                                              </>
                                          )}
                                          {/* --- BU YERGA QO'SHILDI --- */}
                                          <InfoItem
                                              label="Sotilgan narx:"
                                              value={formatCurrency(mainPayment?.total_amount ?? apartment?.price)}
                                              alignRight
                                              boldValue
                                              className="text-blue-600 dark:text-blue-500"
                                          />
                                          {/* --- QO'SHILGAN QATOR TUGADI --- */}
                                          <InfoItem label="Jami to'langan:" value={formatCurrency(totalPaid)} alignRight boldValue className="text-green-700 dark:text-green-500" />
                                          <InfoItem label="Qoldiq:" value={formatCurrency(remainingAmount)} alignRight boldValue className="text-red-700 dark:text-red-500" />
                                          <InfoItem label="Statusi:" value={getPaymentStatusBadge(mainPayment.status)} alignRight />
                                          {overduePayments && overduePayments.total_overdue > 0 && (<InfoItem label="Muddati o'tgan:" value={formatCurrency(overduePayments.total_overdue)} alignRight boldValue className="text-orange-600 dark:text-orange-500" />)}
                                      </div>
                                    ) : apartment.status !== 'bosh' ? (<p className="text-xs text-muted-foreground italic border-t pt-3 dark:border-gray-700">Shartnoma mavjud emas.</p>) : null}
                                    {apartment.status !== "bosh" && allPayments.filter(p => p.paid_amount > 0).length > 0 && (
                                         <div className="border-t pt-3 space-y-2 dark:border-gray-700"> <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Oxirgi To'lovlar</h4> {lastThreePayments.map((p: any) => ( <div key={p.id} className="flex justify-between items-start text-xs gap-2"> <div className="flex-1"> <div className="font-medium">{formatCurrency(p.paid_amount)}</div> <div className="text-muted-foreground text-[11px]"> {formatDate(p.created_at)} - {getMainPaymentTypeLabel(p.payment_type)} </div> </div> <div className="text-muted-foreground text-right whitespace-nowrap text-[11px]">ID: {p.id}</div> </div> ))} {allPayments.filter(p=>p.paid_amount > 0).length > 3 && ( <Button variant="link" size="sm" className="p-0 h-auto text-blue-600 hover:underline text-xs" onClick={() => { const trigger = document.getElementById('tabs-trigger-payments_history'); if (trigger) trigger.click(); const tabsElement = document.getElementById('main-tabs'); if (tabsElement) tabsElement.scrollIntoView({ behavior: 'smooth' }); } }> Barchasini ko'rish ({allPayments.filter(p=>p.paid_amount > 0).length}) </Button> )} </div>
                                    )}
                                    {apartment.status !== "bosh" && apartment.client && (<Button size="sm" className="w-full mt-4" onClick={handleOpenPaymentModal} disabled={!apartment.client?.id}><CreditCard className="mr-2 h-4 w-4" /> To'lov Qo'shish</Button>)}
                                </div>
                            </CardContent>
                        </Card>
                    </div> {/* O'ng ustun tugadi */}
                </div> {/* Asosiy grid tugadi */}

                 {/* Tablar Bo'limi */}
                 {allPayments.length > 0 && (
                     <Tabs defaultValue="payments_history" className="mt-6" id="main-tabs">
                         <TabsList className="grid w-full grid-cols-3"> <TabsTrigger value="payments_history" id="tabs-trigger-payments_history">To'lovlar Tarixi</TabsTrigger> <TabsTrigger value="documents">Hujjatlar</TabsTrigger> <TabsTrigger value="overdue_report">Hisobot</TabsTrigger> </TabsList>
                         {/* To'lovlar Tarixi Tabi */}
                         <TabsContent value="payments_history"> <Card> <CardHeader> <CardTitle className="text-lg">To'lovlar Tarixi</CardTitle> <CardDescription>Barcha amalga oshirilgan to'lovlar va umumiy balans.</CardDescription> </CardHeader> <CardContent> {mainPayment && ( <div className="border-b pb-4 mb-4 dark:border-gray-700"> <h4 className="text-sm font-semibold mb-2">Asosiy Shartnoma Ma'lumotlari</h4> <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2 text-sm"> <InfoItem label="Shartnoma ID" value={`#${mainPayment.id}`} boldValue /> <InfoItem label="Turi" value={getMainPaymentTypeLabel(mainPayment.payment_type)} capitalizeValue /> <InfoItem label="Sana" value={formatDate(mainPayment.created_at)} /> <InfoItem label="Jami Summa" value={formatCurrency(mainPayment.total_amount || apartment.price)} className="text-blue-600 dark:text-blue-500 font-semibold"/> {(mainPayment.payment_type === 'muddatli' || mainPayment.payment_type === 'ipoteka') && ( <> <InfoItem label="Boshlang'ich" value={formatCurrency(mainPayment.initial_payment)} /> <InfoItem label="Oylik To'lov" value={formatCurrency(mainPayment.monthly_payment)} /> <InfoItem label="Muddat / Foiz" value={`${mainPayment.duration_months || "-"} oy / ${mainPayment.interest_rate ?? 0}%`} /> {mainPayment.due_date && <InfoItem label="To'lov kuni" value={`Har oy ${mainPayment.due_date}-sanasi`}/>} </> )} <InfoItem label="To'langan" value={formatCurrency(totalPaid)} className="text-green-600 dark:text-green-500 font-semibold" /> <InfoItem label="Qoldiq" value={formatCurrency(remainingAmount)} className="text-red-600 dark:text-red-500 font-semibold" /> <InfoItem label="Status" value={getPaymentStatusBadge(mainPayment.status)} /> </div> </div> )} {overduePayments && overduePayments.overdue_payments?.length > 0 && mainPayment && ( <div className="border-b pb-4 mb-4 dark:border-gray-700"> <h4 className="text-sm font-semibold mb-2 text-orange-600 dark:text-orange-500">Muddati O'tgan To'lovlar</h4> <div className="space-y-3"> {overduePayments.overdue_payments.map((op: any, index: number) => ( <div key={index} className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors bg-orange-50/30 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/50"> <div className="flex-1 mr-4"> <div className="font-medium text-orange-700 dark:text-orange-400">{formatCurrency(op.amount)}</div> <div className="text-xs text-muted-foreground"> Oy: {op.month || 'N/A'} | Muddati: {formatDate(op.due_date)} </div> </div> <Button size="sm" variant="outline" className="flex-shrink-0 border-orange-500 text-orange-600 hover:bg-orange-100 dark:border-orange-600 dark:text-orange-500 dark:hover:bg-orange-900/30" onClick={() => handleOpenOverduePaymentModal(op, mainPayment.id)}> To'lash </Button> </div> ))} </div> <div className="mt-3 text-sm font-semibold text-orange-600 dark:text-orange-500"> Jami muddati o'tgan: {formatCurrency(overduePayments.total_overdue)} </div> </div> )} {allPayments.filter(p => p.paid_amount > 0).length > 0 ? ( <div> <h4 className="text-sm font-semibold mb-2">Barcha To'lovlar Ro'yxati</h4> <div className="space-y-3"> {allPayments.filter(p => p.paid_amount > 0).map((payment: any) => ( <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"> <div className="flex-1 mr-2"> <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-1"> <div> <span className="font-medium">{formatCurrency(payment.paid_amount)}</span> <span className="text-xs text-muted-foreground ml-2">(ID: {payment.id})</span> </div> <div className="text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(payment.created_at)}</div> </div> <div className="text-sm text-muted-foreground mt-1 break-words"> Usul: {getMainPaymentTypeLabel(payment.payment_type)} {payment.additional_info && <span className="ml-2 text-gray-500">| Izoh: {payment.additional_info}</span>} </div> </div> <div className="flex space-x-1.5 flex-shrink-0"> <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleOpenEditPaymentModal(payment)} title="Tahrirlash"> <Edit className="h-4 w-4" /> </Button> <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleDeletePayment(payment.id)} disabled={deletingPaymentId === payment.id} title="O'chirish"> {deletingPaymentId === payment.id ? ( <Loader2 className="h-4 w-4 animate-spin" /> ) : ( <Trash className="h-4 w-4" /> )} </Button> </div> </div> ))} </div> </div> ) : ( <p className="text-sm text-muted-foreground italic">Hozircha to'lovlar mavjud emas.</p> )} </CardContent> </Card> </TabsContent>
                         {/* Hujjatlar Tabi */}
                         <TabsContent value="documents"> <Card> <CardHeader> <CardTitle className="text-lg">Hujjatlar</CardTitle> <CardDescription>Asosiy shartnomaga biriktirilgan fayllar.</CardDescription> </CardHeader> <CardContent> {documents.length > 0 ? ( <div className="space-y-3"> {documents.map((doc: any) => ( <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"> <div className="flex items-center space-x-3 mr-4"> <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" /> <div className="flex-1"> <div className="text-sm font-medium break-all"> {doc.docx_file?.split('/').pop() || doc.pdf_file?.split('/').pop() || doc.image?.split('/').pop() || doc.document_type || `Hujjat #${doc.id}`} </div> <div className="text-xs text-muted-foreground">Yuklangan: {formatDate(doc.created_at)}</div> </div> </div> <Button variant="outline" size="sm" className="flex-shrink-0" onClick={() => { const fileUrl = doc.docx_file || doc.pdf_file || doc.image; if (fileUrl) { const absoluteUrl = fileUrl.startsWith('http') ? fileUrl : `${API_BASE_URL}${fileUrl}`; window.open(absoluteUrl, "_blank"); } else { toast({title: "Xatolik", description:"Fayl manzili topilmadi.", variant:"destructive"}); } }} disabled={!doc.docx_file && !doc.pdf_file && !doc.image} > <Download className="h-4 w-4 mr-2" /> Yuklash </Button> </div> ))} </div> ) : ( <p className="text-sm text-muted-foreground italic">Hujjatlar yuklanmagan.</p> )} </CardContent> </Card> </TabsContent>
                         {/* Hisobot Tabi */}
                          <TabsContent value="overdue_report"> <Card> <CardHeader> <CardTitle className="text-lg">Muddati O'tgan Hisoboti</CardTitle> <CardDescription>Ushbu xonadon bo'yicha muddati o'tgan qarzdorliklar.</CardDescription> </CardHeader> <CardContent> {overdueReport && overdueReport.report?.[0]?.overdue_payments?.length > 0 && mainPayment ? ( <div className="space-y-4"> <p className="text-sm text-muted-foreground">Xonadon: <span className="font-semibold">{overdueReport.report[0].apartment_number}</span></p> <p className="text-sm text-muted-foreground">Mijoz: <span className="font-semibold">{overdueReport.report[0].client_fio || 'N/A'}</span></p> {overdueReport.report[0].overdue_payments.map((op: any, opIndex: number) => ( <div key={opIndex} className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors bg-orange-50/30 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/50"> <div className="flex-1 mr-4"> <div className="font-medium text-orange-700 dark:text-orange-400">{formatCurrency(op.amount)}</div> <div className="text-xs text-muted-foreground"> Oy: {op.month || 'N/A'} | Muddati: {formatDate(op.due_date)} </div> </div> <Button size="sm" variant="outline" className="flex-shrink-0 border-orange-500 text-orange-600 hover:bg-orange-100 dark:border-orange-600 dark:text-orange-500 dark:hover:bg-orange-900/30" onClick={() => handleOpenOverduePaymentModal(op, mainPayment.id)}> To'lash </Button> </div> ))} <div className="mt-3 text-sm font-semibold text-orange-600 dark:text-orange-500"> Jami muddati o'tgan (shu xonadon): {formatCurrency(overdueReport.report[0].total_overdue)} </div> </div> ) : ( <p className="text-sm text-muted-foreground italic">Ushbu xonadon uchun muddati o'tgan to'lovlar mavjud emas.</p> )} </CardContent> </Card> </TabsContent>
                     </Tabs>
                 )} {/* Tablar tugadi */}
            </div> {/* Asosiy Kontent Maydoni tugadi */}

            {/* --- Modallar (TUZATILGAN: <Dialog> va <DialogContent> orasida bo'sh joy yo'q) --- */}
            {/* Add Payment Modal */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Balansga To'lov Qo'shish</DialogTitle>
                        <DialogDescription>Mijoz ({apartment?.client?.fio || 'N/A'}) balansiga yangi naqd to'lov qo'shing.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">Summa ($) *</Label>
                            <Input id="amount" name="amount" type="number" value={paymentForm.amount} onChange={handlePaymentChange} className="col-span-3" placeholder="Masalan: 1000" min="0.01" step="0.01" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">Sana *</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {selectedDate ? format(selectedDate, "PPP", { locale: uz }) : <span>Sanani tanlang</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus locale={uz} /></PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="description" className="text-right pt-2">Izoh</Label>
                            <Textarea id="description" name="description" value={paymentForm.description} onChange={handlePaymentChange} className="col-span-3" placeholder="To'lov haqida qo'shimcha ma'lumot (ixtiyoriy)" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleClosePaymentModal} disabled={paymentLoading}>Bekor qilish</Button>
                        <Button onClick={handleAddPayment} disabled={paymentLoading || !paymentForm.amount || !selectedDate || parseFloat(paymentForm.amount) <= 0}>
                            {paymentLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {paymentLoading ? "Saqlanmoqda..." : "Saqlash va Kvitansiya"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Pay Overdue Payment Modal */}
             <Dialog open={isOverduePaymentModalOpen} onOpenChange={setIsOverduePaymentModalOpen}>
                 <DialogContent className="sm:max-w-[425px]">
                   <DialogHeader>
                     <DialogTitle>Muddati O'tgan To'lovni To'lash</DialogTitle>
                     <DialogDescription>Muddati o'tgan qarzdorlikni yopish uchun to'lov kiriting.</DialogDescription>
                   </DialogHeader>
                   <div className="grid gap-4 py-4">
                     <div className="grid grid-cols-4 items-center gap-4">
                       <Label htmlFor="overdue_amount" className="text-right">Summa ($) *</Label>
                       <Input id="overdue_amount" name="amount" type="number" value={overduePaymentForm.amount} onChange={handleOverduePaymentChange} className="col-span-3" placeholder="Masalan: 300" min="0.01" step="0.01" required />
                     </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                       <Label htmlFor="overdue_payment_date" className="text-right">To'lov Sanasi *</Label>
                       <Popover>
                         <PopoverTrigger asChild>
                           <Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !overduePaymentForm.payment_date && "text-muted-foreground")}>
                             <CalendarIcon className="mr-2 h-4 w-4" />
                             {overduePaymentForm.payment_date ? format(overduePaymentForm.payment_date, "PPP", { locale: uz }) : <span>Sanani tanlang</span>}
                           </Button>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={overduePaymentForm.payment_date} onSelect={handleOverduePaymentDateChange} initialFocus locale={uz} /></PopoverContent>
                       </Popover>
                     </div>
                   </div>
                   <DialogFooter>
                     <Button variant="outline" onClick={handleCloseOverduePaymentModal} disabled={overduePaymentLoading}>Bekor qilish</Button>
                     <Button onClick={handlePayOverduePayment} disabled={overduePaymentLoading || !overduePaymentForm.amount || !overduePaymentForm.payment_date || parseFloat(overduePaymentForm.amount) <= 0}>
                       {overduePaymentLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                       {overduePaymentLoading ? "To'lanmoqda..." : "To'lash va Kvitansiya"}
                     </Button>
                   </DialogFooter>
                 </DialogContent>
             </Dialog>

            {/* Edit Apartment Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Xonadonni Tahrirlash</DialogTitle>
                    <DialogDescription>Xonadon ma'lumotlarini yangilang. (*) bilan belgilangan maydonlar majburiy.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <EditInput label="Xona raqami *" id="room_number" name="room_number" value={editForm.room_number} onChange={handleEditChange} required />
                    <EditInput label="Qavat *" id="floor" name="floor" type="number" value={editForm.floor} onChange={handleEditChange} min="0" required />
                    <EditInput label="Xonalar soni *" id="rooms" name="rooms" type="number" value={editForm.rooms} onChange={handleEditChange} min="1" required />
                    <EditInput label="Maydon (m²) *" id="area" name="area" type="number" value={editForm.area} onChange={handleEditChange} min="0.01" step="0.01" required />
                    <EditInput label="Narx ($) *" id="price" name="price" type="number" value={editForm.price} onChange={handleEditChange} min="0" step="0.01" required />
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label htmlFor="edit_description" className="text-right text-sm pt-2">Tavsif</Label>
                      <Textarea id="edit_description" name="description" value={editForm.description} onChange={handleEditChange} className="col-span-3" placeholder="Xonadon haqida qo'shimcha ma'lumot (ixtiyoriy)" />
                    </div>
                     <EditInput label="Obyekt ID *" id="object" name="object" type="number" value={editForm.object} onChange={handleEditChange} required disabled title="Obyektni o'zgartirish uchun Obyekt sahifasidan foydalaning"/>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={handleCloseEditModal} disabled={editLoading}>Bekor qilish</Button>
                    <Button onClick={handleUpdateApartment} disabled={editLoading || !editForm.room_number || !editForm.floor || !editForm.rooms || !editForm.area || !editForm.price }>
                      {editLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {editLoading ? "Saqlanmoqda..." : "Saqlash"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Payment Modal */}
             <Dialog open={isEditPaymentModalOpen} onOpenChange={handleCloseEditPaymentModal}>
                 <DialogContent className="sm:max-w-[425px]">
                   <DialogHeader>
                     <DialogTitle>To'lovni Tahrirlash (ID: {editingPayment?.id})</DialogTitle>
                     <DialogDescription>Faqat to'lov sanasi va izohni o'zgartirish mumkin. Summa o'zgarmaydi.</DialogDescription>
                   </DialogHeader>
                   <div className="grid gap-4 py-4">
                     <div className="grid grid-cols-4 items-center gap-4">
                       <Label htmlFor="edit_payment_amount" className="text-right">Summa ($)</Label>
                       <Input id="edit_payment_amount" name="amount" type="number" value={editPaymentForm.amount} className="col-span-3" disabled />
                     </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                       <Label htmlFor="edit_payment_date" className="text-right">Sana *</Label>
                       <Popover>
                         <PopoverTrigger asChild>
                           <Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !editPaymentForm.date && "text-muted-foreground")}>
                             <CalendarIcon className="mr-2 h-4 w-4" />
                             {editPaymentForm.date ? format(editPaymentForm.date, "PPP", { locale: uz }) : <span>Sanani tanlang</span>}
                           </Button>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editPaymentForm.date} onSelect={handleEditPaymentDateChange} initialFocus locale={uz} /></PopoverContent>
                       </Popover>
                     </div>
                     <div className="grid grid-cols-4 items-start gap-4">
                       <Label htmlFor="edit_payment_description" className="text-right text-sm pt-2">Izoh</Label>
                       <Textarea id="edit_payment_description" name="description" value={editPaymentForm.description} onChange={handleEditPaymentChange} className="col-span-3" placeholder="To'lov haqida (ixtiyoriy)" />
                     </div>
                   </div>
                   <DialogFooter>
                     <Button variant="outline" onClick={handleCloseEditPaymentModal} disabled={isUpdatingPayment}>Bekor qilish</Button>
                     <Button onClick={handleUpdatePayment} disabled={isUpdatingPayment || !editPaymentForm.date}>
                       {isUpdatingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                       {isUpdatingPayment ? "Yangilanmoqda..." : "Yangilash"}
                     </Button>
                   </DialogFooter>
                 </DialogContent>
             </Dialog>

        </div> // Root Container tugadi
    );
}