"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { format } from "date-fns";
import { uz } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";

const API_BASE_URL = "http://api.ahlan.uz";

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
        {value}
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

export default function ApartmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [apartment, setApartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [totalPaid, setTotalPaid] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentType: "naqd",
    description: "",
  });
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

  const getAuthHeaders = (token = accessToken) => ({
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

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

  const fetchApartmentDetails = async (token) => {
    setLoading(true);
    try {
      const apartmentId = params.id;
      if (!apartmentId) {
        throw new Error("Apartment ID is undefined or invalid.");
      }

      const apartmentResponse = await fetch(
        `${API_BASE_URL}/apartments/${apartmentId}/`,
        {
          method: "GET",
          headers: getAuthHeaders(token),
        }
      );

      if (!apartmentResponse.ok) {
        const errorText = await apartmentResponse.text();
        if (apartmentResponse.status === 401) {
          localStorage.removeItem("access_token");
          router.push("/login");
          throw new Error("Sessiya muddati tugagan. Iltimos, qayta kiring.");
        }
        if (apartmentResponse.status === 404) {
          throw new Error(`Xonadon (ID: ${apartmentId}) topilmadi.`);
        }
        throw new Error(
          `Xonadon ma'lumotlarini olishda xatolik (${apartmentResponse.status}): ${errorText}`
        );
      }

      const apartmentData = await apartmentResponse.json();

      // Obyekt ma'lumotlarini olish
      let objectData = null;
      if (apartmentData.object) {
        const objectId =
          typeof apartmentData.object === "object"
            ? apartmentData.object.id
            : apartmentData.object;
        const objectResponse = await fetch(
          `${API_BASE_URL}/objects/${objectId}/`,
          {
            method: "GET",
            headers: getAuthHeaders(token),
          }
        );

        if (objectResponse.ok) {
          objectData = await objectResponse.json();
        } else {
          console.warn(
            `Obyekt ma'lumotlarini olishda xatolik: ${objectResponse.status}`
          );
        }
      }

      let payments = [];
      let documents = [];
      let client = null;
      let userPayments = [];
      let mainPaymentId = null;
      let clientId = null;

      const allPaymentsResponse = await fetch(
        `${API_BASE_URL}/payments/?apartment=${apartmentId}&page_size=1`,
        { method: "GET", headers: getAuthHeaders(token) }
      );

      if (allPaymentsResponse.ok) {
        const paymentsData = await allPaymentsResponse.json();
        payments = paymentsData.results || [];
        if (payments.length > 0) {
          mainPaymentId = payments[0].id;
          clientId = payments[0].user;
        }
      } else {
        console.warn("Payments fetch warning:", allPaymentsResponse.status);
      }

      if (
        !clientId &&
        apartmentData.owners &&
        apartmentData.owners.length > 0
      ) {
        clientId = apartmentData.owners[0];
      }

      if (clientId) {
        const fetchPromises = [
          fetch(`${API_BASE_URL}/users/${clientId}/`, {
            method: "GET",
            headers: getAuthHeaders(token),
          }),
          fetch(
            `${API_BASE_URL}/user-payments/?user=${clientId}&page_size=100`,
            { method: "GET", headers: getAuthHeaders(token) }
          ),
        ];

        if (mainPaymentId) {
          fetchPromises.push(
            fetch(
              `${API_BASE_URL}/documents/?payment=${mainPaymentId}&page_size=50`,
              { method: "GET", headers: getAuthHeaders(token) }
            )
          );
        }

        const responses = await Promise.all(
          fetchPromises.map((p) => p.catch((e) => e))
        );

        const clientResponse = responses[0];
        const userPaymentsResponse = responses[1];
        const docsResponse = responses[2];

        if (clientResponse instanceof Response && clientResponse.ok)
          client = await clientResponse.json();
        if (userPaymentsResponse instanceof Response && userPaymentsResponse.ok)
          userPayments = (await userPaymentsResponse.json()).results || [];
        if (docsResponse instanceof Response && docsResponse.ok)
          documents = (await docsResponse.json()).results || [];
      }

      const mainPayment = payments[0];
      let calculatedTotalPaid = 0;
      let calculatedRemaining = 0;

      if (mainPayment) {
        const initialPayment = parseFloat(mainPayment.initial_payment) || 0;
        const userPaymentsTotal = userPayments.reduce(
          (sum, up) => sum + (parseFloat(up.amount) || 0),
          0
        );
        calculatedTotalPaid = initialPayment + userPaymentsTotal;
        const totalAmount = parseFloat(mainPayment.total_amount) || 0;
        calculatedRemaining = totalAmount - calculatedTotalPaid;
      }

      setTotalPaid(calculatedTotalPaid);
      setRemainingAmount(calculatedRemaining > 0 ? calculatedRemaining : 0);

      setApartment({
        ...apartmentData,
        object: objectData || { id: apartmentData.object, name: "Noma'lum obyekt" },
        payments,
        documents,
        client,
        userPayments,
      });

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
      console.error("Fetch apartment details error:", error.message);
      toast({
        title: "Xatolik",
        description: error.message || "Ma'lumotlarni olishda noma'lum xatolik.",
        variant: "destructive",
      });
      setApartment(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken && params.id) {
      fetchApartmentDetails(accessToken);
    }
  }, [accessToken, params.id]);

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
    setPaymentForm({
      amount: "",
      paymentType: "naqd",
      description: "",
    });
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPaymentForm({
      amount: "",
      paymentType: "naqd",
      description: "",
    });
  };

  const handleOpenEditModal = () => setIsEditModalOpen(true);
  const handleCloseEditModal = () => setIsEditModalOpen(false);

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePaymentTypeChange = (value) => {
    setPaymentForm((prev) => ({
      ...prev,
      paymentType: value,
    }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditStatusChange = (value) => {
    setEditForm((prev) => ({ ...prev, status: value }));
  };

  const getUserPaymentTypeLabel = (paymentType) => {
    switch (paymentType) {
      case "naqd":
        return "Naqd pul";
      case "muddatli":
        return "Muddatli to‘lov";
      case "ipoteka":
        return "Ipoteka";
      default:
        return paymentType || "Noma'lum";
    }
  };

  const getMainPaymentTypeLabel = (paymentType) => {
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

  const formatCurrency = (amount) => {
    const num = Number(amount);
    if (amount === null || amount === undefined || amount === "" || isNaN(num))
      return "$0.00";
    return num.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const datePart = dateString.includes("T")
        ? dateString.split("T")[0]
        : dateString;
      const date = new Date(datePart + "T00:00:00Z");
      if (isNaN(date.getTime())) {
        return dateString.split("T")[0] || "-";
      }
      return format(date, "dd.MM.yyyy", { locale: uz });
    } catch (e) {
      return dateString.split("T")[0] || "-";
    }
  };

  const generateReceiptPDF = (paymentData) => {
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
    doc.text(
      `Xonadon: № ${apartment?.room_number || "N/A"}`,
      margin,
      yPosition
    );
    yPosition += lineHeight;
    doc.text(
      `Mijoz: ${apartment?.client?.fio || "Noma'lum"}`,
      margin,
      yPosition
    );
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

    doc.setFont(undefined, "bold");
    doc.text(`To'lov Summasi:`, margin, yPosition);
    doc.setFont(undefined, "normal");
    doc.text(
      `${formatCurrency(paymentData.amount)}`,
      pageWidth - margin,
      yPosition,
      { align: "right" }
    );
    yPosition += lineHeight;

    doc.setFont(undefined, "bold");
    doc.text(`To'lov Sanasi:`, margin, yPosition);
    doc.setFont(undefined, "normal");
    doc.text(
      `${paymentData.date ? formatDate(paymentData.date) : "-"}`,
      pageWidth - margin,
      yPosition,
      { align: "right" }
    );
    yPosition += lineHeight;

    doc.setFont(undefined, "bold");
    doc.text(`To'lov Usuli:`, margin, yPosition);
    doc.setFont(undefined, "normal");
    doc.text(
      `${getUserPaymentTypeLabel(paymentData.payment_type)}`,
      pageWidth - margin,
      yPosition,
      { align: "right" }
    );
    yPosition += lineHeight;

    if (paymentData.description) {
      yPosition += lineHeight * 0.5;
      doc.setFont(undefined, "bold");
      doc.text(`Izoh:`, margin, yPosition);
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
      { align: "right" }
    );

    doc.save(
      `Kvitansiya-X${apartment?.room_number}-${format(
        new Date(),
        "yyyyMMddHHmm"
      )}.pdf`
    );
  };

  const handleAddUserPayment = async () => {
    setPaymentLoading(true);
    if (!accessToken || !apartment?.client?.id || !selectedDate) {
      toast({
        title: "Xatolik",
        description: "Mijoz ID yoki sana topilmadi.",
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
        description: "Summa to'g'ri musbat son bo'lishi kerak.",
        variant: "destructive",
      });
      setPaymentLoading(false);
      return;
    }

    const formattedDate = format(selectedDate, "yyyy-MM-dd");

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
        headers: getAuthHeaders(),
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: "Serverdan javobni o'qib bo'lmadi",
        }));
        throw new Error(
          `To‘lov qo‘shishda xatolik (${response.status}): ${
            errorData.detail || JSON.stringify(errorData)
          }`
        );
      }

      const newPaymentResponse = await response.json();
      toast({
        title: "Muvaffaqiyat",
        description: "To‘lov muvaffaqiyatli qo‘shildi",
      });

      const newTotalPaid = totalPaid + paymentAmount;
      const mainPayment = apartment.payments[0];
      const totalAmount = mainPayment
        ? parseFloat(mainPayment.total_amount) || 0
        : apartment.price;
      const newRemainingAmount = totalAmount - newTotalPaid;

      setTotalPaid(newTotalPaid);
      setRemainingAmount(newRemainingAmount > 0 ? newRemainingAmount : 0);

      const newUserPayment = {
        id: newPaymentResponse.id,
        amount: paymentAmount.toFixed(2),
        payment_type: paymentForm.paymentType,
        date: formattedDate,
        description: paymentForm.description,
      };
      setApartment((prev) => ({
        ...prev,
        userPayments: [...(prev.userPayments || []), newUserPayment],
      }));

      generateReceiptPDF(paymentData);

      handleClosePaymentModal();
      if (accessToken) fetchApartmentDetails(accessToken);
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

  const handleUpdateApartment = async () => {
    setEditLoading(true);
    const apartmentId = params.id;
    if (!accessToken || !apartmentId || !editForm.object) {
      toast({
        title: "Xatolik",
        description: "Xonadon ID yoki Obyekt ID topilmadi.",
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
      !apartmentData.room_number ||
      isNaN(apartmentData.floor) ||
      apartmentData.floor < 0 ||
      isNaN(apartmentData.rooms) ||
      apartmentData.rooms <= 0 ||
      isNaN(apartmentData.area) ||
      apartmentData.area <= 0 ||
      isNaN(apartmentData.price) ||
      apartmentData.price < 0 ||
      !apartmentData.status ||
      isNaN(apartmentData.object)
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
      const response = await fetch(
        `${API_BASE_URL}/apartments/${apartmentId}/`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(apartmentData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: "Serverdan javobni o'qib bo'lmadi",
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

  const getStatusBadge = (status) => {
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

  const getPaymentStatusBadge = (status) => {
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

  const handleDownloadContract = async (paymentId) => {
    if (!accessToken || !paymentId) return;

    const mainPayment = apartment.payments?.find((p) => p.id === paymentId);
    if (mainPayment?.payment_type === "band") {
      toast({
        title: "Diqqat",
        description: "Band qilish uchun shartnoma mavjud emas.",
        duration: 2000,
      });
      router.push("/apartments");
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
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: "Serverdan javobni o'qib bo'lmadi",
        }));
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
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Muvaffaqiyat",
        description: `"${filename}" yuklab olindi.`,
      });
    } catch (error) {
      toast({
        title: "Xatolik",
        description: error.message || "Shartnomani yuklashda noma'lum xatolik.",
        variant: "destructive",
      });
    }
  };

  if (loading && !apartment) {
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
          <p className="text-muted-foreground animate-pulse">
            Ma'lumotlar yuklanmoqda...
          </p>
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
            Ushbu ID ({params.id}) ga ega xonadon mavjud emas, o'chirilgan yoki
            ma'lumotlarni yuklashda xatolik yuz berdi. Iltimos, qayta urinib
            ko'ring yoki administratorga murojaat qiling.
          </p>
        </div>
      </div>
    );
  }

  const mainPayment = apartment.payments?.[0];
  const userPayments = apartment.userPayments || [];
  const documents = apartment.documents || [];
  const lastThreeUserPayments = [...userPayments]
    .sort(
      (a, b) =>
        new Date(b.date || b.created_at).getTime() -
        new Date(a.date || a.created_at).getTime()
    )
    .slice(0, 3);

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

      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
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
            <Button variant="outline" size="sm" onClick={handleOpenEditModal}>
              <Edit className="mr-2 h-4 w-4" /> Tahrirlash
            </Button>
            {mainPayment && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadContract(mainPayment.id)}
              >
                <Download className="mr-2 h-4 w-4" /> Shartnoma
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                              value={apartment.client.kafil_phone_number || "-"}
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
                        value={getMainPaymentTypeLabel(mainPayment.payment_type)}
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
                    </div>
                  ) : apartment.status !== "bosh" ? (
                    <p className="text-xs text-muted-foreground italic border-t pt-3 dark:border-gray-700">
                      Shartnoma tuzilmagan yoki ma'lumotlar topilmadi.
                    </p>
                  ) : null}

                  {apartment.status !== "bosh" &&
                    apartment.status !== "band" &&
                    userPayments.length > 0 && (
                      <div className="border-t pt-3 space-y-2 dark:border-gray-700">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                          Oxirgi Balans To‘lovlari
                        </h4>
                        {lastThreeUserPayments.map((up) => (
                          <div
                            key={up.id}
                            className="flex justify-between items-start text-xs gap-2"
                          >
                            <div className="flex-1">
                              <div className="font-medium">
                                {formatCurrency(up.amount)}
                              </div>
                              <div className="text-muted-foreground text-[11px]">
                                {formatDate(up.date || up.created_at)} -{" "}
                                {getUserPaymentTypeLabel(up.payment_type)}
                              </div>
                            </div>
                            <div className="text-muted-foreground text-right whitespace-nowrap text-[11px]">
                              ID: {up.id}
                            </div>
                          </div>
                        ))}
                        {userPayments.length > 3 && (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-blue-600 hover:underline text-xs"
                            onClick={() => {
                              const trigger = document.querySelector(
                                'button[role="tab"][value="payments_history"]'
                              );
                              if (trigger) {
                                trigger.click();
                                trigger.scrollIntoView({
                                  behavior: "smooth",
                                  block: "nearest",
                                });
                              }
                            }}
                          >
                            Barchasini ko‘rish ({userPayments.length})
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

        {(mainPayment || userPayments.length > 0) && (
          <Tabs defaultValue="payments_history" className="mt-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3">
              <TabsTrigger
                value="payments_history"
                disabled={userPayments.length === 0}
              >
                Balans To‘lovlari{" "}
                {userPayments.length > 0 ? `(${userPayments.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="documents" disabled={!mainPayment}>
                Hujjatlar {documents.length > 0 ? `(${documents.length})` : ""}
              </TabsTrigger>
              {(mainPayment?.payment_type === "muddatli" ||
                mainPayment?.payment_type === "ipoteka") && (
                <TabsTrigger value="payment_schedule">
                  To‘lov Jadvali
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="payments_history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Mijoz Balansiga Qilingan To'lovlar
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Bu yerda mijozning umumiy balansiga qilingan barcha to'lovlar
                    (UserPayment) ko'rsatiladi.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {userPayments.length > 0 ? (
                      [...userPayments]
                        .sort(
                          (a, b) =>
                            new Date(b.date || b.created_at).getTime() -
                            new Date(a.date || a.created_at).getTime()
                        )
                        .map((up) => (
                          <div
                            key={up.id}
                            className="flex justify-between items-start p-3 border rounded-md hover:bg-accent/50 dark:border-gray-700 text-xs"
                          >
                            <div className="flex-1 pr-4">
                              <div className="font-semibold text-sm mb-0.5">
                                {formatCurrency(up.amount)}
                              </div>
                              <div className="text-muted-foreground">
                                {formatDate(up.date || up.created_at)} -{" "}
                                {getUserPaymentTypeLabel(up.payment_type)}
                              </div>
                              {up.description && (
                                <div className="text-muted-foreground italic mt-1 text-xs break-words">
                                  "{up.description}"
                                </div>
                              )}
                            </div>
                            <div className="text-muted-foreground text-right whitespace-nowrap">
                              ID: {up.id}
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-muted-foreground text-sm italic text-center py-4">
                        Mijoz balansiga hali to'lovlar qilinmagan.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Biriktirilgan Hujjatlar
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Shartnoma fayllari va boshqa tegishli hujjatlar (agar mavjud
                    bo'lsa).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {documents.length > 0 ? (
                      documents.map((doc) => {
                        const fileUrl =
                          doc.docx_file || doc.pdf_file || doc.image;
                        const fileName =
                          fileUrl?.split("/").pop() || `Hujjat ${doc.id}`;
                        return (
                          <div
                            key={doc.id}
                            className="flex justify-between items-center p-3 border rounded-md hover:bg-accent/50 dark:border-gray-700 text-xs"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                              <div className="overflow-hidden">
                                <div
                                  className="font-medium text-sm truncate"
                                  title={fileName}
                                >
                                  {fileName}
                                </div>
                                <div className="text-muted-foreground capitalize text-[11px]">
                                  {doc.document_type || "Noma'lum"} | Qo'shildi:{" "}
                                  {formatDate(doc.created_at)}
                                </div>
                              </div>
                            </div>
                            {fileUrl && (
                              <Button
                                variant="outline"
                                size="icon"
                                asChild
                                className="ml-2 flex-shrink-0 h-7 w-7"
                              >
                                <a
                                  href={`${API_BASE_URL}${fileUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={fileName}
                                  title={`Yuklab olish: ${fileName}`}
                                >
                                  <Download className="h-4 w-4" />
                                  <span className="sr-only">Yuklash</span>
                                </a>
                              </Button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-muted-foreground text-sm italic text-center py-4">
                        Hujjatlar topilmadi. Shartnoma generatsiya qilish uchun
                        yuqoridagi "Shartnoma" tugmasini bosing.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {(mainPayment?.payment_type === "muddatli" ||
              mainPayment?.payment_type === "ipoteka") && (
              <TabsContent value="payment_schedule" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Rejalashtirilgan To‘lovlar Jadvali
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Kelajakdagi oylik to'lovlar rejasi (agar hisoblangan
                      bo'lsa).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {mainPayment &&
                    mainPayment.monthly_payment > 0 &&
                    mainPayment.duration_months > 0 ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap justify-between items-center gap-4 p-3 border rounded-md bg-accent/50 dark:border-gray-700 text-xs">
                          <div className="flex-1 min-w-[150px]">
                            <div className="font-medium text-sm">
                              Oylik to'lov
                            </div>
                            <div className="text-muted-foreground">
                              Har oyning {mainPayment.due_date || "?"}-sanasi
                            </div>
                          </div>
                          <div className="flex-1 min-w-[150px] text-right">
                            <div className="font-semibold text-sm">
                              {formatCurrency(mainPayment.monthly_payment)}
                            </div>
                            <div className="text-muted-foreground">
                              {mainPayment.duration_months} oy davomida
                            </div>
                          </div>
                        </div>
                        <p className="text-muted-foreground text-xs italic text-center py-2">
                          Batafsil oylar kesimida jadval ko'rsatish funksiyasi
                          hali ishlab chiqilmoqda.
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm italic text-center py-4">
                        Rejalashtirilgan oylik to'lovlar mavjud emas yoki
                        shartnoma turi boshqacha.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mijoz Balansiga To'lov Qo'shish</DialogTitle>
            <CardDescription className="text-sm">
              Xonadon №{apartment?.room_number} uchun mijoz:{" "}
              {apartment?.client?.fio || "Noma'lum"}
            </CardDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right text-sm">
                Summa ($)*
              </Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                value={paymentForm.amount}
                onChange={handlePaymentChange}
                placeholder="0.00"
                className="col-span-3"
                required
                step="0.01"
                min="0.01"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4 -mt-2">
              <span className="col-start-2 col-span-3 text-xs text-muted-foreground">
                {formatCurrency(paymentForm.amount)}
              </span>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentDate" className="text-right text-sm">
                Sana*
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
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
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentType" className="text-right text-sm">
                To‘lov Usuli*
              </Label>
              <div className="col-span-3">
                <Select
                  value={paymentForm.paymentType}
                  onValueChange={handlePaymentTypeChange}
                >
                  <SelectTrigger id="paymentType">
                    <SelectValue placeholder="Usulni tanlang" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="naqd">Naqd pul</SelectItem>
                    <SelectItem value="muddatli">Muddatli to‘lov</SelectItem>
                    <SelectItem value="ipoteka">Ipoteka</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Mijoz balansiga kirim qilinadigan usul.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right text-sm mt-1">
                Izoh
              </Label>
              <Textarea
                id="description"
                name="description"
                value={paymentForm.description}
                onChange={handlePaymentChange}
                placeholder="To'lov haqida qo'shimcha ma'lumot (ixtiyoriy)"
                className="col-span-3"
                rows={2}
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
              onClick={handleAddUserPayment}
              disabled={
                paymentLoading ||
                !paymentForm.amount ||
                !selectedDate ||
                parseFloat(paymentForm.amount) <= 0
              }
            >
              {paymentLoading ? "Saqlanmoqda..." : "Saqlash va Kvitansiya"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              Xonadon №{apartment?.room_number} ni Tahrirlash
            </DialogTitle>
            <CardDescription className="text-sm">
              Obyekt: {apartment?.object?.name || "Noma'lum"}
            </CardDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-6 -mx-6 md:px-2 md:-mx-2">
            <EditInput
              label="Xonadon №*"
              id="edit_room_number"
              name="room_number"
              value={editForm.room_number}
              onChange={handleEditChange}
              required
            />
            <EditInput
              label="Qavat*"
              id="edit_floor"
              name="floor"
              type="number"
              value={editForm.floor}
              onChange={handleEditChange}
              required
              min="0"
            />
            <EditInput
              label="Xonalar soni*"
              id="edit_rooms"
              name="rooms"
              type="number"
              value={editForm.rooms}
              onChange={handleEditChange}
              required
              min="1"
            />
            <EditInput
              label="Maydon (m²)*"
              id="edit_area"
              name="area"
              type="number"
              step="0.01"
              value={editForm.area}
              onChange={handleEditChange}
              required
              min="0.01"
            />

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_price" className="text-right text-sm">
                Narx ($)*
              </Label>
              <Input
                id="edit_price"
                name="price"
                type="number"
                step="0.01"
                value={editForm.price}
                onChange={handleEditChange}
                className="col-span-3"
                required
                min="0"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4 -mt-2">
              <span className="col-start-2 col-span-3 text-xs text-muted-foreground">
                {formatCurrency(editForm.price)}
              </span>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label
                htmlFor="edit_description"
                className="text-right text-sm mt-1"
              >
                Tavsif
              </Label>
              <Textarea
                id="edit_description"
                name="description"
                value={editForm.description}
                onChange={handleEditChange}
                placeholder="Xonadon haqida qo'shimcha ma'lumot"
                className="col-span-3"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_status" className="text-right text-sm">
                Holati*
              </Label>
              <div className="col-span-3">
                <Select
                  value={editForm.status}
                  onValueChange={handleEditStatusChange}
                >
                  <SelectTrigger id="edit_status">
                    <SelectValue placeholder="Holati tanlang" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="bosh">Bo‘sh</SelectItem>
                    <SelectItem value="band">Band qilingan</SelectItem>
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
            <Button
              variant="outline"
              onClick={handleCloseEditModal}
              disabled={editLoading}
            >
              Bekor qilish
            </Button>
            <Button onClick={handleUpdateApartment} disabled={editLoading}>
              {editLoading ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}