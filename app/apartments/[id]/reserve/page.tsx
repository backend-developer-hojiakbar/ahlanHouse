"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { Textarea } from "@/components/ui/textarea";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Home, Plus, Printer, UserPlus, Loader2 } from "lucide-react";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
} from "docx";
import { saveAs } from "file-saver";
import * as docx from "docx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function ReserveApartmentPage() {
  const params = useParams();
  const router = useRouter();
  const [apartment, setApartment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [paymentType, setPaymentType] = useState("band");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [showKafil, setShowKafil] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [requestReceipt, setRequestReceipt] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("existing");
  const [bandDate, setBandDate] = useState<Date | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isPaymentDatePickerOpen, setIsPaymentDatePickerOpen] = useState(false);

  const [formData, setFormData] = useState({
    clientId: "",
    initialPayment: "",
    totalMonths: "",
    totalAmount: "",
    comments: "",
    name: "",
    phone: "",
    address: "",
    kafilFio: "",
    kafilPhone: "",
    kafilAddress: "",
    due_date: "",
    bank_name: "", // Added bank_name for ipoteka
  });

  const API_BASE_URL = "http://api.ahlan.uz";
  const PAGE_SIZE = 100;

  const getAuthHeaders = () => ({
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  });

  const formatCurrency = (amount: string | number) => {
    const num = Number(amount);
    if (isNaN(num)) return "$0.00";
    return num.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatNumber = (amount: string | number) => {
    const num = Number(amount);
    if (isNaN(num)) return "0";
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast({
          title: "Xatolik",
          description: "Avtorizatsiya qilinmagan.",
          variant: "destructive",
        });
        router.push("/login");
        return;
      }
      setAccessToken(token);
    }
  }, [router]);

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^\+998\d{9}$/;
    return phoneRegex.test(phone);
  };

  const fetchAllClients = async () => {
    let allClients: any[] = [];
    let nextUrl:
      | string
      | null = `${API_BASE_URL}/users/?user_type=mijoz&page_size=${PAGE_SIZE}`;

    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Mijozlarni olishda xatolik (${response.status})`);
        }

        const data = await response.json();
        allClients = [...allClients, ...(data.results || [])];
        nextUrl = data.next;
      }
      return allClients;
    } catch (error) {
      throw error;
    }
  };

  const fetchData = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const apartmentId = params.id;
      if (!apartmentId) throw new Error("Xonadon ID topilmadi.");

      const apartmentResponse = await fetch(
        `${API_BASE_URL}/apartments/${apartmentId}/`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );
      if (!apartmentResponse.ok) {
        if (apartmentResponse.status === 404)
          throw new Error("Xonadon topilmadi.");
        throw new Error(
          `Xonadon ma'lumotlarini olishda xatolik (${apartmentResponse.status})`
        );
      }
      const apartmentData = await apartmentResponse.json();
      setApartment(apartmentData);

      const allClients = await fetchAllClients();
      setClients(allClients);

      setFormData((prev) => ({
        ...prev,
        totalAmount: apartmentData.price?.toString() ?? "", // Ensure it's a string or empty
        due_date: "15",
      }));
    } catch (error) {
      console.error("Fetch data error:", error);
      toast({
        title: "Xatolik",
        description: (error as Error).message,
        variant: "destructive",
      });
      if ((error as Error).message.includes("topilmadi")) router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken && params.id) {
      fetchData();
    }
  }, [accessToken, params.id]);

  // Removed the second useEffect that overwrote due_date

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const createClient = async (): Promise<any> => {
    if (!accessToken) throw new Error("Avtorizatsiya qilinmagan.");

    if (!validatePhoneNumber(formData.phone)) {
      throw new Error(
        "Telefon raqami noto'g'ri formatda. To'g'ri format: +998901234567"
      );
    }
    if (formData.kafilPhone && !validatePhoneNumber(formData.kafilPhone)) {
      throw new Error(
        "Kafil telefon raqami noto'g'ri formatda. To'g'ri format: +998901234567"
      );
    }

    const clientData = {
      fio: formData.name,
      phone_number: formData.phone,
      address: formData.address || "",
      user_type: "mijoz",
      kafil_fio: formData.kafilFio || null,
      kafil_phone_number: formData.kafilPhone || null,
      kafil_address: formData.kafilAddress || null,
      password: formData.phone, // Consider a more secure default password strategy
    };

    if (!clientData.fio || !clientData.phone_number) {
      throw new Error("Yangi mijoz uchun F.I.O. va telefon raqami majburiy.");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(clientData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = `Mijoz qo'shishda xatolik (${response.status})`;
        if (
          errorData.phone_number &&
          Array.isArray(errorData.phone_number) &&
          errorData.phone_number.some((err: string) => err.includes("already exists"))
        ) {
          errorMessage = "Bu telefon raqami allaqachon ro'yxatdan o'tgan.";
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (typeof errorData === 'object' && errorData !== null) {
           // Try to extract a more specific error message
           const firstErrorKey = Object.keys(errorData)[0];
           if (firstErrorKey && Array.isArray(errorData[firstErrorKey])) {
               errorMessage = `${firstErrorKey}: ${errorData[firstErrorKey][0]}`;
           }
        }
        throw new Error(errorMessage);
      }
      return await response.json();
    } catch (error) {
      throw new Error(
        (error as Error).message || "Mijoz qo'shishda noma'lum xatolik"
      );
    }
  };

  const handleAddClient = async () => {
    if (!formData.name || !formData.phone) {
      toast({
        title: "Ma'lumot yetarli emas",
        description:
          "Iltimos, yangi mijoz uchun F.I.O. va telefon raqamini kiriting.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingClient(true);
    try {
      const newClient = await createClient();
      toast({
        title: "Muvaffaqiyat!",
        description: `${newClient.fio} mijozlar ro'yxatiga qo'shildi.`,
      });
      setClients((prev) => [...prev, newClient]);
      handleSelectChange("clientId", newClient.id.toString());
      setActiveTab("existing");
      setFormData((prev) => ({
        ...prev,
        name: "",
        phone: "",
        address: "",
        kafilFio: "",
        kafilPhone: "",
        kafilAddress: "",
      }));
      setShowKafil(false);
    } catch (error) {
      toast({
        title: "Xatolik",
        description:
          (error as Error).message || "Mijozni qo'shishda xatolik yuz berdi.",
        variant: "destructive",
      });
    } finally {
      setIsAddingClient(false);
    }
  };

  const calculateMonthlyPayment = () => {
    if (!apartment || paymentType !== "muddatli") return 0;
    const totalAmount = Number(formData.totalAmount) || 0;
    const initialPayment = Number(formData.initialPayment) || 0;
    const totalMonths = Number(formData.totalMonths) || 0;

    if (totalMonths <= 0 || totalAmount <= 0 ) return 0;
    // Ensure initial payment is not greater than total amount for calculation
    if (initialPayment >= totalAmount) return 0;

    const principal = totalAmount - initialPayment;
    const monthlyPayment = principal / totalMonths;

    // Basic check against excessively large numbers
    if (!isFinite(monthlyPayment) || monthlyPayment > Number.MAX_SAFE_INTEGER) {
      console.error("Calculated monthly payment is too large or invalid:", monthlyPayment);
      return 0; // Return 0 or handle error appropriately
    }
    return monthlyPayment;
  };


  const calculateRemainingPercentage = () => {
    if (!apartment || !formData.initialPayment) return 0;
    const initialPayment = Number(formData.initialPayment) || 0;
    const totalPrice = Number(formData.totalAmount) || apartment.price || 0;
    if (totalPrice <= 0 || initialPayment >= totalPrice) return 0; // Avoid division by zero or negative percentages
    const remainingAmount = totalPrice - initialPayment;
    return ((remainingAmount / totalPrice) * 100).toFixed(1);
  };

  const generatePaymentSchedule = () => {
    if (
      paymentType !== "muddatli" ||
      !formData.totalMonths ||
      !formData.due_date
    )
      return "";

    const totalMonths = Number(formData.totalMonths);
    const dueDate = Number(formData.due_date);
    if(totalMonths <= 0 || dueDate <= 0 || dueDate > 31) return "";

    let monthlyPayment = 0;
    try {
        monthlyPayment = calculateMonthlyPayment();
        if (monthlyPayment <= 0 && (Number(formData.totalAmount) > Number(formData.initialPayment || 0))) {
             // If payment should exist but calculation failed, return error indication
             return "   - Oylik to'lovni hisoblashda xato.";
        } else if (monthlyPayment <= 0) {
             // If initial payment covers everything
             return "   - Boshlang'ich to'lov umumiy summani qopladi.";
        }
    } catch (e) {
        return "   - Oylik to'lovni hisoblashda xato.";
    }


    const schedule: string[] = [];
    // Use the *provided* payment date as the starting point for the schedule calculation,
    // otherwise default to today if not provided (though it should be required).
    const firstPaymentCalcDate = paymentDate ? new Date(paymentDate) : new Date();
    // The schedule starts from the *month following* the initial payment date.
    firstPaymentCalcDate.setMonth(firstPaymentCalcDate.getMonth() + 1);


    for (let i = 1; i <= totalMonths; i++) {
      // Calculate the date for *this* specific payment installment
      const paymentDateCalc = new Date(firstPaymentCalcDate);
      // Set the month based on the loop counter (i-1 because we already advanced one month)
      paymentDateCalc.setMonth(firstPaymentCalcDate.getMonth() + i - 1);
      // Set the day of the month
      paymentDateCalc.setDate(dueDate);

      // Adjust if the due date is invalid for the calculated month (e.g., 31st in Feb)
      const lastDayOfMonth = new Date(
        paymentDateCalc.getFullYear(),
        paymentDateCalc.getMonth() + 1,
        0
      ).getDate();
      if (dueDate > lastDayOfMonth) {
        paymentDateCalc.setDate(lastDayOfMonth);
      }

      const formattedDate = paymentDateCalc.toLocaleDateString("uz-UZ", { // Use uz-UZ locale
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const formattedPayment = formatNumber(monthlyPayment);
      schedule.push(
        `   - ${i}-oy: ${formattedDate} - ${formattedPayment} $`
      );
    }

    return schedule.join("\n");
  };


  const generateContractText = (paymentId: number, client: any) => {
    const currentDate = new Date().toLocaleDateString("uz-UZ", { // Use uz-UZ locale
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    // Basic number to words - can be expanded for better accuracy
    const priceInWords = (price: number): string => {
        // This is a very basic implementation. Consider a library for real-world use.
        const numStr = formatNumber(price);
        return `${numStr} $`; // Keep it simple for now
    };

    if (!apartment) return "Xonadon ma'lumotlari topilmadi.";

    const finalPrice = Number(formData.totalAmount) || apartment.price || 0;
    const formattedPrice = formatNumber(finalPrice);
    const priceWords = priceInWords(finalPrice);
    const initialPaymentFormatted = formatNumber(formData.initialPayment || 0);
    let monthlyPaymentFormatted = "0";
    let monthlyPayment = 0;
    if (paymentType === "muddatli") {
        try {
             monthlyPayment = calculateMonthlyPayment();
             if(monthlyPayment > 0) {
                 monthlyPaymentFormatted = formatNumber(monthlyPayment);
             } else if (Number(formData.totalAmount) > Number(formData.initialPayment || 0)) {
                 monthlyPaymentFormatted = "Hisoblashda xato";
             } else {
                 monthlyPaymentFormatted = "-"; // Fully paid initially
             }
        } catch (e) {
            monthlyPaymentFormatted = "Hisoblashda xato";
        }
    }

    const endDate = paymentDate ? new Date(paymentDate) : new Date(); // Start from payment date
    if (paymentType === "muddatli" && formData.totalMonths && Number(formData.totalMonths) > 0) {
      endDate.setMonth(endDate.getMonth() + Number(formData.totalMonths));
    }
    const endDateString = paymentType === 'muddatli' && Number(formData.totalMonths) > 0
        ? endDate.toLocaleDateString("uz-UZ") // Use uz-UZ locale
        : "N/A"; // Not applicable if not installment

    const paymentSchedule = generatePaymentSchedule();
    const bandDateString = bandDate
      ? bandDate.toLocaleDateString("uz-UZ") // Use uz-UZ locale
      : "Noma'lum";
    const paymentDateString = paymentDate
      ? paymentDate.toLocaleDateString("uz-UZ") // Use uz-UZ locale
      : currentDate; // Fallback, though it should be required

    return `
                ДАСТЛАБКИ ШАРТНОМА № ${paymentId}
    Куп хонадонли турар-жой биноси қуриш ва сотиш тўғрисида

« ${currentDate} »                                           Қўқон шаҳри

Қўқон шаҳар «AXLAN HOUSE» МЧЖ номидан низомга асосан фаолият юритувчи
раҳбари SODIQOV XASANJON MUXSINJONOVICH (кейинги ўринларда «Бажарувчи»
деб юритилади) бир томондан ҳамда «${client.fio}» (кейинги ўринларда
«Буюртмачи» деб аталади), иккинчи томондан Ўзбекистон Республикасининг
«Хўжалик юритувчи субъектлар фаолиятининг шартномавий-хуқуқий базаси
тўғрисида»ги қонунига мувофиқ мазкур шартномани қуйидагилар тѝғрисида
туздик.

                          I. ШАРТНОМА ПРЕДМЕТИ

1. Томонлар «Буюртмачи» хонадон сотиб олишга розилиги тўғрисида
   «Бажарувчи»га ариза орқали мурожаат этгандан сўнг, Ўзбекистон
   Республикаси, Фарғона вилояти, Қўқон шаҳар,
   ${apartment.object_name || "Номаълум Обиект"} да жойлашган
   ${apartment.floor || "N/A"}-қаватли ${
      apartment.room_number || "N/A"
    }-хонадонли (${apartment.rooms || "?"} хонали,
   умумий майдони ${
     apartment.area || "?"
   } кв.м) турар-жой биносини қуришга, буюртмачи
   вазифасини бажариш тўғрисида шартномани (кейинги ўринларда - асосий
   шартнома) тузиш мажбуриятини ўз зиммаларига оладилар.

                          II. МУҲИМ ШАРТЛАР

1. Томонлар қуйидагиларни асосий шартноманинг муҳим шартлари деб
   ҳисоблашга келишиб оладилар:
   а) «Буюртмачи»га топшириладиган ${
     apartment.room_number || "N/A"
   }-хонадоннинг умумий
      қийматининг бошланғич нархи ${formattedPrice} (${priceWords}) сўмни
      ташкил этади ва ушбу нарх томонлар томонидан келишилган ҳолда
      ${
        paymentType === "naqd" || paymentType === "band"
          ? "ўзгармайди"
          : "ўзгариши мумкин"
      };
   б) Бажарувчи «тайёр ҳолда топшириш» шартларида турар-жой биносини
      қуришга бажарувчи вазифасини бажариш мажбуриятини ўз зиммасига
      олади ва лойиҳага мувофиқ қуриш бўйича барча ишларни пудратчиларни
      жалб қилган ҳолда ва ўз маблағлари ва/ёки жалб қилинган маблағлар
      билан бажариш мажбуриятини, «Буюртмачи» эса шартнома бўйича
      мажбуриятларни лозим даражада бажариш, шу жумладан шартномада
      келишилган баҳони тўлаш, шунингдек қурилиш ишлари тугаганда, ўзига
      тегишли бўлган хонадонни қабул қилиб олиш мажбуриятини олади.

                       III. ҲИСОБ-КИТОБ ТАРТИБИ

1) «Буюртмачи» томонидан мазкур шартнома имзолангач,
   ${
     paymentType === "naqd"
       ? `тўлиқ тўловни (${initialPaymentFormatted} сўм) дарҳол (${paymentDateString})`
       : paymentType === "band"
       ? `band qilish uchun ${initialPaymentFormatted} сўм (${bandDateString})`
       : paymentType === "muddatli"
       ? `${formData.totalMonths} ой давомида (тўловлар ${endDateString} гача)`
       : paymentType === "ipoteka"
       ? `ipoteka shartlariga ko‘ra boshlang'ich ${initialPaymentFormatted} сўм (${paymentDateString})`
       : "тўлов шартларига мувофиқ"
   }
   банкдаги ҳисоб-варағига хонадон умумий қийматини, яъни
   ${formattedPrice} (${priceWords}) сўм миқдорида пул маблағини
   ўтказади.
${
  paymentType === "muddatli"
    ? `   - Бошланғич тўлов: ${initialPaymentFormatted} $ (${paymentDateString}).
   - Ойлик тўлов: ${monthlyPaymentFormatted} $ (har oyning ${
        formData.due_date || 15
      }-sanasigacha).
   - To'lov jadvali:
${paymentSchedule}`
    : paymentType === "band"
    ? `   - Band qilish uchun to'lov: ${initialPaymentFormatted} $ (${bandDateString}).`
    : paymentType === "ipoteka"
    ? `   - Boshlang‘ich to‘lov: ${initialPaymentFormatted} $ (${paymentDateString}). Bank: ${formData.bank_name || 'Kiritilmagan'}`
    : paymentType === "naqd"
    ? `   - To'liq to'lov: ${initialPaymentFormatted} $ (${paymentDateString}).`
    : ""
}

                    IV. ШАРТНОМАНИНГ АМАЛ ҚИЛИШИ

4.1. Мазкур шартнома Томонлар уни имзолаган кундан бошлаб амалга киради
     ва асосий шартнома тузилгунга қадар амалда бўлади.
4.2. Бажарувчининг ташаббуси билан мазкур шартнома қуйидаги холларда
     бекор қилиниши мумкин:
     - «Буюртмачи» томонидан мазкур шартнома тузилгандан кейин
       ${
         paymentType === "naqd"
           ? `тўлиқ тўловни (${paymentDateString})`
           : paymentType === "band"
           ? `band qilish to‘lovini (${bandDateString} gacha)`
           : paymentType === "muddatli"
           ? `${endDateString} гача бўлган муддатда белгиланган тўловларни (биринчи тўлов ${formData.due_date}-sanagacha)`
           : paymentType === "ipoteka"
           ? `ipoteka shartlariga ko‘ra belgilangan to‘lovlarni (${paymentDateString})`
           : "тўлов шартларига мувофиқ белгиланган тўловларни"
       } амалга оширмаса;

                         V. ЯКУНИЙ ҚОИДАЛАР

5.1. Томонларнинг ҳар бири ўз мажбуриятларини лозим даражада, мазкур
     шартнома шартларига мувофиқ бажариши лозим.
5.2. Томонларнинг мазкур шартнома бўйича юзага келган низолари уларнинг
     келишуви бўйича ҳал этилади, бундай келишувга эришилмаган тақдирда
     суд томонидан ҳал этилади.
5.3. Мазкур шартнома уч нусхада тузилган бўлиб, улардан бири Банкка
     берилади, қолган иккитаси томонларга бир нусхадан топширилади.
     Барча нусхалар бир хил ва тенг юридик кучга эга.

               VI. ТОМОНЛАРНИНГ РЕКВИЗИТЛАРИ ВА ИМЗОЛАРИ

Бажарувчи:                                Буюртмачи:
«AXLAN HOUSE» МЧЖ                         «${client.fio}»
Фарғона вилояти, Қўқон шаҳар,             Телефон: ${
      client.phone_number || "Кўрсатилмаган"
    }
Адабиёт кўчаси, 25-уй                     Манзил: ${
      client.address || "Кўрсатилмаган"
    }
СТИР: 306997685
ХХТУТ: 61110
Х/р: 20208000205158478001
МФО: 01076 Ипотека банк                    ${
      client.kafil_fio ? `\nКафил: ${client.kafil_fio}` : ""
    }
       Қўқон филиали                       ${
         client.kafil_phone_number
           ? `Кафил тел: ${client.kafil_phone_number}`
           : ""
       }
Тел № (+99833) 701-75 75

_________________________                   _________________________
        (имзо)                                           (имзо)
    `.trim();
  };


  const generateContractWordBlob = async (paymentId: number, client: any) => {
    const contractText = generateContractText(paymentId, client);
    const lines = contractText.split("\n");
    const formatParagraph = (line: string) => {
      const commonProps = { size: 24, font: "Times New Roman" };
      const trimmedLine = line.trim();

       // Basic heuristic to check if the line is a main heading (Roman numeral)
      const isMainHeading = /^(I|II|III|IV|V|VI)\.\s/.test(trimmedLine);
      // Basic heuristic for centered title
      const isCenteredTitle = trimmedLine.startsWith("ДАСТЛАБКИ ШАРТНОМА №") || trimmedLine.startsWith("Куп хонадонли турар-жой");
       // Basic heuristic for signature lines
      const isSignaturePlaceholder = trimmedLine === "_________________________";
      const isSignerLabel = trimmedLine === '(имзо)';
      // Basic heuristic for party labels (Бажарувчи/Буюртмачи)
      const isPartyLabel = trimmedLine === 'Бажарувчи:' || trimmedLine === 'Буюртмачи:';


      let paragraphChildren: TextRun[] = [];
      let paragraphProps: any = { // Use 'any' for flexibility or define a specific type
           spacing: { after: 100 },
           alignment: AlignmentType.JUSTIFIED, // Default to justified
      };

       // Build children first
       if (isSignaturePlaceholder) {
           paragraphChildren.push(new TextRun({ text: " ".repeat(40), underline: {} , ...commonProps })); // Add underline for placeholder
           paragraphProps.alignment = AlignmentType.LEFT; // Align signatures left potentially
       } else if (isSignerLabel) {
            paragraphChildren.push(new TextRun({ text: line, ...commonProps }));
            paragraphProps.alignment = AlignmentType.CENTER; // Center (имзо) under the line
            paragraphProps.spacing = { before: 0, after: 200 }; // Space after signature label
       } else if (isPartyLabel) {
           paragraphChildren.push(new TextRun({ text: line, bold: true, ...commonProps }));
           paragraphProps.alignment = AlignmentType.LEFT;
           paragraphProps.spacing = { before: 300, after: 100 };
       }
       else {
           // Handle lines with potential tab separation for key-value pairs
           const parts = line.split(/:\s*(.+)/);
           if (parts.length > 1 && (parts[0].includes('МФО') || parts[0].includes('Х/р') || parts[0].includes('СТИР') || parts[0].includes('Телефон') || parts[0].includes('Манзил') || parts[0].includes('Кафил') || parts[0].includes('ХХТУТ') || parts[0].includes('Тел №'))) {
               paragraphChildren.push(new TextRun({ text: `${parts[0].trim()}:`, ...commonProps }));
               paragraphChildren.push(new TextRun({ text: `\t${parts[1].trim()}`, ...commonProps })); // Add tab
               paragraphProps.alignment = AlignmentType.LEFT;
                paragraphProps.tabStops = [{ type: docx.TabStopType.LEFT, position: 2880 }]; // Position for tab stop (2 inches)
                // Indent Kafil details under Buyer
                if (parts[0].includes('Кафил')) {
                    paragraphProps.indent = { left: 720 }; // Indent kafil info
                }

           } else {
                // Default case for regular text lines
               paragraphChildren.push(new TextRun({ text: line, ...commonProps, bold: isMainHeading }));
           }
       }


        // Apply specific alignments and styles
       if (isCenteredTitle) {
           paragraphProps.alignment = AlignmentType.CENTER;
           paragraphProps.spacing = { after: 200 };
            if (trimmedLine.startsWith("ДАСТЛАБКИ")) {
                paragraphChildren[0].options.bold = true;
                paragraphChildren[0].options.size = 28;
            }
       } else if (isMainHeading) {
           paragraphProps.heading = HeadingLevel.HEADING_1; // Or appropriate level
           paragraphProps.alignment = AlignmentType.CENTER; // Center headings
           paragraphProps.spacing = { before: 300, after: 150 };
       } else if (trimmedLine.match(/^\d+\)/) || trimmedLine.match(/^[а-я]\)/) || trimmedLine.startsWith('-')) {
           paragraphProps.indent = { left: 720 }; // Indent list items
           paragraphProps.alignment = AlignmentType.JUSTIFIED;
       } else if (trimmedLine === '') {
           paragraphProps.spacing = { after: 50 }; // Reduce space for empty lines if needed
       }


      return new Paragraph({
        children: paragraphChildren,
        ...paragraphProps, // Spread the calculated properties
      });
    };


     const doc = new Document({
       creator: "Ahlan House System",
       title: `Shartnoma №${paymentId}`,
       description: `Xonadon band qilish shartnomasi ${client.fio} uchun`,
       sections: [
         {
           properties: {
             page: {
               margin: { top: 1440, right: 1080, bottom: 1440, left: 1440 }, // Adjusted left margin
             },
           },
           children: lines.map(formatParagraph),
         },
       ],
       styles: { // Define reusable styles if needed
         paragraphStyles: [
           {
             id: "Normal",
             name: "Normal",
             run: { font: "Times New Roman", size: 24 },
             paragraph: {
               spacing: { after: 120 },
               alignment: AlignmentType.JUSTIFIED,
             },
           },
            // Add other styles like Heading1 if you use them explicitly
         ],
       },
     });
     return await Packer.toBlob(doc);
  };

  const handleDownloadContractWord = async (paymentId: number, client: any) => {
    try {
      const blob = await generateContractWordBlob(paymentId, client);
      saveAs(
        blob,
        `Shartnoma_${paymentId}_${client.fio.replace(/\s+/g, "_")}.docx`
      );
      toast({
        title: "Muvaffaqiyat",
        description: "Shartnoma fayli yuklab olindi.",
      });
    } catch (error) {
        console.error("Error generating/downloading Word contract:", error);
      toast({
        title: "Xatolik",
        description: "Shartnoma faylini yaratishda yoki yuklashda xatolik.",
        variant: "destructive",
      });
    }
  };

  const handlePrintContract = () => {
    if (!requestReceipt || !receiptRef.current) return;
    const printContent = receiptRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "height=800,width=800"); // Increased height
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Shartnoma №${requestReceipt.id}</title>
            <style>
              body {
                  font-family: 'Times New Roman', Times, serif;
                  margin: 2cm; /* Standard A4 margin */
                  font-size: 12pt;
                  line-height: 1.5;
               }
              pre {
                  white-space: pre-wrap; /* Ensures text wraps */
                  word-wrap: break-word; /* Breaks long words */
                  font-family: 'Times New Roman', Times, serif; /* Match body font */
                  font-size: 12pt; /* Match body font size */
                  line-height: 1.5; /* Match body line height */
                  margin: 0; /* Remove default pre margins */
                }
              h1, h2, h3 { text-align: center; }
              /* Ensure print styles match Word intent */
              p { margin-bottom: 0.5em; text-align: justify; } /* Basic paragraph styling */
              .centered { text-align: center; }
              .bold { font-weight: bold; }
              .indented { margin-left: 40px; } /* Adjust as needed */

              @media print {
                body { margin: 2cm; } /* Ensure margins are applied for printing */
                @page {
                    size: A4;
                    margin: 2cm;
                 }
              }
            </style>
          </head>
          <body>
            ${printContent} {/* Use the existing preformatted content */}
          </body>
        </html>
      `);
      printWindow.document.close();
      // Give the browser more time to render before printing
      setTimeout(() => {
        try {
            printWindow.focus(); // Ensure the window has focus
            printWindow.print();
            // Consider closing the window after print dialog appears, but this can be tricky
            // setTimeout(() => printWindow.close(), 1000);
        } catch (e) {
             console.error("Printing failed:", e);
             toast({ title: "Xatolik", description: "Chop etish amalga oshmadi.", variant: "destructive"});
             // Optionally close if print fails: printWindow.close();
        }
      }, 500); // Increased timeout
    } else {
      toast({
        title: "Xatolik",
        description:
          "Chop etish oynasini ochib bo‘lmadi. Brauzeringizda popup blokerni tekshiring.",
        variant: "destructive",
      });
    }
  };


  const updateApartmentPrice = async () => {
    if (!accessToken || !params.id || !apartment) return false; // Added !apartment check

    const newPrice = Number(formData.totalAmount);
    // Check if price actually changed
    if (newPrice === apartment.price) {
        // console.log("Price hasn't changed.");
        return true; // No update needed, consider it successful
    }

    if (isNaN(newPrice) || newPrice <= 0) {
      toast({
        title: "Xatolik",
        description: "Umumiy narx noto‘g‘ri yoki 0 dan kichik.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/apartments/${params.id}/`, {
        method: "PATCH", // Use PATCH for partial updates
        headers: getAuthHeaders(),
        body: JSON.stringify({ price: newPrice.toString() }), // Ensure price is sent as string if API expects it
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Narxni yangilashda xatolik (${response.status}): ${
            errorData.detail || JSON.stringify(errorData) || "Noma'lum xato"
          }`
        );
      }

      const updatedApartment = await response.json();
      setApartment(updatedApartment); // Update local apartment state with the response
      // Update formData ONLY IF necessary, typically rely on apartment state
      // setFormData((prev) => ({ ...prev, totalAmount: updatedApartment.price.toString() }));
      toast({
        title: "Muvaffaqiyat",
        description: "Xonadon narxi yangilandi.",
      });
      return true;
    } catch (error) {
        console.error("Error updating apartment price:", error);
      toast({
        title: "Xatolik",
        description:
          (error as Error).message || "Narxni yangilashda xatolik yuz berdi.",
        variant: "destructive",
      });
      return false;
    }
  };

  const addPayment = async (paymentId: number, amount: number) => {
    if (!accessToken || !paymentId || amount <= 0) { // Check amount > 0
      throw new Error("To'lov qo'shish uchun kerakli ma'lumotlar topilmadi yoki summa xato.");
    }

     // Use the selected paymentDate, fallback to current date only if null
    const paymentDateToSend = paymentDate ?? new Date();

    try {
      const response = await fetch(
        `${API_BASE_URL}/payments/${paymentId}/process_payment/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            amount: amount.toString(), // Send amount as string if API expects it
            payment_date: paymentDateToSend.toISOString().split('T')[0], // Format as YYYY-MM-DD
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
         // Try to get a more specific error message
        const errorMessage = errorData.error || errorData.detail || (typeof errorData === 'object' ? JSON.stringify(errorData) : 'Noma\'lum xato');
        throw new Error(
          `To'lov qo'shishda xatolik (${response.status}): ${errorMessage}`
        );
      }

      const result = await response.json();
      console.log("Payment processed successfully:", result);
      return result;
    } catch (error) {
        console.error("Error processing payment:", error);
      throw error; // Re-throw the error to be caught by handleSubmit
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- Form Validation ---
    if (!formData.clientId) {
      toast({ title: "Xatolik", description: "Iltimos, mijozni tanlang yoki yangi mijoz qo'shing.", variant: "destructive" });
      return;
    }
    if (!accessToken || !apartment) {
      toast({ title: "Xatolik", description: "Kerakli ma'lumotlar topilmadi (token yoki xonadon).", variant: "destructive" });
      return;
    }
    if (apartment.status !== "bosh") {
      toast({ title: "Xatolik", description: `Bu xonadon allaqachon ${apartment.status_display || apartment.status}.`, variant: "destructive" }); // Use status_display if available
      return;
    }

    const initialPayment = Number(formData.initialPayment) || 0;
    const totalAmount = Number(formData.totalAmount) || 0; // Use apartment.price as fallback later

     if (totalAmount <= 0) {
        toast({ title: "Xatolik", description: "Umumiy narx kiritilmagan yoki 0 dan kichik.", variant: "destructive" });
        return;
     }
     if (initialPayment <= 0) {
        toast({ title: "Xatolik", description: `${paymentType === 'band' ? 'Band qilish summasi' : 'Boshlang\'ich/To\'liq to\'lov'} 0 dan katta bo'lishi kerak.`, variant: "destructive" });
        return;
     }
     if ((paymentType === 'muddatli' || paymentType === 'ipoteka' || paymentType === 'naqd') && initialPayment > totalAmount) {
        toast({ title: "Xatolik", description: "Boshlang'ich/To'liq to'lov umumiy narxdan katta bo'lishi mumkin emas.", variant: "destructive" });
        return;
     }


    if (paymentType === "muddatli") {
      if (!formData.totalMonths || Number(formData.totalMonths) <= 0) {
        toast({ title: "Xatolik", description: "Muddatli to'lov uchun to'lov muddati (oy) kiritilmagan yoki xato.", variant: "destructive" });
        return;
      }
      if (!formData.due_date || Number(formData.due_date) < 1 || Number(formData.due_date) > 31) {
        toast({ title: "Xatolik", description: "Har oyning to‘lov sanasi 1 dan 31 gacha bo‘lishi kerak.", variant: "destructive" });
        return;
      }
       if (!paymentDate) {
          toast({ title: "Xatolik", description: "Boshlang'ich to'lov sanasi tanlanmagan.", variant: "destructive" });
          return;
       }
    } else if (paymentType === "band") {
      if (!bandDate) {
        toast({ title: "Xatolik", description: "Band qilish sanasi tanlanmagan.", variant: "destructive" });
        return;
      }
    } else if (paymentType === "naqd" || paymentType === "ipoteka") {
       if (!paymentDate) {
          toast({ title: "Xatolik", description: "To'lov sanasi tanlanmagan.", variant: "destructive" });
          return;
       }
       if (paymentType === 'ipoteka' && !formData.bank_name) {
           toast({ title: "Xatolik", description: "Ipoteka uchun bank nomini kiriting.", variant: "destructive" });
           // return; // Make it optional or required based on business logic
       }
    }
    // --- End Form Validation ---


    setSubmitting(true);
    try {
      const clientDetails = clients.find(
        (c) => c.id.toString() === formData.clientId
      );
      if (!clientDetails) {
        throw new Error(
          `Tanlangan mijoz (ID: ${formData.clientId}) topilmadi.`
        );
      }
      // Use kafil details from form if provided, otherwise fallback to client's existing data
      const finalClientDetails = {
        ...clientDetails,
        kafil_fio: formData.kafilFio || clientDetails.kafil_fio || null,
        kafil_phone_number: formData.kafilPhone || clientDetails.kafil_phone_number || null,
        kafil_address: formData.kafilAddress || clientDetails.kafil_address || null,
      };

       // Update price only if it has changed from the fetched apartment price
      if (totalAmount !== apartment.price) {
        const priceUpdated = await updateApartmentPrice();
        if (!priceUpdated) {
          // Error is handled within updateApartmentPrice, prevent further execution
          setSubmitting(false);
          return;
        }
        // Refresh apartment data locally after successful price update if needed,
        // though updateApartmentPrice should set it. Re-fetch might be safer.
        // await fetchData(); // Option: Re-fetch all data after price update
      }


      let calculatedMonthlyPayment = 0;
      if (paymentType === "muddatli") {
          try {
              calculatedMonthlyPayment = calculateMonthlyPayment();
              // Only throw error if payment > 0 is expected but calculation failed
               if (calculatedMonthlyPayment <= 0 && initialPayment < totalAmount) {
                  throw new Error(
                     "Muddatli to'lov uchun oylik to'lovni hisoblashda xatolik yuz berdi yoki natija 0."
                  );
               }
          } catch (e) {
               throw new Error( // Re-throw with specific message
                   (e as Error).message || "Oylik to'lovni hisoblashda xatolik."
               );
          }
      }

      const durationMonths =
        paymentType === "muddatli" ? Number(formData.totalMonths) : null; // Use null if not applicable

      // --- Prepare Payment Payload ---
       const paymentPayload: any = { // Use 'any' or define a specific interface
         user: Number(formData.clientId),
         apartment: Number(params.id),
         payment_type: paymentType,
         total_amount: totalAmount.toString(),
         initial_payment: initialPayment.toString(),
         // interest_rate: 0, // Only include if your API uses it
         duration_months: durationMonths, // Will be null for non-installment
         monthly_payment: paymentType === "muddatli" ? calculatedMonthlyPayment.toFixed(2) : null, // Use null if not applicable
         due_date: paymentType === "muddatli" ? Number(formData.due_date) : null, // Use null if not applicable
         paid_amount: "0", // Initial paid amount is usually handled by process_payment
         status: "pending", // Or set based on logic (e.g., 'completed' for 'naqd')? API likely handles this.
         additional_info: JSON.stringify({ // Store structured info
             comments: formData.comments || "",
             bank_name: paymentType === 'ipoteka' ? formData.bank_name : undefined, // Only add bank name for ipoteka
         }),
         // Conditionally set dates based on payment type
         reservation_deadline: paymentType === "band" && bandDate ? bandDate.toISOString().split('T')[0] : null,
         payment_date: paymentType !== "band" && paymentDate ? paymentDate.toISOString().split('T')[0] : null,
       };

       // Remove null fields if API doesn't accept them
       Object.keys(paymentPayload).forEach(key => {
           if (paymentPayload[key] === null || paymentPayload[key] === undefined) {
             delete paymentPayload[key];
           }
       });
       // --- End Prepare Payment Payload ---


      // --- API Call: Create Payment Record ---
      const paymentResponse = await fetch(`${API_BASE_URL}/payments/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(paymentPayload),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json().catch(() => ({}));
         const errorMessage = errorData.detail || errorData.error || (typeof errorData === 'object' ? JSON.stringify(errorData) : 'Noma\'lum xato');
        throw new Error(
          `To'lov yozuvini yaratishda xatolik (${paymentResponse.status}): ${errorMessage}`
        );
      }

      const paymentResult = await paymentResponse.json();
      // --- End API Call: Create Payment Record ---


      // --- API Call: Process Initial Payment ---
      // Process payment only if it's not just a 'band' without initial payment concept in API
      if (initialPayment > 0 && paymentType !== 'band') { // Adjust condition based on 'band' logic
          await addPayment(paymentResult.id, initialPayment);
      }
      // --- End API Call: Process Initial Payment ---


      // --- Generate Contract & Show Modal ---
      const contractText = generateContractText(
        paymentResult.id,
        finalClientDetails
      );
      setRequestReceipt({
        id: paymentResult.id,
        client: finalClientDetails,
        contractText,
      });
      setIsReceiptModalOpen(true); // Show modal after successful operations
      // --- End Generate Contract & Show Modal ---


      toast({
        title: "Muvaffaqiyat!",
        description: `Xonadon №${apartment.room_number} muvaffaqiyatli ${
          paymentType === "muddatli" ? "muddatli to'lovga" :
          paymentType === "ipoteka" ? "ipoteka bilan" :
          paymentType === "naqd" ? "naqd to'lov bilan sotildi" :
          `band qilindi`
        }. To'lov ID: ${paymentResult.id}`,
      });

      // Optional: Redirect after a short delay or keep user on page
      // setTimeout(() => router.push(`/apartments/${params.id}`), 2000);
       // Or refresh data on the current page
       fetchData(); // Refresh apartment status, etc.

    } catch (error) {
        console.error("Form submission error:", error);
      toast({
        title: "Xatolik",
        description:
          (error as Error).message || "Band qilish jarayonida noma'lum xatolik.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };


  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="border-b">
          <div className="flex h-16 items-center px-4">
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              {/* <Search /> */} {/* Search might not be needed here */}
              <UserNav />
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
           <Loader2 className="mr-2 h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Ma'lumotlar yuklanmoqda...</p>
        </div>
         <footer className="border-t py-4 px-4 text-center text-sm text-muted-foreground">
             Barcha huquqlar ximoyalangan | Ushbu Dastur CDCGroup tomonidan yaratilgan | CraDev Company tomonidan qo'llab quvvatlanadi | since 2019
         </footer>
      </div>
    );
  }

  // --- Main Return JSX ---
  return (
    // *FIX*: Single root element wrapping everything
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            {/* <Search /> */} {/* Optional Search */}
            <UserNav />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Xonadon band qilish
            </h2>
            <p className="text-muted-foreground">
              {apartment
                ? `№ ${apartment.room_number}, ${
                    apartment.object_name || "Noma'lum obyekt"
                  }`
                : "Xonadon topilmadi"}
            </p>
          </div>
          {apartment && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/apartments/${apartment.id}`)}
            >
              <Home className="mr-2 h-4 w-4" /> Xonadonga qaytish
            </Button>
          )}
        </div>

        {/* Form and Info Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Band qilish ma'lumotlari</CardTitle>
                <CardDescription>
                  Mijoz va to'lov ma'lumotlarini kiriting.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                  {/* Client Tabs */}
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="space-y-4"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                       {/* *FIX*: Corrected TabsTrigger and removed redundancy */}
                      <TabsTrigger value="existing">Mavjud mijoz</TabsTrigger>
                      <TabsTrigger value="new">Yangi mijoz</TabsTrigger>
                    </TabsList>
                    {/* Existing Client Tab */}
                    <TabsContent value="existing">
                      <div className="space-y-2 pt-2">
                        <Label htmlFor="clientId">Mijozni tanlang</Label>
                        <Select
                          value={formData.clientId}
                          onValueChange={(value) => {
                            handleSelectChange("clientId", value);
                            // Reset new client form fields when selecting existing
                            setFormData((prev) => ({
                              ...prev,
                              name: "", phone: "", address: "",
                              kafilFio: "", kafilPhone: "", kafilAddress: "",
                            }));
                            setShowKafil(false); // Hide kafil section as well
                          }}
                        >
                          <SelectTrigger id="clientId">
                            <SelectValue placeholder="Ro'yxatdan mijozni tanlang..." />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.length > 0 ? (
                              clients.map((client) => (
                                <SelectItem
                                  key={client.id}
                                  value={client.id.toString()}
                                >
                                  {client.fio} ({client.phone_number})
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-clients" disabled>
                                Mijozlar topilmadi
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Agar mijoz ro'yxatda bo'lmasa, "Yangi mijoz"
                          yorlig'iga o'ting.
                        </p>
                      </div>
                    </TabsContent>
                    {/* New Client Tab */}
                    <TabsContent value="new">
                      <div className="space-y-4 pt-2">
                        {/* New Client Fields */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="name">
                              F.I.O. <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="name"
                              name="name"
                              placeholder="To'liq ism sharifi"
                              value={formData.name}
                              onChange={(e) => {
                                handleChange(e);
                                handleSelectChange("clientId", ""); // Clear selected client ID
                              }}
                              disabled={isAddingClient}
                              required={activeTab === 'new'} // Require only if this tab is active
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">
                              Telefon raqami{" "}
                              <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="phone"
                              name="phone"
                              placeholder="+998 XX XXX XX XX"
                              value={formData.phone}
                              onChange={(e) => {
                                handleChange(e);
                                handleSelectChange("clientId", "");
                              }}
                              disabled={isAddingClient}
                               required={activeTab === 'new'}
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2"> {/* Address full width */}
                            <Label htmlFor="address">Yashash manzili</Label>
                            <Input
                              id="address"
                              name="address"
                              placeholder="Viloyat, shahar, ko'cha, uy"
                              value={formData.address}
                              onChange={(e) => {
                                handleChange(e);
                                handleSelectChange("clientId", "");
                              }}
                              disabled={isAddingClient}
                            />
                          </div>
                        </div>
                        {/* Kafil Section */}
                        <div className="pt-4">
                          {!showKafil ? (
                            <Button
                              variant="outline"
                              type="button"
                              onClick={() => {
                                setShowKafil(true);
                                handleSelectChange("clientId", ""); // Clear selected client ID
                              }}
                              className="w-full"
                              disabled={isAddingClient}
                            >
                              <Plus className="mr-2 h-4 w-4" /> Kafil
                              ma'lumotlarini qo'shish
                            </Button>
                          ) : (
                            <div className="space-y-4 rounded-md border p-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">
                                  Kafil ma'lumotlari
                                </h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  type="button"
                                  onClick={() => {
                                    setShowKafil(false);
                                    setFormData((prev) => ({
                                      ...prev,
                                      kafilFio: "", kafilPhone: "", kafilAddress: "",
                                    }));
                                  }}
                                  className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                  disabled={isAddingClient}
                                >
                                  Olib tashlash
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label htmlFor="kafilFio">Kafil F.I.O.</Label>
                                  <Input
                                    id="kafilFio" name="kafilFio"
                                    placeholder="Kafilning to'liq ismi"
                                    value={formData.kafilFio}
                                    onChange={handleChange}
                                    disabled={isAddingClient}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="kafilPhone">Kafil telefon raqami</Label>
                                  <Input
                                    id="kafilPhone" name="kafilPhone"
                                    placeholder="+998 XX XXX XX XX"
                                    value={formData.kafilPhone}
                                    onChange={handleChange}
                                    disabled={isAddingClient}
                                  />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                  <Label htmlFor="kafilAddress">Kafil manzili</Label>
                                  <Input
                                    id="kafilAddress" name="kafilAddress"
                                    placeholder="Kafilning yashash manzili"
                                    value={formData.kafilAddress}
                                    onChange={handleChange}
                                    disabled={isAddingClient}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Add Client Button */}
                        <Button
                          type="button"
                          onClick={handleAddClient}
                          disabled={isAddingClient || !formData.name || !formData.phone} // Disable if required fields empty
                          className="w-full mt-4"
                        >
                          {isAddingClient ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <UserPlus className="mr-2 h-4 w-4" />
                          )}
                          Mijozni qo'shish
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Payment Details Section */}
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="text-lg font-semibold">To'lov shartlari</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Payment Type Select */}
                      <div className="space-y-2">
                        <Label htmlFor="paymentType">To'lov turi</Label>
                        <Select
                          value={paymentType}
                          onValueChange={(value) => {
                            setPaymentType(value);
                            // Reset fields based on type change
                            setFormData((prev) => ({
                              ...prev,
                              totalMonths: "",
                              // Reset totalAmount to current apartment price on type change? Maybe not.
                              // totalAmount: apartment?.price?.toString() || prev.totalAmount,
                              due_date: value === "muddatli" ? "15" : "", // Default due date for installment
                              initialPayment: "", // Reset initial payment on type change
                              bank_name: "", // Reset bank name
                            }));
                            setBandDate(null);
                            setPaymentDate(null);
                          }}
                        >
                          <SelectTrigger id="paymentType">
                            <SelectValue placeholder="To'lov turini tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="naqd">Naqd pul</SelectItem>
                            <SelectItem value="muddatli">Muddatli to‘lov</SelectItem>
                            <SelectItem value="ipoteka">Ipoteka</SelectItem>
                            {/* <SelectItem value="band">Band qilish</SelectItem> */}
                          </SelectContent>
                        </Select>
                      </div>
                       {/* Total Amount Input */}
                      <div className="space-y-2">
                        <Label htmlFor="totalAmount">
                          Umumiy narx ($){" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="totalAmount" name="totalAmount" type="number"
                          min="0" step="any" // Allow decimals if needed
                          value={formData.totalAmount}
                          onChange={handleChange}
                          required
                          disabled={submitting}
                        />
                        <p className="text-xs text-muted-foreground">
                          Joriy narx: {formatNumber(apartment?.price ?? 0)} $
                        </p>
                      </div>
                    </div>
                     {/* Dynamic Payment Fields */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Initial Payment Input */}
                      <div className="space-y-2">
                        <Label htmlFor="initialPayment">
                          {paymentType === "muddatli" ? "Boshlang'ich to'lov" :
                           paymentType === "ipoteka" ? "Boshlang'ich to'lov" :
                           paymentType === "naqd" ? "To'liq summa" :
                           "Band qilish summasi"}{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="initialPayment" name="initialPayment" type="number"
                          min="0" step="any"
                          // Max validation can be complex, handle in validation logic
                           max={paymentType === 'naqd' ? formData.totalAmount : undefined} // Simple max for naqd
                          value={formData.initialPayment}
                          onChange={handleChange}
                          required
                           disabled={submitting}
                        />
                          {/* Show percentage only for relevant types */}
                         {(paymentType === 'muddatli' || paymentType === 'ipoteka') && Number(formData.initialPayment) > 0 && Number(formData.totalAmount) > 0 && (
                             <p className="text-xs text-muted-foreground">
                                 Qoldiq: {calculateRemainingPercentage()}%
                             </p>
                         )}
                      </div>

                      {/* Fields specific to 'muddatli' */}
                      {paymentType === "muddatli" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="totalMonths">
                              To'lov muddati (oy){" "}
                              <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="totalMonths" name="totalMonths" type="number"
                              min="1" step="1"
                              value={formData.totalMonths}
                              onChange={handleChange}
                              placeholder="Masalan, 12"
                              required
                               disabled={submitting}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="due_date">
                              Har oyning to‘lov sanasi{" "}
                              <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="due_date" name="due_date" type="number"
                              min="1" max="31" step="1"
                              value={formData.due_date}
                              onChange={handleChange}
                              placeholder="Masalan, 15"
                              required
                               disabled={submitting}
                            />
                            <p className="text-xs text-muted-foreground">
                              1 dan 31 gacha kunni kiriting.
                            </p>
                          </div>
                            {/* Payment Date for Muddatli Initial Payment */}
                             <div className="space-y-2">
                               <Label htmlFor="payment_date_muddatli">
                                 Boshlang'ich to'lov sanasi <span className="text-red-500">*</span>
                               </Label>
                               <div className="relative">
                                 <DatePicker
                                   selected={paymentDate}
                                   onChange={(date: Date | null) => {
                                     setPaymentDate(date);
                                     setIsPaymentDatePickerOpen(false);
                                   }}
                                   dateFormat="dd/MM/yyyy"
                                   placeholderText="Sanani tanlang"
                                   className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                   open={isPaymentDatePickerOpen}
                                   onClickOutside={() => setIsPaymentDatePickerOpen(false)}
                                   onSelect={() => setIsPaymentDatePickerOpen(false)} // Close on selection
                                   onFocus={() => setIsPaymentDatePickerOpen(true)}
                                    // minDate={new Date()} // Allow past dates? Maybe for back-dating?
                                   required
                                   disabled={submitting}
                                   popperPlacement="top-start" // Adjust position if needed
                                 />
                               </div>
                             </div>
                        </>
                      )}

                      {/* Field specific to 'band' */}
                      {paymentType === "band" && (
                        <div className="space-y-2">
                          <Label htmlFor="band_date">
                            Band qilish muddati <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative">
                            <DatePicker
                              selected={bandDate}
                              onChange={(date: Date | null) => {
                                setBandDate(date);
                                setIsDatePickerOpen(false);
                              }}
                              dateFormat="dd/MM/yyyy"
                              placeholderText="Sanani tanlang"
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              open={isDatePickerOpen}
                              onClickOutside={() => setIsDatePickerOpen(false)}
                              onSelect={() => setIsDatePickerOpen(false)} // Close on selection
                              onFocus={() => setIsDatePickerOpen(true)}
                              minDate={new Date()} // Band deadline should be in the future
                              required
                               disabled={submitting}
                               popperPlacement="top-start"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Qaysi sanagacha band qilinishini tanlang.
                          </p>
                        </div>
                      )}

                       {/* Payment Date for 'naqd' or 'ipoteka' */}
                      {(paymentType === "naqd" || paymentType === "ipoteka") && (
                        <div className="space-y-2">
                          <Label htmlFor="payment_date_naqd_ipoteka">
                            To'lov sanasi <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative">
                            <DatePicker
                              selected={paymentDate}
                              onChange={(date: Date | null) => {
                                setPaymentDate(date);
                                setIsPaymentDatePickerOpen(false);
                              }}
                              dateFormat="dd/MM/yyyy"
                              placeholderText="Sanani tanlang"
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              open={isPaymentDatePickerOpen}
                              onClickOutside={() => setIsPaymentDatePickerOpen(false)}
                              onSelect={() => setIsPaymentDatePickerOpen(false)} // Close on selection
                              onFocus={() => setIsPaymentDatePickerOpen(true)}
                               // minDate={new Date()} // Allow past dates?
                              required
                               disabled={submitting}
                               popperPlacement="top-start"
                            />
                          </div>
                        </div>
                      )}

                       {/* Bank Name for 'ipoteka' */}
                      {paymentType === "ipoteka" && (
                        <div className="space-y-2">
                          <Label htmlFor="bank_name">Bank nomi</Label>
                          <Input
                            id="bank_name" name="bank_name"
                            value={formData.bank_name || ""}
                            onChange={handleChange}
                            placeholder="Masalan, Ipoteka Bank"
                             disabled={submitting}
                          />
                        </div>
                      )}
                    </div>
                     {/* Comments Textarea */}
                    <div className="space-y-2 pt-4">
                      <Label htmlFor="comments">Izohlar</Label>
                      <Textarea
                        id="comments" name="comments"
                        placeholder="Shartnoma yoki to'lovga oid qo'shimcha izohlar..."
                        value={formData.comments}
                        onChange={handleChange}
                        rows={3}
                         disabled={submitting}
                      />
                    </div>
                  </div>
                </CardContent>
                {/* Card Footer with Buttons */}
                <CardFooter className="flex justify-end space-x-3 border-t px-6 py-4">
                  <Button
                    variant="outline" type="button"
                    onClick={() => router.back()}
                    disabled={submitting || isAddingClient}
                  >
                    Bekor qilish
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      submitting || isAddingClient || loading || !formData.clientId || apartment?.status !== 'bosh'
                    }
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {submitting ? "Jarayonda..." : "Band qilish va Shartnoma"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* Right Column: Info Cards */}
          <div className="lg:col-span-1 space-y-6">
            {/* Apartment Info Card */}
            {apartment && (
              <Card>
                <CardHeader>
                  <CardTitle>Xonadon haqida</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                   {/* Use helper function for cleaner display */}
                   {Object.entries({
                       "Obyekt": apartment.object_name,
                       "Xonadon №": apartment.room_number,
                       "Qavat": apartment.floor,
                       "Xonalar": apartment.rooms,
                       "Maydon": apartment.area ? `${apartment.area} m²` : null,
                   }).map(([label, value]) => value ? ( // Only show if value exists
                        <div className="flex justify-between" key={label}>
                            <span>{label}:</span>
                            <span className="font-medium text-right">{value}</span>
                        </div>
                   ) : null)}

                  <div className="flex justify-between pt-2 border-t mt-2">
                    <span className="font-semibold">Narx:</span>
                    <span className="font-bold text-lg text-primary">
                      {formatNumber(apartment.price ?? 0)} $
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Holati:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${ // Added capitalize
                        apartment.status === "bosh" ? "bg-green-100 text-green-800" :
                        apartment.status === "band" ? "bg-yellow-100 text-yellow-800" :
                        apartment.status === "muddatli" ? "bg-blue-100 text-blue-800" :
                        apartment.status === "sotilgan" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800" // Default style
                      }`}
                    >
                      {apartment.status_display || apartment.status || "Noma'lum"} {/* Show display name if available */}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

             {/* Payment Summary Card (Conditional) */}
             {((paymentType === 'muddatli' && Number(formData.totalAmount) > 0) ||
               (paymentType === 'band' && Number(formData.totalAmount) > 0) ||
               ((paymentType === 'naqd' || paymentType === 'ipoteka') && Number(formData.totalAmount) > 0)
             ) && (
             <Card>
                 <CardHeader>
                     <CardTitle>
                         {paymentType === 'muddatli' ? "Muddatli to'lov xulosasi" :
                          paymentType === 'band' ? "Band qilish xulosasi" :
                          "To'lov xulosasi"}
                     </CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-3 text-sm">
                     <div className="flex justify-between">
                         <span>Umumiy narx:</span>
                         <span>{formatNumber(formData.totalAmount)} $</span>
                     </div>
                     <div className="flex justify-between">
                         <span>
                             {paymentType === 'naqd' ? "To'liq summa" :
                              paymentType === 'band' ? "Band qilish summasi" :
                              "Boshlang'ich to'lov"}:
                         </span>
                         <span>{formatNumber(formData.initialPayment || "0")} $</span>
                     </div>

                     {/* Muddatli Specific */}
                     {paymentType === 'muddatli' && (
                         <>
                             <div className="flex justify-between">
                                 <span>Qolgan summa:</span>
                                 <span>
                                     {formatNumber(
                                         Math.max(0, Number(formData.totalAmount) - Number(formData.initialPayment || "0"))
                                     )} $
                                 </span>
                             </div>
                             <div className="flex justify-between">
                                 <span>Muddat:</span>
                                 <span>{formData.totalMonths || "-"} oy</span>
                             </div>
                             <div className="flex justify-between">
                                 <span>Har oyning sanasi:</span>
                                 <span>{formData.due_date || "-"}-kuni</span>
                             </div>
                              <div className="flex justify-between">
                                  <span>Boshl. to'lov sanasi:</span>
                                  <span>{paymentDate ? paymentDate.toLocaleDateString("uz-UZ") : "Tanlanmagan"}</span>
                              </div>
                             <div className="flex justify-between items-center pt-3 border-t mt-2">
                                 <span className="font-semibold">Taxminiy oylik to'lov:</span>
                                 <span className="font-bold text-lg text-primary">
                                     {(() => {
                                         if (!formData.totalMonths || !formData.totalAmount || !formData.initialPayment) return "-";
                                         try {
                                             const monthly = calculateMonthlyPayment();
                                             if (monthly > 0) {
                                                 return `${formatNumber(monthly)} $`;
                                             } else if (Number(formData.initialPayment) >= Number(formData.totalAmount)) {
                                                 return "To'langan"; // Fully paid
                                             }
                                              else {
                                                 return "-"; // Calculation resulted in 0 or less, but not fully paid
                                             }
                                         } catch (e) {
                                             return <span className="text-red-500 text-sm font-normal">Xato</span>;
                                         }
                                     })()}
                                 </span>
                             </div>
                         </>
                     )}

                      {/* Band Specific */}
                     {paymentType === 'band' && (
                         <div className="flex justify-between">
                             <span>Band qilish muddati:</span>
                             <span>{bandDate ? bandDate.toLocaleDateString("uz-UZ") : "Tanlanmagan"}</span>
                         </div>
                     )}

                     {/* Naqd/Ipoteka Specific */}
                     {(paymentType === 'naqd' || paymentType === 'ipoteka') && (
                          <>
                              <div className="flex justify-between">
                                 <span>To'lov sanasi:</span>
                                 <span>{paymentDate ? paymentDate.toLocaleDateString("uz-UZ") : "Tanlanmagan"}</span>
                              </div>
                               {paymentType === 'ipoteka' && formData.bank_name && (
                                   <div className="flex justify-between">
                                     <span>Bank:</span>
                                     <span>{formData.bank_name}</span>
                                   </div>
                               )}
                          </>
                     )}
                 </CardContent>
             </Card>
             )}

          </div> {/* End Right Column */}
        </div> {/* End Grid */}
      </main> {/* End Main Content */}

       {/* Footer - *FIX*: Moved inside the main wrapper div */}
      <footer className="border-t py-4 px-4 text-center text-sm text-muted-foreground mt-auto"> {/* Added mt-auto */}
        Barcha huquqlar ximoyalangan | Ushbu Dastur CDCGroup tomonidan yaratilgan | CraDev Company tomonidan qo'llab quvvatlanadi | since 2019
      </footer>

       {/* Receipt Modal - *FIX*: Moved inside the main wrapper div */}
      {isReceiptModalOpen && requestReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white"> {/* Added bg-white */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-3 pt-4 px-4">
              <CardTitle className="text-lg font-semibold">
                Shartnoma №{requestReceipt.id}
              </CardTitle>
              <Button
                onClick={() => setIsReceiptModalOpen(false)}
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-500 hover:text-gray-800" // Improved styling
              >
                 <span className="sr-only">Yopish</span>
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> {/* X icon */}
              </Button>
            </CardHeader>
            <CardContent className="p-4 md:p-6 flex-grow overflow-y-auto">
              <p className="mb-4 text-sm text-muted-foreground">
                Xonadon muvaffaqiyatli band qilindi. Quyida dastlabki shartnoma
                bilan tanishing.
              </p>
              <div
                ref={receiptRef}
                className="p-4 bg-gray-50 rounded border border-gray-200"
              >
                {/* Use pre for preserving whitespace from generated contract text */}
                <pre className="whitespace-pre-wrap text-xs sm:text-sm font-serif leading-relaxed text-gray-800">
                  {requestReceipt.contractText}
                </pre>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end border-t px-6 py-4 bg-gray-50"> {/* Added bg */}
              <Button
                variant="outline"
                onClick={handlePrintContract}
                className="w-full sm:w-auto"
              >
                <Printer className="mr-2 h-4 w-4" /> Chop etish
              </Button>
              <Button
                onClick={() =>
                  handleDownloadContractWord(
                    requestReceipt.id,
                    requestReceipt.client
                  )
                }
                className="w-full sm:w-auto"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> {/* Download icon */}
                Yuklab olish (Word)
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsReceiptModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Yopish
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

    </div> // *FIX*: End of single root element
  );
}