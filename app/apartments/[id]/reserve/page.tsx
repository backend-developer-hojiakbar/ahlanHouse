"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MainNav } from "@/components/main-nav";
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
  TabStopType,
} from "docx";
import { saveAs } from "file-saver";
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
  const [paymentType, setPaymentType] = useState("naqd");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [showKafil, setShowKafil] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [requestReceipt, setRequestReceipt] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("existing");
  const [bandDate, setBandDate] = useState<Date | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date | null>(null);

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
    bank_name: "",
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
    let nextUrl: string | null = `${API_BASE_URL}/users/?user_type=mijoz&page_size=${PAGE_SIZE}`;

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
      const apartmentResponse = await fetch(`${API_BASE_URL}/apartments/${apartmentId}/`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (!apartmentResponse.ok) {
        if (apartmentResponse.status === 404) throw new Error("Xonadon topilmadi.");
        throw new Error(`Xonadon ma'lumotlarini olishda xatolik (${apartmentResponse.status})`);
      }
      const apartmentData = await apartmentResponse.json();
      setApartment(apartmentData);
      const allClients = await fetchAllClients();
      setClients(allClients);
      setFormData((prev) => ({
        ...prev,
        totalAmount: apartmentData.price?.toString() ?? "",
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const createClient = async (): Promise<any> => {
    if (!accessToken) throw new Error("Avtorizatsiya qilinmagan.");
    if (!validatePhoneNumber(formData.phone)) {
      throw new Error("Telefon raqami noto'g'ri formatda. To'g'ri format: +998901234567");
    }
    if (formData.kafilPhone && !validatePhoneNumber(formData.kafilPhone)) {
      throw new Error("Kafil telefon raqami noto'g'ri formatda. To'g'ri format: +998901234567");
    }
    const clientData = {
      fio: formData.name,
      phone_number: formData.phone,
      address: formData.address || "",
      user_type: "mijoz",
      kafil_fio: formData.kafilFio || null,
      kafil_phone_number: formData.kafilPhone || null,
      kafil_address: formData.kafilAddress || null,
      password: formData.phone,
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
        if (errorData.phone_number && errorData.phone_number.some((err: string) => err.includes("already exists"))) {
          errorMessage = "Bu telefon raqami allaqachon ro'yxatdan o'tgan.";
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }
        throw new Error(errorMessage);
      }
      return await response.json();
    } catch (error) {
      throw new Error((error as Error).message || "Mijoz qo'shishda noma'lum xatolik");
    }
  };

  const handleAddClient = async () => {
    if (!formData.name || !formData.phone) {
      toast({
        title: "Ma'lumot yetarli emas",
        description: "Iltimos, yangi mijoz uchun F.I.O. va telefon raqamini kiriting.",
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
        description: (error as Error).message || "Mijozni qo'shishda xatolik yuz berdi.",
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
    if (totalMonths <= 0 || totalAmount <= 0) return 0;
    if (initialPayment >= totalAmount) return 0;
    const principal = totalAmount - initialPayment;
    const monthlyPayment = principal / totalMonths;
    if (!isFinite(monthlyPayment) || monthlyPayment > Number.MAX_SAFE_INTEGER) {
      console.error("Calculated monthly payment is too large or invalid:", monthlyPayment);
      return 0;
    }
    return monthlyPayment;
  };

  const calculateRemainingPercentage = () => {
    if (!apartment || !formData.initialPayment) return 0;
    const initialPayment = Number(formData.initialPayment) || 0;
    const totalPrice = Number(formData.totalAmount) || apartment.price || 0;
    if (totalPrice <= 0 || initialPayment >= totalPrice) return 0;
    const remainingAmount = totalPrice - initialPayment;
    return ((remainingAmount / totalPrice) * 100).toFixed(1);
  };

  const calculateDiscountPercentage = () => {
    if (!apartment || !formData.totalAmount) return 0;
    const originalPrice = Number(apartment.price) || 0;
    const totalAmount = Number(formData.totalAmount) || 0;
    if (originalPrice <= 0 || totalAmount >= originalPrice) return 0;
    const discount = ((originalPrice - totalAmount) / originalPrice) * 100;
    return discount.toFixed(1);
  };

  const generatePaymentSchedule = () => {
    if (paymentType !== "muddatli" || !formData.totalMonths || !formData.due_date) return "";
    const totalMonths = Number(formData.totalMonths);
    const dueDate = Number(formData.due_date);
    if (totalMonths <= 0 || dueDate <= 0 || dueDate > 31) return "";
    const monthlyPayment = calculateMonthlyPayment();
    if (monthlyPayment <= 0) {
      return Number(formData.totalAmount) > Number(formData.initialPayment || 0)
        ? "   - Oylik to'lovni hisoblashda xato."
        : "   - Boshlang'ich to'lov umumiy summani qopladi.";
    }
    const schedule: string[] = [];
    const firstPaymentCalcDate = paymentDate ? new Date(paymentDate) : new Date();
    firstPaymentCalcDate.setMonth(firstPaymentCalcDate.getMonth() + 1);
    for (let i = 1; i <= totalMonths; i++) {
      const paymentDateCalc = new Date(firstPaymentCalcDate);
      paymentDateCalc.setMonth(firstPaymentCalcDate.getMonth() + i - 1);
      paymentDateCalc.setDate(dueDate);
      const lastDayOfMonth = new Date(paymentDateCalc.getFullYear(), paymentDateCalc.getMonth() + 1, 0).getDate();
      if (dueDate > lastDayOfMonth) {
        paymentDateCalc.setDate(lastDayOfMonth);
      }
      const formattedDate = paymentDateCalc.toLocaleDateString("uz-UZ", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const formattedPayment = formatNumber(monthlyPayment);
      schedule.push(`   - ${i}-oy: ${formattedDate} - ${formattedPayment} $`);
    }
    return schedule.join("\n");
  };

  const generateContractText = (paymentId: number, client: any) => {
    if (!apartment || !client?.fio) {
      console.error("Contract generation failed: Missing apartment or client data.");
      return "Xatolik: Xonadon yoki mijoz ma'lumotlari topilmadi.";
    }
    const currentDate = new Date().toLocaleDateString("uz-UZ", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const priceInWords = (price: number): string => {
      const numStr = formatNumber(price);
      return `${numStr} $`;
    };
    const finalPrice = Number(formData.totalAmount) || apartment.price || 0;
    const formattedPrice = formatNumber(finalPrice);
    const priceWords = priceInWords(finalPrice);
    const discountPercentage = calculateDiscountPercentage();
    const initialPaymentFormatted = formatNumber(formData.initialPayment || 0);
    let monthlyPaymentFormatted = "0";
    if (paymentType === "muddatli") {
      const monthlyPayment = calculateMonthlyPayment();
      monthlyPaymentFormatted =
        monthlyPayment > 0
          ? formatNumber(monthlyPayment)
          : Number(formData.totalAmount) > Number(formData.initialPayment || 0)
          ? "Hisoblashda xato"
          : "-";
    }
    const endDate = paymentDate ? new Date(paymentDate) : new Date();
    if (paymentType === "muddatli" && formData.totalMonths && Number(formData.totalMonths) > 0) {
      endDate.setMonth(endDate.getMonth() + Number(formData.totalMonths));
    }
    const endDateString = paymentType === "muddatli" && Number(formData.totalMonths) > 0
      ? endDate.toLocaleDateString("uz-UZ")
      : "N/A";
    const paymentSchedule = generatePaymentSchedule();
    const bandDateString = bandDate ? bandDate.toLocaleDateString("uz-UZ") : "Noma'lum";
    const paymentDateString = paymentDate ? paymentDate.toLocaleDateString("uz-UZ") : currentDate;

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
   ${apartment.floor || "N/A"}-қаватли ${apartment.room_number || "N/A"}-хонадонли (${apartment.rooms || "?"} хонали,
   умумий майдони ${apartment.area || "?"} кв.м) турар-жой биносини қуришга, буюртмачи
   вазифасини бажариш тўғрисида шартномани (кейинги ўринларда - асосий
   шартнома) тузиш мажбуриятини ўз зиммаларига оладилар.

                          II. МУҲИМ ШАРТЛАР

1. Томонлар қуйидагиларни асосий шартноманинг муҳим шартлари деб
   ҳисоблашга келишиб оладилар:
   а) «Буюртмачи»га топшириладиган ${apartment.room_number || "N/A"}-хонадоннинг умумий
      қийматининг бошланғич нархи ${formattedPrice} (${priceWords}) сўмни
      ташкил этади ва ушбу нарх томонлар томонидан келишилган ҳолда
      ${paymentType === "naqd" || paymentType === "band" ? "ўзгармайди" : "ўзгариши мумкин"};
      ${discountPercentage > 0 ? `Chegirma: ${discountPercentage}%` : ""}
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
   ${paymentType === "naqd"
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
${paymentType === "muddatli"
    ? `   - Бошланғич тўлов: ${initialPaymentFormatted} $ (${paymentDateString}).
   - Ойлик тўлов: ${monthlyPaymentFormatted} $ (har oyning ${formData.due_date || 15}-sanasigacha).
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
       ${paymentType === "naqd"
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
Фарғона вилояти, Қўқон шаҳар,             Телефон: ${client.phone_number || "Кўрсатилмаган"}
Адабиёт кўчаси, 25-уй                     Манзил: ${client.address || "Кўрсатилмаган"}
СТИР: 306997685
ХХТУТ: 61110
Х/р: 20208000205158478001
МФО: 01076 Ипотека банк                    ${client.kafil_fio ? `\nКафил: ${client.kafil_fio}` : ""}
       Қўқон филиали                       ${client.kafil_phone_number ? `Кафил тел: ${client.kafil_phone_number}` : ""}
Тел № (+99833) 701-75 75

_________________________                   _________________________
        (имзо)                                           (имзо)
    `.trim();
  };

  const generateContractWordBlob = async (paymentId: number, client: any) => {
    console.log("Generating Word document for paymentId:", paymentId, "client:", client);
    const contractText = generateContractText(paymentId, client);
    console.log("Contract text generated:", contractText.substring(0, 200)); // Birinchi 200 belgini log qilish
    const lines = contractText.split("\n").filter(line => line.trim() !== ""); // Bo‘sh satrlarni olib tashlash
    const formatParagraph = (line: string) => {
      const commonProps = { size: 24, font: "Times New Roman" };
      const trimmedLine = line.trim();
      const isMainHeading = /^(I|II|III|IV|V|VI)\.\s/.test(trimmedLine);
      const isCenteredTitle = trimmedLine.startsWith("ДАСТЛАБКИ ШАРТНОМА №") || trimmedLine.startsWith("Куп хонадонли турар-жой");
      const isSignaturePlaceholder = trimmedLine === "_________________________";
      const isSignerLabel = trimmedLine === "(имзо)";
      const isPartyLabel = trimmedLine === "Бажарувчи:" || trimmedLine === "Буюртмачи:";

      let paragraphChildren: TextRun[] = [];
      let paragraphProps: any = {
        spacing: { after: 100 },
        alignment: AlignmentType.JUSTIFIED,
      };

      if (isSignaturePlaceholder) {
        paragraphChildren.push(new TextRun({ text: " ".repeat(40), underline: { type: "SINGLE" }, ...commonProps }));
        paragraphProps.alignment = AlignmentType.LEFT;
      } else if (isSignerLabel) {
        paragraphChildren.push(new TextRun({ text: line, ...commonProps }));
        paragraphProps.alignment = AlignmentType.CENTER;
        paragraphProps.spacing = { before: 0, after: 200 };
      } else if (isPartyLabel) {
        paragraphChildren.push(new TextRun({ text: line, bold: true, ...commonProps }));
        paragraphProps.alignment = AlignmentType.LEFT;
        paragraphProps.spacing = { before: 300, after: 100 };
      } else {
        const parts = line.split(/:\s*(.+)/);
        if (parts.length > 1 && (parts[0].includes("МФО") || parts[0].includes("Х/р") || parts[0].includes("СТИР") || parts[0].includes("Телефон") || parts[0].includes("Манзил") || parts[0].includes("Кафил") || parts[0].includes("ХХТУТ") || parts[0].includes("Тел №"))) {
          paragraphChildren.push(new TextRun({ text: `${parts[0].trim()}:`, ...commonProps }));
          paragraphChildren.push(new TextRun({ text: `\t${parts[1].trim()}`, ...commonProps }));
          paragraphProps.alignment = AlignmentType.LEFT;
          paragraphProps.tabStops = [{ type: TabStopType.LEFT, position: 2880 }];
          if (parts[0].includes("Кафил")) {
            paragraphProps.indent = { left: 720 };
          }
        } else {
          paragraphChildren.push(new TextRun({
            text: line,
            ...commonProps,
            bold: isMainHeading || (isCenteredTitle && trimmedLine.startsWith("ДАСТЛАБКИ")),
            size: isCenteredTitle && trimmedLine.startsWith("ДАСТЛАБКИ") ? 28 : 24,
          }));
        }
      }

      if (isCenteredTitle) {
        paragraphProps.alignment = AlignmentType.CENTER;
        paragraphProps.spacing = { after: 200 };
      } else if (isMainHeading) {
        paragraphProps.heading = HeadingLevel.HEADING_1;
        paragraphProps.alignment = AlignmentType.CENTER;
        paragraphProps.spacing = { before: 300, after: 150 };
      } else if (trimmedLine.match(/^\d+\)/) || trimmedLine.match(/^[а-я]\)/) || trimmedLine.startsWith("-") || trimmedLine.startsWith("Chegirma")) {
        paragraphProps.indent = { left: 720 };
        paragraphProps.alignment = AlignmentType.JUSTIFIED;
      }

      return new Paragraph({ children: paragraphChildren, ...paragraphProps });
    };

    const doc = new Document({
      creator: "Ahlan House System",
      title: `Shartnoma №${paymentId}`,
      description: `Xonadon band qilish shartnomasi ${client.fio} uchun`,
      sections: [{
        properties: {
          page: { margin: { top: 1440, right: 1080, bottom: 1440, left: 1440 } },
        },
        children: lines.map(formatParagraph),
      }],
      styles: {
        paragraphStyles: [{
          id: "Normal",
          name: "Normal",
          run: { font: "Times New Roman", size: 24 },
          paragraph: { spacing: { after: 120 }, alignment: AlignmentType.JUSTIFIED },
        }],
      },
    });

    try {
      const blob = await Packer.toBlob(doc);
      console.log("Word blob generated successfully, size:", blob.size);
      return blob;
    } catch (error) {
      console.error("Error generating Word document:", error);
      throw new Error(`Word hujjatini yaratishda xatolik: ${(error as Error).message}`);
    }
  };

  const handleDownloadContractWord = async (paymentId: number, client: any) => {
    try {
      const blob = await generateContractWordBlob(paymentId, client);
      console.log("Initiating download for blob:", blob);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Shartnoma_${paymentId}_${client.fio.replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ title: "Muvaffaqiyat", description: "Shartnoma fayli yuklab olindi." });
    } catch (error) {
      console.error("Error generating/downloading Word contract:", error);
      toast({
        title: "Xatolik",
        description: (error as Error).message || "Shartnoma faylini yaratishda yoki yuklashda xatolik.",
        variant: "destructive",
      });
    }
  };

  const handlePrintContract = () => {
    if (!requestReceipt || !receiptRef.current) return;
    const printContent = receiptRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "height=800,width=800");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Shartnoma №${requestReceipt.id}</title>
            <style>
              body { font-family: 'Times New Roman', Times, serif; margin: 2cm; font-size: 12pt; line-height: 1.5; }
              pre { white-space: pre-wrap; word-wrap: break-word; font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; margin: 0; }
              h1, h2, h3 { text-align: center; }
              p { margin-bottom: 0.5em; text-align: justify; }
              .centered { text-align: center; }
              .bold { font-weight: bold; }
              .indented { margin-left: 40px; }
              @media print { body { margin: 2cm; } @page { size: A4; margin: 2cm; } }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (e) {
          console.error("Printing failed:", e);
          toast({ title: "Xatolik", description: "Chop etish amalga oshmadi.", variant: "destructive" });
        }
      }, 500);
    } else {
      toast({
        title: "Xatolik",
        description: "Chop etish oynasini ochib bo‘lmadi. Brauzeringizda popup blokerni tekshiring.",
        variant: "destructive",
      });
    }
  };

  const updateApartmentPrice = async () => {
    if (!accessToken || !params.id || !apartment) return false;
    const newPrice = Number(formData.totalAmount);
    if (newPrice === apartment.price) return true;
    if (isNaN(newPrice) || newPrice <= 0) {
      toast({ title: "Xatolik", description: "Umumiy narx noto‘g‘ri yoki 0 dan kichik.", variant: "destructive" });
      return false;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/apartments/${params.id}/`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ price: newPrice.toString() }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Narxni yangilashda xatolik (${response.status}): ${errorData.detail || "Noma'lum xato"}`);
      }
      const updatedApartment = await response.json();
      setApartment(updatedApartment);
      toast({ title: "Muvaffaqiyat", description: "Xonadon narxi yangilandi." });
      return true;
    } catch (error) {
      console.error("Error updating apartment price:", error);
      toast({ title: "Xatolik", description: (error as Error).message || "Narxni yangilashda xatolik yuz berdi.", variant: "destructive" });
      return false;
    }
  };

  const addPayment = async (paymentId: number, amount: number) => {
    if (!accessToken || !paymentId || amount <= 0) {
      throw new Error("To'lov qo'shish uchun kerakli ma'lumotlar topilmadi yoki summa xato.");
    }
    const paymentDateToSend = paymentType === "band" && bandDate ? bandDate : paymentDate ?? new Date();
    try {
      const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/process_payment/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount: amount.toString(),
          payment_date: paymentDateToSend.toISOString().split('T')[0],
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.detail || JSON.stringify(errorData) || 'Noma\'lum xato';
        throw new Error(`To'lov qo'shishda xatolik (${response.status}): ${errorMessage}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error processing payment:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) {
      toast({ title: "Xatolik", description: "Iltimos, mijozni tanlang yoki yangi mijoz qo'shing.", variant: "destructive" });
      return;
    }
    if (!accessToken || !apartment) {
      toast({ title: "Xatolik", description: "Kerakli ma'lumotlar topilmadi (token yoki xonadon).", variant: "destructive" });
      return;
    }
    if (apartment.status !== "bosh") {
      toast({ title: "Xatolik", description: `Bu xonadon allaqachon ${apartment.status_display || apartment.status}.`, variant: "destructive" });
      return;
    }
    const initialPayment = Number(formData.initialPayment) || 0;
    const totalAmount = Number(formData.totalAmount) || 0;
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
        return;
      }
    }
    setSubmitting(true);
    try {
      const clientDetails = clients.find((c) => c.id.toString() === formData.clientId);
      if (!clientDetails) {
        throw new Error(`Tanlangan mijoz (ID: ${formData.clientId}) topilmadi.`);
      }
      const finalClientDetails = {
        ...clientDetails,
        kafil_fio: formData.kafilFio || clientDetails.kafil_fio || null,
        kafil_phone_number: formData.kafilPhone || clientDetails.kafil_phone_number || null,
        kafil_address: formData.kafilAddress || clientDetails.kafil_address || null,
      };
      if (totalAmount !== apartment.price) {
        const priceUpdated = await updateApartmentPrice();
        if (!priceUpdated) {
          setSubmitting(false);
          return;
        }
      }
      let calculatedMonthlyPayment = 0;
      if (paymentType === "muddatli") {
        calculatedMonthlyPayment = calculateMonthlyPayment();
        if (calculatedMonthlyPayment <= 0 && initialPayment < totalAmount) {
          throw new Error("Muddatli to'lov uchun oylik to'lovni hisoblashda xatolik yuz berdi yoki natija 0.");
        }
      }
      const durationMonths = paymentType === "muddatli" ? Number(formData.totalMonths) : null;
      const paymentPayload: any = {
        user: Number(formData.clientId),
        apartment: Number(params.id),
        payment_type: paymentType,
        total_amount: totalAmount.toString(),
        initial_payment: initialPayment.toString(),
        duration_months: durationMonths,
        monthly_payment: paymentType === "muddatli" ? calculatedMonthlyPayment.toFixed(2) : null,
        due_date: paymentType === "muddatli" ? Number(formData.due_date) : null,
        paid_amount: "0",
        status: "pending",
        additional_info: JSON.stringify({
          comments: formData.comments || "",
          bank_name: paymentType === 'ipoteka' ? formData.bank_name : undefined,
          discount_percentage: calculateDiscountPercentage() > 0 ? calculateDiscountPercentage() : undefined,
        }),
        reservation_deadline: paymentType === "band" && bandDate ? bandDate.toISOString().split('T')[0] : null,
        payment_date: paymentType !== "band" && paymentDate ? paymentDate.toISOString().split('T')[0] : null,
      };
      Object.keys(paymentPayload).forEach(key => {
        if (paymentPayload[key] === null || paymentPayload[key] === undefined) {
          delete paymentPayload[key];
        }
      });
      const paymentResponse = await fetch(`${API_BASE_URL}/payments/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(paymentPayload),
      });
      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.error || JSON.stringify(errorData) || 'Noma\'lum xato';
        throw new Error(`To'lov yozuvini yaratishda xatolik (${paymentResponse.status}): ${errorMessage}`);
      }
      const paymentResult = await paymentResponse.json();
      if (initialPayment > 0) {
        await addPayment(paymentResult.id, initialPayment);
      }
      if (paymentType === "band") {
        const statusResponse = await fetch(`${API_BASE_URL}/apartments/${params.id}/`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: "band" }),
        });
        if (!statusResponse.ok) {
          const errorData = await statusResponse.json().catch(() => ({}));
          const errorMessage = errorData.detail || JSON.stringify(errorData) || 'Noma\'lum xato';
          throw new Error(`Xonadon statusini yangilashda xatolik (${statusResponse.status}): ${errorMessage}`);
        }
        const updatedApartment = await statusResponse.json();
        setApartment(updatedApartment);
      }
      const contractText = generateContractText(paymentResult.id, finalClientDetails);
      setRequestReceipt({ id: paymentResult.id, client: finalClientDetails, contractText });
      setIsReceiptModalOpen(true);
      toast({
        title: "Muvaffaqiyat!",
        description: `Xonadon №${apartment.room_number} muvaffaqiyatli ${
          paymentType === "muddatli" ? "muddatli to'lovga" :
          paymentType === "ipoteka" ? "ipoteka bilan" :
          paymentType === "naqd" ? "naqd to'lov bilan sotildi" :
          "band qilindi"
        }. To'lov ID: ${paymentResult.id}`,
      });
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Xatolik",
        description: (error as Error).message || "Band qilish jarayonida noma'lum xatolik.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="border-b">
          <div className="flex h-16 items-center px-4">
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
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

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <UserNav />
          </div>
        </div>
      </div>
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Xonadon band qilish</h2>
            <p className="text-muted-foreground">
              {apartment ? `№ ${apartment.room_number}, ${apartment.object_name || "Noma'lum obyekt"}` : "Xonadon topilmadi"}
            </p>
          </div>
          {apartment && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/apartments/${apartment.id}`)}>
              <Home className="mr-2 h-4 w-4" /> Xonadonga qaytish
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Band qilish ma'lumotlari</CardTitle>
                <CardDescription>Mijoz va to'lov ma'lumotlarini kiriting.</CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="existing">Mavjud mijoz</TabsTrigger>
                      <TabsTrigger value="new">Yangi mijoz</TabsTrigger>
                    </TabsList>
                    <TabsContent value="existing">
                      <div className="space-y-2 pt-2">
                        <Label htmlFor="clientId">Mijozni tanlang</Label>
                        <Select value={formData.clientId} onValueChange={(value) => {
                          handleSelectChange("clientId", value);
                          setFormData((prev) => ({
                            ...prev,
                            name: "", phone: "", address: "",
                            kafilFio: "", kafilPhone: "", kafilAddress: "",
                          }));
                          setShowKafil(false);
                        }}>
                          <SelectTrigger id="clientId">
                            <SelectValue placeholder="Ro'yxatdan mijozni tanlang..." />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.length > 0 ? (
                              clients.map((client) => (
                                <SelectItem key={client.id} value={client.id.toString()}>
                                  {client.fio} ({client.phone_number})
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-clients" disabled>Mijozlar topilmadi</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Agar mijoz ro'yxatda bo'lmasa, "Yangi mijoz" yorlig'iga o'ting.
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value="new">
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="name">F.I.O. <span className="text-red-500">*</span></Label>
                            <Input
                              id="name" name="name" placeholder="To'liq ism sharifi"
                              value={formData.name} onChange={(e) => {
                                handleChange(e);
                                handleSelectChange("clientId", "");
                              }}
                              disabled={isAddingClient} required={activeTab === 'new'}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Telefon raqami <span className="text-red-500">*</span></Label>
                            <Input
                              id="phone" name="phone" placeholder="+998 XX XXX XX XX"
                              value={formData.phone} onChange={(e) => {
                                handleChange(e);
                                handleSelectChange("clientId", "");
                              }}
                              disabled={isAddingClient} required={activeTab === 'new'}
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="address">Yashash manzili</Label>
                            <Input
                              id="address" name="address" placeholder="Viloyat, shahar, ko'cha, uy"
                              value={formData.address} onChange={(e) => {
                                handleChange(e);
                                handleSelectChange("clientId", "");
                              }}
                              disabled={isAddingClient}
                            />
                          </div>
                        </div>
                        <div className="pt-4">
                          {!showKafil ? (
                            <Button
                              variant="outline" type="button"
                              onClick={() => {
                                setShowKafil(true);
                                handleSelectChange("clientId", "");
                              }}
                              className="w-full" disabled={isAddingClient}
                            >
                              <Plus className="mr-2 h-4 w-4" /> Kafil ma'lumotlarini qo'shish
                            </Button>
                          ) : (
                            <div className="space-y-4 rounded-md border p-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">Kafil ma'lumotlari</h4>
                                <Button
                                  variant="ghost" size="sm" type="button"
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
                                    id="kafilFio" name="kafilFio" placeholder="Kafilning to'liq ismi"
                                    value={formData.kafilFio} onChange={handleChange} disabled={isAddingClient}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="kafilPhone">Kafil telefon raqami</Label>
                                  <Input
                                    id="kafilPhone" name="kafilPhone" placeholder="+998 XX XXX XX XX"
                                    value={formData.kafilPhone} onChange={handleChange} disabled={isAddingClient}
                                  />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                  <Label htmlFor="kafilAddress">Kafil manzili</Label>
                                  <Input
                                    id="kafilAddress" name="kafilAddress" placeholder="Kafilning yashash manzili"
                                    value={formData.kafilAddress} onChange={handleChange} disabled={isAddingClient}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          type="button" onClick={handleAddClient}
                          disabled={isAddingClient || !formData.name || !formData.phone}
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
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="text-lg font-semibold">To'lov ma'lumotlari</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="paymentType">To'lov turi</Label>
                        <Select value={paymentType} onValueChange={(value) => {
                          setPaymentType(value);
                          setFormData((prev) => ({
                            ...prev,
                            initialPayment: "",
                            totalMonths: "",
                            due_date: paymentType === "muddatli" ? prev.due_date : "",
                            bank_name: "",
                          }));
                          setBandDate(null);
                          setPaymentDate(null);
                        }}>
                          <SelectTrigger id="paymentType">
                            <SelectValue placeholder="To'lov turini tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="naqd">Naqd pul</SelectItem>
                            <SelectItem value="band">Band qilish</SelectItem>
                            <SelectItem value="muddatli">Muddatli to'lov</SelectItem>
                            <SelectItem value="ipoteka">Ipoteka & Subsidya</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="totalAmount">Umumiy narx ($)</Label>
                        <Input
                          id="totalAmount" name="totalAmount" type="number"
                          placeholder="Umumiy narxni kiriting" value={formData.totalAmount}
                          onChange={handleChange} min="0" required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="initialPayment">
                          {paymentType === "band" ? "Band qilish summasi ($)" :
                           paymentType === "naqd" ? "To'liq to'lov ($)" : "Boshlang'ich to'lov ($)"}
                        </Label>
                        <Input
                          id="initialPayment" name="initialPayment" type="number"
                          placeholder={paymentType === "band" ? "Band qilish summasini kiriting" :
                                       paymentType === "naqd" ? "To'liq to'lov summasini kiriting" : "Boshlang'ich to'lovni kiriting"}
                          value={formData.initialPayment} onChange={handleChange} min="0" required
                        />
                      </div>
                      {paymentType === "muddatli" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="totalMonths">To'lov muddati (oy)</Label>
                            <Input
                              id="totalMonths" name="totalMonths" type="number"
                              placeholder="Oylar sonini kiriting" value={formData.totalMonths}
                              onChange={handleChange} min="1" required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="due_date">Har oyning to'lov sanasi</Label>
                            <Input
                              id="due_date" name="due_date" type="number"
                              placeholder="1-31 orasida sana kiriting" value={formData.due_date}
                              onChange={handleChange} min="1" max="31" required
                            />
                          </div>
                        </>
                      )}
                      {paymentType === "ipoteka" && (
                        <div className="space-y-2">
                          <Label htmlFor="bank_name">Bank nomi</Label>
                          <Input
                            id="bank_name" name="bank_name" placeholder="Bank nomini kiriting"
                            value={formData.bank_name} onChange={handleChange}
                          />
                        </div>
                      )}
                      {paymentType === "band" && (
                        <div className="space-y-2">
                          <Label>Band qilish sanasi</Label>
                          <div className="relative">
                            <DatePicker
                              selected={bandDate} onChange={(date: Date | null) => setBandDate(date)}
                              dateFormat="dd.MM.yyyy" placeholderText="Sanani tanlang"
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                              required
                            />
                          </div>
                        </div>
                      )}
                      {(paymentType === "naqd" || paymentType === "muddatli" || paymentType === "ipoteka") && (
                        <div className="space-y-2">
                          <Label>{paymentType === "naqd" ? "To'lov sanasi" : "Boshlang'ich to'lov sanasi"}</Label>
                          <div className="relative">
                            <DatePicker
                              selected={paymentDate} onChange={(date: Date | null) => setPaymentDate(date)}
                              dateFormat="dd.MM.yyyy" placeholderText="Sanani tanlang"
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                              required
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comments">Izohlar (ixtiyoriy)</Label>
                      <Textarea
                        id="comments" name="comments" placeholder="Qo'shimcha izohlar..."
                        value={formData.comments} onChange={handleChange} rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
                  <div className="flex flex-col w-full sm:w-auto">
                    <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {paymentType === "band" ? "Band qilish" :
                       paymentType === "naqd" ? "Sotish (Naqd)" :
                       paymentType === "muddatli" ? "Sotish (Muddatli)" : "Sotish (Ipoteka & Subsidya)"}
                    </Button>
                    {calculateDiscountPercentage() > 0 && (
                      <p className="mt-2 text-sm text-red-600">
                        Chegirma: {calculateDiscountPercentage()}%
                      </p>
                    )}
                  </div>
                  <Button variant="outline" type="button" onClick={() => router.back()} className="w-full sm:w-auto">
                    Bekor qilish
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Xonadon haqida</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Obyekt:</strong> {apartment?.object_name || "Noma'lum"}</p>
                <p><strong>Xona raqami:</strong> {apartment?.room_number || "N/A"}</p>
                <p><strong>Xonalar soni:</strong> {apartment?.rooms || "N/A"}</p>
                <p><strong>Qavat:</strong> {apartment?.floor || "N/A"}</p>
                <p><strong>Maydon:</strong> {apartment?.area || "N/A"} kv.m</p>
                <p><strong>Status:</strong> {apartment?.status_display || apartment?.status || "N/A"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>To'lov xulosasi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Umumiy narx:</strong> {formatCurrency(formData.totalAmount || apartment?.price || 0)}</p>
                <p>
                  <strong>
                    {paymentType === "band" ? "Band qilish summasi:" :
                     paymentType === "naqd" ? "To'liq to'lov:" : "Boshlang'ich to'lov:"}
                  </strong> {formatCurrency(formData.initialPayment || 0)}
                </p>
                {paymentType === "muddatli" && (
                  <>
                    <p><strong>Qolgan foiz:</strong> {calculateRemainingPercentage()}%</p>
                    <p><strong>Oylik to'lov:</strong> {formatCurrency(calculateMonthlyPayment())}</p>
                    <p><strong>Muddat:</strong> {formData.totalMonths || "0"} oy</p>
                    <p><strong>Har oyning to'lov sanasi:</strong> {formData.due_date || "N/A"}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      {isReceiptModalOpen && requestReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Shartnoma №{requestReceipt.id}</h3>
            <div ref={receiptRef}>
              <pre className="text-sm whitespace-pre-wrap">{requestReceipt.contractText}</pre>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <Button onClick={handlePrintContract}>
                <Printer className="mr-2 h-4 w-4" /> Chop etish
              </Button>
              <Button onClick={() => handleDownloadContractWord(requestReceipt.id, requestReceipt.client)}>
                Yuklab olish
              </Button>
              <Button variant="outline" onClick={() => {
                setIsReceiptModalOpen(false);
                router.push(`/apartments/${params.id}`);
              }}>
                Yopish
              </Button>
            </div>
          </div>
        </div>
      )}
      <footer className="border-t py-4 px-4 text-center text-sm text-muted-foreground">
        Barcha huquqlar ximoyalangan | Ushbu Dastur CDCGroup tomonidan yaratilgan | CraDev Company tomonidan qo'llab quvvatlanadi | since 2019
      </footer>
    </div>
  );
}