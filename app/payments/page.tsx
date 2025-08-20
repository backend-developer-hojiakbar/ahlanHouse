"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    CalendarIcon, Loader2, Edit, Trash, CreditCard, ChevronLeft, ChevronRight, Plus, AlertTriangle, Info,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { format, parseISO, isValid, parse } from "date-fns";
import { uz } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://api.ahlan.uz";
const TELEGRAM_BOT_TOKEN = "7165051905:AAFS-lG2LDq5OjFdAwTzrpbHYnrkup6y13s";
const TELEGRAM_CHAT_ID = "1728300";

interface Document { id: number; }
interface Payment {
    id: number; user: number; user_fio?: string; apartment: number; apartment_info?: string; payment_type?: string; total_amount?: string; initial_payment?: string; interest_rate?: number; duration_months?: number; monthly_payment?: string; due_date?: number; paid_amount: string; status: string; additional_info?: string | null; created_at: string; payment_date?: string | null; reservation_deadline?: string | null; bank_name?: string | null; documents?: Document[];
}
interface OverduePayment { month: string; amount: number; due_date: string; }
interface Apartment {
    id: number; object: number; object_name: string; room_number: string; rooms?: number; area?: number; floor?: number; price?: string; status?: string; description?: string; secret_code?: string;
    balance?: string; total_amount?: string; overdue_payments?: OverduePayment[]; total_overdue?: number;
}
interface Client { id: number; fio: string; username?: string; phone_number?: string; user_type?: string; }
interface ObjectData { id: number; name: string; total_apartments?: number; floors?: number; address?: string; description?: string; image?: string | null; }

interface CurrentUser {
    fio: string;
    user_type: 'admin' | 'sotuvchi' | 'buxgalter' | 'mijoz' | string;
}

export default function PaymentsPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [payments, setPayments] = useState<Payment[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [objects, setObjects] = useState<ObjectData[]>([]);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

    const [initialLoading, setInitialLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRemainingModalOpen, setIsRemainingModalOpen] = useState(false);
    const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [userType, setUserType] = useState<string | null>(null);
    
    const getUserType = () => {
        try {
            const token = localStorage.getItem("access_token");
            if (!token) return null;
            const payload = JSON.parse(atob(token.split(".")[1]));
            const userType = payload.user_type || null;
            if (userType === 'sotuvchi' || userType === 'buxgalter') {
                return userType;
            }
            return null;
        } catch (error) {
            console.error("Error getting user type:", error);
            return null;
        }
    };
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const initialFormData = useMemo(() => ({
        apartment: "", user: "", payment_type: "naqd", total_amount: "",
        initial_payment: "", paid_amount: "", duration_months: "", due_date: "",
        additional_info: "", payment_date: new Date().toISOString().split("T")[0], bank_name: "",
    }), []);
    const [formData, setFormData] = useState(initialFormData);
    const initialEditFormData = useMemo(() => ({ additional_info: "" }), []);
    const [editFormData, setEditFormData] = useState(initialEditFormData);
    const [filters, setFilters] = useState({ object: "all", paymentType: "all", dueDate: "all", durationMonths: "all", status: "all", search: "", });
    const isInitialDataFetched = useRef(false);

    useEffect(() => {
        const type = getUserType();
        setUserType(type);
    }, []);

    const [overdueDetailsData, setOverdueDetailsData] = useState<{ client: string; apartment: string; object: string; overdue: number; }[]>([]);
    const [overdueModalLoading, setOverdueModalLoading] = useState(false);
    const [totalFilteredOverdue, setTotalFilteredOverdue] = useState<number>(0);
    const [overdueTotalLoading, setOverdueTotalLoading] = useState(false);

    const sendTelegramNotification = useCallback(async (message: string) => {
        try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
        } catch (error) {
            console.error("Telegram xabarnomasini yuborishda xatolik:", error);
        }
    }, []);
    
    const getHeaders = (): HeadersInit => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            return {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            };
        }
        return {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        };
    };

    const formatCurrency = useCallback((amount: string | number | undefined | null) => { const n=Number(amount); if(isNaN(n)) return "0.00"; return n.toLocaleString("en-US", {minimumFractionDigits:0, maximumFractionDigits:2}); }, []);
    const formatDate = useCallback((dStr: string | undefined | null) => { if(!dStr) return "-"; try{let d:Date|null=null; const pISO=parseISO(dStr); if(isValid(pISO))d=pISO; else{const pYMD=parse(dStr.split("T")[0],'yyyy-MM-dd',new Date()); if(isValid(pYMD))d=pYMD; else{const pDMY=parse(dStr.split("T")[0],'dd.MM.yyyy',new Date()); if(isValid(pDMY))d=pDMY;}} if(d&&isValid(d)) return format(d,"dd.MM.yyyy",{locale:uz}); return dStr.split("T")[0]||"-";} catch(e){ return dStr.split("T")[0]||"-";} }, []);
    const getStatusBadge = useCallback((s: string | undefined | null) => { const l=s?.toLowerCase()||"unknown"; switch(l){ case "naqd": return <Badge className="bg-green-500 hover:bg-green-600 text-white">Naqd</Badge>; case "muddatli": return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Muddatli</Badge>; case "ipoteka": return <Badge className="bg-purple-500 hover:bg-purple-600 text-white">Ipoteka</Badge>; case "band": return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Band</Badge>; case "paid": case "completed": return <Badge className="bg-green-600 hover:bg-green-700 text-white">To'langan</Badge>; case "partially_paid": return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Qisman</Badge>; case "pending": return <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white">Kutilmoqda</Badge>; case "overdue": return <Badge className="bg-red-600 hover:bg-red-700 text-white">Muddati O'tgan</Badge>; default: return <Badge variant="secondary" className="capitalize">{s||"Noma'lum"}</Badge>; } }, []);
    const fetchPaginatedData = useCallback(async <T,>(url: string, token: string, entityName: string, headers: HeadersInit) => { let r: T[] = []; let next: string | null = url; try { while (next) { if (!next.startsWith("http")) break; const res: Response = await fetch(next, { headers }); if (!res.ok) { if(res.status===401) throw new Error("Unauthorized"); const err=await res.json().catch(()=>({d:`Err ${entityName}`})); throw new Error(`${entityName} xato (${res.status}): ${err.detail||res.statusText}`); } const d: {results?: T[]; next?: string | null} = await res.json(); r=r.concat(d.results||[]); next=d.next || null; } return r; } catch (e: any) { if(e.message==="Unauthorized") throw e; toast({ title: "Xatolik", description: e.message||`${entityName} xato.`, variant:"destructive" }); return []; } }, [toast]);

    const fetchStaticData = useCallback(async (token: string) => { const h=getHeaders(); try{ const [o, c] = await Promise.all([ fetchPaginatedData<ObjectData>(`${API_BASE_URL}/objects/?page_size=1000`, token, "Obyektlar", h), fetchPaginatedData<Client>(`${API_BASE_URL}/users/?user_type=mijoz&page_size=1000`, token, "Mijozlar", h) ]); setObjects(o); setClients(c); return true; } catch(e){ toast({title: "Xatolik", description: "Ma'lumotlar yuklanmadi.", variant: "destructive"}); return false; } }, [fetchPaginatedData, toast]);
    const fetchApartmentList = useCallback(async (token: string): Promise<Apartment[]> => { const h=getHeaders(); try{ const a = await fetchPaginatedData<Apartment>(`${API_BASE_URL}/apartments/?page_size=10000`, token, "Xonadonlar", h); return a; } catch(e){ toast({title: "Xatolik", description: "Xonadonlar ro'yxati yuklanmadi.", variant: "destructive"}); return []; } }, [fetchPaginatedData, toast]);

    const fetchApartmentDetailsBatch = useCallback(async (token: string, apartmentIdsToFetch: number[]): Promise<Apartment[]> => {
        if (!token || apartmentIdsToFetch.length === 0) return [];
        const headers = getHeaders(); if (!headers) return [];
        const detailPromises = apartmentIdsToFetch.map(async (aptId) => {
             try {
                 const [balanceRes, overdueRes] = await Promise.allSettled([
                      fetch(`${API_BASE_URL}/apartments/${aptId}/get_total_payments/`, { headers }),
                      fetch(`${API_BASE_URL}/apartments/${aptId}/overdue_payments/`, { headers }),
                 ]);
                 let apiBalance = undefined; let apiTotalAmount = undefined;
                 let apiOverduePayments = undefined; let apiTotalOverdue = undefined;

                 if (balanceRes.status === "fulfilled" && balanceRes.value.ok) {
                     const d = await balanceRes.value.json();
                     if (d && typeof d === "object") {
                         apiBalance = String(d.balance ?? 0);
                         apiTotalAmount = String(d.total_amount ?? 0);
                     }
                 }

                 if (overdueRes.status === "fulfilled" && overdueRes.value.ok) {
                     const d = await overdueRes.value.json();
                     if (d && typeof d === "object") {
                         apiOverduePayments = d.overdue_payments || [];
                         apiTotalOverdue = d.total_overdue || 0;
                     }
                 }
                 const existingApt = apartments.find(a => a.id === aptId);
                 if (!existingApt) {
                     return null;
                 }
                 return {
                     ...existingApt,
                     balance: apiBalance !== undefined ? apiBalance : existingApt.balance,
                     total_amount: apiTotalAmount !== undefined ? apiTotalAmount : existingApt.total_amount,
                     overdue_payments: apiOverduePayments !== undefined ? apiOverduePayments : existingApt.overdue_payments,
                     total_overdue: apiTotalOverdue !== undefined ? apiTotalOverdue : existingApt.total_overdue,
                 };
             } catch (error) {
                 return apartments.find(a => a.id === aptId) || null;
             }
         });
         const updatedApartments = (await Promise.all(detailPromises)).filter(apt => apt !== null) as Apartment[];
         return updatedApartments;
    }, [apartments]);

    const fetchPaymentsList = useCallback(async (token: string): Promise<boolean> => {
         if (!token) return false; setDataLoading(true);
         const headers = getHeaders(); if (!headers) { setDataLoading(false); return false; }
         try {
             const currentUserType = getUserType();
             let url = `${API_BASE_URL}/payments/?ordering=-created_at&page_size=10000`;
             
             if (currentUserType === 'sotuvchi') {
                 url += '&payment_type=naqd,muddatli,band';
             } else if (currentUserType === 'buxgalter') {
                 url += '&payment_type=ipoteka';
             }
             
             const allResults = await fetchPaginatedData<Payment>(url, token, "To'lovlar", headers);
             setPayments(allResults); return true;
         } catch (error) { toast({title:"Xato", description:"To'lovlar yuklanmadi.", variant:"destructive"}); setPayments([]); return false; }
         finally { setDataLoading(false); }
    }, [fetchPaginatedData, toast]);

    useEffect(() => { 
        const t = localStorage.getItem("access_token"); 
        if (!t) router.push("/login"); 
        else { 
            setAccessToken(t); 
            setUserType(getUserType());
            const userTypeFromStorage = localStorage.getItem("user_type");
            const userFioFromStorage = localStorage.getItem("user_fio");
            if (userTypeFromStorage && userFioFromStorage) {
                setCurrentUser({
                    user_type: userTypeFromStorage as CurrentUser['user_type'],
                    fio: userFioFromStorage,
                });
            }
        } 
    }, [router]);

    useEffect(() => {
        if (accessToken && !isInitialDataFetched.current) {
            const loadInitialData = async () => {
                setInitialLoading(true); setDataLoading(true);
                const staticOk = await fetchStaticData(accessToken);
                if (staticOk) { const basicApts = await fetchApartmentList(accessToken); setApartments(basicApts); await fetchPaymentsList(accessToken); }
                 isInitialDataFetched.current = true; setInitialLoading(false); setDataLoading(false);
            };
            loadInitialData();
        }
    }, [accessToken, fetchStaticData, fetchApartmentList, fetchPaymentsList]);

    const filteredPayments = useMemo(() => payments.filter(p => { const a = apartments.find(apt => apt.id === p.apartment); if(filters.object!=="all"&&(!a||a.object!==parseInt(filters.object,10))) return false; if(filters.paymentType!=="all"&&p.payment_type?.toLowerCase()!==filters.paymentType) return false; if(filters.paymentType==="muddatli"){ if(filters.dueDate!=="all"&&p.due_date!==parseInt(filters.dueDate,10)) return false; if(filters.durationMonths!=="all"&&p.duration_months!==parseInt(filters.durationMonths,10)) return false; } return true; }), [payments, apartments, filters]);
    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
    const paginatedPayments = useMemo(() => { const i=(currentPage-1)*itemsPerPage; return filteredPayments.slice(i,i+itemsPerPage); }, [filteredPayments, currentPage, itemsPerPage]);
    useEffect(() => { setCurrentPage(1); }, [filters]);
    const handlePageChange = (p: number) => { if(p>=1&&p<=totalPages)setCurrentPage(p); };

    const calculatedTotalOverdue = useMemo(() => {
        let total = 0;
        if (!filteredPayments || filteredPayments.length === 0) return 0;
        const apartmentIdsInFilteredPayments = new Set(filteredPayments.map(p => p.apartment));
        apartments.forEach(apt => {
            if (apartmentIdsInFilteredPayments.has(apt.id) && apt.total_overdue !== undefined && apt.total_overdue !== null) {
                total += apt.total_overdue;
            }
        });
        return total;
    }, [filteredPayments, apartments]);


    useEffect(() => {
        setTotalFilteredOverdue(calculatedTotalOverdue);
    }, [calculatedTotalOverdue]);


    useEffect(() => {
        if (!accessToken || payments.length === 0) {
            setTotalFilteredOverdue(0);
             return;
        }

        const apartmentIdsInFilteredPayments = Array.from(new Set(filteredPayments.map(p => p.apartment)));

        const apartmentIdsToFetchDetails = apartmentIdsInFilteredPayments.filter(aptId => {
            const apt = apartments.find(a => a.id === aptId);
            return !apt || apt.total_overdue === undefined || apt.total_overdue === null;
        });

        if (apartmentIdsToFetchDetails.length > 0 && !overdueTotalLoading) {
            setOverdueTotalLoading(true);

            fetchApartmentDetailsBatch(accessToken, apartmentIdsToFetchDetails)
                .then(updatedApts => {
                     setApartments(prevApts => {
                         const nextApts = [...prevApts];
                         updatedApts.forEach(updatedApt => {
                             const index = nextApts.findIndex(a => a.id === updatedApt.id);
                             if (index > -1) {
                                 nextApts[index] = updatedApt;
                             }
                         });
                        return nextApts;
                     });
                })
                .catch(error => console.error("Background overdue fetch error:", error))
                .finally(() => {
                    setOverdueTotalLoading(false);
                });
        } else if (apartmentIdsToFetchDetails.length === 0 && overdueTotalLoading) {
             setOverdueTotalLoading(false);
        }
    }, [accessToken, payments, filters, apartments, fetchApartmentDetailsBatch, overdueTotalLoading]);


    const apartmentCalculationsMap = useMemo(() => {
        const calcMap = new Map<number, { totalPaid: number; totalAmount: number; remaining: number; paymentCount: number; inconsistentTotalAmount: boolean; }>();
        const grouped: Record<number, Payment[]> = {}; payments.forEach(p => { if (!grouped[p.apartment]) grouped[p.apartment] = []; grouped[p.apartment].push(p); });
        Object.entries(grouped).forEach(([aptIdStr, aptPayments]) => { const aptId=parseInt(aptIdStr,10); if(isNaN(aptId)||aptPayments.length===0) return; let totP=0; let detTotA:number|null=null; let inco=false; aptPayments.forEach((p,i)=>{const paid=parseFloat(p.paid_amount||"0"); if(!isNaN(paid)) totP+=paid; const currTot=parseFloat(p.total_amount||""); if(i===0&&!isNaN(currTot)) detTotA=currTot; else if(detTotA===null&&!isNaN(currTot)) detTotA=currTot; else if(detTotA!==null&&!isNaN(currTot)&&currTot!==detTotA){ if(p.total_amount!=null&&p.total_amount!=="") inco=true; } }); const finTotA=detTotA??0; const rem=Math.max(0,finTotA-totP); calcMap.set(aptId, { totalPaid:totP, totalAmount:finTotA, remaining:rem, paymentCount:aptPayments.length, inconsistentTotalAmount:inco, }); }); return calcMap;
    }, [payments]);

    const statistics = useMemo(() => { let tp=0; let tr=0; const relAptIds=new Set(filteredPayments.map(p=>p.apartment)); tp=filteredPayments.reduce((s,p)=>{const pd=parseFloat(p.paid_amount||"0"); return s+(isNaN(pd)?0:pd);},0); relAptIds.forEach(id=>{tr+=apartmentCalculationsMap.get(id)?.remaining??0;}); return { total_paid:tp, total_remaining:tr }; }, [filteredPayments, apartmentCalculationsMap]);

    const remainingDetails = useMemo(() => { const d: { client: string; apartment: string; object: string; remaining: number; }[] = []; const relAptIds=new Set(filteredPayments.map(p=>p.apartment)); relAptIds.forEach(id=>{ const c=apartmentCalculationsMap.get(id); if(c&&c.remaining>0){ const aI=apartments.find(a=>a.id===id); const fP=payments.find(p=>p.apartment===id); const cl=clients.find(c=>c.id===fP?.user)?.fio||`M:${fP?.user||'?'}`; d.push({client:cl, apartment:aI?.room_number||`ID:${id}`, object:aI?.object_name||"-", remaining:c.remaining}); } }); return d.sort((a,b)=>b.remaining-a.remaining); }, [filteredPayments, apartmentCalculationsMap, apartments, clients, payments]);

    const getRowNumber = (index: number) => (currentPage - 1) * itemsPerPage + index + 1;

    const uniqueDueDates = useMemo(() => { const s=new Set<number>(); payments.filter(p=>p.payment_type==="muddatli"&&p.due_date!=null).forEach(p=>s.add(p.due_date!)); return Array.from(s).sort((a,b)=>a-b); }, [payments]);
    const uniqueDurationMonths = useMemo(() => { const s=new Set<number>(); payments.filter(p=>p.payment_type==="muddatli"&&p.duration_months!=null).forEach(p=>s.add(p.duration_months!)); return Array.from(s).sort((a,b)=>a-b); }, [payments]);

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = useCallback(() => { setIsModalOpen(false); setFormData(initialFormData); }, [initialFormData]);
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setFormData(p=>({...p,[e.target.name]:e.target.value})); };
    const handleSelectChange = (n: string, v: string) => { setFormData(p=>({...p,[n]:v})); };
    const handleDateChange = (d: Date|undefined, f: 'payment_date') => { setFormData(p=>({...p,[f]:d?format(d,"yyyy-MM-dd"):""})); };
    const handleOpenEditModal = (payment: Payment) => {
        if (userType === 'seller' || userType === 'accountant') return;
        setEditingPayment(payment);
        try {
            let info = payment.additional_info || "";
            try { const p = JSON.parse(info); if (p && p.comments) info = p.comments; } catch {}
            setEditFormData({ additional_info: info });
        } catch (error) {
            setEditFormData({ additional_info: "" });
        }
        setIsEditModalOpen(true);
    };
    const handleCloseEditModal = useCallback(() => { setIsEditModalOpen(false); setEditingPayment(null); setEditFormData(initialEditFormData); }, [initialEditFormData]);
    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => { setEditFormData(p=>({...p,[e.target.name]:e.target.value})); };
    const handleFilterChange = (v: string, f: keyof typeof filters) => { setFilters(p=>({...p,[f]:v,...(f==="paymentType"&&v!=="muddatli"&&{dueDate:"all",durationMonths:"all"})})); };
    const handleClearFilters = () => { setFilters({object:"all",paymentType:"all",dueDate:"all",durationMonths:"all",status:"all",search:""}); };

    const handleOpenOverdueModal = useCallback(async () => {
        if (!accessToken) { toast({title:"Xato", description:"Token yo'q.", variant:"destructive"}); return; }
        
        const currentUserType = getUserType();
        if (currentUserType !== 'buxgalter') {
            toast({title:"Xato", description:"Sizda ushbu ma'lumotlarni ko'rish huquqi yo'q.", variant:"destructive"});
            return;
        }
        
        setIsOverdueModalOpen(true);
        setOverdueModalLoading(true);
        setOverdueDetailsData([]);

        const relevantAptIds = Array.from(new Set(
            filteredPayments
                .filter(p => p.payment_type === 'ipoteka')
                .map(p => p.apartment)
        ));

        if (relevantAptIds.length === 0) {
            setOverdueDetailsData([]);
            setOverdueModalLoading(false);
            return;
        }

        const headers = getHeaders();
        if (!headers) { setOverdueModalLoading(false); return; }

        try {
            const detailPromises = relevantAptIds.map(async (aptId) => {
                const res = await fetch(`${API_BASE_URL}/apartments/${aptId}/overdue_payments/`, { headers });
                if (!res.ok) { return null; }
                const data = await res.json();
                const fP = payments.find(p => p.apartment === aptId && p.payment_type === 'ipoteka');
                const cl = clients.find(c => c.id === fP?.user)?.fio || `M:${fP?.user||'?'}`;
                const aI = apartments.find(a => a.id === aptId);
                return {
                    client: cl,
                    apartment: aI?.room_number || `ID:${aptId}`,
                    object: aI?.object_name || "-",
                    overdue: data.total_overdue || 0,
                    overdueList: data.overdue_payments || []
                };
            });

            const results = (await Promise.all(detailPromises)).filter(d => d !== null) as { client: string; apartment: string; object: string; overdue: number; overdueList: OverduePayment[] }[];

            const details = results.filter(d => d.overdue > 0).map(d => ({
                client: d.client,
                apartment: d.apartment,
                object: d.object,
                overdue: d.overdue
            }));

            setOverdueDetailsData(details.sort((a,b)=>b.overdue-a.overdue));

        } catch (error) {
            toast({title:"Xato", description:"Muddati o'tgan to'lovlar tafsilotlari yuklanmadi.", variant:"destructive"});
             setOverdueDetailsData([]);
        } finally {
             setOverdueModalLoading(false);
        }
    }, [accessToken, filteredPayments, getHeaders, payments, clients, apartments, toast]);

    const handleAddPayment = async () => {
        setActionLoading(true); const h=getHeaders(); if(!h||!accessToken) {toast({title:"Xato", description:"Autentifikatsiya tokeni topilmadi.", variant:"destructive"}); setActionLoading(false); return;}
        const errors: string[] = [];
        if (!formData.apartment) errors.push("Xonadon tanlanmadi.");
        if (!formData.user) errors.push("Mijoz tanlanmadi.");
        if (!formData.payment_type) errors.push("To'lov turi tanlanmadi.");
        if (formData.payment_type !== 'band') {
             const aptCalc = apartmentCalculationsMap.get(parseInt(formData.apartment||"0"));
             if ((!aptCalc || aptCalc.paymentCount === 0) && !formData.total_amount) {
                 errors.push("Birinchi to'lov uchun umumiy summa majburiy.");
             }
        }
        if (!formData.paid_amount || parseFloat(formData.paid_amount) <= 0) errors.push("To'langan summa kiritilmadi yoki noto'g'ri.");
        if (!formData.payment_date) errors.push("To'lov sanasi kiritilmadi.");
        if (formData.payment_type === "muddatli") {
            if (!formData.duration_months || parseInt(formData.duration_months) <= 0) errors.push("Muddat (oy) kiritilmadi yoki noto'g'ri.");
            if (!formData.due_date || parseInt(formData.due_date) < 1 || parseInt(formData.due_date) > 31) errors.push("To'lov kuni kiritilmadi yoki noto'g'ri (1-31).");
        }
        if (formData.payment_type === "ipoteka" && !formData.bank_name) errors.push("Bank nomi kiritilmadi.");

        if (errors.length > 0) { toast({ title: "Xatolik", description: errors.join(" "), variant: "destructive" }); setActionLoading(false); return; }

        const pData = {
             apartment: parseInt(formData.apartment, 10),
             user: parseInt(formData.user, 10),
             payment_type: formData.payment_type,
             total_amount: formData.payment_type !== 'band' && formData.total_amount ? parseFloat(formData.total_amount) : null,
             initial_payment: formData.payment_type !== 'band' && formData.initial_payment ? parseFloat(formData.initial_payment) : null,
             paid_amount: parseFloat(formData.paid_amount),
             duration_months: formData.payment_type === 'muddatli' && formData.duration_months ? parseInt(formData.duration_months, 10) : null,
             due_date: formData.payment_type === 'muddatli' && formData.due_date ? parseInt(formData.due_date, 10) : null,
             bank_name: formData.payment_type === 'ipoteka' && formData.bank_name ? formData.bank_name : null,
             payment_date: formData.payment_date,
             additional_info: formData.additional_info.trim() ? JSON.stringify({ comments: formData.additional_info.trim() }) : null,
        };

        try{
            const r=await fetch(`${API_BASE_URL}/payments/`,{method:"POST",headers:h,body:JSON.stringify(pData)});
            if(!r.ok){
                const e=await r.json().catch(()=>({detail:"Noma'lum xato"}) as any);
                throw new Error(`Xato (${r.status}): ${e.detail||JSON.stringify(e)}`);
            }
            const newPayment = await r.json();
            
            const apartmentInfo = apartments.find(a => a.id === pData.apartment);
            const clientInfo = clients.find(c => c.id === pData.user);

            const message = `<b>💰 Yangi To'lov Qo'shildi</b>\n\n`+
                            `<b>Kim tomonidan:</b> ${currentUser?.fio || 'Noma`lum'}\n`+
                            `<b>Mijoz:</b> ${clientInfo?.fio || 'N/A'}\n`+
                            `<b>Obyekt:</b> ${apartmentInfo?.object_name || 'N/A'}\n`+
                            `<b>Xonadon:</b> №${apartmentInfo?.room_number || 'N/A'}\n\n`+
                            `<b>To'langan summa:</b> ${formatCurrency(pData.paid_amount)} $\n`+
                            `<b>To'lov turi:</b> ${pData.payment_type}\n`+
                            `<b>Sana:</b> ${formatDate(pData.payment_date)}\n`+
                            (pData.additional_info ? `<b>Izoh:</b> ${formData.additional_info.trim()}\n` : '');
            
            await sendTelegramNotification(message);

            toast({title:"OK!",description:"To'lov muvaffaqiyatli qo'shildi."});
            handleCloseModal();
            await fetchPaymentsList(accessToken);
        }catch(e:any){
            toast({title:"Xato",description:e.message,variant:"destructive"});
        }
        finally{setActionLoading(false);}
    };

    const handleUpdatePayment = async () => {
        if (userType === 'seller' || userType === 'accountant') return;
        if (!editingPayment) return;
        setActionLoading(true);
        try {
            const headers = getHeaders();
            if (!headers) { setActionLoading(false); return; }
            const data: any = {};
            try {
                const existingInfo = editingPayment.additional_info ? JSON.parse(editingPayment.additional_info) : {};
                data.additional_info = JSON.stringify({ ...existingInfo, comments: editFormData.additional_info });
            } catch {
                data.additional_info = JSON.stringify({ comments: editFormData.additional_info });
            }
            const response = await fetch(`${API_BASE_URL}/payments/${editingPayment.id}/`, {
                method: "PATCH",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const updatedPayment = await response.json();
            
            const message = `<b>✏️ To'lov Izohi Tahrirlandi</b>\n\n`+
                            `<b>Kim tomonidan:</b> ${currentUser?.fio || 'Noma`lum'}\n`+
                            `<b>To'lov ID:</b> ${editingPayment.id}\n`+
                            `<b>Eski izoh:</b> <code>${editingPayment.additional_info || ''}</code>\n`+
                            `<b>Yangi izoh:</b> <code>${editFormData.additional_info}</code>`;
            await sendTelegramNotification(message);

            setPayments(prev => prev.map(p => p.id === editingPayment.id ? { ...p, ...updatedPayment } : p));
            toast({ title: "Muvaffaqiyatli", description: "To'lov yangilandi." });
            setIsEditModalOpen(false);
        } catch (error) {
            toast({ title: "Xato", description: "To'lov yangilanmadi.", variant: "destructive" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeletePayment = async (id: number) => {
        if (userType === 'seller' || userType === 'accountant') return;
        if (!accessToken) { toast({ title: "Xato", description: "Autentifikatsiya tokeni topilmadi.", variant: "destructive" }); return; }
        if (!confirm("Rostdan ham o'chirmoqchimisiz?")) return;

        const paymentToDelete = payments.find(p => p.id === id);
        if (!paymentToDelete) return;

        setDeletingPaymentId(id);
        setActionLoading(true);
        try {
            const headers = getHeaders();
            if (!headers) { setActionLoading(false); setDeletingPaymentId(null); return; }
            const response = await fetch(`${API_BASE_URL}/payments/${id}/`, {
                method: "DELETE",
                headers,
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const apartmentInfo = apartments.find(a => a.id === paymentToDelete.apartment);
            const clientInfo = clients.find(c => c.id === paymentToDelete.user);

            const message = `<b>❌ To'lov O'chirildi</b>\n\n`+
                            `<b>Kim tomonidan:</b> ${currentUser?.fio || 'Noma`lum'}\n`+
                            `<b>To'lov ID:</b> ${id}\n`+
                            `<b>Mijoz:</b> ${clientInfo?.fio || 'N/A'}\n`+
                            `<b>Xonadon:</b> №${apartmentInfo?.room_number || 'N/A'} (${apartmentInfo?.object_name || 'N/A'})\n`+
                            `<b>O'chirilgan summa:</b> ${formatCurrency(paymentToDelete.paid_amount)} $`;
            await sendTelegramNotification(message);
            
            setPayments(prev => prev.filter(p => p.id !== id));
            toast({ title: "Muvaffaqiyatli", description: "To'lov o'chirildi." });
        } catch (error) {
            toast({ title: "Xato", description: "To'lov o'chirilmadi.", variant: "destructive" });
        } finally {
            setActionLoading(false);
            setDeletingPaymentId(null);
        }
    };

    const filteredApartmentsForSelect = useMemo(() => apartments.sort((a,b)=>(a.object_name||"").localeCompare(b.object_name||"")||(a.room_number||"").localeCompare(b.room_number||"",undefined,{numeric:true})), [apartments]);
    const filteredClientsForSelect = useMemo(() => clients.sort((a,b)=>(a.fio||"").localeCompare(b.fio||"")), [clients]);

    if (initialLoading) {
        return ( <div className="flex min-h-screen items-center justify-center"> <Loader2 className="mr-2 h-8 w-8 animate-spin text-muted-foreground" /> <p className="text-muted-foreground">Yuklanmoqda...</p> </div> );
    }

    return (
        <TooltipProvider>
            <div className="flex min-h-screen flex-col">
                <div className="border-b sticky top-0 bg-background z-10"> <div className="flex h-16 items-center px-4 container mx-auto"> <MainNav className="mx-6" /> <div className="ml-auto flex items-center space-x-4"> <UserNav /> </div> </div> </div>

                <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 container mx-auto relative">
                    {(dataLoading || actionLoading) && ( <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20"> <Loader2 className="mr-2 h-6 w-6 animate-spin" /> <span>Yangilanmoqda...</span> </div> )}

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                        <h2 className="text-3xl font-bold tracking-tight">To'lovlar</h2>
                        {userType === 'sotuvchi' && (
                            <Button onClick={handleOpenModal} disabled={actionLoading||dataLoading}>
                                <Plus className="mr-2 h-4 w-4" /> Yangi to'lov
                            </Button>
                        )}
                    </div>

                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                         <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Jami To'langan (Filtr)</CardTitle></CardHeader> <CardContent><div className="text-2xl font-bold text-green-600">${formatCurrency(statistics.total_paid)}</div><p className="text-xs text-muted-foreground">Filtrdagi yozuvlar</p></CardContent> </Card>
                         <Card className="cursor-pointer hover:bg-muted/50" onClick={() => !dataLoading && !actionLoading && setIsRemainingModalOpen(true)}> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Jami Qoldiq (Filtr)</CardTitle></CardHeader> <CardContent><div className="text-2xl font-bold text-blue-600">${formatCurrency(statistics.total_remaining)}</div><p className="text-xs text-muted-foreground">To'lovlar ro'yxati asosida</p></CardContent> </Card>
                         {userType === 'buxgalter' && (
                             <Card
                                 className={cn(
                                     "cursor-pointer",
                                     (!dataLoading && !actionLoading && !overdueTotalLoading) && "hover:bg-muted/50"
                                 )}
                                 onClick={() => !dataLoading && !actionLoading && !overdueTotalLoading && handleOpenOverdueModal()}
                             >
                                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                     <CardTitle className="text-sm font-medium">Muddati O'tgan (Ipoteka)</CardTitle>
                                     <Tooltip>
                                         <TooltipTrigger asChild>
                                             <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                         </TooltipTrigger>
                                         <TooltipContent>
                                             <p>Ipoteka to'lovlari uchun batafsil ro'yxat</p>
                                         </TooltipContent>
                                     </Tooltip>
                                 </CardHeader>
                                 <CardContent>
                                     {overdueTotalLoading ? (
                                         <div className="text-2xl font-bold text-red-600 flex items-center">
                                             <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                         </div>
                                     ) : (
                                         <div className="text-2xl font-bold text-red-600">
                                             ${formatCurrency(totalFilteredOverdue)}
                                         </div>
                                     )}
                                     <p className="text-xs text-muted-foreground">Ipoteka to'lovlari bo'yicha</p>
                                 </CardContent>
                             </Card>
                         )}
                    </div>

                    <div className="flex flex-wrap gap-2 items-center p-4 border rounded-md bg-card">
                        <Select value={filters.object} onValueChange={(v) => handleFilterChange(v, "object")} disabled={dataLoading||actionLoading||objects.length===0}> <SelectTrigger className="w-full sm:w-auto flex-grow min-w-[150px]"><SelectValue placeholder="Obyekt" /></SelectTrigger> <SelectContent> <SelectItem value="all">Barcha Obyektlar</SelectItem> {objects.map(o=><SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>)} </SelectContent> </Select>
                        <Select 
                            value={filters.paymentType} 
                            onValueChange={(v) => handleFilterChange(v, "paymentType")} 
                            disabled={dataLoading||actionLoading}
                        > 
                            <SelectTrigger className="w-full sm:w-auto flex-grow min-w-[150px]">
                                <SelectValue placeholder="Turi" />
                            </SelectTrigger> 
                            <SelectContent> 
                                <SelectItem value="all">Barcha Turlar</SelectItem> 
                                {userType === 'sotuvchi' ? (
                                    <>
                                        <SelectItem value="naqd">Naqd</SelectItem> 
                                        <SelectItem value="muddatli">Muddatli</SelectItem> 
                                        <SelectItem value="band">Band</SelectItem>
                                    </>
                                ) : userType === 'buxgalter' ? (
                                    <SelectItem value="ipoteka">Ipoteka</SelectItem>
                                ) : (
                                    <>
                                        <SelectItem value="naqd">Naqd</SelectItem> 
                                        <SelectItem value="muddatli">Muddatli</SelectItem> 
                                        <SelectItem value="ipoteka">Ipoteka</SelectItem> 
                                        <SelectItem value="band">Band</SelectItem>
                                    </>
                                )}
                            </SelectContent> 
                        </Select>
                         {filters.paymentType === "muddatli" && ( <> <Select value={filters.dueDate} onValueChange={(v) => handleFilterChange(v, "dueDate")} disabled={dataLoading||actionLoading||uniqueDueDates.length===0}> <SelectTrigger className="w-full sm:w-auto flex-grow min-w-[180px]"><SelectValue placeholder="To'lov kuni" /></SelectTrigger> <SelectContent> <SelectItem value="all">Barcha Kunlar</SelectItem> {uniqueDueDates.map(d=><SelectItem key={d} value={d.toString()}>Har oyning {d}-kuni</SelectItem>)} </SelectContent> </Select> <Select value={filters.durationMonths} onValueChange={(v) => handleFilterChange(v, "durationMonths")} disabled={dataLoading||actionLoading||uniqueDurationMonths.length===0}> <SelectTrigger className="w-full sm:w-auto flex-grow min-w-[150px]"><SelectValue placeholder="Muddat" /></SelectTrigger> <SelectContent> <SelectItem value="all">Barcha Muddatlar</SelectItem> {uniqueDurationMonths.map(d=><SelectItem key={d} value={d.toString()}>{d} oy</SelectItem>)} </SelectContent> </Select> </> )}
                         <Button variant="outline" onClick={handleClearFilters} disabled={dataLoading||actionLoading||(filters.object==="all"&&filters.paymentType==="all"&&filters.dueDate==="all"&&filters.durationMonths==="all"&&filters.status==="all"&&filters.search==="")} className="flex-shrink-0"> Tozalash </Button>
                     </div>

                    <Card>
                        <CardHeader><CardTitle>To'lovlar Ro'yxati</CardTitle><CardDescription>Qoldiq shu ro'yxat asosida hisoblanadi.</CardDescription></CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader> <TableRow> <TableHead className="w-[50px]">#</TableHead> <TableHead>Obyekt</TableHead> <TableHead>Xonadon</TableHead> <TableHead>Mijoz</TableHead> <TableHead>Turi</TableHead> <TableHead className="text-right">Umumiy Summa</TableHead> <TableHead className="text-right">To'landi (Shu)</TableHead> <TableHead className="text-right">Qoldiq (Um.)</TableHead> <TableHead>Sana</TableHead> <TableHead>Izoh</TableHead> {userType === 'admin' && <TableHead className="text-right">Amallar</TableHead>} </TableRow> </TableHeader>
                                    <TableBody>
                                        {paginatedPayments.length === 0 && !dataLoading ? ( <TableRow><TableCell colSpan={userType === 'admin' ? 11 : 10} className="h-24 text-center">To'lovlar topilmadi.</TableCell></TableRow> )
                                         : ( paginatedPayments.map((payment, index) => {
                                                const aptInfo = apartments.find(a => a.id === payment.apartment); const cliInfo = clients.find(c => c.id === payment.user); const calc = apartmentCalculationsMap.get(payment.apartment); const totA = calc?.totalAmount??0; const remA = calc?.remaining??0; const inco = calc?.inconsistentTotalAmount??false; let comT = payment.additional_info||"-"; try{const p=JSON.parse(comT);if(p&&p.comments) comT=p.comments;}catch{} const isDel = deletingPaymentId===payment.id; const cliName=payment.user_fio||cliInfo?.fio||`M:${payment.user}`;
                                                return ( <TableRow key={payment.id} className={cn("hover:bg-muted/50 transition-opacity", isDel&&"opacity-50")}>
                                                        <TableCell className="font-medium">{getRowNumber(index)}</TableCell>
                                                         <TableCell>{aptInfo?.object_name||"-"}</TableCell>
                                                         <TableCell>{aptInfo?.room_number||`ID:${payment.apartment}`}</TableCell>
                                                         <TableCell>{cliName}</TableCell>
                                                         <TableCell>{getStatusBadge(payment.payment_type)}</TableCell>
                                                         <TableCell className="text-right">{(totA<=0)?"-":`$${formatCurrency(totA)}`}{inco&&(<Tooltip><TooltipTrigger asChild><AlertTriangle className="h-4 w-4 inline-block ml-1 text-yellow-500 cursor-help"/></TooltipTrigger><TooltipContent><p>Umumiy summa har xil!</p></TooltipContent></Tooltip>)}</TableCell>
                                                         <TableCell className="text-right font-semibold">${formatCurrency(payment.paid_amount)}</TableCell>
                                                         <TableCell className="text-right">{totA<=0?"-":remA>0?<span className="text-red-600">${formatCurrency(remA)}</span>:<span className="text-green-600">${formatCurrency(0)}</span>}</TableCell>
                                                         <TableCell>{formatDate(payment.payment_date)}</TableCell>
                                                         <TableCell className="max-w-[150px] truncate" title={comT}>{comT}</TableCell>
                                                         {userType === 'admin' && (
                                                             <TableCell className="text-right">
                                                                 <div className="flex justify-end space-x-1">
                                                                     <Button 
                                                                         variant="ghost" 
                                                                         size="icon" 
                                                                         onClick={e => {
                                                                             e.stopPropagation();
                                                                             handleOpenEditModal(payment);
                                                                         }} 
                                                                         title="Tahrir" 
                                                                         disabled={actionLoading || dataLoading || isDel}
                                                                     >
                                                                         <Edit className="h-4 w-4"/>
                                                                     </Button>
                                                                     <Button 
                                                                         variant="ghost" 
                                                                         size="icon" 
                                                                         onClick={e => {
                                                                             e.stopPropagation();
                                                                             handleDeletePayment(payment.id);
                                                                         }} 
                                                                         title="O'chirish" 
                                                                         disabled={actionLoading || dataLoading || isDel}
                                                                     >
                                                                         {isDel ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash className="h-4 w-4 text-red-500"/>}
                                                                     </Button>
                                                                 </div>
                                                             </TableCell>
                                                         )}
                                                    </TableRow> );
                                            }) )}
                                         {dataLoading && paginatedPayments.length === 0 && ( <TableRow><TableCell colSpan={(userType !== 'seller' && userType !== 'accountant') ? 11 : 10} className="h-24 text-center"><Loader2 className="mr-2 h-5 w-5 animate-spin inline-block"/> Yuklanmoqda...</TableCell></TableRow> )}
                                    </TableBody>
                                </Table>
                            </div>
                            {totalPages > 1 && ( 
                                <div className="flex items-center justify-between mt-4"> 
                                    <div className="text-sm text-muted-foreground">Jami {filteredPayments.length} ta. {currentPage}/{totalPages} sahifa</div> 
                                    <div className="flex items-center space-x-2"> 
                                        <Button variant="outline" size="sm" onClick={()=>handlePageChange(currentPage-1)} disabled={currentPage===1||dataLoading||actionLoading}><ChevronLeft className="h-4 w-4"/> Oldingi</Button> 
                                        <div className="text-sm font-medium">{currentPage} / {totalPages}</div> 
                                        <Button variant="outline" size="sm" onClick={()=>handlePageChange(currentPage+1)} disabled={currentPage===totalPages||dataLoading||actionLoading}>Keyingi <ChevronRight className="h-4 w-4"/></Button>
                                        <Button variant="outline" size="sm" onClick={()=>handlePageChange(1)} disabled={currentPage===1||dataLoading||actionLoading}>Boshiga</Button>
                                        <Button variant="outline" size="sm" onClick={()=>handlePageChange(totalPages)} disabled={currentPage===totalPages||dataLoading||actionLoading}>Oxiriga</Button>
                                        <Button variant="outline" size="sm" onClick={()=>setItemsPerPage(filteredPayments.length)} disabled={itemsPerPage===filteredPayments.length||dataLoading||actionLoading}>Barchasini Ko'rish</Button>
                                    </div> 
                                </div> 
                            )}
                        </CardContent>
                    </Card>
                </div>

                 <Dialog open={isModalOpen} onOpenChange={!actionLoading ? setIsModalOpen : undefined}>
                     <DialogContent className="sm:max-w-[520px]">
                         <DialogHeader><DialogTitle>Yangi To'lov Qo'shish</DialogTitle><DialogDescription>To'lov ma'lumotlarini kiriting. (* majburiy)</DialogDescription></DialogHeader>
                         <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-4 custom-scrollbar">
                             <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-apartment" className="text-right">Xonadon <span className="text-red-500">*</span></Label> <Select value={formData.apartment} onValueChange={(v) => handleSelectChange("apartment", v)} disabled={actionLoading||filteredApartmentsForSelect.length===0}> <SelectTrigger id="add-apartment" className="col-span-3"><SelectValue placeholder="Tanlang..." /></SelectTrigger> <SelectContent> {filteredApartmentsForSelect.map(a=>(<SelectItem key={a.id} value={a.id.toString()}>{a.room_number} ({a.object_name||"?"}) {a.status?`[${a.status}]`:""}</SelectItem>))} </SelectContent> </Select> </div>
                             <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-user" className="text-right">Mijoz <span className="text-red-500">*</span></Label> <Select value={formData.user} onValueChange={(v) => handleSelectChange("user", v)} disabled={actionLoading||filteredClientsForSelect.length===0}> <SelectTrigger id="add-user" className="col-span-3"><SelectValue placeholder="Tanlang..." /></SelectTrigger> <SelectContent> {filteredClientsForSelect.map(c=>(<SelectItem key={c.id} value={c.id.toString()}>{c.fio} {c.phone_number?`(${c.phone_number})`:""}</SelectItem>))} </SelectContent> </Select> </div>
                             <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-payment_type" className="text-right">Turi <span className="text-red-500">*</span></Label> <Select value={formData.payment_type} onValueChange={(v) => handleSelectChange("payment_type", v)} disabled={actionLoading}> <SelectTrigger id="add-payment_type" className="col-span-3"><SelectValue placeholder="Tanlang..." /></SelectTrigger> <SelectContent> <SelectItem value="naqd">Naqd</SelectItem> <SelectItem value="muddatli">Muddatli</SelectItem> <SelectItem value="ipoteka">Ipoteka</SelectItem> <SelectItem value="band">Band</SelectItem> </SelectContent> </Select> </div>
                             {formData.payment_type!=='band'&&(<> <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-total_amount" className="text-right">Um.Summa {(!apartmentCalculationsMap.get(parseInt(formData.apartment||"0"))?.paymentCount)&&<span className="text-red-500">*</span>}</Label> <Input id="add-total_amount" name="total_amount" type="number" min="0.01" step="0.01" value={formData.total_amount} onChange={handleFormChange} className="col-span-3" placeholder="Birinchisida majburiy..." disabled={actionLoading}/> </div> <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-initial_payment" className="text-right">Boshlan.</Label> <Input id="add-initial_payment" name="initial_payment" type="number" min="0" step="0.01" value={formData.initial_payment} onChange={handleFormChange} className="col-span-3" placeholder="Agar bo'lsa..." disabled={actionLoading}/> </div> </>)}
                             <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-paid_amount" className="text-right">To'landi <span className="text-red-500">*</span></Label> <Input id="add-paid_amount" name="paid_amount" type="number" min="0" step="0.01" value={formData.paid_amount} onChange={handleFormChange} className="col-span-3" placeholder="Hozirgi summa..." disabled={actionLoading}/> </div>
                             <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-payment_date" className="text-right">Sana <span className="text-red-500">*</span></Label> <Input id="add-payment_date" name="payment_date" type="date" value={formData.payment_date} onChange={e=>handleDateChange(e.target.valueAsDate??undefined,'payment_date')} className="col-span-3" disabled={actionLoading}/> </div>
                             {formData.payment_type==="muddatli"&&(<> <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-duration_months" className="text-right">Muddat(oy) <span className="text-red-500">*</span></Label> <Input id="add-duration_months" name="duration_months" type="number" min="1" value={formData.duration_months} onChange={handleFormChange} className="col-span-3" placeholder="Oylar..." disabled={actionLoading}/> </div> <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-due_date" className="text-right">Kun <span className="text-red-500">*</span></Label> <Input id="add-due_date" name="due_date" type="number" min="1" max="31" value={formData.due_date} onChange={handleFormChange} className="col-span-3" placeholder="1-31..." disabled={actionLoading}/> </div> </>)}
                             {formData.payment_type==="ipoteka"&&( <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="add-bank_name" className="text-right">Bank <span className="text-red-500">*</span></Label> <Input id="add-bank_name" name="bank_name" value={formData.bank_name} onChange={handleFormChange} className="col-span-3" placeholder="Bank nomi..." disabled={actionLoading}/> </div> )}
                             <div className="grid grid-cols-4 items-start gap-4"> <Label htmlFor="add-additional_info" className="text-right pt-1">Izoh</Label> <Textarea id="add-additional_info" name="additional_info" value={formData.additional_info} onChange={handleFormChange} className="col-span-3" placeholder="..." disabled={actionLoading}/> </div>
                         </div>
                         <DialogFooter> <Button variant="outline" onClick={handleCloseModal} disabled={actionLoading}>Bekor</Button> <Button onClick={handleAddPayment} disabled={actionLoading}> {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saqlanmoqda...</> : "Saqlash"} </Button> </DialogFooter>
                     </DialogContent>
                 </Dialog>

                 <Dialog open={isEditModalOpen} onOpenChange={!actionLoading ? setIsEditModalOpen : undefined}>
                     <DialogContent className="sm:max-w-[480px]">
                         <DialogHeader><DialogTitle>Izohni Tahrirlash</DialogTitle><DialogDescription>ID: {editingPayment?.id}</DialogDescription></DialogHeader>
                         <div className="grid gap-4 py-4"> <div className="grid grid-cols-4 items-start gap-4"> <Label htmlFor="edit-additional_info" className="text-right pt-1">Izoh</Label> <Textarea id="edit-additional_info" name="additional_info" value={editFormData.additional_info} onChange={handleEditFormChange} className="col-span-3" placeholder="..." disabled={actionLoading}/> </div> </div>
                         <DialogFooter> <Button variant="outline" onClick={handleCloseEditModal} disabled={actionLoading}>Bekor</Button> <Button onClick={handleUpdatePayment} disabled={actionLoading}> {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saqlanmoqda...</> : "Saqlash"} </Button> </DialogFooter>
                     </DialogContent>
                 </Dialog>

                 <Dialog open={isRemainingModalOpen} onOpenChange={setIsRemainingModalOpen}>
                     <DialogContent className="sm:max-w-[720px]">
                         <DialogHeader><DialogTitle>Jami Qoldiq Tafsilotlari</DialogTitle><DialogDescription>Filtr bo'yicha qoldig'i borlar (to'lovlar ro'yxati asosida).</DialogDescription></DialogHeader>
                         <div className="overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar">
                             <Table> <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Mijoz</TableHead><TableHead>Obyekt</TableHead><TableHead>Xonadon</TableHead><TableHead className="text-right">Qoldiq</TableHead></TableRow></TableHeader>
                             <TableBody> {remainingDetails.length === 0 ? ( <TableRow><TableCell colSpan={5} className="h-24 text-center">Qoldiq yo'q.</TableCell></TableRow> ) : ( remainingDetails.map((d, i) => ( <TableRow key={i}> <TableCell>{i+1}</TableCell> <TableCell>{d.client}</TableCell> <TableCell>{d.object}</TableCell> <TableCell>{d.apartment}</TableCell> <TableCell className="text-right font-semibold text-blue-600">${formatCurrency(d.remaining)}</TableCell> </TableRow> )) )} </TableBody> </Table>
                         </div>
                         <DialogFooter><Button variant="outline" onClick={() => setIsRemainingModalOpen(false)}>Yopish</Button></DialogFooter>
                     </DialogContent>
                 </Dialog>

                 <Dialog open={isOverdueModalOpen} onOpenChange={!overdueModalLoading ? setIsOverdueModalOpen : undefined}>
                     <DialogContent className="sm:max-w-[720px]">
                         <DialogHeader><DialogTitle>Muddati O'tgan Tafsilotlari</DialogTitle><DialogDescription>Filtr bo'yicha muddati o'tganlar.</DialogDescription></DialogHeader>
                         <div className="overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar">
                             <Table> <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Mijoz</TableHead><TableHead>Obyekt</TableHead><TableHead>Xonadon</TableHead><TableHead className="text-right">M.O'. Summa</TableHead></TableRow></TableHeader>
                             <TableBody> {overdueModalLoading ? ( <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mr-2 h-5 w-5 animate-spin inline-block" /> Yuklanmoqda...</TableCell></TableRow> ) : overdueDetailsData.length === 0 ? ( <TableRow><TableCell colSpan={5} className="h-24 text-center">Muddati o'tgan to'lovlar topilmadi.</TableCell></TableRow> ) : ( overdueDetailsData.map((d, i) => ( <TableRow key={i}> <TableCell>{i+1}</TableCell> <TableCell>{d.client}</TableCell> <TableCell>{d.object}</TableCell> <TableCell>{d.apartment}</TableCell> <TableCell className="text-right font-semibold text-red-600">${formatCurrency(d.overdue)}</TableCell> </TableRow> )) )} </TableBody> </Table>
                         </div>
                         <DialogFooter><Button variant="outline" onClick={() => setIsOverdueModalOpen(false)} disabled={overdueModalLoading}>Yopish</Button></DialogFooter>
                     </DialogContent>
                 </Dialog>

                <footer className="border-t py-4 px-4 text-center text-sm text-muted-foreground mt-auto"> Version 1.4 | CDCGroup & CraDev | since 2019 </footer>
            </div>
        </TooltipProvider>
    );
}