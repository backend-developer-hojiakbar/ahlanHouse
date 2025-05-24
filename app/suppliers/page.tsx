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
import { toast } from "@/hooks/use-toast"; // shadcn/ui toast
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

// Backenddan kelgan ma'lumotlarga mos interfeys
interface Supplier {
  id: number;
  company_name: string;
  contact_person_name: string;
  phone_number: string;
  address: string;
  description: string;
  balance: string;
}

// To'lov formasi uchun interfeys
interface PaymentFormData {
  amount: string;
  description: string;
}

// Yangi interfeyslar
interface Payment {
  id: number;
  supplier: number;
  amount: string;
  payment_type: string;
  description: string;
  created_at: string;
}

interface Expense {
  id: number;
  supplier: number;
  amount: string;
  description: string; // Backendda 'comment' bo'lishi mumkin, moslashtiring
  created_at: string;
  expense_type: number;
  // Quyidagilar ExpensesPage dan olingan, kerak bo'lsa
  // date: string;
  // supplier_name: string;
  // comment: string;
  // expense_type_name: string;
  // object: number;
  // object_name?: string;
  // status: string;
}

interface ExpenseType {
  id: number;
  name: string;
}

// Foydalanuvchi ma'lumotlari uchun interfeys (ExpensesPage dan)
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
  // const [userType, setUserType] = useState<string | null>(null); // O'ZGARTIRILDI
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null); // QO'SHILDI

  // Balans qo'shish modali uchun state'lar
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payingSupplierId, setPayingSupplierId] = useState<number | null>(null);
  const [payingSupplierName, setPayingSupplierName] = useState<string>("");
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    amount: "",
    description: "",
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Yangi state'lar
  const [activeTab, setActiveTab] = useState("suppliers");
  const [selectedSupplierTransactions, setSelectedSupplierTransactions] = useState<{
    supplier: Supplier | null;
    payments: Payment[];
    expenses: Expense[];
  }>({
    supplier: null,
    payments: [],
    expenses: [],
  });
  const [transactionsModalOpen, setTransactionsModalOpen] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Yangi state xarajat turlari uchun
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);

  const API_BASE_URL = "http://api.ahlan.uz";
  const SUPPLIERS_API_URL = `${API_BASE_URL}/suppliers/`;
  const PAYMENTS_API_URL = `${API_BASE_URL}/supplier-payments/`;
  const EXPENSES_API_URL = `${API_BASE_URL}/expenses/`;
  const EXPENSE_TYPES_API_URL = `${API_BASE_URL}/expense-types/`;

  // Foydalanuvchi ma'lumotlarini olish va cheklov funksiyasi
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast({
          title: "Avtorizatsiya xatosi",
          description: "Iltimos, tizimga qaytadan kiring.",
          variant: "destructive",
        });
        router.push("/login");
      } else {
        setAccessToken(token);
        const userTypeFromStorage = localStorage.getItem("user_type");
        const userFioFromStorage = localStorage.getItem("user_fio");

        if (userTypeFromStorage && userFioFromStorage) {
          setCurrentUser({
            user_type: userTypeFromStorage as CurrentUser['user_type'],
            fio: userFioFromStorage,
          });
        } else {
          console.warn("Foydalanuvchi user_type yoki fio localStorage da topilmadi. Cheklovlar ishlamasligi mumkin.");
          setCurrentUser(null);
          // Agar ma'lumot topilmasa, login'ga yo'naltirish mumkin
          // toast({ title: "Xatolik", description: "Foydalanuvchi ma'lumotlari topilmadi. Iltimos, qayta kiring.", variant: "destructive" });
          // router.push("/login");
        }
      }
    }
  }, [router]);

  // Sezgir amallar uchun ruxsatni tekshirish funksiyasi (ExpensesPage dan)
  const canPerformSensitiveActions = useCallback((user: CurrentUser | null): boolean => {
    if (!user) {
      return false; // Agar foydalanuvchi ma'lumoti yo'q bo'lsa, ruxsat yo'q
    }
    const isRestrictedRole = user.user_type === 'sotuvchi' || user.user_type === 'buxgalter';
    const hasSardorInFio = user.fio.toLowerCase().includes('sardor');

    if (isRestrictedRole || hasSardorInFio) {
      return false; // Ruxsat yo'q
    }
    return true; // Ruxsat bor (admin va boshqa cheklanmaganlar uchun)
  }, []);


  // Autentifikatsiya sarlavhalari
  const getAuthHeaders = useCallback(() => {
    if (!accessToken) {
      console.error("Access token is not available for API call");
      if (typeof window !== "undefined") {
        if (!localStorage.getItem("access_token")) {
          router.push("/login");
        }
      }
      return {};
    }
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    };
  }, [accessToken, router]);

  // Ma'lumotlarni API dan olish (GET)
  const fetchSuppliers = useCallback(async () => {
    if (!accessToken) {
      if (typeof window !== "undefined" && !localStorage.getItem("access_token")) {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const headers = getAuthHeaders();
      if (!headers["Authorization"]) {
        // router.push("/login"); // getAuthHeaders ichida allaqachon bor
        return;
      }

      const initialResponse = await fetch(`${SUPPLIERS_API_URL}?page=1`, {
        method: "GET",
        headers: headers,
      });

      if (initialResponse.status === 401) {
        localStorage.removeItem("access_token");
        setAccessToken(null);
        setCurrentUser(null); // Foydalanuvchini tozalash
        toast({
          title: "Sessiya muddati tugagan",
          description: "Iltimos, tizimga qaytadan kiring.",
          variant: "destructive",
        });
        router.push("/login");
        return;
      }

      if (!initialResponse.ok) throw new Error(`Ma'lumotlarni olishda xatolik: ${initialResponse.statusText}`);
      
      const initialData = await initialResponse.json();
      const totalCount = initialData.count; 

      if (totalCount <= (initialData.results?.length || 0)) {
        setSuppliers(initialData.results || []);
        setLoading(false); // Return qilganda finally bloki ishlamaydi
        return;
      }

      const allDataResponse = await fetch(`${SUPPLIERS_API_URL}?page_size=${totalCount}`, {
        method: "GET",
        headers: headers,
      });

      if (!allDataResponse.ok) throw new Error(`Barcha ma'lumotlarni olishda xatolik: ${allDataResponse.statusText}`);
      
      const allData = await allDataResponse.json();

      if (allData && Array.isArray(allData.results)) {
        setSuppliers(allData.results);
      } else {
        console.error("API dan kutilmagan formatdagi ma'lumot keldi:", allData);
        setSuppliers([]);
        toast({ title: "Xatolik", description: "API ma'lumotlari noto'g'ri formatda", variant: "destructive" });
      }
    } catch (error) {
      console.error("Xatolik:", error);
      setSuppliers([]);
      if ((error as Error).message && !(error as Error).message.includes("Avtorizatsiya tokeni mavjud emas.")) {
        toast({ title: "Xatolik", description: (error as Error).message || "Ma'lumotlarni yuklashda muammo yuz berdi", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, router, getAuthHeaders]);

  useEffect(() => {
    if(accessToken) { // Token mavjud bo'lsagina yuklash
        fetchSuppliers();
    }
  }, [accessToken, fetchSuppliers]); // accessToken ni dependency ga qo'shdik

  // Xarajat turlarini olish uchun useEffect
  useEffect(() => {
    const fetchExpenseTypes = async () => {
      if (!accessToken) return;
      try {
        const headers = getAuthHeaders();
        if (!headers["Authorization"]) return;

        const response = await fetch(`${EXPENSE_TYPES_API_URL}?page_size=1000`, {
          headers: headers,
        });

        if (!response.ok) {
          console.error("Xarajat turlarini yuklashda xatolik");
          return;
        }

        const data = await response.json();
        if (data && Array.isArray(data.results)) {
          setExpenseTypes(data.results);
        }
      } catch (error) {
        console.error("Xarajat turlarini yuklashda xatolik:", error);
      }
    };
    if(accessToken) { // Token mavjud bo'lsagina yuklash
        fetchExpenseTypes();
    }
  }, [accessToken, getAuthHeaders]);

  // Formadagi o'zgarishlarni boshqarish
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // To'lov formasi o'zgarishlarini boshqarish
  const handlePaymentFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPaymentFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Yetkazib beruvchi qo'shish yoki tahrirlash (POST yoki PUT)
  const handleSubmit = async (e: React.FormEvent, action: "save" | "saveAndAdd" | "saveAndContinue") => {
    e.preventDefault();
    // Yangi qo'shishda yoki tahrirlashda ruxsatni tekshirish
    if (editId && !canPerformSensitiveActions(currentUser)) {
        toast({ title: "Ruxsat yo'q", description: "Bu amalni bajarish uchun sizda ruxsat yo'q.", variant: "destructive" });
        return;
    }
    // Yangi qo'shish uchun cheklov yo'q, shuning uchun editId bo'lmaganda tekshirilmaydi

    const headers = getAuthHeaders();
    if (!headers["Authorization"]) {
      toast({ title: "Xatolik", description: "Avtorizatsiya tokeni topilmadi.", variant: "destructive" });
      return;
    }
    try {
      const url = editId ? `${SUPPLIERS_API_URL}${editId}/` : SUPPLIERS_API_URL;
      const method = editId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: headers,
        body: JSON.stringify(formData),
      });

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        setAccessToken(null);
        setCurrentUser(null);
        toast({ title: "Sessiya muddati tugagan", description: "Iltimos, tizimga qaytadan kiring.", variant: "destructive" });
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Saqlash xatosi:", errorData);
        const errorMessages = Object.entries(errorData).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join('; ');
        throw new Error(`Saqlashda xatolik: ${response.statusText}. ${errorMessages || ''}`);
      }

      const updatedSupplier = await response.json();

      if (editId) {
        setSuppliers((prev) =>
          prev.map((supplier) => (supplier.id === editId ? updatedSupplier : supplier))
        );
        toast({ title: "Yangilandi", description: "Yetkazib beruvchi muvaffaqiyatli yangilandi" });
      } else {
        setSuppliers((prev) => [updatedSupplier, ...prev]);
        toast({ title: "Qo'shildi", description: "Yangi yetkazib beruvchi qo'shildi" });
      }

      if (action === "save") {
        resetForm();
      } else if (action === "saveAndAdd") {
        setFormData({
          company_name: "",
          contact_person_name: "",
          phone_number: "",
          address: "",
          description: "",
          balance: "0.00",
        });
        setEditId(null);
      } else if (action === "saveAndContinue" && editId) {
        // Ma'lumotlar allaqachon yangilangan, forma o'sha holatda qoladi
        toast({ title: "Ma'lumotlar saqlandi", description: "Tahrirni davom ettirishingiz mumkin." });
      } else if (action === "saveAndContinue" && !editId) { // Bu aslida saveAndAdd bilan bir xil, lekin id ni saqlab qoladi
        setFormData({
          company_name: updatedSupplier.company_name,
          contact_person_name: updatedSupplier.contact_person_name,
          phone_number: updatedSupplier.phone_number,
          address: updatedSupplier.address,
          description: updatedSupplier.description,
          balance: updatedSupplier.balance,
        });
        setEditId(updatedSupplier.id);
        setOpen(true); // Dialogni ochiq qoldirish
        toast({ title: "Ma'lumotlar saqlandi", description: "Endi tahrirlashingiz mumkin." });
      }

    } catch (error) {
      console.error("Xatolik:", error);
      toast({ title: "Xatolik", description: (error as Error).message || "Ma'lumotlarni saqlashda muammo yuz berdi", variant: "destructive" });
    }
  };

  // O'chirish uchun state'lar
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");

  // Yetkazib beruvchini o'chirish (DELETE)
  const handleDelete = async (id: number) => {
    if (!canPerformSensitiveActions(currentUser)) {
        toast({ title: "Ruxsat yo'q", description: "Bu amalni bajarish uchun sizda ruxsat yo'q.", variant: "destructive" });
        return;
    }
    setDeletingId(id);
    setDeleteCode("");
    setDeleteError("");
    setDeleteDialogOpen(true);
  };

  // O'chirish kodini tekshirish va o'chirish
  const confirmDelete = async () => {
    if (!deletingId) return;
    if (!canPerformSensitiveActions(currentUser)) { // Double check
        toast({ title: "Ruxsat yo'q", description: "Bu amalni bajarish uchun sizda ruxsat yo'q.", variant: "destructive" });
        setDeleteDialogOpen(false);
        return;
    }
    
    if (deleteCode !== "7777") {
      setDeleteError("Noto'g'ri kod kiritildi!");
      return;
    }

    const headers = getAuthHeaders();
    if (!headers["Authorization"]) {
      toast({ title: "Xatolik", description: "Avtorizatsiya tokeni topilmadi.", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`${SUPPLIERS_API_URL}${deletingId}/`, {
        method: "DELETE",
        headers: headers,
      });

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        setAccessToken(null);
        setCurrentUser(null);
        toast({ title: "Sessiya muddati tugagan", description: "Iltimos, tizimga qaytadan kiring.", variant: "destructive" });
        router.push("/login");
        return;
      }

      if (!response.ok && response.status !== 204) { // 204 No Content ham OK
        const errorData = await response.json().catch(() => ({}));
        console.error("O'chirish xatosi:", errorData);
        throw new Error(`O'chirishda xatolik: ${response.statusText} ${JSON.stringify(errorData)}`);
      }
      setSuppliers((prev) => prev.filter((supplier) => supplier.id !== deletingId));
      setDeleteDialogOpen(false);
      toast({ title: "O'chirildi", description: "Yetkazib beruvchi muvaffaqiyatli o'chirildi" });
    } catch (error) {
      console.error("Xatolik:", error);
      toast({ title: "Xatolik", description: (error as Error).message || "O'chirishda muammo yuz berdi", variant: "destructive" });
    }
  };

  // Tahrirlash uchun formani to'ldirish
  const handleEdit = (supplier: Supplier) => {
    if (!canPerformSensitiveActions(currentUser)) {
        toast({ title: "Ruxsat yo'q", description: "Bu amalni bajarish uchun sizda ruxsat yo'q.", variant: "destructive" });
        return;
    }
    setEditId(supplier.id);
    setFormData({
      company_name: supplier.company_name,
      contact_person_name: supplier.contact_person_name,
      phone_number: supplier.phone_number,
      address: supplier.address,
      description: supplier.description,
      balance: supplier.balance ?? "0.00",
    });
    setOpen(true);
  };

  // Formani tozalash va modalni yopish
  const resetForm = () => {
    setFormData({
      company_name: "",
      contact_person_name: "",
      phone_number: "",
      address: "",
      description: "",
      balance: "0.00",
    });
    setEditId(null);
    setOpen(false);
  };

  // Balans qo'shish modalini ochish
  const openPaymentModal = (supplier: Supplier) => {
    // Balans qo'shish uchun cheklov yo'q
    setPayingSupplierId(supplier.id);
    setPayingSupplierName(supplier.company_name);
    setPaymentFormData({ amount: "", description: "" });
    setPaymentModalOpen(true);
  };

  // Balans qo'shish modalini yopish va tozalash
  const resetPaymentForm = () => {
    setPaymentModalOpen(false);
    setPayingSupplierId(null);
    setPayingSupplierName("");
    setPaymentFormData({ amount: "", description: "" });
    setPaymentSubmitting(false);
  };

  // Balans qo'shish (to'lov) (POST)
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSupplierId || paymentSubmitting) return;
    // Balans qo'shish uchun cheklov yo'q

    const headers = getAuthHeaders();
    if (!headers["Authorization"]) {
      toast({ title: "Xatolik", description: "Avtorizatsiya tokeni topilmadi.", variant: "destructive" });
      return;
    }

    setPaymentSubmitting(true);

    try {
      const amountValue = parseFloat(paymentFormData.amount);
      if (isNaN(amountValue) || amountValue <=0) { // <=0 tekshiruvi qo'shildi
        throw new Error("Summa musbat raqam bo'lishi kerak.");
      }

      const payload = {
        supplier: payingSupplierId,
        amount: paymentFormData.amount,
        payment_type: "naqd", // yoki boshqa tur kerak bo'lsa
        description: paymentFormData.description.trim(),
      };

      const response = await fetch(PAYMENTS_API_URL, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        setAccessToken(null);
        setCurrentUser(null);
        toast({ title: "Sessiya muddati tugagan", description: "Iltimos, tizimga qaytadan kiring.", variant: "destructive" });
        router.push("/login");
        resetPaymentForm(); // Tozalash
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("To'lov xatosi:", errorData);
        const errorMessages = Object.entries(errorData).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join('; ');
        throw new Error(`To'lovni saqlashda xatolik: ${response.statusText}. ${errorMessages || ''}`);
      }

      await response.json(); // Javobni o'qish (kerak bo'lsa)

      toast({ title: "Muvaffaqiyat", description: "Balans muvaffaqiyatli yangilandi." });
      resetPaymentForm();
      fetchSuppliers(); // Yetkazib beruvchilar ro'yxatini yangilash

    } catch (error) {
      console.error("To'lov xatosi:", error);
      toast({ title: "Xatolik", description: (error as Error).message || "Balansni yangilashda muammo yuz berdi", variant: "destructive" });
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Qidiruv bo'yicha filtrlangan va tartiblangan yetkazib beruvchilar
  const filteredSuppliers = suppliers
    .sort((a, b) => b.id - a.id) // ID bo'yicha kamayish tartibida saralash (yangilari tepada)
    .filter((supplier) =>
      [
        supplier.company_name,
        supplier.contact_person_name,
        supplier.phone_number,
      ].some(
        (field) =>
          field &&
          typeof field === 'string' &&
          field.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

  // Balansni formatlash
  const formatBalance = (balance: string | number | null | undefined) => {
    const balanceNum = parseFloat(String(balance ?? 0));
    if (isNaN(balanceNum)) {
      return <span className="text-muted-foreground">N/A</span>;
    }
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const formatted = formatter.format(balanceNum);
    if (balanceNum >= 0) {
      return <span className="text-green-600">{formatted}</span>;
    } else {
      return <span className="text-red-600">{formatted}</span>;
    }
  };

  // Xarajatlar va to'lovlarni olish uchun funksiya
  const fetchSupplierTransactions = async (supplier: Supplier) => {
    setTransactionsLoading(true);
    setPayingSupplierId(supplier.id); // Loader ko'rsatish uchun
    try {
      const headers = getAuthHeaders();
      if (!headers["Authorization"]) {
        toast({
          title: "Xatolik",
          description: "Avtorizatsiya tokeni topilmadi",
          variant: "destructive",
        });
        return;
      }

      const [paymentsResponse, expensesResponse] = await Promise.all([
        fetch(
          `${PAYMENTS_API_URL}?supplier=${supplier.id}&page_size=1000&ordering=-created_at`, // Saralash qo'shildi
          { headers: headers }
        ),
        fetch(
          `${EXPENSES_API_URL}?supplier=${supplier.id}&page_size=1000&ordering=-date,-id`, // Saralash qo'shildi (ExpensesPage dagi kabi)
          { headers: headers }
        )
      ]);

      if (paymentsResponse.status === 401 || expensesResponse.status === 401) {
        localStorage.removeItem("access_token");
        setAccessToken(null);
        setCurrentUser(null);
        toast({
          title: "Sessiya muddati tugagan",
          description: "Iltimos, tizimga qaytadan kiring.",
          variant: "destructive",
        });
        router.push("/login");
        return;
      }

      if (!paymentsResponse.ok) {
        const errorData = await paymentsResponse.json().catch(() => ({detail: "To'lovlar server xatosi"}));
        throw new Error(`To'lovlarni yuklashda xatolik: ${errorData.detail || paymentsResponse.statusText}`);
      }
      if (!expensesResponse.ok) {
         const errorData = await expensesResponse.json().catch(() => ({detail: "Xarajatlar server xatosi"}));
        throw new Error(`Xarajatlarni yuklashda xatolik: ${errorData.detail || expensesResponse.statusText}`);
      }

      const [paymentsData, expensesData] = await Promise.all([
        paymentsResponse.json(),
        expensesResponse.json()
      ]);

      setSelectedSupplierTransactions({
        supplier,
        payments: paymentsData.results || [],
        expenses: expensesData.results || []
      });
      setTransactionsModalOpen(true);

    } catch (error) {
      console.error("Xatolik:", error);
      toast({
        title: "Xatolik",
        description: (error as Error).message || "Ma'lumotlarni yuklashda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setTransactionsLoading(false);
      setPayingSupplierId(null); // Loader uchun tozalash
    }
  };

  // Xarajat turi nomini topish funksiyasi
  const getExpenseTypeName = (typeId: number | undefined): string => {
    if (typeId === undefined) return "Noma'lum";
    const foundType = expenseTypes.find(type => type.id === typeId);
    return foundType ? foundType.name : `ID: ${typeId}`;
  };

  // Sanani formatlash uchun funksiya
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Noma'lum sana";
    try {
      return format(new Date(dateString), "dd.MM.yyyy HH:mm");
    } catch {
      return dateString; // Agar formatlashda xato bo'lsa, asl qiymatni qaytarish
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="border-b sticky top-0 bg-background z-20"> {/* z-index oshirildi */}
        <div className="flex h-16 items-center px-4 container mx-auto">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav />
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6 container mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 mb-6">
          <h2 className="text-3xl font-bold tracking-tight">Yetkazib beruvchilar</h2>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { 
                setEditId(null); 
                setFormData({ company_name: "", contact_person_name: "", phone_number: "", address: "", description: "", balance: "0.00" }); 
                setOpen(true); 
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Yangi yetkazib beruvchi
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {editId ? "Yetkazib beruvchini tahrirlash" : "Yangi yetkazib beruvchi"}
                </DialogTitle>
                <DialogDescription>
                  Yetkazib beruvchi ma'lumotlarini kiriting yoki yangilang. Majburiy maydonlar (*) bilan belgilangan.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => handleSubmit(e, editId ? "save" : "saveAndAdd")} className="flex-1 overflow-y-auto pr-4 pl-1 -mr-2"> {/* action o'zgartirildi */}
                <div className="grid gap-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="company_name">Kompaniya nomi *</Label>
                    <Input id="company_name" name="company_name" value={formData.company_name} onChange={handleChange} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact_person_name">Aloqa shaxsi *</Label>
                    <Input id="contact_person_name" name="contact_person_name" value={formData.contact_person_name} onChange={handleChange} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone_number">Telefon *</Label>
                    <Input id="phone_number" name="phone_number" value={formData.phone_number} onChange={handleChange} required type="tel" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="address">Manzil *</Label>
                    <Input id="address" name="address" value={formData.address} onChange={handleChange} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="description">Tavsif (Ixtiyoriy)</Label>
                    <Textarea id="description" name="description" value={formData.description} onChange={handleChange} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="balance">Balans ($)</Label>
                    <Input id="balance" name="balance" type="number" step="0.01" value={formData.balance} onChange={handleChange} 
                           readOnly // Balans faqat to'lov orqali o'zgaradi
                           title="Balans faqat 'Balans to'ldirish' orqali o'zgaradi" 
                    />
                  </div>
                </div>
              <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 space-y-2 sm:space-y-0 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={resetForm}>Bekor qilish</Button>
                  <Button
                    type="submit" // Asosiy saqlash tugmasi
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={!formData.company_name || !formData.contact_person_name || !formData.phone_number || !formData.address || paymentSubmitting}
                  >
                    {paymentSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editId ? "Saqlash" : "Qo'shish"}
                  </Button>
                 {!editId && ( // Faqat yangi qo'shishda ko'rinadi
                    <Button
                      type="button" // Buni alohida handle qilish kerak yoki onSubmitda actionni o'zgartirish
                      onClick={(e) => handleSubmit(e, "saveAndAdd")}
                      variant="secondary"
                      disabled={!formData.company_name || !formData.contact_person_name || !formData.phone_number || !formData.address || paymentSubmitting}
                    >
                      {paymentSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Saqlash va Yana Qo'shish
                    </Button>
                  )}
                   {editId && ( // Faqat tahrirda ko'rinadi
                    <Button
                      type="button"
                      onClick={(e) => handleSubmit(e, "saveAndContinue")}
                      variant="secondary"
                      disabled={!formData.company_name || !formData.contact_person_name || !formData.phone_number || !formData.address || paymentSubmitting}
                    >
                       {paymentSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Saqlash va Tahrirni Davom Ettirish
                    </Button>
                  )}
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="suppliers" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1 mb-4"> {/* Faqat bitta tab */}
            <TabsTrigger value="suppliers">Yetkazib beruvchilar Ro'yxati</TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers">
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Kompaniya, shaxs, telefon bo'yicha qidirish..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                    {searchTerm && (
                      <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>
                        Tozalash
                      </Button>
                    )}
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center h-[400px]">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="ml-3 text-muted-foreground">Yetkazib beruvchilar yuklanmoqda...</p>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto relative">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">ID</TableHead>
                            <TableHead>Kompaniya nomi</TableHead>
                            <TableHead>Aloqa shaxsi</TableHead>
                            <TableHead>Telefon</TableHead>
                            <TableHead className="text-right">Balans</TableHead>
                            <TableHead className="text-right w-[200px] sticky right-0 bg-background z-[1]">Amallar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSuppliers.length > 0 ? (
                            filteredSuppliers.map((supplier) => (
                              <TableRow key={supplier.id}>
                                <TableCell className="font-medium">{supplier.id}</TableCell>
                                <TableCell>{supplier.company_name}</TableCell>
                                <TableCell>{supplier.contact_person_name}</TableCell>
                                <TableCell>{supplier.phone_number}</TableCell>
                                <TableCell className="text-right">{formatBalance(supplier.balance)}</TableCell>
                                <TableCell className="text-right sticky right-0 bg-card z-[1]"> {/* bg-card yaxshiroq ko'rinishi uchun */}
                                  <div className="flex justify-end space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Xarajatlar va to'lovlarni ko'rish"
                                      onClick={() => fetchSupplierTransactions(supplier)}
                                      disabled={transactionsLoading && payingSupplierId === supplier.id}
                                    >
                                      {transactionsLoading && payingSupplierId === supplier.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4 text-blue-500" />}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Balans to'ldirish"
                                      onClick={() => openPaymentModal(supplier)}
                                    >
                                      <CreditCard className="h-4 w-4 text-green-500" />
                                    </Button>
                                    {canPerformSensitiveActions(currentUser) && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          title="Tahrirlash"
                                          onClick={() => handleEdit(supplier)}
                                        >
                                          <Edit className="h-4 w-4 text-yellow-500" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          title="O'chirish"
                                          onClick={() => handleDelete(supplier.id)}
                                        >
                                          <Trash className="h-4 w-4 text-red-500 hover:text-red-600" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                {searchTerm ? "Qidiruv natijasi bo'yicha yetkazib beruvchi topilmadi." : "Hozircha yetkazib beruvchilar mavjud emas."}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Transactions Modal */}
        <Dialog
          open={transactionsModalOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setTransactionsModalOpen(false);
              setSelectedSupplierTransactions({ supplier: null, payments: [], expenses: [] });
            } else {
                setTransactionsModalOpen(true);
            }
          }}
        >
          <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {selectedSupplierTransactions.supplier?.company_name || "Yuklanmoqda..."} - Operatsiyalar
              </DialogTitle>
              {selectedSupplierTransactions.supplier && 
                <DialogDescription>
                  Joriy balans: {formatBalance(selectedSupplierTransactions.supplier.balance)}
                </DialogDescription>
              }
            </DialogHeader>
            {transactionsLoading && !selectedSupplierTransactions.supplier ? (
                 <div className="flex items-center justify-center h-60"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Ma'lumotlar yuklanmoqda...</span></div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto py-4 pr-2">
              {/* Xarajatlar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Xarajatlar (Nasiyalar)</h3>
                  <div className="text-sm text-muted-foreground">
                    Jami: {formatBalance(
                      selectedSupplierTransactions.expenses
                        .reduce((sum, expense) => sum + parseFloat(expense.amount), 0)
                    )}
                  </div>
                </div>
                <div className="rounded-md border max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted">
                      <TableRow>
                        <TableHead className="w-[100px]">Sana</TableHead>
                        <TableHead>Turi</TableHead>
                        <TableHead className="text-right">Summa</TableHead>
                        <TableHead>Izoh</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSupplierTransactions.expenses.length > 0 ? (
                        selectedSupplierTransactions.expenses.map((expense) => (
                            <TableRow key={`exp-${expense.id}`}>
                              <TableCell>{formatDate((expense as any).date || expense.created_at)}</TableCell> {/* date yoki created_at */}
                              <TableCell>{getExpenseTypeName(expense.expense_type)}</TableCell>
                              <TableCell className="text-right">{formatBalance(expense.amount)}</TableCell>
                              <TableCell className="max-w-[150px] truncate" title={(expense as any).comment || expense.description}>{(expense as any).comment || expense.description || "-"}</TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            Xarajatlar mavjud emas
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* To'lovlar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">To'lovlar (Kirimlar)</h3>
                   <div className="text-sm text-muted-foreground">
                    Jami: {formatBalance(
                      selectedSupplierTransactions.payments
                        .reduce((sum, payment) => sum + parseFloat(payment.amount), 0)
                    )}
                  </div>
                </div>
                <div className="rounded-md border max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted">
                      <TableRow>
                        <TableHead className="w-[100px]">Sana</TableHead>
                        <TableHead>Turi</TableHead>
                        <TableHead className="text-right">Summa</TableHead>
                        <TableHead>Izoh</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSupplierTransactions.payments.length > 0 ? (
                        selectedSupplierTransactions.payments.map((payment) => (
                            <TableRow key={`pay-${payment.id}`}>
                              <TableCell>{formatDate(payment.created_at)}</TableCell>
                              <TableCell className="capitalize">{payment.payment_type === "naqd" ? "Naqd" : payment.payment_type}</TableCell>
                              <TableCell className="text-right">{formatBalance(payment.amount)}</TableCell>
                              <TableCell className="max-w-[150px] truncate" title={payment.description}>{payment.description || "-"}</TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            To'lovlar mavjud emas
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
            )}
            <DialogFooter className="mt-auto pt-4">
              <Button variant="outline" onClick={() => setTransactionsModalOpen(false)}>
                Yopish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* O'chirish tasdiqlash modali */}
        <Dialog open={deleteDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeleteDialogOpen(false); setDeleteCode(""); setDeleteError(""); setDeletingId(null);
          } else {
            setDeleteDialogOpen(true);
          }
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>O'chirishni tasdiqlang</DialogTitle>
              <DialogDescription>
                Yetkazib beruvchi "{suppliers.find(s => s.id === deletingId)?.company_name || ""}"ni o'chirish uchun "7777" kodini kiriting.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="delete_code">Maxsus kod</Label>
                <Input
                  id="delete_code"
                  type="password"
                  placeholder="Kodni kiriting"
                  value={deleteCode}
                  onChange={(e) => { setDeleteCode(e.target.value); setDeleteError(""); }}
                />
                {deleteError && <p className="text-sm text-red-500 pt-1">{deleteError}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Bekor qilish</Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleteCode !== "7777"}>
                O'chirish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Balans qo'shish Modal */}
        <Dialog open={paymentModalOpen} onOpenChange={(isOpen) => {
            if (!isOpen) { resetPaymentForm(); } else { setPaymentModalOpen(true); }
          }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Balans to'ldirish: {payingSupplierName}</DialogTitle>
              <DialogDescription>Yetkazib beruvchiga to'lov qilish uchun ma'lumotlarni kiriting.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePaymentSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="payment_amount">Summa ($) *</Label>
                  <Input id="payment_amount" name="amount" type="number" step="0.01" value={paymentFormData.amount} onChange={handlePaymentFormChange} required min="0.01" placeholder="Misol: 500.00"/>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="payment_description">Tavsif *</Label>
                  <Textarea id="payment_description" name="description" value={paymentFormData.description} onChange={handlePaymentFormChange} placeholder="To'lov sababi..." required rows={3}/>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetPaymentForm} disabled={paymentSubmitting}>
                  Bekor qilish
                </Button>
                <Button type="submit" disabled={!paymentFormData.amount || parseFloat(paymentFormData.amount) <= 0 || !paymentFormData.description.trim() || paymentSubmitting}>
                  {paymentSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  To'lovni Qo'shish
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>

      <footer className="border-t py-4 text-center text-sm text-muted-foreground mt-auto bg-background">
        <div className="container mx-auto">
            Version 1.1 | Barcha huquqlar himoyalangan | Ahlan Group LLC © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
};

export default SuppliersPage;