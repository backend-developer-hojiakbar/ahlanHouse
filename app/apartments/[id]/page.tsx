"use client";

import { useState, useEffect, useCallback } from "react"; // useCallback qo'shildi
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  Trash, // O'chirish ikonkasini import qilish
  Loader2, // Loader ikonkasini import qilish
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription, // DialogDescription import qilindi
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns"; // parseISO qo'shildi
import { uz } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";

const API_BASE_URL = "http://api.ahlan.uz";

// --- Helper Components (o'zgarishsiz) ---
function InfoItem({
  label,
  value,
  className = "",
  alignRight = false,
  boldValue = false,
  capitalizeValue = false,
}) {
  // ... (InfoItem kodi o'zgarishsiz)
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
          {value === undefined || value === null || value === "" ? "-" : value} {/* Null/Undefined tekshiruvi qo'shildi */}
        </span>
      </div>
    );
}

function EditInput({ label, id, ...props }) {
  // ... (EditInput kodi o'zgarishsiz)
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

export default function ApartmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [apartment, setApartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false); // UserPayment qo'shish loading
  const [editLoading, setEditLoading] = useState(false); // Asosiy xonadonni tahrirlash loading
  const [accessToken, setAccessToken] = useState(null);

  // Balansga to'lov qo'shish modali uchun state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentType: "naqd",
    description: "",
  });

  // Asosiy xonadonni tahrirlash modali uchun state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    room_number: "",
    floor: "",
    rooms: "",
    area: "",
    price: "",
    description: "",
    status: "",
    object: "",
  });

  // UserPayment (balans to'lovi) ni tahrirlash uchun state
  const [isEditUserPaymentModalOpen, setIsEditUserPaymentModalOpen] = useState(false);
  const [editingUserPayment, setEditingUserPayment] = useState(null); // Tahrirlanayotgan to'lov obyekti
  const [editUserPaymentForm, setEditUserPaymentForm] = useState({ // Tahrirlash formasi uchun ma'lumotlar
    amount: "",
    paymentType: "naqd",
    description: "",
    date: new Date(),
  });
  const [isUpdatingUserPayment, setIsUpdatingUserPayment] = useState(false); // UserPayment yangilanishi loading

  // UserPayment (balans to'lovi) ni o'chirish uchun state
  const [deletingUserPaymentId, setDeletingUserPaymentId] = useState(null); // O'chirilayotgan ID

  // Hisoblangan qiymatlar
  const [totalPaid, setTotalPaid] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);

  // --- Utility Functions ---
  const getAuthHeaders = useCallback((token = accessToken) => {
    if (!token) {
        console.error("Auth token is missing!");
        // Agar kerak bo'lsa, login sahifasiga yo'naltirish:
        // router.push('/login');
        return null;
    }
    return {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
  }, [accessToken]); // accessToken ga bog'liq

  const formatCurrency = useCallback((amount) => {
    const num = Number(amount);
    if (amount === null || amount === undefined || amount === "" || isNaN(num)) return "$0.00"; // Valyutani $ dan UZS ga o'zgartirish mumkin
    return num.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
    // Yoki UZS uchun:
    // return num.toLocaleString('uz-UZ', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "-";
    try {
        // API dan kelgan sana stringini Date obyektiga aylantirish
        const date = parseISO(dateString); // '2023-10-27T10:00:00Z' kabi formatni to'g'ri parse qiladi
        if (isNaN(date.getTime())) { // Agar parse qilishda xatolik bo'lsa
             return dateString.split("T")[0] || "-"; // Faqat sana qismini ko'rsatish
        }
        return format(date, "dd.MM.yyyy", { locale: uz }); // O'zbekcha formatda chiqarish
    } catch (e) {
        console.warn("Date formatting error:", e, "Original string:", dateString);
        return dateString.split("T")[0] || "-"; // Xatolik bo'lsa, asl stringning sana qismini qaytarish
    }
  }, []);

   // totalPaid va remainingAmount ni qayta hisoblash
   const recalculateTotals = useCallback((currentApartmentData) => {
        if (!currentApartmentData) return;

        const mainPmt = currentApartmentData.payments?.[0];
        const userPmts = currentApartmentData.userPayments || [];

        const initialPayment = mainPmt ? parseFloat(mainPmt.initial_payment) || 0 : 0;
        const userPaymentsTotal = userPmts.reduce((sum, up) => sum + (parseFloat(up.amount) || 0), 0);

        const newTotalPaid = initialPayment + userPaymentsTotal;
        const totalAmount = mainPmt ? parseFloat(mainPmt.total_amount) || 0 : parseFloat(currentApartmentData.price) || 0;
        const newRemainingAmount = totalAmount - newTotalPaid;

        setTotalPaid(newTotalPaid);
        setRemainingAmount(newRemainingAmount > 0 ? newRemainingAmount : 0);
   }, []); // Bu funksiya state larga bog'liq emas

  // --- Data Fetching ---
  const fetchApartmentDetails = useCallback(async (token) => {
    setLoading(true);
    try {
      const apartmentId = params.id;
      if (!apartmentId) throw new Error("Xonadon ID topilmadi.");

      const headers = getAuthHeaders(token);
      if (!headers) throw new Error("Avtorizatsiya tokeni yo'q.");

      // Barcha so'rovlarni parallel yuborish
      const responses = await Promise.all([
          fetch(`${API_BASE_URL}/apartments/${apartmentId}/`, { method: "GET", headers }).catch(e => e),
          // Asosiy Paymentni olish (agar mavjud bo'lsa)
          fetch(`${API_BASE_URL}/payments/?apartment=${apartmentId}&ordering=-created_at&page_size=1`, { method: "GET", headers }).catch(e => e)
      ]);

      const apartmentResponse = responses[0];
      const mainPaymentResponse = responses[1];

      if (!(apartmentResponse instanceof Response) || !apartmentResponse.ok) {
          if (apartmentResponse.status === 404) throw new Error(`Xonadon (ID: ${apartmentId}) topilmadi.`);
          if (apartmentResponse.status === 401) {
              localStorage.removeItem("access_token");
              router.push("/login");
              throw new Error("Sessiya muddati tugagan. Iltimos, qayta kiring.");
          }
          const errorText = await apartmentResponse?.text?.().catch(() => 'Server xatosi');
          throw new Error(`Xonadon ma'lumotlarini olishda xatolik (${apartmentResponse?.status}): ${errorText}`);
      }
      const apartmentData = await apartmentResponse.json();

      let mainPayment = null;
      let clientId = null;
      if (mainPaymentResponse instanceof Response && mainPaymentResponse.ok) {
          const paymentsData = await mainPaymentResponse.json();
          if (paymentsData.results && paymentsData.results.length > 0) {
              mainPayment = paymentsData.results[0];
              clientId = mainPayment.user; // Asosiy paymentdan mijoz ID sini olish
          }
      } else {
          console.warn("Asosiy to'lovni olishda ogohlantirish:", mainPaymentResponse?.status);
      }

      // Agar asosiy paymentdan client ID olinmagan bo'lsa va xonadonda ownerlar bo'lsa
      if (!clientId && apartmentData.owners && apartmentData.owners.length > 0) {
           clientId = apartmentData.owners[0]; // Birinchi ownerni olish (API strukturasiga qarab moslash kerak)
      }

      // Obyekt, Mijoz, UserPayments, Hujjatlarni olish
      let objectData = null;
      let clientData = null;
      let userPaymentsData = [];
      let documentsData = [];

      const detailFetchPromises = [];

      // Obyekt
      if (apartmentData.object) {
          const objectId = typeof apartmentData.object === 'object' ? apartmentData.object.id : apartmentData.object;
          if(objectId) {
              detailFetchPromises.push(
                  fetch(`${API_BASE_URL}/objects/${objectId}/`, { method: "GET", headers }).then(res => res.ok ? res.json() : null).catch(() => null)
              );
          } else {
               detailFetchPromises.push(Promise.resolve(null)); // Agar objectId yo'q bo'lsa
          }
      } else {
          detailFetchPromises.push(Promise.resolve(null));
      }

      // Mijoz va UserPayments (agar clientId mavjud bo'lsa)
      if (clientId) {
          detailFetchPromises.push(
              fetch(`${API_BASE_URL}/users/${clientId}/`, { method: "GET", headers }).then(res => res.ok ? res.json() : null).catch(() => null)
          );
          detailFetchPromises.push(
              fetch(`${API_BASE_URL}/user-payments/?user=${clientId}&page_size=200&ordering=-date`, { method: "GET", headers }) // Ko'proq payment olish
                  .then(res => res.ok ? res.json() : { results: [] })
                  .then(data => data.results || [])
                  .catch(() => [])
          );
      } else {
          detailFetchPromises.push(Promise.resolve(null), Promise.resolve([])); // Agar clientId yo'q bo'lsa
      }

      // Hujjatlar (agar mainPayment mavjud bo'lsa)
       if (mainPayment?.id) {
           detailFetchPromises.push(
               fetch(`${API_BASE_URL}/documents/?payment=${mainPayment.id}&page_size=50`, { method: "GET", headers })
                   .then(res => res.ok ? res.json() : { results: [] })
                   .then(data => data.results || [])
                   .catch(() => [])
           );
       } else {
           detailFetchPromises.push(Promise.resolve([])); // Agar mainPayment yo'q bo'lsa
       }


      const detailResults = await Promise.all(detailFetchPromises);

      objectData = detailResults[0];
      clientData = detailResults[1];
      userPaymentsData = detailResults[2];
      documentsData = detailResults[3];

      const completeApartmentData = {
          ...apartmentData,
          object: objectData || { id: apartmentData.object, name: "Noma'lum obyekt" }, // Obyekt ma'lumotlarini qo'shish
          payments: mainPayment ? [mainPayment] : [], // Asosiy paymentni massivga o'rash
          client: clientData,
          userPayments: userPaymentsData,
          documents: documentsData,
      };

      setApartment(completeApartmentData);
      recalculateTotals(completeApartmentData); // Jami to'langan va qoldiqni hisoblash

      // Edit formani to'ldirish
       setEditForm({
           room_number: apartmentData.room_number || "",
           floor: apartmentData.floor?.toString() || "",
           rooms: apartmentData.rooms?.toString() || "",
           area: apartmentData.area?.toString() || "",
           price: apartmentData.price || "",
           description: apartmentData.description || "",
           status: apartmentData.status || "",
           object: objectData?.id?.toString() || apartmentData.object?.id?.toString() || apartmentData.object?.toString() || "",
       });

    } catch (error) {
      console.error("Xonadon tafsilotlarini olishda xato:", error);
      toast({ title: "Xatolik", description: error.message || "Ma'lumotlarni olishda noma'lum xatolik.", variant: "destructive" });
      setApartment(null); // Xatolik bo'lsa apartmentni null qilish
    } finally {
      setLoading(false);
    }
  }, [params.id, router, getAuthHeaders, recalculateTotals]); // recalculateTotals qo'shildi

  // --- useEffect Hooks ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token) {
        router.push("/login");
      } else {
        setAccessToken(token);
      }
    }
  }, [router]);

  useEffect(() => {
    if (accessToken && params.id) {
      fetchApartmentDetails(accessToken);
    }
  }, [accessToken, params.id, fetchApartmentDetails]); // fetchApartmentDetails qo'shildi

  // --- Event Handlers (Add User Payment) ---
  const handleOpenPaymentModal = () => {
    // ... (o'zgarishsiz)
    if (!apartment?.client?.id) {
      toast({ title: "Xatolik", description: "To'lov qo'shish uchun avval mijoz biriktirilishi kerak.", variant: "destructive" });
      return;
    }
    setSelectedDate(new Date());
    setPaymentForm({ amount: "", paymentType: "naqd", description: "" });
    setIsPaymentModalOpen(true);
  };
  const handleClosePaymentModal = () => {
    // ... (o'zgarishsiz)
     setIsPaymentModalOpen(false);
     setPaymentForm({ amount: "", paymentType: "naqd", description: "" });
  };
  const handlePaymentChange = (e) => {
    // ... (o'zgarishsiz)
     const { name, value } = e.target;
     setPaymentForm((prev) => ({ ...prev, [name]: value }));
  };
  const handlePaymentTypeChange = (value) => {
    // ... (o'zgarishsiz)
     setPaymentForm((prev) => ({ ...prev, paymentType: value }));
  };
  const handleAddUserPayment = async () => {
    // ... (o'zgarishsiz, faqat fetchApartmentDetails o'rniga recalculateTotals ishlatiladi)
     setPaymentLoading(true);
     const headers = getAuthHeaders();
     if (!headers || !apartment?.client?.id || !selectedDate) {
         toast({ title: "Xatolik", description: "Mijoz ID, sana yoki avtorizatsiya tokeni topilmadi.", variant: "destructive" });
         setPaymentLoading(false); return;
     }

     const clientId = apartment.client.id;
     const paymentAmount = Number(paymentForm.amount);
     if (isNaN(paymentAmount) || paymentAmount <= 0) {
         toast({ title: "Xatolik", description: "Summa musbat son bo'lishi kerak.", variant: "destructive" });
         setPaymentLoading(false); return;
     }
     const formattedDate = format(selectedDate, "yyyy-MM-dd"); // API uchun format

     const paymentData = {
         user: clientId,
         amount: paymentAmount.toFixed(2),
         payment_type: paymentForm.paymentType,
         description: paymentForm.description,
         date: formattedDate,
     };

     try {
         const response = await fetch(`${API_BASE_URL}/user-payments/`, {
             method: "POST",
             headers: headers,
             body: JSON.stringify(paymentData),
         });
         if (!response.ok) {
             const errorData = await response.json().catch(() => ({ detail: 'Server javobini o\'qib bo\'lmadi' }));
             throw new Error(`To‘lov qo‘shishda xatolik (${response.status}): ${errorData.detail || JSON.stringify(errorData)}`);
         }
         const newPaymentResponse = await response.json();
         toast({ title: "Muvaffaqiyat", description: "To‘lov muvaffaqiyatli qo‘shildi" });

         // Yangi paymentni lokal state ga qo'shish
         const newUserPayment = { ...newPaymentResponse, date: formattedDate }; // Sanani ham qo'shish
         const updatedUserPayments = [...(apartment.userPayments || []), newUserPayment];
         const updatedApartmentData = { ...apartment, userPayments: updatedUserPayments };

         setApartment(updatedApartmentData); // State ni yangilash
         recalculateTotals(updatedApartmentData); // Totalni qayta hisoblash

         generateReceiptPDF({...paymentData, date: formattedDate}); // PDF generatsiya
         handleClosePaymentModal(); // Modalni yopish

     } catch (error) {
         toast({ title: "Xatolik", description: error.message || "To‘lov qo‘shishda noma\'lum xatolik.", variant: "destructive" });
     } finally {
         setPaymentLoading(false);
     }
  };

  // --- Event Handlers (Edit Main Apartment) ---
  const handleOpenEditModal = () => setIsEditModalOpen(true);
  const handleCloseEditModal = () => setIsEditModalOpen(false);
  const handleEditChange = (e) => {
    // ... (o'zgarishsiz)
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleEditStatusChange = (value) => {
    // ... (o'zgarishsiz)
     setEditForm((prev) => ({ ...prev, status: value }));
  };
  const handleUpdateApartment = async () => {
    // ... (o'zgarishsiz)
     setEditLoading(true);
     const apartmentId = params.id;
     const headers = getAuthHeaders();
     if (!headers || !apartmentId || !editForm.object) {
         toast({ title: "Xatolik", description: "Xonadon ID, Obyekt ID yoki avtorizatsiya tokeni topilmadi.", variant: "destructive" });
         setEditLoading(false); return;
     }

     const apartmentData = {
         room_number: editForm.room_number,
         floor: Number(editForm.floor),
         rooms: Number(editForm.rooms),
         area: parseFloat(editForm.area),
         price: parseFloat(editForm.price),
         description: editForm.description,
         status: editForm.status,
         object: parseInt(editForm.object, 10),
     };

     // Validatsiya
     if (Object.values(apartmentData).some(val => val === undefined || val === null || (typeof val === 'number' && isNaN(val))) ||
         !apartmentData.room_number || apartmentData.floor < 0 || apartmentData.rooms <= 0 || apartmentData.area <= 0 || apartmentData.price < 0 || !apartmentData.status || apartmentData.object <= 0)
     {
         toast({ title: "Xatolik", description: "Barcha (*) belgili maydonlar to'g'ri to'ldirilishi kerak.", variant: "destructive" });
         setEditLoading(false); return;
     }

     try {
         const response = await fetch(`${API_BASE_URL}/apartments/${apartmentId}/`, {
             method: "PUT", // Yoki PATCH agar qisman yangilash bo'lsa
             headers: headers,
             body: JSON.stringify(apartmentData),
         });
         if (!response.ok) {
             const errorData = await response.json().catch(() => ({ detail: 'Server javobini o\'qib bo\'lmadi' }));
             throw new Error(`Xonadonni yangilashda xatolik (${response.status}): ${errorData.detail || JSON.stringify(errorData)}`);
         }
         toast({ title: "Muvaffaqiyat", description: "Xonadon muvaffaqiyatli yangilandi" });
         handleCloseEditModal();
         if (accessToken) fetchApartmentDetails(accessToken); // Ma'lumotlarni qayta yuklash

     } catch (error) {
         toast({ title: "Xatolik", description: error.message || "Xonadonni yangilashda noma\'lum xatolik.", variant: "destructive" });
     } finally {
         setEditLoading(false);
     }
  };

  // --- Event Handlers (Edit/Delete User Payment) ---
  const handleOpenEditUserPaymentModal = (payment) => {
     if (!payment) return;
     setEditingUserPayment(payment);
     setEditUserPaymentForm({
         amount: payment.amount || "",
         paymentType: payment.payment_type || "naqd",
         description: payment.description || "",
         date: payment.date ? parseISO(payment.date) : new Date(), // Sanani Date obyektiga o'tkazish
     });
     setIsEditUserPaymentModalOpen(true);
  };

  const handleCloseEditUserPaymentModal = () => {
     setIsEditUserPaymentModalOpen(false);
     setEditingUserPayment(null);
     setEditUserPaymentForm({ amount: "", paymentType: "naqd", description: "", date: new Date() });
  };

  const handleEditUserPaymentChange = (e) => {
     const { name, value } = e.target;
     setEditUserPaymentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditUserPaymentTypeChange = (value) => {
      setEditUserPaymentForm((prev) => ({ ...prev, paymentType: value }));
  };

  const handleEditUserPaymentDateChange = (date) => {
     if (date) {
         setEditUserPaymentForm((prev) => ({ ...prev, date: date }));
     }
  };

  const handleUpdateUserPayment = async () => {
     setIsUpdatingUserPayment(true);
     const headers = getAuthHeaders();
     if (!headers || !editingUserPayment?.id || !editUserPaymentForm.date) {
         toast({ title: "Xatolik", description: "To'lov ID, sana yoki avtorizatsiya tokeni topilmadi.", variant: "destructive" });
         setIsUpdatingUserPayment(false); return;
     }

     const paymentAmount = Number(editUserPaymentForm.amount);
     if (isNaN(paymentAmount) || paymentAmount <= 0) {
         toast({ title: "Xatolik", description: "Summa musbat son bo'lishi kerak.", variant: "destructive" });
         setIsUpdatingUserPayment(false); return;
     }

     const formattedDate = format(editUserPaymentForm.date, "yyyy-MM-dd"); // API uchun format

     const updatedData = {
         amount: paymentAmount.toFixed(2),
         payment_type: editUserPaymentForm.paymentType,
         description: editUserPaymentForm.description,
         date: formattedDate,
         // user ni o'zgartirish shart emas odatda PATCH da
     };

     try {
         const response = await fetch(`${API_BASE_URL}/user-payments/${editingUserPayment.id}/`, {
             method: "PATCH",
             headers: headers,
             body: JSON.stringify(updatedData),
         });

         if (!response.ok) {
             const errorData = await response.json().catch(() => ({ detail: 'Server javobini o\'qib bo\'lmadi' }));
             throw new Error(`Balans to'lovini yangilashda xatolik (${response.status}): ${errorData.detail || JSON.stringify(errorData)}`);
         }
         const updatedPaymentFromServer = await response.json();

         // Lokal state ni yangilash
         const updatedUserPayments = (apartment.userPayments || []).map(p =>
             p.id === updatedPaymentFromServer.id ? { ...p, ...updatedPaymentFromServer, date: formattedDate } : p // Sanani ham yangilash
         );
         const updatedApartmentData = { ...apartment, userPayments: updatedUserPayments };
         setApartment(updatedApartmentData); // State ni yangilash
         recalculateTotals(updatedApartmentData); // Totalni qayta hisoblash

         toast({ title: "Muvaffaqiyat", description: "Balans to'lovi muvaffaqiyatli yangilandi." });
         handleCloseEditUserPaymentModal();

     } catch (error) {
         toast({ title: "Xatolik", description: error.message || "Balans to'lovini yangilashda noma'lum xatolik.", variant: "destructive" });
     } finally {
         setIsUpdatingUserPayment(false);
     }
  };

  const handleDeleteUserPayment = async (paymentId) => {
     const headers = getAuthHeaders();
     if (!headers || deletingUserPaymentId) return; // Agar o'chirish jarayoni bo'lsa chiqish

     if (!window.confirm(`IDsi ${paymentId} bo'lgan balans to'lovini o'chirishga ishonchingiz komilmi?`)) {
         return;
     }

     setDeletingUserPaymentId(paymentId);

     try {
         const response = await fetch(`${API_BASE_URL}/user-payments/${paymentId}/`, {
             method: "DELETE",
             headers: headers,
         });

         if (!response.ok && response.status !== 204) { // 204 ham OK
             const errorData = await response.json().catch(() => ({ detail: `Server xatosi (${response.status})` }));
             throw new Error(`Balans to'lovini o'chirishda xatolik: ${errorData.detail || response.statusText}`);
         }

         // Lokal state dan o'chirish
         const updatedUserPayments = (apartment.userPayments || []).filter(p => p.id !== paymentId);
         const updatedApartmentData = { ...apartment, userPayments: updatedUserPayments };
         setApartment(updatedApartmentData); // State ni yangilash
         recalculateTotals(updatedApartmentData); // Totalni qayta hisoblash

         toast({ title: "Muvaffaqiyat!", description: `Balans to'lovi (ID: ${paymentId}) muvaffaqiyatli o'chirildi.` });

     } catch (error) {
         toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
     } finally {
         setDeletingUserPaymentId(null);
     }
  };

  // --- Other Helper Functions (Badges, PDF, Contract Download) ---
  // Bu funksiyalar o'zgarishsiz qoladi
  const generateReceiptPDF = (paymentData) => {
    // ... (generateReceiptPDF kodi o'zgarishsiz)
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const lineHeight = 7;
      let yPosition = margin;

      // jsPDF-autoTable kabi kutubxonalar shriftni yaxshiroq boshqarishi mumkin
      // Oddiy usul:
      // doc.addFont('Helvetica', 'Helvetica', 'normal'); // Shriftni qo'shish
      // doc.setFont('Helvetica');

      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text("TO'LOV KVITANSIYASI", pageWidth / 2, yPosition, { align: "center" });
      yPosition += lineHeight * 2;

      doc.setFontSize(11);
      doc.setFont(undefined, "normal");
      doc.text(`Obyekt: ${apartment?.object?.name || "N/A"}`, margin, yPosition); yPosition += lineHeight;
      doc.text(`Xonadon: № ${apartment?.room_number || "N/A"}`, margin, yPosition); yPosition += lineHeight;
      doc.text(`Mijoz: ${apartment?.client?.fio || "Noma'lum"}`, margin, yPosition); yPosition += lineHeight;
      doc.text(`Telefon: ${apartment?.client?.phone_number || "-"}`, margin, yPosition); yPosition += lineHeight * 1.5;

      doc.setLineWidth(0.3); doc.line(margin, yPosition, pageWidth - margin, yPosition); yPosition += lineHeight * 1.5;

      const drawRow = (label, value) => {
           doc.setFont(undefined, "bold"); doc.text(`${label}:`, margin, yPosition);
           doc.setFont(undefined, "normal"); doc.text(`${value}`, pageWidth - margin, yPosition, { align: "right" });
           yPosition += lineHeight;
       };

      drawRow("To'lov Summasi", formatCurrency(paymentData.amount));
      drawRow("To'lov Sanasi", paymentData.date ? formatDate(paymentData.date) : "-");
      drawRow("To'lov Usuli", getUserPaymentTypeLabel(paymentData.payment_type));

      if (paymentData.description) {
          yPosition += lineHeight * 0.5;
          doc.setFont(undefined, "bold"); doc.text("Izoh:", margin, yPosition); yPosition += lineHeight;
          doc.setFont(undefined, "normal");
          const splitDescription = doc.splitTextToSize(paymentData.description, pageWidth - margin * 2);
          doc.text(splitDescription, margin, yPosition);
          yPosition += lineHeight * splitDescription.length;
      }

      yPosition += lineHeight * 0.5;
      doc.setLineWidth(0.3); doc.line(margin, yPosition, pageWidth - margin, yPosition); yPosition += lineHeight * 1.5;

      doc.setFontSize(9); doc.setTextColor(150);
      doc.text(`Kvitansiya ${format(new Date(), "dd.MM.yyyy HH:mm")} da "Ahlan" tizimi orqali yaratildi.`, margin, yPosition);
      yPosition += lineHeight * 1.5;
      doc.setTextColor(0);
      doc.text("Qabul qildi: _________________", pageWidth - margin - 65, yPosition, { align: "right" });

      doc.save(`Kvitansiya-X${apartment?.room_number}-${format(parseISO(paymentData.date), "yyyyMMdd")}.pdf`);
  };
  const getStatusBadge = (status) => {
    // ... (o'zgarishsiz)
     switch (status) {
       case "bosh": return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Bo‘sh</Badge>;
       case "band": return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Band</Badge>;
       case "muddatli": return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Muddatli</Badge>;
       case "sotilgan": return <Badge className="bg-green-500 hover:bg-green-600 text-white">Sotilgan</Badge>;
       case "ipoteka": return <Badge className="bg-purple-500 hover:bg-purple-600 text-white">Ipoteka</Badge>;
       case "subsidiya": return <Badge className="bg-teal-500 hover:bg-teal-600 text-white">Subsidiya</Badge>;
       default: return <Badge variant="secondary">{status || "Noma'lum"}</Badge>;
     }
  };
  const getPaymentStatusBadge = (status) => {
    // ... (o'zgarishsiz)
     switch (status?.toLowerCase()) {
       case "paid": return <Badge className="bg-green-600 hover:bg-green-700 text-white">To‘langan</Badge>;
       case "active": return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Aktiv</Badge>;
       case "pending": return <Badge variant="outline" className="text-yellow-600 border-yellow-500">Kutilmoqda</Badge>;
       case "overdue": return <Badge variant="destructive">Muddati o‘tgan</Badge>;
       default: return <Badge variant="secondary">{status || "Noma'lum"}</Badge>;
     }
  };
  const getUserPaymentTypeLabel = (paymentType) => {
    // ... (o'zgarishsiz)
      switch (paymentType) {
          case "naqd": return "Naqd pul";
          case "plastik": return "Plastik karta"; // Agar ishlatilsa
          case "bank": return "Bank o'tkazmasi"; // Agar ishlatilsa
          // Backendda qanday turlar bo'lsa, shularni qo'shing
          default: return paymentType ? paymentType.charAt(0).toUpperCase() + paymentType.slice(1) : "Noma'lum";
      }
  };
  const getMainPaymentTypeLabel = (paymentType) => {
    // ... (o'zgarishsiz)
     switch (paymentType) {
       case "naqd": return "Naqd (To‘liq)";
       case "muddatli": return "Muddatli to‘lov";
       case "ipoteka": return "Ipoteka";
       case "subsidiya": return "Subsidiya";
       case "band": return "Band qilish";
       default: return paymentType || "Noma'lum";
     }
  };
  const handleDownloadContract = async (paymentId) => {
    // ... (o'zgarishsiz)
     const headers = getAuthHeaders();
     if (!headers || !paymentId) return;

     const mainPmt = apartment?.payments?.find(p => p.id === paymentId);
     // Agar "band" bo'lsa, API ga murojaat qilmaslik
     if (mainPmt?.payment_type === 'band') {
          toast({ title: "Ma'lumot", description: "'Band qilish' uchun alohida shartnoma generatsiya qilinmaydi.", variant: "default" });
          return;
     }


     toast({ title: "Boshlanmoqda...", description: "Shartnoma generatsiya qilinmoqda...", duration: 2000 });
     try {
         const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/download_contract/`, {
             method: "GET",
             headers: { Authorization: `Bearer ${accessToken}` }, // Content-Type kerak emas GET uchun
         });

         if (!response.ok) {
             const errorData = await response.json().catch(() => ({ detail: 'Server javobini o\'qib bo\'lmadi' }));
             // Agar API 404 qaytarsa, band qilish holati bo'lishi mumkin
             if(response.status === 404 && mainPmt?.payment_type === 'band') {
                 throw new Error("'Band qilish' uchun shartnoma mavjud emas.");
             }
             throw new Error(`Shartnoma yuklashda xatolik (${response.status}): ${errorData.detail || 'Noma\'lum server xatosi'}`);
         }

         const blob = await response.blob();
         const contentDisposition = response.headers.get("content-disposition");
         let filename = `shartnoma_${paymentId}.docx`;
         if (contentDisposition) {
             const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i);
             if (filenameMatch && filenameMatch[1]) {
                 filename = decodeURIComponent(filenameMatch[1]);
             }
         }

         const url = window.URL.createObjectURL(blob);
         const a = document.createElement("a");
         a.style.display = 'none'; // Ko'rinmas qilish
         a.href = url;
         a.download = filename;
         document.body.appendChild(a);
         a.click();
         window.URL.revokeObjectURL(url);
         a.remove();

         toast({ title: "Muvaffaqiyat", description: `"${filename}" yuklab olindi.` });
     } catch (error) {
         toast({ title: "Xatolik", description: (error as Error).message || "Shartnomani yuklashda noma'lum xatolik.", variant: "destructive" });
     }
  };

  // --- Render Logic ---
  if (loading && !apartment) {
    // ... (Loading state o'zgarishsiz)
      return (
        <div className="flex min-h-screen flex-col">
          <div className="border-b sticky top-0 bg-background z-10"> /* Header */ </div>
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="mr-2 h-8 w-8 animate-spin text-muted-foreground"/>
            <p className="text-muted-foreground">Ma'lumotlar yuklanmoqda...</p>
          </div>
        </div>
      );
  }

  if (!apartment) {
    // ... (Not found state o'zgarishsiz)
     return (
       <div className="flex min-h-screen flex-col">
         <div className="border-b sticky top-0 bg-background z-10"> /* Header */ </div>
         <div className="flex-1 space-y-4 p-8 pt-6">
           <div className="flex items-center justify-between space-y-2">
             <h2 className="text-2xl font-bold tracking-tight text-red-600">Xonadon topilmadi</h2>
             <Button variant="outline" onClick={() => router.push("/apartments")}>
               <Home className="mr-2 h-4 w-4" /> Barcha xonadonlar
             </Button>
           </div>
           <p className="text-muted-foreground">
             Ushbu ID ({params.id}) ga ega xonadon mavjud emas yoki ma'lumotlarni yuklashda xatolik yuz berdi.
           </p>
         </div>
       </div>
     );
  }

  // Asosiy JSX render
  const mainPayment = apartment.payments?.[0];
  const userPayments = apartment.userPayments || [];
  const documents = apartment.documents || [];
  const lastThreeUserPayments = [...userPayments].slice(0, 3); // API dan saralangan holda keladi deb hisoblaymiz

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="border-b sticky top-0 bg-background z-10">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        {/* Page Header */}
        <div className="flex items-center justify-between space-y-2 flex-wrap gap-y-2">
            {/* ... (Title va boshqa tugmalar o'zgarishsiz) ... */}
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Xonadon № {apartment.room_number}</h2>
              <p className="text-muted-foreground">{apartment.object?.name || "Noma'lum obyekt"}</p>
            </div>
            <div className="flex space-x-2 flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push("/apartments")}><Home className="mr-2 h-4 w-4" /> Barcha xonadonlar</Button>
                {apartment.object?.id && (<Link href={`/objects/${apartment.object.id}`} passHref><Button variant="outline" size="sm"><Building className="mr-2 h-4 w-4" /> Obyektga qaytish</Button></Link>)}
                {apartment.status === "bosh" && (<Button size="sm" onClick={() => router.push(`/apartments/${apartment.id}/reserve`)}><User className="mr-2 h-4 w-4" /> Band qilish / Sotish</Button>)}
                <Button variant="outline" size="sm" onClick={handleOpenEditModal}><Edit className="mr-2 h-4 w-4" /> Tahrirlash</Button>
                {mainPayment && (<Button variant="outline" size="sm" onClick={() => handleDownloadContract(mainPayment.id)} disabled={mainPayment?.payment_type === 'band'}><Download className="mr-2 h-4 w-4" /> Shartnoma</Button>)}
            </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Apartment Details */}
          <div className="lg:col-span-2">
            <Card>
                {/* ... (Rasm va asosiy xonadon ma'lumotlari o'zgarishsiz) ... */}
              <CardContent className="p-0">
                <div className="relative h-[250px] md:h-[350px] bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
                    <img src={apartment.object?.image || apartment.image || "/placeholder.svg?h=350&w=600"} alt={`Xonadon ${apartment.room_number}`} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "/placeholder.svg?h=350&w=600"; e.currentTarget.onerror = null; }} loading="lazy"/>
                    <div className="absolute top-4 right-4">{getStatusBadge(apartment.status)}</div>
                </div>
                <div className="p-4 md:p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 border-b pb-4 dark:border-gray-700">
                        <InfoItem label="Qavat" value={apartment.floor ?? "-"} />
                        <InfoItem label="Xonalar" value={`${apartment.rooms || "-"} xona`} />
                        <InfoItem label="Maydon" value={`${apartment.area || "-"} m²`} />
                        <InfoItem label="Narx" value={formatCurrency(apartment.price)} className="text-green-600 dark:text-green-500 font-semibold"/>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Tavsif</h3>
                    <p className="text-sm text-muted-foreground break-words min-h-[40px]">{apartment.description || <span className="italic">Tavsif mavjud emas</span>}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Summary and Quick Actions */}
          <div className="sticky top-20 self-start">
            <Card className="mb-6 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-lg">Umumiy ma'lumot</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 text-sm">
                  <InfoItem label="Holati:" value={getStatusBadge(apartment.status)} alignRight />

                  {/* Mijoz Info */}
                  {apartment.client ? (
                     <div className="border-t pt-3 space-y-1 dark:border-gray-700">
                        {/* ... (Mijoz va Kafil ma'lumotlari o'zgarishsiz) ... */}
                        <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Mijoz</h4>
                        <InfoItem label="F.I.O:" value={apartment.client.fio || "Noma'lum"} alignRight boldValue />
                        <InfoItem label="Telefon:" value={apartment.client.phone_number || "-"} alignRight />
                        {apartment.client.kafil_fio && (
                             <>
                             <div className="border-t pt-2 mt-2 dark:border-gray-600">
                                 <h5 className="text-xs font-semibold text-muted-foreground mb-0.5 uppercase tracking-wider">Kafil</h5>
                                 <InfoItem label="Kafil FIO:" value={apartment.client.kafil_fio} alignRight />
                                 <InfoItem label="Kafil Tel:" value={apartment.client.kafil_phone_number || "-"} alignRight />
                             </div>
                             </>
                         )}
                     </div>
                  ) : apartment.status !== 'bosh' ? ( <p className="text-xs text-muted-foreground italic border-t pt-3 dark:border-gray-700">Mijoz biriktirilmagan.</p> ) : null}

                   {/* Asosiy Shartnoma Info */}
                   {mainPayment ? (
                     <div className="border-t pt-3 space-y-1 dark:border-gray-700">
                        {/* ... (Asosiy shartnoma ma'lumotlari o'zgarishsiz, faqat hisoblangan qiymatlar ishlatiladi) ... */}
                        <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Shartnoma (#{mainPayment.id})</h4>
                        <InfoItem label="Turi:" value={getMainPaymentTypeLabel(mainPayment.payment_type)} alignRight capitalizeValue/>
                        <InfoItem label="Sana:" value={formatDate(mainPayment.created_at)} alignRight/>
                        {(mainPayment.payment_type === 'muddatli' || mainPayment.payment_type === 'ipoteka') && ( /* Faqat kerakli turlar uchun */
                            <>
                                <InfoItem label="Boshlang'ich:" value={formatCurrency(mainPayment.initial_payment)} alignRight boldValue/>
                                <InfoItem label="Oylik to'lov:" value={formatCurrency(mainPayment.monthly_payment)} alignRight boldValue/>
                                <InfoItem label="Muddat / Foiz:" value={`${mainPayment.duration_months || "-"} oy / ${mainPayment.interest_rate ?? 0}%`} alignRight/>
                                <InfoItem label="To'lov kuni:" value={`Har oy ${mainPayment.due_date || "?"}-s.`} alignRight/>
                            </>
                        )}
                        <InfoItem label="Jami to'langan:" value={formatCurrency(totalPaid)} alignRight boldValue className="text-green-700 dark:text-green-500"/>
                        <InfoItem label="Qoldiq:" value={formatCurrency(remainingAmount)} alignRight boldValue className="text-red-700 dark:text-red-500"/>
                        <InfoItem label="Statusi:" value={getPaymentStatusBadge(mainPayment.status)} alignRight/>
                     </div>
                  ) : apartment.status !== 'bosh' ? ( <p className="text-xs text-muted-foreground italic border-t pt-3 dark:border-gray-700">Shartnoma tuzilmagan.</p> ) : null}

                  {/* Oxirgi Balans To'lovlari */}
                  {apartment.status !== 'bosh' && apartment.status !== 'band' && userPayments.length > 0 && (
                      <div className="border-t pt-3 space-y-2 dark:border-gray-700">
                          {/* ... (Oxirgi 3 ta to'lovni ko'rsatish o'zgarishsiz) ... */}
                          <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Oxirgi Balans To‘lovlari</h4>
                          {lastThreeUserPayments.map((up) => (
                              <div key={up.id} className="flex justify-between items-start text-xs gap-2">
                                  <div className="flex-1">
                                      <div className="font-medium">{formatCurrency(up.amount)}</div>
                                      <div className="text-muted-foreground text-[11px]">{formatDate(up.date || up.created_at)} - {getUserPaymentTypeLabel(up.payment_type)}</div>
                                  </div>
                                  <div className="text-muted-foreground text-right whitespace-nowrap text-[11px]">ID: {up.id}</div>
                              </div>
                          ))}
                          {userPayments.length > 3 && (
                              <Button variant="link" size="sm" className="p-0 h-auto text-blue-600 hover:underline text-xs" onClick={() => { /* Logic to switch tab */ }}>
                                  Barchasini ko‘rish ({userPayments.length})
                              </Button>
                          )}
                      </div>
                  )}

                  {/* Balansga To'lov Qo'shish Tugmasi */}
                  {apartment.status !== 'bosh' && apartment.client && (
                      <Button size="sm" className="w-full mt-4" onClick={handleOpenPaymentModal} disabled={!apartment.client?.id}>
                          <CreditCard className="mr-2 h-4 w-4" /> Balansga To‘lov Qo‘shish
                      </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs Section */}
        {(mainPayment || userPayments.length > 0) && (
          <Tabs defaultValue="payments_history" className="mt-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3">
              <TabsTrigger value="payments_history" disabled={userPayments.length === 0}>Balans To‘lovlari {userPayments.length > 0 ? `(${userPayments.length})` : ''}</TabsTrigger>
              <TabsTrigger value="documents" disabled={!mainPayment}>Hujjatlar {documents.length > 0 ? `(${documents.length})` : ''}</TabsTrigger>
              {(mainPayment?.payment_type === 'muddatli' || mainPayment?.payment_type === 'ipoteka') && (<TabsTrigger value="payment_schedule">To‘lov Jadvali</TabsTrigger>)}
            </TabsList>

            {/* Balans To'lovlari Tab */}
            <TabsContent value="payments_history" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Mijoz Balansiga Qilingan To'lovlar</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {userPayments.length > 0 ? (
                      // API dan kelgan tartibda chiqarish yoki qayta saralash
                      [...userPayments].map((up) => (
                        <div key={up.id} className="flex flex-col sm:flex-row justify-between items-start p-3 border rounded-md hover:bg-accent/50 dark:border-gray-700 text-xs">
                            <div className="flex-1 pr-4 mb-2 sm:mb-0">
                                <div className="font-semibold text-sm mb-0.5">{formatCurrency(up.amount)}</div>
                                <div className="text-muted-foreground">{formatDate(up.date || up.created_at)} - {getUserPaymentTypeLabel(up.payment_type)}</div>
                                {up.description && (<div className="text-muted-foreground italic mt-1 text-xs break-words">"{up.description}"</div>)}
                            </div>
                            <div className="flex space-x-2 items-center self-start sm:self-center flex-shrink-0">
                                <span className="text-muted-foreground text-right whitespace-nowrap mr-2">ID: {up.id}</span>
                                {/* UserPayment Edit Button */}
                                <Button
                                    variant="outline" size="icon" className="h-7 w-7"
                                    onClick={() => handleOpenEditUserPaymentModal(up)}
                                    disabled={isUpdatingUserPayment || !!deletingUserPaymentId}
                                    title="Tahrirlash"
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                {/* UserPayment Delete Button */}
                                <Button
                                    variant="destructive" size="icon" className="h-7 w-7"
                                    onClick={() => handleDeleteUserPayment(up.id)}
                                    disabled={deletingUserPaymentId === up.id || isUpdatingUserPayment}
                                    title="O'chirish"
                                >
                                    {deletingUserPaymentId === up.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm italic text-center py-4">Mijoz balansiga hali to'lovlar qilinmagan.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Hujjatlar Tab */}
            <TabsContent value="documents" className="mt-4">
              <Card>
                 {/* ... (Hujjatlar qismi o'zgarishsiz) ... */}
                <CardHeader>
                    <CardTitle className="text-base">Biriktirilgan Hujjatlar</CardTitle>
                    <CardDescription className="text-sm">Shartnoma fayllari va boshqa tegishli hujjatlar.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {documents.length > 0 ? (
                      documents.map((doc) => {
                         const fileUrl = doc.docx_file || doc.pdf_file || doc.image;
                         const fileName = fileUrl?.split("/").pop() || `Hujjat ${doc.id}`;
                         return (
                           <div key={doc.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-accent/50 dark:border-gray-700 text-xs">
                             <div className="flex items-center gap-3 overflow-hidden">
                               <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                               <div className="overflow-hidden">
                                 <div className="font-medium text-sm truncate" title={fileName}>{fileName}</div>
                                 <div className="text-muted-foreground capitalize text-[11px]">{doc.document_type || "Noma'lum"} | Qo'shildi: {formatDate(doc.created_at)}</div>
                               </div>
                             </div>
                             {fileUrl && (
                               <Button variant="outline" size="icon" asChild className="ml-2 flex-shrink-0 h-7 w-7">
                                 <a href={`${API_BASE_URL}${fileUrl}`} target="_blank" rel="noopener noreferrer" download={fileName} title={`Yuklab olish: ${fileName}`}>
                                   <Download className="h-4 w-4" /><span className="sr-only">Yuklash</span>
                                 </a>
                               </Button>
                             )}
                           </div>
                         );
                       })
                     ) : ( <p className="text-muted-foreground text-sm italic text-center py-4">Hujjatlar topilmadi.</p> )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* To'lov Jadvali Tab */}
            {(mainPayment?.payment_type === 'muddatli' || mainPayment?.payment_type === 'ipoteka') && (
                <TabsContent value="payment_schedule" className="mt-4">
                    <Card>
                        {/* ... (To'lov jadvali qismi o'zgarishsiz) ... */}
                       <CardHeader>
                           <CardTitle className="text-base">Rejalashtirilgan To‘lovlar Jadvali</CardTitle>
                           <CardDescription className="text-sm">Kelajakdagi oylik to'lovlar rejasi.</CardDescription>
                       </CardHeader>
                       <CardContent>
                         {mainPayment && mainPayment.monthly_payment > 0 && mainPayment.duration_months > 0 ? (
                           <div className="space-y-4">
                             <div className="flex flex-wrap justify-between items-center gap-4 p-3 border rounded-md bg-accent/50 dark:border-gray-700 text-xs">
                               <div className="flex-1 min-w-[150px]">
                                 <div className="font-medium text-sm">Oylik to'lov</div>
                                 <div className="text-muted-foreground">Har oyning {mainPayment.due_date || "?"}-sanasi</div>
                               </div>
                               <div className="flex-1 min-w-[150px] text-right">
                                 <div className="font-semibold text-sm">{formatCurrency(mainPayment.monthly_payment)}</div>
                                 <div className="text-muted-foreground">{mainPayment.duration_months} oy davomida</div>
                               </div>
                             </div>
                             <p className="text-muted-foreground text-xs italic text-center py-2">Batafsil jadval ko'rsatish funksiyasi keyinroq qo'shiladi.</p>
                           </div>
                         ) : ( <p className="text-muted-foreground text-sm italic text-center py-4">Rejalashtirilgan oylik to'lovlar mavjud emas.</p> )}
                       </CardContent>
                    </Card>
                </TabsContent>
            )}
          </Tabs>
        )}
      </div>

      {/* Add User Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          {/* ... (Balansga to'lov qo'shish modali o'zgarishsiz) ... */}
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Mijoz Balansiga To'lov Qo'shish</DialogTitle>
                <DialogDescription className="text-sm">Xonadon №{apartment?.room_number} | Mijoz: {apartment?.client?.fio || "Noma'lum"}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                {/* Summa */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right text-sm">Summa ($)*</Label>
                    <Input id="amount" name="amount" type="number" value={paymentForm.amount} onChange={handlePaymentChange} placeholder="0.00" className="col-span-3" required step="0.01" min="0.01"/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 -mt-2"><span className="col-start-2 col-span-3 text-xs text-muted-foreground">{formatCurrency(paymentForm.amount)}</span></div>
                {/* Sana */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="paymentDate" className="text-right text-sm">Sana*</Label>
                    <Popover><PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP", { locale: uz }) : <span>Sanani tanlang</span>}
                        </Button>
                    </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus /></PopoverContent></Popover>
                </div>
                {/* To'lov Usuli */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="paymentType" className="text-right text-sm">To‘lov Usuli*</Label>
                    <div className="col-span-3">
                        <Select value={paymentForm.paymentType} onValueChange={handlePaymentTypeChange}>
                            <SelectTrigger id="paymentType"><SelectValue placeholder="Usulni tanlang" /></SelectTrigger>
                            <SelectContent position="popper">
                                <SelectItem value="naqd">Naqd pul</SelectItem>
                                <SelectItem value="plastik">Plastik karta</SelectItem>
                                <SelectItem value="bank">Bank o'tkazmasi</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {/* Izoh */}
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="description" className="text-right text-sm mt-1">Izoh</Label>
                    <Textarea id="description" name="description" value={paymentForm.description} onChange={handlePaymentChange} placeholder="To'lov haqida qo'shimcha ma'lumot (ixtiyoriy)" className="col-span-3" rows={2}/>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={handleClosePaymentModal} disabled={paymentLoading}>Bekor qilish</Button>
                <Button onClick={handleAddUserPayment} disabled={paymentLoading || !paymentForm.amount || !selectedDate || parseFloat(paymentForm.amount) <= 0}>
                    {paymentLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    {paymentLoading ? "Saqlanmoqda..." : "Saqlash va Kvitansiya"}
                </Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Edit Main Apartment Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        {/* ... (Asosiy xonadonni tahrirlash modali o'zgarishsiz) ... */}
        <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
                <DialogTitle>Xonadon №{apartment?.room_number} ni Tahrirlash</DialogTitle>
                <DialogDescription className="text-sm">Obyekt: {apartment?.object?.name || "Noma'lum"}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-6 -mx-6 md:px-2 md:-mx-2">
                <EditInput label="Xonadon №*" id="edit_room_number" name="room_number" value={editForm.room_number} onChange={handleEditChange} required />
                <EditInput label="Qavat*" id="edit_floor" name="floor" type="number" value={editForm.floor} onChange={handleEditChange} required min="0"/>
                <EditInput label="Xonalar soni*" id="edit_rooms" name="rooms" type="number" value={editForm.rooms} onChange={handleEditChange} required min="1"/>
                <EditInput label="Maydon (m²)*" id="edit_area" name="area" type="number" step="0.01" value={editForm.area} onChange={handleEditChange} required min="0.01"/>
                {/* Narx */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_price" className="text-right text-sm">Narx ($)*</Label>
                    <Input id="edit_price" name="price" type="number" step="0.01" value={editForm.price} onChange={handleEditChange} className="col-span-3" required min="0"/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 -mt-2"><span className="col-start-2 col-span-3 text-xs text-muted-foreground">{formatCurrency(editForm.price)}</span></div>
                {/* Tavsif */}
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="edit_description" className="text-right text-sm mt-1">Tavsif</Label>
                    <Textarea id="edit_description" name="description" value={editForm.description} onChange={handleEditChange} placeholder="Xonadon haqida qo'shimcha ma'lumot" className="col-span-3" rows={3}/>
                </div>
                {/* Holati */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_status" className="text-right text-sm">Holati*</Label>
                    <div className="col-span-3">
                        <Select value={editForm.status} onValueChange={handleEditStatusChange}>
                            <SelectTrigger id="edit_status"><SelectValue placeholder="Holati tanlang" /></SelectTrigger>
                            <SelectContent position="popper">
                                <SelectItem value="bosh">Bo‘sh</SelectItem>
                                <SelectItem value="band">Band</SelectItem>
                                <SelectItem value="muddatli">Muddatli</SelectItem>
                                <SelectItem value="sotilgan">Sotilgan</SelectItem>
                                <SelectItem value="ipoteka">Ipoteka</SelectItem>
                                <SelectItem value="subsidiya">Subsidiya</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={handleCloseEditModal} disabled={editLoading}>Bekor qilish</Button>
                <Button onClick={handleUpdateApartment} disabled={editLoading}>
                    {editLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    {editLoading ? "Saqlanmoqda..." : "Saqlash"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === YANGI: Edit User Payment Modal === */}
      <Dialog open={isEditUserPaymentModalOpen} onOpenChange={setIsEditUserPaymentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Balans To‘lovini Tahrirlash</DialogTitle>
            <DialogDescription>
               ID: {editingUserPayment?.id} | Mijoz: {apartment?.client?.fio || "Noma'lum"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
              {/* Summa */}
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_up_amount" className="text-right text-sm">Summa ($)*</Label>
                  <Input id="edit_up_amount" name="amount" type="number" value={editUserPaymentForm.amount} onChange={handleEditUserPaymentChange} placeholder="0.00" className="col-span-3" required step="0.01" min="0.01" disabled={isUpdatingUserPayment}/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4 -mt-2"><span className="col-start-2 col-span-3 text-xs text-muted-foreground">{formatCurrency(editUserPaymentForm.amount)}</span></div>

              {/* Sana */}
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_up_date" className="text-right text-sm">Sana*</Label>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !editUserPaymentForm.date && "text-muted-foreground")} disabled={isUpdatingUserPayment}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {editUserPaymentForm.date ? format(editUserPaymentForm.date, "PPP", { locale: uz }) : <span>Sanani tanlang</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={editUserPaymentForm.date} onSelect={handleEditUserPaymentDateChange} initialFocus />
                      </PopoverContent>
                  </Popover>
              </div>

              {/* To'lov Usuli */}
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_up_paymentType" className="text-right text-sm">To‘lov Usuli*</Label>
                  <div className="col-span-3">
                      <Select value={editUserPaymentForm.paymentType} onValueChange={handleEditUserPaymentTypeChange} disabled={isUpdatingUserPayment}>
                          <SelectTrigger id="edit_up_paymentType"><SelectValue placeholder="Usulni tanlang" /></SelectTrigger>
                          <SelectContent position="popper">
                              <SelectItem value="naqd">Naqd pul</SelectItem>
                              <SelectItem value="plastik">Plastik karta</SelectItem>
                              <SelectItem value="bank">Bank o'tkazmasi</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
              </div>

              {/* Izoh */}
              <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="edit_up_description" className="text-right text-sm mt-1">Izoh</Label>
                  <Textarea id="edit_up_description" name="description" value={editUserPaymentForm.description} onChange={handleEditUserPaymentChange} placeholder="Qo'shimcha ma'lumot" className="col-span-3" rows={2} disabled={isUpdatingUserPayment}/>
              </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditUserPaymentModal} disabled={isUpdatingUserPayment}>Bekor qilish</Button>
            <Button onClick={handleUpdateUserPayment} disabled={isUpdatingUserPayment || !editUserPaymentForm.amount || !editUserPaymentForm.date || parseFloat(editUserPaymentForm.amount) <= 0}>
              {isUpdatingUserPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              {isUpdatingUserPayment ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}