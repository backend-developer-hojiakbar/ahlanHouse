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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import toast, { Toaster } from "react-hot-toast";

// --- Debounce Hook ---
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

// --- Interfaces ---
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
    amount: string;
    date: string;
    supplier: number;
    supplier_name: string;
    comment: string;
    expense_type_name: string;
    object: number;
    object_name?: string;
    supplier_balance?: number;
    expense_amount?: string;
    paid_amount?: number;
    remaining_amount?: number;
}

interface Property {
    id: number;
    name: string;
}

interface Supplier {
    id: number;
    company_name: string;
    balance?: string;
    contact_person_name?: string;
    phone_number?: string;
    address?: string;
    description?: string;
}

interface ExpenseType {
    id: number;
    name: string;
}

// --- Constants ---
const API_BASE_URL = "http://api.ahlan.uz";
const initialFormData = {
    object: "",
    supplier: "",
    amount: "",
    expense_type: "",
    date: new Date().toISOString().split("T")[0],
    comment: "",
    status: "Nasiya", // Default to Nasiya (Kutilmoqda)
};
const initialNewSupplierData = {
    company_name: "",
    contact_person_name: "",
    phone_number: "",
    address: "",
    description: "",
};
const itemsPerPage = 25;

// --- Component ---
export default function ExpensesPage() {
    const router = useRouter();

    // --- State Variables ---
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    // Loading states
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadingTotals, setLoadingTotals] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSupplierSubmitting, setIsSupplierSubmitting] = useState(false);
    const [isExpenseTypeSubmitting, setIsExpenseTypeSubmitting] = useState(false);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

    // Totals & Filters
    const [filteredTotalAmount, setFilteredTotalAmount] = useState<number>(0);
const [filteredPaidAmount, setFilteredPaidAmount] = useState<number>(0);
const [filteredPaidExpensesAmount, setFilteredPaidExpensesAmount] = useState<number>(0);
    const [filteredPendingAmount, setFilteredPendingAmount] = useState<number>(0);
    const [selectedObjectTotal, setSelectedObjectTotal] = useState<number | null>(null);
    const [filters, setFilters] = useState({
        object: "",
        expense_type: "",
        dateRange: "all",
    });
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Pagination
    const searchParams = useSearchParams();

    const initialPage = Number(searchParams.get("page")) || 1;
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [totalPages, setTotalPages] = useState(1);

    // Sorting
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc"); // Default to descending (newest first)

    // Dialog states
    const [open, setOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [addExpenseTypeOpen, setAddExpenseTypeOpen] = useState(false);
    const [addSupplierOpen, setAddSupplierOpen] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteCode, setDeleteCode] = useState("");
    const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);

    // Modal states
    const [paidModalOpen, setPaidModalOpen] = useState(false);
    const [pendingModalOpen, setPendingModalOpen] = useState(false);
    const [modalExpenses, setModalExpenses] = useState<ModalExpense[]>([]);
    const [modalLoading, setModalLoading] = useState(false);

    // Form states
    const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
    const [formData, setFormData] = useState(initialFormData);
    const [newExpenseTypeName, setNewExpenseTypeName] = useState("");
    const [newSupplierData, setNewSupplierData] = useState(initialNewSupplierData);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentDescription, setPaymentDescription] = useState("");
    const [currentPaymentSupplier, setCurrentPaymentSupplier] = useState<Supplier | null>(null);

    // Hydration fix
    const [isClient, setIsClient] = useState(false);

    // --- Effects ---
    useEffect(() => {
        setIsClient(true);
        const token = localStorage.getItem("access_token");
        if (token) {
            setAccessToken(token);
        } else {
            toast.error("Iltimos tizimga kiring");
            router.push("/login");
        }
    }, [router]);

    // --- API Calls ---
    const getAuthHeaders = useCallback((): HeadersInit => {
        if (!accessToken) return {
            Accept: "application/json",
            "Content-Type": "application/json",
        };
        return {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        };
    }, [accessToken]);

    const fetchApiData = useCallback(
        async (endpoint: string, setter: Function, errorMsg: string) => {
            if (!accessToken) return;
            try {
                const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                    method: "GET",
                    headers: getAuthHeaders(),
                });
                if (!response.ok) {
                    const errorData = await response
                        .json()
                        .catch(() => ({
                            detail: `Serverdan javob o'qilmadi (Status: ${response.status})`,
                        }));
                    throw new Error(
                        `${errorMsg} (Status: ${response.status}): ${errorData.detail || JSON.stringify(errorData)}`
                    );
                }
                const data = await response.json();
                setter(data.results || data);
            } catch (error: any) {
                console.error(`Error fetching ${endpoint}:`, error);
                toast.error(error.message || errorMsg);
                setter([]);
            }
        },
        [accessToken, getAuthHeaders]
    );

    const fetchInitialData = useCallback(async () => {
        if (!accessToken) return;
        await Promise.all([
            fetchApiData(
                "/objects/?page_size=1000",
                setProperties,
                "Obyektlarni yuklashda xatolik"
            ),
            fetchApiData(
                "/suppliers/?page_size=1000",
                setSuppliers,
                "Yetkazib beruvchilarni yuklashda xatolik"
            ),
            fetchApiData(
                "/expense-types/?page_size=1000",
                setExpenseTypes,
                "Xarajat turlarini yuklashda xatolik"
            ),
        ]);
    }, [accessToken, fetchApiData]);

    const fetchExpensesAndFilteredTotals = useCallback(async () => {
        if (!accessToken) return;
        setIsRefreshing(true);
        setLoadingTotals(true);

        const queryParams = new URLSearchParams();
        if (filters.object && filters.object !== "all")
            queryParams.append("object", filters.object);
        if (filters.expense_type && filters.expense_type !== "all")
            queryParams.append("expense_type", filters.expense_type);
        if (filters.dateRange && filters.dateRange !== "all") {
            const today = new Date();
            let startDate = new Date(today);
            switch (filters.dateRange) {
                case "today":
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case "week":
                    startDate.setDate(today.getDate() - 7);
                    break;
                case "month":
                    startDate.setMonth(today.getMonth() - 1);
                    break;
                case "quarter":
                    startDate.setMonth(today.getMonth() - 3);
                    break;
                case "year":
                    startDate.setFullYear(today.getFullYear() - 1);
                    break;
            }
            if (startDate <= today) {
                queryParams.append("date__gte", startDate.toISOString().split("T")[0]);
                if (filters.dateRange === "today") {
                    queryParams.append("date__lte", today.toISOString().split("T")[0]);
                }
            }
        }
        if (debouncedSearchTerm) queryParams.append("search", debouncedSearchTerm);
        // Add sorting parameter based on sortOrder
        queryParams.append("ordering", sortOrder === "desc" ? "-id" : "id");

        let calculatedFilteredTotal = 0;
        let calculatedSelectedObjectTotal: number | null = null;
        const expenseTotalsQueryParams = new URLSearchParams(queryParams);
        expenseTotalsQueryParams.append("page_size", "10000");

        const fetchTotalExpensesPromise = fetch(
            `${API_BASE_URL}/expenses/?${expenseTotalsQueryParams.toString()}`,
            { method: "GET", headers: getAuthHeaders() }
        )
            .then(async (response) => {
                if (!response.ok) {
                    console.error(`Umumiy xarajatlar yuklanmadi (Status: ${response.status})`);
                    return { total: 0, objectTotal: null };
                }
                const data = await response.json();
                const allFilteredExpenses = data.results || [];
                let total = 0;
                let objectTotal: number | null = null;
                allFilteredExpenses.forEach((expense: Expense) => {
                    const amount = Number(expense.amount || 0);
                    total += amount;
                    if (
                        filters.object &&
                        filters.object !== "all" &&
                        expense.object?.toString() === filters.object
                    ) {
                        objectTotal = (objectTotal ?? 0) + amount;
                    }
                });
                return { total, objectTotal };
            })
            .catch((error) => {
                console.error("Umumiy xarajatlarni yuklashda xatolik:", error);
                toast.error("Umumiy xarajatlarni yuklashda xatolik yuz berdi.");
                return { total: 0, objectTotal: null };
            });

        let calculatedFilteredPaid = 0;
        const paymentTotalsQueryParams = new URLSearchParams(queryParams);
        if (queryParams.has("date__gte"))
            paymentTotalsQueryParams.set("date__gte", queryParams.get("date__gte")!);
        if (queryParams.has("date__lte"))
            paymentTotalsQueryParams.set("date__lte", queryParams.get("date__lte")!);
        paymentTotalsQueryParams.append("page_size", "10000");

        const fetchTotalPaymentsPromise = fetch(
            `${API_BASE_URL}/supplier-payments/?${paymentTotalsQueryParams.toString()}`,
            { method: "GET", headers: getAuthHeaders() }
        )
            .then(async (response) => {
                if (!response.ok) {
                    const errorText = await response.text();
                    console.warn(
                        `To'langan summa yuklanmadi (Status: ${response.status}). API /supplier-payments/ uchun barcha filtrlarni qo'llab-quvvatlamasligi mumkin. Xato: ${errorText}`
                    );
                    return 0;
                }
                const data = await response.json();
                const allFilteredPayments = data.results || [];
                return allFilteredPayments.reduce(
                    (sum: number, payment: { amount?: string | number }) =>
                        sum + Number(payment.amount || 0),
                    0
                );
            })
            .catch((error) => {
                console.error("To'lovlarni yuklashda xatolik:", error);
                toast.error("To'langan summani yuklashda xatolik yuz berdi.");
                return 0;
            });

        const tableQueryParams = new URLSearchParams(queryParams);
        tableQueryParams.set("page", currentPage.toString());
        tableQueryParams.set("page_size", itemsPerPage.toString());

        const fetchTableExpensesPromise = fetch(
            `${API_BASE_URL}/expenses/?${tableQueryParams.toString()}`,
            { method: "GET", headers: getAuthHeaders() }
        )
            .then(async (response) => {
                if (!response.ok) {
                    const errorData = await response
                        .json()
                        .catch(() => ({
                            detail: `Serverdan javob o'qilmadi (Status: ${response.status})`,
                        }));
                    throw new Error(
                        `Xarajatlar sahifasi yuklanmadi (Status: ${response.status}): ${
                            errorData.detail || JSON.stringify(errorData)
                        }`
                    );
                }
                return response.json();
            })
            .catch((error) => {
                console.error("Paginated expenses yuklashda xatolik:", error);
                toast.error(error.message || "Xarajatlar jadvalini yuklashda xatolik");
                return { results: [], count: 0 };
            });

        try {
            const [totalExpensesResult, totalPaymentsResult, tableData] = await Promise.all([
                fetchTotalExpensesPromise,
                fetchTotalPaymentsPromise,
                fetchTableExpensesPromise,
            ]);

            calculatedFilteredTotal = totalExpensesResult.total;
            calculatedSelectedObjectTotal = totalExpensesResult.objectTotal;
            calculatedFilteredPaid = totalPaymentsResult;

            // Kutilmoqda (Nasiya) summani to'g'ri hisoblash uchun API-dan to'g'ridan-to'g'ri so'rovni yuborish
            const pendingExpensesResponse = await fetch(
                `${API_BASE_URL}/expenses/?status=Kutilmoqda`,
                { method: "GET", headers: getAuthHeaders() }
            );
            
            let pendingTotal = 0;
            if (pendingExpensesResponse.ok) {
                const pendingData = await pendingExpensesResponse.json();
                const pendingExpenses = pendingData.results || [];
                pendingTotal = pendingExpenses.reduce(
                    (sum: number, expense: { amount: string | number }) => sum + Number(expense.amount || 0),
                    0
                );
            }

            setFilteredTotalAmount(calculatedFilteredTotal);
            setFilteredPendingAmount(pendingTotal); // Nasiya summani to'g'ridan-to'g'ri API-dan olish
            setFilteredPaidAmount(Math.max(0, calculatedFilteredTotal - pendingTotal)); // To'langan miqdorni yangilash
            setFilteredPaidExpensesAmount(Math.max(0, calculatedFilteredTotal - pendingTotal)); // To'langan xarajatlar summasini o'rnatish
            setSelectedObjectTotal(calculatedSelectedObjectTotal);

            setExpenses((prev) => {
                return tableData.results && tableData.results.length > 0 ? tableData.results : prev;
            });
            setTotalPages(Math.ceil((tableData.count || 0) / itemsPerPage));
        } catch (error) {
            console.error("Xarajatlar va jami summalarni yuklashda umumiy xatolik:", error);
            setFilteredTotalAmount(0);
            setFilteredPaidAmount(0);
            setFilteredPendingAmount(0);
            setSelectedObjectTotal(null);
            setTotalPages(1);
        } finally {
            setLoadingTotals(false);
            setIsRefreshing(false);
            setLoading(false);
        }
    }, [accessToken, filters, currentPage, debouncedSearchTerm, getAuthHeaders, sortOrder]);

    const fetchPaidModalExpenses = useCallback(async () => {
        if (!accessToken) return;
        setModalLoading(true);
        setModalExpenses([]);
        try {
            const queryParams = new URLSearchParams();
            queryParams.append("page_size", "1000");
            if (filters.object && filters.object !== "all") {
                console.warn("To‘langan xarajatlar modalida 'object' filtr qo'llab-quvvatlanmasligi mumkin");
            }
            if (filters.expense_type && filters.expense_type !== "all") {
                console.warn("To‘langan xarajatlar modalida 'expense_type' filtr qo'llab-quvvatlanmasligi mumkin");
            }
            if (filters.dateRange && filters.dateRange !== "all") {
                const today = new Date();
                let startDate = new Date(today);
                switch (filters.dateRange) {
                    case "today":
                        startDate.setHours(0, 0, 0, 0);
                        break;
                    case "week":
                        startDate.setDate(today.getDate() - 7);
                        break;
                    case "month":
                        startDate.setMonth(today.getMonth() - 1);
                        break;
                    case "quarter":
                        startDate.setMonth(today.getMonth() - 3);
                        break;
                    case "year":
                        startDate.setFullYear(today.getFullYear() - 1);
                        break;
                }
                if (startDate <= today) {
                    queryParams.append("date__gte", startDate.toISOString().split("T")[0]);
                    if (filters.dateRange === "today") {
                        queryParams.append("date__lte", today.toISOString().split("T")[0]);
                    }
                }
            }
            if (debouncedSearchTerm) {
                console.warn("To‘langan xarajatlar modalida 'search' filtr qo'llab-quvvatlanmasligi mumkin");
            }

            const response = await fetch(
                `${API_BASE_URL}/supplier-payments/?${queryParams.toString()}`,
                {
                    method: "GET",
                    headers: getAuthHeaders(),
                }
            );
            if (!response.ok) {
                throw new Error(`To‘langanlar ro'yxatini yuklashda xatolik (${response.status})`);
            }
            const data = await response.json();
            const adaptedPayments = (data.results || []).map((payment: any) => ({
                id: payment.id,
                amount: payment.amount,
                date: payment.date,
                supplier: payment.supplier,
                supplier_name:
                    suppliers.find((s) => s.id === payment.supplier)?.company_name ||
                    `Yetk. ID: ${payment.supplier}`,
                comment: payment.description || "-",
                expense_type_name: "To'lov",
                object: 0,
                object_name: "-",
                supplier_balance: 0,
            }));
            setModalExpenses(adaptedPayments);
        } catch (error: any) {
            toast.error(error.message);
            setModalExpenses([]);
        } finally {
            setModalLoading(false);
        }
    }, [accessToken, filters, debouncedSearchTerm, getAuthHeaders, suppliers]);

    const fetchPendingModalExpenses = useCallback(async () => {
        if (!accessToken) return;
        setModalLoading(true);
        setModalExpenses([]);
        try {
            // 1. Barcha to'lovlarni olish
            const paymentsResponse = await fetch(
                `${API_BASE_URL}/supplier-payments/?page_size=10000`,
                {
                    method: "GET",
                    headers: getAuthHeaders(),
                }
            );
            
            if (!paymentsResponse.ok) {
                throw new Error(`To'lovlar yuklanmadi (${paymentsResponse.status})`);
            }
            
            const paymentsData = await paymentsResponse.json();
            const allPayments = paymentsData.results || [];

            // 2. Barcha xarajatlarni olish (status = Kutilmoqda)
            const queryParams = new URLSearchParams();
            queryParams.append("status", "Kutilmoqda");
            queryParams.append("page_size", "10000");

            if (filters.object && filters.object !== "all")
                queryParams.append("object", filters.object);
            if (filters.expense_type && filters.expense_type !== "all")
                queryParams.append("expense_type", filters.expense_type);
            if (filters.dateRange && filters.dateRange !== "all") {
                const today = new Date();
                let startDate = new Date(today);
                switch (filters.dateRange) {
                    case "today":
                        startDate.setHours(0, 0, 0, 0);
                        break;
                    case "week":
                        startDate.setDate(today.getDate() - 7);
                        break;
                    case "month":
                        startDate.setMonth(today.getMonth() - 1);
                        break;
                    case "quarter":
                        startDate.setMonth(today.getMonth() - 3);
                        break;
                    case "year":
                        startDate.setFullYear(today.getFullYear() - 1);
                        break;
                }
                if (startDate <= today) {
                    queryParams.append("date__gte", startDate.toISOString().split("T")[0]);
                    if (filters.dateRange === "today")
                        queryParams.append("date__lte", today.toISOString().split("T")[0]);
                }
            }
            if (debouncedSearchTerm) queryParams.append("search", debouncedSearchTerm);

            const expensesResponse = await fetch(
                `${API_BASE_URL}/expenses/?${queryParams.toString()}`,
                {
                    method: "GET",
                    headers: getAuthHeaders(),
                }
            );

            if (!expensesResponse.ok) {
                throw new Error(`Xarajatlar yuklanmadi (${expensesResponse.status})`);
            }

            const expensesData = await expensesResponse.json();
            const expenses = expensesData.results || [];

            // 3. Har bir xarajat uchun to'lovlarni hisoblash
            const modalData = expenses.map((expense: Expense): ModalExpense | null => {
                // Shu xarajat uchun to'lovlarni filtrlash (faqat xarajat ID si bo'yicha)
                const expensePayments = allPayments.filter((payment: { supplier: number; description?: string; amount: string | number }) => 
                    payment.supplier === expense.supplier &&
                    payment.description?.includes(`Xarajat ID: ${expense.id}`)
                );

                // To'langan summani hisoblash
                const paidAmount = expensePayments.reduce((sum: number, payment: { amount: string | number }) => 
                    sum + Number(payment.amount || 0), 0
                );

                // Qolgan summani hisoblash
                const remainingAmount = Math.max(0, Number(expense.amount) - paidAmount);

                // Agar to'liq to'langan bo'lsa, xarajat statusini yangilash
                if (paidAmount >= Number(expense.amount)) {
                    fetch(`${API_BASE_URL}/expenses/${expense.id}/`, {
                        method: "PUT",
                        headers: getAuthHeaders(),
                        body: JSON.stringify({
                            ...expense,
                            status: "To'langan"
                        }),
                    }).catch(error => {
                        console.error(`Xarajat (ID: ${expense.id}) statusini yangilashda xatolik:`, error);
                    });
                    return null; // To'liq to'langan xarajatlarni ko'rsatmaslik
                }

                return {
                    id: expense.id,
                    amount: expense.amount,
                    date: expense.date,
                    supplier: expense.supplier,
                    supplier_name: expense.supplier_name,
                    comment: expense.comment,
                    expense_type_name: expense.expense_type_name,
                    object: expense.object,
                    object_name: expense.object_name || "-",
                    paid_amount: paidAmount,
                    remaining_amount: remainingAmount
                };
            });

            // null qiymatlarni (to'liq to'langan xarajatlarni) olib tashlash
            const filteredModalData = modalData.filter((item: ModalExpense | null): item is ModalExpense => item !== null);

            setModalExpenses(filteredModalData);

            // 4. Qolgan umumiy summani hisoblash
            const totalRemainingAmount = filteredModalData.reduce((sum: number, expense: ModalExpense) => 
                sum + Number(expense.remaining_amount || 0), 0
            );
            setFilteredPendingAmount(totalRemainingAmount);
        } catch (error: any) {
            console.error("Nasiya xarajatlarni yuklashda xatolik:", error);
            toast.error(error.message || "Nasiya xarajatlarni yuklashda xatolik yuz berdi");
            setModalExpenses([]);
        } finally {
            setModalLoading(false);
        }
    }, [accessToken, getAuthHeaders, suppliers, filters, debouncedSearchTerm]);

    useEffect(() => {
        if (accessToken) {
            fetchInitialData().then(() => {
                fetchExpensesAndFilteredTotals();
            });
        }
    }, [accessToken, fetchInitialData]);

    useEffect(() => {
        if (accessToken && suppliers.length > 0) {
            fetchExpensesAndFilteredTotals();
        }
    }, [
        accessToken,
        filters,
        currentPage,
        debouncedSearchTerm,
        suppliers.length,
        sortOrder,
    ]);

    // Update URL query parameter when currentPage changes
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (currentPage === 1) {
            params.delete("page");
        } else {
            params.set("page", currentPage.toString());
        }
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, "", newUrl);
    }, [currentPage]);

    // --- CRUD Operations ---
    const createSupplierPayment = async (supplierId: number, amount: string, description: string) => {
        try {
            const paymentData = {
                supplier: supplierId,
                amount: Number(amount),
                payment_type: "naqd",
                description: description || "Xarajat uchun naqd to'lov",
            };
            const response = await fetch(`${API_BASE_URL}/supplier-payments/`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(paymentData),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessages = Object.entries(errorData)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                    .join("; ");
                throw new Error(`To'lov qo'shishda xatolik (${response.status}): ${errorMessages || "Server xatosi"}`);
            }
            return await response.json();
        } catch (error: any) {
            throw new Error(`To'lov qo'shishda xatolik: ${error.message}`);
        }
    };

    const createExpense = async (
        expenseData: any,
        action: "save" | "saveAndAdd" | "saveAndContinue"
    ) => {
        if (!accessToken) {
            toast.error("Avtorizatsiya tokeni topilmadi");
            return;
        }
        setIsSubmitting(true);
        try {
            const expenseStatus = formData.status === "Naqd pul" ? "To‘langan" : "Kutilmoqda";
            const response = await fetch(`${API_BASE_URL}/expenses/`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    ...expenseData,
                    status: expenseStatus,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 403)
                    throw new Error("Ruxsat yo'q (Faqat admin qo'shishi mumkin).");
                const errorMessages = Object.entries(errorData)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                    .join("; ");
                throw new Error(`Xatolik (${response.status}): ${errorMessages || "Server xatosi"}`);
            }
            const newExpense = await response.json();

            setExpenses((prev) => [
                {
                    ...newExpense,
                    supplier_name:
                        suppliers.find((s) => s.id === expenseData.supplier)?.company_name ||
                        `Yetk. ID: ${expenseData.supplier}`,
                    expense_type_name:
                        expenseTypes.find((t) => t.id === expenseData.expense_type)?.name ||
                        `Turi ID: ${expenseData.expense_type}`,
                    object_name:
                        properties.find((p) => p.id === expenseData.object)?.name ||
                        `Obyekt ID: ${expenseData.object}`,
                },
                ...prev,
            ]);

            if (expenseStatus === "To‘langan") {
                try {
                    await createSupplierPayment(
                        expenseData.supplier,
                        expenseData.amount,
                        `Xarajat ID: ${newExpense.id} - ${expenseData.comment}`
                    );
                } catch (error: any) {
                    toast.error(`Xarajat qo'shildi, lekin to'lovni saqlashda xatolik: ${error.message}`);
                }
            }

            toast.success("Xarajat muvaffaqiyatli qo'shildi");
            setCurrentPage(1);
            setOpen(false);
            setFormData(initialFormData);

            await Promise.all([
                fetchExpensesAndFilteredTotals(),
                fetchInitialData(),
            ]);
        } catch (error: any) {
            setExpenses((prev) => prev.filter((exp) => exp.id !== -1));
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchExpenseById = async (id: number) => {
        if (!accessToken) return;
        setEditOpen(true);
        setCurrentExpense(null);
        setFormData(initialFormData);
        try {
            const response = await fetch(`${API_BASE_URL}/expenses/${expenseToDelete}/`, {
                method: "GET",
                headers: getAuthHeaders(),
            });
            if (!response.ok) throw new Error(`Xarajat (ID: ${id}) olinmadi`);
            const data: Expense = await response.json();
            setCurrentExpense(data);
            let formattedDate = data.date;
            if (data.date) {
                try {
                    formattedDate = format(new Date(data.date), "yyyy-MM-dd");
                } catch {
                    console.warn("Could not format date:", data.date);
                }
            }
            setFormData({
                object: data.object?.toString() || "",
                supplier: data.supplier?.toString() || "",
                amount: data.amount || "0",
                expense_type: data.expense_type?.toString() || "",
                date: formattedDate,
                comment: data.comment || "",
                status: data.status === "To‘langan" ? "Naqd pul" : "Nasiya",
            });
        } catch (error: any) {
            toast.error(error.message);
            setEditOpen(false);
        }
    };

    const updateExpense = async (
        id: number,
        expenseData: any,
        action: "save" | "saveAndAdd" | "saveAndContinue"
    ) => {
        if (!accessToken) {
            toast.error("Avtorizatsiya tokeni topilmadi");
            return;
        }
        setIsSubmitting(true);
        try {
            const expenseStatus = formData.status === "Naqd pul" ? "To‘langan" : "Kutilmoqda";
            const response = await fetch(`${API_BASE_URL}/expenses/${expenseToDelete}/`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    ...expenseData,
                    status: expenseStatus,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 403)
                    throw new Error("Ruxsat yo'q (Faqat admin yangilashi mumkin).");
                const errorMessages = Object.entries(errorData)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                    .join("; ");
                throw new Error(`Xatolik (${response.status}): ${errorMessages || "Server xatosi"}`);
            }
            const updatedExpense = await response.json();

            if (expenseStatus === "To‘langan") {
                try {
                    await createSupplierPayment(
                        expenseData.supplier,
                        expenseData.amount,
                        `Xarajat ID: ${id} (Yangilangan) - ${expenseData.comment}`
                    );
                } catch (error: any) {
                    toast.error(`Xarajat yangilandi, lekin to'lovni saqlashda xatolik: ${error.message}`);
                }
            }

            toast.success("Xarajat muvaffaqiyatli yangilandi");
            await Promise.all([
                fetchExpensesAndFilteredTotals(),
                fetchInitialData(),
            ]);

            if (action === "save") {
                setEditOpen(false);
                setCurrentExpense(null);
                setFormData(initialFormData);
            } else if (action === "saveAndAdd") {
                setEditOpen(false);
                setCurrentExpense(null);
                setFormData(initialFormData);
                setOpen(true);
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteExpense = async (id: number) => {
        if (!accessToken) return;
        setExpenseToDelete(id);
        setDeleteCode("");
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!accessToken || !expenseToDelete || deleteCode !== "7777") {
            toast.error("Noto'g'ri kod kiritildi");
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/expenses/${expenseToDelete}/`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });
            if (response.status === 204 || response.ok) {
                setDeleteDialogOpen(false);
                setDeleteCode("");
                setExpenseToDelete(null);
                toast.success("Xarajat muvaffaqiyatli o'chirildi");
                await Promise.all([
                    fetchExpensesAndFilteredTotals(),
                    fetchInitialData(),
                ]);
            } else {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 403)
                    throw new Error("Ruxsat yo'q (Faqat admin o'chirishi mumkin).");
                throw new Error(`Xatolik (${response.status}): ${errorData.detail || "Server xatosi"}`);
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const createExpenseType = async () => {
        if (!accessToken || !newExpenseTypeName.trim()) {
            toast.error("Xarajat turi nomi kiritilishi shart");
            return;
        }
        setIsExpenseTypeSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/expense-types/`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ name: newExpenseTypeName.trim() }),
            });
            if (!response.ok) throw new Error("Xarajat turi qo'shilmadi");
            const newType: ExpenseType = await response.json();
            setExpenseTypes((prev) =>
                [...prev, newType].sort((a, b) => a.name.localeCompare(b.name))
            );
            setFormData((prev) => ({ ...prev, expense_type: newType.id.toString() }));
            setNewExpenseTypeName("");
            setAddExpenseTypeOpen(false);
            toast.success(`"${newType.name}" xarajat turi qo'shildi`);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsExpenseTypeSubmitting(false);
        }
    };

    const createSupplier = async () => {
        if (!accessToken || !newSupplierData.company_name.trim()) {
            toast.error("Kompaniya nomi kiritilishi shart");
            return;
        }
        setIsSupplierSubmitting(true);
        try {
            const supplierData = {
                company_name: newSupplierData.company_name.trim(),
                contact_person_name: newSupplierData.contact_person_name.trim() || null,
                phone_number: newSupplierData.phone_number.trim() || null,
                address: newSupplierData.address.trim() || null,
                description: newSupplierData.description.trim() || null,
            };
            const response = await fetch(`${API_BASE_URL}/suppliers/`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(supplierData),
            });
            if (!response.ok) throw new Error("Yetkazib beruvchi qo'shilmadi");
            const newSupplier: Supplier = await response.json();
            await fetchInitialData();
            setFormData((prev) => ({ ...prev, supplier: newSupplier.id.toString() }));
            setNewSupplierData(initialNewSupplierData);
            setAddSupplierOpen(false);
            toast.success(`"${newSupplier.company_name}" yetkazib beruvchi qo'shildi`);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSupplierSubmitting(false);
        }
    };

const handleAddPayment = async () => {
        if (
            !accessToken ||
            !currentPaymentSupplier ||
            !paymentAmount ||
            Number(paymentAmount) <= 0 ||
            !paymentDescription.trim()
        ) {
            toast.error("Iltimos summa va tavsifni to'g'ri kiriting.");
            return;
        }
        setIsSubmittingPayment(true);
        try {
            // 1. Xarajatni olish
            const expenseResponse = await fetch(`${API_BASE_URL}/expenses/${expenseToDelete}/`, {
                method: "GET",
                headers: getAuthHeaders(),
            });

            if (!expenseResponse.ok) {
                throw new Error(`Xarajat ma'lumotlarini olishda xatolik (${expenseResponse.status})`);
            }

            const expenseData = await expenseResponse.json();

            // 2. To'lovlarni olish
            const paymentsResponse = await fetch(
                `${API_BASE_URL}/supplier-payments/?supplier=${currentPaymentSupplier.id}`,
                {
                    method: "GET",
                    headers: getAuthHeaders(),
                }
            );

            if (!paymentsResponse.ok) {
                throw new Error(`To'lovlarni olishda xatolik (${paymentsResponse.status})`);
            }

            const paymentsData = await paymentsResponse.json();
            const existingPayments = paymentsData.results || [];

            // 3. Mavjud to'lovlar summasini hisoblash
            const existingPaymentsTotal = existingPayments.reduce(
                (sum: number, payment: { amount: string | number }) =>
                    sum + Number(payment.amount || 0),
                0
            );

            // 4. Yangi to'lovni qo'shish
            const paymentData = {
                supplier: currentPaymentSupplier.id,
                amount: paymentAmount,
                payment_type: "naqd",
                description: `${paymentDescription.trim()} (Xarajat ID: ${expenseToDelete})`,
            };

            const response = await fetch(`${API_BASE_URL}/supplier-payments/`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(paymentData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessages = Object.entries(errorData)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                    .join("; ");
                throw new Error(
                    `To'lov qo'shishda xatolik (${response.status}): ${errorMessages || "Server xatosi"}`
                );
            }

            // 5. Agar to'lovlar summasi xarajat summasiga teng yoki undan katta bo'lsa, statusni yangilash
            const totalPaid = existingPaymentsTotal + Number(paymentAmount);
            if (totalPaid >= Number(expenseData.amount)) {
                // Prepare updated expense data with only allowed fields
const updatedExpenseData = {
    object: expenseData.object,
    supplier: expenseData.supplier,
    amount: expenseData.amount,
    expense_type: expenseData.expense_type,
    date: expenseData.date,
    comment: expenseData.comment,
    status: "To‘langan"
};
                const updateResponse = await fetch(`${API_BASE_URL}/expenses/${expenseToDelete}/`, {
                    method: "PUT",
                    headers: getAuthHeaders(),
                    body: JSON.stringify(updatedExpenseData),
                });

                if (!updateResponse.ok) {
                    console.error("Xarajat statusini yangilashda xatolik");
                }
            }

            toast.success("To'lov muvaffaqiyatli qo'shildi!");
            setPaymentDialogOpen(false);
            setPaymentAmount("");
            setPaymentDescription("");
            setCurrentPaymentSupplier(null);
            setExpenseToDelete(null);

await Promise.all([
    fetchInitialData(),
    fetchExpensesAndFilteredTotals(),
    fetchPendingModalExpenses(),
    fetchPaidModalExpenses(),
]);
        } catch (error: any) {
            console.error("Payment submission error:", error);
            toast.error(error.message);
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    // --- Event Handlers ---
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };
    const handleSupplierChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setNewSupplierData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };
    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };
    const handleFilterChange = (name: string, value: string) => {
        setFilters((prev) => ({ ...prev, [name]: value === "all" ? "" : value }));
        setCurrentPage(1);
    };
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };
    const handleOpenEditDialog = (expenseId: number) => {
        fetchExpenseById(expenseId);
    };
    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };
    const handleSortToggle = () => {
        setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
        setCurrentPage(1);
    };
    const handleOpenPaidModal = () => {
        setPaidModalOpen(true);
        fetchPaidModalExpenses();
    };
    const handleOpenPendingModal = () => {
        setPendingModalOpen(true);
        fetchPendingModalExpenses();
    };
const handleOpenPaymentDialog = (expense: ModalExpense) => {
    setExpenseToDelete(expense.id);
    setCurrentPaymentSupplier({
        id: expense.supplier,
        company_name: expense.supplier_name
    });
    setPaymentAmount(expense.amount || "");
    setPaymentDescription(`To'lov: ${expense.comment}`);
    setPendingModalOpen(false);
    setPaymentDialogOpen(true);
};

    // --- Form Validation ---
    const validateFormData = (): boolean => {
        const errors: string[] = [];
        if (!formData.object) errors.push(`"Obyekt" tanlanishi shart.`);
        if (!formData.supplier) errors.push(`"Yetkazib beruvchi" tanlanishi shart.`);
        if (!formData.expense_type) errors.push(`"Xarajat turi" tanlanishi shart.`);
        if (!formData.date) errors.push(`"Sana" kiritilishi shart.`);
        if (!formData.comment.trim()) errors.push(`"Izoh" kiritilishi shart.`);
        if (!formData.status) errors.push(`"To'lov turi" tanlanishi shart.`);
        const amountNum = Number(formData.amount);
        if (formData.amount === "" || isNaN(amountNum) || amountNum <= 0)
            errors.push(`"Summa" musbat raqam bo'lishi kerak.`);
        if (errors.length > 0) {
            toast.error(errors.join("\n"));
            return false;
        }
        return true;
    };

    // --- Submit Handlers ---
    const handleSubmit = (
        e: React.FormEvent,
        action: "save" | "saveAndAdd" | "saveAndContinue"
    ) => {
        e.preventDefault();
        if (!validateFormData()) return;
        const expenseData = {
            object: Number(formData.object),
            supplier: Number(formData.supplier),
            amount: formData.amount,
            expense_type: Number(formData.expense_type),
            date: formData.date,
            comment: formData.comment.trim(),
        };
        createExpense(expenseData, action);
    };
    const handleEditSubmit = async (
        e: React.FormEvent,
        action: "save" | "saveAndAdd" | "saveAndContinue"
    ) => {
        e.preventDefault();
        if (!currentExpense || !validateFormData()) return;
        const expenseData = {
            object: Number(formData.object),
            supplier: Number(formData.supplier),
            amount: formData.amount,
            expense_type: Number(formData.expense_type),
            date: formData.date,
            comment: formData.comment.trim(),
        };
        updateExpense(currentExpense.id, expenseData, action);
    };

    // --- Helper Functions ---
    const getExpenseTypeStyle = (typeName: string | undefined): string => {
        if (!typeName) return "bg-gray-100 text-gray-800";
        const lower = typeName.toLowerCase();
        if (lower.includes("qurilish") || lower.includes("material"))
            return "bg-blue-100 text-blue-800";
        if (lower.includes("ishchi") || lower.includes("usta"))
            return "bg-green-100 text-green-800";
        if (lower.includes("kommunal") || lower.includes("gaz") || lower.includes("svet"))
            return "bg-yellow-100 text-yellow-800";
        if (lower.includes("transport") || lower.includes("yo'l"))
            return "bg-purple-100 text-purple-800";
        if (lower.includes("ofis") || lower.includes("kantselyariya"))
            return "bg-pink-100 text-pink-800";
        if (lower.includes("to'lov")) return "bg-teal-100 text-teal-800";
        return "bg-secondary text-secondary-foreground";
    };
    const formatCurrency = useCallback(
        (amount: number | string | undefined | null) => {
            const numericAmount = Number(amount || 0);
            if (!isClient) return `${numericAmount.toFixed(2)} USD`;
            try {
                return numericAmount.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                });
            } catch (e) {
                return `${numericAmount.toFixed(2)} USD`;
            }
        },
        [isClient]
    );
    const formatDate = useCallback(
        (dateString: string | undefined | null) => {
            if (!dateString) return "-";
            if (!isClient) return dateString;
            try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return dateString;
                return format(date, "dd/MM/yyyy");
            } catch (e) {
                console.warn("Date formatting error:", e);
                return dateString;
            }
        },
        [isClient]
    );
    const getObjectName = useCallback(
        (objectId: number | undefined) => {
            if (objectId === undefined || objectId === 0) return "-";
            return properties.find((p) => p.id === objectId)?.name || `Obyekt ID: ${objectId}`;
        },
        [properties]
    );

    // --- Table Rendering Function ---
    function renderExpensesTable(expensesToRender: Expense[]) {
        const isLoading = loading && !isRefreshing;
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-[200px] border rounded-md">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="ml-2 text-muted-foreground">Jadval yuklanmoqda...</p>
                </div>
            );
        }
        if (expensesToRender.length === 0) {
            return (
                <div className="flex items-center justify-center h-[200px] border rounded-md">
                    <p className="text-muted-foreground text-center">
                        {searchTerm || filters.object || filters.expense_type || filters.dateRange !== "all"
                            ? "Filtr yoki qidiruvga mos xarajatlar topilmadi."
                            : "Hozircha xarajatlar mavjud emas."}
                    </p>
                </div>
            );
        }
        return (
            <div className="rounded-md border overflow-x-auto relative">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px]">
                                <Button
                                    variant="ghost"
                                    onClick={handleSortToggle}
                                    className="flex items-center space-x-1 p-0"
                                >
                                    <span>#</span>
                                    <ArrowUpDown className="h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead className="w-[120px]">Sana</TableHead>
                            <TableHead>Obyekt</TableHead>
                            <TableHead>Yetkazib beruvchi</TableHead>
                            <TableHead>Tavsif</TableHead>
                            <TableHead>Turi</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right w-[150px]">Summa</TableHead>
                            <TableHead className="text-right w-[100px]">Amallar</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expensesToRender.map((expense, index) => {
                            const supplierInfo = suppliers.find((s) => s.id === expense.supplier);
                            const supplierBalance = supplierInfo ? Number(supplierInfo.balance || 0) : undefined;
                            const isPending = expense.status === "Kutilmoqda" && supplierBalance !== undefined && supplierBalance > 0;

                            return (
                                <TableRow key={expense.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">
                                        {(currentPage - 1) * itemsPerPage + index + 1}
                                    </TableCell>
                                    <TableCell>{formatDate(expense.date)}</TableCell>
                                    <TableCell>{getObjectName(expense.object)}</TableCell>
                                    <TableCell>
                                        {expense.supplier_name || `Yetk. ID: ${expense.supplier}`}
                                        {isPending && supplierBalance !== undefined && (
                                            <div className="text-xs text-yellow-600 mt-1">
                                                Balans: {formatCurrency(supplierBalance)}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[250px] truncate" title={expense.comment}>
                                        {expense.comment || "-"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={`whitespace-nowrap ${getExpenseTypeStyle(
                                                expense.expense_type_name
                                            )}`}
                                        >
                                            {expense.expense_type_name || `ID: ${expense.expense_type}`}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={`whitespace-nowrap ${getExpenseTypeStyle(
                                                expense.expense_type_name
                                            )}`}
                                        >
                                            {expense.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                        {formatCurrency(expense.amount)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenEditDialog(expense.id)}
                                                title="Tahrirlash"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => deleteExpense(expense.id)}
                                                title="O'chirish"
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        <TableRow className="bg-muted hover:bg-muted font-bold sticky bottom-0">
                            <TableCell colSpan={6} className="text-right">
                                Jami (Sahifada):
                            </TableCell>
                            <TableCell className="text-right">
                                {formatCurrency(
                                    expensesToRender.reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
                                )}
                            </TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        );
    }

    // --- JSX ---
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <Toaster position="top-center" />
            {/* Header */}
            <header className="border-b sticky top-0 bg-background z-10">
                <div className="flex h-16 items-center px-4 container mx-auto">
                    <MainNav className="mx-6" />
                    <div className="ml-auto flex items-center space-x-4">
                        <UserNav />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 space-y-4 p-4 md:p-8 pt-6 container mx-auto">
                {/* Title and Add Button */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 mb-6">
                    <h2 className="text-3xl font-bold tracking-tight">Xarajatlar</h2>
                    <Dialog
                        open={open}
                        onOpenChange={(isOpen) => {
                            setOpen(isOpen);
                            if (isOpen) setFormData(initialFormData);
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button size="sm" disabled={!accessToken}>
                                <Plus className="mr-2 h-4 w-4" /> Yangi xarajat
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                            {/* Add New Expense Form */}
                            <DialogHeader>
                                <DialogTitle>Yangi xarajat qo'shish</DialogTitle>
                                <DialogDescription>
                                    Xarajat ma'lumotlarini kiriting (* majburiy). To'lov turi sifatida "Naqd pul" tanlansa, xarajat "To‘langan" sifatida saqlanadi va yetkazib beruvchi balansiga qo'shiladi.
                                </DialogDescription>
                            </DialogHeader>
                            <form
                                id="add-expense-form"
                                onSubmit={(e) => handleSubmit(e, "save")}
                                className="flex-1 overflow-y-auto pr-4 pl-1 -mr-2"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 py-4">
                                    {/* Amount */}
                                    <div className="space-y-1">
                                        <Label htmlFor="amount">Summa (USD) *</Label>
                                        <Input
                                            required
                                            id="amount"
                                            name="amount"
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={formData.amount}
                                            onChange={handleChange}
                                            placeholder="Masalan: 1500.50"
                                        />
                                    </div>
                                    {/* Date */}
                                    <div className="space-y-1">
                                        <Label htmlFor="date">Xarajat sanasi *</Label>
                                        <Input
                                            required
                                            id="date"
                                            name="date"
                                            type="date"
                                            value={formData.date}
                                            onChange={handleChange}
                                            max={new Date().toISOString().split("T")[0]}
                                        />
                                    </div>
                                    {/* Supplier */}
                                    <div className="space-y-1">
                                        <Label htmlFor="supplier">Yetkazib beruvchi *</Label>
                                        <div className="flex items-center space-x-2">
                                            <Select
                                                required
                                                value={formData.supplier}
                                                onValueChange={(value) => handleSelectChange("supplier", value)}
                                                name="supplier"
                                            >
                                                <SelectTrigger id="supplier" className="flex-1">
                                                    <SelectValue placeholder="Tanlang..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {suppliers.map((s) => (
                                                        <SelectItem key={s.id} value={s.id.toString()}>
                                                            {s.company_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Dialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        title="Yangi yetkazib beruvchi qo'shish"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[425px]">
                                                    <DialogHeader>
                                                        <DialogTitle>Yangi yetkazib beruvchi</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto pr-2">
                                                        <Label htmlFor="new_company_name">Kompaniya nomi *</Label>
                                                        <Input
                                                            id="new_company_name"
                                                            name="company_name"
                                                            value={newSupplierData.company_name}
                                                            onChange={handleSupplierChange}
                                                            required
                                                        />
                                                        <Label htmlFor="new_contact_person_name">Kontakt</Label>
                                                        <Input
                                                            id="new_contact_person_name"
                                                            name="contact_person_name"
                                                            value={newSupplierData.contact_person_name}
                                                            onChange={handleSupplierChange}
                                                        />
                                                        <Label htmlFor="new_phone_number">Telefon</Label>
                                                        <Input
                                                            id="new_phone_number"
                                                            name="phone_number"
                                                            value={newSupplierData.phone_number}
                                                            onChange={handleSupplierChange}
                                                        />
                                                        <Label htmlFor="new_address">Manzil</Label>
                                                        <Textarea
                                                            id="new_address"
                                                            name="address"
                                                            value={newSupplierData.address}
                                                            onChange={handleSupplierChange}
                                                            rows={2}
                                                        />
                                                        <Label htmlFor="new_description">Tavsif</Label>
                                                        <Textarea
                                                            id="new_description"
                                                            name="description"
                                                            value={newSupplierData.description}
                                                            onChange={handleSupplierChange}
                                                            rows={2}
                                                        />
                                                    </div>
                                                    <DialogFooter>
                                                        <Button
                                                            type="button"
                                                            onClick={createSupplier}
                                                            disabled={!newSupplierData.company_name.trim() || isSupplierSubmitting}
                                                        >
                                                            {isSupplierSubmitting ? (
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            ) : null}
                                                            Qo'shish
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setAddSupplierOpen(false);
                                                                setNewSupplierData(initialNewSupplierData);
                                                            }}
                                                            disabled={isSupplierSubmitting}
                                                        >
                                                            Bekor qilish
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                    {/* Expense Type */}
                                    <div className="space-y-1">
                                        <Label htmlFor="expense_type">Xarajat turi *</Label>
                                        <div className="flex items-center space-x-2">
                                            <Select
                                                required
                                                value={formData.expense_type}
                                                onValueChange={(value) => handleSelectChange("expense_type", value)}
                                                name="expense_type"
                                            >
                                                <SelectTrigger id="expense_type" className="flex-1">
                                                    <SelectValue placeholder="Tanlang..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {expenseTypes.map((t) => (
                                                        <SelectItem key={t.id} value={t.id.toString()}>
                                                            {t.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Dialog
                                                open={addExpenseTypeOpen}
                                                onOpenChange={setAddExpenseTypeOpen}
                                            >
                                                <DialogTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        title="Yangi xarajat turi qo'shish"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[425px]">
                                                    <DialogHeader>
                                                        <DialogTitle>Yangi xarajat turi</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="grid gap-4 py-4">
                                                        <Label htmlFor="new_expense_type_name">Nomi *</Label>
                                                        <Input
                                                            id="new_expense_type_name"
                                                            value={newExpenseTypeName}
                                                            onChange={(e) => setNewExpenseTypeName(e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <DialogFooter>
                                                        <Button
                                                            type="button"
                                                            onClick={createExpenseType}
                                                            disabled={!newExpenseTypeName.trim() || isExpenseTypeSubmitting}
                                                        >
                                                            {isExpenseTypeSubmitting ? (
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            ) : null}
                                                            Qo'shish
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setAddExpenseTypeOpen(false);
                                                                setNewExpenseTypeName("");
                                                            }}
                                                            disabled={isExpenseTypeSubmitting}
                                                        >
                                                            Bekor qilish
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                    {/* Object */}
                                    <div className="space-y-1">
                                        <Label htmlFor="object">Obyekt *</Label>
                                        <Select
                                            required
                                            value={formData.object}
                                            onValueChange={(value) => handleSelectChange("object", value)}
                                            name="object"
                                        >
                                            <SelectTrigger id="object">
                                                <SelectValue placeholder="Tanlang..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {properties.map((p) => (
                                                    <SelectItem key={p.id} value={p.id.toString()}>
                                                        {p.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {/* Status */}
                                    <div className="space-y-1">
                                        <Label htmlFor="status">To'lov turi *</Label>
                                        <Select
                                            required
                                            value={formData.status}
                                            onValueChange={(value) => handleSelectChange("status", value)}
                                            name="status"
                                        >
                                            <SelectTrigger id="status">
                                                <SelectValue placeholder="Tanlang..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Naqd pul">Naqd pul</SelectItem>
                                                <SelectItem value="Nasiya">Nasiya</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {/* Comment */}
                                    <div className="space-y-1 sm:col-span-2">
                                        <Label htmlFor="comment">Tavsif / Izoh *</Label>
                                        <Textarea
                                            required
                                            id="comment"
                                            name="comment"
                                            value={formData.comment}
                                            onChange={handleChange}
                                            rows={3}
                                            placeholder="Xarajat haqida batafsil..."
                                        />
                                    </div>
                                </div>
                            </form>
                            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 space-y-2 sm:space-y-0 pt-4 border-t">
                                <Button
                                    type="submit"
                                    form="add-expense-form"
                                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                                    disabled={
                                        isSubmitting ||
                                        !formData.object ||
                                        !formData.supplier ||
                                        !formData.expense_type ||
                                        !formData.date ||
                                        !formData.comment.trim() ||
                                        !formData.amount ||
                                        Number(formData.amount) <= 0 ||
                                        !formData.status
                                    }
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : null}
                                    Saqlash
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={() => setOpen(false)}
                                    disabled={isSubmitting}
                                >
                                    Bekor qilish
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* --- Edit Dialog --- */}
                <Dialog
                    open={editOpen}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setCurrentExpense(null);
                            setFormData(initialFormData);
                        }
                        setEditOpen(isOpen);
                    }}
                >
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Xarajatni tahrirlash (ID: {currentExpense?.id})</DialogTitle>
                            <DialogDescription>
                                Xarajat ma'lumotlarini yangilang (* majburiy). To'lov turi o'zgartirilishi mumkin.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            id="edit-expense-form"
                            onSubmit={(e) => handleEditSubmit(e, "save")}
                            className="flex-1 overflow-y-auto pr-4 pl-1 -mr-2"
                        >
                            {!currentExpense && editOpen ? (
                                <div className="flex justify-center items-center h-40">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    <span className="ml-2 text-muted-foreground">Yuklanmoqda...</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 py-4">
                                    {/* Amount */}
                                    <div className="space-y-1">
                                        <Label htmlFor="edit-amount">Summa (USD) *</Label>
                                        <Input
                                            required
                                            id="edit-amount"
                                            name="amount"
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={formData.amount}
                                            onChange={handleChange}
                                            placeholder="Masalan: 1500.50"
                                        />
                                    </div>
                                    {/* Date */}
                                    <div className="space-y-1">
                                        <Label htmlFor="edit-date">Xarajat sanasi *</Label>
                                        <Input
                                            required
                                            id="edit-date"
                                            name="date"
                                            type="date"
                                            value={formData.date}
                                            onChange={handleChange}
                                            max={new Date().toISOString().split("T")[0]}
                                        />
                                    </div>
                                    {/* Supplier */}
                                    <div className="space-y-1">
                                        <Label htmlFor="edit-supplier">Yetkazib beruvchi *</Label>
                                        <div className="flex items-center space-x-2">
                                            <Select
                                                required
                                                value={formData.supplier}
                                                onValueChange={(value) => handleSelectChange("supplier", value)}
                                                name="supplier"
                                            >
                                                <SelectTrigger id="edit-supplier" className="flex-1">
                                                    <SelectValue placeholder="Tanlang..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {suppliers.map((s) => (
                                                        <SelectItem key={s.id} value={s.id.toString()}>
                                                            {s.company_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Dialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        title="Yangi yetkazib beruvchi qo'shish"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[425px]">
                                                    <DialogHeader>
                                                        <DialogTitle>Yangi yetkazib beruvchi</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto pr-2">
                                                        <Label htmlFor="edit_new_company_name">
                                                            Kompaniya nomi *
                                                        </Label>
                                                        <Input
                                                            id="edit_new_company_name"
                                                            name="company_name"
                                                            value={newSupplierData.company_name}
                                                            onChange={handleSupplierChange}
                                                            required
                                                        />
                                                        <Label htmlFor="edit_new_contact_person_name">
                                                            Kontakt
                                                        </Label>
                                                        <Input
                                                            id="edit_new_contact_person_name"
                                                            name="contact_person_name"
                                                            value={newSupplierData.contact_person_name}
                                                            onChange={handleSupplierChange}
                                                        />
                                                        <Label htmlFor="edit_new_phone_number">Telefon</Label>
                                                        <Input
                                                            id="edit_new_phone_number"
                                                            name="phone_number"
                                                            value={newSupplierData.phone_number}
                                                            onChange={handleSupplierChange}
                                                        />
                                                        <Label htmlFor="edit_new_address">Manzil</Label>
                                                        <Textarea
                                                            id="edit_new_address"
                                                            name="address"
                                                            value={newSupplierData.address}
                                                            onChange={handleSupplierChange}
                                                            rows={2}
                                                        />
                                                        <Label htmlFor="edit_new_description">Tavsif</Label>
                                                        <Textarea
                                                            id="edit_new_description"
                                                            name="description"
                                                            value={newSupplierData.description}
                                                            onChange={handleSupplierChange}
                                                            rows={2}
                                                        />
                                                    </div>
                                                    <DialogFooter>
                                                        <Button
                                                            type="button"
                                                            onClick={createSupplier}
                                                            disabled={!newSupplierData.company_name.trim() || isSupplierSubmitting}
                                                        >
                                                            {isSupplierSubmitting ? (
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            ) : null}
                                                            Qo'shish
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setAddSupplierOpen(false);
                                                                setNewSupplierData(initialNewSupplierData);
                                                            }}
                                                            disabled={isSupplierSubmitting}
                                                        >
                                                            Bekor qilish
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                    {/* Expense Type */}
                                    <div className="space-y-1">
                                        <Label htmlFor="edit-expense_type">Xarajat turi *</Label>
                                        <div className="flex items-center space-x-2">
                                            <Select
                                                required
                                                value={formData.expense_type}
                                                onValueChange={(value) => handleSelectChange("expense_type", value)}
                                                name="expense_type"
                                            >
                                                <SelectTrigger id="edit-expense_type" className="flex-1">
                                                    <SelectValue placeholder="Tanlang..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {expenseTypes.map((t) => (
                                                        <SelectItem key={t.id} value={t.id.toString()}>
                                                            {t.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Dialog
                                                open={addExpenseTypeOpen}
                                                onOpenChange={setAddExpenseTypeOpen}
                                            >
                                                <DialogTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        title="Yangi xarajat turi qo'shish"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[425px]">
                                                    <DialogHeader>
                                                        <DialogTitle>Yangi xarajat turi</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="grid gap-4 py-4">
                                                        <Label htmlFor="edit_new_expense_type_name">
                                                            Nomi *
                                                        </Label>
                                                        <Input
                                                            id="edit_new_expense_type_name"
                                                            value={newExpenseTypeName}
                                                            onChange={(e) => setNewExpenseTypeName(e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <DialogFooter>
                                                        <Button
                                                            type="button"
                                                            onClick={createExpenseType}
                                                            disabled={!newExpenseTypeName.trim() || isExpenseTypeSubmitting}
                                                        >
                                                            {isExpenseTypeSubmitting ? (
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            ) : null}
                                                            Qo'shish
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setAddExpenseTypeOpen(false);
                                                                setNewExpenseTypeName("");
                                                            }}
                                                            disabled={isExpenseTypeSubmitting}
                                                        >
                                                            Bekor qilish
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                    {/* Object */}
                                    <div className="space-y-1">
                                        <Label htmlFor="edit-object">Obyekt *</Label>
                                        <Select
                                            required
                                            value={formData.object}
                                            onValueChange={(value) => handleSelectChange("object", value)}
                                            name="object"
                                        >
                                            <SelectTrigger id="edit-object">
                                                <SelectValue placeholder="Tanlang..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {properties.map((p) => (
                                                    <SelectItem key={p.id} value={p.id.toString()}>
                                                        {p.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {/* Status */}
                                    <div className="space-y-1">
                                        <Label htmlFor="edit-status">To'lov turi *</Label>
                                        <Select
                                            required
                                            value={formData.status}
                                            onValueChange={(value) => handleSelectChange("status", value)}
                                            name="status"
                                        >
                                            <SelectTrigger id="edit-status">
                                                <SelectValue placeholder="Tanlang..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Naqd pul">Naqd pul</SelectItem>
                                                <SelectItem value="Nasiya">Nasiya</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                
                                    {/* Comment */}
<div className="space-y-1 sm:col-span-2">
    <Label htmlFor="edit-comment">Tavsif / Izoh *</Label>
    <Textarea
        required
        id="edit-comment"
        name="comment"
        value={formData.comment}
        onChange={handleChange}
        rows={3}
        placeholder="Xarajat haqida batafsil..."
    />
</div>
</div>
)}
</form>
<DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 space-y-2 sm:space-y-0 pt-4 border-t">
    <Button
        type="submit"
        form="edit-expense-form"
        className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
        disabled={
            isSubmitting ||
            !formData.object ||
            !formData.supplier ||
            !formData.expense_type ||
            !formData.date ||
            !formData.comment.trim() ||
            !formData.amount ||
            Number(formData.amount) <= 0 ||
            !formData.status
        }
    >
        {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Saqlash
    </Button>
    <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        onClick={() => {
            setEditOpen(false);
            setCurrentExpense(null);
            setFormData(initialFormData);
        }}
        disabled={isSubmitting}
    >
        Bekor qilish
    </Button>
</DialogFooter>
</DialogContent>
</Dialog>

{/* Filters and Totals */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    {/* Object Filter */}
    <div className="space-y-1">
        <Label htmlFor="filter-object">Obyekt bo'yicha filtr</Label>
        <Select
            value={filters.object || "all"}
            onValueChange={(value) => handleFilterChange("object", value)}
        >
            <SelectTrigger id="filter-object">
                <SelectValue placeholder="Barcha obyektlar" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Barcha obyektlar</SelectItem>
                {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
    {/* Expense Type Filter */}
    <div className="space-y-1">
        <Label htmlFor="filter-expense_type">Xarajat turi bo'yicha filtr</Label>
        <Select
            value={filters.expense_type || "all"}
            onValueChange={(value) => handleFilterChange("expense_type", value)}
        >
            <SelectTrigger id="filter-expense_type">
                <SelectValue placeholder="Barcha turlar" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Barcha turlar</SelectItem>
                {expenseTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                        {t.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
    {/* Date Range Filter */}
    <div className="space-y-1">
        <Label htmlFor="filter-dateRange">Sana bo'yicha filtr</Label>
        <Select
            value={filters.dateRange}
            onValueChange={(value) => handleFilterChange("dateRange", value)}
        >
            <SelectTrigger id="filter-dateRange">
                <SelectValue placeholder="Barcha sanalar" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Barcha sanalar</SelectItem>
                <SelectItem value="today">Bugun</SelectItem>
                <SelectItem value="week">Oxirgi hafta</SelectItem>
                <SelectItem value="month">Oxirgi oy</SelectItem>
                <SelectItem value="quarter">Oxirgi chorak</SelectItem>
                <SelectItem value="year">Oxirgi yil</SelectItem>
            </SelectContent>
        </Select>
    </div>
    {/* Search */}
    <div className="space-y-1">
        <Label htmlFor="search">Qidiruv</Label>
        <Input
            id="search"
            placeholder="Yetkazib beruvchi, izoh..."
            value={searchTerm}
            onChange={handleSearchChange}
        />
    </div>
</div>

{/* Totals Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Umumiy xarajatlar</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {loadingTotals ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
            ) : (
                <div className="text-2xl font-bold">{formatCurrency(filteredTotalAmount)}</div>
            )}
        </CardContent>
    </Card>
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">To'langan</CardTitle>
            <HandCoins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {loadingTotals ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
            ) : (
                <div className="text-2xl font-bold">
                    <Button
                        variant="link"
                        className="p-0 text-2xl font-bold text-foreground h-auto"
                        onClick={handleOpenPaidModal}
                    >
                        {formatCurrency(filteredPaidExpensesAmount)}
                    </Button>
                </div>
            )}
        </CardContent>
    </Card>
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kutilmoqda (Nasiya)</CardTitle>
            <HandCoins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {loadingTotals ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
            ) : (
                <div className="text-2xl font-bold">
                    <Button
                        variant="link"
                        className="p-0 text-2xl font-bold text-foreground h-auto"
                        onClick={handleOpenPendingModal}
                    >
                        {formatCurrency(filteredPendingAmount)} {/* Umumiy nasiya summasi */}
                    </Button>
                    <div className="text-sm text-muted-foreground mt-1">
                        {filters.object && filters.object !== "all" ? "Tanlangan obyektning" : "Barcha"} kutilayotgan to'lovlar
                    </div>
                </div>
            )}
        </CardContent>
    </Card>
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
                {filters.object && filters.object !== "all"
                    ? getObjectName(Number(filters.object))
                    : "Tanlangan obyekt"}
            </CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {loadingTotals ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
            ) : selectedObjectTotal !== null ? (
                <div className="text-2xl font-bold">{formatCurrency(selectedObjectTotal)}</div>
            ) : (
                <div className="text-sm text-muted-foreground">Obyekt tanlanmagan</div>
            )}
        </CardContent>
    </Card>
</div>

{/* Expenses Table */}
{renderExpensesTable(expenses)}

{/* Pagination */}
{totalPages > 1 && (
    <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
            Sahifa {currentPage} / {totalPages} ({expenses.length} ta yozuv)
        </div>
        <div className="flex items-center space-x-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isRefreshing}
            >
                <ChevronLeft className="h-4 w-4" />
                Oldingi
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isRefreshing}
            >
                Keyingi
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    </div>
)}

{/* Paid Expenses Modal */}
<Dialog open={paidModalOpen} onOpenChange={setPaidModalOpen}>
    <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
        <DialogHeader>
            <DialogTitle>To'langan xarajatlar</DialogTitle>
            <DialogDescription>
                Tanlangan filtrlar bo'yicha to'langan xarajatlar ro'yxati
            </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
            {modalLoading ? (
                <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Yuklanmoqda...</span>
                </div>
            ) : modalExpenses.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                    <p className="text-muted-foreground">To'langan xarajatlar topilmadi.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Sana</TableHead>
                            <TableHead>Yetkazib beruvchi</TableHead>
                            <TableHead>Tavsif</TableHead>
                            <TableHead className="text-right">Summa</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {modalExpenses.map((expense, index) => (
                            <TableRow key={expense.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{formatDate(expense.date)}</TableCell>
                                <TableCell>{expense.supplier_name}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={expense.comment}>
                                    {expense.comment}
                                </TableCell>
                                <TableCell className="text-right">
                                    {formatCurrency(expense.amount)}
                                </TableCell>
                            </TableRow>
                        ))}
                        <TableRow className="bg-muted font-bold">
                            <TableCell colSpan={4} className="text-right">
                                Jami:
                            </TableCell>
                            <TableCell className="text-right">
                                {formatCurrency(
                                    modalExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
                                )}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            )}
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => setPaidModalOpen(false)}>
                Yopish
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>

{/* Pending Expenses Modal */}
<Dialog open={pendingModalOpen} onOpenChange={setPendingModalOpen}>
    <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
        <DialogHeader>
            <DialogTitle>Nasiya (Kutilmoqda) xarajatlar</DialogTitle>
            <DialogDescription>
                Yetkazib beruvchilar bo'yicha jami nasiya qarzlar ro'yxati
            </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
            {modalLoading ? (
                <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Yuklanmoqda...</span>
                </div>
            ) : modalExpenses.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                    <p className="text-muted-foreground">Nasiya qarzlar topilmadi.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Yetkazib beruvchi</TableHead>
                            <TableHead>Tavsif</TableHead>
                            <TableHead className="text-right">Summa</TableHead>
                            <TableHead className="text-right">Jami qarz</TableHead>
                            <TableHead className="text-right">Amallar</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {modalExpenses.map((expense, index) => (
                            <TableRow key={expense.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{expense.supplier_name}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={expense.comment}>
                                    {expense.comment}
                                </TableCell>
                                <TableCell className="text-right">
                                    {formatCurrency(expense.amount)}
                                    {(expense.paid_amount || 0) > 0 && (
                                        <div className="text-sm text-muted-foreground">
                                            To'langan: {formatCurrency(expense.paid_amount || 0)}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {formatCurrency(expense.remaining_amount)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenPaymentDialog(expense)}
                                    >
                                        To'lov qo'shish
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        <TableRow className="bg-muted font-bold">
                            <TableCell colSpan={3} className="text-right">
                                Jami:
                            </TableCell>
                            <TableCell className="text-right">
                                {formatCurrency(
                                    modalExpenses.reduce(
                                        (sum, exp) => sum + Number(exp.amount || 0),
                                        0
                                    )
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                {formatCurrency(
                                    modalExpenses.reduce(
                                        (sum, exp) => sum + Number(exp.supplier_balance || 0),
                                        0
                                    )
                                )}
                            </TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            )}
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => setPendingModalOpen(false)}>
                Yopish
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>

{/* Payment Dialog */}
<Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
    <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>
                To'lov qo'shish: {currentPaymentSupplier?.company_name}
            </DialogTitle>
            <DialogDescription>
                Yetkazib beruvchi uchun to'lov ma'lumotlarini kiriting.
            </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="space-y-1">
                <Label htmlFor="payment-amount">To'lov summasi (USD) *</Label>
                <Input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Masalan: 500.00"
                    required
                />
            </div>
            <div className="space-y-1">
                <Label htmlFor="payment-description">Tavsif *</Label>
                <Textarea
                    id="payment-description"
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    rows={3}
                    placeholder="To'lov haqida qisqacha..."
                    required
                />
            </div>
        </div>
        <DialogFooter>
            <Button
                type="button"
                onClick={handleAddPayment}
                disabled={
                    isSubmittingPayment ||
                    !paymentAmount ||
                    Number(paymentAmount) <= 0 ||
                    !paymentDescription.trim()
                }
            >
                {isSubmittingPayment ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Saqlash
            </Button>
            <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
                disabled={isSubmittingPayment}
            >
                Bekor qilish
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>

{/* O'chirish modali */}
<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Xarajatni o'chirish</DialogTitle>
            <DialogDescription>
                Xarajatni o'chirish uchun kodni kiriting
            </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="deleteCode">Kod</Label>
                <Input
                    id="deleteCode"
                    type="password"
                    placeholder="Kodni kiriting"
                    value={deleteCode}
                    onChange={(e) => setDeleteCode(e.target.value)}
                />
            </div>
        </div>
        <DialogFooter>
            <Button
                variant="outline"
                onClick={() => {
                    setDeleteDialogOpen(false);
                    setDeleteCode("");
                    setExpenseToDelete(null);
                }}
            >
                Bekor qilish
            </Button>
            <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={!deleteCode}
            >
                O'chirish
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>
</main>
</div>
);
}