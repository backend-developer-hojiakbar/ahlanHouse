"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  CreditCard,
  Edit,
  Calendar as CalendarIcon,
  Download,
  Trash,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  FileSpreadsheet,
  Receipt,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  format,
  parseISO,
  isValid,
  addMonths,
  setDate,
  isPast,
  startOfDay,
} from "date-fns";
import { uz } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// API & Telegram Constants
const API_BASE_URL = "http://api.ahlan.uz";
const TELEGRAM_BOT_TOKEN = "7165051905:AAFS-lG2LDq5OjFdAwTzrpbHYnrkup6y13s";
const TELEGRAM_CHAT_ID = "1728300";

// --- Helper Components ---

function InfoItem({
  label,
  value,
  className = "",
  alignRight = false,
  boldValue = false,
  capitalizeValue = false,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
  alignRight?: boolean;
  boldValue?: boolean;
  capitalizeValue?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-x-2",
        alignRight
          ? "justify-between items-center"
          : "flex-col sm:flex-row sm:justify-between sm:items-center"
      )}
    >
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <span
        className={cn(
          "text-sm break-words",
          boldValue && "font-semibold",
          alignRight ? "text-right" : "text-left sm:text-right",
          capitalizeValue && "capitalize",
          className
        )}
      >
        {value === undefined || value === null || value === "" ? "-" : value}
      </span>
    </div>
  );
}

function EditInput({
  label,
  id,
  ...props
}: React.ComponentProps<typeof Input> & { label: string }) {
  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label htmlFor={id} className="text-right text-sm">
        {label}
      </Label>
      <Input id={id} {...props} className="col-span-3" />
    </div>
  );
}

// Payment Schedule Item Interface
interface PaymentScheduleItem {
  monthIndex: number;
  monthYear: string;
  dueDate: Date;
  dueDateFormatted: string;
  dueAmount: number;
  status: "paid" | "overdue" | "upcoming" | "partially_paid";
  paidAmount: number;
  paymentDate?: Date | null;
}

const getScheduleStatusStyle = (status: PaymentScheduleItem["status"]) => {
  switch (status) {
    case "paid":
      return {
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-500",
        text: "To'langan",
      };
    case "overdue":
      return {
        icon: XCircle,
        color: "text-red-600",
        bgColor: "bg-red-500",
        text: "Muddati o'tgan",
      };
    case "partially_paid":
      return {
        icon: CheckCircle,
        color: "text-yellow-600",
        bgColor: "bg-yellow-400",
        text: "Qisman to'langan",
      };
    default:
      return {
        icon: Clock,
        color: "text-gray-500",
        bgColor: "bg-gray-300",
        text: "Kutilmoqda",
      };
  }
};

const getMainPaymentTypeLabel = (paymentType: string | undefined): string => {
  const typeMap: { [key: string]: string } = {
    naqd: "Naqd pul",
    muddatli: "Muddatli to'lov",
    ipoteka: "Ipoteka",
    subsidiya: "Subsidiya",
    sotilgan: "Sotilgan",
    band: "Band",
  };
  return typeMap[paymentType || ""] || "Noma'lum";
};

// Safely parse additional_info which may be a JSON string, object, null, or plain string
function safeParseAdditionalInfo(additional_info: any): Record<string, any> | null {
  if (!additional_info) return null;
  if (typeof additional_info === "object") return additional_info;
  if (typeof additional_info === "string") {
    // Try JSON.parse
    try {
      const parsed = JSON.parse(additional_info);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // Not valid JSON; return as { raw: string }
      return { info: additional_info };
    }
  }
  return null;
}

function AdditionalInfoView({
  additionalInfo,
  className,
}: {
  additionalInfo: any;
  className?: string;
}) {
  const obj = safeParseAdditionalInfo(additionalInfo);
  if (!obj || Object.keys(obj).length === 0) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>
        Qo‘shimcha ma’lumotlar yo‘q.
      </div>
    );
  }
  return (
    <div className={cn("text-xs space-y-1", className)}>
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span className="text-muted-foreground min-w-28 capitalize">{k}:</span>
          <span className="font-medium whitespace-pre-wrap break-words">
            {typeof v === "string" ? v : JSON.stringify(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

function PaymentTimelineGraph({
  scheduleData,
  formatCurrency,
  formatDate,
}: {
  scheduleData: PaymentScheduleItem[];
  formatCurrency: (n: number | string | null | undefined) => string;
  formatDate: (d: string | Date | null | undefined, f?: string) => string;
}) {
  if (!scheduleData || scheduleData.length === 0) return null;
  const minWidthEach = Math.max(50, 600 / scheduleData.length);
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex h-10 rounded-md border dark:border-gray-700 min-w-[600px]">
        {scheduleData.map((item) => {
          const { icon: StatusIcon, bgColor, color, text: statusText } =
            getScheduleStatusStyle(item.status);
          return (
            <Popover key={item.monthIndex}>
              <PopoverTrigger asChild>
                <div
                  className={cn(
                    "flex-1 flex items-center justify-center cursor-pointer relative transition-colors duration-200",
                    "border-r dark:border-gray-700 last:border-r-0",
                    bgColor
                  )}
                  style={{ minWidth: `${minWidthEach}px` }}
                  title={`${item.monthYear} - ${statusText}`}
                />
              </PopoverTrigger>
              <PopoverContent className="w-60 text-sm" side="top" align="center">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">{item.monthYear}</h4>
                  <p className="text-xs text-muted-foreground">
                    {item.dueDateFormatted} sanasigacha
                  </p>
                  <div className="flex items-center justify-between border-t pt-2 mt-2">
                    <span className="text-muted-foreground">Summa:</span>
                    <span className="font-semibold">
                      {formatCurrency(item.dueAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Holati:</span>
                    <span className={cn("flex items-center font-medium text-xs", color)}>
                      <StatusIcon className="h-3.5 w-3.5 mr-1" />
                      {statusText}
                    </span>
                  </div>
                  {item.status === "paid" && item.paymentDate && (
                    <div className="flex items-center justify-between text-xs border-t pt-1.5 mt-1.5">
                      <span className="text-muted-foreground">To'landi:</span>
                      <span>{formatDate(item.paymentDate)}</span>
                    </div>
                  )}
                  {item.status === "partially_paid" && (
                    <div className="flex items-center justify-between text-xs border-t pt-1.5 mt-1.5">
                      <span className="text-muted-foreground">To'langan:</span>
                      <span className="font-medium">
                        {formatCurrency(item.paidAmount)}
                      </span>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>

      <div className="flex justify-center flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500 mr-1.5" />
          To'langan
        </div>
        <div className="flex items-center">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 mr-1.5" />
          Muddati o'tgan
        </div>
        <div className="flex items-center">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 mr-1.5" />
          Qisman
        </div>
        <div className="flex items-center">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300 mr-1.5" />
          Kutilmoqda
        </div>
      </div>
    </div>
  );
}

const PaymentScheduleChart = ({ scheduleData }: { scheduleData: PaymentScheduleItem[] }) => {
  const chartData = {
    labels: scheduleData.map(item => item.monthYear),
    datasets: [
      {
        label: 'To\'lovlar',
        data: scheduleData.map(item => item.paidAmount),
        backgroundColor: [
          ...scheduleData.map(item => 
            item.status === 'paid' ? 'rgba(75, 192, 192, 0.2)' :
            item.status === 'overdue' ? 'rgba(255, 99, 132, 0.2)' :
            item.status === 'partially_paid' ? 'rgba(255, 159, 64, 0.2)' : 
            'rgba(204, 204, 204, 0.2)'
          )
        ],
        borderColor: [
          ...scheduleData.map(item => 
            item.status === 'paid' ? 'rgba(75, 192, 192, 1)' :
            item.status === 'overdue' ? 'rgba(255, 99, 132, 1)' :
            item.status === 'partially_paid' ? 'rgba(255, 159, 64, 1)' : 
            'rgba(204, 204, 204, 1)'
          )
        ],
        borderWidth: 1
      }
    ]
  };

  const options = {
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <div className="h-80">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default function ApartmentDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [apartment, setApartment] = useState<any>(null);
  const [overduePayments, setOverduePayments] = useState<any>(null);
  const [overdueReport, setOverdueReport] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ fio: string } | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [paymentForm, setPaymentForm] = useState({ amount: "", description: "" });

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
  const [editingPayment, setEditingPayment] = useState<any>(null);
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
    payment_id: null as number | null,
  });
  const [overduePaymentLoading, setOverduePaymentLoading] = useState(false);

  const [totalPaid, setTotalPaid] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [paymentScheduleData, setPaymentScheduleData] = useState<PaymentScheduleItem[]>(
    []
  );
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  const sendTelegramNotification = useCallback(async (message: string) => {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
        }),
      });
    } catch (error) {
      console.error("Telegram xabarini yuborishda xatolik:", error);
    }
  }, []);

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

  const formatCurrency = useCallback(
    (amount: string | number | null | undefined) => {
      const num = Number(amount);
      if (amount === null || amount === undefined || amount === "" || isNaN(num))
        return "$0.00";
      return num.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },
    []
  );

  const formatDate = useCallback(
    (dateInput: string | Date | null | undefined, outputFormat = "dd.MM.yyyy") => {
      if (!dateInput) return "-";
      try {
        const date = dateInput instanceof Date ? dateInput : parseISO(dateInput);
        if (!isValid(date)) throw new Error();
        return format(date, outputFormat, { locale: uz });
      } catch (e) {
        return typeof dateInput === "string" ? dateInput.split("T")[0] : "-";
      }
    },
    []
  );

  const formatDateTime = useCallback((dateInput: string | Date | null | undefined) => {
    if (!dateInput) return "-";
    try {
      const date = dateInput instanceof Date ? dateInput : parseISO(dateInput);
      if (!isValid(date)) throw new Error();
      return format(date, "dd.MM.yyyy HH:mm", { locale: uz });
    } catch (e) {
      return typeof dateInput === "string" ? dateInput : "-";
    }
  }, []);

  const recalculateTotals = useCallback((currentApartmentData: any) => {
    if (!currentApartmentData || !currentApartmentData.payments)
      return { totalPaid: 0, remainingAmount: 0 };

    const payments = currentApartmentData.payments || [];
    const relevantPayments = payments.filter(
      (p: any) =>
        (p.status === "paid" || Number(p.paid_amount) > 0) && p.payment_type !== "band"
    );
    const totalPaidFromPayments = relevantPayments.reduce(
      (sum: number, p: any) => sum + (parseFloat(p.paid_amount) || 0),
      0
    );

    const mainPayment =
      payments.find((p: any) =>
        ["muddatli", "ipoteka", "subsidiya", "sotilgan", "naqd"].includes(
          p.payment_type
        )
      ) || payments[0];

    const totalAmount = mainPayment?.total_amount
      ? parseFloat(mainPayment.total_amount)
      : currentApartmentData.price
      ? parseFloat(currentApartmentData.price)
      : 0;

    const newRemainingAmount = totalAmount - totalPaidFromPayments;
    return { totalPaid: totalPaidFromPayments, remainingAmount: newRemainingAmount };
  }, []);

  const generatePaymentSchedule = useCallback(
    (mainPayment: any, allPayments: any[]): PaymentScheduleItem[] => {
      if (
        !mainPayment ||
        mainPayment.payment_type !== "muddatli" ||
        !mainPayment.created_at ||
        !mainPayment.duration_months ||
        !mainPayment.monthly_payment ||
        !mainPayment.due_date
      )
        return [];

      const schedule: PaymentScheduleItem[] = [];
      try {
        const contractStartDate = parseISO(mainPayment.created_at);
        const durationMonths = parseInt(mainPayment.duration_months, 10);
        const monthlyPayment = parseFloat(mainPayment.monthly_payment);
        const dueDayOfMonth = parseInt(mainPayment.due_date, 10);
        const now = new Date();

        const sortedPayments = [...allPayments]
          .filter(
            (p) =>
              p.status === "paid" &&
              p.payment_type !== "band" &&
              parseFloat(p.paid_amount) > 0 &&
              p.created_at
          )
          .map((p) => ({
            ...p,
            created_at_date: parseISO(p.created_at),
            paid_amount_num: parseFloat(p.paid_amount) || 0,
          }))
          .filter((p) => isValid(p.created_at_date))
          .sort(
            (a, b) => a.created_at_date.getTime() - b.created_at_date.getTime()
          );

        let paymentPool = sortedPayments.map((p) => ({
          amount: p.paid_amount_num,
          date: p.created_at_date,
        }));

        for (let i = 0; i < durationMonths; i++) {
          const targetMonth = addMonths(contractStartDate, i + 1);
          let monthDueDate = setDate(targetMonth, dueDayOfMonth);
          if (monthDueDate.getDate() !== dueDayOfMonth) {
            monthDueDate = new Date(
              targetMonth.getFullYear(),
              targetMonth.getMonth() + 1,
              0
            );
          }

          let paidAmountForMonth = 0;
          let paymentDateForMonth: Date | null = null;

          const tempPaymentPool: typeof paymentPool = [];
          paymentPool.forEach((payment) => {
            if (payment.amount > 0 && paidAmountForMonth < monthlyPayment) {
              const amountToAllocate = Math.min(
                payment.amount,
                monthlyPayment - paidAmountForMonth
              );
              paidAmountForMonth += amountToAllocate;
              payment.amount -= amountToAllocate;
              payment.date && (paymentDateForMonth = payment.date);
            }
            if (payment.amount > 0) tempPaymentPool.push(payment);
          });
          paymentPool = tempPaymentPool;

          let status: PaymentScheduleItem["status"] = "upcoming";
          const isOverdue =
            isPast(monthDueDate) && startOfDay(monthDueDate) < startOfDay(now);

          if (paidAmountForMonth >= monthlyPayment) status = "paid";
          else if (paidAmountForMonth > 0) status = isOverdue ? "overdue" : "partially_paid";
          else if (isOverdue) status = "overdue";

          schedule.push({
            monthIndex: i + 1,
            monthYear: format(monthDueDate, "MMMM yyyy", { locale: uz }),
            dueDate: monthDueDate,
            dueDateFormatted: formatDate(monthDueDate),
            dueAmount: monthlyPayment,
            status,
            paidAmount: paidAmountForMonth,
            paymentDate: status === "paid" ? paymentDateForMonth : null,
          });
        }
      } catch (e) {
        console.error("Error generating payment schedule:", e);
        return [];
      }
      return schedule;
    },
    [formatDate]
  );

  const fetchApartmentDetails = useCallback(
    async (token: string): Promise<any | null> => {
      if (!token || !params?.id) {
        setLoading(false);
        return null;
      }
      setLoading(true);
      setApartment(null);
      setPaymentScheduleData([]);

      try {
        const apartmentId = params.id as string;
        const headers = getAuthHeaders(token);
        if (!headers) throw new Error("Avtorizatsiya tokeni yo'q.");

        const [apartmentResponse, paymentsResponse, overduePaymentsResponse, overdueReportResponse] =
          await Promise.all([
            fetch(`${API_BASE_URL}/apartments/${apartmentId}/`, { headers }),
            fetch(
              `${API_BASE_URL}/payments/?apartment=${apartmentId}&ordering=created_at&page_size=1000`,
              { headers }
            ),
            fetch(`${API_BASE_URL}/apartments/${apartmentId}/overdue_payments/`, {
              headers,
            }),
            fetch(
              `${API_BASE_URL}/apartments/overdue_payments_report/?apartment_id=${apartmentId}`,
              { headers }
            ),
          ]);

        if (!apartmentResponse.ok) {
          if (apartmentResponse.status === 401) {
            router.push("/login");
            return null;
          }
          throw new Error(
            `Xonadon ma'lumotlarini olishda xatolik (${apartmentResponse.status})`
          );
        }

        const apartmentData = await apartmentResponse.json();

        let allPayments: any[] = [];
        let clientId: number | null = null;

        if (paymentsResponse.ok) {
          const paymentData = await paymentsResponse.json();
          allPayments = paymentData.results || [];
          if (allPayments.length > 0) {
            const mainPayment =
              allPayments.find((p: any) =>
                ["muddatli", "ipoteka", "subsidiya", "sotilgan", "naqd"].includes(
                  p.payment_type
                )
              ) || allPayments[0];
            clientId = mainPayment?.user ?? null;
          }
        }

        const overduePaymentsData = overduePaymentsResponse.ok
          ? await overduePaymentsResponse.json()
          : null;
        const overdueReportData = overdueReportResponse.ok
          ? await overdueReportResponse.json()
          : null;

        const objectId =
          typeof apartmentData.object === "object"
            ? apartmentData.object.id
            : apartmentData.object;

        const [objectData, clientData, documentsData] = await Promise.all([
          objectId
            ? fetch(`${API_BASE_URL}/objects/${objectId}/`, { headers }).then((res) =>
                res.ok ? res.json() : null
              )
            : Promise.resolve(null),
          clientId
            ? fetch(`${API_BASE_URL}/users/${clientId}/`, { headers }).then((res) =>
                res.ok ? res.json() : null
              )
            : Promise.resolve(null),
          allPayments[0]?.id
            ? fetch(`${API_BASE_URL}/documents/?payment=${allPayments[0].id}`, {
                headers,
              })
                .then((res) => (res.ok ? res.json() : { results: [] }))
                .then((d) => d.results)
            : Promise.resolve([]),
        ]);

        const completeApartmentData = {
          ...apartmentData,
          object: objectData || apartmentData.object,
          payments: allPayments,
          client: clientData,
          documents: documentsData,
        };

        setApartment(completeApartmentData);
        setOverduePayments(overduePaymentsData);
        setOverdueReport(overdueReportData);

        const { totalPaid, remainingAmount } = recalculateTotals(
          completeApartmentData
        );
        setTotalPaid(totalPaid);
        setRemainingAmount(remainingAmount);

        if (completeApartmentData.payments?.[0]?.payment_type === "muddatli") {
          setPaymentScheduleData(
            generatePaymentSchedule(
              completeApartmentData.payments[0],
              completeApartmentData.payments
            )
          );
        }

        return completeApartmentData;
      } catch (error: any) {
        toast({
          title: "Xatolik",
          description: error.message,
          variant: "destructive",
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [
      params?.id,
      router,
      getAuthHeaders,
      recalculateTotals,
      generatePaymentSchedule,
      toast,
    ]
  );

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const fio = localStorage.getItem("user_fio");
    if (!token) router.push("/login");
    else {
      setAccessToken(token);
      if (fio) setCurrentUser({ fio });
    }
  }, [router]);

  useEffect(() => {
    if (accessToken) fetchApartmentDetails(accessToken);
  }, [accessToken, fetchApartmentDetails]);

  const handleAddPayment = async () => {
    setPaymentLoading(true);
    try {
      const headers = getAuthHeaders();
      if (!headers || !apartment?.client?.id || !selectedDate || !params?.id)
        throw new Error("Kerakli ma'lumotlar topilmadi.");

      const paymentAmount = Number(paymentForm.amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0)
        throw new Error("Summa musbat son bo'lishi kerak.");

      const mainPayment = apartment.payments?.[0];

      const paymentData = {
        apartment: params.id,
        user: apartment.client.id,
        paid_amount: paymentAmount.toString(),
        payment_type: "naqd",
        additional_info: paymentForm.description,
        created_at: format(selectedDate, "yyyy-MM-dd'T'HH:mm:ssxxx"),
        total_amount: mainPayment?.total_amount ?? apartment.price,
        status: "paid",
        main_payment: mainPayment?.id,
      };

      const response = await fetch(`${API_BASE_URL}/payments/`, {
        method: "POST",
        headers,
        body: JSON.stringify(paymentData),
      });
      if (!response.ok) throw new Error("To'lov qo'shishda xatolik.");

      const updatedData = await fetchApartmentDetails(accessToken!);
      const finalRemaining = updatedData
        ? recalculateTotals(updatedData).remainingAmount
        : remainingAmount - paymentAmount;

      const message =
        `<b>🟢💰 Yangi To'lov Amalga Oshirildi</b>\n\n` +
        `<b>Kim tomonidan:</b> ${currentUser?.fio || "Noma`lum"}\n` +
        `<b>Obyekt:</b> ${apartment.object?.name}\n` +
        `<b>Xonadon №:</b> ${apartment.room_number}\n\n` +
        `<b>To'lov summasi:</b> +${formatCurrency(paymentAmount)}\n` +
        `<b>To'lov sanasi:</b> ${formatDate(selectedDate)}\n` +
        `<b>Izoh:</b> ${paymentForm.description || "Kiritilmagan"}\n` +
        `<b>Umumiy qoldiq:</b> ${formatCurrency(finalRemaining)}`;

      await sendTelegramNotification(message);

      // Kvitansiya yaratish
      generateReceiptPDF({
        amount: paymentAmount,
        description: paymentForm.description,
        date: selectedDate
      });

      toast({ title: "Muvaffaqiyat", description: "To'lov muvaffaqiyatli qo'shildi" });
      setIsPaymentModalOpen(false);
      setPaymentForm({ amount: "", description: "" });
    } catch (error: any) {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleUpdateApartment = useCallback(async () => {
    setEditLoading(true);
    try {
      const headers = getAuthHeaders();
      if (!headers || !params?.id) throw new Error("Kerakli ma'lumotlar topilmadi.");

      const payload = {
        room_number: editForm.room_number,
        floor: parseInt(editForm.floor),
        rooms: parseInt(editForm.rooms),
        area: parseFloat(editForm.area),
        price: parseFloat(editForm.price),
        description: editForm.description,
        object: parseInt(editForm.object),
      };

      const response = await fetch(`${API_BASE_URL}/apartments/${params.id}/`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Xonadonni yangilashda xatolik.");

      const changes: string[] = [];
      if (apartment.room_number !== payload.room_number)
        changes.push(
          `• <b>Xona raqami:</b> <code>${apartment.room_number}</code> → <code>${payload.room_number}</code>`
        );
      if (Number(apartment.price) !== Number(payload.price))
        changes.push(
          `• <b>Narxi:</b> <code>${formatCurrency(apartment.price)}</code> → <code>${formatCurrency(
            payload.price
          )}</code>`
        );

      if (changes.length > 0) {
        const message =
          `<b>✏️🏢 Xonadon Tahrirlandi</b>\n\n` +
          `<b>Kim tomonidan:</b> ${currentUser?.fio || "Noma`lum"}\n` +
          `<b>Obyekt:</b> ${apartment.object?.name}\n` +
          `<b>Xonadon №:</b> ${apartment.room_number}\n\n` +
          `<b>Quyidagi ma'lumotlar o'zgartirildi:</b>\n` +
          changes.join("\n");
        await sendTelegramNotification(message);
      }

      toast({ title: "Muvaffaqiyat", description: "Xonadon yangilandi" });
      setIsEditModalOpen(false);
      fetchApartmentDetails(accessToken!);
    } catch (error: any) {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    } finally {
      setEditLoading(false);
    }
  }, [
    params?.id,
    editForm,
    getAuthHeaders,
    apartment,
    currentUser,
    sendTelegramNotification,
    fetchApartmentDetails,
    accessToken,
    toast,
    formatCurrency,
  ]);

  const handleUpdatePayment = useCallback(async () => {
    setIsUpdatingPayment(true);
    try {
      const headers = getAuthHeaders();
      if (!headers || !editingPayment?.id || !editPaymentForm.date)
        throw new Error("Kerakli ma'lumotlar topilmadi.");

      const updatedData = {
        additional_info: editPaymentForm.description,
        created_at: format(editPaymentForm.date, "yyyy-MM-dd'T'HH:mm:ssxxx"),
      };

      const response = await fetch(`${API_BASE_URL}/payments/${editingPayment.id}/`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(updatedData),
      });
      if (!response.ok) throw new Error("To'lovni yangilashda xatolik.");

      const changes: string[] = [];
      if (formatDate(editingPayment.created_at) !== formatDate(editPaymentForm.date))
        changes.push(
          `• <b>To'lov sanasi:</b> <code>${formatDate(
            editingPayment.created_at
          )}</code> → <code>${formatDate(editPaymentForm.date)}</code>`
        );
      if ((editingPayment.additional_info || "") !== editPaymentForm.description)
        changes.push(
          `• <b>Izoh:</b> <code>${editingPayment.additional_info || ""}</code> → <code>${
            editPaymentForm.description
          }</code>`
        );

      if (changes.length > 0) {
        const message =
          `<b>✏️💳 To'lov Tahrirlandi (ID: ${editingPayment.id})</b>\n\n` +
          `<b>Kim tomonidan:</b> ${currentUser?.fio || "Noma`lum"}\n` +
          `<b>Obyekt:</b> ${apartment.object?.name}\n` +
          `<b>Xonadon №:</b> ${apartment.room_number}\n\n` +
          `<b>Quyidagi ma'lumotlar o'zgartirildi:</b>\n` +
          changes.join("\n");
        await sendTelegramNotification(message);
      }

      toast({ title: "Muvaffaqiyat", description: "To'lov yangilandi." });
      setIsEditPaymentModalOpen(false);
      fetchApartmentDetails(accessToken!);
    } catch (error: any) {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdatingPayment(false);
    }
  }, [
    editingPayment,
    editPaymentForm,
    getAuthHeaders,
    apartment,
    currentUser,
    sendTelegramNotification,
    fetchApartmentDetails,
    accessToken,
    toast,
    formatDate,
  ]);

  const handleDeletePayment = useCallback(
    async (paymentId: number) => {
      if (deletingPaymentId) return;
      if (
        !window.confirm(
          `IDsi ${paymentId} bo'lgan to'lovni o'chirishga ishonchingiz komilmi?`
        )
      )
        return;
      setDeletingPaymentId(paymentId);
      try {
        const headers = getAuthHeaders();
        if (!headers) throw new Error("Token topilmadi.");
        const paymentToDelete = apartment?.payments?.find((p: any) => p.id === paymentId);
        if (!paymentToDelete) throw new Error("O'chiriladigan to'lov topilmadi.");

        const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/`, {
          method: "DELETE",
          headers,
        });
        if (!response.ok && response.status !== 204)
          throw new Error("To'lovni o'chirishda xatolik.");

        const message =
          `<b>❌💳 To'lov O'chirildi</b>\n\n` +
          `<b>Kim tomonidan:</b> ${currentUser?.fio || "Noma`lum"}\n` +
          `<b>Obyekt:</b> ${apartment.object?.name}\n` +
          `<b>Xonadon №:</b> ${apartment.room_number}\n\n` +
          `<b>O'chirilgan to'lov ID:</b> ${paymentId}\n` +
          `<b>Summasi:</b> ${formatCurrency(paymentToDelete.paid_amount)}\n` +
          `<b>To'lov sanasi:</b> ${formatDateTime(paymentToDelete.created_at)}`;

        await sendTelegramNotification(message);

        toast({
          title: "Muvaffaqiyat!",
          description: `To'lov (ID: ${paymentId}) o'chirildi.`,
        });
        fetchApartmentDetails(accessToken!);
      } catch (error: any) {
        toast({ title: "Xatolik", description: error.message, variant: "destructive" });
      } finally {
        setDeletingPaymentId(null);
      }
    },
    [
      deletingPaymentId,
      getAuthHeaders,
      apartment,
      currentUser,
      sendTelegramNotification,
      fetchApartmentDetails,
      accessToken,
      toast,
      formatCurrency,
      formatDateTime,
    ]
  );

  const handleOpenOverduePaymentModal = useCallback(
    (payment: any, mainPaymentId: number) => {
      if (!payment || !mainPaymentId) {
        toast({
          title: "Xatolik",
          description: "Muddati o'tgan to'lov ma'lumoti topilmadi.",
          variant: "destructive",
        });
        return;
      }
      setOverduePaymentForm({
        amount: payment.amount?.toString() || "0",
        payment_date: new Date(),
        payment_id: mainPaymentId,
      });
      setIsOverduePaymentModalOpen(true);
    },
    [toast]
  );

  const handlePayOverduePayment = async () => {
    // TODO: implement if needed
  };

  const handleOpenEditPaymentModal = useCallback((payment: any) => {
    if (!payment) return;
    setEditingPayment(payment);
    let paymentDate = new Date();
    if (payment.created_at) {
      try {
        const parsed = parseISO(payment.created_at);
        if (isValid(parsed)) paymentDate = parsed;
      } catch (e) {}
    }
    setEditPaymentForm({
      amount: payment.paid_amount || "",
      description: payment.additional_info || "",
      date: paymentDate,
    });
    setIsEditPaymentModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback(() => {
    if (apartment) {
      setEditForm({
        room_number: apartment.room_number || "",
        floor: apartment.floor?.toString?.() || "",
        rooms: apartment.rooms?.toString?.() || "",
        area: apartment.area?.toString?.() || "",
        price: (apartment.price ?? "").toString(),
        description: apartment.description || "",
        status: apartment.status || "",
        object: apartment.object?.id?.toString?.() || "",
      });
    }
    setIsEditModalOpen(true);
  }, [apartment]);

  const handleDownloadContract = useCallback(async (paymentId: number) => {
    toast({ title: "Eslatma", description: "Shartnoma yuklab olish hali sozlanmagan." });
  }, [toast]);

  const generateReceiptPDF = useCallback((paymentData?: any) => {
    if (!apartment || !apartment.client) {
      toast({ title: "Xatolik", description: "Kvitansiya uchun kerakli ma'lumotlar topilmadi.", variant: "destructive" });
      return;
    }

    try {
      const doc = new jsPDF();
      
      // PDF sahifa o'lchamlari
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPosition = 30;
      
      // Sarlavha
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("TO'LOV KVITANSIYASI", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 20;
      
      // Chiziq
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 15;
      
      // Asosiy ma'lumotlar
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      
      const leftCol = margin;
      const rightCol = pageWidth / 2 + 10;
      
      // Chap tomondagi ma'lumotlar
      doc.text("Kvitansiya raqami:", leftCol, yPosition);
      doc.setFont("helvetica", "bold");
      doc.text(`${Date.now()}`, leftCol + 45, yPosition);
      doc.setFont("helvetica", "normal");
      yPosition += 10;
      
      doc.text("Sana:", leftCol, yPosition);
      doc.setFont("helvetica", "bold");
      doc.text(formatDate(paymentData?.date || new Date()), leftCol + 45, yPosition);
      doc.setFont("helvetica", "normal");
      yPosition += 15;
      
      // Obyekt va xonadon ma'lumotlari
      doc.text("Obyekt:", leftCol, yPosition);
      doc.setFont("helvetica", "bold");
      doc.text(apartment.object?.name || "Noma'lum", leftCol + 45, yPosition);
      doc.setFont("helvetica", "normal");
      yPosition += 10;
      
      doc.text("Xonadon raqami:", leftCol, yPosition);
      doc.setFont("helvetica", "bold");
      doc.text(apartment.room_number || "N/A", leftCol + 45, yPosition);
      doc.setFont("helvetica", "normal");
      yPosition += 15;
      
      // Mijoz ma'lumotlari
      doc.text("Mijoz F.I.O:", leftCol, yPosition);
      doc.setFont("helvetica", "bold");
      doc.text(apartment.client.fio || "Noma'lum", leftCol + 45, yPosition);
      doc.setFont("helvetica", "normal");
      yPosition += 10;
      
      doc.text("Telefon:", leftCol, yPosition);
      doc.setFont("helvetica", "bold");
      doc.text(apartment.client.phone_number || "Noma'lum", leftCol + 45, yPosition);
      doc.setFont("helvetica", "normal");
      yPosition += 20;
      
      // To'lov ma'lumotlari
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 15;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("TO'LOV MA'LUMOTLARI", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      
      doc.text("To'lov summasi:", leftCol, yPosition);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(formatCurrency(paymentData?.amount || 0), leftCol + 45, yPosition);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      yPosition += 15;
      
      if (paymentData?.description) {
        doc.text("Izoh:", leftCol, yPosition);
        doc.setFont("helvetica", "bold");
        
        // Uzun matnni bir necha qatorga bo'lish
        const splitText = doc.splitTextToSize(paymentData.description, pageWidth - leftCol - 45 - margin);
        doc.text(splitText, leftCol + 45, yPosition);
        yPosition += splitText.length * 5 + 10;
        doc.setFont("helvetica", "normal");
      }
      
      // Jami to'lovlar ma'lumoti
      yPosition += 10;
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 15;
      
      doc.text("Jami to'langan:", leftCol, yPosition);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(totalPaid + (parseFloat(paymentData?.amount || "0"))), leftCol + 45, yPosition);
      doc.setFont("helvetica", "normal");
      yPosition += 10;
      
      doc.text("Qoldiq summa:", leftCol, yPosition);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(remainingAmount - (parseFloat(paymentData?.amount || "0"))), leftCol + 45, yPosition);
      doc.setFont("helvetica", "normal");
      yPosition += 30;
      
      // Imzo joylari
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth / 2 - 10, yPosition);
      doc.line(pageWidth / 2 + 10, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.text("Qabul qiluvchi imzosi", pageWidth / 4, yPosition, { align: "center" });
      doc.text("Mijoz imzosi", (pageWidth * 3) / 4, yPosition, { align: "center" });
      
      // Pastki qism
      yPosition += 20;
      doc.setFontSize(8);
      doc.text(
        `Kvitansiya yaratilgan sana: ${formatDateTime(new Date())}`,
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );
      
      // PDF ni yuklab olish
      const fileName = `kvitansiya_${apartment.room_number}_${Date.now()}.pdf`;
      doc.save(fileName);
      
      toast({
        title: "Muvaffaqiyat!",
        description: "Kvitansiya muvaffaqiyatli yaratildi va yuklab olindi."
      });
      
    } catch (error: any) {
      console.error("PDF yaratishda xatolik:", error);
      toast({
        title: "Xatolik",
        description: "Kvitansiya yaratishda xatolik yuz berdi.",
        variant: "destructive"
      });
    }
  }, [apartment, totalPaid, remainingAmount, formatCurrency, formatDate, formatDateTime, toast]);

  const handleExportToExcel = useCallback(() => {
    if (!paymentScheduleData || paymentScheduleData.length === 0) {
      toast({ title: "Xatolik", description: "To'lov jadvali mavjud emas.", variant: "destructive" });
      return;
    }

    try {
      // Create worksheet data
      const worksheetData = [
        ["№", "Oy/Yil", "To'lov sanasi", "To'lov summasi", "To'langan summa", "Holati"],
        ...paymentScheduleData.map((item, index) => [
          index + 1,
          item.monthYear,
          item.dueDateFormatted,
          formatCurrency(item.dueAmount),
          formatCurrency(item.paidAmount),
          getScheduleStatusStyle(item.status).text
        ])
      ];

      // Add summary row
      const totalDue = paymentScheduleData.reduce((sum, item) => sum + item.dueAmount, 0);
      const totalPaid = paymentScheduleData.reduce((sum, item) => sum + item.paidAmount, 0);
      worksheetData.push([]);
      worksheetData.push(["", "", "Jami:", formatCurrency(totalDue), formatCurrency(totalPaid), ""]);

      // Create workbook
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "To'lov jadvali");
      
      // Export to file
      const fileName = `tolov_jadvali_${apartment.room_number}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast({ title: "Muvaffaqiyat", description: "Excel fayl yuklab olindi." });
    } catch (error) {
      console.error("Excel export error:", error);
      toast({ title: "Xatolik", description: "Excel faylni yaratishda xatolik yuz berdi.", variant: "destructive" });
    }
  }, [paymentScheduleData, apartment, formatCurrency, toast]);

  const getStatusBadge = useCallback((status: string | undefined) => {
    const map: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      bosh: { label: "Bo'sh", variant: "secondary" },
      band: { label: "Band", variant: "outline" },
      sotilgan: { label: "Sotilgan", variant: "default" },
      overdue: { label: "Muddati o'tgan", variant: "destructive" },
      paid: { label: "To'langan", variant: "default" },
    };
    const item = status ? map[status] : undefined;
    if (!item) return <Badge variant="outline">Noma'lum</Badge>;
    return <Badge variant={item.variant}>{item.label}</Badge>;
  }, []);

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );

  if (!apartment) return <div className="p-8 text-center text-red-600">Xonadon topilmadi.</div>;

  const mainPayment = apartment.payments?.[0];
  const allPayments: any[] = apartment.payments || [];
  const documents = apartment.documents || [];
  const lastThreePayments = [...allPayments]
    .filter((p) => Number(p.paid_amount) > 0)
    .slice(0, 3);

  const mainAdditionalInfo = mainPayment?.additional_info;

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

      {/* Asosiy Kontent Maydoni */}
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        {/* Sahifa Sarlavhasi va Amallar */}
        <div className="flex items-center justify-between space-y-2 flex-wrap gap-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Xonadon № {apartment.room_number}
            </h2>
            <p className="text-muted-foreground">
              {apartment.object?.name || "Noma'lum obyekt"}
            </p>
          </div>
          <div className="flex space-x-2 flex-wrap gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => router.push("/apartments")}>
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
                onClick={() => router.push(`/apartments/${apartment.id}/reserve`)}
              >
                <User className="mr-2 h-4 w-4" /> Band qilish / Sotish
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={handleOpenEditModal}>
              <Edit className="mr-2 h-4 w-4" /> Tahrirlash
            </Button>

            {mainPayment && mainPayment.payment_type !== "band" && (
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

        {/* Asosiy Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <div className="relative h-[250px] md:h-[350px] bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
                  <img
                    src={apartment.image || apartment.object?.image || "/placeholder.svg"}
                    alt={`Xonadon ${apartment.room_number}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4">{getStatusBadge(apartment.status)}</div>
                </div>

                <div className="p-4 md:p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 border-b pb-4">
                    <InfoItem label="Qavat" value={apartment.floor} />
                    <InfoItem label="Xonalar" value={`${apartment.rooms} xona`} />
                    <InfoItem label="Maydon" value={`${apartment.area} m²`} />
                    <InfoItem
                      label="Narx"
                      value={formatCurrency(apartment.price)}
                      className="text-green-600 font-semibold"
                    />
                  </div>

                  {/* Tavsif */}
                  <h3 className="text-lg font-semibold mb-2">Tavsif</h3>
                  <div className="text-sm text-muted-foreground break-words min-h-[40px] mb-6">
                    {apartment.description && String(apartment.description).trim() !== "" ? (
                      <p>{apartment.description}</p>
                    ) : (
                      <span className="italic">Tavsif kiritilmagan</span>
                    )}
                  </div>

                  {/* Qo'shimcha ma'lumotlar (mainPayment.additional_info) */}
                  {mainAdditionalInfo ? (
                    <div className="mt-6 pt-6 border-t">
                      <h3 className="text-lg font-semibold mb-2">Qo'shimcha Ma'lumotlar</h3>
                      <div className="text-sm text-muted-foreground break-words min-h-[40px] mb-6">
                        <AdditionalInfoView additionalInfo={mainAdditionalInfo} />
                      </div>
                    </div>
                  ) : null}

                  
                  {/* To'lov jadvali */}
                  {mainPayment &&
                    mainPayment.payment_type === "muddatli" && (
                      <div className="mt-6 pt-6 border-t">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">To'lov Jadvali</h3>
                          <div>
                            {paymentScheduleData.length > 0 && (
                              <>
                                <Button variant="outline" size="sm" onClick={handleExportToExcel}>
                                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                                  Excel
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setViewMode(prevMode => prevMode === 'table' ? 'chart' : 'table')} className="ml-2">
                                  {viewMode === 'table' ? 'Grafik ko\'rinish' : 'Jadval ko\'rinish'}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        {viewMode === 'table' ? (
                          paymentScheduleData.length > 0 ? (
                            <PaymentTimelineGraph
                              scheduleData={paymentScheduleData}
                              formatCurrency={formatCurrency}
                              formatDate={formatDate}
                            />
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              To'lov jadvali ma'lumotlari mavjud emas.
                            </div>
                          )
                        ) : (
                          <PaymentScheduleChart scheduleData={paymentScheduleData} />
                        )}
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:sticky top-20 self-start space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Umumiy ma'lumot</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 text-sm">
                  <InfoItem label="Holati:" value={getStatusBadge(apartment.status)} alignRight />

                  {apartment.client ? (
                    <div className="border-t pt-3 space-y-1">
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase">
                        Mijoz
                      </h4>
                      <InfoItem
                        label="F.I.O:"
                        value={apartment.client.fio}
                        alignRight
                        boldValue
                      />
                      <InfoItem
                        label="Telefon:"
                        value={apartment.client.phone_number}
                        alignRight
                      />
                    </div>
                  ) : null}

                  {mainPayment ? (
                    <div className="border-t pt-3 space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase">
                        Shartnoma
                      </h4>
                      <InfoItem
                        label="Turi:"
                        value={getMainPaymentTypeLabel(mainPayment.payment_type)}
                        alignRight
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
                        </>
                      )}
                      <InfoItem
                        label="Sotilgan narx:"
                        value={formatCurrency(mainPayment?.total_amount)}
                        alignRight
                        boldValue
                        className="text-blue-600"
                      />
                      <InfoItem
                        label="Jami to'langan:"
                        value={formatCurrency(totalPaid)}
                        alignRight
                        boldValue
                        className="text-green-700"
                      />
                      <InfoItem
                        label="Qoldiq:"
                        value={formatCurrency(remainingAmount)}
                        alignRight
                        boldValue
                        className="text-red-700"
                      />

                      {/* Qo'shimcha ma'lumotlar (mainPayment.additional_info) */}
                    </div>
                  ) : null}

                  {apartment.status !== "bosh" && apartment.client && (
                    <Button
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => setIsPaymentModalOpen(true)}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      To'lov Qo'shish
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        {allPayments.length > 0 && (
          <Tabs defaultValue="payments_history" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="payments_history">To'lovlar Tarixi</TabsTrigger>
              <TabsTrigger value="documents">Hujjatlar</TabsTrigger>
              <TabsTrigger value="overdue_report">Hisobot</TabsTrigger>
            </TabsList>

            <TabsContent value="payments_history">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {allPayments
                      .filter((p) => Number(p.paid_amount) > 0)
                      .map((p) => {
                        const info = p.additional_info;
                        return (
                          <div
                            key={p.id}
                            className="flex flex-col gap-2 p-3 border rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium">
                                  {formatCurrency(p.paid_amount)}{" "}
                                  <span className="text-xs text-muted-foreground">
                                    (ID: {p.id})
                                  </span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {formatDateTime(p.created_at)}
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => generateReceiptPDF({
                                    amount: p.paid_amount,
                                    description: p.additional_info,
                                    date: p.created_at
                                  })}
                                  title="Kvitansiya chiqarish"
                                >
                                  <Receipt className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleOpenEditPaymentModal(p)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => handleDeletePayment(p.id)}
                                  disabled={deletingPaymentId === p.id}
                                >
                                  {deletingPaymentId === p.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Payment additional_info view */}
                            {info ? (
                              <div className="bg-muted/50 rounded-md p-2">
                                <AdditionalInfoView additionalInfo={info} />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents */}
            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle>Hujjatlar</CardTitle>
                  <CardDescription>Mavjud hujjatlar ro'yxati</CardDescription>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Hujjatlar topilmadi.</div>
                  ) : (
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {documents.map((doc: any) => (
                        <li key={doc.id}>
                          {doc.name || `Hujjat #${doc.id}`}{" "}
                          {doc.file && (
                            <a
                              href={doc.file}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              (yuklab olish)
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Overdue Report */}
            <TabsContent value="overdue_report">
              <Card>
                <CardHeader>
                  <CardTitle>Hisobot</CardTitle>
                  <CardDescription>Muddati o'tgan to'lovlar hisobotlari</CardDescription>
                </CardHeader>
                <CardContent>
                  {overdueReport ? (
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                      {JSON.stringify(overdueReport, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Hisobot ma'lumotlari topilmadi.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Modals */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Balansga To'lov Qo'shish</DialogTitle>
            <DialogDescription>
              Mijoz ({apartment?.client?.fio}) balansiga yangi to'lov.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <EditInput
              label="Summa ($) *"
              id="amount"
              name="amount"
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
            />

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Sana *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="col-span-3 justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate
                      ? format(selectedDate, "PPP", { locale: uz })
                      : "Sanani tanlang"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Izoh
              </Label>
              <Textarea
                id="description"
                name="description"
                value={paymentForm.description}
                onChange={(e) =>
                  setPaymentForm((p) => ({ ...p, description: e.target.value }))
                }
                className="col-span-3"
                placeholder='Masalan: {"comments":"...", "bank_name":"..."} yoki oddiy matn'
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPaymentModalOpen(false)}
              disabled={paymentLoading}
            >
              Bekor qilish
            </Button>
            <Button
              onClick={handleAddPayment}
              disabled={paymentLoading || !paymentForm.amount}
            >
              {paymentLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                "Saqlash"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xonadonni Tahrirlash</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <EditInput
              label="Xona raqami *"
              id="room_number"
              name="room_number"
              value={editForm.room_number}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, room_number: e.target.value }))
              }
            />
            <EditInput
              label="Narx ($) *"
              id="price"
              name="price"
              type="number"
              value={editForm.price}
              onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
            />
            <EditInput
              label="Qavat"
              id="floor"
              name="floor"
              type="number"
              value={editForm.floor}
              onChange={(e) => setEditForm((f) => ({ ...f, floor: e.target.value }))}
            />
            <EditInput
              label="Xonalar"
              id="rooms"
              name="rooms"
              type="number"
              value={editForm.rooms}
              onChange={(e) => setEditForm((f) => ({ ...f, rooms: e.target.value }))}
            />
            <EditInput
              label="Maydon (m²)"
              id="area"
              name="area"
              type="number"
              value={editForm.area}
              onChange={(e) => setEditForm((f) => ({ ...f, area: e.target.value }))}
            />
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="ap_desc" className="text-right pt-2">
                Tavsif
              </Label>
              <Textarea
                id="ap_desc"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleUpdateApartment} disabled={editLoading}>
              {editLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                "Saqlash"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditPaymentModalOpen}
        onOpenChange={() => setIsEditPaymentModalOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>To'lovni Tahrirlash (ID: {editingPayment?.id})</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <EditInput
              label="Summa ($)"
              id="edit_payment_amount"
              value={editPaymentForm.amount}
              disabled
            />
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Sana *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="col-span-3 justify-start">
                    {editPaymentForm.date
                      ? format(editPaymentForm.date, "PPP", { locale: uz })
                      : "Sanani tanlang"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editPaymentForm.date}
                    onSelect={(d) =>
                      setEditPaymentForm((f) => ({ ...f, date: d || new Date() }))
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Izoh</Label>
              <Textarea
                value={editPaymentForm.description}
                onChange={(e) =>
                  setEditPaymentForm((f) => ({ ...f, description: e.target.value }))
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPaymentModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleUpdatePayment} disabled={isUpdatingPayment}>
              {isUpdatingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                "Yangilash"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
