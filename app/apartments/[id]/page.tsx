"use client";

import { useState, useEffect, useCallback } from "react";
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
import { format, parseISO } from "date-fns";
import { uz } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";

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

function EditInput({ label, id, ...props }) {
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
  const [overduePayments, setOverduePayments] = useState(null);
  const [overdueReport, setOverdueReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    description: "",
  });

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

  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editPaymentForm, setEditPaymentForm] = useState({
    amount: "",
    description: "",
    date: new Date(),
  });
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);

  const [isOverduePaymentModalOpen, setIsOverduePaymentModalOpen] = useState(false);
  const [overduePaymentForm, setOverduePaymentForm] = useState({
    amount: "",
    payment_date: new Date(),
    payment_id: null,
  });
  const [overduePaymentLoading, setOverduePaymentLoading] = useState(false);

  const [totalPaid, setTotalPaid] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);

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

  const formatCurrency = useCallback((amount: string | number) => {
    const num = Number(amount);
    if (amount === null || amount === undefined || amount === "" || isNaN(num))
      return "0 $";
    return num.toLocaleString("us-USUZ", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, []);

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = parseISO(dateString);
      if (isNaN(date.getTime())) {
        return dateString.split("T")[0] || "-";
      }
      return format(date, "dd.MM.yyyy", { locale: uz });
    } catch (e) {
      console.warn("Date formatting error:", e, "Original string:", dateString);
      return dateString.split("T")[0] || "-";
    }
  }, []);

  const recalculateTotals = useCallback((currentApartmentData: any) => {
    if (!currentApartmentData) return;

    const payments = currentApartmentData.payments || [];
    const totalPaidFromPayments = payments.reduce(
      (sum: number, p: any) => sum + (parseFloat(p.paid_amount) || 0),
      0
    );

    const totalAmount = payments[0]?.total_amount
      ? parseFloat(payments[0].total_amount) || 0
      : parseFloat(currentApartmentData.price) || 0;

    const newRemainingAmount = totalAmount - totalPaidFromPayments;

    setTotalPaid(totalPaidFromPayments);
    setRemainingAmount(newRemainingAmount > 0 ? newRemainingAmount : 0);
  }, []);

  // --- Data Fetching ---
  const fetchApartmentDetails = useCallback(
    async (token: string) => {
      if (!token || !params.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setApartment(null);
      try {
        const apartmentId = params.id;
        const headers = getAuthHeaders(token);
        if (!headers) throw new Error("Avtorizatsiya tokeni yo'q.");

        const responses = await Promise.all([
          fetch(`${API_BASE_URL}/apartments/${apartmentId}/`, {
            method: "GET",
            headers,
          }).catch((e) => e),
          fetch(
            `${API_BASE_URL}/payments/?apartment=${apartmentId}&ordering=-created_at&page_size=100`,
            { method: "GET", headers }
          ).catch((e) => e),
          fetch(`${API_BASE_URL}/apartments/${apartmentId}/overdue_payments/`, {
            method: "GET",
            headers,
          }).catch((e) => e),
          fetch(`${API_BASE_URL}/apartments/overdue_payments_report/?apartment_id=${apartmentId}`, {
            method: "GET",
            headers,
          }).catch((e) => e),
        ]);

        const apartmentResponse = responses[0];
        const paymentsResponse = responses[1];
        const overduePaymentsResponse = responses[2];
        const overdueReportResponse = responses[3];

        if (
          !(apartmentResponse instanceof Response) ||
          !apartmentResponse.ok
        ) {
          if (apartmentResponse.status === 404)
            throw new Error(`Xonadon (ID: ${apartmentId}) topilmadi.`);
          if (apartmentResponse.status === 401) {
            localStorage.removeItem("access_token");
            router.push("/login");
            throw new Error("Sessiya muddati tugagan. Iltimos, qayta kiring.");
          }
          const errorText = await apartmentResponse
            ?.text?.()
            .catch(() => "Server xatosi");
          throw new Error(
            `Xonadon ma'lumotlarini olishda xatolik (${apartmentResponse?.status}): ${errorText}`
          );
        }
        const apartmentData = await apartmentResponse.json();

        let payments = [];
        let clientId = null;
        if (paymentsResponse instanceof Response && paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json();
          payments = paymentsData.results || [];
          if (payments.length > 0) {
            clientId = payments[0].user;
          }
        } else {
          console.warn(
            "To'lovlarni olishda ogohlantirish:",
            paymentsResponse?.status
          );
        }

        let overduePaymentsData = null;
        if (overduePaymentsResponse instanceof Response && overduePaymentsResponse.ok) {
          overduePaymentsData = await overduePaymentsResponse.json();
        } else {
          console.warn(
            "Muddati o'tgan to'lovlarni olishda ogohlantirish:",
            overduePaymentsResponse?.status
          );
        }

        let overdueReportData = null;
        if (overdueReportResponse instanceof Response && overdueReportResponse.ok) {
          overdueReportData = await overdueReportResponse.json();
        } else {
          console.warn(
            "Muddati o'tgan hisobotni olishda ogohlantirish:",
            overdueReportResponse?.status
          );
        }

        if (!clientId && apartmentData.owners && apartmentData.owners.length > 0) {
          clientId = apartmentData.owners[0];
        }

        let objectData = null;
        let clientData = null;
        let documentsData: any[] = [];

        const detailFetchPromises = [];

        if (apartmentData.object) {
          const objectId =
            typeof apartmentData.object === "object"
              ? apartmentData.object.id
              : apartmentData.object;
          if (objectId) {
            detailFetchPromises.push(
              fetch(`${API_BASE_URL}/objects/${objectId}/`, {
                method: "GET",
                headers,
              })
                .then((res) => (res.ok ? res.json() : null))
                .catch(() => null)
            );
          } else {
            detailFetchPromises.push(Promise.resolve(null));
          }
        } else {
          detailFetchPromises.push(Promise.resolve(null));
        }

        if (clientId) {
          detailFetchPromises.push(
            fetch(`${API_BASE_URL}/users/${clientId}/`, {
              method: "GET",
              headers,
            })
              .then((res) => (res.ok ? res.json() : null))
              .catch(() => null)
          );
        } else {
          detailFetchPromises.push(Promise.resolve(null));
        }

        if (payments.length > 0) {
          detailFetchPromises.push(
            fetch(
              `${API_BASE_URL}/documents/?payment=${payments[0].id}&page_size=50`,
              { method: "GET", headers }
            )
              .then((res) => (res.ok ? res.json() : { results: [] }))
              .then((data) => data.results || [])
              .catch(() => [])
          );
        } else {
          detailFetchPromises.push(Promise.resolve([]));
        }

        const detailResults = await Promise.all(detailFetchPromises);

        objectData = detailResults[0];
        clientData = detailResults[1];
        documentsData = detailResults[2];

        const completeApartmentData = {
          ...apartmentData,
          object: objectData || { id: apartmentData.object, name: "Noma'lum obyekt" },
          payments,
          client: clientData,
          documents: documentsData,
        };

        setApartment(completeApartmentData);
        setOverduePayments(overduePaymentsData);
        setOverdueReport(overdueReportData);
        recalculateTotals(completeApartmentData);

        setEditForm({
          room_number: apartmentData.room_number || "",
          floor: apartmentData.floor?.toString() || "",
          rooms: apartmentData.rooms?.toString() || "",
          area: apartmentData.area?.toString() || "",
          price: apartmentData.price || "",
          description: apartmentData.description || "",
          status: apartmentData.status || "",
          object:
            objectData?.id?.toString() ||
            apartmentData.object?.id?.toString() ||
            apartmentData.object?.toString() ||
            "",
        });
      } catch (error) {
        console.error("Xonadon tafsilotlarini olishda xato:", error);
        toast({
          title: "Xatolik",
          description: error.message || "Ma'lumotlarni olishda noma'lum xatolik.",
          variant: "destructive",
        });
        setApartment(null);
      } finally {
        setLoading(false);
      }
    },
    [params.id, router, getAuthHeaders, recalculateTotals]
  );

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
  }, [accessToken, params.id, fetchApartmentDetails]);

  // --- Event Handlers (Add Payment) ---
  const handleOpenPaymentModal = () => {
    if (!apartment?.client?.id) {
      toast({
        title: "Xatolik",
        description: "To'lov qo'shish uchun avval mijoz biriktirilishi kerak.",
        variant: "destructive",
      });
      return;
    }
    setSelectedDate(new Date());
    setPaymentForm({ amount: "", description: "" });
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPaymentForm({ amount: "", description: "" });
  };

  const handlePaymentChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddPayment = async () => {
    if (!isPaymentModalOpen) {
      console.warn(
        "To‘lov qo‘shish faqat modal orqali amalga oshirilishi mumkin."
      );
      return;
    }

    setPaymentLoading(true);
    const headers = getAuthHeaders();
    if (!headers || !apartment?.client?.id || !selectedDate) {
      toast({
        title: "Xatolik",
        description: "Mijoz ID, sana yoki avtorizatsiya tokeni topilmadi.",
        variant: "destructive",
      });
      setPaymentLoading(false);
      return;
    }

    const clientId = apartment.client.id;
    const paymentAmount = Number(paymentForm.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({
        title: "Xatolik",
        description: "Summa musbat son bo‘lishi kerak.",
        variant: "destructive",
      });
      setPaymentLoading(false);
      return;
    }

    const paymentData = {
      apartment: params.id,
      user: clientId,
      paid_amount: paymentAmount.toString(),
      payment_type: "naqd",
      additional_info: paymentForm.description,
      created_at: format(selectedDate, "yyyy-MM-dd"),
      total_amount: apartment.price,
      status: "paid",
    };

    try {
      const response = await fetch(`${API_BASE_URL}/payments/`, {
        method: "POST",
        headers,
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Server javobini o‘qib bo‘lmadi",
        }));
        throw new Error(
          `To‘lov qo‘shishda xatolik (${response.status}): ${
            errorData.error || JSON.stringify(errorData)
          }`
        );
      }

      const newPayment = await response.json();
      toast({
        title: "Muvaffaqiyat",
        description: "To‘lov muvaffaqiyatli qo‘shildi",
      });

      if (accessToken) {
        await fetchApartmentDetails(accessToken);
      }

      generateReceiptPDF({
        amount: paymentAmount.toFixed(2),
        description: paymentForm.description,
        date: format(selectedDate, "yyyy-MM-dd"),
      });
      handleClosePaymentModal();
    } catch (error) {
      toast({
        title: "Xatolik",
        description: error.message || "To‘lov qo‘shishda noma'lum xatolik.",
        variant: "destructive",
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  // --- Event Handlers (Pay Overdue Payment) ---
  const handleOpenOverduePaymentModal = (payment: any, paymentId: number) => {
    setOverduePaymentForm({
      amount: payment.amount.toString(),
      payment_date: parseISO(payment.due_date) || new Date(),
      payment_id: paymentId,
    });
    setIsOverduePaymentModalOpen(true);
  };

  const handleCloseOverduePaymentModal = () => {
    setIsOverduePaymentModalOpen(false);
    setOverduePaymentForm({
      amount: "",
      payment_date: new Date(),
      payment_id: null,
    });
  };

  const handleOverduePaymentChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setOverduePaymentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleOverduePaymentDateChange = (date: Date | undefined) => {
    if (date) {
      setOverduePaymentForm((prev) => ({ ...prev, payment_date: date }));
    }
  };

  const handlePayOverduePayment = async () => {
    setOverduePaymentLoading(true);
    const headers = getAuthHeaders();
    if (!headers || !overduePaymentForm.payment_id || !overduePaymentForm.payment_date) {
      toast({
        title: "Xatolik",
        description: "To'lov ID, sana yoki avtorizatsiya tokeni topilmadi.",
        variant: "destructive",
      });
      setOverduePaymentLoading(false);
      return;
    }

    const paymentAmount = Number(overduePaymentForm.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({
        title: "Xatolik",
        description: "Summa musbat son bo‘lishi kerak.",
        variant: "destructive",
      });
      setOverduePaymentLoading(false);
      return;
    }

    const paymentData = {
      amount: paymentAmount,
      payment_date: format(overduePaymentForm.payment_date, "yyyy-MM-dd"),
    };

    try {
      const response = await fetch(
        `${API_BASE_URL}/payments/${overduePaymentForm.payment_id}/process_payment/`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(paymentData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Server javobini o‘qib bo‘lmadi",
        }));
        throw new Error(
          `To‘lov qayta ishlashda xatolik (${response.status}): ${
            errorData.error || JSON.stringify(errorData)
          }`
        );
      }

      const result = await response.json();
      toast({
        title: "Muvaffaqiyat",
        description: result.message || "To‘lov muvaffaqiyatli qayta ishlandi",
      });

      if (accessToken) {
        await fetchApartmentDetails(accessToken);
      }

      generateReceiptPDF({
        amount: paymentAmount.toFixed(2),
        description: `Muddati o‘tgan to‘lov uchun (ID: ${overduePaymentForm.payment_id})`,
        date: format(overduePaymentForm.payment_date, "yyyy-MM-dd"),
      });
      handleCloseOverduePaymentModal();
    } catch (error) {
      toast({
        title: "Xatolik",
        description: error.message || "To‘lov qayta ishlashda noma'lum xatolik.",
        variant: "destructive",
      });
    } finally {
      setOverduePaymentLoading(false);
    }
  };

  // --- Event Handlers (Edit Main Apartment) ---
  const handleOpenEditModal = () => setIsEditModalOpen(true);
  const handleCloseEditModal = () => setIsEditModalOpen(false);
  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleEditStatusChange = (value: string) => {
    setEditForm((prev) => ({ ...prev, status: value }));
  };
  const handleUpdateApartment = async () => {
    setEditLoading(true);
    const apartmentId = params.id;
    const headers = getAuthHeaders();
    if (!headers || !apartmentId || !editForm.object) {
      toast({
        title: "Xatolik",
        description: "Xonadon ID, Obyekt ID yoki avtorizatsiya tokeni topilmadi.",
        variant: "destructive",
      });
      setEditLoading(false);
      return;
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

    if (
      Object.values(apartmentData).some(
        (val) =>
          val === undefined ||
          val === null ||
          (typeof val === "number" && isNaN(val))
      ) ||
      !apartmentData.room_number ||
      apartmentData.floor < 0 ||
      apartmentData.rooms <= 0 ||
      apartmentData.area <= 0 ||
      apartmentData.price < 0 ||
      !apartmentData.status ||
      apartmentData.object <= 0
    ) {
      toast({
        title: "Xatolik",
        description: "Barcha (*) belgili maydonlar to'g'ri to'ldirilishi kerak.",
        variant: "destructive",
      });
      setEditLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/apartments/${apartmentId}/`, {
        method: "PUT",
        headers,
        body: JSON.stringify(apartmentData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: "Server javobini o'qib bo'lmadi",
        }));
        throw new Error(
          `Xonadonni yangilashda xatolik (${response.status}): ${
            errorData.detail || JSON.stringify(errorData)
          }`
        );
      }
      toast({
        title: "Muvaffaqiyat",
        description: "Xonadon muvaffaqiyatli yangilandi",
      });
      handleCloseEditModal();
      if (accessToken) fetchApartmentDetails(accessToken);
    } catch (error) {
      toast({
        title: "Xatolik",
        description: error.message || "Xonadonni yangilashda noma'lum xatolik.",
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  };

  // --- Event Handlers (Edit/Delete Payment) ---
  const handleOpenEditPaymentModal = (payment: any) => {
    if (!payment) return;
    setEditingPayment(payment);
    setEditPaymentForm({
      amount: payment.paid_amount || "",
      description: payment.additional_info || "",
      date: payment.created_at ? parseISO(payment.created_at) : new Date(),
    });
    setIsEditPaymentModalOpen(true);
  };

  const handleCloseEditPaymentModal = () => {
    setIsEditPaymentModalOpen(false);
    setEditingPayment(null);
    setEditPaymentForm({
      amount: "",
      description: "",
      date: new Date(),
    });
  };

  const handleEditPaymentChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditPaymentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditPaymentDateChange = (date: Date | undefined) => {
    if (date) {
      setEditPaymentForm((prev) => ({ ...prev, date }));
    }
  };

  const handleUpdatePayment = async () => {
    setIsUpdatingPayment(true);
    const headers = getAuthHeaders();
    if (!headers || !editingPayment?.id || !editPaymentForm.date) {
      toast({
        title: "Xatolik",
        description: "To'lov ID, sana yoki avtorizatsiya tokeni topilmadi.",
        variant: "destructive",
      });
      setIsUpdatingPayment(false);
      return;
    }

    const paymentAmount = Number(editPaymentForm.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({
        title: "Xatolik",
        description: "Summa musbat son bo‘lishi kerak.",
        variant: "destructive",
      });
      setIsUpdatingPayment(false);
      return;
    }

    const updatedData = {
      payment_type: "naqd",
      additional_info: editPaymentForm.description,
    };

    try {
      const response = await fetch(
        `${API_BASE_URL}/payments/${editingPayment.id}/`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify(updatedData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: "Server javobini o'qib bo'lmadi",
        }));
        throw new Error(
          `To'lovni yangilashda xatolik (${response.status}): ${
            errorData.detail || JSON.stringify(errorData)
          }`
        );
      }
      const updatedPaymentFromServer = await response.json();

      const updatedPayments = (apartment.payments || []).map((p: any) =>
        p.id === updatedPaymentFromServer.id
          ? { ...p, ...updatedPaymentFromServer }
          : p
      );
      const updatedApartmentData = { ...apartment, payments: updatedPayments };
      setApartment(updatedApartmentData);
      recalculateTotals(updatedApartmentData);

      toast({
        title: "Muvaffaqiyat",
        description: "To'lov muvaffaqiyatli yangilandi.",
      });
      handleCloseEditPaymentModal();
    } catch (error) {
      toast({
        title: "Xatolik",
        description: error.message || "To'lovni yangilashda noma'lum xatolik.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    const headers = getAuthHeaders();
    if (!headers || deletingPaymentId) return;

    if (
      !window.confirm(
        `IDsi ${paymentId} bo'lgan to'lovni o'chirishga ishonchingiz komilmi?`
      )
    ) {
      return;
    }

    setDeletingPaymentId(paymentId);

    try {
      const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({
          detail: `Server xatosi (${response.status})`,
        }));
        throw new Error(
          `To'lovni o'chirishda xatolik: ${errorData.detail || response.statusText}`
        );
      }

      const updatedPayments = (apartment.payments || []).filter(
        (p: any) => p.id !== paymentId
      );
      const updatedApartmentData = { ...apartment, payments: updatedPayments };
      setApartment(updatedApartmentData);
      recalculateTotals(updatedApartmentData);

      toast({
        title: "Muvaffaqiyat!",
        description: `To'lov (ID: ${paymentId}) muvaffaqiyatli o'chirildi.`,
      });
    } catch (error) {
      toast({
        title: "Xatolik",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setDeletingPaymentId(null);
    }
  };

  // --- Other Helper Functions ---
  const generateReceiptPDF = (paymentData: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const lineHeight = 7;
    let yPosition = margin;

    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("TO'LOV KVITANSIYASI", pageWidth / 2, yPosition, {
      align: "center",
    });
    yPosition += lineHeight * 2;

    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text(`Obyekt: ${apartment?.object?.name || "N/A"}`, margin, yPosition);
    yPosition += lineHeight;
    doc.text(`Xonadon: № ${apartment?.room_number || "N/A"}`, margin, yPosition);
    yPosition += lineHeight;
    doc.text(`Mijoz: ${apartment?.client?.fio || "Noma'lum"}`, margin, yPosition);
    yPosition += lineHeight;
    doc.text(
      `Telefon: ${apartment?.client?.phone_number || "-"}`,
      margin,
      yPosition
    );
    yPosition += lineHeight * 1.5;

    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += lineHeight * 1.5;

    const drawRow = (label: string, value: string) => {
      doc.setFont(undefined, "bold");
      doc.text(`${label}:`, margin, yPosition);
      doc.setFont(undefined, "normal");
      doc.text(`${value}`, pageWidth - margin, yPosition, { align: "right" });
      yPosition += lineHeight;
    };

    drawRow("To'lov Summasi", formatCurrency(paymentData.amount));
    drawRow(
      "To'lov Sanasi",
      paymentData.date ? formatDate(paymentData.date) : "-"
    );
    drawRow("To'lov Usuli", "Naqd pul");

    if (paymentData.description) {
      yPosition += lineHeight * 0.5;
      doc.setFont(undefined, "bold");
      doc.text("Izoh:", margin, yPosition);
      yPosition += lineHeight;
      doc.setFont(undefined, "normal");
      const splitDescription = doc.splitTextToSize(
        paymentData.description,
        pageWidth - margin * 2
      );
      doc.text(splitDescription, margin, yPosition);
      yPosition += lineHeight * splitDescription.length;
    }

    yPosition += lineHeight * 0.5;
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += lineHeight * 1.5;

    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `Kvitansiya ${format(new Date(), "dd.MM.yyyy HH:mm")} da "Ahlan" tizimi orqali yaratildi.`,
      margin,
      yPosition
    );
    yPosition += lineHeight * 1.5;
    doc.setTextColor(0);
    doc.text(
      "Qabul qildi: _________________",
      pageWidth - margin - 65,
      yPosition,
      {
        align: "right",
      }
    );

    doc.save(
      `Kvitansiya-X${apartment?.room_number}-${format(
        parseISO(paymentData.date),
        "yyyyMMdd"
      )}.pdf`
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "bosh":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
            Bo‘sh
          </Badge>
        );
      case "band":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">
            Band
          </Badge>
        );
      case "muddatli":
        return (
          <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
            Muddatli
          </Badge>
        );
      case "sotilgan":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white">
            Sotilgan
          </Badge>
        );
      case "ipoteka":
        return (
          <Badge className="bg-purple-500 hover:bg-purple-600 text-white">
            Ipoteka
          </Badge>
        );
      case "subsidiya":
        return (
          <Badge className="bg-teal-500 hover:bg-teal-600 text-white">
            Subsidiya
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status || "Noma'lum"}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return (
          <Badge className="bg-green-600 hover:bg-green-700 text-white">
            To‘langan
          </Badge>
        );
      case "active":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
            Aktiv
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="outline"
            className="text-yellow-600 border-yellow-500"
          >
            Kutilmoqda
          </Badge>
        );
      case "overdue":
        return <Badge variant="destructive">Muddati o‘tgan</Badge>;
      default:
        return <Badge variant="secondary">{status || "Noma'lum"}</Badge>;
    }
  };

  const getMainPaymentTypeLabel = (paymentType: string) => {
    switch (paymentType) {
      case "naqd":
        return "Naqd (To‘liq)";
      case "muddatli":
        return "Muddatli to‘lov";
      case "ipoteka":
        return "Ipoteka";
      case "subsidiya":
        return "Subsidiya";
      case "band":
        return "Band qilish";
      default:
        return paymentType || "Noma'lum";
    }
  };

  const handleDownloadContract = async (paymentId: number) => {
    const headers = getAuthHeaders();
    if (!headers || !paymentId) return;

    const payment = apartment?.payments?.find((p: any) => p.id === paymentId);
    if (payment?.payment_type === "band") {
      toast({
        title: "Ma'lumot",
        description: "'Band qilish' uchun alohida shartnoma generatsiya qilinmaydi.",
        variant: "default",
      });
      return;
    }

    toast({
      title: "Boshlanmoqda...",
      description: "Shartnoma generatsiya qilinmoqda...",
      duration: 2000,
    });
    try {
      const response = await fetch(
        `${API_BASE_URL}/payments/${paymentId}/download_contract/`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: "Server javobini o'qib bo'lmadi",
        }));
        if (response.status === 404 && payment?.payment_type === "band") {
          throw new Error("'Band qilish' uchun shartnoma mavjud emas.");
        }
        throw new Error(
          `Shartnoma yuklashda xatolik (${response.status}): ${
            errorData.detail || "Noma'lum server xatosi"
          }`
        );
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `shartnoma_${paymentId}.docx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(
          /filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i
        );
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast({
        title: "Muvaffaqiyat",
        description: `"${filename}" yuklab olindi.`,
      });
    } catch (error) {
      toast({
        title: "Xatolik",
        description:
          (error as Error).message || "Shartnomani yuklashda noma'lum xatolik.",
        variant: "destructive",
      });
    }
  };

  // --- Render Logic ---
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="border-b sticky top-0 bg-background z-10">
          <div className="flex h-16 items-center px-4">
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              <Search />
              <UserNav />
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="mr-2 h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Ma'lumotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!apartment) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="border-b sticky top-0 bg-background z-10">
          <div className="flex h-16 items-center px-4">
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              <Search />
              <UserNav />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-red-600">
              Xonadon topilmadi
            </h2>
            <Button
              variant="outline"
              onClick={() => router.push("/apartments")}
            >
              <Home className="mr-2 h-4 w-4" /> Barcha xonadonlar
            </Button>
          </div>
          <p className="text-muted-foreground">
            Ushbu ID ({params.id}) ga ega xonadon mavjud emas yoki ma'lumotlarni
            yuklashda xatolik yuz berdi.
          </p>
        </div>
      </div>
    );
  }

  const mainPayment = apartment.payments?.[0];
  const payments = apartment.payments || [];
  const documents = apartment.documents || [];
  const lastThreePayments = [...payments].slice(0, 3);

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
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Xonadon № {apartment.room_number}
            </h2>
            <p className="text-muted-foreground">
              {apartment.object?.name || "Noma'lum obyekt"}
            </p>
          </div>
          <div className="flex space-x-2 flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/apartments")}
            >
              <Home className="mr-2 h-4 w-4" /> Barcha xonadonlar
            </Button>
            {apartment.object?.id && (
              <Link href={`/objects/${apartment.object.id}`} passHref>
                <Button variant="outline" size="sm">
                  <Building className="mr-2 h-4 w-4" /> Obyektga qaytish
                </Button>
              </Link>
            )}
            {apartment.status === "bosh" && (
              <Button
                size="sm"
                onClick={() =>
                  router.push(`/apartments/${apartment.id}/reserve`)
                }
              >
                <User className="mr-2 h-4 w-4" /> Band qilish / Sotish
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenEditModal}
            >
              <Edit className="mr-2 h-4 w-4" /> Tahrirlash
            </Button>
            {mainPayment && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadContract(mainPayment.id)}
                disabled={mainPayment?.payment_type === "band"}
              >
                <Download className="mr-2 h-4 w-4" /> Shartnoma
              </Button>
            )}
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Apartment Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <div className="relative h-[250px] md:h-[350px] bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
                  <img
                    src={
                      apartment.object?.image ||
                      apartment.image ||
                      "/placeholder.svg?h=350&w=600"
                    }
                    alt={`Xonadon ${apartment.room_number}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg?h=350&w=600";
                      e.currentTarget.onerror = null;
                    }}
                    loading="lazy"
                  />
                  <div className="absolute top-4 right-4">
                    {getStatusBadge(apartment.status)}
                  </div>
                </div>
                <div className="p-4 md:p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 border-b pb-4 dark:border-gray-700">
                    <InfoItem label="Qavat" value={apartment.floor ?? "-"} />
                    <InfoItem
                      label="Xonalar"
                      value={`${apartment.rooms || "-"} xona`}
                    />
                    <InfoItem
                      label="Maydon"
                      value={`${apartment.area || "-"} m²`}
                    />
                    <InfoItem
                      label="Narx"
                      value={formatCurrency(apartment.price)}
                      className="text-green-600 dark:text-green-500 font-semibold"
                    />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Tavsif</h3>
                  <p className="text-sm text-muted-foreground break-words min-h-[40px]">
                    {apartment.description || (
                      <span className="italic">Tavsif mavjud emas</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Summary and Quick Actions */}
          <div className="sticky top-20 self-start">
            <Card className="mb-6 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Umumiy ma'lumot</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 text-sm">
                  <InfoItem
                    label="Holati:"
                    value={getStatusBadge(apartment.status)}
                    alignRight
                  />

                  {apartment.client ? (
                    <div className="border-t pt-3 space-y-1 dark:border-gray-700">
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                        Mijoz
                      </h4>
                      <InfoItem
                        label="F.I.O:"
                        value={apartment.client.fio || "Noma'lum"}
                        alignRight
                        boldValue
                      />
                      <InfoItem
                        label="Telefon:"
                        value={apartment.client.phone_number || "-"}
                        alignRight
                      />
                      {apartment.client.kafil_fio && (
                        <>
                          <div className="border-t pt-2 mt-2 dark:border-gray-600">
                            <h5 className="text-xs font-semibold text-muted-foreground mb-0.5 uppercase tracking-wider">
                              Kafil
                            </h5>
                            <InfoItem
                              label="Kafil FIO:"
                              value={apartment.client.kafil_fio}
                              alignRight
                            />
                            <InfoItem
                              label="Kafil Tel:"
                              value={
                                apartment.client.kafil_phone_number || "-"
                              }
                              alignRight
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ) : apartment.status !== "bosh" ? (
                    <p className="text-xs text-muted-foreground italic border-t pt-3 dark:border-gray-700">
                      Mijoz biriktirilmagan.
                    </p>
                  ) : null}

                  {mainPayment ? (
                    <div className="border-t pt-3 space-y-1 dark:border-gray-700">
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                        Shartnoma (#{mainPayment.id})
                      </h4>
                      <InfoItem
                        label="Turi:"
                        value={getMainPaymentTypeLabel(
                          mainPayment.payment_type
                        )}
                        alignRight
                        capitalizeValue
                      />
                      <InfoItem
                        label="Sana:"
                        value={formatDate(mainPayment.created_at)}
                        alignRight
                      />
                      {(mainPayment.payment_type === "muddatli" ||
                        mainPayment.payment_type === "ipoteka") && (
                        <>
                          <InfoItem
                            label="Boshlang'ich:"
                            value={formatCurrency(mainPayment.initial_payment)}
                            alignRight
                            boldValue
                          />
                          <InfoItem
                            label="Oylik to'lov:"
                            value={formatCurrency(mainPayment.monthly_payment)}
                            alignRight
                            boldValue
                          />
                          <InfoItem
                            label="Muddat / Foiz:"
                            value={`${mainPayment.duration_months || "-"} oy / ${
                              mainPayment.interest_rate ?? 0
                            }%`}
                            alignRight
                          />
                          <InfoItem
                            label="To'lov kuni:"
                            value={`Har oy ${mainPayment.due_date || "?"}-s.`}
                            alignRight
                          />
                        </>
                      )}
                      <InfoItem
                        label="Jami to'langan:"
                        value={formatCurrency(totalPaid)}
                        alignRight
                        boldValue
                        className="text-green-700 dark:text-green-500"
                      />
                      <InfoItem
                        label="Qoldiq:"
                        value={formatCurrency(remainingAmount)}
                        alignRight
                        boldValue
                        className="text-red-700 dark:text-red-500"
                      />
                      <InfoItem
                        label="Statusi:"
                        value={getPaymentStatusBadge(mainPayment.status)}
                        alignRight
                      />
                      {overduePayments && overduePayments.total_overdue > 0 && (
                        <InfoItem
                          label="Muddati o‘tgan:"
                          value={formatCurrency(overduePayments.total_overdue)}
                          alignRight
                          boldValue
                          className="text-red-600 dark:text-red-500"
                        />
                      )}
                    </div>
                  ) : apartment.status !== "bosh" ? (
                    <p className="text-xs text-muted-foreground italic border-t pt-3 dark:border-gray-700">
                      Shartnoma tuzilmagan.
                    </p>
                  ) : null}

                  {apartment.status !== "bosh" &&
                    apartment.status !== "band" &&
                    payments.length > 0 && (
                      <div className="border-t pt-3 space-y-2 dark:border-gray-700">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                          Oxirgi To‘lovlar
                        </h4>
                        {lastThreePayments.map((p: any) => (
                          <div
                            key={p.id}
                            className="flex justify-between items-start text-xs gap-2"
                          >
                            <div className="flex-1">
                              <div className="font-medium">
                                {formatCurrency(p.paid_amount)}
                              </div>
                              <div className="text-muted-foreground text-[11px]">
                                {formatDate(p.created_at)} - Naqd pul
                              </div>
                            </div>
                            <div className="text-muted-foreground text-right whitespace-nowrap text-[11px]">
                              ID: {p.id}
                            </div>
                          </div>
                        ))}
                        {payments.length > 3 && (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-blue-600 hover:underline text-xs"
                            onClick={() => {}}
                          >
                            Barchasini ko‘rish ({payments.length})
                          </Button>
                        )}
                      </div>
                    )}

                  {apartment.status !== "bosh" && apartment.client && (
                    <Button
                      size="sm"
                      className="w-full mt-4"
                      onClick={handleOpenPaymentModal}
                      disabled={!apartment.client?.id}
                    >
                      <CreditCard className="mr-2 h-4 w-4" /> Balansga To‘lov
                      Qo‘shish
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs Section */}
        {payments.length > 0 && (
          <Tabs defaultValue="payments_history" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="payments_history">
                To‘lovlar Tarixi
              </TabsTrigger>
              <TabsTrigger value="documents">Hujjatlar</TabsTrigger>
              <TabsTrigger value="overdue_report">Hisobot</TabsTrigger>
            </TabsList>

            {/* To‘lovlar Tarixi */}
            <TabsContent value="payments_history">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">To‘lovlar Tarixi</CardTitle>
                  <CardDescription>
                    Xonadon bo‘yicha barcha to‘lovlar va balans o‘zgarishlari.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mainPayment && (
                    <div className="border-b pb-4 mb-4 dark:border-gray-700">
                      <h4 className="text-sm font-semibold mb-2">
                        Asosiy Shartnoma To‘lovi
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <InfoItem
                          label="Shartnoma ID"
                          value={`#${mainPayment.id}`}
                          boldValue
                        />
                        <InfoItem
                          label="Turi"
                          value={getMainPaymentTypeLabel(
                            mainPayment.payment_type
                          )}
                          capitalizeValue
                        />
                        <InfoItem
                          label="Sana"
                          value={formatDate(mainPayment.created_at)}
                        />
                        <InfoItem
                          label="Jami Summa"
                          value={formatCurrency(mainPayment.total_amount)}
                          className="text-blue-600 dark:text-blue-500 font-semibold"
                        />
                        {(mainPayment.payment_type === "muddatli" ||
                          mainPayment.payment_type === "ipoteka") && (
                          <>
                            <InfoItem
                              label="Boshlang‘ich To‘lov"
                              value={formatCurrency(mainPayment.initial_payment)}
                            />
                            <InfoItem
                              label="Oylik To‘lov"
                              value={formatCurrency(mainPayment.monthly_payment)}
                            />
                          </>
                        )}
                        <InfoItem
                          label="To‘langan"
                          value={formatCurrency(totalPaid)}
                          className="text-green-600 dark:text-green-500 font-semibold"
                        />
                        <InfoItem
                          label="Qoldiq"
                          value={formatCurrency(remainingAmount)}
                          className="text-red-600 dark:text-red-500 font-semibold"
                        />
                        <InfoItem
                          label="Status"
                          value={getPaymentStatusBadge(mainPayment.status)}
                        />
                      </div>
                    </div>
                  )}

                  {overduePayments && overduePayments.overdue_payments?.length > 0 && (
                    <div className="border-b pb-4 mb-4 dark:border-gray-700">
                      <h4 className="text-sm font-semibold mb-2">
                        Muddati O‘tgan To‘lovlar
                      </h4>
                      <div className="space-y-3">
                        {overduePayments.overdue_payments.map((op: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="font-medium">
                                {formatCurrency(op.amount)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Oy: {op.month} | Muddati: {formatDate(op.due_date)}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleOpenOverduePaymentModal(op, mainPayment.id)}
                            >
                              To‘lash
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-sm font-semibold text-red-600 dark:text-red-500">
                        Jami muddati o‘tgan: {formatCurrency(overduePayments.total_overdue)}
                      </div>
                    </div>
                  )}

                  {payments.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">
                        To‘lovlar
                      </h4>
                      <div className="space-y-3">
                        {payments.map((payment: any) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium">
                                    {formatCurrency(payment.paid_amount)}
                                  </span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    (ID: {payment.id})
                                  </span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {formatDate(payment.created_at)}
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                To‘lov usuli: {getMainPaymentTypeLabel(payment.payment_type)}
                              </div>
                              {payment.additional_info && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  Izoh: {payment.additional_info}
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleOpenEditPaymentModal(payment)
                                }
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeletePayment(payment.id)}
                                disabled={deletingPaymentId === payment.id}
                              >
                                {deletingPaymentId === payment.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      To‘lovlar mavjud emas.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Hujjatlar */}
            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Hujjatlar</CardTitle>
                  <CardDescription>
                    Shartnoma bilan bog‘liq barcha hujjatlar.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {documents.length > 0 ? (
                    <div className="space-y-3">
                      {documents.map((doc: any) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">
                                {doc.document_type || `Hujjat #${doc.id}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Yuklangan: {formatDate(doc.created_at)}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`${API_BASE_URL}${doc.docx_file || doc.pdf_file || doc.image}`, "_blank")}
                          >
                            <Download className="h-4 w-4 mr-2" /> Yuklash
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Hujjatlar mavjud emas.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Hisobot */}
            <TabsContent value="overdue_report">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Muddati O‘tgan To‘lovlar Hisoboti</CardTitle>
                  <CardDescription>
                    Ushbu xonadon bo‘yicha muddati o‘tgan to‘lovlar hisoboti.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {overdueReport && overdueReport.report?.length > 0 ? (
                    <div className="space-y-4">
                      {overdueReport.report.map((report: any, index: number) => (
                        <div key={index} className="border-b pb-4 dark:border-gray-700">
                          <h4 className="text-sm font-semibold mb-2">
                            {report.apartment} ({report.object})
                          </h4>
                          <div className="space-y-3">
                            {report.overdue_payments.map((op: any, opIndex: number) => (
                              <div
                                key={opIndex}
                                className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {formatCurrency(op.amount)}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Oy: {op.month} | Muddati: {formatDate(op.due_date)}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenOverduePaymentModal(op, mainPayment.id)}
                                >
                                  To‘lash
                                </Button>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 text-sm font-semibold text-red-600 dark:text-red-500">
                            Jami muddati o‘tgan: {formatCurrency(report.total_overdue)}
                          </div>
                        </div>
                      ))}
                      <div className="text-sm font-semibold text-red-600 dark:text-red-500">
                        Umumiy muddati o‘tgan: {formatCurrency(overdueReport.total_overdue_all)}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Muddati o‘tgan to‘lovlar mavjud emas.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Add Payment Modal */}
      <Dialog
        open={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Balansga To‘lov Qo‘shish</DialogTitle>
            <DialogDescription>
              Mijoz balansiga yangi to‘lov qo‘shish uchun quyidagi ma’lumotlarni
              to‘ldiring.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Summa *
              </Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                value={paymentForm.amount}
                onChange={handlePaymentChange}
                className="col-span-3"
                placeholder="Masalan: 1000000"
                min="0"
                step="0.01"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Sana *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "col-span-3 justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "PPP", { locale: uz })
                    ) : (
                      <span>Sanani tanlang</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    locale={uz}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Izoh
              </Label>
              <Textarea
                id="description"
                name="description"
                value={paymentForm.description}
                onChange={handlePaymentChange}
                className="col-span-3"
                placeholder="To‘lov haqida qo‘shimcha ma’lumot (ixtiyoriy)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClosePaymentModal}
              disabled={paymentLoading}
            >
              Bekor qilish
            </Button>
            <Button
              onClick={handleAddPayment}
              disabled={
                paymentLoading ||
                !paymentForm.amount ||
                !selectedDate ||
                parseFloat(paymentForm.amount) <= 0
              }
            >
              {paymentLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {paymentLoading ? "Saqlanmoqda..." : "Saqlash va Kvitansiya"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Overdue Payment Modal */}
      <Dialog
        open={isOverduePaymentModalOpen}
        onOpenChange={setIsOverduePaymentModalOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Muddati O‘tgan To‘lovni To‘lash</DialogTitle>
            <DialogDescription>
              Muddati o‘tgan to‘lovni yopish uchun ma’lumotlarni to‘ldiring.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Summa *
              </Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                value={overduePaymentForm.amount}
                onChange={handleOverduePaymentChange}
                className="col-span-3"
                placeholder="Masalan: 3000"
                min="0"
                step="0.01"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment_date" className="text-right">
                To‘lov Sanasi *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "col-span-3 justify-start text-left font-normal",
                      !overduePaymentForm.payment_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {overduePaymentForm.payment_date ? (
                      format(overduePaymentForm.payment_date, "PPP", { locale: uz })
                    ) : (
                      <span>Sanani tanlang</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={overduePaymentForm.payment_date}
                    onSelect={handleOverduePaymentDateChange}
                    initialFocus
                    locale={uz}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseOverduePaymentModal}
              disabled={overduePaymentLoading}
            >
              Bekor qilish
            </Button>
            <Button
              onClick={handlePayOverduePayment}
              disabled={
                overduePaymentLoading ||
                !overduePaymentForm.amount ||
                !overduePaymentForm.payment_date ||
                parseFloat(overduePaymentForm.amount) <= 0
              }
            >
              {overduePaymentLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {overduePaymentLoading ? "Saqlanmoqda..." : "To‘lash va Kvitansiya"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Apartment Modal */}
      <Dialog
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Xonadonni Tahrirlash</DialogTitle>
            <DialogDescription>
              Xonadon ma’lumotlarini yangilash uchun quyidagi maydonlarni
              to‘ldiring.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <EditInput
              label="Xona raqami *"
              id="room_number"
              name="room_number"
              value={editForm.room_number}
              onChange={handleEditChange}
            />
            <EditInput
              label="Qavat *"
              id="floor"
              name="floor"
              type="number"
              value={editForm.floor}
              onChange={handleEditChange}
              min="0"
            />
            <EditInput
              label="Xonalar soni *"
              id="rooms"
              name="rooms"
              type="number"
              value={editForm.rooms}
              onChange={handleEditChange}
              min="1"
            />
            <EditInput
              label="Maydon (m²) *"
              id="area"
              name="area"
              type="number"
              value={editForm.area}
              onChange={handleEditChange}
              min="0"
              step="0.01"
            />
            <EditInput
              label="Narx ($) *"
              id="price"
              name="price"
              type="number"
              value={editForm.price}
              onChange={handleEditChange}
              min="0"
              step="0.01"
            />
            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="description"
                className="text-right text-sm"
              >
                Tavsif
              </Label>
              <Textarea
                id="description"
                name="description"
                value={editForm.description}
                onChange={handleEditChange}
                className="col-span-3"
                placeholder="Xonadon haqida qo‘shimcha ma’lumot (ixtiyoriy)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseEditModal}
              disabled={editLoading}
            >
              Bekor qilish
            </Button>
            <Button
              onClick={handleUpdateApartment}
              disabled={editLoading}
            >
              {editLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editLoading ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}