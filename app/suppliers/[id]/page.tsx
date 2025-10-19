"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams, useRouter } from "next/navigation";
import { User, Phone, Mail, MapPin, Building, Edit, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const API_BASE_URL = "http://api.ahlan.uz";
const TELEGRAM_BOT_TOKEN = "7165051905:AAFS-lG2LDq5OjFdAwTzrpbHYnrkup6y13s";
const TELEGRAM_CHAT_ID = "1728300"; // Sizning Chat ID'ingiz kiritildi


interface Supplier {
  id: number;
  company_name: string;
  contact_person_name: string;
  phone_number: string;
  email: string;
  address: string;
  description: string;
  balance: string;
}

interface CurrentUser {
  fio: string;
}

const SupplierDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [editFormData, setEditFormData] = useState({
    company_name: "",
    contact_person_name: "",
    phone_number: "",
    email: "",
    address: "",
    description: "",
  });

  const sendTelegramNotification = useCallback(async (message: string) => {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })
      });
    } catch (error) {
      console.error("Telegram xabarini yuborishda xatolik:", error);
    }
  }, []);

  const getAuthHeaders = useCallback(() => {
    if (!accessToken) {
      toast({ title: "Xatolik", description: "Avtorizatsiya tokeni topilmadi.", variant: "destructive" });
      router.push("/login");
      return null;
    }
    return { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` };
  }, [accessToken, router]);

  const fetchSupplier = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      if (!headers) return;
      const response = await fetch(`${API_BASE_URL}/suppliers/${params.id}/`, { headers });
      if (!response.ok) throw new Error("Ma'lumotlarni olishda xatolik");
      const data = await response.json();
      setSupplier(data);
    } catch (error) {
      toast({ title: "Xatolik", description: "Ma'lumotlarni yuklashda muammo yuz berdi" });
    } finally {
      setLoading(false);
    }
  }, [params.id, accessToken, getAuthHeaders]);
  
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const fio = localStorage.getItem("user_fio");
    if (token) {
        setAccessToken(token);
        if(fio) setCurrentUser({ fio });
    } else {
        router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    if (accessToken) {
      fetchSupplier();
    }
  }, [accessToken, fetchSupplier]);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const openEditModal = () => {
    if (supplier) {
      setEditFormData({
        company_name: supplier.company_name,
        contact_person_name: supplier.contact_person_name,
        phone_number: supplier.phone_number,
        email: supplier.email,
        address: supplier.address,
        description: supplier.description,
      });
      setIsEditModalOpen(true);
    }
  };

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) return;
    setIsSubmitting(true);
    try {
      const headers = getAuthHeaders();
      if (!headers) return;
      const response = await fetch(`${API_BASE_URL}/suppliers/${supplier.id}/`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ ...editFormData, balance: supplier.balance }),
      });

      if (!response.ok) throw new Error("Ma'lumotlarni yangilashda xatolik");

      const changes = [];
      if(supplier.company_name !== editFormData.company_name) changes.push(`• <b>Kompaniya nomi:</b> <code>${supplier.company_name}</code> → <code>${editFormData.company_name}</code>`);
      if(supplier.contact_person_name !== editFormData.contact_person_name) changes.push(`• <b>Mas'ul shaxs:</b> <code>${supplier.contact_person_name}</code> → <code>${editFormData.contact_person_name}</code>`);
      if(supplier.phone_number !== editFormData.phone_number) changes.push(`• <b>Telefon:</b> <code>${supplier.phone_number}</code> → <code>${editFormData.phone_number}</code>`);
      if(supplier.address !== editFormData.address) changes.push(`• <b>Manzil:</b> <code>${supplier.address}</code> → <code>${editFormData.address}</code>`);

      if (changes.length > 0) {
        const message = `<b>✏️🏢 Yetkazib Beruvchi Tahrirlandi</b>\n\n` +
                        `<b>Kim tomonidan:</b> ${currentUser?.fio || 'Noma`lum'}\n` +
                        `<b>Kompaniya:</b> ${supplier.company_name} (ID: ${supplier.id})\n\n` +
                        `<b>Quyidagi ma'lumotlar o'zgartirildi:</b>\n` +
                        changes.join('\n');
        await sendTelegramNotification(message);
      }
      
      toast({ title: "Muvaffaqiyatli", description: "Yetkazib beruvchi ma'lumotlari yangilandi." });
      setIsEditModalOpen(false);
      fetchSupplier();
    } catch (error) {
      toast({ title: "Xatolik", description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="border-b"><div className="flex h-16 items-center px-4"><MainNav className="mx-6" /><div className="ml-auto flex items-center space-x-4"><Search /><UserNav /></div></div></div>
        <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Ma'lumotlar yuklanmoqda...</p></div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="border-b"><div className="flex h-16 items-center px-4"><MainNav className="mx-6" /><div className="ml-auto flex items-center space-x-4"><Search /><UserNav /></div></div></div>
        <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Yetkazib beruvchi topilmadi</p></div>
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
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{supplier.company_name}</h2>
            <p className="text-muted-foreground">Yetkazib beruvchi ma'lumotlari</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={openEditModal}><Edit className="mr-2 h-4 w-4" />Tahrirlash</Button>
            <Button variant="outline" onClick={() => router.push("/suppliers")}><Building className="mr-2 h-4 w-4" />Barcha yetkazib beruvchilar</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Card>
              <CardHeader><CardTitle>Aloqa ma'lumotlari</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center"><User className="mr-2 h-5 w-5 text-muted-foreground" /><span>{supplier.contact_person_name}</span></div>
                  <div className="flex items-center"><Phone className="mr-2 h-5 w-5 text-muted-foreground" /><span>{supplier.phone_number}</span></div>
                  <div className="flex items-center"><Mail className="mr-2 h-5 w-5 text-muted-foreground" /><span>{supplier.email || "-"}</span></div>
                  <div className="flex items-center"><MapPin className="mr-2 h-5 w-5 text-muted-foreground" /><span>{supplier.address}</span></div>
                  <div className="flex items-center"><Building className="mr-2 h-5 w-5 text-muted-foreground" /><span>{supplier.description || "-"}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-2">
            <Card>
              <CardHeader><CardTitle>Moliyaviy ma'lumotlar</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Balans</p>
                    <p className="text-2xl font-bold text-green-600">
                      {new Intl.NumberFormat('en-US', { 
                        style: 'currency', 
                        currency: 'USD',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(parseFloat(supplier.balance || "0"))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Yetkazib beruvchini tahrirlash</DialogTitle>
            <DialogDescription>Ma'lumotlarni o'zgartiring va saqlang.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSupplier}>
            <div className="grid gap-4 py-4">
              <div className="space-y-1"><Label htmlFor="company_name">Kompaniya nomi</Label><Input id="company_name" name="company_name" value={editFormData.company_name} onChange={handleEditChange} required /></div>
              <div className="space-y-1"><Label htmlFor="contact_person_name">Mas'ul shaxs</Label><Input id="contact_person_name" name="contact_person_name" value={editFormData.contact_person_name} onChange={handleEditChange} required /></div>
              <div className="space-y-1"><Label htmlFor="phone_number">Telefon</Label><Input id="phone_number" name="phone_number" value={editFormData.phone_number} onChange={handleEditChange} required /></div>
              <div className="space-y-1"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" value={editFormData.email} onChange={handleEditChange} /></div>
              <div className="space-y-1"><Label htmlFor="address">Manzil</Label><Input id="address" name="address" value={editFormData.address} onChange={handleEditChange} required /></div>
              <div className="space-y-1"><Label htmlFor="description">Tavsif</Label><Textarea id="description" name="description" value={editFormData.description} onChange={handleEditChange} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting}>Bekor qilish</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Saqlash</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierDetailPage;