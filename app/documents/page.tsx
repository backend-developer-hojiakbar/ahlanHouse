"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { Search as SearchIconLucide, Loader2, Plus, Download, Eye } from "lucide-react";
import { UserNav } from "@/components/user-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation"; // To'g'ri import
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// SearchSelect interfeyslari
interface SearchSelectOption {
  value: string;
  label: string;
}

interface SearchSelectProps {
  options: SearchSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

// SearchSelect komponenti
function SearchSelect({
  options = [],
  value,
  onValueChange,
  placeholder = "Qidiring...",
  disabled = false,
  loading = false,
}: SearchSelectProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selectedOptionLabel = useMemo(() => {
    const selected = options.find((option) => option?.value === value);
    return selected?.label || "";
  }, [options, value]);

  useEffect(() => {
    if (!value) setSearch("");
  }, [value]);

  const filteredOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    if (!search) return options;
    return options.filter((option) =>
      option?.label?.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  const handleInputClick = () => {
    if (!isOpen) setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    setSearch(newSearch);
    if (!isOpen) setIsOpen(true);
    if (value && selectedOptionLabel && newSearch !== selectedOptionLabel) {
      onValueChange("");
    }
  };

  return (
    <div className="relative">
      <Input
        value={search || selectedOptionLabel}
        onChange={handleInputChange}
        onFocus={handleInputClick}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        placeholder={placeholder}
        className="w-full"
        disabled={disabled || loading}
        autoComplete="off"
      />
      {loading && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {isOpen && !loading && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-[200px] overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm hover:bg-accent",
                  option.value === value && "bg-accent font-semibold"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onValueChange(option.value);
                  setSearch("");
                  setIsOpen(false);
                }}
              >
                {option.label}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {search ? "Natija topilmadi" : "Ma'lumot yo'q"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// DocumentsPage komponenti
export default function DocumentsPage() {
  const router = useRouter(); // useRouter to'g'ri ishlatilmoqda
  const [documents, setDocuments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(Date.now());
  const [formData, setFormData] = useState({
    payment: "",
    document_type: "",
    docx_file: null as File | null,
    pdf_file: null as File | null,
    image: null as File | null,
  });

  // Auth headers
  const getAuthHeaders = useCallback(() => {
    if (!accessToken) return {};
    return { Accept: "application/json", Authorization: `Bearer ${accessToken}` };
  }, [accessToken]);

  // Fetch payments
  const fetchPaymentsInternal = useCallback(async (): Promise<any[] | null> => {
    if (!accessToken) return null;
    setIsPaymentsLoading(true);
    let allPayments = [];
    let nextUrl: string | null = "http://api.ahlan.uz/payments/?page_size=1000";
    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, { method: "GET", headers: getAuthHeaders() });
        if (!response.ok) throw new Error(`To'lovlarni olishda xatolik (${response.status})`);
        const data = await response.json();
        allPayments = [...allPayments, ...(data.results || [])];
        nextUrl = data.next;
      }
      setIsPaymentsLoading(false);
      return allPayments;
    } catch (error: any) {
      console.error("To'lovlarni yuklash xatosi:", error);
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
      setIsPaymentsLoading(false);
      return null;
    }
  }, [accessToken, getAuthHeaders]);

  // Fetch documents
  const fetchDocumentsInternal = useCallback(
    async (fetchedPayments: any[]) => {
      if (!accessToken || !fetchedPayments || fetchedPayments.length === 0) return;
      let allDocuments = [];
      let nextUrl: string | null = "http://api.ahlan.uz/documents/?page_size=1000";
      try {
        while (nextUrl) {
          const response = await fetch(nextUrl, { method: "GET", headers: getAuthHeaders() });
          if (!response.ok) {
            if (response.status === 401) throw new Error("Unauthorized");
            throw new Error(`Hujjatlarni olishda xatolik (${response.status})`);
          }
          const data = await response.json();
          const documentsList = data.results || [];
          const fileBaseUrl = "http://api.ahlan.uz";
          const getFullUrl = (path: string | null) => (path ? `${fileBaseUrl}${path}` : undefined);

          const formattedDocuments = documentsList.map((doc: any) => {
            const relatedPayment = fetchedPayments.find((p: any) => p.id === doc.payment);
            const apartmentInfo = relatedPayment?.apartment_info ?? "";
            const propertyName = apartmentInfo.split(" - ")[0] || "Noma'lum Obyekt";
            const clientName = relatedPayment?.user_fio ?? "Noma'lum Mijoz";
            const apartmentDetails = apartmentInfo.split(" - ")[1] ?? "";
            const apartmentNumber = apartmentDetails.includes(" xonali")
              ? apartmentDetails.split(" xonali")[0]
              : apartmentDetails || "N/A";
            return {
              id: doc.id,
              title: doc.document_type ? doc.document_type.charAt(0).toUpperCase() + doc.document_type.slice(1) : "Hujjat",
              type: doc.document_type || "Noma'lum",
              propertyName,
              clientName,
              apartmentNumber,
              date: doc.created_at || new Date().toISOString(),
              docx_file_url: getFullUrl(doc.docx_file),
              pdf_file_url: getFullUrl(doc.pdf_file),
              image_file_url: getFullUrl(doc.image),
            };
          });
          allDocuments = [...allDocuments, ...formattedDocuments];
          nextUrl = data.next;
        }
        setDocuments(allDocuments);
      } catch (error: any) {
        if (error.message === "Unauthorized") {
          toast({
            title: "Sessiya tugadi",
            description: "Iltimos, tizimga qayta kiring.",
            variant: "warning",
          });
          localStorage.removeItem("access_token");
          setAccessToken(null);
          router.push("/login");
        } else {
          console.error("Hujjatlarni yuklash xatosi:", error);
          toast({ title: "Xatolik", description: error.message, variant: "destructive" });
        }
      }
    },
    [accessToken, getAuthHeaders, router]
  );

  // Fetch document details
  const fetchDocumentDetails = useCallback(
    async (id: string) => {
      if (!accessToken) return;
      try {
        const response = await fetch(`http://api.ahlan.uz/documents/${id}/`, {
          method: "GET",
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error(`Hujjat detallarini olishda xatolik (${response.status})`);
        const data = await response.json();
        const relatedPayment = payments.find((p: any) => p.id === data.payment);
        const fileBaseUrl = "http://api.ahlan.uz";

        // Nomi va turini formatlash
        const formattedName = data.document_type
          ? data.document_type.charAt(0).toUpperCase() + data.document_type.slice(1)
          : "Noma'lum";
        const formattedType = data.document_type || "Noma'lum";

        setSelectedDocument({
          ...data,
          name: formattedName,
          type: formattedType,
          payment_info: relatedPayment ? `${relatedPayment.user_fio} - ${relatedPayment.apartment_info}` : "Noma'lum",
          docx_file_url: data.docx_file ? `${fileBaseUrl}${data.docx_file}` : null,
          pdf_file_url: data.pdf_file ? `${fileBaseUrl}${data.pdf_file}` : null,
          image_file_url: data.image ? `${fileBaseUrl}${data.image}` : null,
        });
      } catch (error: any) {
        toast({ title: "Xatolik", description: error.message, variant: "destructive" });
      }
    },
    [accessToken, payments, getAuthHeaders]
  );

  // Initial data load
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) setAccessToken(token);
    else if (!accessToken) router.push("/login");
  }, [router, accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    const loadInitialData = async () => {
      setLoading(true);
      const fetchedPayments = await fetchPaymentsInternal();
      if (fetchedPayments) {
        setPayments(fetchedPayments);
        await fetchDocumentsInternal(fetchedPayments);
      }
      setLoading(false);
    };
    loadInitialData();
  }, [accessToken, fetchPaymentsInternal, fetchDocumentsInternal]);

  // Create document
  const createDocument = useCallback(
    async (action: "save" | "saveAndAdd" = "save") => {
      if (!formData.payment || !formData.document_type || (!formData.docx_file && !formData.pdf_file && !formData.image)) {
        toast({
          title: "Maydonlar to'ldirilmagan",
          description: "To‘lov, hujjat turi va kamida bitta faylni tanlang.",
          variant: "destructive",
        });
        return;
      }
      setIsSubmitting(true);
      const formDataToSend = new FormData();
      formDataToSend.append("payment", formData.payment);
      formDataToSend.append("document_type", formData.document_type);
      if (formData.docx_file) formDataToSend.append("docx_file", formData.docx_file);
      if (formData.pdf_file) formDataToSend.append("pdf_file", formData.pdf_file);
      if (formData.image) formDataToSend.append("image", formData.image);

      try {
        const response = await fetch("http://api.ahlan.uz/documents/", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formDataToSend,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessages = Object.entries(errorData)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
            .join("\n");
          throw new Error(errorMessages || `Hujjat qo‘shishda xatolik (${response.status})`);
        }
        toast({ title: "Muvaffaqiyat", description: "Yangi hujjat qo‘shildi." });
        await fetchDocumentsInternal(payments);
        if (action === "save") {
          setOpen(false);
          setFormData({ payment: "", document_type: "", docx_file: null, pdf_file: null, image: null });
          setFormKey(Date.now());
        } else {
          setFormData({ payment: "", document_type: "", docx_file: null, pdf_file: null, image: null });
          setFormKey(Date.now());
        }
      } catch (error: any) {
        toast({ title: "Xatolik", description: error.message, variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, formData, payments, fetchDocumentsInternal]
  );

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: "docx_file" | "pdf_file" | "image") => {
    const file = e.target.files?.[0] ?? null;
    setFormData((prev) => ({ ...prev, [field]: file }));
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    createDocument("save");
  };

  const handleSaveAndAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    createDocument("saveAndAdd");
  };

  const handleDownload = async (doc: any) => {
    const url = doc.pdf_file_url || doc.docx_file_url || doc.image_file_url;
    if (!url || !accessToken) {
      toast({ title: "Xatolik", description: "Fayl manzili yoki token topilmadi.", variant: "warning" });
      return;
    }
    try {
      const response = await fetch(url, { method: "GET", headers: getAuthHeaders() });
      if (!response.ok) throw new Error(`Faylni yuklab olishda xatolik (${response.status})`);
      const blob = await response.blob();
      const fileName = url.split("/").pop() || "document";
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error: any) {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    }
  };

  const handleViewDetails = (doc: any) => {
    setSelectedDocument(doc);
    fetchDocumentDetails(doc.id);
    setDetailOpen(true);
  };

  const getDocumentTypeLabel = (type: string | undefined) => {
    const types: { [key: string]: string } = {
      kvitansiya: "Kvitansiya",
      shartnoma: "Shartnoma",
      chek: "Chek",
      boshqa: "Boshqa",
    };
    const colors: { [key: string]: string } = {
      kvitansiya: "bg-blue-100 text-blue-800",
      shartnoma: "bg-purple-100 text-purple-800",
      chek: "bg-yellow-100 text-yellow-800",
      boshqa: "bg-gray-100 text-gray-800",
    };
    const label = types[type?.toLowerCase() ?? ""] ?? "Noma'lum";
    const colorClass = colors[type?.toLowerCase() ?? ""] ?? colors["boshqa"];
    return (
      <span>
        <Badge className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium inline-flex items-center", colorClass)}>
          {label}
        </Badge>
      </span>
    );
  };

  const filteredDocuments = useMemo(() => {
    if (!Array.isArray(documents)) return [];
    return documents.filter((doc) =>
      [doc.title, doc.clientName, doc.propertyName, doc.apartmentNumber, doc.type].some((field) =>
        field?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [documents, searchTerm]);

  const paymentOptions = useMemo(() => {
    if (!Array.isArray(payments)) return [];
    return payments.map((p: any) => ({
      value: p.id.toString(),
      label: `${p.user_fio ?? "N/A"} - ${p.apartment_info ?? "N/A"} (${p.payment_type ?? "N/A"}) - ${new Date(p.created_at).toLocaleDateString("us-US")}`,
    }));
  }, [payments]);

  const isAnyFileSelected = !!formData.docx_file || !!formData.pdf_file || !!formData.image;
  const canSave = formData.payment && formData.document_type && isAnyFileSelected;

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <MainNav />
        <div className="relative ml-auto flex-1 md:grow-0">
          <SearchIconLucide className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Sayt bo'ylab qidirish..."
            className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
          />
        </div>
        <UserNav />
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="flex items-center justify-between pt-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Hujjatlar</h2>
          <Dialog
            open={open}
            onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) {
                setFormData({ payment: "", document_type: "", docx_file: null, pdf_file: null, image: null });
                setFormKey(Date.now());
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" disabled={!accessToken}>
                <Plus className="mr-2 h-4 w-4" /> Yangi hujjat
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <form key={formKey} onSubmit={handleSave}>
                <DialogHeader>
                  <DialogTitle>Yangi hujjat qo'shish</DialogTitle>
                  <DialogDescription>Ma'lumotlarni to'ldiring. * majburiy.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] px-1 py-4">
                  <div className="space-y-4 px-1">
                    <div className="space-y-1.5">
                      <Label htmlFor="payment">To‘lov *</Label>
                      <SearchSelect
                        value={formData.payment}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, payment: value }))}
                        options={paymentOptions}
                        placeholder="To‘lovni qidiring yoki tanlang"
                        disabled={isSubmitting || isPaymentsLoading}
                        loading={isPaymentsLoading}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="document_type">Hujjat turi *</Label>
                      <Select
                        value={formData.document_type}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, document_type: value }))}
                        disabled={isSubmitting}
                        required
                      >
                        <SelectTrigger id="document_type">
                          <SelectValue placeholder="Hujjat turini tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kvitansiya">Kvitansiya</SelectItem>
                          <SelectItem value="shartnoma">Shartnoma</SelectItem>
                          <SelectItem value="chek">Chek</SelectItem>
                          <SelectItem value="boshqa">Boshqa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="!mt-5 text-sm font-medium text-muted-foreground">Kamida bitta fayl yuklang *</p>
                    <div className="space-y-3 rounded-md border p-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="docx_file">Docx fayl</Label>
                        <Input
                          id="docx_file"
                          type="file"
                          onChange={(e) => handleFileChange(e, "docx_file")}
                          accept=".doc,.docx"
                          disabled={isSubmitting}
                        />
                        {formData.docx_file && <p className="text-xs text-green-600">Tanlandi: {formData.docx_file.name}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="pdf_file">PDF fayl</Label>
                        <Input
                          id="pdf_file"
                          type="file"
                          onChange={(e) => handleFileChange(e, "pdf_file")}
                          accept=".pdf"
                          disabled={isSubmitting}
                        />
                        {formData.pdf_file && <p className="text-xs text-green-600">Tanlandi: {formData.pdf_file.name}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="image">Rasm</Label>
                        <Input
                          id="image"
                          type="file"
                          onChange={(e) => handleFileChange(e, "image")}
                          accept="image/*"
                          disabled={isSubmitting}
                        />
                        {formData.image && <p className="text-xs text-green-600">Tanlandi: {formData.image.name}</p>}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                    Bekor qilish
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleSaveAndAdd} disabled={isSubmitting || !canSave}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Saqlash va Yangi
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSubmitting || !canSave}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Saqlash
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-4">
              <Input
                placeholder="Hujjatlarni qidirish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
                disabled={loading}
              />
              {loading ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-3" />
                  <span>Hujjatlar yuklanmoqda...</span>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nomi</TableHead>
                        <TableHead>Turi</TableHead>
                        <TableHead>Obyekt</TableHead>
                        <TableHead>Mijoz</TableHead>
                        <TableHead>Xonadon</TableHead>
                        <TableHead>Sana</TableHead>
                        <TableHead className="text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.length > 0 ? (
                        filteredDocuments.map((doc) => (
                          <TableRow key={doc.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{doc.title || "Noma'lum"}</TableCell>
                            <TableCell>{getDocumentTypeLabel(doc.type)}</TableCell>
                            <TableCell>{doc.propertyName}</TableCell>
                            <TableCell>{doc.clientName}</TableCell>
                            <TableCell>{doc.apartmentNumber}</TableCell>
                            <TableCell>{new Date(doc.date).toLocaleDateString("us-US")}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Ko‘rish"
                                  onClick={() => handleViewDetails(doc)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {/* <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Yuklash"
                                  onClick={() => handleDownload(doc)}
                                  disabled={!doc.docx_file_url && !doc.pdf_file_url && !doc.image_file_url}
                                >
                                  <Download className="h-4 w-4" />
                                </Button> */}
                              </div>
                              
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            {searchTerm ? "Qidiruv bo'yicha hujjat topilmadi." : "Hujjatlar mavjud emas."}
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

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Hujjat detallari</DialogTitle>
              <DialogDescription>ID: {selectedDocument?.id}</DialogDescription>
            </DialogHeader>
            {selectedDocument ? (
              <ScrollArea className="max-h-[60vh] py-4">
                <div className="space-y-4">
                  {/* <div>
                    <Label className="font-semibold">Nomi</Label>
                    <div>{selectedDocument.name || "Noma'lum"}</div>
                  </div> */}
                  <div>
                    <Label className="font-semibold">Turi</Label>
                    <div>{getDocumentTypeLabel(selectedDocument.type)}</div>
                  </div>
                  <div>
                    <Label className="font-semibold">To‘lov</Label>
                    <div>{selectedDocument.payment_info}</div>
                  </div>
                  <div>
                    <Label className="font-semibold">Sana</Label>
                    <div>{new Date(selectedDocument.created_at).toLocaleString("us-US")}</div>
                  </div>
                  <div>
                    <Label className="font-semibold">Fayllar</Label>
                    <ul className="list-disc pl-5">
                      {selectedDocument.docx_file_url && (
                        <li>
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDownload(selectedDocument);
                            }}
                            className="text-blue-600 hover:underline"
                          >
                            Docx fayl
                          </a>
                        </li>
                      )}
                      {selectedDocument.pdf_file_url && (
                        <li>
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDownload(selectedDocument);
                            }}
                            className="text-blue-600 hover:underline"
                          >
                            PDF fayl
                          </a>
                        </li>
                      )}
                      {selectedDocument.image_file_url && (
                        <li>
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDownload(selectedDocument);
                            }}
                            className="text-blue-600 hover:underline"
                          >
                            Rasm
                          </a>
                        </li>
                      )}
                      {!selectedDocument.docx_file_url && !selectedDocument.pdf_file_url && !selectedDocument.image_file_url && (
                        <li>Fayllar mavjud emas</li>
                      )}
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div>Yuklanmoqda...</div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailOpen(false)}>
                Yopish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <footer className="border-t py-4 px-4 text-center text-sm text-muted-foreground mt-auto">
                Version 1.0 | Barcha huquqlar ximoyalangan | Ushbu Dastur CDCGroup tomonidan yaratilgan | CraDev Company tomonidan qo'llab quvvatlanadi | since 2019
      </footer>
    </div>
  );
}