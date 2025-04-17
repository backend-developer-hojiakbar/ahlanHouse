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
  return (
    <Card className="shadow-md flex flex-col transition-transform hover:scale-[1.02] hover:shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold truncate">{object.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow pt-0">
        <div className="text-sm space-y-1">
          <p className="truncate"><span className="font-medium">Manzil:</span> {object.address}</p>
          <p><span className="font-medium">Xonadonlar:</span> {object.total_apartments}</p>
          <p><span className="font-medium">Qavatlar:</span> {object.floors}</p>
          {object.description && (
            <p className="text-gray-600 truncate" title={object.description}>
              <span className="font-medium">Tavsif:</span>{" "}
              {object.description.length > 30
                ? `${object.description.substring(0, 30)}...`
                : object.description}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2 pt-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onEdit(object)}
          className="h-8 w-8"
          title="Tahrirlash"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          onClick={() => onDelete(object.id)}
          className="h-8 w-8"
          title="O'chirish"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </CardFooter>
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
      <header className="border-b bg-white shadow-sm">
        <div className="flex h-16 items-center px-4 container mx-auto">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav />
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-6 p-4 md:p-8 pt-6 container mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
          <h2 className="text-3xl font-bold tracking-tight text-gray-800">Obyektlar</h2>
          <Link href="/properties/add" legacyBehavior={false}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Yangi obyekt qo'shish
            </Button>
          </Link>
        </div>

        {(isUpdating || isDeleting) && (
          <div className="text-center py-4 text-gray-600 animate-pulse">
            Amal bajarilmoqda...
          </div>
        )}

        {!isInitialLoading && objects.length === 0 && (
          <div className="text-center py-10 bg-white rounded-lg shadow">
            <p className="text-gray-500">Hozircha obyektlar mavjud emas.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* O‘chirish dialogi */}
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