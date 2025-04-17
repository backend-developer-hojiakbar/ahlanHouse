"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { Plus, Eye, Edit, Trash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

// Backenddan kelgan ma'lumotlarga mos interfeys
interface Supplier {
  id: number;
  company_name: string;
  contact_person_name: string;
  phone_number: string;
  address: string;
  description: string;
  balance: string; // Backendda "0.00" kabi string sifatida kelmoqda
}

const SuppliersPage = () => {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    company_name: "",
    contact_person_name: "",
    phone_number: "",
    address: "",
    description: "",
    balance: "0.00", // Balans maydoni qo'shildi
  });
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const API_URL = "http://api.ahlan.uz/suppliers/";

  // Access token olish
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast({
          title: "Avtorizatsiya xatosi",
          description: "Iltimos, tizimga qaytadan kiring.",
          variant: "destructive",
        });
        router.push("/login");
      } else {
        setAccessToken(token);
      }
    }
  }, [router]);

  // Autentifikatsiya sarlavhalari
  const getAuthHeaders = () => {
    if (!accessToken) {
      console.error("Access token is not available for API call");
      if (typeof window !== "undefined") {
        if (!localStorage.getItem("access_token")) {
          router.push("/login");
        }
      }
      return {};
    }
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    };
  };

  // Ma'lumotlarni API dan olish (GET)
  useEffect(() => {
    if (!accessToken) {
      if (typeof window !== "undefined" && !localStorage.getItem("access_token")) {
        setLoading(false);
      }
      return;
    }

    const fetchSuppliers = async () => {
      setLoading(true);
      try {
        const headers = getAuthHeaders();
        if (!headers["Authorization"]) {
          throw new Error("Avtorizatsiya tokeni mavjud emas.");
        }

        const response = await fetch(API_URL, {
          method: "GET",
          headers: headers,
        });

        if (response.status === 401) {
          localStorage.removeItem("access_token");
          setAccessToken(null);
          toast({
            title: "Sessiya muddati tugagan",
            description: "Iltimos, tizimga qaytadan kiring.",
            variant: "destructive",
          });
          router.push("/login");
          return;
        }

        if (!response.ok) throw new Error(`Ma'lumotlarni olishda xatolik: ${response.statusText}`);
        const data = await response.json();

        if (data && Array.isArray(data.results)) {
          setSuppliers(data.results);
        } else {
          console.error("API dan kutilmagan formatdagi ma'lumot keldi:", data);
          setSuppliers([]);
          toast({ title: "Xatolik", description: "API ma'lumotlari noto'g'ri formatda", variant: "destructive" });
        }
      } catch (error) {
        console.error("Xatolik:", error);
        setSuppliers([]);
        toast({ title: "Xatolik", description: (error as Error).message || "Ma'lumotlarni yuklashda muammo yuz berdi", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, [accessToken, router]);

  // Formadagi o'zgarishlarni boshqarish
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Yetkazib beruvchi qo'shish yoki tahrirlash (POST yoki PUT)
  const handleSubmit = async (e: React.FormEvent, action: "save" | "saveAndAdd" | "saveAndContinue") => {
    e.preventDefault();
    const headers = getAuthHeaders();
    if (!headers["Authorization"]) {
      toast({ title: "Xatolik", description: "Avtorizatsiya tokeni topilmadi.", variant: "destructive" });
      return;
    }
    try {
      const url = editId ? `${API_URL}${editId}/` : API_URL;
      const method = editId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: headers,
        body: JSON.stringify(formData), // Balans maydoni formData ichida yuboriladi
      });

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        setAccessToken(null);
        toast({ title: "Sessiya muddati tugagan", description: "Iltimos, tizimga qaytadan kiring.", variant: "destructive" });
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Saqlash xatosi:", errorData);
        const errorMessages = Object.values(errorData).flat().join(' ');
        throw new Error(`Saqlashda xatolik: ${response.statusText}. ${errorMessages || ''}`);
      }

      const updatedSupplier = await response.json();

      if (editId) {
        setSuppliers((prev) =>
          prev.map((supplier) => (supplier.id === editId ? updatedSupplier : supplier))
        );
        toast({ title: "Yangilandi", description: "Yetkazib beruvchi muvaffaqiyatli yangilandi" });
      } else {
        setSuppliers((prev) => [updatedSupplier, ...prev]);
        toast({ title: "Qo'shildi", description: "Yangi yetkazib beruvchi qo'shildi" });
      }

      if (action === "save") {
        resetForm();
      } else if (action === "saveAndAdd") {
        setFormData({
          company_name: "",
          contact_person_name: "",
          phone_number: "",
          address: "",
          description: "",
          balance: "0.00", // Balansni qayta 0.00 qilib tiklaymiz
        });
        setEditId(null);
      } else if (action === "saveAndContinue") {
        setFormData({
          company_name: updatedSupplier.company_name,
          contact_person_name: updatedSupplier.contact_person_name,
          phone_number: updatedSupplier.phone_number,
          address: updatedSupplier.address,
          description: updatedSupplier.description,
          balance: updatedSupplier.balance, // Balansni yangilangan qiymatdan olamiz
        });
        setEditId(updatedSupplier.id);
      }
    } catch (error) {
      console.error("Xatolik:", error);
      toast({ title: "Xatolik", description: (error as Error).message || "Ma'lumotlarni saqlashda muammo yuz berdi", variant: "destructive" });
    }
  };

  // Yetkazib beruvchini o'chirish (DELETE)
  const handleDelete = async (id: number) => {
    const headers = getAuthHeaders();
    if (!headers["Authorization"]) {
      toast({ title: "Xatolik", description: "Avtorizatsiya tokeni topilmadi.", variant: "destructive" });
      return;
    }
    if (!confirm(`Rostdan ham ${suppliers.find(s => s.id === id)?.company_name || 'bu yetkazib beruvchini'} o'chirmoqchimisiz?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}${id}/`, {
        method: "DELETE",
        headers: headers,
      });

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        setAccessToken(null);
        toast({ title: "Sessiya muddati tugagan", description: "Iltimos, tizimga qaytadan kiring.", variant: "destructive" });
        router.push("/login");
        return;
      }

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({}));
        console.error("O'chirish xatosi:", errorData);
        throw new Error(`O'chirishda xatolik: ${response.statusText} ${JSON.stringify(errorData)}`);
      }
      setSuppliers((prev) => prev.filter((supplier) => supplier.id !== id));
      toast({ title: "O'chirildi", description: "Yetkazib beruvchi muvaffaqiyatli o'chirildi" });
    } catch (error) {
      console.error("Xatolik:", error);
      toast({ title: "Xatolik", description: (error as Error).message || "O'chirishda muammo yuz berdi", variant: "destructive" });
    }
  };

  // Tahrirlash uchun formani to'ldirish
  const handleEdit = (supplier: Supplier) => {
    setEditId(supplier.id);
    setFormData({
      company_name: supplier.company_name,
      contact_person_name: supplier.contact_person_name,
      phone_number: supplier.phone_number,
      address: supplier.address,
      description: supplier.description,
      balance: supplier.balance, // Balansni formaga qo'shamiz
    });
    setOpen(true);
  };

  // Formani tozalash va modalni yopish
  const resetForm = () => {
    setFormData({
      company_name: "",
      contact_person_name: "",
      phone_number: "",
      address: "",
      description: "",
      balance: "0.00", // Balansni standart qiymatga qaytaramiz
    });
    setEditId(null);
    setOpen(false);
  };

  // Qidiruv bo'yicha filtrlangan yetkazib beruvchilar
  const filteredSuppliers = suppliers.filter((supplier) =>
    [
      supplier.company_name,
      supplier.contact_person_name,
      supplier.phone_number,
    ].some(
      (field) =>
        field &&
        typeof field === 'string' &&
        field.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Balansni formatlash
  const formatBalance = (balance: string) => {
    const balanceNum = parseFloat(balance);
    if (isNaN(balanceNum)) {
      return <span className="text-muted-foreground">N/A</span>;
    }
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const formatted = formatter.format(Math.abs(balanceNum));
    if (balanceNum >= 0) {
      return <span className="text-green-600">{formatted.replace('-$', '$')}</span>;
    } else {
      return <span className="text-red-600">{formatted.startsWith('$') ? `-${formatted}` : formatted}</span>;
    }
  };

  // Render
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

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2 flex-wrap gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Yetkazib beruvchilar</h2>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Yangi yetkazib beruvchi
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editId ? "Yetkazib beruvchini tahrirlash" : "Yangi yetkazib beruvchi"}
                </DialogTitle>
                <DialogDescription>
                  Yetkazib beruvchi ma'lumotlarini kiriting yoki yangilang. Majburiy maydonlar (*) bilan belgilangan.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-2 -mx-2">
                <div className="space-y-1.5">
                  <Label htmlFor="company_name">Kompaniya nomi *</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_person_name">Aloqa shaxsi *</Label>
                  <Input
                    id="contact_person_name"
                    name="contact_person_name"
                    value={formData.contact_person_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone_number">Telefon *</Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    required
                    type="tel"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address">Manzil *</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Tavsif (Ixtiyoriy)</Label>
                  <Input
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="balance">Balans ($)</Label>
                  <Input
                    id="balance"
                    name="balance"
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>Bekor qilish</Button>
                <Button
                  type="button"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={(e) => handleSubmit(e as unknown as React.FormEvent, "save")}
                  disabled={!formData.company_name || !formData.contact_person_name || !formData.phone_number || !formData.address}
                >
                  Saqlash
                </Button>
                {!editId && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={(e) => handleSubmit(e as unknown as React.FormEvent, "saveAndAdd")}
                    disabled={!formData.company_name || !formData.contact_person_name || !formData.phone_number || !formData.address}
                  >
                    Saqlash va Yana Qo‘shish
                  </Button>
                )}
                {editId && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={(e) => handleSubmit(e as unknown as React.FormEvent, "saveAndContinue")}
                    disabled={!formData.company_name || !formData.contact_person_name || !formData.phone_number || !formData.address}
                  >
                    Saqlash va Tahrirni Davom Ettirish
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Kompaniya, shaxs, telefon bo'yicha qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                {searchTerm && (
                  <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>
                    Tozalash
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-muted-foreground">Yetkazib beruvchilar yuklanmoqda...</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kompaniya nomi</TableHead>
                        <TableHead>Aloqa shaxsi</TableHead>
                        <TableHead>Telefon</TableHead>
                        <TableHead>Balans</TableHead>
                        <TableHead className="text-right sticky right-0 bg-background z-[1]">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSuppliers.length > 0 ? (
                        filteredSuppliers.map((supplier) => (
                          <TableRow key={supplier.id}>
                            <TableCell className="font-medium">{supplier.company_name}</TableCell>
                            <TableCell>{supplier.contact_person_name}</TableCell>
                            <TableCell>{supplier.phone_number}</TableCell>
                            <TableCell>{formatBalance(supplier.balance)}</TableCell>
                            <TableCell className="text-right sticky right-0 bg-background z-[1]">
                              <div className="flex justify-end space-x-1 md:space-x-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Tahrirlash"
                                  onClick={() => handleEdit(supplier)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-700"
                                  title="O'chirish"
                                  onClick={() => handleDelete(supplier.id)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            {searchTerm ? "Qidiruv natijasi bo'yicha yetkazib beruvchi topilmadi." : "Hozircha yetkazib beruvchilar mavjud emas."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <footer className="border-t py-4 px-4 text-center text-sm text-muted-foreground mt-auto">
        Version 1.0 | Barcha huquqlar ximoyalangan | Ushbu Dastur CDCGroup tomonidan yaratilgan | CraDev Company tomonidan qo'llab quvvatlanadi | since 2019
      </footer>
    </div>
  );
};

export default SuppliersPage;