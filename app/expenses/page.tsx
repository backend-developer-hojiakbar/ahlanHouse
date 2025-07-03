"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useRouter, useSearchParams } from "next/navigation";
import {
    Plus,
    DollarSign,
    Building,
    Edit,
    Trash2,
    Loader2,
    HandCoins,
    ArrowUpDown,
} from "lucide-react";
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import toast, { Toaster } from "react-hot-toast";

const VIRTUAL_PAYMENTS_STORAGE_KEY = "ahlan_expenses_virtual_paid_amounts";
type VirtualPayments = { [expenseId: string]: number };

const getVirtualPayments = (): VirtualPayments => {
    if (typeof window !== "undefined") {
        const stored = localStorage.getItem(VIRTUAL_PAYMENTS_STORAGE_KEY);
        try {
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error("Error parsing virtual payments from localStorage", e);
            return {};
        }
    }
    return {};
};

const setVirtualPaymentForExpense = (expenseId: number, amount: number): void => {
    if (typeof window !== "undefined") {
        const payments = getVirtualPayments();
        if (amount > 0) {
            payments[expenseId.toString()] = amount;
        } else {
            delete payments[expenseId.toString()];
        }
        localStorage.setItem(VIRTUAL_PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
    }
};

const getVirtualPaymentForExpense = (expenseId: number): number => {
    if (typeof window !== "undefined") {
        const payments = getVirtualPayments();
        return payments[expenseId.toString()] || 0;
    }
    return 0;
};

const clearVirtualPaymentForExpense = (expenseId: number): void => {
    if (typeof window !== "undefined") {
        const payments = getVirtualPayments();
        delete payments[expenseId.toString()];
        localStorage.setItem(VIRTUAL_PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
    }
};

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

interface Expense {
    id: number;
    amount: string;
    date: string;
    supplier: number;
    supplier_name: string;
    comment: string;
    expense_type: number;
    expense_type_name: string;
    object: number;
    object_name?: string;
    status: string;
}

interface ModalExpense {
    id: number;
    total_expense_amount: number;
    date: string;
    supplier: number;
    supplier_name: string;
    comment: string;
    expense_type_name: string;
    object: number;
    object_name?: string;
    virtual_paid_amount: number;
    calculated_remaining_debt: number;
}

interface SupplierDebtGroup {
    supplier_id: number;
    supplier_name: string;
    total_remaining_debt_for_supplier: number;
    expenses: ModalExpense[];
}

interface Property { id: number; name: string; }
interface Supplier { id: number; company_name: string; balance?: string; contact_person_name?: string; phone_number?: string; address?: string; description?: string; }
interface ExpenseType { id: number; name: string; }

interface CurrentUser {
    fio: string;
    user_type: 'admin' | 'sotuvchi' | 'buxgalter' | 'mijoz' | string;
}

const API_BASE_URL = "http://api.ahlan.uz";
const initialFormData = {
    object: "",
    supplier: "",
    amount: "",
    expense_type: "",
    date: new Date().toISOString().split("T")[0],
    comment: "",
    status: "Nasiya",
};
const initialNewSupplierData = {
    company_name: "",
    contact_person_name: "",
    phone_number: "",
    address: "",
    description: "",
};

export default function ExpensesPage() {
    const router = useRouter();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadingTotals, setLoadingTotals] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSupplierSubmitting, setIsSupplierSubmitting] = useState(false);
    const [isExpenseTypeSubmitting, setIsExpenseTypeSubmitting] = useState(false);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

    const [filteredTotalAmount, setFilteredTotalAmount] = useState<number>(0);
    const [filteredPaidExpensesAmount, setFilteredPaidExpensesAmount] = useState<number>(0);
    const [filteredPendingAmount, setFilteredPendingAmount] = useState<number>(0);
    const [selectedObjectTotal, setSelectedObjectTotal] = useState<number | null>(null);
    const [filters, setFilters] = useState({ object: "", expense_type: "", dateRange: "all" });
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [sortBy, setSortBy] = useState<string>("");

    const [open, setOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [addExpenseTypeOpen, setAddExpenseTypeOpen] = useState(false);
    const [addSupplierOpen, setAddSupplierOpen] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteCode, setDeleteCode] = useState("");
    const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);

    const [paidModalOpen, setPaidModalOpen] = useState(false);
    const [pendingModalOpen, setPendingModalOpen] = useState(false);
    const [modalPaidExpenses, setModalPaidExpenses] = useState<Expense[]>([]);
    const [supplierDebtGroups, setSupplierDebtGroups] = useState<SupplierDebtGroup[]>([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [activeAccordionItem, setActiveAccordionItem] = useState<string | undefined>(undefined);

    const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
    const [formData, setFormData] = useState(initialFormData);
    const [newExpenseTypeName, setNewExpenseTypeName] = useState("");
    const [newSupplierData, setNewSupplierData] = useState(initialNewSupplierData);

    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentDescription, setPaymentDescription] = useState("");
    const [currentPaymentSupplier, setCurrentPaymentSupplier] = useState<Supplier | null>(null);

    const [isClient, setIsClient] = useState(false);

    const handleSort = useCallback((field: string) => {
        setSortBy(field);
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    }, [sortOrder]);

    const sortedExpenses = useMemo(() => {
        if (!sortBy) return expenses;
        
        return [...expenses].sort((a, b) => {
            const aValue = a[sortBy as keyof Expense];
            const bValue = b[sortBy as keyof Expense];
            
            // Status uchun maxsus tartiblash
            if (sortBy === 'status') {
                const statusOrder: { [key: string]: number } = {
                    'To‘langan': 1,
                    'To‘lanmagan': 2,
                    'Qismiy to‘langan': 3
                };
                const aStatus = statusOrder[aValue as string] || 0;
                const bStatus = statusOrder[bValue as string] || 0;
                return sortOrder === 'asc' ? aStatus - bStatus : bStatus - aStatus;
            }
            
            // Summa uchun tartiblash
            if (sortBy === 'amount') {
                const aNum = parseFloat(aValue as string);
                const bNum = parseFloat(bValue as string);
                return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
            }
            
            // Boshqa ustunlar uchun tartiblash
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
            
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
            }
            
            return 0;
        });
    }, [expenses, sortBy, sortOrder]);

    const getAuthHeaders = useCallback((): HeadersInit => {
        if (!accessToken) return { Accept: "application/json", "Content-Type": "application/json" };
        return {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        };
    }, [accessToken]);

    useEffect(() => {
        setIsClient(true);
        const token = localStorage.getItem("access_token");
        if (token) {
            setAccessToken(token);
            const userTypeFromStorage = localStorage.getItem("user_type");
            const userFioFromStorage = localStorage.getItem("user_fio");
            if (userTypeFromStorage && userFioFromStorage) {
                setCurrentUser({ user_type: userTypeFromStorage as CurrentUser['user_type'], fio: userFioFromStorage });
            } else {
                setCurrentUser(null);
            }
        } else {
            toast.error("Iltimos tizimga kiring va davom eting");
            router.push("/login");
        }
    }, [router]);

    const fetchApiData = useCallback(async (endpoint: string, queryParams?: URLSearchParams) => {
        if (!accessToken) return { results: [], count: 0 };
        try {
            const url = queryParams ? `${API_BASE_URL}${endpoint}?${queryParams.toString()}` : `${API_BASE_URL}${endpoint}`;
            const response = await fetch(url, { method: "GET", headers: getAuthHeaders() });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `Server xatosi (Status: ${response.status})` }));
                throw new Error(`Ma'lumot yuklanmadi (Status: ${response.status}): ${errorData.detail || JSON.stringify(errorData)}`);
            }
            return await response.json();
        } catch (error: any) {
            toast.error(error.message || "Ma'lumot yuklashda xatolik");
            throw error;
        }
    }, [accessToken, getAuthHeaders]);

    const fetchAllPaginatedData = useCallback(async (endpoint: string, queryParams: URLSearchParams): Promise<Expense[]> => {
        if (!accessToken) return [];
        queryParams.set("page_size", "10000"); 
        queryParams.delete("page");
        let allResults: Expense[] = [];
        let nextUrl: string | null = `${API_BASE_URL}${endpoint}?${queryParams.toString()}`;
        while (nextUrl) {
            try {
                const response = await fetch(nextUrl, { method: "GET", headers: getAuthHeaders() });
                if (!response.ok) {
                    toast.error("Ma'lumotlarni to'liq yuklashda xatolik yuz berdi.");
                    break;
                }
                const pageData = await response.json();
                allResults = allResults.concat(pageData.results || []);
                nextUrl = pageData.next;
            } catch (error: any) {
                toast.error("Ma'lumotlarni to'liq yuklashda uzilish.");
                nextUrl = null;
            }
        }
        return allResults;
    }, [accessToken, getAuthHeaders]);

    const fetchInitialData = useCallback(async () => {
        if (!accessToken) return;
        try {
            const [props, supps, types] = await Promise.all([
                fetchApiData("/objects/?page_size=1000"),
                fetchApiData("/suppliers/?page_size=1000"),
                fetchApiData("/expense-types/?page_size=1000"),
            ]);
            setProperties(props.results || props);
            setSuppliers(supps.results || supps);
            setExpenseTypes(types.results || types);
        } catch (error) {
            console.error("Boshlang'ich ma'lumotlarni yuklashda xatolik", error);
        }
    }, [accessToken, fetchApiData]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const fetchExpensesAndTotals = useCallback(async () => {
        if (!accessToken || !isClient) return;
        setLoading(true);
        setLoadingTotals(true);
        setIsRefreshing(true);

        const queryParams = new URLSearchParams();
        if (filters.object) queryParams.append("object", filters.object);
        if (filters.expense_type) queryParams.append("expense_type", filters.expense_type);
        if (filters.dateRange && filters.dateRange !== "all") {
            const today = new Date();
            let startDate = new Date(today);
            switch (filters.dateRange) {
                case "today": startDate.setHours(0, 0, 0, 0); break;
                case "week": startDate.setDate(today.getDate() - 7); break;
                case "month": startDate.setMonth(today.getMonth() - 1); break;
                case "quarter": startDate.setMonth(today.getMonth() - 3); break;
                case "year": startDate.setFullYear(today.getFullYear() - 1); break;
            }
            if (startDate <= today) {
                queryParams.append("date__gte", startDate.toISOString().split("T")[0]);
                if (filters.dateRange === "today") queryParams.append("date__lte", today.toISOString().split("T")[0]);
            }
        }
        if (debouncedSearchTerm) queryParams.append("search", debouncedSearchTerm);
        queryParams.append("ordering", sortOrder === "desc" ? "-id" : "id");
        
        try {
            const allExpenses = await fetchAllPaginatedData("/expenses/", queryParams);
            setExpenses(allExpenses);

            let totalAmount = 0, paidAmount = 0, pendingDebt = 0, objectTotal = 0;
            const objectIdNum = Number(filters.object);

            for (const exp of allExpenses) {
                const amount = Number(exp.amount || 0);
                totalAmount += amount;
                if (filters.object && exp.object === objectIdNum) objectTotal += amount;

                if (exp.status === 'To‘langan') {
                    paidAmount += amount;
                    clearVirtualPaymentForExpense(exp.id);
                } else if (exp.status === 'Kutilmoqda') {
                    const virtualPaid = getVirtualPaymentForExpense(exp.id);
                    const remaining = amount - virtualPaid;
                    if (remaining > 0.009) {
                        pendingDebt += remaining;
                    } else {
                        clearVirtualPaymentForExpense(exp.id);
                    }
                }
            }
            setFilteredTotalAmount(totalAmount);
            setFilteredPaidExpensesAmount(paidAmount);
            setFilteredPendingAmount(pendingDebt);
            setSelectedObjectTotal(filters.object ? objectTotal : null);
        } catch (error) {
            console.error("Xarajatlarni yuklashda xato:", error);
            setExpenses([]);
        } finally {
            setLoading(false);
            setLoadingTotals(false);
            setIsRefreshing(false);
        }
    }, [accessToken, isClient, filters, debouncedSearchTerm, sortOrder, fetchAllPaginatedData]);
    
    useEffect(() => {
        fetchExpensesAndTotals();
    }, [fetchExpensesAndTotals]);

    const handleActionAndRefetch = useCallback(async (action: () => Promise<any>) => {
        try {
            await action();
        } catch (error: any) {
            toast.error(error.message || "Amalda xatolik");
        } finally {
            fetchExpensesAndTotals();
        }
    }, [fetchExpensesAndTotals]);

    const updateExpenseAPI = async (expenseId: number, dataToUpdate: Partial<Omit<Expense, 'id' | 'supplier_name' | 'expense_type_name' | 'object_name'>>) => {
        const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}/`, {
            method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(dataToUpdate),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: "Xarajatni yangilash server xatosi" }));
            throw new Error(`Xarajat (ID: ${expenseId}) yangilanmadi (${response.status}): ${err.detail || JSON.stringify(err)}`);
        }
        return await response.json();
    };

    const createSupplierPaymentAPI = async (supplierId: number, amount: string, description: string) => {
        const paymentData = { supplier: supplierId, amount: Number(amount), payment_type: "naqd", description };
        const response = await fetch(`${API_BASE_URL}/supplier-payments/`, {
            method: "POST", headers: getAuthHeaders(), body: JSON.stringify(paymentData),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: "To'lov server xatosi" }));
            throw new Error(`To'lov yozilmadi (${response.status}): ${err.detail || JSON.stringify(err)}`);
        }
        return await response.json();
    };

    const createExpense = () => handleActionAndRefetch(async () => {
        setIsSubmitting(true);
        const expenseStatus = formData.status === "Naqd pul" ? "To‘langan" : "Kutilmoqda";
        const apiPayload = { 
            object: Number(formData.object), 
            supplier: Number(formData.supplier), 
            amount: formData.amount,
            expense_type: Number(formData.expense_type), 
            date: formData.date, 
            comment: formData.comment.trim(),
            status: expenseStatus 
        };
        const newExpense: Expense = await fetchApiData("/expenses/", new URLSearchParams(Object.entries(apiPayload as any))).catch(async () => {
            const res = await fetch(`${API_BASE_URL}/expenses/`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(apiPayload) });
            if (!res.ok) throw new Error("Xarajat qo'shilmadi");
            return res.json();
        });
        
        if (expenseStatus === "To‘langan") {
            try {
                await createSupplierPaymentAPI(apiPayload.supplier, apiPayload.amount, `Xarajat ID: ${newExpense.id} uchun (${apiPayload.comment})`);
            } catch (paymentError: any) { toast.error(`Xarajat qo'shildi, lekin to'lov yozishda xato: ${paymentError.message}`); }
            clearVirtualPaymentForExpense(newExpense.id);
        }
        toast.success("Xarajat muvaffaqiyatli qo'shildi");
        setOpen(false);
        setFormData(initialFormData);
        setSortOrder("desc");
        setIsSubmitting(false);
    });

    const updateExpense = (id: number) => handleActionAndRefetch(async () => {
        if (!currentExpense) throw new Error("Joriy xarajat topilmadi.");
        setIsSubmitting(true);
        const backendStatus = formData.status === "Naqd pul" ? "To‘langan" : "Kutilmoqda";
        const dataToSend = {
            object: Number(formData.object), supplier: Number(formData.supplier),
            amount: formData.amount, expense_type: Number(formData.expense_type),
            date: formData.date, comment: formData.comment.trim(), status: backendStatus,
        };
        await updateExpenseAPI(id, dataToSend);

        if (backendStatus === "To‘langan" && currentExpense.status === "Kutilmoqda") {
            try { await createSupplierPaymentAPI(dataToSend.supplier, dataToSend.amount, `Xarajat ID: ${id} uchun to'lov (tahrirlash)`); } 
            catch (paymentError: any) { toast.error(`Xarajat yangilandi, ammo to'lov yozishda xato: ${paymentError.message}`); }
        }
        if (backendStatus === 'To‘langan') clearVirtualPaymentForExpense(id);
        
        toast.success("Xarajat muvaffaqiyatli yangilandi");
        setEditOpen(false);
        setIsSubmitting(false);
    });

    const handleConfirmDelete = () => handleActionAndRefetch(async () => {
        if (!expenseToDelete || deleteCode !== "7777") throw new Error("Kod noto'g'ri yoki xatolik yuz berdi.");
        await fetch(`${API_BASE_URL}/expenses/${expenseToDelete}/`, { method: "DELETE", headers: getAuthHeaders() });
        clearVirtualPaymentForExpense(expenseToDelete);
        toast.success("Xarajat muvaffaqiyatli o'chirildi");
        setDeleteDialogOpen(false);
    });
    
    const fetchExpenseById = async (id: number) => {
        if (!accessToken) return;
        setEditOpen(true); setCurrentExpense(null); setFormData(initialFormData);
        try {
            const data = await fetchApiData(`/expenses/${id}/`);
            setCurrentExpense(data);
            setFormData({
                object: data.object?.toString() || "", supplier: data.supplier?.toString() || "",
                amount: data.amount || "0", expense_type: data.expense_type?.toString() || "",
                date: data.date ? format(new Date(data.date), "yyyy-MM-dd") : new Date().toISOString().split("T")[0],
                comment: data.comment || "",
                status: data.status === "To‘langan" ? "Naqd pul" : "Nasiya",
            });
        } catch (error: any) { setEditOpen(false); }
    };
    
    const createItem = (url: string, data: any, stateSetter: any, sortFn: any, successMsg: string) => {
        setIsSupplierSubmitting(true); // Can be generic
        fetch(url, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data) })
        .then(res => {
            if(!res.ok) throw new Error("Qo'shishda xatolik");
            return res.json();
        })
        .then(newItem => {
            stateSetter((prev: any[]) => [...prev, newItem].sort(sortFn));
            toast.success(successMsg);
            // Close dialogs
            setAddSupplierOpen(false);
            setAddExpenseTypeOpen(false);
        })
        .catch(err => toast.error(err.message))
        .finally(() => setIsSupplierSubmitting(false));
    }

    const createExpenseType = () => {
        if (!newExpenseTypeName.trim()) return toast.error("Xarajat turi nomi kiritilishi shart");
        createItem(
            `${API_BASE_URL}/expense-types/`, {name: newExpenseTypeName.trim()},
            setExpenseTypes, (a: ExpenseType, b: ExpenseType) => a.name.localeCompare(b.name),
            `"${newExpenseTypeName.trim()}" xarajat turi qo'shildi`
        );
    };

    const createSupplier = () => {
        if (!newSupplierData.company_name.trim()) return toast.error("Kompaniya nomi kiritilishi shart");
        const data = {
            company_name: newSupplierData.company_name.trim(),
            contact_person_name: newSupplierData.contact_person_name?.trim() || null,
            phone_number: newSupplierData.phone_number?.trim() || null,
            address: newSupplierData.address?.trim() || null,
            description: newSupplierData.description?.trim() || null,
        };
        createItem(
            `${API_BASE_URL}/suppliers/`, data,
            setSuppliers, (a: Supplier, b: Supplier) => a.company_name.localeCompare(b.company_name),
            `"${data.company_name}" yetkazib beruvchi qo'shildi`
        );
    };
    
    const handleAddPayment = () => handleActionAndRefetch(async () => {
        if (!currentPaymentSupplier || !paymentAmount || Number(paymentAmount) <= 0 || !paymentDescription.trim()) {
            throw new Error("Summa va tavsifni to'g'ri kiriting.");
        }
        setIsSubmittingPayment(true);
        await createSupplierPaymentAPI(currentPaymentSupplier.id, paymentAmount, `${paymentDescription} (Umumiy qarz uchun)`);
        toast(`${currentPaymentSupplier.company_name} uchun to'lov yozildi.`, { icon: 'ℹ️' });

        const queryParams = new URLSearchParams({ supplier: currentPaymentSupplier.id.toString(), status: "Kutilmoqda", ordering: "date,id" });
        const pendingExpensesForSupplier = await fetchAllPaginatedData("/expenses/", queryParams);

        let paymentToDistribute = Number(paymentAmount);
        const updatePromises: Promise<any>[] = [];
        for (const expense of pendingExpensesForSupplier) {
            if (paymentToDistribute <= 0.009) break;
            const debtOnExpense = Math.max(0, Number(expense.amount) - getVirtualPaymentForExpense(expense.id));
            if (debtOnExpense <= 0.009) continue;

            const paymentForThis = Math.min(paymentToDistribute, debtOnExpense);
            if (paymentForThis >= debtOnExpense - 0.009) {
                clearVirtualPaymentForExpense(expense.id);
                const payload = { ...expense, status: "To‘langan" };
                delete (payload as any).supplier_name;
                delete (payload as any).expense_type_name;
                delete (payload as any).object_name;
                updatePromises.push(updateExpenseAPI(expense.id, payload));
            } else {
                setVirtualPaymentForExpense(expense.id, getVirtualPaymentForExpense(expense.id) + paymentForThis);
            }
            paymentToDistribute -= paymentForThis;
        }
        if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
            toast.success("Tegishli xarajatlar statuslari yangilandi.");
        }
        setPaymentDialogOpen(false);
        setIsSubmittingPayment(false);
    });
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSupplierChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setNewSupplierData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSelectChange = (name: string, value: string) => setFormData((prev) => ({ ...prev, [name]: value }));
    const handleFilterChange = (name: string, value: string) => setFilters((prev) => ({ ...prev, [name]: value === "all" ? "" : value }));
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value);
    const handleOpenEditDialog = (expenseId: number) => fetchExpenseById(expenseId);
    const handleSortToggle = () => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    
    const validateFormData = (): boolean => {
        const errors = ["object", "supplier", "expense_type", "date", "comment", "status"]
            .filter(key => !(formData as any)[key])
            .map(key => `"${key}"`);
        if (!formData.amount || Number(formData.amount) <= 0) errors.push('"Summa"');
        if (errors.length > 0) {
            toast.error(`${errors.join(", ")} to'ldirilishi shart.`);
            return false;
        }
        return true;
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateFormData()) createExpense();
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentExpense && validateFormData()) updateExpense(currentExpense.id);
    };

    const getExpenseTypeStyle = (typeName?: string) => {
        const lower = (typeName || '').toLowerCase();
        if (lower.includes("qurilish") || lower.includes("material")) return "bg-blue-100 text-blue-800";
        if (lower.includes("ishchi") || lower.includes("usta")) return "bg-green-100 text-green-800";
        if (lower.includes("kommunal")) return "bg-yellow-100 text-yellow-800";
        return "bg-secondary text-secondary-foreground";
    };

    const formatCurrency = useCallback((amount: number | string | undefined | null) => {
        const numericAmount = Number(amount || 0);
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numericAmount);
    }, []);

    const formatDate = useCallback((dateString: string | undefined | null) => {
        if (!dateString) return "-";
        try {
            return format(new Date(dateString), "dd/MM/yyyy");
        } catch {
            return dateString;
        }
    }, []);

    const getObjectName = useCallback((objectId: number | undefined) => {
        return properties.find((p) => p.id === objectId)?.name || `ID: ${objectId}`;
    }, [properties]);

    const canPerformSensitiveActions = useCallback((user: CurrentUser | null) => {
        if (!user) return false;
        return user.user_type !== 'sotuvchi' && user.user_type !== 'buxgalter' && !user.fio.toLowerCase().includes('sardor');
    }, []);

    if (!isClient) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
            <header className="border-b sticky top-0 bg-background z-10">
                <div className="flex h-16 items-center px-4 container mx-auto">
                    <MainNav className="mx-6" />
                    <div className="ml-auto flex items-center space-x-4"><UserNav /></div>
                </div>
            </header>

            <main className="flex-1 space-y-4 p-4 md:p-8 pt-6 container mx-auto">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 mb-6">
                    <h2 className="text-3xl font-bold tracking-tight">Xarajatlar</h2>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild><Button size="sm" disabled={!accessToken || loading}><Plus className="mr-2 h-4 w-4" /> Yangi xarajat</Button></DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader><DialogTitle>Yangi xarajat qo'shish</DialogTitle><DialogDescription>"Naqd pul" tanlansa, xarajat "To‘langan" bo'ladi.</DialogDescription></DialogHeader>
                            <form id="add-expense-form" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                                <div className="space-y-1"><Label htmlFor="amount">Summa (USD) *</Label><Input required id="amount" name="amount" type="number" step="0.01" min="0.01" value={formData.amount} onChange={handleChange} /></div>
                                <div className="space-y-1"><Label htmlFor="date">Sana *</Label><Input required id="date" name="date" type="date" value={formData.date} onChange={handleChange} max={new Date().toISOString().split("T")[0]} /></div>
                                <div className="space-y-1"><Label htmlFor="supplier">Yetkazib beruvchi *</Label>
                                    <div className="flex items-center space-x-2">
                                        <Select required value={formData.supplier} onValueChange={(v) => handleSelectChange("supplier", v)} name="supplier"><SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger><SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.company_name}</SelectItem>)}</SelectContent></Select>
                                        <Dialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen}><DialogTrigger asChild><Button type="button" variant="outline" size="icon"><Plus className="h-4 w-4" /></Button></DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Yangi yetkazib beruvchi</DialogTitle></DialogHeader><div className="grid gap-4 py-4">
                                                <Input name="company_name" placeholder="Kompaniya nomi *" value={newSupplierData.company_name} onChange={handleSupplierChange} />
                                                <Input name="contact_person_name" placeholder="Kontakt" value={newSupplierData.contact_person_name} onChange={handleSupplierChange} />
                                                <Input name="phone_number" placeholder="Telefon" value={newSupplierData.phone_number} onChange={handleSupplierChange} />
                                                <Textarea name="address" placeholder="Manzil" value={newSupplierData.address} onChange={handleSupplierChange} />
                                            </div><DialogFooter><Button onClick={createSupplier} disabled={isSupplierSubmitting}>{isSupplierSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Qo'shish</Button></DialogFooter></DialogContent></Dialog>
                                    </div>
                                </div>
                                <div className="space-y-1"><Label htmlFor="expense_type">Xarajat turi *</Label>
                                     <div className="flex items-center space-x-2">
                                        <Select required value={formData.expense_type} onValueChange={(v) => handleSelectChange("expense_type", v)} name="expense_type"><SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger><SelectContent>{expenseTypes.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}</SelectContent></Select>
                                        <Dialog open={addExpenseTypeOpen} onOpenChange={setAddExpenseTypeOpen}><DialogTrigger asChild><Button type="button" variant="outline" size="icon"><Plus className="h-4 w-4" /></Button></DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Yangi xarajat turi</DialogTitle></DialogHeader><div className="grid gap-4 py-4">
                                                <Input placeholder="Nomi *" value={newExpenseTypeName} onChange={(e) => setNewExpenseTypeName(e.target.value)} />
                                            </div><DialogFooter><Button onClick={createExpenseType} disabled={isExpenseTypeSubmitting}>{isExpenseTypeSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Qo'shish</Button></DialogFooter></DialogContent></Dialog>
                                    </div>
                                </div>
                                <div className="space-y-1"><Label htmlFor="object">Obyekt *</Label><Select required value={formData.object} onValueChange={(v) => handleSelectChange("object", v)} name="object"><SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger><SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-1"><Label htmlFor="status">To'lov turi *</Label><Select required value={formData.status} onValueChange={(v) => handleSelectChange("status", v)} name="status"><SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger><SelectContent><SelectItem value="Naqd pul">Naqd pul</SelectItem><SelectItem value="Nasiya">Nasiya</SelectItem></SelectContent></Select></div>
                                <div className="space-y-1 sm:col-span-2"><Label htmlFor="comment">Izoh *</Label><Textarea required id="comment" name="comment" value={formData.comment} onChange={handleChange} /></div>
                            </form>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Bekor qilish</Button>
                                <Button type="submit" form="add-expense-form" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Saqlash</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader><DialogTitle>Xarajatni tahrirlash (ID: {currentExpense?.id})</DialogTitle></DialogHeader>
                        {currentExpense ? (<form id="edit-expense-form" onSubmit={handleEditSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                            <div className="space-y-1"><Label>Summa</Label><Input name="amount" type="number" step="0.01" value={formData.amount} onChange={handleChange} /></div>
                            <div className="space-y-1"><Label>Sana</Label><Input name="date" type="date" value={formData.date} onChange={handleChange} /></div>
                            <div className="space-y-1"><Label>Yetkazib beruvchi</Label><Select name="supplier" value={formData.supplier} onValueChange={(v) => handleSelectChange("supplier", v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.company_name}</SelectItem>)}</SelectContent></Select></div>
                            <div className="space-y-1"><Label>Xarajat turi</Label><Select name="expense_type" value={formData.expense_type} onValueChange={(v) => handleSelectChange("expense_type", v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{expenseTypes.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}</SelectContent></Select></div>
                            <div className="space-y-1"><Label>Obyekt</Label><Select name="object" value={formData.object} onValueChange={(v) => handleSelectChange("object", v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                            <div className="space-y-1"><Label>To'lov turi</Label><Select name="status" value={formData.status} onValueChange={(v) => handleSelectChange("status", v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Naqd pul">Naqd pul</SelectItem><SelectItem value="Nasiya">Nasiya</SelectItem></SelectContent></Select></div>
                            <div className="sm:col-span-2"><Label>Izoh</Label><Textarea name="comment" value={formData.comment} onChange={handleChange} /></div>
                        </form>) : <div className="h-40 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div>}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Bekor qilish</Button>
                            <Button type="submit" form="edit-expense-form" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Yangilash</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="space-y-1"><Label htmlFor="filter-object">Obyekt</Label><Select value={filters.object} onValueChange={(v) => handleFilterChange("object", v)}><SelectTrigger><SelectValue placeholder="Barcha obyektlar" /></SelectTrigger><SelectContent><SelectItem value="all">Barcha</SelectItem>{properties.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1"><Label htmlFor="filter-expense_type">Xarajat turi</Label><Select value={filters.expense_type} onValueChange={(v) => handleFilterChange("expense_type", v)}><SelectTrigger><SelectValue placeholder="Barcha turlar" /></SelectTrigger><SelectContent><SelectItem value="all">Barcha</SelectItem>{expenseTypes.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1"><Label htmlFor="filter-dateRange">Sana</Label><Select value={filters.dateRange} onValueChange={(v) => handleFilterChange("dateRange", v)}><SelectTrigger><SelectValue placeholder="Barcha sanalar" /></SelectTrigger><SelectContent><SelectItem value="all">Barcha</SelectItem><SelectItem value="today">Bugun</SelectItem><SelectItem value="week">Hafta</SelectItem><SelectItem value="month">Oy</SelectItem><SelectItem value="quarter">Chorak</SelectItem><SelectItem value="year">Yil</SelectItem></SelectContent></Select></div>
                    <div className="space-y-1"><Label htmlFor="search">Qidiruv</Label><Input id="search" placeholder="Yetkazib beruvchi, izoh..." value={searchTerm} onChange={handleSearchChange} /></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Umumiy xarajatlar</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent>{loadingTotals ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <div className="text-2xl font-bold">{formatCurrency(filteredTotalAmount)}</div>}</CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">To'langan</CardTitle><HandCoins className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent>{loadingTotals ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <div className="text-2xl font-bold">{formatCurrency(filteredPaidExpensesAmount)}</div>}</CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Nasiya</CardTitle><HandCoins className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent>{loadingTotals ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <div className="text-2xl font-bold">{formatCurrency(filteredPendingAmount)}</div>}</CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tanlangan Obyekt</CardTitle><Building className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent>{loadingTotals ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <div className="text-2xl font-bold">{selectedObjectTotal !== null ? formatCurrency(selectedObjectTotal) : "-"}</div>}</CardContent></Card>
                </div>
                
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[60px]"><Button variant="ghost" onClick={handleSortToggle} className="p-0 hover:bg-transparent flex items-center space-x-1"><span>#</span><ArrowUpDown className="h-4 w-4" /></Button></TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>Sana</TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort("object")}>Obyekt</TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort("supplier_name")}>Yetkazib beruvchi</TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort("comment")}>Izoh</TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort("expense_type_name")}>Turi</TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>Status</TableHead>
                                <TableHead className="cursor-pointer text-right" onClick={() => handleSort("amount")}>Summa</TableHead>
                                {canPerformSensitiveActions(currentUser) && <TableHead className="text-right">Amallar</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={canPerformSensitiveActions(currentUser) ? 9 : 8} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                            ) : sortedExpenses.length > 0 ? (
                                sortedExpenses.map((expense, index) => {
                                    const rowNumber = sortOrder === "desc" ? (sortedExpenses.length - index) : (index + 1);
                                    return (
                                        <TableRow key={expense.id}>
                                            <TableCell className="font-medium cursor-pointer" onClick={() => handleSort("id")}>{rowNumber}</TableCell>
                                            <TableCell>{expense.date}</TableCell>
                                            <TableCell>{getObjectName(expense.object)}</TableCell>
                                            <TableCell>{expense.supplier_name}</TableCell>
                                            <TableCell className="max-w-[250px] truncate" title={expense.comment}>{expense.comment}</TableCell>
                                            <TableCell><Badge variant="outline" className={getExpenseTypeStyle(expense.expense_type_name)}>{expense.expense_type_name}</Badge></TableCell>
                                            <TableCell><Badge variant={expense.status === "To‘langan" ? "default" : "secondary"}>{expense.status}</Badge></TableCell>
                                            <TableCell className="text-right font-semibold">{formatCurrency(expense.amount)}</TableCell>
                                            {canPerformSensitiveActions(currentUser) && (
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(expense.id)} title="Tahrirlash"><Edit className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => { setExpenseToDelete(expense.id); setDeleteDialogOpen(true); }} title="O'chirish"><Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" /></Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow><TableCell colSpan={canPerformSensitiveActions(currentUser) ? 9 : 8} className="h-24 text-center">Xarajatlar topilmadi.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </main>
        </div>
    );
}