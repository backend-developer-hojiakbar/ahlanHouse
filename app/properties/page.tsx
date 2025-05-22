"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { Search } from "@/components/search";
import { UserNav } from "@/components/user-nav";
import { PlusCircle, Edit, Trash } from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster, toast as hotToast } from "react-hot-toast";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://api.ahlan.uz";

// Global xato boshqaruvchi
const handleApiError = (error, response, router) => {
  if (response?.status === 401) {
    toast({
      title: "Sessiya muddati tugagan",
      description: "Iltimos, tizimga qayta kiring.",
      variant: "destructive",
    });
    localStorage.removeItem("access_token");
    router.push("/login");
    return true;
  }
  toast({
    title: "Xatolik",
    description: error.message || "Noma'lum xatolik yuz berdi",
    variant: "destructive",
  });
  return false;
};

// Obyekt kartasi komponenti
const ObjectCard = ({ object, onEdit, onDelete }) => {
  // Get user type from JWT token
  const getUserType = () => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    const tokenParts = token.split('.');
    const payload = JSON.parse(atob(tokenParts[1]));
    return payload.user_type;
  };

  const userType = getUserType();
  return (
    <Card className="shadow-md hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-sm border border-gray-100">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold truncate">{object.name}</CardTitle>
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pt-0">
        <div className="text-sm space-y-2">
          <div className="flex items-center space-x-2">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="truncate text-gray-600">{object.address}</p>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <p className="text-gray-600">Xonadonlar: {object.total_apartments}</p>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
            </svg>
            <p className="text-gray-600">Qavatlar: {object.floors}</p>
          </div>
          {object.description && (
            <div className="flex items-start space-x-2">
              <svg className="h-4 w-4 text-gray-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              <p className="text-gray-600 line-clamp-2" title={object.description}>
                {object.description}
              </p>
            </div>
          )}
        </div>
      </CardContent>
      {userType === 'admin' && (
        <CardFooter className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onEdit(object)}
            className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            title="Tahrirlash"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDelete(object.id)}
            className="h-8 w-8 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="O'chirish"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default function PropertiesPage() {
  const router = useRouter();
  const [objects, setObjects] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [objectToDelete, setObjectToDelete] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    total_apartments: "",
    floors: "",
    address: "",
    description: "",
  });

  const getAuthHeaders = useCallback(
    () => {
      if (!accessToken) return {};
      return {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      };
    },
    [accessToken]
  );

  const loadObjects = useCallback(async () => {
    if (!accessToken) return;

    setIsInitialLoading(true);
    let allObjects = [];
    let nextUrl = `${API_BASE_URL}/objects/`;

    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            detail: "Server bilan bog'lanishda xatolik",
          }));
          if (handleApiError(new Error(errorData.detail), response, router)) return;
          throw new Error(errorData.detail);
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
      setIsInitialLoading(false);
    }
  }, [accessToken, router, getAuthHeaders]);

  useEffect(() => {
    const initialToken =
      typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!initialToken) {
      toast({
        title: "Avtorizatsiya yo'q",
        description: "Iltimos, tizimga kiring.",
        variant: "destructive",
      });
      router.push("/login");
    } else {
      setAccessToken(initialToken);
    }
  }, [router]);

  useEffect(() => {
    if (accessToken && objects.length === 0) {
      loadObjects();
    }
  }, [accessToken, objects.length, loadObjects]);

  const handleEdit = (object) => {
    setSelectedObject(object);
    setFormData({
      name: object.name || "",
      total_apartments: object.total_apartments || "",
      floors: object.floors || "",
      address: object.address || "",
      description: object.description || "",
    });
    setOpenEditDialog(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedObject) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/objects/${selectedObject.id}/`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: "Server javobida xatolik",
        }));
        if (handleApiError(new Error(errorData.detail), response, router)) return;
        throw new Error(errorData.detail);
      }

      hotToast.success("Obyekt muvaffaqiyatli yangilandi", {
        position: "top-right",
      });
      setOpenEditDialog(false);
      loadObjects();
    } catch (error) {
      console.error("Error updating object:", error);
      toast({
        title: "Xatolik",
        description: error.message || "Obyektni yangilashda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    setObjectToDelete(id);
    setOpenDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!objectToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/objects/${objectToDelete}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: "Server javobida xatolik",
        }));
        if (handleApiError(new Error(errorData.detail), response, router)) return;
        throw new Error(errorData.detail);
      }

      hotToast.success("Obyekt muvaffaqiyatli o'chirildi", {
        position: "top-center",
      });
      loadObjects();
    } catch (error) {
      console.error("Error deleting object:", error);
      toast({
        title: "Xatolik",
        description: error.message || "Obyektni o'chirishda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setOpenDeleteDialog(false);
      setObjectToDelete(null);
    }
  };

  if (isInitialLoading && objects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (accessToken === null && typeof window !== "undefined" && localStorage.getItem("access_token")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Sessiya tekshirilmoqda...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Toaster />
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 items-center">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav />
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 p-8 pt-6 container mx-auto relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 -z-10 h-full w-full bg-[#f8fafc]">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]"></div>
        </div>
        
        {/* Background Icons */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-20 -right-20 transform rotate-12 animate-float">
            <svg className="h-[300px] w-[300px] text-slate-100" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <div className="absolute -bottom-20 -left-20 transform -rotate-12 animate-float-delayed">
            <svg className="h-[300px] w-[300px] text-slate-100" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
          </div>
        </div>

        <style jsx global>{`
          @keyframes float {
            0%, 100% {
              transform: translateY(0) rotate(12deg);
            }
            50% {
              transform: translateY(-20px) rotate(12deg);
            }
          }
          @keyframes float-delayed {
            0%, 100% {
              transform: translateY(0) rotate(-12deg);
            }
            50% {
              transform: translateY(-20px) rotate(-12deg);
            }
          }
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          .animate-float-delayed {
            animation: float-delayed 6s ease-in-out infinite;
            animation-delay: -3s;
          }
        `}</style>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">Obyektlar</h2>
            <p className="text-sm text-muted-foreground">Barcha obyektlarni boshqarish va ko'rish</p>
          </div>
          {(() => {
            const token = localStorage.getItem('access_token');
            if (!token) return null;
            const tokenParts = token.split('.');
            const payload = JSON.parse(atob(tokenParts[1]));
            return payload.user_type === 'admin' ? (
              <Link href="/properties/add" legacyBehavior={false}>
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-md">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Yangi obyekt qo'shish
                </Button>
              </Link>
            ) : null;
          })()}
        </div>

        {(isUpdating || isDeleting) && (
          <div className="text-center py-4 text-gray-600 animate-pulse">
            Amal bajarilmoqda...
          </div>
        )}

        {!isInitialLoading && objects.length === 0 && (
          <div className="text-center py-10 bg-white/80 backdrop-blur-sm rounded-lg shadow-md border border-gray-100">
            <p className="text-gray-500">Hozircha obyektlar mavjud emas.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {objects.map((object) => (
            <ObjectCard
              key={object.id}
              object={object}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </main>

      {/* Tahrirlash dialogi */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Obyektni Tahrirlash</DialogTitle>
              <DialogDescription>Obyekt ma'lumotlarini yangilang.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right font-medium">
                  Nomi
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="total_apartments" className="text-right font-medium">
                  Xonadonlar soni
                </Label>
                <Input
                  id="total_apartments"
                  type="number"
                  value={formData.total_apartments}
                  onChange={(e) =>
                    setFormData({ ...formData, total_apartments: e.target.value })
                  }
                  className="col-span-3"
                  required
                  min="0"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="floors" className="text-right font-medium">
                  Qavatlar
                </Label>
                <Input
                  id="floors"
                  type="number"
                  value={formData.floors}
                  onChange={(e) => setFormData({ ...formData, floors: e.target.value })}
                  className="col-span-3"
                  required
                  min="0"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right font-medium">
                  Manzil
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right font-medium">
                  Tavsif
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="col-span-3"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenEditDialog(false)}
                disabled={isUpdating}
              >
                Bekor qilish
              </Button>
              <Button type="submit" disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700">
                {isUpdating ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* O'chirish dialogi */}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obyektni o'chirish</DialogTitle>
            <DialogDescription>
              Ushbu obyektni o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenDeleteDialog(false)}
              disabled={isDeleting}
            >
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <footer className="border-t py-4 px-4 text-center text-sm text-muted-foreground mt-auto">
        Version 1.0 | Barcha huquqlar ximoyalangan | Ushbu Dastur CDCGroup tomonidan yaratilgan | CraDev Company tomonidan qo'llab quvvatlanadi | since 2019
      </footer>
    </div>
  );
}