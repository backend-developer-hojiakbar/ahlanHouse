"use client";

import React, { useState, useEffect, useCallback } from "react";
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
    ChevronLeft,
    ChevronRight,
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
const itemsPerPage = 25;

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

    const searchParams = useSearchParams();
    const initialPage = Number(searchParams.get("page")) || 1;
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [totalPages, setTotalPages] = useState(1);
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

    useEffect(() => {
        setIsClient(true);
        const token = localStorage.getItem("access_token");
        if (token) {
            setAccessToken(token);
            const userTypeFromStorage = localStorage.getItem("user_type");
            const userFioFromStorage = localStorage.getItem("user_fio");

            if (userTypeFromStorage && userFioFromStorage) {
                setCurrentUser({
                    user_type: userTypeFromStorage as CurrentUser['user_type'],
                    fio: userFioFromStorage,
                });
            } else {
                console.warn("Foydalanuvchi ma'lumotlari topilmadi.");
                setCurrentUser(null);
            }
        } else {
            toast.error("Iltimos tizimga kiring");
            router.push("/login");
        }
    }, [router]);

    const getAuthHeaders = useCallback((): HeadersInit => {
        if (!accessToken) return { Accept: "application/json", "Content-Type": "application/json" };
        return {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        };
    }, [accessToken]);

    const fetchAllPaginatedData = useCallback(async (endpoint: string, queryParams: URLSearchParams): Promise<Expense[]> => {
        if (!accessToken) return [];
        
        let allResults: Expense[] = [];
        let nextUrl: string | null = `${API_BASE_URL}${endpoint}?${queryParams.toString()}`;

        while (nextUrl) {
            try {
                const response = await fetch(nextUrl, { method: "GET", headers: getAuthHeaders() });
                if (!response.ok) {
                    console.error("Paginated fetch error", await response.text());
                    toast.error("Ma'lumotlarni to'liq yuklashda xatolik yuz berdi.");
                    break;
                }
                const pageData = await response.json();
                allResults = allResults.concat(pageData.results || []);
                nextUrl = pageData.next;
            } catch (error: any) {
                console.error("Paginated fetch failed", error);
                toast.error("Ma'lumotlarni to'liq yuklashda uzilish.");
                nextUrl = null;
            }
        }
        return allResults;
    }, [accessToken, getAuthHeaders]);

    const fetchApiData = useCallback(
        async (endpoint: string, queryParams?: URLSearchParams) => {
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
                console.error(`Error fetching ${endpoint}:`, error);
                toast.error(error.message || "Ma'lumot yuklashda xatolik");
                throw error;
            }
        },
        [accessToken, getAuthHeaders]
    );

    const fetchInitialData = useCallback(async () => {
        if (!accessToken) return;
        try {
            await Promise.all([
                fetchApiData("/objects/?page_size=1000").then(data => setProperties(data.results || data)),
                fetchApiData("/suppliers/?page_size=1000").then(data => setSuppliers(data.results || data)),
                fetchApiData("/expense-types/?page_size=1000").then(data => setExpenseTypes(data.results || data)),
            ]);
        } catch (error) {
            console.error("Boshlang'ich ma'lumotlarni yuklashda xatolik", error);
        }
    }, [accessToken, fetchApiData]);

    const fetchExpensesAndFilteredTotals = useCallback(async () => {
        if (!accessToken) return;
        setIsRefreshing(true);
        setLoadingTotals(true);

        const baseQueryParams = new URLSearchParams();
        if (filters.object && filters.object !== "all") baseQueryParams.append("object", filters.object);
        if (filters.expense_type && filters.expense_type !== "all") baseQueryParams.append("expense_type", filters.expense_type);
        if (filters.dateRange && filters.dateRange !== "all") {
            const today = new Date(); let startDate = new Date(today);
            switch (filters.dateRange) {
                case "today": startDate.setHours(0, 0, 0, 0); break;
                case "week": startDate.setDate(today.getDate() - 7); break;
                case "month": startDate.setMonth(today.getMonth() - 1); break;
                case "quarter": startDate.setMonth(today.getMonth() - 3); break;
                case "year": startDate.setFullYear(today.getFullYear() - 1); break;
            }
            if (startDate <= today) {
                baseQueryParams.append("date__gte", startDate.toISOString().split("T")[0]);
                if (filters.dateRange === "today") baseQueryParams.append("date__lte", today.toISOString().split("T")[0]);
            }
        }
        if (debouncedSearchTerm) baseQueryParams.append("search", debouncedSearchTerm);

        const tableQueryParams = new URLSearchParams(baseQueryParams);
        tableQueryParams.append("ordering", sortOrder === "desc" ? "-id" : "id");
        tableQueryParams.append("page", currentPage.toString());
        tableQueryParams.append("page_size", itemsPerPage.toString());

        try {
            const [tableDataResponse, allExpensesForTotals] = await Promise.all([
                fetchApiData("/expenses/", tableQueryParams),
                fetchAllPaginatedData("/expenses/", baseQueryParams)
            ]);
            
            setExpenses(tableDataResponse.results || []);
            setTotalPages(Math.ceil((tableDataResponse.count || 0) / itemsPerPage));
            setTotalExpenses(tableDataResponse.count || 0);

            let totalAmount = 0;
            let paidAmount = 0;
            let pendingDebt = 0;
            let objectTotal = 0;
            const objectIdNum = Number(filters.object);

            for (const exp of allExpensesForTotals) {
                const amount = Number(exp.amount || 0);
                totalAmount += amount;

                if (filters.object && filters.object !== "all" && exp.object === objectIdNum) {
                    objectTotal += amount;
                }

                if (exp.status === 'To‘langan') {
                    paidAmount += amount;
                    if (isClient) clearVirtualPaymentForExpense(exp.id);
                } else if (exp.status === 'Kutilmoqda') {
                    const virtualPaid = isClient ? getVirtualPaymentForExpense(exp.id) : 0;
                    const remaining = amount - virtualPaid;
                    if (remaining > 0.009) {
                        pendingDebt += remaining;
                    } else {
                        if (isClient) clearVirtualPaymentForExpense(exp.id);
                    }
                }
            }

            setFilteredTotalAmount(totalAmount);
            setFilteredPaidExpensesAmount(paidAmount);
            setFilteredPendingAmount(pendingDebt);

            if (filters.object && filters.object !== "all") {
                setSelectedObjectTotal(objectTotal);
            } else {
                setSelectedObjectTotal(null);
            }

        } catch (error) {
            console.error("Xarajatlarni yuklashda umumiy xatolik:", error);
            setExpenses([]); setTotalPages(1); setTotalExpenses(0);
            setFilteredTotalAmount(0); setFilteredPaidExpensesAmount(0); setFilteredPendingAmount(0); setSelectedObjectTotal(null);
        } finally {
            setLoadingTotals(false);
            setIsRefreshing(false);
            setLoading(false);
        }
    }, [accessToken, filters, currentPage, debouncedSearchTerm, sortOrder, fetchApiData, fetchAllPaginatedData, isClient]);
    
    const fetchModalData = useCallback(async (status: 'To‘langan' | 'Kutilmoqda') => {
        if (!accessToken) return [];
        setModalLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (filters.object && filters.object !== "all") queryParams.append("object", filters.object);
            if (filters.expense_type && filters.expense_type !== "all") queryParams.append("expense_type", filters.expense_type);
            if (debouncedSearchTerm) queryParams.append("search", debouncedSearchTerm);
            queryParams.append("status", status);
            queryParams.append("ordering", status === 'To‘langan' ? "-date,-id" : "date,id");

            return await fetchAllPaginatedData("/expenses/", queryParams);
        } catch (error) {
            return [];
        } finally {
            setModalLoading(false);
        }
    }, [accessToken, filters, debouncedSearchTerm, fetchAllPaginatedData]);


    const handleOpenPaidModal = useCallback(async () => {
        setPaidModalOpen(true);
        const data = await fetchModalData('To‘langan');
        setModalPaidExpenses(data);
    }, [fetchModalData]);

    const handleOpenPendingModal = useCallback(async () => {
        setPendingModalOpen(true);
        if (!isClient) return;
        const pendingRawExpenses = await fetchModalData('Kutilmoqda');
        
        const groups: Record<number, SupplierDebtGroup> = {};
        for (const rawExpense of pendingRawExpenses) {
            const totalExpenseAmount = Number(rawExpense.amount);
            const virtualPaid = getVirtualPaymentForExpense(rawExpense.id);
            const calculatedRemaining = totalExpenseAmount - virtualPaid;
            if (calculatedRemaining <= 0.009) {
                clearVirtualPaymentForExpense(rawExpense.id);
                continue;
            }
            const modalExpenseItem: ModalExpense = {
                id: rawExpense.id,
                total_expense_amount: totalExpenseAmount,
                date: rawExpense.date,
                supplier: rawExpense.supplier,
                supplier_name: rawExpense.supplier_name || suppliers.find(s => s.id === rawExpense.supplier)?.company_name || `Yetk. ID: ${rawExpense.supplier}`,
                comment: rawExpense.comment,
                expense_type_name: rawExpense.expense_type_name || expenseTypes.find(et => et.id === rawExpense.expense_type)?.name || `Turi ID: ${rawExpense.expense_type}`,
                object: rawExpense.object,
                object_name: rawExpense.object_name || properties.find(p => p.id === rawExpense.object)?.name || "-",
                virtual_paid_amount: virtualPaid,
                calculated_remaining_debt: calculatedRemaining,
            };
            if (!groups[rawExpense.supplier]) {
                groups[rawExpense.supplier] = {
                    supplier_id: rawExpense.supplier,
                    supplier_name: modalExpenseItem.supplier_name,
                    total_remaining_debt_for_supplier: 0,
                    expenses: [],
                };
            }
            groups[rawExpense.supplier].expenses.push(modalExpenseItem);
            groups[rawExpense.supplier].total_remaining_debt_for_supplier += calculatedRemaining;
        }
        const groupedData = Object.values(groups)
            .filter(group => group.total_remaining_debt_for_supplier > 0.009)
            .sort((a, b) => a.supplier_name.localeCompare(b.supplier_name));
        setSupplierDebtGroups(groupedData);
    }, [isClient, fetchModalData, suppliers, properties, expenseTypes]);

    useEffect(() => {
        if (accessToken) {
            fetchInitialData();
        }
    }, [accessToken, fetchInitialData]);

    useEffect(() => {
        if (accessToken && isClient) {
            fetchExpensesAndFilteredTotals();
        }
    }, [accessToken, isClient, filters, currentPage, debouncedSearchTerm, sortOrder, fetchExpensesAndFilteredTotals]);

    useEffect(() => {
        if (isClient) {
            const params = new URLSearchParams(window.location.search);
            if (currentPage === 1) params.delete("page"); else params.set("page", currentPage.toString());
            window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
        }
    }, [currentPage, isClient]);

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

    const createExpense = async (expenseData: any) => {
        if (!accessToken) { toast.error("Avtorizatsiya tokeni topilmadi"); return; }
        setIsSubmitting(true);
        try {
            const expenseStatus = formData.status === "Naqd pul" ? "To‘langan" : "Kutilmoqda";
            const apiPayload = { ...expenseData, status: expenseStatus };
            const response = await fetch(`${API_BASE_URL}/expenses/`, {
                method: "POST", headers: getAuthHeaders(), body: JSON.stringify(apiPayload),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({ detail: "Xarajat qo'shishda server xatosi" }));
                throw new Error(`Xarajat qo'shilmadi (${response.status}): ${err.detail || JSON.stringify(err)}`);
            }
            const newExpense: Expense = await response.json();
            if (expenseStatus === "To‘langan") {
                try {
                    await createSupplierPaymentAPI(expenseData.supplier, expenseData.amount, `Xarajat ID: ${newExpense.id} uchun (${expenseData.comment})`);
                } catch (paymentError: any) { toast.error(`Xarajat qo'shildi, lekin to'lov yozishda xato: ${paymentError.message}`); }
                clearVirtualPaymentForExpense(newExpense.id);
            }
            toast.success("Xarajat muvaffaqiyatli qo'shildi");
            setOpen(false); setFormData(initialFormData);
            if (currentPage !== 1) setCurrentPage(1); else await fetchExpensesAndFilteredTotals();
        } catch (error: any) { toast.error(error.message); }
        finally { setIsSubmitting(false); }
    };

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

    const updateExpense = async (id: number, expenseDataFromForm: any) => {
        if (!accessToken || !currentExpense) { toast.error("Xatolik: Joriy xarajat topilmadi."); return; }
        setIsSubmitting(true);
        const originalStatus = currentExpense.status;
        try {
            const newStatusChoice = formData.status;
            const backendStatus = newStatusChoice === "Naqd pul" ? "To‘langan" : "Kutilmoqda";
            const dataToSendToBackend = {
                object: Number(expenseDataFromForm.object), supplier: Number(expenseDataFromForm.supplier),
                amount: expenseDataFromForm.amount, expense_type: Number(expenseDataFromForm.expense_type),
                date: expenseDataFromForm.date, comment: expenseDataFromForm.comment.trim(),
                status: backendStatus,
            };
            await updateExpenseAPI(id, dataToSendToBackend);
            if (backendStatus === "To‘langan" && originalStatus === "Kutilmoqda") {
                try {
                    await createSupplierPaymentAPI(
                        Number(expenseDataFromForm.supplier), expenseDataFromForm.amount,
                        `Xarajat ID: ${id} uchun to'lov (tahrirlash orqali) - ${expenseDataFromForm.comment}`
                    );
                } catch (paymentError: any) { toast.error(`Xarajat yangilandi, lekin to'lov yozishda xato: ${paymentError.message}`); }
            }
            if (backendStatus === "To‘langan") { clearVirtualPaymentForExpense(id); }
            toast.success("Xarajat muvaffaqiyatli yangilandi");
            setEditOpen(false); setCurrentExpense(null); setFormData(initialFormData);
            await fetchExpensesAndFilteredTotals();
        } catch (error: any) { toast.error(error.message); }
        finally { setIsSubmitting(false); }
    };

    const deleteExpense = async (id: number) => { setExpenseToDelete(id); setDeleteCode(""); setDeleteDialogOpen(true); };
    const handleConfirmDelete = async () => {
        if (!accessToken || !expenseToDelete || deleteCode !== "7777") {
            toast.error("Noto'g'ri kod yoki xatolik.");
            if (deleteCode !== "7777" && expenseToDelete) toast.error("O'chirish kodi noto'g'ri!");
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/expenses/${expenseToDelete}/`, { method: "DELETE", headers: getAuthHeaders() });
            if (response.status === 204 || response.ok) {
                clearVirtualPaymentForExpense(expenseToDelete);
                toast.success("Xarajat muvaffaqiyatli o'chirildi");
                setDeleteDialogOpen(false); setDeleteCode(""); setExpenseToDelete(null);
                await fetchExpensesAndFilteredTotals();
            } else {
                const err = await response.json().catch(() => ({ detail: "O'chirishda server xatosi" }));
                throw new Error(`O'chirishda xatolik (${response.status}): ${err.detail || JSON.stringify(err)}`);
            }
        } catch (error: any) { toast.error(error.message); }
    };

    const createExpenseType = async () => {
        if (!accessToken || !newExpenseTypeName.trim()) { toast.error("Xarajat turi nomi kiritilishi shart"); return; }
        setIsExpenseTypeSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/expense-types/`, {
                method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ name: newExpenseTypeName.trim() })
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({ detail: "Xarajat turi qo'shishda server xatosi" }));
                throw new Error(`Xarajat turi qo'shilmadi (${response.status}): ${err.detail || JSON.stringify(err)}`);
            }
            const newType: ExpenseType = await response.json();
            setExpenseTypes((prev) => [...prev, newType].sort((a, b) => a.name.localeCompare(b.name)));
            setFormData((prev) => ({ ...prev, expense_type: newType.id.toString() }));
            setNewExpenseTypeName(""); setAddExpenseTypeOpen(false);
            toast.success(`"${newType.name}" xarajat turi qo'shildi`);
        } catch (error: any) { toast.error(error.message); }
        finally { setIsExpenseTypeSubmitting(false); }
    };

    const createSupplier = async () => {
        if (!accessToken || !newSupplierData.company_name.trim()) { toast.error("Kompaniya nomi kiritilishi shart"); return; }
        setIsSupplierSubmitting(true);
        try {
            const supplierDataToSubmit = {
                company_name: newSupplierData.company_name.trim(),
                contact_person_name: newSupplierData.contact_person_name?.trim() || null,
                phone_number: newSupplierData.phone_number?.trim() || null,
                address: newSupplierData.address?.trim() || null,
                description: newSupplierData.description?.trim() || null,
            };
            const response = await fetch(`${API_BASE_URL}/suppliers/`, {
                method: "POST", headers: getAuthHeaders(), body: JSON.stringify(supplierDataToSubmit),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessages = Object.entries(errorData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("; ");
                throw new Error(`Yetkazib beruvchi qo'shishda xatolik (${response.status}): ${errorMessages || "Server xatosi"}`);
            }
            const newSupplier: Supplier = await response.json();
            setSuppliers((prevSuppliers) => [...prevSuppliers, newSupplier].sort((a, b) => a.company_name.localeCompare(b.company_name)));
            setFormData((prevFormData) => ({ ...prevFormData, supplier: newSupplier.id.toString(), }));
            toast.success(`"${newSupplier.company_name}" yetkazib beruvchi qo'shildi`);
            setNewSupplierData(initialNewSupplierData); setAddSupplierOpen(false);
        } catch (error: any) { toast.error(error.message); }
        finally { setIsSupplierSubmitting(false); }
    };

    const handleAddPayment = async () => {
        if (!accessToken || !currentPaymentSupplier || !paymentAmount || Number(paymentAmount) <= 0 || !paymentDescription.trim()) {
            toast.error("Summa va tavsifni to'g'ri kiriting."); return;
        }
        setIsSubmittingPayment(true);
        try {
            await createSupplierPaymentAPI(currentPaymentSupplier.id, paymentAmount, `${paymentDescription} (Umumiy qarz uchun)`);
            toast(`${currentPaymentSupplier.company_name} uchun to'lov yozildi.`, { icon: 'ℹ️' });
            
            const queryParams = new URLSearchParams({
                supplier: currentPaymentSupplier.id.toString(), 
                status: "Kutilmoqda",
                ordering: "date,id"
            });
            const pendingExpensesForSupplier = await fetchAllPaginatedData("/expenses/", queryParams);

            let paymentAmountToDistribute = Number(paymentAmount);
            const updatePromises: Promise<any>[] = [];
            for (const expense of pendingExpensesForSupplier) {
                if (paymentAmountToDistribute <= 0.009) break;
                const expenseTotalAmount = Number(expense.amount);
                const currentVirtualPaid = getVirtualPaymentForExpense(expense.id);
                const debtRemainingOnThisExpense = Math.max(0, expenseTotalAmount - currentVirtualPaid);
                if (debtRemainingOnThisExpense <= 0.009) continue;
                let paymentAppliedToThisExpense = 0;
                if (paymentAmountToDistribute >= debtRemainingOnThisExpense) {
                    paymentAppliedToThisExpense = debtRemainingOnThisExpense;
                    clearVirtualPaymentForExpense(expense.id);
                    const expenseUpdatePayload = { ...expense, status: "To‘langan" };
                    delete (expenseUpdatePayload as any).supplier_name; delete (expenseUpdatePayload as any).expense_type_name; delete (expenseUpdatePayload as any).object_name;
                    updatePromises.push(updateExpenseAPI(expense.id, expenseUpdatePayload));
                } else {
                    paymentAppliedToThisExpense = paymentAmountToDistribute;
                    setVirtualPaymentForExpense(expense.id, currentVirtualPaid + paymentAppliedToThisExpense);
                }
                paymentAmountToDistribute -= paymentAppliedToThisExpense;
            }
            if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
                toast.success("Tegishli xarajatlar statuslari yangilandi.");
            } else {
                 toast.success("To'lov muvaffaqiyatli qayd etildi.");
            }
            setPaymentDialogOpen(false); setPaymentAmount(""); setPaymentDescription(""); setCurrentPaymentSupplier(null);
            await fetchExpensesAndFilteredTotals();
            if (pendingModalOpen) await handleOpenPendingModal();
            if (paidModalOpen) await handleOpenPaidModal();
        } catch (error: any) {
            console.error("To'lov jarayonida xatolik:", error);
            toast.error(error.message || "To'lovda noma'lum xatolik");
        } finally { setIsSubmittingPayment(false); }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSupplierChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setNewSupplierData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSelectChange = (name: string, value: string) => setFormData((prev) => ({ ...prev, [name]: value }));
    const handleFilterChange = (name: string, value: string) => { setFilters((prev) => ({ ...prev, [name]: value === "all" ? "" : value })); setCurrentPage(1); };
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setCurrentPage(1); };
    const handleOpenEditDialog = (expenseId: number) => fetchExpenseById(expenseId);
    const handlePageChange = (page: number) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };
    const handleSortToggle = () => { setSortOrder((prev) => (prev === "desc" ? "asc" : "desc")); setCurrentPage(1); };
    
    const handleOpenSupplierPaymentDialog = (supplierGroup: SupplierDebtGroup) => {
        setCurrentPaymentSupplier({ id: supplierGroup.supplier_id, company_name: supplierGroup.supplier_name });
        setPaymentAmount(supplierGroup.total_remaining_debt_for_supplier.toFixed(2));
        setPaymentDescription(`To'lov: ${supplierGroup.supplier_name} uchun umumiy qarzga`);
        setPaymentDialogOpen(true);
    };
    const validateFormData = (): boolean => {
        const errors: string[] = [];
        if (!formData.object) errors.push(`"Obyekt" tanlanishi shart.`);
        if (!formData.supplier) errors.push(`"Yetkazib beruvchi" tanlanishi shart.`);
        if (!formData.expense_type) errors.push(`"Xarajat turi" tanlanishi shart.`);
        if (!formData.date) errors.push(`"Sana" kiritilishi shart.`);
        if (!formData.comment.trim()) errors.push(`"Izoh" kiritilishi shart.`);
        if (!formData.status) errors.push(`"To'lov turi" tanlanishi shart.`);
        const amountNum = Number(formData.amount);
        if (formData.amount === "" || isNaN(amountNum) || amountNum <= 0) errors.push(`"Summa" musbat raqam bo'lishi kerak.`);
        if (errors.length > 0) { toast.error(errors.join("\n")); return false; }
        return true;
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault(); if (!validateFormData()) return;
        const expensePayload = {
            object: Number(formData.object), supplier: Number(formData.supplier), amount: formData.amount,
            expense_type: Number(formData.expense_type), date: formData.date, comment: formData.comment.trim(),
        };
        createExpense(expensePayload);
    };
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); if (!currentExpense || !validateFormData()) return;
        const expensePayload = {
            object: Number(formData.object), supplier: Number(formData.supplier), amount: formData.amount,
            expense_type: Number(formData.expense_type), date: formData.date, comment: formData.comment.trim(),
        };
        updateExpense(currentExpense.id, expensePayload);
    };

    const getExpenseTypeStyle = (typeName: string | undefined): string => {
        if (!typeName) return "bg-gray-100 text-gray-800";
        const lower = typeName.toLowerCase();
        if (lower.includes("qurilish") || lower.includes("material")) return "bg-blue-100 text-blue-800";
        if (lower.includes("ishchi") || lower.includes("usta")) return "bg-green-100 text-green-800";
        if (lower.includes("kommunal") || lower.includes("gaz") || lower.includes("svet")) return "bg-yellow-100 text-yellow-800";
        return "bg-secondary text-secondary-foreground";
    };
    const formatCurrency = useCallback((amount: number | string | undefined | null) => {
        const numericAmount = Number(amount || 0);
        if (!isClient) return `${numericAmount.toFixed(2)} USD`;
        try { return numericAmount.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
        catch (e) { return `${numericAmount.toFixed(2)} USD`; }
    }, [isClient]);
    const formatDate = useCallback((dateString: string | undefined | null) => {
        if (!dateString) return "-";
        if (!isClient) return dateString;
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return format(date, "dd/MM/yyyy");
        } catch (e) {
            return dateString;
        }
    }, [isClient]);
    const getObjectName = useCallback((objectId: number | undefined) => {
        if (objectId === null || objectId === undefined) return "-";
        return properties.find((p) => p.id === objectId)?.name || `Obyekt ID: ${objectId}`;
    }, [properties]);

    const canPerformSensitiveActions = useCallback((user: CurrentUser | null): boolean => {
        if (!user) return false;
        const isRestrictedRole = user.user_type === 'sotuvchi' || user.user_type === 'buxgalter';
        const hasSardorInFio = user.fio.toLowerCase().includes('sardor');
        if (isRestrictedRole || hasSardorInFio) {
            return false;
        }
        return true;
    }, []);

    function renderExpensesTable(expensesToRender: Expense[]) {
        const isLoadingCondition = loading && !isRefreshing;
        if (isLoadingCondition && !isClient) {
             return (<div className="flex items-center justify-center h-[200px] border rounded-md"><p className="ml-2 text-muted-foreground">Jadval yuklanmoqda...</p></div>);
        }
        if (isLoadingCondition && !expensesToRender.length) {
            return (<div className="flex items-center justify-center h-[200px] border rounded-md"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><p className="ml-2 text-muted-foreground">Jadval yuklanmoqda...</p></div>);
        }
        if (expensesToRender.length === 0 && !isLoadingCondition) {
            return (<div className="flex items-center justify-center h-[200px] border rounded-md"><p className="text-muted-foreground text-center">{searchTerm || filters.object || filters.expense_type || filters.dateRange !== "all" ? "Filtr yoki qidiruvga mos xarajatlar topilmadi." : "Hozircha xarajatlar mavjud emas."}</p></div>);
        }

        const showSensitiveActionButtons = canPerformSensitiveActions(currentUser);

        return (
            <div className="rounded-md border overflow-x-auto relative">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px]"><Button variant="ghost" onClick={handleSortToggle} className="flex items-center space-x-1 p-0 hover:bg-transparent"><span>#</span><ArrowUpDown className="h-4 w-4" /></Button></TableHead>
                            <TableHead className="w-[120px]">Sana</TableHead><TableHead>Obyekt</TableHead>
                            <TableHead>Yetkazib beruvchi</TableHead><TableHead>Tavsif</TableHead>
                            <TableHead>Turi</TableHead><TableHead>Status</TableHead>
                            <TableHead className="text-right w-[150px]">Summa</TableHead>
                            {showSensitiveActionButtons && <TableHead className="text-right w-[100px]">Amallar</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expensesToRender.map((expense, index) => {
                            const rowNumber = sortOrder === "desc" ? (totalExpenses - (currentPage - 1) * itemsPerPage - index) : ((currentPage - 1) * itemsPerPage + index + 1);
                            const virtualPaidForThis = isClient && expense.status === "Kutilmoqda" ? getVirtualPaymentForExpense(expense.id) : 0;
                            const expenseAmountNumber = Number(expense.amount);
                            const remainingVirtualDebt = expenseAmountNumber - virtualPaidForThis;
                            let displayAmountText = formatCurrency(expense.amount);
                            let titleText = "";
                            if (isClient && expense.status === "Kutilmoqda" && virtualPaidForThis > 0 && remainingVirtualDebt > 0.009) {
                                displayAmountText = `${formatCurrency(expense.amount)} (Qarz: ${formatCurrency(remainingVirtualDebt)})`;
                                titleText = `Jami: ${formatCurrency(expense.amount)}, To'langan (virtual): ${formatCurrency(virtualPaidForThis)}`;
                            }
                            return (
                                <TableRow key={expense.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">{rowNumber}</TableCell>
                                    <TableCell>{formatDate(expense.date)}</TableCell>
                                    <TableCell>{getObjectName(expense.object)}</TableCell>
                                    <TableCell>{expense.supplier_name || `Yetk. ID: ${expense.supplier}`}</TableCell>
                                    <TableCell className="max-w-[250px] truncate" title={expense.comment}>{expense.comment || "-"}</TableCell>
                                    <TableCell><Badge variant="outline" className={`whitespace-nowrap ${getExpenseTypeStyle(expense.expense_type_name)}`}>{expense.expense_type_name || `ID: ${expense.expense_type}`}</Badge></TableCell>
                                    <TableCell><Badge variant={expense.status === "To‘langan" ? "default" : "secondary"} className={`whitespace-nowrap ${expense.status === "To‘langan" ? "bg-green-100 text-green-800" : expense.status === "Kutilmoqda" ? (virtualPaidForThis > 0 && remainingVirtualDebt > 0.009 ? "bg-orange-100 text-orange-800" : "bg-yellow-100 text-yellow-800") : "bg-gray-100 text-gray-800"}`}>{expense.status === "Kutilmoqda" && virtualPaidForThis > 0 && remainingVirtualDebt > 0.009 ? "Qisman To'langan" : expense.status}</Badge></TableCell>
                                    <TableCell className="text-right font-semibold" title={titleText}>
                                        {displayAmountText}
                                    </TableCell>
                                    {showSensitiveActionButtons && (
                                        <TableCell className="text-right">
                                            <div className="flex justify-end space-x-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(expense.id)} title="Tahrirlash"><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => deleteExpense(expense.id)} title="O'chirish"><Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" /></Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            )
                        })}
                        <TableRow className="bg-muted hover:bg-muted font-bold sticky bottom-0">
                            <TableCell colSpan={showSensitiveActionButtons ? 7 : 7} className="text-right">Jami (Sahifada):</TableCell>
                            <TableCell className="text-right">{formatCurrency(expensesToRender.reduce((sum, exp) => sum + Number(exp.amount || 0), 0))}</TableCell>
                            {showSensitiveActionButtons && <TableCell></TableCell>}
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        );
    }

    if (!isClient) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                 <header className="border-b sticky top-0 bg-background z-10">
                    <div className="flex h-16 items-center px-4 container mx-auto">
                        <div className="mx-6 w-full"></div>
                        <div className="ml-auto flex items-center space-x-4"></div>
                    </div>
                </header>
                 <main className="flex-1 space-y-4 p-4 md:p-8 pt-6 container mx-auto">
                    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                </main>
            </div>
        )
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
                    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (isOpen) { setFormData(initialFormData); setCurrentExpense(null); } }}>
                        <DialogTrigger asChild><Button size="sm" disabled={!accessToken || loading}><Plus className="mr-2 h-4 w-4" /> Yangi xarajat</Button></DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                            <DialogHeader><DialogTitle>Yangi xarajat qo'shish</DialogTitle><DialogDescription>Xarajat ma'lumotlarini kiriting. "Naqd pul" tanlansa, xarajat "To‘langan" bo'ladi.</DialogDescription></DialogHeader>
                            <form id="add-expense-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-4 pl-1 -mr-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 py-4">
                                    <div className="space-y-1"><Label htmlFor="amount">Summa (USD) *</Label><Input required id="amount" name="amount" type="number" step="0.01" min="0.01" value={formData.amount} onChange={handleChange} placeholder="1500.50" /></div>
                                    <div className="space-y-1"><Label htmlFor="date">Xarajat sanasi *</Label><Input required id="date" name="date" type="date" value={formData.date} onChange={handleChange} max={new Date().toISOString().split("T")[0]} /></div>
                                    <div className="space-y-1"><Label htmlFor="supplier">Yetkazib beruvchi *</Label><div className="flex items-center space-x-2">
                                        <Select required value={formData.supplier} onValueChange={(v) => handleSelectChange("supplier", v)} name="supplier"><SelectTrigger id="supplier" className="flex-1"><SelectValue placeholder="Tanlang..." /></SelectTrigger><SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.company_name}</SelectItem>)}</SelectContent></Select>
                                        <Dialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen}><DialogTrigger asChild><Button type="button" variant="outline" size="icon" title="Yangi yetkazib beruvchi"><Plus className="h-4 w-4" /></Button></DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Yangi yetkazib beruvchi</DialogTitle></DialogHeader><div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto pr-2">
                                                <Label htmlFor="new_company_name">Kompaniya nomi *</Label><Input id="new_company_name" name="company_name" value={newSupplierData.company_name} onChange={handleSupplierChange} required />
                                                <Label htmlFor="new_contact_person_name">Kontakt</Label><Input id="new_contact_person_name" name="contact_person_name" value={newSupplierData.contact_person_name} onChange={handleSupplierChange} />
                                                <Label htmlFor="new_phone_number">Telefon</Label><Input id="new_phone_number" name="phone_number" value={newSupplierData.phone_number} onChange={handleSupplierChange} />
                                                <Label htmlFor="new_address">Manzil</Label><Textarea id="new_address" name="address" value={newSupplierData.address} onChange={handleSupplierChange} rows={2} />
                                                <Label htmlFor="new_description">Tavsif</Label><Textarea id="new_description" name="description" value={newSupplierData.description} onChange={handleSupplierChange} rows={2} />
                                            </div><DialogFooter><Button type="button" onClick={createSupplier} disabled={!newSupplierData.company_name.trim() || isSupplierSubmitting}>{isSupplierSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Qo'shish</Button><Button type="button" variant="outline" onClick={() => { setAddSupplierOpen(false); setNewSupplierData(initialNewSupplierData); }} disabled={isSupplierSubmitting}>Bekor qilish</Button></DialogFooter></DialogContent></Dialog>
                                    </div></div>
                                    <div className="space-y-1"><Label htmlFor="expense_type">Xarajat turi *</Label><div className="flex items-center space-x-2">
                                        <Select required value={formData.expense_type} onValueChange={(v) => handleSelectChange("expense_type", v)} name="expense_type"><SelectTrigger id="expense_type" className="flex-1"><SelectValue placeholder="Tanlang..." /></SelectTrigger><SelectContent>{expenseTypes.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}</SelectContent></Select>
                                        <Dialog open={addExpenseTypeOpen} onOpenChange={setAddExpenseTypeOpen}><DialogTrigger asChild><Button type="button" variant="outline" size="icon" title="Yangi xarajat turi"><Plus className="h-4 w-4" /></Button></DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Yangi xarajat turi</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><Label htmlFor="new_expense_type_name">Nomi *</Label><Input id="new_expense_type_name" value={newExpenseTypeName} onChange={(e) => setNewExpenseTypeName(e.target.value)} required /></div><DialogFooter><Button type="button" onClick={createExpenseType} disabled={!newExpenseTypeName.trim() || isExpenseTypeSubmitting}>{isExpenseTypeSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Qo'shish</Button><Button type="button" variant="outline" onClick={() => { setAddExpenseTypeOpen(false); setNewExpenseTypeName(""); }} disabled={isExpenseTypeSubmitting}>Bekor qilish</Button></DialogFooter></DialogContent></Dialog>
                                    </div></div>
                                    <div className="space-y-1"><Label htmlFor="object">Obyekt *</Label><Select required value={formData.object} onValueChange={(v) => handleSelectChange("object", v)} name="object"><SelectTrigger id="object"><SelectValue placeholder="Tanlang..." /></SelectTrigger><SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                                    <div className="space-y-1"><Label htmlFor="status">To'lov turi *</Label><Select required value={formData.status} onValueChange={(v) => handleSelectChange("status", v)} name="status"><SelectTrigger id="status"><SelectValue placeholder="Tanlang..." /></SelectTrigger><SelectContent><SelectItem value="Naqd pul">Naqd pul</SelectItem><SelectItem value="Nasiya">Nasiya</SelectItem></SelectContent></Select></div>
                                    <div className="space-y-1 sm:col-span-2"><Label htmlFor="comment">Tavsif / Izoh *</Label><Textarea required id="comment" name="comment" value={formData.comment} onChange={handleChange} rows={3} placeholder="Xarajat haqida batafsil..." /></div>
                                </div>
                            </form>
                            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 space-y-2 sm:space-y-0 pt-4 border-t">
                                <Button type="submit" form="add-expense-form" className="bg-green-600 hover:bg-green-700 w-full sm:w-auto" disabled={isSubmitting || !formData.object || !formData.supplier || !formData.expense_type || !formData.date || !formData.comment.trim() || !formData.amount || Number(formData.amount) <= 0 || !formData.status}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Saqlash</Button>
                                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)} disabled={isSubmitting}>Bekor qilish</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <Dialog open={editOpen} onOpenChange={(isOpen) => { if (!isOpen) { setCurrentExpense(null); setFormData(initialFormData); } setEditOpen(isOpen); }}>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                        <DialogHeader><DialogTitle>Xarajatni tahrirlash (ID: {currentExpense?.id || "Yuklanmoqda..."})</DialogTitle><DialogDescription>Xarajat ma'lumotlarini yangilang.</DialogDescription></DialogHeader>
                        <form id="edit-expense-form" onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto pr-4 pl-1 -mr-2">
                            {!currentExpense && editOpen ? <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /><span className="ml-2 text-muted-foreground">Yuklanmoqda...</span></div> : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 py-4">
                                    <div className="space-y-1"><Label htmlFor="edit-amount">Summa (USD) *</Label><Input required id="edit-amount" name="amount" type="number" step="0.01" min="0.01" value={formData.amount} onChange={handleChange} /></div>
                                    <div className="space-y-1"><Label htmlFor="edit-date">Xarajat sanasi *</Label><Input required id="edit-date" name="date" type="date" value={formData.date} onChange={handleChange} max={new Date().toISOString().split("T")[0]} /></div>
                                    <div className="space-y-1"><Label htmlFor="edit-supplier">Yetkazib beruvchi *</Label><div className="flex items-center space-x-2">
                                        <Select required value={formData.supplier} onValueChange={(v) => handleSelectChange("supplier", v)} name="supplier"><SelectTrigger id="edit-supplier" className="flex-1"><SelectValue /></SelectTrigger><SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.company_name}</SelectItem>)}</SelectContent></Select>
                                    </div></div>
                                    <div className="space-y-1"><Label htmlFor="edit-expense_type">Xarajat turi *</Label><div className="flex items-center space-x-2">
                                        <Select required value={formData.expense_type} onValueChange={(v) => handleSelectChange("expense_type", v)} name="expense_type"><SelectTrigger id="edit-expense_type" className="flex-1"><SelectValue /></SelectTrigger><SelectContent>{expenseTypes.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}</SelectContent></Select>
                                    </div></div>
                                    <div className="space-y-1"><Label htmlFor="edit-object">Obyekt *</Label><Select required value={formData.object} onValueChange={(v) => handleSelectChange("object", v)} name="object"><SelectTrigger id="edit-object"><SelectValue /></SelectTrigger><SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                                    <div className="space-y-1"><Label htmlFor="edit-status">To'lov turi *</Label><Select required value={formData.status} onValueChange={(v) => handleSelectChange("status", v)} name="status"><SelectTrigger id="edit-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Naqd pul">Naqd pul</SelectItem><SelectItem value="Nasiya">Nasiya</SelectItem></SelectContent></Select></div>
                                    <div className="space-y-1 sm:col-span-2"><Label htmlFor="edit-comment">Tavsif / Izoh *</Label><Textarea required id="edit-comment" name="comment" value={formData.comment} onChange={handleChange} rows={3} /></div>
                                </div>
                            )}
                        </form>
                        <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 space-y-2 sm:space-y-0 pt-4 border-t">
                            <Button type="submit" form="edit-expense-form" className="bg-green-600 hover:bg-green-700 w-full sm:w-auto" disabled={isSubmitting || !currentExpense || !formData.object || !formData.supplier || !formData.expense_type || !formData.date || !formData.comment.trim() || !formData.amount || Number(formData.amount) <= 0 || !formData.status}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Saqlash</Button>
                            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => { setEditOpen(false); setCurrentExpense(null); setFormData(initialFormData); }} disabled={isSubmitting}>Bekor qilish</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="space-y-1"><Label htmlFor="filter-object">Obyekt bo'yicha filtr</Label><Select value={filters.object || "all"} onValueChange={(v) => handleFilterChange("object", v)}><SelectTrigger id="filter-object"><SelectValue placeholder="Barcha obyektlar" /></SelectTrigger><SelectContent><SelectItem value="all">Barcha obyektlar</SelectItem>{properties.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1"><Label htmlFor="filter-expense_type">Xarajat turi bo'yicha filtr</Label><Select value={filters.expense_type || "all"} onValueChange={(v) => handleFilterChange("expense_type", v)}><SelectTrigger id="filter-expense_type"><SelectValue placeholder="Barcha turlar" /></SelectTrigger><SelectContent><SelectItem value="all">Barcha turlar</SelectItem>{expenseTypes.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1"><Label htmlFor="filter-dateRange">Sana bo'yicha filtr</Label><Select value={filters.dateRange} onValueChange={(v) => handleFilterChange("dateRange", v)}><SelectTrigger id="filter-dateRange"><SelectValue placeholder="Barcha sanalar" /></SelectTrigger><SelectContent><SelectItem value="all">Barcha sanalar</SelectItem><SelectItem value="today">Bugun</SelectItem><SelectItem value="week">Oxirgi hafta</SelectItem><SelectItem value="month">Oxirgi oy</SelectItem><SelectItem value="quarter">Oxirgi chorak</SelectItem><SelectItem value="year">Oxirgi yil</SelectItem></SelectContent></Select></div>
                    <div className="space-y-1"><Label htmlFor="search">Qidiruv</Label><Input id="search" placeholder="Yetkazib beruvchi, izoh..." value={searchTerm} onChange={handleSearchChange} /></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Umumiy xarajatlar</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent>{loadingTotals ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" /> : <div className="text-2xl font-bold">{formatCurrency(filteredTotalAmount)}</div>}</CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">To'langan xarajatlar</CardTitle><HandCoins className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent>{loadingTotals ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" /> : <div className="text-2xl font-bold"><Button variant="link" className="p-0 text-2xl font-bold text-foreground h-auto hover:underline" onClick={handleOpenPaidModal}>{formatCurrency(filteredPaidExpensesAmount)}</Button></div>}</CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Kutilmoqda (Jami Nasiya)</CardTitle><HandCoins className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent>{loadingTotals ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" /> : <div className="text-2xl font-bold"><Button variant="link" className="p-0 text-2xl font-bold text-foreground h-auto hover:underline" onClick={handleOpenPendingModal}>{formatCurrency(filteredPendingAmount)}</Button><div className="text-sm text-muted-foreground mt-1">{filters.object && filters.object !== "all" ? "Tanlangan obyektning" : "Barcha"} kutilayotgan to'lovlar</div></div>}</CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{filters.object && filters.object !== "all" && properties.find(p => p.id === Number(filters.object)) ? properties.find(p => p.id === Number(filters.object))?.name : "Tanlangan obyekt"}</CardTitle><Building className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent>{loadingTotals ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" /> : selectedObjectTotal !== null ? <div className="text-2xl font-bold">{formatCurrency(selectedObjectTotal)}</div> : <div className="text-sm text-muted-foreground">Obyekt tanlanmagan</div>}</CardContent></Card>
                </div>

                {renderExpensesTable(expenses)}

                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">Sahifa {currentPage} / {totalPages} ({totalExpenses > 0 ? `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalExpenses)}` : 0} / {totalExpenses} yozuv)</div>
                        <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || isRefreshing}><ChevronLeft className="h-4 w-4" />Oldingi</Button>
                            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || isRefreshing}>Keyingi<ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                )}

                <Dialog open={paidModalOpen} onOpenChange={setPaidModalOpen}>
                    <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
                        <DialogHeader><DialogTitle>To'langan xarajatlar</DialogTitle><DialogDescription>Tanlangan filtrlar bo'yicha to'langan xarajatlar ro'yxati.</DialogDescription></DialogHeader>
                        <div className="flex-1 overflow-y-auto">
                            {modalLoading ? <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin" /><span className="ml-2">Yuklanmoqda...</span></div>
                                : modalPaidExpenses.length === 0 ? <div className="flex items-center justify-center h-40"><p>To'langan xarajatlar topilmadi.</p></div>
                                    : (<Table>
                                        <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Sana</TableHead><TableHead>Yetkazib beruvchi</TableHead><TableHead>Obyekt</TableHead><TableHead>Tavsif</TableHead><TableHead className="text-right">Summa</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {modalPaidExpenses.map((expense, index) => (
                                                <TableRow key={expense.id}>
                                                    <TableCell>{index + 1}</TableCell><TableCell>{formatDate(expense.date)}</TableCell>
                                                    <TableCell>{expense.supplier_name}</TableCell><TableCell>{getObjectName(expense.object)}</TableCell>
                                                    <TableCell className="max-w-[200px] truncate" title={expense.comment}>{expense.comment}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                                                </TableRow>))}
                                            <TableRow className="bg-muted font-bold"><TableCell colSpan={5} className="text-right">Jami:</TableCell><TableCell className="text-right">{formatCurrency(modalPaidExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0))}</TableCell></TableRow>
                                        </TableBody>
                                    </Table>)}
                        </div>
                        <DialogFooter><Button variant="outline" onClick={() => setPaidModalOpen(false)}>Yopish</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={pendingModalOpen} onOpenChange={setPendingModalOpen}>
                    <DialogContent className="sm:max-w-[1000px] max-h-[85vh] flex flex-col">
                        <DialogHeader><DialogTitle>Nasiya (Kutilmoqda) xarajatlar</DialogTitle><DialogDescription>Yetkazib beruvchilar bo'yicha jami nasiya qarzlar va ularga to'lov qilish.</DialogDescription></DialogHeader>
                        <div className="flex-1 overflow-y-auto pr-2">
                            {modalLoading ? (<div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /><span className="ml-2 text-muted-foreground">Yuklanmoqda...</span></div>)
                                : supplierDebtGroups.length === 0 ? (<div className="flex items-center justify-center h-40"><p className="text-muted-foreground">Nasiya qarzlar topilmadi.</p></div>)
                                    : (<Accordion type="single" collapsible className="w-full" value={activeAccordionItem} onValueChange={setActiveAccordionItem}>
                                        {supplierDebtGroups.map((group) => (
                                            <AccordionItem value={`supplier-${group.supplier_id}`} key={group.supplier_id} className="border-b">
                                                <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 py-3">
                                                    <div className="flex justify-between items-center w-full pr-4">
                                                        <span className="font-semibold text-base">{group.supplier_name}</span>
                                                        <div className="flex items-center space-x-4">
                                                            <Badge variant="outline" className="text-sm px-3 py-1"> Qarz: {formatCurrency(group.total_remaining_debt_for_supplier)} </Badge>
                                                            {canPerformSensitiveActions(currentUser) && (
                                                                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleOpenSupplierPaymentDialog(group); }} disabled={group.total_remaining_debt_for_supplier <= 0.009}> To'lov qilish </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="pt-2 pb-4">
                                                    <p className="text-sm text-muted-foreground mb-2 ml-1">Shu yetkazib beruvchining nasiya xarajatlari:</p>
                                                    {group.expenses.length > 0 ? (
                                                        <Table size="sm">
                                                            <TableHeader><TableRow>
                                                                <TableHead className="w-[50px]">#</TableHead><TableHead className="w-[100px]">Sana</TableHead>
                                                                <TableHead>Tavsif (Xarajat)</TableHead><TableHead className="text-right w-[120px]">Xarajat sum.</TableHead>
                                                                <TableHead className="text-right w-[120px]">To'langan (virtual)</TableHead><TableHead className="text-right w-[120px]">Qolgan qarz</TableHead>
                                                            </TableRow></TableHeader>
                                                            <TableBody>
                                                                {group.expenses.map((item, index) => (
                                                                    <TableRow key={item.id}>
                                                                        <TableCell>{index + 1}</TableCell><TableCell>{formatDate(item.date)}</TableCell>
                                                                        <TableCell className="max-w-[250px] truncate" title={item.comment}>{item.comment}</TableCell>
                                                                        <TableCell className="text-right">{formatCurrency(item.total_expense_amount)}</TableCell>
                                                                        <TableCell className="text-right">{formatCurrency(item.virtual_paid_amount)}</TableCell>
                                                                        <TableCell className="text-right font-semibold">{formatCurrency(item.calculated_remaining_debt)}</TableCell>
                                                                    </TableRow>))}
                                                            </TableBody>
                                                        </Table>
                                                    ) : (<p className="text-sm text-muted-foreground text-center py-4">Bu yetkazib beruvchi uchun qoldiq nasiya xarajatlar yo'q.</p>)}
                                                </AccordionContent>
                                            </AccordionItem>))}
                                    </Accordion>)}
                            {supplierDebtGroups.length > 0 && !modalLoading && (<div className="mt-4 pt-3 border-t text-right font-bold"> Jami Nasiya Qarz (Filtrlangan): {formatCurrency(filteredPendingAmount)} </div>)}
                        </div>
                        <DialogFooter className="mt-auto pt-4"><Button variant="outline" onClick={() => { setPendingModalOpen(false); setActiveAccordionItem(undefined); }}>Yopish</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader><DialogTitle>To'lov: {currentPaymentSupplier?.company_name}</DialogTitle>
                            <DialogDescription>Yetkazib beruvchining umumiy qarziga to'lov qilish.
                                {currentPaymentSupplier && paymentAmount && <div className="text-sm mt-1">Hozirgi qarz: {formatCurrency(paymentAmount)}</div>}
                            </DialogDescription></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-1"><Label htmlFor="payment-amount">To'lov summasi (USD) *</Label><Input id="payment-amount" type="number" step="0.01" min="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Masalan: 500.00" required /></div>
                            <div className="space-y-1"><Label htmlFor="payment-description">Tavsif *</Label><Textarea id="payment-description" value={paymentDescription} onChange={(e) => setPaymentDescription(e.target.value)} rows={3} placeholder="To'lov haqida qisqacha..." required /></div>
                        </div>
                        <DialogFooter>
                            <Button type="button" onClick={handleAddPayment} disabled={isSubmittingPayment || !paymentAmount || Number(paymentAmount) <= 0 || !paymentDescription.trim()}>{isSubmittingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Saqlash</Button>
                            <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={isSubmittingPayment}>Bekor qilish</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent><DialogHeader><DialogTitle>Xarajatni o'chirish</DialogTitle><DialogDescription>O'chirish uchun kodni kiriting. {expenseToDelete && <span className="block mt-1">ID: {expenseToDelete}</span>}</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><div className="grid gap-2"><Label htmlFor="deleteCode">Kod</Label><Input id="deleteCode" type="password" placeholder="Kodni kiriting" value={deleteCode} onChange={(e) => setDeleteCode(e.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteCode(""); setExpenseToDelete(null); }}>Bekor qilish</Button><Button variant="destructive" onClick={handleConfirmDelete} disabled={!deleteCode || deleteCode !== "7777"}>O'chirish</Button></DialogFooter></DialogContent>
                </Dialog>
            </main>
        </div>
    );
}