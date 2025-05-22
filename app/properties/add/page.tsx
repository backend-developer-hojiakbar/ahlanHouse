"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export default function AddPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    description: "",
    totalFloors: "",
    totalApartments: "",
    startDate: "",
    endDate: "",
    image: null as File | null,
  });

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${accessToken}`,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token) {
        router.push("/login");
        return;
      }
      setAccessToken(token);
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      toast({
        title: "Xatolik",
        description: "Tizimga kirish talab qilinadi",
        variant: "destructive",
      });
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("address", formData.address);
      formDataToSend.append("description", formData.description || "");
      formDataToSend.append("floors", formData.totalFloors);
      formDataToSend.append("total_apartments", formData.totalApartments);
      formDataToSend.append("start_date", formData.startDate);
      formDataToSend.append("end_date", formData.endDate);
      if (formData.image) {
        formDataToSend.append("image", formData.image);
      }

      console.log("Sending request to API with data:", Object.fromEntries(formDataToSend)); // Debugging uchun

      const response = await fetch("http://api.ahlan.uz/objects/", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formDataToSend,
      }).catch((err) => {
        throw new Error(`Fetch xatosi: ${err.message}`);
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API xato javobi:", errorData);
        if (response.status === 401) {
          throw new Error("Sessiya tugagan, qayta kirish kerak");
        }
        throw new Error(errorData.message || errorData.detail || `Obyekt qo'shishda xatolik (Status: ${response.status})`);
      }

      const result = await response.json();
      console.log("Muvaffaqiyatli javob:", result);

      toast({
        title: "Obyekt qo'shildi",
        description: "Yangi obyekt muvaffaqiyatli qo'shildi",
      });
      router.push("/properties");
    } catch (error) {
      console.error("Xatolik:", error);
      toast({
        title: "Xatolik",
        description: (error as Error).message || "Obyekt qo'shishda noma'lum xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          <h2 className="text-3xl font-bold tracking-tight">Yangi obyekt qo'shish</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Obyekt ma'lumotlari</CardTitle>
            <CardDescription>Yangi qurilish obyekti haqida asosiy ma'lumotlarni kiriting</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Obyekt nomi</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Masalan: Navoiy 108K"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Manzil</Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="Masalan: Navoiy ko'chasi 108K, Toshkent"
                    value={formData.address}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalFloors">Qavatlar soni</Label>
                  <Input
                    id="totalFloors"
                    name="totalFloors"
                    type="number"
                    placeholder="Masalan: 16"
                    value={formData.totalFloors}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalApartments">Xonadonlar soni</Label>
                  <Input
                    id="totalApartments"
                    name="totalApartments"
                    type="number"
                    placeholder="Masalan: 120"
                    value={formData.totalApartments}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Qurilish boshlangan sana</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Qurilish tugash sanasi</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">Obyekt rasmi</Label>
                  <Input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ixtiyoriy: Obyektning rasmini yuklang (JPG, PNG va hokazo)
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Tavsif</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Obyekt haqida qo'shimcha ma'lumot"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={() => router.push("/properties")}>
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