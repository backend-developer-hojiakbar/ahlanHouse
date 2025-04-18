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
import { useRouter } from "next/navigation";
import {
    Plus,
    DollarSign,
    Building,
    Edit,
    Trash2,
    Loader2,
    ChevronLeft,
    ChevronRight,
    HandCoins, // Added icon for payment
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
    DialogClose, // Import DialogClose
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
    // No need for supplier_balance here, we'll fetch it separately or from supplier data
}

interface ModalExpense {
    id: number;
    amount: string;
    date: string;
    supplier: number; // Added supplier ID
    supplier_name: string;
    comment: string;
    expense_type_name: string;
    object_name?: string;
    object: number;
    supplier_balance?: number; // Keep this for the modal display
}

interface Property {
    id: number;
    name: string;
}

interface Supplier {
    id: number;
    company_name: string;
    balance?: string; // Add balance from the API response
    // Add other fields if needed later
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
    // Removed status from initial form data, always set to "Kutilmoqda" on create/update
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
    const [suppliers, setSuppliers] = useState<Supplier[]>([]); // Will store suppliers with balance
    const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    // Loading states
    const [loading, setLoading] = useState(true);
    const [loadingTotals, setLoadingTotals] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSupplierSubmitting, setIsSupplierSubmitting] = useState(false);
    const [isExpenseTypeSubmitting, setIsExpenseTypeSubmitting] = useState(false);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false); // Payment submitting state

    // Totals & Filters
    const [filteredTotalAmount, setFilteredTotalAmount] = useState<number>(0);
    const [filteredPaidAmount, setFilteredPaidAmount] = useState<number>(0);
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
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Dialog states
    const [open, setOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [addExpenseTypeOpen, setAddExpenseTypeOpen] = useState(false);
    const [addSupplierOpen, setAddSupplierOpen] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false); // Payment dialog state

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
    // Payment Form State
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
    const getAuthHeaders = useCallback(() => {
        if (!accessToken) return {};
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
                        `${errorMsg} (Status: ${response.status}): ${errorData.detail || JSON.stringify(errorData)
                        }`
                    );
                }
                const data = await response.json();
                setter(data.results || data); // Store the full results which include balance for suppliers
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
        setLoading(true); // Indicate loading starts here
        await Promise.all([
            fetchApiData(
                "/objects/?page_size=1000",
                setProperties,
                "Obyektlarni yuklashda xatolik"
            ),
            // Fetch suppliers - this response should contain the 'balance' field now
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
        // setLoading(false); // Loading will be stopped in fetchExpensesAndFilteredTotals
    }, [accessToken, fetchApiData]);

    // --- Fetch Expenses and Calculate Totals ---
    // (Keep your existing fetchExpensesAndFilteredTotals function as it calculates overall totals correctly)
    const fetchExpensesAndFilteredTotals = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true); // Start table loading
        setLoadingTotals(true); // Start totals loading

        // --- Build Base Query Params from Filters ---
        const queryParams = new URLSearchParams();
        if (filters.object && filters.object !== "all")
            queryParams.append("object", filters.object);
        if (filters.expense_type && filters.expense_type !== "all")
            queryParams.append("expense_type", filters.expense_type);
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
                if (filters.dateRange === "today") {
                    queryParams.append("date__lte", today.toISOString().split("T")[0]);
                }
            }
        }
        if (debouncedSearchTerm) queryParams.append("search", debouncedSearchTerm);

        // --- Fetch Total Expenses ---
        let calculatedFilteredTotal = 0;
        let calculatedSelectedObjectTotal: number | null = null;
        const expenseTotalsQueryParams = new URLSearchParams(queryParams);
        expenseTotalsQueryParams.append("page_size", "10000"); // Fetch all for sum

        const fetchTotalExpensesPromise = fetch(
            `${API_BASE_URL}/expenses/?${expenseTotalsQueryParams.toString()}`,
            { method: "GET", headers: getAuthHeaders() }
        )
            .then(async (response) => {
                if (!response.ok) {
                    console.error(`Umumiy xarajatlar yuklanmadi (Status: ${response.status})`);
                    return { total: 0, objectTotal: null }; // Return default on error
                }
                const data = await response.json();
                const allFilteredExpenses = data.results || [];
                let total = 0;
                let objectTotal: number | null = null;
                allFilteredExpenses.forEach((expense: Expense) => {
                    const amount = Number(expense.amount || 0);
                    total += amount;
                    if (
                        filters.object && filters.object !== "all" &&
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
                return { total: 0, objectTotal: null }; // Return default on error
            });

        // --- Fetch Total Supplier Payments ---
        let calculatedFilteredPaid = 0;
        const paymentTotalsQueryParams = new URLSearchParams(queryParams);
        // Note: Supplier payments might not support all the same filters (e.g., object, expense_type).
        // Adjust this if the API differs significantly. We'll keep basic date filtering for now.
        if (queryParams.has("date__gte")) paymentTotalsQueryParams.set("date__gte", queryParams.get("date__gte")!);
        if (queryParams.has("date__lte")) paymentTotalsQueryParams.set("date__lte", queryParams.get("date__lte")!);
        // Add supplier filter if needed, though it complicates the 'overall paid' figure.
        paymentTotalsQueryParams.append("page_size", "10000"); // Fetch all for sum

        const fetchTotalPaymentsPromise = fetch(
            `${API_BASE_URL}/supplier-payments/?${paymentTotalsQueryParams.toString()}`,
            { method: "GET", headers: getAuthHeaders() }
        )
            .then(async (response) => {
                if (!response.ok) {
                    const errorText = await response.text();
                    console.warn(`To'langan summa yuklanmadi (Status: ${response.status}). API /supplier-payments/ uchun barcha filtrlarni qo'llab-quvvatlamasligi mumkin. Xato: ${errorText}`);
                    return 0; // Return 0 if payments can't be fetched/filtered correctly
                }
                const data = await response.json();
                const allFilteredPayments = data.results || [];
                return allFilteredPayments.reduce(
                    (sum: number, payment: { amount?: string | number }) => sum + Number(payment.amount || 0), 0
                );
            })
            .catch((error) => {
                console.error("To'lovlarni yuklashda xatolik:", error);
                toast.error("To'langan summani yuklashda xatolik yuz berdi.");
                return 0; // Return default on error
            });


        // --- Fetch Paginated Expenses for Table ---
        const tableQueryParams = new URLSearchParams(queryParams); // Use base filters
        tableQueryParams.set("page", currentPage.toString());
        tableQueryParams.set("page_size", itemsPerPage.toString());

        const fetchTableExpensesPromise = fetch(
            `${API_BASE_URL}/expenses/?${tableQueryParams.toString()}`,
            { method: "GET", headers: getAuthHeaders() }
        )
            .then(async (response) => {
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: `Serverdan javob o'qilmadi (Status: ${response.status})` }));
                    throw new Error(`Xarajatlar sahifasi yuklanmadi (Status: ${response.status}): ${errorData.detail || JSON.stringify(errorData)}`);
                }
                return response.json();
            })
            .catch((error) => {
                console.error("Paginated expenses yuklashda xatolik:", error);
                toast.error(error.message || "Xarajatlar jadvalini yuklashda xatolik");
                return { results: [], count: 0 }; // Return default on error
            });

        // --- Process results after all promises settle ---
        try {
            const [totalExpensesResult, totalPaymentsResult, tableData] = await Promise.all([
                fetchTotalExpensesPromise,
                fetchTotalPaymentsPromise,
                fetchTableExpensesPromise
            ]);

            calculatedFilteredTotal = totalExpensesResult.total;
            calculatedSelectedObjectTotal = totalExpensesResult.objectTotal;
            calculatedFilteredPaid = totalPaymentsResult; // Use the potentially simplified payment total

            // Calculate Nasiya based on *total expenses* minus *total payments*.
            // This assumes payments aren't tied directly to specific expenses in the totals calculation.
            // The more accurate Nasiya view is the Pending Modal based on supplier balances.
            setFilteredTotalAmount(calculatedFilteredTotal);
            setFilteredPaidAmount(calculatedFilteredPaid);
            // The main "Nasiya" card now reflects total expenses minus total payments within filters
            setFilteredPendingAmount(Math.max(0, calculatedFilteredTotal - calculatedFilteredPaid));
            setSelectedObjectTotal(calculatedSelectedObjectTotal);

            setExpenses(tableData.results || []);
            setTotalPages(Math.ceil((tableData.count || 0) / itemsPerPage));

        } catch (error) {
            console.error("Xarajatlar va jami summalarni yuklashda umumiy xatolik:", error);
            setFilteredTotalAmount(0);
            setFilteredPaidAmount(0);
            setFilteredPendingAmount(0);
            setSelectedObjectTotal(null);
            setExpenses([]);
            setTotalPages(1);
        } finally {
            setLoadingTotals(false); // Stop totals loading
            setLoading(false); // Stop table loading
        }
    }, [accessToken, filters, currentPage, debouncedSearchTerm, getAuthHeaders]);


    // Fetch Modal Expenses (Paid - remains mostly the same)
    const fetchPaidModalExpenses = useCallback(async () => {
        if (!accessToken) return;
        setModalLoading(true);
        setModalExpenses([]);
        try {
            const queryParams = new URLSearchParams();
            // Assuming "Paid" expenses don't exist as a status, we might need to fetch payments instead
            // Or rely on the supplier balance being <= 0. For now, let's fetch payments related to filters.
            // This needs clarification based on how "Paid" is determined.
            // Let's fetch supplier payments matching filters for this modal.
            queryParams.append("page_size", "1000");
             if (filters.object && filters.object !== "all") {
                 // Note: Supplier Payments API might not support 'object' filter
                 console.warn("To'langan xarajatlar modalida 'object' filtr qo'llab-quvvatlanmasligi mumkin");
             }
             if (filters.expense_type && filters.expense_type !== "all") {
                  console.warn("To'langan xarajatlar modalida 'expense_type' filtr qo'llab-quvvatlanmasligi mumkin");
             }
            if (filters.dateRange && filters.dateRange !== "all") {
                // Add date filtering similar to fetchExpensesAndFilteredTotals
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
                     if (filters.dateRange === "today") {
                         queryParams.append("date__lte", today.toISOString().split("T")[0]);
                     }
                 }
            }
             if (debouncedSearchTerm) {
                 // Note: Supplier Payments API might not support 'search' filter on expense comments
                 console.warn("To'langan xarajatlar modalida 'search' filtr qo'llab-quvvatlanmasligi mumkin");
             }

            const response = await fetch(
                `${API_BASE_URL}/supplier-payments/?${queryParams.toString()}`,
                {
                    method: "GET",
                    headers: getAuthHeaders(),
                }
            );
            if (!response.ok) {
                throw new Error(`To'langanlar ro'yxatini yuklashda xatolik (${response.status})`);
            }
            const data = await response.json();
             // Adapt the payment data structure to fit ModalExpense roughly
             const adaptedPayments = (data.results || []).map((payment: any) => ({
                 id: payment.id, // Use payment ID
                 amount: payment.amount,
                 date: payment.date, // Use payment date
                 supplier: payment.supplier,
                 supplier_name: suppliers.find(s => s.id === payment.supplier)?.company_name || `Yetk. ID: ${payment.supplier}`,
                 comment: payment.description || "-", // Use payment description
                 expense_type_name: "To'lov", // Indicate it's a payment
                 object: 0, // Payment is not tied to object here
                 object_name: "-",
                 supplier_balance: 0, // Balance not relevant here
             }));
            setModalExpenses(adaptedPayments);
        } catch (error: any) {
            toast.error(error.message);
            setModalExpenses([]);
        } finally {
            setModalLoading(false);
        }
    }, [accessToken, filters, debouncedSearchTerm, getAuthHeaders, suppliers]); // Added suppliers dependency


    // Fetch Modal Expenses (Pending - **MODIFIED**)
    const fetchPendingModalExpenses = useCallback(async () => {
        if (!accessToken || !suppliers.length) return; // Need suppliers with balances loaded
        setModalLoading(true);
        setModalExpenses([]);
        try {
            // 1. Fetch all pending expenses (regardless of filters first, easier to map balance)
            // We could add filters later if performance becomes an issue, but requires more complex balance joining
            const queryParams = new URLSearchParams();
            queryParams.append("status", "Kutilmoqda");
            queryParams.append("page_size", "10000"); // Get all pending

             // Apply filters *after* getting balances if needed, or filter the initial expense fetch
             if (filters.object && filters.object !== "all") queryParams.append("object", filters.object);
             if (filters.expense_type && filters.expense_type !== "all") queryParams.append("expense_type", filters.expense_type);
             if (filters.dateRange && filters.dateRange !== "all") {
                 // Add date filtering
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


            const response = await fetch(
                `${API_BASE_URL}/expenses/?${queryParams.toString()}`,
                {
                    method: "GET",
                    headers: getAuthHeaders(),
                }
            );
            if (!response.ok) {
                throw new Error(`Nasiya xarajatlar yuklanmadi (${response.status})`);
            }
            const data = await response.json();
            const pendingExpenses = data.results || [];

            // 2. Map supplier balances and filter out zero-balance suppliers
            const expensesWithBalance = pendingExpenses
                .map((expense: Expense) => {
                    const supplierInfo = suppliers.find(s => s.id === expense.supplier);
                    const balance = supplierInfo ? Number(supplierInfo.balance || 0) : 0;
                    return {
                        ...expense,
                        supplier_balance: balance,
                    };
                })
                .filter((expense: ModalExpense) => expense.supplier_balance && expense.supplier_balance > 0); // Filter out zero balance

            // 3. Group by supplier to show total balance per supplier easily
            const groupedBySupplier: Record<number, { supplier: Supplier; totalBalance: number; expenses: ModalExpense[] }> = {};
            expensesWithBalance.forEach(exp => {
                const supplierInfo = suppliers.find(s => s.id === exp.supplier);
                if (supplierInfo) {
                    if (!groupedBySupplier[exp.supplier]) {
                        groupedBySupplier[exp.supplier] = {
                            supplier: supplierInfo,
                            totalBalance: Number(supplierInfo.balance || 0), // Use the fetched balance
                            expenses: []
                        };
                    }
                    // We don't strictly need to list individual expenses here if we just show the balance per supplier
                    // groupedBySupplier[exp.supplier].expenses.push(exp);
                }
            });

             // Convert grouped data into a list suitable for the modal
             const modalData = Object.values(groupedBySupplier).map(group => ({
                 // Create a representative "expense" row for the supplier's total balance
                 id: group.supplier.id, // Use supplier ID as key
                 amount: group.totalBalance.toFixed(2), // Show total balance here
                 date: "", // Date not applicable for the summary row
                 supplier: group.supplier.id,
                 supplier_name: group.supplier.company_name,
                 comment: `Jami ${group.expenses.length} ta nasiya xarajat`, // Maybe add count
                 expense_type_name: "-",
                 object: 0, // Not applicable
                 object_name: "-",
                 supplier_balance: group.totalBalance,
             }));


            setModalExpenses(modalData); // Set the final filtered & enriched list
        } catch (error: any) {
            console.error("Nasiya xarajatlarni yuklashda xatolik:", error);
            toast.error(error.message || "Nasiya xarajatlarni yuklashda xatolik yuz berdi");
            setModalExpenses([]);
        } finally {
            setModalLoading(false);
        }
    }, [accessToken, getAuthHeaders, suppliers, filters, debouncedSearchTerm]); // Added suppliers, filters, searchterm dependency

    useEffect(() => {
        if (accessToken) {
            fetchInitialData().then(() => {
                // Fetch expenses only after initial data (like suppliers) is loaded
                fetchExpensesAndFilteredTotals();
            });
        }
    }, [accessToken, fetchInitialData]); // fetchExpensesAndFilteredTotals removed from here, called inside .then()

    useEffect(() => {
        // Re-fetch expenses whenever filters, page, or search term change
        if (accessToken && suppliers.length > 0) { // Ensure suppliers are loaded before fetching
            fetchExpensesAndFilteredTotals();
        }
    }, [
        accessToken,
        filters,
        currentPage,
        debouncedSearchTerm,
        suppliers.length, // Re-run if supplier list changes (e.g., after adding one)
        // fetchExpensesAndFilteredTotals // Removed to avoid potential loops if it modifies its own dependencies indirectly
    ]);


    // --- CRUD Operations ---

    // Create Expense (Set status to Kutilmoqda)
    const createExpense = async (
        expenseData: any,
        action: "save" | "saveAndAdd" | "saveAndContinue" // Action not really used here anymore
    ) => {
        if (!accessToken) {
            toast.error("Avtorizatsiya tokeni topilmadi"); return;
        }
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/expenses/`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    ...expenseData,
                    status: "Kutilmoqda", // Always pending on creation
                }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 403) throw new Error("Ruxsat yo'q (Faqat admin qo'shishi mumkin).");
                const errorMessages = Object.entries(errorData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("; ");
                throw new Error(`Xatolik (${response.status}): ${errorMessages || "Server xatosi"}`);
            }
            toast.success("Xarajat muvaffaqiyatli qo'shildi");
            await fetchExpensesAndFilteredTotals(); // Refresh main table/totals
            await fetchInitialData(); // Refresh supplier list in case balance changed (though less likely on expense add)
            setOpen(false);
            setFormData(initialFormData);
        } catch (error: any) { toast.error(error.message); }
        finally { setIsSubmitting(false); }
    };

    // Fetch Expense By ID (Remains the same)
    const fetchExpenseById = async (id: number) => {
        if (!accessToken) return;
        setEditOpen(true);
        setCurrentExpense(null);
        setFormData(initialFormData);
        try {
            const response = await fetch(`${API_BASE_URL}/expenses/${id}/`, {
                method: "GET",
                headers: getAuthHeaders(),
            });
            if (!response.ok) throw new Error(`Xarajat (ID: ${id}) olinmadi`);
            const data: Expense = await response.json();
            setCurrentExpense(data);
            let formattedDate = data.date;
            if (data.date) { try { formattedDate = format(new Date(data.date), "yyyy-MM-dd"); } catch { console.warn("Could not format date:", data.date); } }
            setFormData({
                object: data.object?.toString() || "",
                supplier: data.supplier?.toString() || "",
                amount: data.amount || "0",
                expense_type: data.expense_type?.toString() || "",
                date: formattedDate,
                comment: data.comment || "",
            });
        } catch (error: any) { toast.error(error.message); setEditOpen(false); }
    };

    // Update Expense (Set status to Kutilmoqda)
    const updateExpense = async (
        id: number,
        expenseData: any,
        action: "save" | "saveAndAdd" | "saveAndContinue"
    ) => {
        if (!accessToken) { toast.error("Avtorizatsiya tokeni topilmadi"); return; }
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/expenses/${id}/`, {
                method: "PUT", // Use PUT for update
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    ...expenseData,
                    status: "Kutilmoqda", // Keep status as Kutilmoqda on update
                }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 403) throw new Error("Ruxsat yo'q (Faqat admin yangilashi mumkin).");
                const errorMessages = Object.entries(errorData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("; ");
                throw new Error(`Xatolik (${response.status}): ${errorMessages || "Server xatosi"}`);
            }
            toast.success("Xarajat muvaffaqiyatli yangilandi");
            await fetchExpensesAndFilteredTotals(); // Refresh main table/totals
            await fetchInitialData(); // Refresh supplier list as balance might change

            // Handle dialog closing based on action
             if (action === "save") {
                 setEditOpen(false);
                 setCurrentExpense(null);
                 setFormData(initialFormData);
             } else if (action === "saveAndAdd") {
                 setEditOpen(false);
                 setCurrentExpense(null);
                 setFormData(initialFormData);
                 setOpen(true); // Open the add dialog
             }
             // 'saveAndContinue' keeps the edit dialog open, no state change needed here
        } catch (error: any) { toast.error(error.message); }
        finally { setIsSubmitting(false); }
    };


    // Delete Expense (Remains the same)
    const deleteExpense = async (id: number) => {
        if (!accessToken || !window.confirm(`${id}-ID'li xarajatni o'chirishni tasdiqlaysizmi?`)) return;
        try {
            const response = await fetch(`${API_BASE_URL}/expenses/${id}/`, { method: "DELETE", headers: getAuthHeaders() });
            if (response.status === 204 || response.ok) {
                toast.success("Xarajat muvaffaqiyatli o'chirildi");
                await fetchExpensesAndFilteredTotals(); // Refresh main table
                await fetchInitialData(); // Refresh supplier list as balance might change
            } else {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 403) throw new Error("Ruxsat yo'q (Faqat admin o'chirishi mumkin).");
                throw new Error(`Xatolik (${response.status}): ${errorData.detail || "Server xatosi"}`);
            }
        } catch (error: any) { toast.error(error.message); }
    };

    // Create Expense Type (Remains the same)
    const createExpenseType = async () => {
        if (!accessToken || !newExpenseTypeName.trim()) { toast.error("Xarajat turi nomi kiritilishi shart"); return; }
        setIsExpenseTypeSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/expense-types/`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ name: newExpenseTypeName.trim() }), });
            if (!response.ok) throw new Error("Xarajat turi qo'shilmadi");
            const newType: ExpenseType = await response.json();
            setExpenseTypes((prev) => [...prev, newType].sort((a, b) => a.name.localeCompare(b.name)));
            setFormData((prev) => ({ ...prev, expense_type: newType.id.toString() })); // Auto-select new type
            setNewExpenseTypeName("");
            setAddExpenseTypeOpen(false);
            toast.success(`"${newType.name}" xarajat turi qo'shildi`);
        } catch (error: any) { toast.error(error.message); }
        finally { setIsExpenseTypeSubmitting(false); }
    };

    // Create Supplier (Remains the same)
    const createSupplier = async () => {
        if (!accessToken || !newSupplierData.company_name.trim()) { toast.error("Kompaniya nomi kiritilishi shart"); return; }
        setIsSupplierSubmitting(true);
        try {
            const supplierData = {
                company_name: newSupplierData.company_name.trim(),
                contact_person_name: newSupplierData.contact_person_name.trim() || null,
                phone_number: newSupplierData.phone_number.trim() || null,
                address: newSupplierData.address.trim() || null,
                description: newSupplierData.description.trim() || null,
            };
            const response = await fetch(`${API_BASE_URL}/suppliers/`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(supplierData), });
            if (!response.ok) throw new Error("Yetkazib beruvchi qo'shilmadi");
            const newSupplier: Supplier = await response.json();
            // No need to manually add balance here, fetchInitialData will get it
            await fetchInitialData(); // Re-fetch all suppliers to get the new one with its balance
            setFormData((prev) => ({ ...prev, supplier: newSupplier.id.toString() })); // Auto-select new supplier
            setNewSupplierData(initialNewSupplierData);
            setAddSupplierOpen(false);
            toast.success(`"${newSupplier.company_name}" yetkazib beruvchi qo'shildi`);
        } catch (error: any) { toast.error(error.message); }
        finally { setIsSupplierSubmitting(false); }
    };

     // --- Add Payment ---
     const handleAddPayment = async () => {
         if (!accessToken || !currentPaymentSupplier || !paymentAmount || Number(paymentAmount) <= 0 || !paymentDescription.trim()) {
             toast.error("Iltimos summa va tavsifni to'g'ri kiriting.");
             return;
         }
         setIsSubmittingPayment(true);
         try {
             const paymentData = {
                 supplier: currentPaymentSupplier.id,
                 amount: paymentAmount,
                 payment_type: "naqd", // Hardcoded as requested
                 description: paymentDescription.trim(),
             };

             const response = await fetch(`${API_BASE_URL}/supplier-payments/`, {
                 method: "POST",
                 headers: getAuthHeaders(),
                 body: JSON.stringify(paymentData),
             });

             if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 const errorMessages = Object.entries(errorData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("; ");
                 throw new Error(`To'lov qo'shishda xatolik (${response.status}): ${errorMessages || "Server xatosi"}`);
             }

             toast.success("To'lov muvaffaqiyatli qo'shildi!");
             setPaymentDialogOpen(false); // Close payment dialog
             setPaymentAmount("");
             setPaymentDescription("");
             setCurrentPaymentSupplier(null);

             // Refresh data
             await fetchInitialData(); // Crucial to get updated balances
             await fetchExpensesAndFilteredTotals(); // Update summary cards
              // Optionally re-fetch pending modal data if it's still open or likely to be reopened
              // await fetchPendingModalExpenses(); // Uncomment if needed

         } catch (error: any) {
             console.error("Payment submission error:", error);
             toast.error(error.message);
         } finally {
             setIsSubmittingPayment(false);
         }
     };

    // --- Event Handlers ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value })); };
    const handleSupplierChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setNewSupplierData((prev) => ({ ...prev, [e.target.name]: e.target.value })); };
    const handleSelectChange = (name: string, value: string) => { setFormData((prev) => ({ ...prev, [name]: value })); };
    const handleFilterChange = (name: string, value: string) => { setFilters((prev) => ({ ...prev, [name]: value === "all" ? "" : value })); setCurrentPage(1); };
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setCurrentPage(1); };
    const handleOpenEditDialog = (expenseId: number) => { fetchExpenseById(expenseId); };
    const handlePageChange = (page: number) => { if (page >= 1 && page <= totalPages) { setCurrentPage(page); } };
    const handleOpenPaidModal = () => { setPaidModalOpen(true); fetchPaidModalExpenses(); }; // Use specific fetcher
    const handleOpenPendingModal = () => { setPendingModalOpen(true); fetchPendingModalExpenses(); }; // Use specific fetcher

     // Open Payment Dialog Handler
     const handleOpenPaymentDialog = (supplier: Supplier) => {
         setCurrentPaymentSupplier(supplier);
         setPaymentAmount(""); // Reset form
         setPaymentDescription("");
         setPendingModalOpen(false); // Close the pending list modal
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
        const amountNum = Number(formData.amount);
        if (formData.amount === "" || isNaN(amountNum) || amountNum <= 0) errors.push(`"Summa" musbat raqam bo'lishi kerak.`);
        if (errors.length > 0) { toast.error(errors.join("\n")); return false; }
        return true;
    };

    // --- Submit Handlers ---
    const handleSubmit = (e: React.FormEvent, action: "save" | "saveAndAdd" | "saveAndContinue") => {
        e.preventDefault();
        if (!validateFormData()) return;
        const expenseData = {
            object: Number(formData.object), supplier: Number(formData.supplier), amount: formData.amount,
            expense_type: Number(formData.expense_type), date: formData.date, comment: formData.comment.trim(),
        };
        createExpense(expenseData, action);
    };
    const handleEditSubmit = async (e: React.FormEvent, action: "save" | "saveAndAdd" | "saveAndContinue") => {
        e.preventDefault();
        if (!currentExpense || !validateFormData()) return;
        const expenseData = {
            object: Number(formData.object), supplier: Number(formData.supplier), amount: formData.amount,
            expense_type: Number(formData.expense_type), date: formData.date, comment: formData.comment.trim(),
        };
        updateExpense(currentExpense.id, expenseData, action);
    };

    // --- Helper Functions ---
    const getExpenseTypeStyle = (typeName: string | undefined): string => {
        if (!typeName) return "bg-gray-100 text-gray-800";
        const lower = typeName.toLowerCase();
        if (lower.includes("qurilish") || lower.includes("material")) return "bg-blue-100 text-blue-800";
        if (lower.includes("ishchi") || lower.includes("usta")) return "bg-green-100 text-green-800";
        if (lower.includes("kommunal") || lower.includes("gaz") || lower.includes("svet")) return "bg-yellow-100 text-yellow-800";
        if (lower.includes("transport") || lower.includes("yo'l")) return "bg-purple-100 text-purple-800";
        if (lower.includes("ofis") || lower.includes("kantselyariya")) return "bg-pink-100 text-pink-800";
        if (lower.includes("to'lov")) return "bg-teal-100 text-teal-800"; // Style for payments in paid modal
        return "bg-secondary text-secondary-foreground";
    };
    const formatCurrency = useCallback((amount: number | string | undefined | null) => {
        const numericAmount = Number(amount || 0);
        if (!isClient) return `${numericAmount.toFixed(2)} USD`;
        try { return numericAmount.toLocaleString("en-US", { style: "currency", currency: "USD", }); }
        catch (e) { return `${numericAmount.toFixed(2)} USD`; }
    }, [isClient]);
    const formatDate = useCallback((dateString: string | undefined | null) => {
        if (!dateString) return "-";
        if (!isClient) return dateString;
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString; // Handle invalid date strings
            return format(date, "dd/MM/yyyy");
        } catch (e) { console.warn("Date formatting error:", e); return dateString; }
    }, [isClient]);
    const getObjectName = useCallback((objectId: number | undefined) => {
        if (objectId === undefined || objectId === 0) return "-"; // Handle 0 or undefined object ID
        return properties.find((p) => p.id === objectId)?.name || `Obyekt ID: ${objectId}`;
    }, [properties]);

    // --- Table Rendering Function ---
    function renderExpensesTable(expensesToRender: Expense[]) {
        const isLoading = loading;
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
                            <TableHead className="w-[60px]">#</TableHead>
                            <TableHead className="w-[120px]">Sana</TableHead>
                            <TableHead>Obyekt</TableHead>
                            <TableHead>Yetkazib beruvchi</TableHead>
                            <TableHead>Tavsif</TableHead>
                            <TableHead>Turi</TableHead>
                            <TableHead className="text-right w-[150px]">Summa</TableHead>
                            <TableHead className="text-right w-[100px]">Amallar</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expensesToRender.map((expense, index) => {
                            // Find supplier balance from the main suppliers list for display
                            const supplierInfo = suppliers.find(s => s.id === expense.supplier);
                            const supplierBalance = supplierInfo ? Number(supplierInfo.balance || 0) : undefined;
                            const isPending = supplierBalance !== undefined && supplierBalance > 0; // Determine if effectively pending

                            return (
                                <TableRow key={expense.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                                    <TableCell>{formatDate(expense.date)}</TableCell>
                                    <TableCell>{getObjectName(expense.object)}</TableCell>
                                    <TableCell>
                                        {expense.supplier_name || `Yetk. ID: ${expense.supplier}`}
                                        {/* Show balance only if it's positive */}
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
                                        <Badge variant="outline" className={`whitespace-nowrap ${getExpenseTypeStyle(expense.expense_type_name)}`}>
                                            {expense.expense_type_name || `ID: ${expense.expense_type}`}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                        {/* Display amount clearly */}
                                        {formatCurrency(expense.amount)}
                                         {/* Indicate pending status visually if balance > 0 */}
                                        
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(expense.id)} title="Tahrirlash">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => deleteExpense(expense.id)} title="O'chirish">
                                                <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        <TableRow className="bg-muted hover:bg-muted font-bold sticky bottom-0">
                            <TableCell colSpan={6} className="text-right">Jami (Sahifada):</TableCell>
                            <TableCell className="text-right">{formatCurrency(expensesToRender.reduce((sum, exp) => sum + Number(exp.amount || 0), 0))}</TableCell>
                            <TableCell></TableCell> {/* Adjusted colspan */}
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
                    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (isOpen) setFormData(initialFormData); }}>
                        <DialogTrigger asChild>
                            <Button size="sm" disabled={!accessToken}>
                                <Plus className="mr-2 h-4 w-4" /> Yangi xarajat
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                            {/* Add New Expense Form (No Status field needed) */}
                            <DialogHeader>
                                <DialogTitle>Yangi xarajat qo'shish</DialogTitle>
                                <DialogDescription>
                                    Xarajat ma'lumotlarini kiriting (* majburiy). Xarajat avtomatik "Nasiya" statusida saqlanadi.
                                </DialogDescription>
                            </DialogHeader>
                            <form id="add-expense-form" onSubmit={(e) => handleSubmit(e, "save")} className="flex-1 overflow-y-auto pr-4 pl-1 -mr-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 py-4">
                                    {/* Amount */}
                                    <div className="space-y-1">
                                        <Label htmlFor="amount">Summa (USD) *</Label>
                                        <Input required id="amount" name="amount" type="number" step="0.01" min="0.01" value={formData.amount} onChange={handleChange} placeholder="Masalan: 1500.50" />
                                    </div>
                                    {/* Date */}
                                    <div className="space-y-1">
                                        <Label htmlFor="date">Xarajat sanasi *</Label>
                                        <Input required id="date" name="date" type="date" value={formData.date} onChange={handleChange} max={new Date().toISOString().split("T")[0]} />
                                    </div>
                                     {/* Supplier */}
                                     <div className="space-y-1">
                                         <Label htmlFor="supplier">Yetkazib beruvchi *</Label>
                                         <div className="flex items-center space-x-2">
                                             <Select required value={formData.supplier} onValueChange={(value) => handleSelectChange("supplier", value)} name="supplier">
                                                 <SelectTrigger id="supplier" className="flex-1"><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                                                 <SelectContent>
                                                     {suppliers.map((s) => (<SelectItem key={s.id} value={s.id.toString()}>{s.company_name}</SelectItem>))}
                                                 </SelectContent>
                                             </Select>
                                             {/* Add New Supplier Dialog Trigger */}
                                             <Dialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen}>
                                                 <DialogTrigger asChild>
                                                     <Button type="button" variant="outline" size="icon" title="Yangi yetkazib beruvchi qo'shish"><Plus className="h-4 w-4" /></Button>
                                                 </DialogTrigger>
                                                 <DialogContent className="sm:max-w-[425px]">
                                                    {/* Add Supplier Form */}
                                                    <DialogHeader><DialogTitle>Yangi yetkazib beruvchi</DialogTitle></DialogHeader>
                                                    <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto pr-2">
                                                        <Label htmlFor="new_company_name">Kompaniya nomi *</Label>
                                                        <Input id="new_company_name" name="company_name" value={newSupplierData.company_name} onChange={handleSupplierChange} required />
                                                        <Label htmlFor="new_contact_person_name">Kontakt</Label>
                                                        <Input id="new_contact_person_name" name="contact_person_name" value={newSupplierData.contact_person_name} onChange={handleSupplierChange} />
                                                        <Label htmlFor="new_phone_number">Telefon</Label>
                                                        <Input id="new_phone_number" name="phone_number" value={newSupplierData.phone_number} onChange={handleSupplierChange} />
                                                        <Label htmlFor="new_address">Manzil</Label>
                                                        <Textarea id="new_address" name="address" value={newSupplierData.address} onChange={handleSupplierChange} rows={2} />
                                                        <Label htmlFor="new_description">Tavsif</Label>
                                                        <Textarea id="new_description" name="description" value={newSupplierData.description} onChange={handleSupplierChange} rows={2} />
                                                    </div>
                                                    <DialogFooter>
                                                        <Button type="button" onClick={createSupplier} disabled={!newSupplierData.company_name.trim() || isSupplierSubmitting}>
                                                            {isSupplierSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Qo'shish
                                                        </Button>
                                                        <Button type="button" variant="outline" onClick={() => { setAddSupplierOpen(false); setNewSupplierData(initialNewSupplierData); }} disabled={isSupplierSubmitting}>Bekor qilish</Button>
                                                    </DialogFooter>
                                                 </DialogContent>
                                             </Dialog>
                                         </div>
                                     </div>
                                     {/* Expense Type */}
                                     <div className="space-y-1">
                                         <Label htmlFor="expense_type">Xarajat turi *</Label>
                                         <div className="flex items-center space-x-2">
                                             <Select required value={formData.expense_type} onValueChange={(value) => handleSelectChange("expense_type", value)} name="expense_type">
                                                 <SelectTrigger id="expense_type" className="flex-1"><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                                                 <SelectContent>
                                                     {expenseTypes.map((t) => (<SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>))}
                                                 </SelectContent>
                                             </Select>
                                              {/* Add New Expense Type Dialog Trigger */}
                                              <Dialog open={addExpenseTypeOpen} onOpenChange={setAddExpenseTypeOpen}>
                                                 <DialogTrigger asChild>
                                                     <Button type="button" variant="outline" size="icon" title="Yangi xarajat turi qo'shish"><Plus className="h-4 w-4" /></Button>
                                                 </DialogTrigger>
                                                  <DialogContent className="sm:max-w-[425px]">
                                                    <DialogHeader><DialogTitle>Yangi xarajat turi</DialogTitle></DialogHeader>
                                                    <div className="grid gap-4 py-4">
                                                        <Label htmlFor="new_expense_type_name">Nomi *</Label>
                                                        <Input id="new_expense_type_name" value={newExpenseTypeName} onChange={(e) => setNewExpenseTypeName(e.target.value)} required />
                                                    </div>
                                                    <DialogFooter>
                                                        <Button type="button" onClick={createExpenseType} disabled={!newExpenseTypeName.trim() || isExpenseTypeSubmitting}>
                                                             {isExpenseTypeSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Qo'shish
                                                        </Button>
                                                        <Button type="button" variant="outline" onClick={() => { setAddExpenseTypeOpen(false); setNewExpenseTypeName(""); }} disabled={isExpenseTypeSubmitting}>Bekor qilish</Button>
                                                    </DialogFooter>
                                                  </DialogContent>
                                              </Dialog>
                                         </div>
                                     </div>
                                     {/* Object */}
                                     <div className="space-y-1">
                                         <Label htmlFor="object">Obyekt *</Label>
                                         <Select required value={formData.object} onValueChange={(value) => handleSelectChange("object", value)} name="object">
                                             <SelectTrigger id="object"><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                                             <SelectContent>
                                                 {properties.map((p) => (<SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>))}
                                             </SelectContent>
                                         </Select>
                                     </div>
                                     {/* Comment */}
                                     <div className="space-y-1 sm:col-span-2">
                                         <Label htmlFor="comment">Tavsif / Izoh *</Label>
                                         <Textarea required id="comment" name="comment" value={formData.comment} onChange={handleChange} rows={3} placeholder="Xarajat haqida batafsil..." />
                                     </div>
                                </div>
                            </form>
                            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 space-y-2 sm:space-y-0 pt-4 border-t">
                                <Button type="submit" form="add-expense-form" className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                                    disabled={isSubmitting || !formData.object || !formData.supplier || !formData.expense_type || !formData.date || !formData.comment.trim() || !formData.amount || Number(formData.amount) <= 0}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Saqlash
                                </Button>
                                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)} disabled={isSubmitting}>Bekor qilish</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* --- Edit Dialog --- */}
                <Dialog open={editOpen} onOpenChange={(isOpen) => { if (!isOpen) { setCurrentExpense(null); setFormData(initialFormData); } setEditOpen(isOpen); }}>
                     <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                        {/* Edit Expense Form (No Status field needed) */}
                         <DialogHeader>
                             <DialogTitle>Xarajatni tahrirlash (ID: {currentExpense?.id})</DialogTitle>
                             <DialogDescription>
                                 Xarajat ma'lumotlarini yangilang (* majburiy). Status o'zgarmaydi.
                             </DialogDescription>
                         </DialogHeader>
                         <form id="edit-expense-form" onSubmit={(e) => handleEditSubmit(e, "save")} className="flex-1 overflow-y-auto pr-4 pl-1 -mr-2">
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
                                        <Input required id="edit-amount" name="amount" type="number" step="0.01" min="0.01" value={formData.amount} onChange={handleChange} placeholder="Masalan: 1500.50" />
                                    </div>
                                     {/* Date */}
                                    <div className="space-y-1">
                                        <Label htmlFor="edit-date">Xarajat sanasi *</Label>
                                        <Input required id="edit-date" name="date" type="date" value={formData.date} onChange={handleChange} max={new Date().toISOString().split("T")[0]} />
                                    </div>
                                      {/* Supplier */}
                                      <div className="space-y-1">
                                          <Label htmlFor="edit-supplier">Yetkazib beruvchi *</Label>
                                          <div className="flex items-center space-x-2">
                                              <Select required value={formData.supplier} onValueChange={(value) => handleSelectChange("supplier", value)} name="supplier">
                                                  <SelectTrigger id="edit-supplier" className="flex-1"><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                                                  <SelectContent>
                                                      {suppliers.map((s) => (<SelectItem key={s.id} value={s.id.toString()}>{s.company_name}</SelectItem>))}
                                                  </SelectContent>
                                              </Select>
                                              {/* Add Supplier Dialog (same as in Add form) */}
                                                <Dialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen}>
                                                    <DialogTrigger asChild><Button type="button" variant="outline" size="icon" title="Yangi yetkazib beruvchi qo'shish"><Plus className="h-4 w-4" /></Button></DialogTrigger>
                                                    <DialogContent className="sm:max-w-[425px]">
                                                        {/* ... Add Supplier Form Content ... */}
                                                        <DialogHeader><DialogTitle>Yangi yetkazib beruvchi</DialogTitle></DialogHeader>
                                                        <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto pr-2">
                                                        <Label htmlFor="edit_new_company_name">Kompaniya nomi *</Label><Input id="edit_new_company_name" name="company_name" value={newSupplierData.company_name} onChange={handleSupplierChange} required />
                                                        <Label htmlFor="edit_new_contact_person_name">Kontakt</Label><Input id="edit_new_contact_person_name" name="contact_person_name" value={newSupplierData.contact_person_name} onChange={handleSupplierChange} />
                                                        <Label htmlFor="edit_new_phone_number">Telefon</Label><Input id="edit_new_phone_number" name="phone_number" value={newSupplierData.phone_number} onChange={handleSupplierChange} />
                                                        <Label htmlFor="edit_new_address">Manzil</Label><Textarea id="edit_new_address" name="address" value={newSupplierData.address} onChange={handleSupplierChange} rows={2} />
                                                        <Label htmlFor="edit_new_description">Tavsif</Label><Textarea id="edit_new_description" name="description" value={newSupplierData.description} onChange={handleSupplierChange} rows={2} />
                                                        </div>
                                                        <DialogFooter>
                                                        <Button type="button" onClick={createSupplier} disabled={!newSupplierData.company_name.trim() || isSupplierSubmitting}>{isSupplierSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Qo'shish</Button>
                                                        <Button type="button" variant="outline" onClick={() => { setAddSupplierOpen(false); setNewSupplierData(initialNewSupplierData); }} disabled={isSupplierSubmitting}>Bekor qilish</Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                          </div>
                                      </div>
                                     {/* Expense Type */}
                                     <div className="space-y-1">
                                         <Label htmlFor="edit-expense_type">Xarajat turi *</Label>
                                         <div className="flex items-center space-x-2">
                                             <Select required value={formData.expense_type} onValueChange={(value) => handleSelectChange("expense_type", value)} name="expense_type">
                                                 <SelectTrigger id="edit-expense_type" className="flex-1"><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                                                 <SelectContent>
                                                     {expenseTypes.map((t) => (<SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>))}
                                                 </SelectContent>
                                             </Select>
                                              {/* Add Expense Type Dialog (same as in Add form) */}
                                                <Dialog open={addExpenseTypeOpen} onOpenChange={setAddExpenseTypeOpen}>
                                                    <DialogTrigger asChild><Button type="button" variant="outline" size="icon" title="Yangi xarajat turi qo'shish"><Plus className="h-4 w-4" /></Button></DialogTrigger>
                                                    <DialogContent className="sm:max-w-[425px]">
                                                        {/* ... Add Expense Type Form Content ... */}
                                                        <DialogHeader><DialogTitle>Yangi xarajat turi</DialogTitle></DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                        <Label htmlFor="edit_new_expense_type_name">Nomi *</Label><Input id="edit_new_expense_type_name" value={newExpenseTypeName} onChange={(e) => setNewExpenseTypeName(e.target.value)} required />
                                                        </div>
                                                        <DialogFooter>
                                                        <Button type="button" onClick={createExpenseType} disabled={!newExpenseTypeName.trim() || isExpenseTypeSubmitting}>{isExpenseTypeSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Qo'shish</Button>
                                                        <Button type="button" variant="outline" onClick={() => { setAddExpenseTypeOpen(false); setNewExpenseTypeName(""); }} disabled={isExpenseTypeSubmitting}>Bekor qilish</Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                         </div>
                                     </div>
                                      {/* Object */}
                                      <div className="space-y-1">
                                          <Label htmlFor="edit-object">Obyekt *</Label>
                                          <Select required value={formData.object} onValueChange={(value) => handleSelectChange("object", value)} name="object">
                                              <SelectTrigger id="edit-object"><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                                              <SelectContent>
                                                  {properties.map((p) => (<SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>))}
                                              </SelectContent>
                                          </Select>
                                      </div>
                                     {/* Comment */}
                                     <div className="space-y-1 sm:col-span-2">
                                         <Label htmlFor="edit-comment">Tavsif / Izoh *</Label>
                                         <Textarea required id="edit-comment" name="comment" value={formData.comment} onChange={handleChange} rows={3} placeholder="Xarajat haqida batafsil..." />
                                     </div>
                                 </div>
                             )}
                         </form>
                         <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 space-y-2 sm:space-y-0 pt-4 border-t">
                             <Button type="submit" form="edit-expense-form" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                                 disabled={isSubmitting || !currentExpense || !formData.object || !formData.supplier || !formData.expense_type || !formData.date || !formData.comment.trim() || !formData.amount || Number(formData.amount) <= 0}>
                                 {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} O'zgarishlarni Saqlash
                             </Button>
                             <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={(e) => handleEditSubmit(e, "saveAndAdd")}
                                 disabled={isSubmitting || !currentExpense || !formData.object || !formData.supplier || !formData.expense_type || !formData.date || !formData.comment.trim() || !formData.amount || Number(formData.amount) <= 0}>
                                 {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Saqlab, Yangi qo'shish
                             </Button>
                             <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setEditOpen(false)} disabled={isSubmitting}>Bekor qilish</Button>
                         </DialogFooter>
                     </DialogContent>
                </Dialog>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Umumiy Xarajat (Filtr) */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {filters.object && filters.object !== "all" ? `${getObjectName(Number(filters.object))} (Umumiy)` : "Umumiy Xarajat (Filtr)"}
                            </CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loadingTotals ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : (
                                <><div className="text-2xl font-bold">{formatCurrency(filteredTotalAmount)}</div>
                                    <p className="text-xs text-muted-foreground">Filtrlangan xarajatlar jami</p></>
                            )}
                        </CardContent>
                    </Card>
                     {/* To'langan (Filtr) - Based on total payments */}
                     <Card className="cursor-pointer" onClick={handleOpenPaidModal}>
                         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                             <CardTitle className="text-sm font-medium">To'langan (Filtr)</CardTitle>
                             <DollarSign className="h-4 w-4 text-green-500" />
                         </CardHeader>
                         <CardContent>
                             {loadingTotals ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : (
                                 <><div className="text-2xl font-bold text-green-600">{formatCurrency(filteredPaidAmount)}</div>
                                     <p className="text-xs text-muted-foreground">
                                         {filteredTotalAmount > 0 ? `${((filteredPaidAmount / filteredTotalAmount) * 100).toFixed(1)}% filtrlangan` : " "}
                                     </p></>
                             )}
                         </CardContent>
                     </Card>
                     {/* Nasiya (Filtr) - Based on difference or Supplier Balances */}
                     <Card className="cursor-pointer" onClick={handleOpenPendingModal}>
                         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                             <CardTitle className="text-sm font-medium">Nasiya (Filtr)</CardTitle>
                             <DollarSign className="h-4 w-4 text-yellow-500" />
                         </CardHeader>
                         <CardContent>
                             {loadingTotals ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : (
                                 <><div className="text-2xl font-bold text-yellow-600">{formatCurrency(filteredPendingAmount)}</div>
                                     <p className="text-xs text-muted-foreground">
                                         {/* This percentage is based on total expenses vs total payments */}
                                         {filteredTotalAmount > 0 ? `${((filteredPendingAmount / filteredTotalAmount) * 100).toFixed(1)}% filtrlangan` : " "}
                                     </p></>
                             )}
                         </CardContent>
                     </Card>
                    {/* Selected Object Total */}
                    <Card className={!(filters.object && filters.object !== "all") ? "opacity-50 bg-gray-50" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium truncate" title={filters.object && filters.object !== "all" ? getObjectName(Number(filters.object)) : "Obyekt Tanlanmagan"}>
                                {filters.object && filters.object !== "all" ? getObjectName(Number(filters.object)) : "Obyekt Tanlanmagan"}
                            </CardTitle>
                            <Building className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loadingTotals && filters.object && filters.object !== "all" ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : (
                                <><div className="text-xl font-bold">{filters.object && filters.object !== "all" && selectedObjectTotal !== null ? formatCurrency(selectedObjectTotal) : "-"}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {filters.object && filters.object !== "all" && selectedObjectTotal !== null && filteredTotalAmount > 0 ? `${((selectedObjectTotal / filteredTotalAmount) * 100).toFixed(1)}% (Filtr umumiy)` : " "}
                                    </p></>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Table Card */}
                <Card>
                    <CardContent className="p-4 md:p-6">
                        <div className="space-y-4">
                             {/* Filters and Search */}
                             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                                 <Input placeholder="Yetkazib beruvchi yoki izoh bo'yicha qidiring..." value={searchTerm} onChange={handleSearchChange} className="max-w-xs md:max-w-sm w-full order-2 md:order-1" disabled={loading || loadingTotals} />
                                 <div className="flex flex-wrap justify-start md:justify-end gap-2 w-full md:w-auto order-1 md:order-2">
                                     {/* Object Filter */}
                                     <Select value={filters.object} onValueChange={(value) => handleFilterChange("object", value)} disabled={loading || loadingTotals}>
                                         <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Obyekt" /></SelectTrigger>
                                         <SelectContent><SelectItem value="all">Barcha Obyektlar</SelectItem>{properties.map((p) => (<SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>))}</SelectContent>
                                     </Select>
                                     {/* Expense Type Filter */}
                                     <Select value={filters.expense_type} onValueChange={(value) => handleFilterChange("expense_type", value)} disabled={loading || loadingTotals}>
                                         <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Turi" /></SelectTrigger>
                                         <SelectContent><SelectItem value="all">Barcha Turlar</SelectItem>{expenseTypes.map((t) => (<SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>))}</SelectContent>
                                     </Select>
                                     {/* Date Range Filter */}
                                     <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange("dateRange", value)} disabled={loading || loadingTotals}>
                                         <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Sana" /></SelectTrigger>
                                         <SelectContent>
                                             <SelectItem value="all">Barcha Vaqt</SelectItem><SelectItem value="today">Bugun</SelectItem><SelectItem value="week">Oxirgi 7 kun</SelectItem>
                                             <SelectItem value="month">Oxirgi 30 kun</SelectItem><SelectItem value="quarter">Oxirgi 3 oy</SelectItem><SelectItem value="year">Oxirgi 1 yil</SelectItem>
                                         </SelectContent>
                                     </Select>
                                     {/* Clear Filters Button */}
                                     <Button variant="outline" size="sm" onClick={() => { setFilters({ object: "", expense_type: "", dateRange: "all" }); setSearchTerm(""); setCurrentPage(1); }}
                                         disabled={loading || loadingTotals || (!filters.object && !filters.expense_type && filters.dateRange === "all" && !searchTerm)}> Tozalash
                                     </Button>
                                 </div>
                             </div>
                            {/* Render Main Expense Table */}
                            {renderExpensesTable(expenses)}
                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || loading || loadingTotals}><ChevronLeft className="h-4 w-4 mr-2" /> Oldingi</Button>
                                    <span className="text-sm text-muted-foreground">{currentPage} / {totalPages} sahifa</span>
                                    <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || loading || loadingTotals}>Keyingi <ChevronRight className="h-4 w-4 ml-2" /></Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Paid Expenses Modal */}
                 <Dialog open={paidModalOpen} onOpenChange={setPaidModalOpen}>
                     <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
                         <DialogHeader>
                             <DialogTitle>To'langanlar Ro'yxati (To'lovlar)</DialogTitle>
                             <DialogDescription>Quyida filtrlangan to'lovlar ro'yxati keltirilgan.</DialogDescription>
                         </DialogHeader>
                         <div className="flex-1 overflow-y-auto">
                             {modalLoading ? (
                                 <div className="flex items-center justify-center h-[200px]"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /><span className="ml-2 text-muted-foreground">Yuklanmoqda...</span></div>
                             ) : modalExpenses.length === 0 ? (
                                 <div className="flex items-center justify-center h-[200px]"><p className="text-muted-foreground">Filtrga mos to'lovlar topilmadi.</p></div>
                             ) : (
                                 <Table>
                                     <TableHeader>
                                         <TableRow>
                                             <TableHead className="w-[60px]">ID</TableHead>
                                             <TableHead className="w-[120px]">Sana</TableHead>
                                             <TableHead>Yetkazib beruvchi</TableHead>
                                             <TableHead>Tavsif</TableHead>
                                             <TableHead>Turi</TableHead>
                                             <TableHead className="text-right w-[150px]">Summa</TableHead>
                                         </TableRow>
                                     </TableHeader>
                                     <TableBody>
                                         {modalExpenses.map((payment) => ( // Rename to payment for clarity
                                             <TableRow key={payment.id}>
                                                 <TableCell>{payment.id}</TableCell>
                                                 <TableCell>{formatDate(payment.date)}</TableCell>
                                                 <TableCell>{payment.supplier_name}</TableCell>
                                                 <TableCell className="max-w-[200px] truncate" title={payment.comment}>{payment.comment || "-"}</TableCell>
                                                 <TableCell><Badge variant="outline" className={getExpenseTypeStyle(payment.expense_type_name)}>{payment.expense_type_name}</Badge></TableCell>
                                                 <TableCell className="text-right font-semibold">{formatCurrency(payment.amount)}</TableCell>
                                             </TableRow>
                                         ))}
                                         <TableRow className="bg-muted font-bold">
                                             <TableCell colSpan={5} className="text-right">Jami:</TableCell>
                                             <TableCell className="text-right">{formatCurrency(modalExpenses.reduce((sum, p) => sum + Number(p.amount || 0), 0))}</TableCell>
                                         </TableRow>
                                     </TableBody>
                                 </Table>
                             )}
                         </div>
                         <DialogFooter><Button variant="outline" onClick={() => setPaidModalOpen(false)} disabled={modalLoading}>Yopish</Button></DialogFooter>
                     </DialogContent>
                 </Dialog>


                {/* Pending Expenses Modal (Supplier Balances) - **MODIFIED** */}
                <Dialog open={pendingModalOpen} onOpenChange={setPendingModalOpen}>
                     <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
                         <DialogHeader>
                             <DialogTitle>Nasiya Xarajatlar (Yetkazib Beruvchi Balansi)</DialogTitle>
                             <DialogDescription>Quyida balansi musbat bo'lgan yetkazib beruvchilar ro'yxati keltirilgan.</DialogDescription>
                         </DialogHeader>
                         <div className="flex-1 overflow-y-auto">
                             {modalLoading ? (
                                 <div className="flex items-center justify-center h-[200px]"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /><span className="ml-2 text-muted-foreground">Yuklanmoqda...</span></div>
                             ) : modalExpenses.length === 0 ? (
                                 <div className="flex items-center justify-center h-[200px]"><p className="text-muted-foreground">Nasiyasi bor yetkazib beruvchilar topilmadi.</p></div>
                             ) : (
                                 <Table>
                                     <TableHeader>
                                         <TableRow>
                                             <TableHead>Yetkazib beruvchi</TableHead>
                                             {/* <TableHead>Tavsif</TableHead> */}
                                             <TableHead className="text-right w-[180px]">Jami Balans (Nasiya)</TableHead>
                                             <TableHead className="text-right w-[100px]">Amal</TableHead>
                                         </TableRow>
                                     </TableHeader>
                                     <TableBody>
                                         {/* modalExpenses now contains one row per supplier with positive balance */}
                                         {modalExpenses.map((supplierSummary) => {
                                             // Find the full supplier object to pass to the payment dialog
                                             const supplier = suppliers.find(s => s.id === supplierSummary.supplier);
                                             if (!supplier) return null; // Should not happen if suppliers are loaded

                                             return (
                                                <TableRow key={supplierSummary.id}>
                                                     <TableCell className="font-medium">{supplierSummary.supplier_name}</TableCell>
                                                     {/* <TableCell className="text-xs text-muted-foreground">{supplierSummary.comment}</TableCell> */}
                                                     <TableCell className="text-right font-bold text-yellow-600">{formatCurrency(supplierSummary.supplier_balance)}</TableCell>
                                                     <TableCell className="text-right">
                                                        <Button
                                                             variant="outline"
                                                             size="sm"
                                                             onClick={() => handleOpenPaymentDialog(supplier)}
                                                             title={`${supplier.company_name} uchun to'lov qilish`}
                                                        >
                                                             <HandCoins className="h-4 w-4 mr-1" /> To'lov
                                                         </Button>
                                                     </TableCell>
                                                 </TableRow>
                                             );
                                         })}
                                         <TableRow className="bg-muted font-bold">
                                             <TableCell className="text-right">Jami Nasiya Balans:</TableCell>
                                             <TableCell className="text-right">
                                                 {formatCurrency(
                                                     modalExpenses.reduce((sum, exp) => sum + Number(exp.supplier_balance || 0), 0)
                                                 )}
                                             </TableCell>
                                             <TableCell></TableCell>{/* Empty cell for action column */}
                                         </TableRow>
                                     </TableBody>
                                 </Table>
                             )}
                         </div>
                         <DialogFooter><Button variant="outline" onClick={() => setPendingModalOpen(false)} disabled={modalLoading}>Yopish</Button></DialogFooter>
                     </DialogContent>
                 </Dialog>

                 {/* Add Payment Dialog - **NEW** */}
                 <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                    <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader>
                            <DialogTitle>Yetkazib Beruvchiga To'lov</DialogTitle>
                             <DialogDescription>
                                 <span className="font-semibold">{currentPaymentSupplier?.company_name}</span> uchun to'lov ma'lumotlarini kiriting.
                                 <br/>
                                 Joriy balans: <span className="font-semibold">{formatCurrency(currentPaymentSupplier?.balance)}</span>
                             </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                             <div className="space-y-1">
                                 <Label htmlFor="payment-amount">To'lov Summasi (USD) *</Label>
                                 <Input
                                     required
                                     id="payment-amount"
                                     name="paymentAmount"
                                     type="number"
                                     step="0.01"
                                     min="0.01"
                                     // max={currentPaymentSupplier?.balance ? Number(currentPaymentSupplier.balance) : undefined} // Optional: limit to balance
                                     value={paymentAmount}
                                     onChange={(e) => setPaymentAmount(e.target.value)}
                                     placeholder="Masalan: 500.00"
                                     className={Number(paymentAmount) > Number(currentPaymentSupplier?.balance || 0) ? "border-red-500" : ""} // Highlight if over balance
                                 />
                                  {Number(paymentAmount) > Number(currentPaymentSupplier?.balance || 0) && (
                                      <p className="text-xs text-red-600">Summa balansdan yuqori!</p>
                                  )}
                             </div>
                             <div className="space-y-1">
                                 <Label htmlFor="payment-description">Tavsif / Izoh *</Label>
                                 <Textarea
                                     required
                                     id="payment-description"
                                     name="paymentDescription"
                                     value={paymentDescription}
                                     onChange={(e) => setPaymentDescription(e.target.value)}
                                     rows={3}
                                     placeholder="To'lov maqsadi..."
                                 />
                             </div>
                        </div>
                        <DialogFooter>
                             <Button
                                 type="button"
                                 onClick={handleAddPayment}
                                 disabled={isSubmittingPayment || !paymentAmount || Number(paymentAmount) <= 0 || !paymentDescription.trim() }
                             >
                                 {isSubmittingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HandCoins className="mr-2 h-4 w-4" />}
                                 To'lovni Qo'shish
                             </Button>
                             <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={isSubmittingPayment}>
                                    Bekor qilish
                                </Button>
                             </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                 </Dialog>

            </main>
            <footer className="border-t py-4 px-4 text-center text-sm text-muted-foreground mt-auto">
                Version 1.0 | Barcha huquqlar ximoyalangan | Ushbu Dastur CDCGroup tomonidan yaratilgan | CraDev Company tomonidan qo'llab quvvatlanadi | since 2019
            </footer>
        </div>
    );
}