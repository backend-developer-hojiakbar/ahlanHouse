"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { Plus, Eye, Edit, Trash, CreditCard, Loader2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const API_BASE_URL = "http://api.ahlan.uz";
const TELEGRAM_BOT_TOKEN = "7165051905:AAFS-lG2LDq5OjFdAwTzrpbHYnrkup6y13s";
const TELEGRAM_CHAT_ID = "1728300";

interface Supplier {
  id: number;
  company_name: string;
  contact_person_name: string;
  phone_number: string;
  address: string;
  description: string;
  balance: string;
}

interface PaymentFormData {
  amount: string;
  description: string;
}

// --- YANGILANDI: Obyekt interfeysi ---
interface Obyekt {
  id: number;
  name: string;
}

// --- YANGILANDI: API javobiga moslashtirildi ---
interface Payment {
  id: number;
  supplier: number;
  amount: string;
  payment_type: string;
  description: string;
  created_at: string;
  object?: number | null; // ID sifatida
}

// --- YANGILANDI: API javobiga moslashtirildi ---
interface Expense {
  id: number;
  supplier: number;
  amount: string;
  description: string;
  created_at: string;
  expense_type: number;
  date?: string;
  comment?: string;
  object?: number | null; // ID sifatida
}

interface ExpenseType {
  id: number;
  name: string;
}

interface CurrentUser {
  fio: string;
  user_type: 'admin' | 'sotuvchi' | 'buxgalter' | 'mijoz' | string;
}

const SuppliersPage = () => {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    company_name: "",
    contact_person_name: "",
    phone_number: "",
    address: "",
    description: "",
    balance: "0.00",
  });
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payingSupplierId, setPayingSupplierId] = useState<number | null>(null);
  const [payingSupplierName, setPayingSupplierName] = useState<string>("");
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    amount: "",
    description: "",
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("suppliers");
  const [selectedSupplierTransactions, setSelectedSupplierTransactions] = useState<{
    supplier: Supplier | null;
    payments: Payment[];
    expenses: Expense[];
  }>({ supplier: null, payments: [], expenses: [] });
  const [transactionsModalOpen, setTransactionsModalOpen] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [obyekts, setObyekts] = useState<Obyekt[]>([]); // --- YANGI: Obyektlar uchun state ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");
  
  // Yangi qo'shilgan state'lar
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);
  const [selectedObject, setSelectedObject] = useState<Obyekt | null>(null);

  const SUPPLIERS_API_URL = `${API_BASE_URL}/suppliers/`;
  const PAYMENTS_API_URL = `${API_BASE_URL}/supplier-payments/`;
  const EXPENSES_API_URL = `${API_BASE_URL}/expenses/`;
  const EXPENSE_TYPES_API_URL = `${API_BASE_URL}/expense-types/`;
  const OBJECTS_API_URL = `${API_BASE_URL}/objects/`; // --- YANGI: Obyektlar API manzili ---

  const sendTelegramNotification = useCallback(async (message: string) => {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })
      });
    } catch (error) {
      console.error("Telegram xabarini yuborishda xatolik:", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast({ title: "Avtorizatsiya xatosi", description: "Iltimos, tizimga qaytadan kiring.", variant: "destructive" });
        router.push("/login");
      } else {
        setAccessToken(token);
        const userTypeFromStorage = localStorage.getItem("user_type");
        const userFioFromStorage = localStorage.getItem("user_fio");
        if (userTypeFromStorage && userFioFromStorage) {
          setCurrentUser({ user_type: userTypeFromStorage as CurrentUser['user_type'], fio: userFioFromStorage });
        } else {
          setCurrentUser(null);
        }
      }
    }
  }, [router]);

  const canPerformSensitiveActions = useCallback((user: CurrentUser | null): boolean => {
    if (!user) return false;
    const isRestrictedRole = user.user_type === 'sotuvchi' || user.user_type === 'buxgalter';
    const hasSardorInFio = user.fio.toLowerCase().includes('sardor');
    if (isRestrictedRole || hasSardorInFio) return false;
    return true;
  }, []);

  const getAuthHeaders = useCallback(() => {
    if (!accessToken) {
      if (typeof window !== "undefined" && !localStorage.getItem("access_token")) router.push("/login");
      return {};
    }
    return { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` };
  }, [accessToken, router]);

  const fetchSuppliers = useCallback(async () => {
    if (!accessToken) {
        if (typeof window !== "undefined" && !localStorage.getItem("access_token")) setLoading(false);
        return;
    }
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      if (!headers["Authorization"]) return;
      const initialResponse = await fetch(`${SUPPLIERS_API_URL}?page=1`, { headers });
      if (initialResponse.status === 401) {
        localStorage.removeItem("access_token");
        setAccessToken(null);
        setCurrentUser(null);
        toast({ title: "Sessiya muddati tugagan", description: "Iltimos, tizimga qaytadan kiring.", variant: "destructive" });
        router.push("/login");
        return;
      }
      if (!initialResponse.ok) throw new Error(`Ma'lumotlarni olishda xatolik: ${initialResponse.statusText}`);
      const initialData = await initialResponse.json();
      const totalCount = initialData.count;
      if (totalCount <= (initialData.results?.length || 0)) {
        setSuppliers(initialData.results || []);
        setLoading(false);
        return;
      }
      const allDataResponse = await fetch(`${SUPPLIERS_API_URL}?page_size=${totalCount}`, { headers });
      if (!allDataResponse.ok) throw new Error(`Barcha ma'lumotlarni olishda xatolik: ${allDataResponse.statusText}`);
      const allData = await allDataResponse.json();
      if (allData && Array.isArray(allData.results)) {
        setSuppliers(allData.results);
      } else {
        setSuppliers([]);
      }
    } catch (error) {
      setSuppliers([]);
      if ((error as Error).message && !(error as Error).message.includes("Avtorizatsiya tokeni mavjud emas.")) {
        toast({ title: "Xatolik", description: (error as Error).message || "Ma'lumotlarni yuklashda muammo yuz berdi", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, router, getAuthHeaders]);

  useEffect(() => { if(accessToken) fetchSuppliers(); }, [accessToken, fetchSuppliers]);

  // --- YANGI: Obyektlar va xarajat turlarini yuklash ---
  useEffect(() => {
    const fetchData = async () => {
        if (!accessToken) return;
        const headers = getAuthHeaders();
        if (!headers["Authorization"]) return;

        // Fetch Expense Types
        try {
            const response = await fetch(`${EXPENSE_TYPES_API_URL}?page_size=1000`, { headers });
            if (!response.ok) return;
            const data = await response.json();
            if (data && Array.isArray(data.results)) setExpenseTypes(data.results);
        } catch (error) { console.error("Xarajat turlarini yuklashda xatolik:", error); }

        // Fetch Objects
        try {
            const response = await fetch(`${OBJECTS_API_URL}?page_size=1000`, { headers });
            if (!response.ok) return;
            const data = await response.json();
            if (data && Array.isArray(data.results)) setObyekts(data.results);
        } catch (error) { console.error("Obyektlarni yuklashda xatolik:", error); }
    };
    if(accessToken) fetchData();
  }, [accessToken, getAuthHeaders]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePaymentFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPaymentFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const formatBalance = (balance: string | number | null | undefined) => {
    const balanceNum = parseFloat(String(balance ?? 0));
    if (isNaN(balanceNum)) return <span className="text-muted-foreground">N/A</span>;
    const formatter = new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    const formatted = formatter.format(balanceNum);
    if (balanceNum >= 0) return <span className="text-green-600">{formatted}</span>;
    else return <span className="text-red-600">{formatted}</span>;
  };
  
  const formatCurrency = (amount: string | number | null | undefined) => {
    const num = parseFloat(String(amount ?? 0));
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(num);
  };
  
  const handleSubmit = async (e: React.FormEvent, action: "save" | "saveAndAdd" | "saveAndContinue") => {
    e.preventDefault();
    if (editId && !canPerformSensitiveActions(currentUser)) {
      toast({ title: "Ruxsat yo'q", description: "Bu amalni bajarish uchun sizda ruxsat yo'q.", variant: "destructive" });
      return;
    }
    const headers = getAuthHeaders();
    if (!headers["Authorization"]) {
      toast({ title: "Xatolik", description: "Avtorizatsiya tokeni topilmadi.", variant: "destructive" });
      return;
    }
    try {
      const url = editId ? `${SUPPLIERS_API_URL}${editId}/` : SUPPLIERS_API_URL;
      const method = editId ? "PUT" : "POST";
      const originalSupplier = editId ? suppliers.find(s => s.id === editId) : null;
      const response = await fetch(url, { method, headers, body: JSON.stringify(formData) });
      if (response.status === 401) { router.push("/login"); return; }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessages = Object.entries(errorData).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join('; ');
        throw new Error(`Saqlashda xatolik: ${errorMessages || response.statusText}`);
      }
      const updatedSupplier = await response.json();

      if (editId && originalSupplier) {
        const changes = [];
        if (originalSupplier.company_name !== formData.company_name) changes.push(`• <b>Kompaniya nomi:</b> <code>${originalSupplier.company_name}</code> → <code>${formData.company_name}</code>`);
        if (originalSupplier.contact_person_name !== formData.contact_person_name) changes.push(`• <b>Mas'ul shaxs:</b> <code>${originalSupplier.contact_person_name}</code> → <code>${formData.contact_person_name}</code>`);
        if (originalSupplier.phone_number !== formData.phone_number) changes.push(`• <b>Telefon:</b> <code>${originalSupplier.phone_number}</code> → <code>${formData.phone_number}</code>`);
        if (changes.length > 0) {
            const message = `<b>✏️🏢 Yetkazib Beruvchi Tahrirlandi</b>\n\n` +
                            `<b>Kim tomonidan:</b> ${currentUser?.fio || 'Noma`lum'}\n` +
                            `<b>Kompaniya:</b> ${originalSupplier.company_name} (ID: ${editId})\n\n` +
                            `<b>Quyidagi ma'lumotlar o'zgartirildi:</b>\n` +
                            changes.join('\n');
            await sendTelegramNotification(message);
        }
        setSuppliers((prev) => prev.map((s) => (s.id === editId ? updatedSupplier : s)));
        toast({ title: "Yangilandi", description: "Yetkazib beruvchi muvaffaqiyatli yangilandi" });
      } else {
        const message = `<b>➕🏢 Yangi Yetkazib Beruvchi Qo'shildi</b>\n\n` +
                        `<b>Kim tomonidan:</b> ${currentUser?.fio || 'Noma`lum'}\n\n` +
                        `<b>Kompaniya:</b> ${formData.company_name}\n` +
                        `<b>Mas'ul shaxs:</b> ${formData.contact_person_name}\n` +
                        `<b>Telefon:</b> ${formData.phone_number}\n` +
                        `<b>Boshlang'ich balans:</b> ${formatBalance(formData.balance).props.children}`;
        await sendTelegramNotification(message);
        setSuppliers((prev) => [updatedSupplier, ...prev]);
        toast({ title: "Qo'shildi", description: "Yangi yetkazib beruvchi qo'shildi" });
      }

      if (action === "save") resetForm();
      else if (action === "saveAndAdd") setFormData({ company_name: "", contact_person_name: "", phone_number: "", address: "", description: "", balance: "0.00" });
      else if (action === "saveAndContinue") toast({ title: "Ma'lumotlar saqlandi", description: "Tahrirni davom ettirishingiz mumkin." });

    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = (id: number) => {
    if (!canPerformSensitiveActions(currentUser)) {
      toast({ title: "Ruxsat yo'q", description: "Bu amalni bajarish uchun sizda ruxsat yo'q.", variant: "destructive" });
      return;
    }
    setDeletingId(id);
    setDeleteCode("");
    setDeleteError("");
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId || !canPerformSensitiveActions(currentUser)) return;
    if (deleteCode !== "7777") { setDeleteError("Noto'g'ri kod kiritildi!"); return; }
    const headers = getAuthHeaders();
    if (!headers["Authorization"]) return;
    
    try {
      const supplierToDelete = suppliers.find(s => s.id === deletingId);
      if (!supplierToDelete) throw new Error("O'chiriladigan yetkazib beruvchi topilmadi.");

      const response = await fetch(`${SUPPLIERS_API_URL}${deletingId}/`, { method: "DELETE", headers });
      if (response.status === 401) { router.push("/login"); return; }
      if (!response.ok && response.status !== 204) throw new Error(`O'chirishda xatolik: ${response.statusText}`);
      
      const message = `<b>❌🏢 Yetkazib Beruvchi O'chirildi</b>\n\n` +
                      `<b>Kim tomonidan:</b> ${currentUser?.fio || 'Noma`lum'}\n` +
                      `<b>O'chirilgan kompaniya:</b> ${supplierToDelete.company_name}\n` +
                      `<b>O'chirish vaqtidagi balansi:</b> ${formatBalance(supplierToDelete.balance).props.children}`;
      await sendTelegramNotification(message);

      setSuppliers((prev) => prev.filter((s) => s.id !== deletingId));
      setDeleteDialogOpen(false);
      toast({ title: "O'chirildi", description: "Yetkazib beruvchi muvaffaqiyatli o'chirildi" });
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleEdit = (supplier: Supplier) => {
    if (!canPerformSensitiveActions(currentUser)) {
      toast({ title: "Ruxsat yo'q", description: "Bu amalni bajarish uchun sizda ruxsat yo'q.", variant: "destructive" });
      return;
    }
    setEditId(supplier.id);
    setFormData({ company_name: supplier.company_name, contact_person_name: supplier.contact_person_name, phone_number: supplier.phone_number, address: supplier.address, description: supplier.description, balance: supplier.balance ?? "0.00" });
    setOpen(true);
  };

  const resetForm = () => {
    setFormData({ company_name: "", contact_person_name: "", phone_number: "", address: "", description: "", balance: "0.00" });
    setEditId(null);
    setOpen(false);
  };

  const openPaymentModal = (supplier: Supplier) => {
    setPayingSupplierId(supplier.id);
    setPayingSupplierName(supplier.company_name);
    setPaymentFormData({ amount: "", description: "" });
    setPaymentModalOpen(true);
  };

  const resetPaymentForm = () => {
    setPaymentModalOpen(false);
    setPayingSupplierId(null);
    setPayingSupplierName("");
    setPaymentFormData({ amount: "", description: "" });
    setPaymentSubmitting(false);
  };
  
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSupplierId || paymentSubmitting) return;
    const headers = getAuthHeaders();
    if (!headers["Authorization"]) return;
    setPaymentSubmitting(true);
    try {
      const amountValue = parseFloat(paymentFormData.amount);
      if (isNaN(amountValue) || amountValue <= 0) throw new Error("Summa musbat raqam bo'lishi kerak.");
      const oldSupplier = suppliers.find(s => s.id === payingSupplierId);
      const oldBalance = parseFloat(oldSupplier?.balance || "0");
      
      const payload = { supplier: payingSupplierId, amount: paymentFormData.amount, payment_type: "naqd", description: paymentFormData.description.trim() };
      const response = await fetch(PAYMENTS_API_URL, { method: "POST", headers, body: JSON.stringify(payload) });
      if (response.status === 401) { router.push("/login"); return; }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`To'lovni saqlashda xatolik: ${Object.values(errorData).join(', ') || response.statusText}`);
      }
      
      const newBalance = oldBalance + amountValue;
      const message = `<b>🟢💰 Yetkazib Beruvchiga To'lov Amalga Oshirildi</b>\n\n` +
                      `<b>Kim tomonidan:</b> ${currentUser?.fio || 'Noma`lum'}\n` +
                      `<b>Yetkazib beruvchi:</b> ${payingSupplierName}\n\n` +
                      `<b>To'lov summasi:</b> +${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountValue)}\n` +
                      `<b>Izoh:</b> ${paymentFormData.description}\n` +
                      `<b>Eski balans:</b> ${formatBalance(oldBalance).props.children}\n` +
                      `<b>Yangi balans:</b> ${formatBalance(newBalance).props.children}`;
      await sendTelegramNotification(message);

      toast({ title: "Muvaffaqiyat", description: "Balans muvaffaqiyatli yangilandi." });
      resetPaymentForm();
      fetchSuppliers();
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const filteredSuppliers = suppliers
    .sort((a, b) => b.id - a.id)
    .filter((supplier) =>
      [supplier.company_name, supplier.contact_person_name, supplier.phone_number]
        .some((field) => field && typeof field === 'string' && field.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const fetchSupplierTransactions = async (supplier: Supplier) => {
    setTransactionsLoading(true);
    setPayingSupplierId(supplier.id);
    try {
      const headers = getAuthHeaders();
      if (!headers["Authorization"]) return;
      const [paymentsResponse, expensesResponse] = await Promise.all([
        fetch(`${PAYMENTS_API_URL}?supplier=${supplier.id}&page_size=1000&ordering=-created_at`, { headers }),
        fetch(`${EXPENSES_API_URL}?supplier=${supplier.id}&page_size=1000&ordering=-date,-id`, { headers })
      ]);
      if (paymentsResponse.status === 401 || expensesResponse.status === 401) { router.push("/login"); return; }
      if (!paymentsResponse.ok || !expensesResponse.ok) throw new Error("Tranzaksiyalarni yuklashda xatolik");
      const [paymentsData, expensesData] = await Promise.all([paymentsResponse.json(), expensesResponse.json()]);
      setSelectedSupplierTransactions({ supplier, payments: paymentsData.results || [], expenses: expensesData.results || [] });
      setTransactionsModalOpen(true);
      setSelectedObjectId(null); // Reset object selection when opening modal
      setSelectedObject(null);
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
    } finally {
      setTransactionsLoading(false);
      setPayingSupplierId(null);
    }
  };

  const getExpenseTypeName = (typeId: number | undefined): string => {
    if (typeId === undefined) return "Noma'lum";
    return expenseTypes.find(type => type.id === typeId)?.name || `ID: ${typeId}`;
  };
  
  // --- YANGI: Obyekt nomini ID orqali topish funksiyasi ---
  const getObyektName = (obyektId: number | undefined | null): string => {
    if (obyektId === undefined || obyektId === null) return "N/A";
    return obyekts.find(obj => obj.id === obyektId)?.name || `ID: ${obyektId}`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Noma'lum sana";
    try { return format(new Date(dateString), "dd.MM.yyyy HH:mm"); } catch { return dateString; }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="border-b sticky top-0 bg-background z-20"><div className="flex h-16 items-center px-4 container mx-auto"><MainNav className="mx-6" /><div className="ml-auto flex items-center space-x-4"><Search /><UserNav /></div></div></header>
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6 container mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 mb-6">
          <h2 className="text-3xl font-bold tracking-tight">Yetkazib beruvchilar</h2>
          <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); else setOpen(true); }}>
            <DialogTrigger asChild><Button onClick={() => { setEditId(null); setFormData({ company_name: "", contact_person_name: "", phone_number: "", address: "", description: "", balance: "0.00" }); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Yangi yetkazib beruvchi</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
              <DialogHeader><DialogTitle>{editId ? "Tahrirlash" : "Yangi yetkazib beruvchi"}</DialogTitle><DialogDescription>Ma'lumotlarni kiriting. * majburiy.</DialogDescription></DialogHeader>
              <form onSubmit={(e) => handleSubmit(e, editId ? "save" : "saveAndAdd")} className="flex-1 overflow-y-auto pr-4 pl-1 -mr-2">
                <div className="grid gap-4 py-4">
                  <div className="space-y-1.5"><Label htmlFor="company_name">Kompaniya nomi *</Label><Input id="company_name" name="company_name" value={formData.company_name} onChange={handleChange} required /></div>
                  <div className="space-y-1.5"><Label htmlFor="contact_person_name">Aloqa shaxsi *</Label><Input id="contact_person_name" name="contact_person_name" value={formData.contact_person_name} onChange={handleChange} required /></div>
                  <div className="space-y-1.5"><Label htmlFor="phone_number">Telefon *</Label><Input id="phone_number" name="phone_number" value={formData.phone_number} onChange={handleChange} required type="tel" /></div>
                  <div className="space-y-1.5"><Label htmlFor="address">Manzil *</Label><Input id="address" name="address" value={formData.address} onChange={handleChange} required /></div>
                  <div className="space-y-1.5"><Label htmlFor="description">Tavsif</Label><Textarea id="description" name="description" value={formData.description} onChange={handleChange} /></div>
                  <div className="space-y-1.5"><Label htmlFor="balance">Balans ($)</Label><Input id="balance" name="balance" type="number" step="0.01" value={formData.balance} onChange={handleChange} readOnly /></div>
                </div>
                <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 space-y-2 sm:space-y-0 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={resetForm}>Bekor qilish</Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={!formData.company_name || !formData.phone_number || paymentSubmitting}>{editId ? "Saqlash" : "Qo'shish"}</Button>
                  {!editId && <Button type="button" onClick={(e) => handleSubmit(e, "saveAndAdd")} variant="secondary" disabled={!formData.company_name || !formData.phone_number || paymentSubmitting}>Saqlash va Yana</Button>}
                  {editId && <Button type="button" onClick={(e) => handleSubmit(e, "saveAndContinue")} variant="secondary" disabled={!formData.company_name || !formData.phone_number || paymentSubmitting}>Saqlash va Davom Ettirish</Button>}
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Tabs defaultValue="suppliers" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1 mb-4"><TabsTrigger value="suppliers">Yetkazib beruvchilar Ro'yxati</TabsTrigger></TabsList>
          <TabsContent value="suppliers">
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2"><Input placeholder="Qidirish..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />{searchTerm && <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>Tozalash</Button>}</div>
                  {loading ? <div className="flex items-center justify-center h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-3">Yuklanmoqda...</p></div> : (
                    <div className="rounded-md border overflow-x-auto relative">
                      <Table>
                        <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Kompaniya</TableHead><TableHead>Shaxs</TableHead><TableHead>Telefon</TableHead><TableHead className="text-right">Balans</TableHead><TableHead className="text-right w-[200px] sticky right-0 bg-background z-[1]">Amallar</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {filteredSuppliers.length > 0 ? filteredSuppliers.map((supplier) => (
                            <TableRow key={supplier.id}>
                              <TableCell>{supplier.id}</TableCell>
                              <TableCell>{supplier.company_name}</TableCell>
                              <TableCell>{supplier.contact_person_name}</TableCell>
                              <TableCell>{supplier.phone_number}</TableCell>
                              <TableCell className="text-right">{formatBalance(supplier.balance)}</TableCell>
                              <TableCell className="text-right sticky right-0 bg-card z-[1]">
                                <div className="flex justify-end space-x-1">
                                  <Button variant="ghost" size="icon" title="Tranzaksiyalar" onClick={() => fetchSupplierTransactions(supplier)} disabled={transactionsLoading && payingSupplierId === supplier.id}>
                                    {transactionsLoading && payingSupplierId === supplier.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4 text-blue-500" />}
                                  </Button>
                                  <Button variant="ghost" size="icon" title="Balans to'ldirish" onClick={() => openPaymentModal(supplier)}>
                                    <CreditCard className="h-4 w-4 text-green-500" />
                                  </Button>
                                  {canPerformSensitiveActions(currentUser) && (
                                    <>
                                      <Button variant="ghost" size="icon" title="Tahrirlash" onClick={() => handleEdit(supplier)}>
                                        <Edit className="h-4 w-4 text-yellow-500" />
                                      </Button>
                                      <Button variant="ghost" size="icon" title="O'chirish" onClick={() => handleDelete(supplier.id)}>
                                        <Trash className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )) : <TableRow><TableCell colSpan={6} className="h-24 text-center">Yetkazib beruvchi topilmadi.</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* --- YANGILANDI: TRANZAKSIYALAR OYNASI (MODAL) --- */}
        <Dialog open={transactionsModalOpen} onOpenChange={(isOpen) => {
          setTransactionsModalOpen(isOpen);
          if (!isOpen) {
            setSelectedObjectId(null);
            setSelectedObject(null);
          }
        }}>
          <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{selectedSupplierTransactions.supplier?.company_name} - Operatsiyalar</DialogTitle>
              {selectedSupplierTransactions.supplier && <DialogDescription>Joriy balans: {formatBalance(selectedSupplierTransactions.supplier.balance)}</DialogDescription>}
            </DialogHeader>
            {transactionsLoading ? (
              <div className="flex items-center justify-center h-60"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto py-4 pr-2">
                {/* Obyektlar ro'yxati */}
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-3">Obyektlar</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    <Button 
                      variant={selectedObjectId === null ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => {
                        setSelectedObjectId(null);
                        setSelectedObject(null);
                      }}
                      className="h-auto py-2 px-3 text-xs"
                    >
                      Barchasi
                    </Button>
                    {obyekts.map((obj) => (
                      <Button 
                        key={obj.id}
                        variant={selectedObjectId === obj.id ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => {
                          setSelectedObjectId(obj.id);
                          setSelectedObject(obj);
                        }}
                        className="h-auto py-2 px-3 text-xs"
                      >
                        {obj.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Tranzaksiyalar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-lg">Xarajatlar</h3>
                      <div className="text-sm font-medium">
                        Jami: {formatCurrency(
                          (selectedSupplierTransactions.expenses || [])
                            .filter(exp => selectedObjectId === null || exp.object === selectedObjectId)
                            .reduce((sum, exp) => sum + parseFloat(exp.amount || "0"), 0)
                        )}
                      </div>
                    </div>
                    <div className="rounded-md border max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sana</TableHead>
                            <TableHead>Obyekt</TableHead>
                            <TableHead>Turi</TableHead>
                            <TableHead className="text-right">Summa</TableHead>
                            <TableHead>Izoh</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedSupplierTransactions.expenses && selectedSupplierTransactions.expenses.length > 0 ? (
                            selectedSupplierTransactions.expenses
                              .filter(exp => selectedObjectId === null || exp.object === selectedObjectId)
                              .map((exp) => (
                                <TableRow key={exp.id}>
                                  <TableCell>{formatDate(exp.date || exp.created_at)}</TableCell>
                                  <TableCell>{getObyektName(exp.object)}</TableCell>
                                  <TableCell>{getExpenseTypeName(exp.expense_type)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(exp.amount)}</TableCell>
                                  <TableCell>{exp.comment || exp.description}</TableCell>
                                </TableRow>
                              ))
                          ) : (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center">Xarajatlar yo'q</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-lg">To'lovlar</h3>
                      <div className="text-sm font-medium">
                        Jami: {formatCurrency(
                          (selectedSupplierTransactions.payments || [])
                            .filter(p => selectedObjectId === null || p.object === selectedObjectId)
                            .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0)
                        )}
                      </div>
                    </div>
                    <div className="rounded-md border max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sana</TableHead>
                            <TableHead>Obyekt</TableHead>
                            <TableHead>Turi</TableHead>
                            <TableHead className="text-right">Summa</TableHead>
                            <TableHead>Izoh</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedSupplierTransactions.payments && selectedSupplierTransactions.payments.length > 0 ? (
                            selectedSupplierTransactions.payments
                              .filter(p => selectedObjectId === null || p.object === selectedObjectId)
                              .map((p) => (
                                <TableRow key={p.id}>
                                  <TableCell>{formatDate(p.created_at)}</TableCell>
                                  <TableCell>{getObyektName(p.object)}</TableCell>
                                  <TableCell>{p.payment_type}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(p.amount)}</TableCell>
                                  <TableCell>{p.description}</TableCell>
                                </TableRow>
                              ))
                          ) : (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center">To'lovlar yo'q</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter><Button variant="outline" onClick={() => {
              setTransactionsModalOpen(false);
              setSelectedObjectId(null);
              setSelectedObject(null);
            }}>Yopish</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>O'chirishni tasdiqlang</DialogTitle><DialogDescription>"{suppliers.find(s=>s.id===deletingId)?.company_name}"ni o'chirish uchun "7777" kodini kiriting.</DialogDescription></DialogHeader><div className="py-4"><Label htmlFor="delete_code">Maxsus kod</Label><Input id="delete_code" type="password" value={deleteCode} onChange={(e) => {setDeleteCode(e.target.value); setDeleteError("");}}/>{deleteError && <p className="text-sm text-red-500 pt-1">{deleteError}</p>}</div><DialogFooter><Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Bekor qilish</Button><Button variant="destructive" onClick={confirmDelete} disabled={deleteCode !== "7777"}>O'chirish</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Balans to'ldirish: {payingSupplierName}</DialogTitle>
              <DialogDescription>To'lov ma'lumotlarini kiriting.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePaymentSubmit}>
              <div className="py-4">
                <Label htmlFor="payment_amount">Summa ($) *</Label>
                <Input 
                  id="payment_amount" 
                  name="amount" 
                  type="number" 
                  value={paymentFormData.amount} 
                  onChange={handlePaymentFormChange} 
                  required 
                  min="0.01"
                  step="0.01"
                />
                <Label htmlFor="payment_description">Tavsif *</Label>
                <Textarea 
                  id="payment_description" 
                  name="description" 
                  value={paymentFormData.description} 
                  onChange={handlePaymentFormChange} 
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetPaymentForm}>Bekor</Button>
                <Button type="submit" disabled={!paymentFormData.amount || paymentSubmitting}>
                  {paymentSubmitting && <Loader2 className="animate-spin mr-2"/>}
                  Qo'shish
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
      <footer className="border-t py-4 text-center text-sm text-muted-foreground mt-auto bg-background"><div className="container mx-auto">Version 1.1 | Ahlan Group LLC © {new Date().getFullYear()}</div></footer>
    </div>
  );
};

export default SuppliersPage;