"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { Plus, DollarSign, Building, Edit, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

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

interface Property {
  id: number;
  name: string;
}

interface Supplier {
  id: number;
  company_name: string;
}

interface ExpenseType {
  id: number;
  name: string;
}

interface ExpenseByObject {
  objectId: number;
  objectName: string;
  total: number;
}

const API_BASE_URL = "http://api.ahlan.uz";

const initialFormData = {
  object: "",
  supplier: "",
  amount: "",
  expense_type: "",
  date: new Date().toISOString().split("T")[0],
  comment: "",
  status: "Kutilmoqda",
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
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [expensesByObject, setExpensesByObject] = useState<ExpenseByObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSupplierSubmitting, setIsSupplierSubmitting] = useState(false);
  const [isExpenseTypeSubmitting, setIsExpenseTypeSubmitting] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [formData, setFormData] = useState(initialFormData);
  const [filters, setFilters] = useState({
    object: "",
    expense_type: "",
    dateRange: "all",
  });
  const [isClient, setIsClient] = useState(false);
  const [addExpenseTypeOpen, setAddExpenseTypeOpen] = useState(false);
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [newExpenseTypeName, setNewExpenseTypeName] = useState("");
  const [newSupplierData, setNewSupplierData] = useState(initialNewSupplierData);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 25;

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
          const errorData = await response.json().catch(() => ({ detail: `Serverdan javob o'qilmadi (Status: ${response.status})` }));
          throw new Error(`${errorMsg} (Status: ${response.status}): ${errorData.detail || JSON.stringify(errorData)}`);
        }
        const data = await response.json();
        setter(data.results || data);
      } catch (error: any) {
        toast({ title: "Xatolik", description: error.message || errorMsg, variant: "destructive" });
        setter([]);
      }
    },
    [accessToken, getAuthHeaders]
  );

  const fetchInitialData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      await Promise.all([
        fetchApiData("/objects/?page_size=1000", setProperties, "Obyektlarni yuklashda xatolik"),
        fetchApiData("/suppliers/?page_size=1000", setSuppliers, "Yetkazib beruvchilarni yuklashda xatolik"),
        fetchApiData("/expense-types/?page_size=1000", setExpenseTypes, "Xarajat turlarini yuklashda xatolik"),
      ]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, fetchApiData]);

  const fetchExpenses = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.object && filters.object !== "all") queryParams.append("object", filters.object);
      if (filters.expense_type && filters.expense_type !== "all") queryParams.append("expense_type", filters.expense_type);
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
        queryParams.append("date__gte", startDate.toISOString().split("T")[0]);
        if (filters.dateRange === "today") queryParams.append("date__lte", today.toISOString().split("T")[0]);
      }
      queryParams.append("page", currentPage.toString());
      queryParams.append("page_size", itemsPerPage.toString());

      const response = await fetch(`${API_BASE_URL}/expenses/?${queryParams.toString()}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `Serverdan javob o'qilmadi (Status: ${response.status})` }));
        throw new Error(`Xarajatlar yuklanmadi (Status: ${response.status}): ${errorData.detail || JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const fetchedExpenses = data.results || [];
      setExpenses(fetchedExpenses);
      setTotalPages(Math.ceil(data.count / itemsPerPage));

      // Umumiy xarajatlarni hisoblash
      const allExpensesResponse = await fetch(`${API_BASE_URL}/expenses/?page_size=1000`, { headers: getAuthHeaders() });
      if (!allExpensesResponse.ok) throw new Error("Barcha xarajatlarni yuklashda xatolik");
      const allExpensesData = await allExpensesResponse.json();
      const allExpenses = allExpensesData.results || [];
      const total = allExpenses.reduce((sum: number, expense: Expense) => sum + Number(expense.amount || 0), 0);
      setTotalExpenses(total);

      // Obyektlar bo'yicha xarajatlarni hisoblash
      const expensesByObjMap: { [key: number]: { total: number; name: string } } = {};
      allExpenses.forEach((expense: Expense) => {
        const objId = expense.object;
        if (!expensesByObjMap[objId]) {
          expensesByObjMap[objId] = { total: 0, name: properties.find(p => p.id === objId)?.name || `Obyekt ${objId}` };
        }
        expensesByObjMap[objId].total += Number(expense.amount || 0);
      });
      const expensesByObjArray = Object.entries(expensesByObjMap)
        .map(([objId, { total, name }]) => ({
          objectId: Number(objId),
          objectName: name,
          total,
        }))
        .sort((a, b) => b.total - a.total);
      setExpensesByObject(expensesByObjArray);

    } catch (error: any) {
      toast({ title: "Xatolik", description: error.message || "Xarajatlar yuklashda xatolik", variant: "destructive" });
      setExpenses([]);
      setTotalPages(1);
      setTotalExpenses(0);
      setExpensesByObject([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, filters, currentPage, getAuthHeaders, properties]);

  const createExpense = async (expenseData: any, action: "save" | "saveAndAdd" | "saveAndContinue") => {
    if (!accessToken) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(expenseData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) throw new Error("Ruxsat yo'q (Faqat admin qo'shishi mumkin).");
        const errorMessages = Object.entries(errorData)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('\n');
        throw new Error(`Xarajat qo'shishda xatolik (Status: ${response.status}).\n${errorMessages || 'Serverdan javob olinmadi'}`);
      }
      await response.json();
      toast({ title: "Muvaffaqiyat", description: "Xarajat muvaffaqiyatli qo'shildi" });
      await fetchExpenses();
      if (action === "save") {
        setOpen(false);
        setFormData(initialFormData);
      } else {
        setFormData(initialFormData);
      }
    } catch (error: any) {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
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
      const response = await fetch(`${API_BASE_URL}/expenses/${id}/`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `Serverdan javob o'qilmadi (Status: ${response.status})` }));
        throw new Error(`Xarajatni olishda xatolik (ID: ${id}, Status: ${response.status}): ${errorData.detail || JSON.stringify(errorData)}`);
      }
      const data: Expense = await response.json();
      setCurrentExpense(data);
      setFormData({
        object: data.object?.toString() || "",
        supplier: data.supplier?.toString() || "",
        amount: data.amount || "0",
        expense_type: data.expense_type?.toString() || "",
        date: data.date || new Date().toISOString().split("T")[0],
        comment: data.comment || "",
        status: data.status || "Kutilmoqda",
      });
    } catch (error: any) {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
      setEditOpen(false);
    }
  };

  const updateExpense = async (id: number, expenseData: any, action: "save" | "saveAndAdd" | "saveAndContinue") => {
    if (!accessToken) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${id}/`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(expenseData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) throw new Error("Ruxsat yo'q (Faqat admin yangilashi mumkin).");
        const errorMessages = Object.entries(errorData)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('\n');
        throw new Error(`Xarajatni yangilashda xatolik (Status: ${response.status}).\n${errorMessages || 'Serverdan javob olinmadi'}`);
      }
      const updatedExpense: Expense = await response.json();
      toast({ title: "Muvaffaqiyat", description: "Xarajat muvaffaqiyatli yangilandi" });
      await fetchExpenses();
      if (action === "save") {
        setEditOpen(false);
        setCurrentExpense(null);
        setFormData(initialFormData);
      } else if (action === "saveAndAdd") {
        setEditOpen(false);
        setCurrentExpense(null);
        setFormData(initialFormData);
        setOpen(true);
      } else if (action === "saveAndContinue") {
        setCurrentExpense(updatedExpense);
        setFormData({
          object: updatedExpense.object?.toString() || "",
          supplier: updatedExpense.supplier?.toString() || "",
          amount: updatedExpense.amount || "0",
          expense_type: updatedExpense.expense_type?.toString() || "",
          date: updatedExpense.date || new Date().toISOString().split("T")[0],
          comment: updatedExpense.comment || "",
          status: updatedExpense.status || "Kutilmoqda",
        });
      }
    } catch (error: any) {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteExpense = async (id: number) => {
    if (!accessToken) return;
    if (!window.confirm(`${id}-ID'li xarajatni o'chirishni tasdiqlaysizmi?`)) return;
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (response.status === 204) {
        toast({ title: "Muvaffaqiyat", description: "Xarajat muvaffaqiyatli o'chirildi" });
        await fetchExpenses();
      } else if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) throw new Error("Ruxsat yo'q (Faqat admin o'chirishi mumkin).");
        throw new Error(`Xarajatni o'chirishda xatolik (Status: ${response.status}): ${errorData.detail || JSON.stringify(errorData)}`);
      }
    } catch (error: any) {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    }
  };

  const createExpenseType = async () => {
    if (!accessToken || !newExpenseTypeName.trim()) {
      toast({ title: "Xatolik", description: "Xarajat turi nomini kiriting", variant: "destructive" });
      return;
    }
    setIsExpenseTypeSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/expense-types/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: newExpenseTypeName.trim() }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Xarajat turi qo'shilmadi: ${errorData.name?.[0] || errorData.detail || "Server xatosi"}`);
      }
      const newType: ExpenseType = await response.json();
      setExpenseTypes((prev) => [...prev, newType].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData((prev) => ({ ...prev, expense_type: newType.id.toString() }));
      setNewExpenseTypeName("");
      setAddExpenseTypeOpen(false);
      toast({ title: "Muvaffaqiyat", description: `"${newType.name}" xarajat turi qo'shildi va tanlandi` });
    } catch (error: any) {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    } finally {
      setIsExpenseTypeSubmitting(false);
    }
  };

  const createSupplier = async () => {
    if (!accessToken || !newSupplierData.company_name.trim()) {
      toast({ title: "Xatolik", description: "Kompaniya nomini kiriting", variant: "destructive" });
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
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessages = Object.entries(errorData)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('\n');
        throw new Error(`Yetkazib beruvchi qo'shilmadi (Status: ${response.status}).\n${errorMessages || 'Serverdan javob olinmadi'}`);
      }
      const newSupplier: Supplier = await response.json();
      setSuppliers((prev) => [...prev, newSupplier].sort((a, b) => a.company_name.localeCompare(b.company_name)));
      setFormData((prev) => ({ ...prev, supplier: newSupplier.id.toString() }));
      setNewSupplierData(initialNewSupplierData);
      setAddSupplierOpen(false);
      toast({ title: "Muvaffaqiyat", description: `"${newSupplier.company_name}" yetkazib beruvchi qo'shildi va tanlandi` });
    } catch (error: any) {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    } finally {
      setIsSupplierSubmitting(false);
    }
  };

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("access_token");
    if (token) {
      setAccessToken(token);
    } else {
      toast({ title: "Kirish", description: "Iltimos tizimga kiring", variant: "destructive" });
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    if (accessToken) {
      fetchInitialData();
    }
  }, [accessToken, fetchInitialData]);

  useEffect(() => {
    if (accessToken && properties.length > 0) {
      fetchExpenses();
    }
  }, [accessToken, fetchExpenses, properties]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSupplierChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewSupplierData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const validateFormData = () => {
    const requiredFields: (keyof typeof initialFormData)[] = ['object', 'supplier', 'amount', 'expense_type', 'date', 'comment', 'status'];
    let isValid = true;
    for (const field of requiredFields) {
      if (field === 'amount') {
        if (formData.amount === "" || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
          toast({ title: "Xatolik", description: `"Summa" musbat raqam bo'lishi kerak.`, variant: "destructive" });
          isValid = false;
          break;
        }
      } else if (!formData[field]) {
        toast({ title: "Xatolik", description: `"${field}" maydoni to'ldirilishi shart.`, variant: "destructive" });
        isValid = false;
        break;
      }
    }
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent, action: "save" | "saveAndAdd" | "saveAndContinue") => {
    e.preventDefault();
    if (!validateFormData()) return;

    const expenseData = {
      object: Number(formData.object),
      supplier: Number(formData.supplier),
      amount: formData.amount,
      expense_type: Number(formData.expense_type),
      date: formData.date,
      comment: formData.comment.trim(),
      status: formData.status,
    };

    createExpense(expenseData, action);
  };

  const handleEditSubmit = async (e: React.FormEvent, action: "save" | "saveAndAdd" | "saveAndContinue") => {
    e.preventDefault();
    if (!currentExpense) return;
    if (!validateFormData()) return;

    const expenseData = {
      object: Number(formData.object),
      supplier: Number(formData.supplier),
      amount: formData.amount,
      expense_type: Number(formData.expense_type),
      date: formData.date,
      comment: formData.comment.trim(),
      status: formData.status,
    };

    updateExpense(currentExpense.id, expenseData, action);
  };

  const handleOpenEditDialog = (expenseId: number) => {
    fetchExpenseById(expenseId);
  };

  const getExpenseTypeStyle = (typeName: string | undefined): string => {
    if (!typeName) return "bg-gray-100 text-gray-800";
    const lowerTypeName = typeName.toLowerCase();
    if (lowerTypeName.includes("qurilish") || lowerTypeName.includes("material")) return "bg-blue-100 text-blue-800";
    if (lowerTypeName.includes("ishchi") || lowerTypeName.includes("kuchi")) return "bg-green-100 text-green-800";
    if (lowerTypeName.includes("jihoz")) return "bg-purple-100 text-purple-800";
    if (lowerTypeName.includes("kommunal")) return "bg-yellow-100 text-yellow-800";
    return "bg-secondary text-secondary-foreground";
  };

  const filteredExpenses = expenses.filter((expense) => {
    const searchTermLower = searchTerm.toLowerCase();
    const objectMatch = !filters.object || filters.object === "all" || expense.object?.toString() === filters.object;
    const typeMatch = !filters.expense_type || filters.expense_type === "all" || expense.expense_type?.toString() === filters.expense_type;

    if (!objectMatch || !typeMatch) return false;

    if (!searchTermLower) return true;

    const objectName = properties.find(p => p.id === expense.object)?.name?.toLowerCase() || "";
    return (
      expense.comment?.toLowerCase().includes(searchTermLower) ||
      expense.supplier_name?.toLowerCase().includes(searchTermLower) ||
      expense.expense_type_name?.toLowerCase().includes(searchTermLower) ||
      expense.amount?.toString().toLowerCase().includes(searchTermLower) ||
      objectName.includes(searchTermLower) ||
      expense.status?.toLowerCase().includes(searchTermLower)
    );
  });

  const getTotalAmount = (expensesList: Expense[]) => {
    return expensesList.reduce((total, expense) => total + Number(expense.amount || 0), 0);
  };

  const formatCurrency = useCallback((amount: number | string | undefined | null) => {
    const numericAmount = Number(amount || 0);
    if (!isClient) return `${numericAmount.toFixed(2)} USD`;
    try {
      return numericAmount.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch (e) {
      return `${numericAmount.toFixed(2)} USD`;
    }
  }, [isClient]);

  const formatDate = useCallback((dateString: string | undefined | null) => {
    if (!dateString || !isClient) return dateString || "-";
    try {
      return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US');
    } catch (e) {
      return dateString;
    }
  }, [isClient]);

  const getObjectName = useCallback((objectId: number | undefined) => {
    if (objectId === undefined) return "Noma'lum";
    return properties.find(p => p.id === objectId)?.name || `Obyekt ID: ${objectId}`;
  }, [properties]);

  function renderExpensesTable(expensesToRender: Expense[]) {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-[200px] border rounded-md">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-2 text-muted-foreground">Yuklanmoqda...</p>
        </div>
      );
    }
    if (expensesToRender.length === 0 && (expenses.length > 0 || searchTerm || filters.object || filters.expense_type || filters.dateRange !== 'all')) {
      return (
        <div className="flex items-center justify-center h-[200px] border rounded-md">
          <p className="text-muted-foreground text-center">Filtr yoki qidiruvga mos xarajatlar topilmadi.<br/>Filtrlarni tozalab ko'ring.</p>
        </div>
      );
    }
    if (expensesToRender.length === 0 && expenses.length === 0) {
      return (
        <div className="flex items-center justify-center h-[200px] border rounded-md">
          <p className="text-muted-foreground">Hozircha xarajatlar mavjud emas. Yangi xarajat qo'shing.</p>
        </div>
      );
    }

    return (
      <div className="rounded-md border overflow-x-auto relative">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">ID</TableHead>
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
            {expensesToRender.map((expense) => (
              <TableRow key={expense.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{expense.id}</TableCell>
                <TableCell>{formatDate(expense.date)}</TableCell>
                <TableCell>{getObjectName(expense.object)}</TableCell>
                <TableCell>{expense.supplier_name || `Yetk. ID: ${expense.supplier}`}</TableCell>
                <TableCell className="max-w-[250px] truncate" title={expense.comment}>{expense.comment || "-"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`whitespace-nowrap ${getExpenseTypeStyle(expense.expense_type_name)}`}>
                    {expense.expense_type_name || `ID: ${expense.expense_type}`}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={expense.status === 'To‘langan' ? 'success' : (expense.status === 'Kutilmoqda' ? 'warning' : 'secondary')}
                    className="whitespace-nowrap"
                  >
                    {expense.status || "Noma'lum"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(expense.amount)}</TableCell>
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
            ))}
            {expensesToRender.length > 0 && (
              <TableRow className="bg-muted hover:bg-muted font-bold sticky bottom-0">
                <TableCell colSpan={7} className="text-right">Jami (Filtr):</TableCell>
                <TableCell className="text-right">{formatCurrency(getTotalAmount(expensesToRender))}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="flex h-16 items-center px-4 container mx-auto">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <UserNav />
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6 container mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 mb-6">
          <h2 className="text-3xl font-bold tracking-tight">Xarajatlar</h2>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (isOpen) setFormData(initialFormData);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!accessToken}>
                <Plus className="mr-2 h-4 w-4" />
                Yangi xarajat
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Yangi xarajat qo'shish</DialogTitle>
                <DialogDescription>Xarajat ma'lumotlarini kiriting. * majburiy.</DialogDescription>
              </DialogHeader>
              <form id="add-expense-form" onSubmit={(e) => handleSubmit(e, "save")} className="flex-1 overflow-y-auto pr-4 pl-1 -mr-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 py-4">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="amount">Summa (USD) *</Label>
                      <Input required id="amount" name="amount" type="number" step="0.01" min="0.01" value={formData.amount} onChange={handleChange} placeholder="Masalan: 1500.50" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="date">Xarajat sanasi *</Label>
                      <Input required id="date" name="date" type="date" value={formData.date} onChange={handleChange} max={new Date().toISOString().split("T")[0]} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="supplier">Yetkazib beruvchi *</Label>
                      <div className="flex items-center space-x-2">
                        <Select required value={formData.supplier} onValueChange={(value) => handleSelectChange("supplier", value)} name="supplier">
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
                            <Button type="button" variant="outline" size="icon" title="Yangi yetkazib beruvchi qo'shish">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Yangi yetkazib beruvchi</DialogTitle>
                            </DialogHeader>
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
                              <Button type="button" variant="outline" onClick={() => { setAddSupplierOpen(false); setNewSupplierData(initialNewSupplierData); }} disabled={isSupplierSubmitting}>
                                Bekor qilish
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="expense_type">Xarajat turi *</Label>
                      <div className="flex items-center space-x-2">
                        <Select required value={formData.expense_type} onValueChange={(value) => handleSelectChange("expense_type", value)} name="expense_type">
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
                        <Dialog open={addExpenseTypeOpen} onOpenChange={setAddExpenseTypeOpen}>
                          <DialogTrigger asChild>
                            <Button type="button" variant="outline" size="icon" title="Yangi xarajat turi qo'shish">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Yangi xarajat turi</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <Label htmlFor="new_expense_type_name">Nomi *</Label>
                              <Input id="new_expense_type_name" value={newExpenseTypeName} onChange={(e) => setNewExpenseTypeName(e.target.value)} required />
                            </div>
                            <DialogFooter>
                              <Button type="button" onClick={createExpenseType} disabled={!newExpenseTypeName.trim() || isExpenseTypeSubmitting}>
                                {isExpenseTypeSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Qo'shish
                              </Button>
                              <Button type="button" variant="outline" onClick={() => { setAddExpenseTypeOpen(false); setNewExpenseTypeName(""); }} disabled={isExpenseTypeSubmitting}>
                                Bekor qilish
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="object">Obyekt *</Label>
                      <Select required value={formData.object} onValueChange={(value) => handleSelectChange("object", value)} name="object">
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
                    <div className="space-y-1">
                      <Label htmlFor="status">Status *</Label>
                      <Select required value={formData.status} onValueChange={(value) => handleSelectChange("status", value)} name="status">
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Tanlang..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="To‘langan">To‘langan</SelectItem>
                          <SelectItem value="Kutilmoqda">Nasiya</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="comment">Tavsif / Izoh *</Label>
                    <Textarea required id="comment" name="comment" value={formData.comment} onChange={handleChange} rows={3} placeholder="Xarajat haqida batafsil..." />
                  </div>
                </div>
              </form>
              <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 space-y-2 sm:space-y-0 pt-4 border-t">
                <Button type="submit" form="add-expense-form" className="bg-green-600 hover:bg-green-700 w-full sm:w-auto" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Saqlash
                </Button>
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)} disabled={isSubmitting}>
                  Bekor qilish
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={editOpen} onOpenChange={(isOpen) => {
          setEditOpen(isOpen);
          if (!isOpen) {
            setCurrentExpense(null);
            setFormData(initialFormData);
          }
        }}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Xarajatni tahrirlash (ID: {currentExpense?.id})</DialogTitle>
              <DialogDescription>Xarajat ma'lumotlarini yangilang. * majburiy.</DialogDescription>
            </DialogHeader>
            <form id="edit-expense-form" onSubmit={(e) => handleEditSubmit(e, "save")} className="flex-1 overflow-y-auto pr-4 pl-1 -mr-2">
              {!currentExpense && editOpen ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Yuklanmoqda...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 py-4">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="edit-amount">Summa (USD) *</Label>
                      <Input required id="edit-amount" name="amount" type="number" step="0.01" min="0.01" value={formData.amount} onChange={handleChange} placeholder="Masalan: 1500.50" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-date">Xarajat sanasi *</Label>
                      <Input required id="edit-date" name="date" type="date" value={formData.date} onChange={handleChange} max={new Date().toISOString().split("T")[0]} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-supplier">Yetkazib beruvchi *</Label>
                      <div className="flex items-center space-x-2">
                        <Select required value={formData.supplier} onValueChange={(value) => handleSelectChange("supplier", value)} name="supplier">
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
                            <Button type="button" variant="outline" size="icon" title="Yangi yetkazib beruvchi qo'shish">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Yangi yetkazib beruvchi</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto pr-2">
                              <Label htmlFor="edit_new_company_name">Kompaniya nomi *</Label>
                              <Input id="edit_new_company_name" name="company_name" value={newSupplierData.company_name} onChange={handleSupplierChange} required />
                              <Label htmlFor="edit_new_contact_person_name">Kontakt</Label>
                              <Input id="edit_new_contact_person_name" name="contact_person_name" value={newSupplierData.contact_person_name} onChange={handleSupplierChange} />
                              <Label htmlFor="edit_new_phone_number">Telefon</Label>
                              <Input id="edit_new_phone_number" name="phone_number" value={newSupplierData.phone_number} onChange={handleSupplierChange} />
                              <Label htmlFor="edit_new_address">Manzil</Label>
                              <Textarea id="edit_new_address" name="address" value={newSupplierData.address} onChange={handleSupplierChange} rows={2} />
                              <Label htmlFor="edit_new_description">Tavsif</Label>
                              <Textarea id="edit_new_description" name="description" value={newSupplierData.description} onChange={handleSupplierChange} rows={2} />
                            </div>
                            <DialogFooter>
                              <Button type="button" onClick={createSupplier} disabled={!newSupplierData.company_name.trim() || isSupplierSubmitting}>
                                {isSupplierSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Qo'shish
                              </Button>
                              <Button type="button" variant="outline" onClick={() => { setAddSupplierOpen(false); setNewSupplierData(initialNewSupplierData); }} disabled={isSupplierSubmitting}>
                                Bekor qilish
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="edit-expense_type">Xarajat turi *</Label>
                      <div className="flex items-center space-x-2">
                        <Select required value={formData.expense_type} onValueChange={(value) => handleSelectChange("expense_type", value)} name="expense_type">
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
                        <Dialog open={addExpenseTypeOpen} onOpenChange={setAddExpenseTypeOpen}>
                          <DialogTrigger asChild>
                            <Button type="button" variant="outline" size="icon" title="Yangi xarajat turi qo'shish">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Yangi xarajat turi</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <Label htmlFor="edit_new_expense_type_name">Nomi *</Label>
                              <Input id="edit_new_expense_type_name" value={newExpenseTypeName} onChange={(e) => setNewExpenseTypeName(e.target.value)} required />
                            </div>
                            <DialogFooter>
                              <Button type="button" onClick={createExpenseType} disabled={!newExpenseTypeName.trim() || isExpenseTypeSubmitting}>
                                {isExpenseTypeSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Qo'shish
                              </Button>
                              <Button type="button" variant="outline" onClick={() => { setAddExpenseTypeOpen(false); setNewExpenseTypeName(""); }} disabled={isExpenseTypeSubmitting}>
                                Bekor qilish
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-object">Obyekt *</Label>
                      <Select required value={formData.object} onValueChange={(value) => handleSelectChange("object", value)} name="object">
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
                    <div className="space-y-1">
                      <Label htmlFor="edit-status">Status *</Label>
                      <Select required value={formData.status} onValueChange={(value) => handleSelectChange("status", value)} name="status">
                        <SelectTrigger id="edit-status">
                          <SelectValue placeholder="Tanlang..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="To‘langan">To‘langan</SelectItem>
                          <SelectItem value="Kutilmoqda">Kutilmoqda</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="edit-comment">Tavsif / Izoh *</Label>
                    <Textarea required id="edit-comment" name="comment" value={formData.comment} onChange={handleChange} rows={3} placeholder="Xarajat haqida batafsil..." />
                  </div>
                </div>
              )}
            </form>
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 space-y-2 sm:space-y-0 pt-4 border-t">
              <Button type="submit" form="edit-expense-form" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto" disabled={isSubmitting || !currentExpense}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Saqlash
              </Button>
              <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={(e) => handleEditSubmit(e, "saveAndAdd")} disabled={isSubmitting || !currentExpense}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Saqlab, Yangi qo'shish
              </Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setEditOpen(false)} disabled={isSubmitting}>
                Bekor qilish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Umumiy xarajat</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
                  <p className="text-xs text-muted-foreground">Barcha xarajatlar jami</p>
                </>
              )}
            </CardContent>
          </Card>
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={`placeholder-loading-${index}`}>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Yuklanmoqda...</CardTitle></CardHeader>
                <CardContent><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent>
              </Card>
            ))
          ) : (
            <>
              {expensesByObject.slice(0, 3).map((expenseInfo) => (
                <Card key={expenseInfo.objectId}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium truncate" title={expenseInfo.objectName}>
                      {expenseInfo.objectName}
                    </CardTitle>
                    <Building className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{formatCurrency(expenseInfo.total)}</div>
                    <p className="text-xs text-muted-foreground">
                      {totalExpenses > 0 ? `${((expenseInfo.total / totalExpenses) * 100).toFixed(1)}% umumiy` : ""}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {Array.from({ length: Math.max(0, 3 - expensesByObject.length) }).map((_, index) => (
                <Card key={`placeholder-${index}`} className="opacity-60">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Obyekt</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold">-</div><p className="text-xs text-muted-foreground"> </p></CardContent>
                </Card>
              ))}
            </>
          )}
        </div>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <Input
                  placeholder="Qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs md:max-w-sm w-full order-2 md:order-1"
                  disabled={loading}
                />
                <div className="flex flex-wrap justify-start md:justify-end gap-2 w-full md:w-auto order-1 md:order-2">
                  <Select value={filters.object} onValueChange={(value) => handleFilterChange("object", value)} disabled={loading}>
                    <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Obyekt" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Barcha Obyektlar</SelectItem>
                      {properties.map((p) => (<SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Select value={filters.expense_type} onValueChange={(value) => handleFilterChange("expense_type", value)} disabled={loading}>
                    <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Turi" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Barcha Turlar</SelectItem>
                      {expenseTypes.map((t) => (<SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange("dateRange", value)} disabled={loading}>
                    <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Sana" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Barcha Vaqt</SelectItem>
                      <SelectItem value="today">Bugun</SelectItem>
                      <SelectItem value="week">Oxirgi 7 kun</SelectItem>
                      <SelectItem value="month">Oxirgi 30 kun</SelectItem>
                      <SelectItem value="quarter">Oxirgi 3 oy</SelectItem>
                      <SelectItem value="year">Oxirgi 1 yil</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => { setFilters({ object: "", expense_type: "", dateRange: "all" }); setSearchTerm(""); setCurrentPage(1); }} disabled={loading || (!filters.object && !filters.expense_type && filters.dateRange === 'all' && !searchTerm)}>
                    Tozalash
                  </Button>
                </div>
              </div>
              {renderExpensesTable(filteredExpenses)}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Oldingi
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentPage} / {totalPages} sahifa
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                  >
                    Keyingi
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}