"use client";

import React, { useState, useEffect, useCallback } from "react"; // useCallback qo'shildi
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { PlusCircle, Edit, Trash } from "lucide-react";
import Link from "next/link"; // Link import qilingan
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const API_BASE_URL = "http://api.ahlan.uz"; // API URL ni konstantaga chiqardik

export default function PropertiesPage() {
  const router = useRouter();
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    total_apartments: "",
    floors: "",
    address: "",
    description: "",
    image: null,
  });

  // useCallback bilan o'ralgan getAuthHeaders
  const getAuthHeaders = useCallback(() => {
    if (!accessToken) return {}; // Token yo'q bo'lsa bo'sh obyekt qaytaramiz
    return {
      Authorization: `Bearer ${accessToken}`,
      // Content-Type ni bu yerda qo'shish shart emas, FormData uchun fetch o'zi qo'yadi
      // Faqat JSON uchun Accept yoki Content-Type kerak bo'lishi mumkin
       Accept: "application/json",
    };
  }, [accessToken]); // accessToken o'zgarganda qayta yaratiladi

  // useCallback bilan o'ralgan loadObjects
  const loadObjects = useCallback(async () => {
    if (!accessToken) return; // Token yo'q bo'lsa funksiyadan chiqamiz

    setLoading(true);
    let allObjects = [];
    let nextUrl = `${API_BASE_URL}/objects/`;

    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          method: "GET",
          headers: {
             ...getAuthHeaders(), // getAuthHeaders dan foydalanish
            "Content-Type": "application/json", // GET uchun Content-Type shart emas, lekin Accept muhim
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
             // Token eskirgan yoki yaroqsiz bo'lsa, login sahifasiga yo'naltirish
             toast({
                title: "Sessiya muddati tugagan",
                description: "Iltimos, tizimga qayta kiring.",
                variant: "destructive",
            });
            localStorage.removeItem("access_token"); // Eskirgan token o'chiriladi
            router.push("/login");
            return; // Funksiyadan chiqish
          }
          // Boshqa xatoliklar
          const errorData = await response.json().catch(() => ({ detail: "Server bilan bog'lanishda xatolik" }));
          throw new Error(errorData.detail || "Obyektlarni olishda noma'lum xatolik");
        }

        const data = await response.json();
        allObjects = [...allObjects, ...(data.results || [])];
        nextUrl = data.next;
      }
      setObjects(allObjects);
    } catch (error) {
      console.error("Error loading objects:", error);
      toast({
        title: "Xatolik",
        description: error.message || "Obyektlarni yuklashda xatolik yuz berdi",
        variant: "destructive",
      });

    } finally {
      setLoading(false);
    }
  }, [accessToken, router, getAuthHeaders]); // getAuthHeaders qo'shildi

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
       if (!token) {
           toast({
                title: "Avtorizatsiya yo'q",
                description: "Iltimos, tizimga kiring.",
                variant: "destructive",
            });
            router.push("/login");
       } else {
            setAccessToken(token);
       }
    }
  }, [router]); // router dependency qoladi

  // accessToken o'zgarganda yoki loadObjects funksiyasi o'zgarganda (useCallback tufayli kamdan-kam) obyektlarni yuklash
  useEffect(() => {
    if (accessToken) {
      loadObjects();
    }
  }, [accessToken, loadObjects]); // loadObjects dependency ga qo'shildi

  const handleEdit = (object) => {
    setSelectedObject(object);
    setFormData({
      name: object.name || "",
      total_apartments: object.total_apartments || "",
      floors: object.floors || "",
      address: object.address || "",
      description: object.description || "",
      image: null, // Rasm har doim qayta tanlanishi kerak
    });
    setOpenEditDialog(true);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, image: e.target.files[0] }));
    } else {
         setFormData((prev) => ({ ...prev, image: null })); // Fayl tanlanmasa null qilish
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedObject) return;

    const formDataToSend = new FormData();
    // Faqat o'zgargan yoki mavjud bo'lgan qiymatlarni qo'shamiz
    formDataToSend.append("name", formData.name);
    formDataToSend.append("total_apartments", formData.total_apartments);
    formDataToSend.append("floors", formData.floors);
    formDataToSend.append("address", formData.address);
    formDataToSend.append("description", formData.description);
    if (formData.image) {
      formDataToSend.append("image", formData.image);
    }
    // Agar rasm o'zgartirilmasa, uni PUT request bilan yubormaslik kerak
    // Lekin DRF odatda PUT da barcha maydonlarni kutadi. PATCH yaxshiroq bo'lishi mumkin.
    // Hozircha PUT da rasm yuborilmasa, eski rasm o'chib ketishi mumkin (backend ga bog'liq).

    setLoading(true); // Yangilash paytida loading holatini ko'rsatish
    try {
      const response = await fetch(`${API_BASE_URL}/objects/${selectedObject.id}/`, {
        method: "PUT", // Yoki PATCH (agar backend qo'llab-quvvatlasa va faqat o'zgargan maydonlarni yubormoqchi bo'lsangiz)
        headers: getAuthHeaders(), // Authorization sarlavhasi qo'shildi
        body: formDataToSend,
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({ detail: "Server javobida xatolik" }));
         throw new Error(errorData.detail || `Obyektni yangilashda xatolik: ${response.statusText}`);
      }

      toast({
        title: "Muvaffaqiyat",
        description: "Obyekt muvaffaqiyatli yangilandi",
      });
      setOpenEditDialog(false);
      loadObjects(); // Ro'yxatni yangilash
    } catch (error) {
      console.error("Error updating object:", error);
      toast({
        title: "Xatolik",
        description: error.message || "Obyektni yangilashda noma'lum xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
        setLoading(false); // Loading holatini tugatish
    }
  };

  const handleDelete = async (id) => {
    // confirm o'rniga Dialog ishlatish mumkin (ko'proq UI nazorati uchun)
    if (!window.confirm("Ushbu obyektni o'chirishni tasdiqlaysizmi?")) return;

    setLoading(true); // O'chirish paytida loading holati
    try {
      const response = await fetch(`${API_BASE_URL}/objects/${id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(), // Authorization sarlavhasi qo'shildi
      });

      // DELETE so'rovi muvaffaqiyatli bo'lsa odatda 204 No Content statusini qaytaradi
      if (response.status === 204) {
          toast({
            title: "Muvaffaqiyat",
            description: "Obyekt muvaffaqiyatli o'chirildi",
          });
          // O'chirilgan obyektni state dan olib tashlash (qayta fetch qilmasdan)
          // setObjects(prevObjects => prevObjects.filter(obj => obj.id !== id));
          // Yoki ro'yxatni qayta yuklash
          loadObjects();
      } else if (!response.ok) {
           const errorData = await response.json().catch(() => ({ detail: "Server javobida xatolik" }));
           throw new Error(errorData.detail || `Obyektni o'chirishda xatolik: ${response.statusText}`);
      } else {
           // Bu holat kam uchraydi (masalan, 200 OK bilan body qaytarsa)
            toast({
                title: "Muvaffaqiyat",
                description: "Obyekt o'chirildi (status: " + response.status + ")",
            });
            loadObjects();
      }

    } catch (error) {
      console.error("Error deleting object:", error);
      toast({
        title: "Xatolik",
        description: error.message || "Obyektni o'chirishda noma'lum xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
        setLoading(false); // Loading holatini tugatish
    }
  };

  // Loading holati uchun spinner yaxshi, o'zgartirish shart emas
  if (loading && objects.length === 0) { // Faqat boshlang'ich yuklashda to'liq ekranli loader
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  // Token hali yuklanmagan bo'lsa (qisqa muddat)
  if (accessToken === null && typeof window !== 'undefined' && localStorage.getItem('access_token')) {
      return (
           <div className="flex items-center justify-center min-h-screen">
               <p>Sessiya tekshirilmoqda...</p>
           </div>
      );
  }


  return (
    <div className="flex min-h-screen flex-col">
      {/* Header qismi o'zgarishsiz */}
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav />
          </div>
        </div>
      </div>

      {/* Content qismi */}
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Obyektlar</h2>
          <Link href="/properties/add" legacyBehavior={false}>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Yangi obyekt qo'shish
            </Button>
          </Link>
        </div>

        {/* Loading indikatori (kichikroq, update/delete paytida) */}
        {loading && <p className="text-center py-4">Amal bajarilmoqda...</p>}

        {/* Obyektlar ro'yxati */}
        {!loading && objects.length === 0 && (
            <p className="text-center text-gray-500 py-10">Hozircha obyektlar mavjud emas.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {objects.map((object) => (
            <Card key={object.id} className="shadow-lg flex flex-col"> {/* flex flex-col qo'shildi */}
              <CardHeader className="p-0"> {/* Padding olib tashlandi, rasm to'liq egallasin */}
                <img
                  src={object.image || "https://via.placeholder.com/300x150?text=Rasm+yo'q"} // Placeholderga matn qo'shildi
                  alt={object.name}
                  className="w-full h-48 object-cover rounded-t-md" // Rasm yuqoriga yopishadi
                  onError={(e) => { e.target.onerror = null; e.target.src="https://via.placeholder.com/300x150?text=Rasm+yuklanmadi"; }} // Rasm yuklanmasa
                />
              </CardHeader>
              <CardContent className="flex-grow pt-4"> {/* flex-grow qo'shildi, kontent egallaydi */}
                <CardTitle className="text-xl font-semibold mb-1">{object.name}</CardTitle>
                <p className="text-sm text-gray-600 mb-2">{object.address}</p>
                <div className="text-sm space-y-1">
                    <p>
                    <span className="font-medium">Xonadonlar:</span> {object.total_apartments}
                    </p>
                    <p>
                    <span className="font-medium">Qavatlar:</span> {object.floors}
                    </p>
                    {object.description && (
                         <p className="text-gray-700 pt-1">
                           <span className="font-medium">Tavsif:</span> {object.description.substring(0, 50)}{object.description.length > 50 ? '...' : ''} {/* Tavsifni qisqartirish */}
                         </p>
                    )}
                </div>

              </CardContent>
              {/* CardFooter: Tugmalar o'ng tomonda, orasi ochilgan */}
              <CardFooter className="flex justify-end space-x-2 pt-4">
                 {/* Batafsil tugmasi Link bilan o'raldi */}
                <Link href={`/properties/${object.id}`} passHref legacyBehavior={false}>
                  <Button variant="link" size="sm">Batafsil</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => handleEdit(object)}>
                  <Edit className="h-4 w-4" /> {/* Matnsiz, faqat ikonka */}
                  {/* <span className="ml-2">Tahrir</span> */}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(object.id)}>
                  <Trash className="h-4 w-4" /> {/* Matnsiz, faqat ikonka */}
                   {/* <span className="ml-2">O'chirish</span> */}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Edit Dialog (o'zgarishsiz qoldi, lekin forma elementlari yaxshilanishi mumkin) */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Obyektni Tahrirlash</DialogTitle>
              <DialogDescription>Obyekt ma'lumotlarini yangilang.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
               {/* Inputlar uchun Label va Input juftliklari */}
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nomi</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="col-span-3" required />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="total_apartments" className="text-right">Xonadonlar soni</Label>
                <Input id="total_apartments" type="number" value={formData.total_apartments} onChange={(e) => setFormData({ ...formData, total_apartments: e.target.value })} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="floors" className="text-right">Qavatlar</Label>
                <Input id="floors" type="number" value={formData.floors} onChange={(e) => setFormData({ ...formData, floors: e.target.value })} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">Manzil</Label>
                <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                 <Label htmlFor="description" className="text-right">Tavsif</Label>
                 {/* Tavsif uchun <Textarea> ishlatish mumkin */}
                <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="image" className="text-right">Rasm</Label>
                <Input id="image" type="file" onChange={handleFileChange} className="col-span-3" accept="image/*" />
                 {/* Eski rasmni ko'rsatish uchun joy (agar kerak bo'lsa) */}
                 {selectedObject?.image && !formData.image && (
                    <div className="col-span-3 col-start-2 mt-2">
                        <img src={selectedObject.image} alt="Joriy rasm" className="h-20 w-auto rounded" />
                        <p className="text-xs text-gray-500 mt-1">Yangi rasm tanlanmasa, shu rasm qoladi (backend ga bog'liq).</p>
                    </div>
                 )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenEditDialog(false)}>Bekor qilish</Button>
              <Button type="submit" disabled={loading}> {/* Saqlash paytida disable qilish */}
                  {loading ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}