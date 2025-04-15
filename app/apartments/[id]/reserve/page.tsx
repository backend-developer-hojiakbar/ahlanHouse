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
  });

  const API_BASE_URL = "http://api.ahlan.uz";
  const PAGE_SIZE = 100;

  const getAuthHeaders = () => ({
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  });

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
        totalAmount: apartmentData.price.toString(),
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

  useEffect(() => {
    if (apartment) {
      setFormData((prev) => ({
        ...prev,
        totalAmount: apartment.price.toString(),
        due_date: prev.due_date || "15",
      }));
    }
  }, [apartment]);

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
        if (
          errorData.phone_number &&
          errorData.phone_number.includes("already exists")
        ) {
          errorMessage = "Bu telefon raqami allaqachon ro'yxatdan o'tgan.";
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
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
    if (
      !formData.initialPayment ||
      !formData.totalMonths ||
      Number(formData.totalMonths) <= 0
    )
      return 0;
    const principal = Math.max(
      0,
      Number(formData.totalAmount) - Number(formData.initialPayment)
    );
    const months = Number(formData.totalMonths);
    const monthlyPayment = principal / months;
    if (monthlyPayment > Number.MAX_SAFE_INTEGER) {
      throw new Error("Hisoblangan oylik to'lov juda katta.");
    }
    return monthlyPayment;
  };

  const calculateRemainingPercentage = () => {
    if (!apartment || !formData.initialPayment) return 0;
    const initialPayment = Number(formData.initialPayment) || 0;
    const totalPrice = Number(formData.totalAmount) || apartment.price || 0;
    if (totalPrice <= 0) return 0;
    const remainingAmount = totalPrice - initialPayment;
    return ((remainingAmount / totalPrice) * 100).toFixed(1);
  };

  const generatePaymentSchedule = () => {
    if (paymentType !== "muddatli" || !formData.totalMonths || !formData.due_date) return "";
    const totalMonths = Number(formData.totalMonths);
    const dueDate = Number(formData.due_date);
    const monthlyPayment = calculateMonthlyPayment();
    const schedule: string[] = [];
    const currentDate = new Date();

    for (let i = 1; i <= totalMonths; i++) {
      const paymentDate = new Date(currentDate);
      paymentDate.setMonth(currentDate.getMonth() + i);
      paymentDate.setDate(dueDate);

      const lastDayOfMonth = new Date(
        paymentDate.getFullYear(),
        paymentDate.getMonth() + 1,
        0
      ).getDate();
      if (dueDate > lastDayOfMonth) {
        paymentDate.setDate(lastDayOfMonth);
      }

      const formattedDate = paymentDate.toLocaleDateString("us-US", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const formattedPayment = monthlyPayment.toLocaleString("us-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      schedule.push(`   - ${i}-oy: ${formattedDate} - ${formattedPayment} so'm`);
    }

    return schedule.join("\n");
  };

  const generateContractText = (paymentId: number, client: any) => {
    const currentDate = new Date().toLocaleDateString("us-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const priceInWords = (price: number): string =>
      Number(price || 0).toLocaleString("us-US");
    if (!apartment) return "Xonadon ma'lumotlari topilmadi.";

    const finalPrice = Number(formData.totalAmount) || apartment.price;
    const formattedPrice = finalPrice.toLocaleString("us-US");
    const priceWords = priceInWords(finalPrice);
    const initialPaymentFormatted = Number(
      formData.initialPayment || 0
    ).toLocaleString("us-US");
    let monthlyPaymentFormatted = "0";
    try {
      monthlyPaymentFormatted = calculateMonthlyPayment().toLocaleString(
        "us-US",
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      );
    } catch (e) {
      monthlyPaymentFormatted = "Hisoblashda xato";
    }
    const endDate = new Date();
    if (paymentType === "muddatli" && formData.totalMonths) {
      endDate.setMonth(endDate.getMonth() + Number(formData.totalMonths));
    }
    const endDateString = endDate.toLocaleDateString("us-US");

    const paymentSchedule = generatePaymentSchedule();

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
        ? `тўлиқ тўловни (${initialPaymentFormatted} сўм) дарҳол`
        : paymentType === "band"
          ? `band qilish uchun ${initialPaymentFormatted} сўм`
          : paymentType === "muddatli"
            ? `${formData.totalMonths} ой давомида (${endDateString} гача)`
            : paymentType === "ipoteka"
              ? `ipoteka shartlariga ko‘ra ${initialPaymentFormatted} сўм`
              : "тўлов шартларига мувофиқ"
      }
   банкдаги ҳисоб-варағига хонадон умумий қийматини, яъни
   ${formattedPrice} (${priceWords}) сўм миқдорида пул маблағини
   ўтказади.
${paymentType === "muddatli"
        ? `   - Бошланғич тўлов: ${initialPaymentFormatted} so'm (${currentDate}).
   - Ойлик тўлов: ${monthlyPaymentFormatted} so'm (har oyning ${formData.due_date || 15}-sanasigacha).
   - To'lov jadvali:
${paymentSchedule}`
        : paymentType === "band"
          ? `   - Band qilish uchun to'lov: ${initialPaymentFormatted} so'm (${currentDate}).`
          : paymentType === "ipoteka"
            ? `   - Boshlang‘ich to‘lov: ${initialPaymentFormatted} so'm (${currentDate}).`
            : ""
      }

                    IV. ШАРТНОМАНИНГ АМАЛ ҚИЛИШИ

4.1. Мазкур шартнома Томонлар уни имзолаган кундан бошлаб амалга киради
     ва асосий шартнома тузилгунга қадар амалда бўлади.
4.2. Бажарувчининг ташаббуси билан мазкур шартнома қуйидаги холларда
     бекор қилиниши мумкин:
     - «Буюртмачи» томонидан мазкур шартнома тузилгандан кейин
       ${paymentType === "naqd"
        ? "тўлиқ тўловни"
        : paymentType === "band"
          ? "band qilish to‘lovini"
          : paymentType === "muddatli"
            ? `${endDateString} гача бўлган муддатда белгиланган тўловларни`
            : paymentType === "ipoteka"
              ? "ipoteka shartlariga ko‘ra belgilangan to‘lovlarni"
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
    const contractText = generateContractText(paymentId, client);
    const lines = contractText.split("\n");
    const formatParagraph = (line: string) => {
      const commonProps = { size: 24, font: "Times New Roman" };
      if (line.startsWith("ДАСТЛАБКИ ШАРТНОМА №")) {
        return new Paragraph({
          children: [
            new TextRun({
              text: line,
              bold: true,
              size: 28,
              font: commonProps.font,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        });
      } else if (line.match(/^(I|II|III|IV|V|VI)\./)) {
        return new Paragraph({
          children: [new TextRun({ text: line, bold: true, ...commonProps })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 150 },
        });
      } else if (
        line.match(/^\d+\)/) ||
        line.match(/^[а-я]\)/) ||
        line.trim().startsWith("-")
      ) {
        return new Paragraph({
          children: [new TextRun({ text: line, ...commonProps })],
          indent: { left: 720 },
          spacing: { after: 100 },
        });
      } else if (
        line.trim().startsWith("Бажарувчи:") ||
        line.trim().startsWith("Буюртмачи:")
      ) {
        const parts = line.split(/:\s*/);
        return new Paragraph({
          children: [
            new TextRun({ text: `${parts[0]}:`, bold: true, ...commonProps }),
            ...(parts[1]
              ? [
                  new TextRun({
                    text: `\t${parts[1]}`,
                    bold: true,
                    ...commonProps,
                  }),
                ]
              : []),
          ],
          spacing: { before: 300, after: 100 },
          tabStops: [{ type: docx.TabStopType.LEFT, position: 4320 }],
        });
      } else if (
        line.includes(":") &&
        (line.includes("СТИР:") ||
          line.includes("Телефон:") ||
          line.includes("Х/р:") ||
          line.includes("МФО:") ||
          line.includes("Манзил:") ||
          line.includes("Кафил:"))
      ) {
        const [key, value] = line.split(/:(.+)/);
        return new Paragraph({
          children: [
            new TextRun({ text: `${key?.trim()}:`, ...commonProps }),
            new TextRun({ text: `\t${value?.trim() || ""}`, ...commonProps }),
          ],
          indent: { left: line.trim().startsWith("Кафил") ? 720 : 0 },
          spacing: { after: 50 },
          tabStops: [{ type: docx.TabStopType.LEFT, position: 2160 }],
        });
      } else if (line.trim() === "") {
        return new Paragraph({ children: [], spacing: { after: 100 } });
      } else {
        return new Paragraph({
          children: [new TextRun({ text: line, ...commonProps })],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 100 },
        });
      }
    };

    const doc = new Document({
      creator: "Ahlan House System",
      title: `Shartnoma №${paymentId}`,
      description: `Xonadon band qilish shartnomasi ${client.fio} uchun`,
      sections: [
        {
          properties: {
            page: { margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 } },
          },
          children: lines.map(formatParagraph),
        },
      ],
      styles: {
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
          {
            id: "CenteredTitle",
            name: "Centered Title",
            basedOn: "Normal",
            run: { bold: true, size: 28 },
            paragraph: {
              alignment: AlignmentType.CENTER,
              spacing: { after: 240 },
            },
          },
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            run: { bold: true },
            paragraph: {
              alignment: AlignmentType.LEFT,
              spacing: { before: 360, after: 180 },
            },
          },
          {
            id: "ListItem",
            name: "List Item",
            basedOn: "Normal",
            paragraph: {
              alignment: AlignmentType.LEFT,
              indent: { left: 720 },
              spacing: { after: 100 },
            },
          },
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
    const printWindow = window.open("", "_blank", "height=600,width=800");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Shartnoma №${requestReceipt.id}</title>
            <style>
              body { font-family: 'Times New Roman', Times, serif; margin: 30px; font-size: 12pt; line-height: 1.5; }
              pre { white-space: pre-wrap; word-wrap: break-word; font-family: 'Times New Roman', Times, serif; font-size: 12pt; }
              h1, h2, h3 { text-align: center; }
              @page { size: A4; margin: 2cm; }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 250);
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
    if (!accessToken || !params.id) return;
    const newPrice = Number(formData.totalAmount);
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
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ price: newPrice }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Narxni yangilashda xatolik (${response.status}): ${
            errorData.detail || "Noma'lum xato"
          }`
        );
      }

      setApartment((prev: any) => ({ ...prev, price: newPrice }));
      setFormData((prev) => ({ ...prev, totalAmount: newPrice.toString() }));
      toast({
        title: "Muvaffaqiyat",
        description: "Xonadon narxi yangilandi.",
      });
      return true;
    } catch (error) {
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
    if (!accessToken || !paymentId) {
      throw new Error("To'lov qo'shish uchun kerakli ma'lumotlar topilmadi.");
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/payments/${paymentId}/process_payment/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ amount }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `To'lov qo'shishda xatolik (${response.status}): ${
            errorData.error || "Noma'lum xato"
          }`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId) {
      toast({
        title: "Xatolik",
        description: "Iltimos, mijozni tanlang yoki yangi mijoz qo'shing.",
        variant: "destructive",
      });
      return;
    }

    if (!accessToken || !apartment) {
      toast({
        title: "Xatolik",
        description: "Kerakli ma'lumotlar topilmadi (token yoki xonadon).",
        variant: "destructive",
      });
      return;
    }

    if (apartment.status !== "bosh") {
      toast({
        title: "Xatolik",
        description: `Bu xonadon allaqachon ${
          apartment.status === "band"
            ? "band qilingan"
            : apartment.status === "muddatli"
            ? "muddatli to'lovda"
            : "sotilgan"
        }.`,
        variant: "destructive",
      });
      return;
    }

    const initialPayment = Number(formData.initialPayment) || 0;
    const totalAmount = Number(formData.totalAmount) || apartment.price;

    if (initialPayment <= 0) {
      toast({
        title: "Xatolik",
        description: `${
          paymentType === "naqd"
            ? "Naqd to'lov"
            : paymentType === "band"
            ? "Band qilish"
            : paymentType === "ipoteka"
            ? "Ipoteka"
            : "Muddatli to'lov"
        } uchun summa kiritilmagan yoki 0 dan kichik.`,
        variant: "destructive",
      });
      return;
    }

    if (paymentType === "muddatli") {
      if (!formData.totalMonths || Number(formData.totalMonths) <= 0) {
        toast({
          title: "Xatolik",
          description:
            "Muddatli to'lov uchun to'lov muddati tanlanmagan yoki 0 dan kichik.",
          variant: "destructive",
        });
        return;
      }
      if (!totalAmount || totalAmount <= 0) {
        toast({
          title: "Xatolik",
          description: "Umumiy narx kiritilmagan yoki 0 dan kichik.",
          variant: "destructive",
        });
        return;
      }
      if (
        !formData.due_date ||
        Number(formData.due_date) < 1 ||
        Number(formData.due_date) > 31
      ) {
        toast({
          title: "Xatolik",
          description: "Har oyning to‘lov sanasi 1 dan 31 gacha bo‘lishi kerak.",
          variant: "destructive",
        });
        return;
      }
    }

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
      const finalClientDetails = {
        ...clientDetails,
        kafil_fio: formData.kafilFio || clientDetails.kafil_fio || null,
        kafil_phone_number:
          formData.kafilPhone || clientDetails.kafil_phone_number || null,
      };

      // Update apartment price if it has changed
      if (totalAmount !== apartment.price) {
        const priceUpdated = await updateApartmentPrice();
        if (!priceUpdated) {
          throw new Error("Narxni yangilashda xatolik yuz berdi.");
        }
      }

      let calculatedMonthlyPayment = 0;
      if (paymentType === "muddatli") {
        calculatedMonthlyPayment = calculateMonthlyPayment();
        if (calculatedMonthlyPayment <= 0) {
          throw new Error(
            "Muddatli to'lov uchun oylik to'lovni hisoblashda xatolik yuz berdi."
          );
        }
      }

      const durationMonths =
        paymentType === "muddatli" ? Number(formData.totalMonths) : 0;

      const paymentPayload = {
        user: Number(formData.clientId),
        apartment: Number(params.id),
        payment_type: paymentType,
        total_amount: totalAmount.toString(),
        initial_payment: initialPayment.toString(),
        interest_rate: 0,
        duration_months: durationMonths,
        monthly_payment:
          paymentType === "muddatli" ? calculatedMonthlyPayment.toFixed(2) : "0",
        due_date: Number(formData.due_date) || 15,
        paid_amount: "0",
        status: "pending",
        additional_info: formData.comments || "",
        reservation_deadline:
          paymentType === "band"
            ? new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
              ).toISOString()
            : null,
      };

      const paymentResponse = await fetch(`${API_BASE_URL}/payments/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(paymentPayload),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json().catch(() => ({}));
        throw new Error(
          errorData.detail ||
            `To'lovni yaratishda xatolik (${paymentResponse.status}): ${JSON.stringify(errorData)}`
        );
      }

      const paymentResult = await paymentResponse.json();

      // Boshlang'ich to'lovni qayta ishlash
      await addPayment(paymentResult.id, initialPayment);

      const contractText = generateContractText(
        paymentResult.id,
        finalClientDetails
      );
      setRequestReceipt({
        id: paymentResult.id,
        client: finalClientDetails,
        contractText,
      });
      setIsReceiptModalOpen(true);

      toast({
        title: "Muvaffaqiyat!",
        description: `Xonadon №${apartment.room_number} ${
          paymentType === "muddatli"
            ? "muddatli to'lovga band qilindi"
            : paymentType === "ipoteka"
            ? "ipoteka bilan band qilindi"
            : paymentType === "naqd"
            ? "naqd to'lov bilan sotildi"
            : "band qilindi"
        }. To'lov ID: ${paymentResult.id}`,
      });

      router.push(`/apartments/${params.id}`);
    } catch (error) {
      toast({
        title: "Xatolik",
        description:
          (error as Error).message || "Band qilishda noma'lum xatolik.",
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
              <Search />
              <UserNav />
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Ma'lumotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav />
          </div>
        </div>
      </div>

      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Xonadon band qilish
            </h2>
            <p className="text-muted-foreground">
              {apartment
                ? `№ ${apartment.room_number}, ${apartment.object_name || "Noma'lum obyekt"}`
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="space-y-4"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="existing">Mavjud mijoz</TabsTrigger>
                      <TabsTrigger value="new">Yangi mijoz</TabsTrigger>
                    </TabsList>
                    <TabsContent value="existing">
                      <div className="space-y-2 pt-2">
                        <Label htmlFor="clientId">Mijozni tanlang</Label>
                        <Select
                          value={formData.clientId}
                          onValueChange={(value) => {
                            handleSelectChange("clientId", value);
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
                          Agar mijoz ro'yxatda bo'lmasa, "Yangi mijoz" yorlig'iga
                          o'ting.
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value="new">
                      <div className="space-y-4 pt-2">
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
                                handleSelectChange("clientId", "");
                              }}
                              disabled={isAddingClient}
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
                            />
                          </div>
                          <div className="space-y-2">
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
                        <div className="pt-4">
                          {!showKafil ? (
                            <Button
                              variant="outline"
                              type="button"
                              onClick={() => {
                                setShowKafil(true);
                                handleSelectChange("clientId", "");
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
                                      kafilFio: "",
                                      kafilPhone: "",
                                      kafilAddress: "",
                                    }));
                                  }}
                                  className="text-xs text-red-600 hover:bg-red-50"
                                  disabled={isAddingClient}
                                >
                                  Olib tashlash
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label htmlFor="kafilFio">Kafil F.I.O.</Label>
                                  <Input
                                    id="kafilFio"
                                    name="kafilFio"
                                    placeholder="Kafilning to'liq ismi"
                                    value={formData.kafilFio}
                                    onChange={handleChange}
                                    disabled={isAddingClient}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="kafilPhone">
                                    Kafil telefon raqami
                                  </Label>
                                  <Input
                                    id="kafilPhone"
                                    name="kafilPhone"
                                    placeholder="+998 XX XXX XX XX"
                                    value={formData.kafilPhone}
                                    onChange={handleChange}
                                    disabled={isAddingClient}
                                  />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                  <Label htmlFor="kafilAddress">
                                    Kafil manzili
                                  </Label>
                                  <Input
                                    id="kafilAddress"
                                    name="kafilAddress"
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
                        <Button
                          type="button"
                          onClick={handleAddClient}
                          disabled={isAddingClient}
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
                    <h3 className="text-lg font-semibold">To'lov shartlari</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="paymentType">To'lov turi</Label>
                        <Select
                          value={paymentType}
                          onValueChange={(value) => {
                            setPaymentType(value);
                            setFormData((prev) => ({
                              ...prev,
                              totalMonths: "",
                              totalAmount: apartment?.price?.toString() || prev.totalAmount,
                              due_date: value === "muddatli" ? "15" : "",
                            }));
                          }}
                        >
                          <SelectTrigger id="paymentType">
                            <SelectValue placeholder="To'lov turini tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="naqd">Naqd pul</SelectItem>
                            <SelectItem value="muddatli">
                              Muddatli to‘lov
                            </SelectItem>
                            <SelectItem value="ipoteka">Ipoteka</SelectItem>
                            <SelectItem value="band">Band qilish</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="totalAmount">
                          Umumiy narx (so'm){" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="totalAmount"
                          name="totalAmount"
                          type="number"
                          min="0"
                          value={formData.totalAmount}
                          onChange={handleChange}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Joriy narx: {apartment?.price.toLocaleString("uz-UZ")} so'm
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="initialPayment">
                          {paymentType === "muddatli"
                            ? "Boshlang'ich to'lov"
                            : paymentType === "ipoteka"
                            ? "Boshlang'ich to'lov"
                            : paymentType === "naqd"
                            ? "To'liq summa"
                            : "Band qilish summasi"}{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="initialPayment"
                          name="initialPayment"
                          type="number"
                          min="0"
                          max={
                            paymentType === "muddatli" || paymentType === "ipoteka"
                              ? formData.totalAmount
                              : paymentType === "naqd"
                              ? formData.totalAmount
                              : undefined
                          }
                          value={formData.initialPayment}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      {paymentType === "muddatli" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="totalMonths">
                              To'lov muddati (oy){" "}
                              <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="totalMonths"
                              name="totalMonths"
                              type="number"
                              min="1"
                              value={formData.totalMonths}
                              onChange={handleChange}
                              placeholder="Masalan, 12"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="due_date">
                              Har oyning to‘lov sanasi{" "}
                              <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="due_date"
                              name="due_date"
                              type="number"
                              min="1"
                              max="31"
                              value={formData.due_date}
                              onChange={handleChange}
                              placeholder="Masalan, 15"
                              required
                            />
                            <p className="text-xs text-muted-foreground">
                              Har oyning qaysi kunida to‘lov qilish kerakligini kiriting (1-31).
                            </p>
                          </div>
                        </>
                      )}
                      {paymentType === "ipoteka" && (
                        <div className="space-y-2">
                          <Label htmlFor="bank_name">Bank nomi</Label>
                          <Input
                            id="bank_name"
                            name="bank_name"
                            value={formData.bank_name || ""}
                            onChange={handleChange}
                            placeholder="Masalan, Ipoteka Bank"
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comments">Izohlar</Label>
                      <Textarea
                        id="comments"
                        name="comments"
                        placeholder="Shartnoma yoki to'lovga oid qo'shimcha izohlar..."
                        value={formData.comments}
                        onChange={handleChange}
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-3 border-t px-6 py-4">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => router.back()}
                    disabled={submitting || isAddingClient}
                  >
                    Bekor qilish
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      submitting ||
                      isAddingClient ||
                      loading ||
                      !formData.clientId
                    }
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {submitting
                      ? "Band qilinmoqda..."
                      : "Band qilish va Shartnoma"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            {apartment && (
              <Card>
                <CardHeader>
                  <CardTitle>Xonadon haqida</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Obyekt:</span>
                    <span className="font-medium text-right">
                      {apartment.object_name || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Xonadon №:</span>
                    <span className="font-medium">
                      {apartment.room_number || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Qavat:</span>
                    <span className="font-medium">{apartment.floor || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Xonalar:</span>
                    <span className="font-medium">{apartment.rooms || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Maydon:</span>
                    <span className="font-medium">
                      {apartment.area || "-"} m²
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Narx:</span>
                    <span className="font-bold text-lg text-primary">
                      {Number(apartment.price).toLocaleString("uz-UZ", {
                        style: "currency",
                        currency: "UZS",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Holati:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        apartment.status === "bosh"
                          ? "bg-green-100 text-green-800"
                          : apartment.status === "band"
                          ? "bg-yellow-100 text-yellow-800"
                          : apartment.status === "muddatli"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {apartment.status === "bosh"
                        ? "Bo'sh"
                        : apartment.status === "band"
                        ? "Band"
                        : apartment.status === "muddatli"
                        ? "Muddatli"
                        : apartment.status === "sotilgan"
                        ? "Sotilgan"
                        : "Noma'lum"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
            {paymentType === "muddatli" && (
              <Card>
                <CardHeader>
                  <CardTitle>Taxminiy to'lov jadvali</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Umumiy narx:</span>
                    <span>
                      {Number(formData.totalAmount).toLocaleString("uz-UZ", {
                        style: "currency",
                        currency: "UZS",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Boshlang'ich to'lov:</span>
                    <span>
                      {Number(formData.initialPayment || "0").toLocaleString(
                        "uz-UZ",
                        { style: "currency", currency: "UZS" }
                      )}
                      ({calculateRemainingPercentage()}% qoldi)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Qolgan summa:</span>
                    <span>
                      {(Number(formData.totalAmount) -
                        Number(formData.initialPayment || "0")).toLocaleString(
                        "uz-UZ",
                        {
                          style: "currency",
                          currency: "UZS",
                        }
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Muddat:</span>
                    <span>{formData.totalMonths || "-"} oy</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Har oyning to‘lov sanasi:</span>
                    <span>{formData.due_date || "-"}-kuni</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t">
                    <span className="font-semibold">Oylik to'lov:</span>
                    <span className="font-bold text-lg text-primary">
                      {(() => {
                        try {
                          const monthly = calculateMonthlyPayment();
                          if (
                            monthly > 0 ||
                            Number(formData.initialPayment) <
                              Number(formData.totalAmount)
                          ) {
                            return monthly.toLocaleString("uz-UZ", {
                              style: "currency",
                              currency: "UZS",
                              minimumFractionDigits: 2,
                            });
                          } else {
                            return "-";
                          }
                        } catch (e) {
                          return (
                            <span className="text-red-500 text-sm font-normal">
                              Xato
                            </span>
                          );
                        }
                      })()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {isReceiptModalOpen && requestReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-3 pt-4 px-4">
              <CardTitle className="text-lg font-semibold">
                Shartnoma №{requestReceipt.id}
              </CardTitle>
              <Button
                onClick={() => setIsReceiptModalOpen(false)}
                variant="ghost"
                size="icon"
                className="h-7 w-7"
              >
                <span className="sr-only">Yopish</span>X
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
                <pre className="whitespace-pre-wrap text-xs sm:text-sm font-serif leading-relaxed">
                  {requestReceipt.contractText}
                </pre>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end border-t px-6 py-4">
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
    </div>
  );
}