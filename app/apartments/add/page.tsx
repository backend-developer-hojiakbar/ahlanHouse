"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { Textarea } from "@/components/ui/textarea";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const TELEGRAM_BOT_TOKEN = "7165051905:AAFS-lG2LDq5OjFdAwTzrpbHYnrkup6y13s";
const TELEGRAM_CHAT_ID = "1728300"; // Sizning Chat ID'ingiz kiritildi


// Valyutani formatlash uchun yordamchi funksiya
const formatCurrency = (amount: number | string) => {
  if (amount == null || isNaN(Number(amount))) return "-";
  return Number(amount).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 }).replace('$', '') + ' $';
};

export default function AddApartmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyIdParam = searchParams.get("propertyId");

  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    object: propertyIdParam || "",
    room_number: "",
    floor: "",
    rooms: "",
    area: "",
    price: "",
    description: "",
    status: "bosh",
  });
  const [isPriceManual, setIsPriceManual] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const sendTelegramNotification = useCallback(async (message: string) => {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML'
        })
      });
    } catch (error) {
      console.error("Telegram xabarnomasini yuborishda xatolik:", error);
    }
  }, []);

  useEffect(() => {
    const fetchAllProperties = async () => {
      if (!token) {
        toast({ title: "Xatolik", description: "Foydalanuvchi autentifikatsiyadan o‘tmagan", variant: "destructive" });
        router.push("/login");
        return;
      }

      try {
        let allProperties: any[] = [];
        let nextUrl: string | null = "http://api.ahlan.uz/objects/?page_size=1000";

        while (nextUrl) {
          const response = await fetch(nextUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) throw new Error("Obyektlarni yuklashda xatolik");
          const data = await response.json();
          allProperties = [...allProperties, ...(data.results || data)];
          nextUrl = data.next;
        }
        setProperties(allProperties);
      } catch (error) {
        toast({ title: "Xatolik", description: (error as Error).message, variant: "destructive" });
      }
    };

    if (token) {
      fetchAllProperties();
    }
  }, [token, router]);

  useEffect(() => {
    if (formData.area && !isPriceManual) {
      const calculatedPrice = (parseFloat(formData.area) * 550).toFixed(2);
      setFormData((prev) => ({ ...prev, price: calculatedPrice }));
    }
  }, [formData.area, isPriceManual]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "price") setIsPriceManual(true);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      object: Number(formData.object),
      room_number: Number(formData.room_number),
      rooms: Number(formData.rooms),
      area: Number(formData.area),
      floor: Number(formData.floor),
      price: Number(formData.price),
      status: formData.status,
      description: formData.description || "",
    };

    try {
      const response = await fetch("http://api.ahlan.uz/apartments/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Xonadon qo'shishda xatolik yuz berdi");
      }

      // --- TELEGRAM NOTIFICATION LOGIC ---
      const currentUserFio = localStorage.getItem("user_fio") || "Noma'lum foydalanuvchi";
      const objectName = properties.find(p => p.id.toString() === formData.object)?.name || "Noma'lum obyekt";

      const message = `<b>✅🏢 Yangi Xonadon Qo'shildi</b>\n\n` +
                      `<b>Kim tomonidan:</b> ${currentUserFio}\n` +
                      `<b>Obyekt:</b> ${objectName}\n\n` +
                      `<b>Xonadon raqami:</b> ${payload.room_number}\n` +
                      `<b>Xonalar soni:</b> ${payload.rooms}\n` +
                      `<b>Maydoni:</b> ${payload.area} m²\n` +
                      `<b>Qavat:</b> ${payload.floor}\n` +
                      `<b>Narxi:</b> ${formatCurrency(payload.price)}\n` +
                      `<b>Tavsif:</b> ${payload.description || "Kiritilmagan"}`;
      
      await sendTelegramNotification(message);
      // --- END OF TELEGRAM LOGIC ---

      setLoading(false);
      toast({
        title: "Xonadon qo'shildi",
        description: "Yangi xonadon muvaffaqiyatli qo'shildi",
      });
      router.push("/apartments");
    } catch (error) {
      setLoading(false);
      toast({
        title: "Xatolik",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

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
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Yangi xonadon qo'shish</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Xonadon ma'lumotlari</CardTitle>
            <CardDescription>Yangi xonadon haqida asosiy ma'lumotlarni kiriting</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="object">Obyekt</Label>
                  <Select
                    value={formData.object}
                    onValueChange={(value) => handleSelectChange("object", value)}
                    required
                  >
                    <SelectTrigger id="object">
                      <SelectValue placeholder="Obyektni tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id.toString()}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room_number">Xonadon raqami</Label>
                  <Input
                    id="room_number"
                    name="room_number"
                    type="text"
                    placeholder="Masalan: 101"
                    value={formData.room_number}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor">Qavat</Label>
                  <Input
                    id="floor"
                    name="floor"
                    type="number"
                    placeholder="Masalan: 10"
                    value={formData.floor}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rooms">Xonalar soni</Label>
                  <Input
                    id="rooms"
                    name="rooms"
                    type="number"
                    placeholder="Masalan: 3"
                    value={formData.rooms}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">Maydon (m²)</Label>
                  <Input
                    id="area"
                    name="area"
                    type="number"
                    step="0.01"
                    placeholder="Masalan: 75.5"
                    value={formData.area}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Narx ($)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    placeholder="Avtomatik hisoblanadi yoki qo‘lda kiriting"
                    value={formData.price}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Tavsif</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Xonadon haqida qo'shimcha ma'lumot"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={() => router.push("/apartments")}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
      <footer className="border-t py-4 px-4 text-center text-sm text-muted-foreground mt-auto">
                Version 1.0 | Barcha huquqlar ximoyalangan | Ushbu Dastur CDCGroup tomonidan yaratilgan | CraDev Company tomonidan qo'llab quvvatlanadi | since 2019
      </footer>
    </div>
  );
}