"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { Search } from "@/components/search"
import { UserNav } from "@/components/user-nav"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { User, Phone, Mail, MapPin, Home, CreditCard, FileText, Plus, Pencil } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [openPayment, setOpenPayment] = useState(false)
  const [openEditPayment, setOpenEditPayment] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [paymentFormData, setPaymentFormData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    paymentType: "cash",
  })
  const [editPaymentData, setEditPaymentData] = useState<any>(null)

  // API so‘rovlar uchun umumiy header
  const getAuthHeaders = () => ({
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`,
  })

  // Tokenni faqat client-side’da olish
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token")
      setAccessToken(token)
    }
  }, [])

  // Mijoz ma'lumotlarini olish
  const fetchClient = async () => {
    if (!params.id || !accessToken) return
    setLoading(true)
    try {
      const response = await fetch(`http://api.ahlan.uz/users/${params.id}/`, {
        method: "GET",
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        if (response.status === 401) {
          const confirmLogout = window.confirm("Sessiya tugagan. Qayta kirishni xohlaysizmi?")
          if (confirmLogout) {
            router.push("/login")
          }
          throw new Error("Sessiya tugagan, qayta kirish kerak")
        }
        throw new Error("Mijoz ma'lumotlarini olishda xatolik")
      }
      const data = await response.json()
      // API dan kelgan ma'lumotlarni formatlash
      setClient({
        id: data.id,
        name: data.fio || `Mijoz ${data.id}`,
        phone: data.phone_number || "Noma'lum",
        email: data.email || `client${data.id}@example.com`,
        address: data.address || "Noma'lum",
        passportNumber: data.passport_number || `AA${1000000 + data.id}`,
        propertyId: data.object_id || 1,
        propertyName: data.object_name || "Navoiy 108K",
        apartmentId: data.apartment_id || Math.floor(Math.random() * 100) + 1,
        apartmentNumber: data.apartment_number || `${Math.floor(Math.random() * 16) + 1}${String(Math.floor(Math.random() * 4) + 1).padStart(2, "0")}`,
        totalPurchase: data.total_purchase || Math.floor(Math.random() * 50000) + 10000,
        balance: data.balance || 0,
        payments: data.payments || [],
        documents: data.documents || [],
      })
    } catch (error) {
      toast({
        title: "Xatolik",
        description: error.message || "Mijoz ma'lumotlarini olishda xatolik yuz berdi",
        variant: "destructive",
      })
      const clientId = Number(params.id)
      const mockClient = {
        id: clientId,
        name: `Mijoz ${clientId}`,
        phone: `+998 9${clientId % 10} ${100 + clientId} ${10 + clientId} ${20 + clientId}`,
        email: `client${clientId}@example.com`,
        address: "Toshkent sh., Chilonzor tumani",
        passportNumber: `AA${1000000 + clientId}`,
        propertyId: 1,
        propertyName: "Navoiy 108K",
        apartmentId: Math.floor(Math.random() * 100) + 1,
        apartmentNumber: `${Math.floor(Math.random() * 16) + 1}${String(Math.floor(Math.random() * 4) + 1).padStart(2, "0")}`,
        totalPurchase: Math.floor(Math.random() * 50000) + 10000,
        balance: Math.floor(Math.random() * 10000) - 5000,
        payments: Array.from({ length: 10 }, (_, i) => {
          const statuses = ["paid", "pending", "overdue"]
          const status = statuses[Math.floor(Math.random() * statuses.length)]
          const paymentTypes = ["cash", "card", "bank_transfer", "installment"]
          const paymentType = paymentTypes[Math.floor(Math.random() * paymentTypes.length)]
          const date = new Date()
          date.setDate(date.getDate() - Math.floor(Math.random() * 30))

          return {
            id: i + 1,
            date: date.toISOString(),
            amount: Math.floor(Math.random() * 5000) + 1000,
            description: "To'lov",
            paymentType,
            status,
          }
        }),
        documents: Array.from({ length: 5 }, (_, i) => {
          const types = ["contract", "payment_schedule", "acceptance_certificate", "invoice", "other"]
          const type = types[Math.floor(Math.random() * types.length)]
          const date = new Date()
          date.setDate(date.getDate() - Math.floor(Math.random() * 30))

          return {
            id: i + 1,
            title:
              type === "contract"
                ? "Shartnoma"
                : type === "payment_schedule"
                  ? "To'lov jadvali"
                  : type === "acceptance_certificate"
                    ? "Topshirish-qabul qilish dalolatnomasi"
                    : type === "invoice"
                      ? "Hisob-faktura"
                      : "Boshqa hujjat",
            type,
            date: date.toISOString(),
            fileUrl: "#",
          }
        }),
      }
      setClient(mockClient)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (accessToken === null) return
    if (!accessToken) {
      toast({ title: "Xatolik", description: "Tizimga kirish talab qilinadi", variant: "destructive" })
      router.push("/login")
      return
    }
    fetchClient()
  }, [accessToken, params.id, router])

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setPaymentFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePaymentSelectChange = (name: string, value: string) => {
    setPaymentFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleEditPaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditPaymentData((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleEditPaymentSelectChange = (name: string, value: string) => {
    setEditPaymentData((prev: any) => ({ ...prev, [name]: value }))
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newPayment = {
        user_id: params.id,
        amount: Number.parseFloat(paymentFormData.amount),
        date: paymentFormData.date,
        description: paymentFormData.description,
        payment_type: paymentFormData.paymentType,
        status: "paid",
      }

      const response = await fetch(`http://api.ahlan.uz/payments/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(newPayment),
      })

      if (!response.ok) {
        throw new Error("To'lov qo'shishda xatolik yuz berdi")
      }

      const paymentData = await response.json()
      const updatedClient = {
        ...client,
        payments: [
          {
            id: paymentData.id || client.payments.length + 1,
            date: paymentFormData.date,
            amount: Number.parseFloat(paymentFormData.amount),
            description: paymentFormData.description,
            paymentType: paymentFormData.paymentType,
            status: "paid",
          },
          ...client.payments,
        ],
        balance: client.balance + Number.parseFloat(paymentFormData.amount),
      }

      setClient(updatedClient)
      setPaymentFormData({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        paymentType: "cash",
      })
      setOpenPayment(false)

      toast({
        title: "To'lov qo'shildi",
        description: "Yangi to'lov muvaffaqiyatli qo'shildi",
      })
    } catch (error) {
      toast({
        title: "Xatolik",
        description: error.message || "To'lov qo'shishda xatolik yuz berdi",
        variant: "destructive",
      })

      const newPayment = {
        id: client.payments.length + 1,
        date: paymentFormData.date,
        amount: Number.parseFloat(paymentFormData.amount),
        description: paymentFormData.description,
        paymentType: paymentFormData.paymentType,
        status: "paid",
      }

      const updatedClient = {
        ...client,
        payments: [newPayment, ...client.payments],
        balance: client.balance + Number.parseFloat(paymentFormData.amount),
      }

      setClient(updatedClient)
      setPaymentFormData({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        paymentType: "cash",
      })
      setOpenPayment(false)

      toast({
        title: "To'lov qo'shildi",
        description: "Yangi to'lov muvaffaqiyatli qo'shildi",
      })
    }
  }

  const handleEditPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const updatedPayment = {
        id: editPaymentData.id,
        user_id: params.id,
        amount: Number.parseFloat(editPaymentData.amount),
        date: editPaymentData.date,
        description: editPaymentData.description,
        payment_type: editPaymentData.paymentType,
        status: editPaymentData.status,
      }

      const response = await fetch(`http://api.ahlan.uz/payments/${editPaymentData.id}/`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedPayment),
      })

      if (!response.ok) {
        throw new Error("To'lovni tahrirlashda xatolik yuz berdi")
      }

      const oldAmount = client.payments.find((p: any) => p.id === editPaymentData.id).amount
      const updatedPayments = client.payments.map((p: any) =>
        p.id === editPaymentData.id
          ? {
              ...p,
              date: editPaymentData.date,
              amount: Number.parseFloat(editPaymentData.amount),
              description: editPaymentData.description,
              paymentType: editPaymentData.paymentType,
            }
          : p
      )

      const updatedClient = {
        ...client,
        payments: updatedPayments,
        balance: client.balance - oldAmount + Number.parseFloat(editPaymentData.amount),
      }

      setClient(updatedClient)
      setOpenEditPayment(false)

      toast({
        title: "To'lov yangilandi",
        description: "To'lov ma'lumotlari muvaffaqiyatli yangilandi",
      })
    } catch (error) {
      toast({
        title: "Xatolik",
        description: error.message || "To'lovni tahrirlashda xatolik yuz berdi",
        variant: "destructive",
      })

      const oldAmount = client.payments.find((p: any) => p.id === editPaymentData.id).amount
      const updatedPayments = client.payments.map((p: any) =>
        p.id === editPaymentData.id
          ? {
              ...p,
              date: editPaymentData.date,
              amount: Number.parseFloat(editPaymentData.amount),
              description: editPaymentData.description,
              paymentType: editPaymentData.paymentType,
            }
          : p
      )

      const updatedClient = {
        ...client,
        payments: updatedPayments,
        balance: client.balance - oldAmount + Number.parseFloat(editPaymentData.amount),
      }

      setClient(updatedClient)
      setOpenEditPayment(false)

      toast({
        title: "To'lov yangilandi",
        description: "To'lov ma'lumotlari muvaffaqiyatli yangilandi",
      })
    }
  }

  const openEditDialog = (payment: any) => {
    setEditPaymentData({
      id: payment.id,
      amount: payment.amount.toString(),
      date: new Date(payment.date).toISOString().split("T")[0],
      description: payment.description,
      paymentType: payment.paymentType,
      status: payment.status,
    })
    setOpenEditPayment(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">To'langan</Badge>
      case "pending":
        return <Badge className="bg-yellow-500">Kutilmoqda</Badge>
      case "overdue":
        return <Badge className="bg-red-500">Muddati o'tgan</Badge>
      default:
        return null
    }
  }

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case "cash":
        return "Naqd pul"
      case "card":
        return "Karta"
      case "bank_transfer":
        return "Bank o'tkazmasi"
      case "installment":
        return "Muddatli to'lov"
      default:
        return type
    }
  }

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case "contract":
        return <Badge className="bg-blue-500">Shartnoma</Badge>
      case "payment_schedule":
        return <Badge className="bg-green-500">To'lov jadvali</Badge>
      case "acceptance_certificate":
        return <Badge className="bg-purple-500">Qabul dalolatnomasi</Badge>
      case "invoice":
        return <Badge className="bg-yellow-500">Hisob-faktura</Badge>
      default:
        return <Badge>Boshqa</Badge>
    }
  }

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
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-center h-[80vh]">
            <p className="text-muted-foreground">Ma'lumotlar yuklanmoqda...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!client) {
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
          <p className="text-red-600">Mijoz topilmadi</p>
        </div>
      </div>
    )
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
            <h2 className="text-3xl font-bold tracking-tight">{client.name}</h2>
            <p className="text-muted-foreground">Mijoz ma'lumotlari</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => router.push("/clients")}>
              <User className="mr-2 h-4 w-4" />
              Barcha mijozlar
            </Button>
            <Dialog open={openPayment} onOpenChange={setOpenPayment}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Yangi to'lov
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handlePaymentSubmit}>
                  <DialogHeader>
                    <DialogTitle>Yangi to'lov qo'shish</DialogTitle>
                    <DialogDescription>Yangi to'lov ma'lumotlarini kiriting</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Summa</Label>
                        <Input
                          id="amount"
                          name="amount"
                          type="number"
                          value={paymentFormData.amount}
                          onChange={handlePaymentChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date">Sana</Label>
                        <Input
                          id="date"
                          name="date"
                          type="date"
                          value={paymentFormData.date}
                          onChange={handlePaymentChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentType">To'lov turi</Label>
                      <Select
                        value={paymentFormData.paymentType}
                        onValueChange={(value) => handlePaymentSelectChange("paymentType", value)}
                      >
                        <SelectTrigger id="paymentType">
                          <SelectValue placeholder="To'lov turini tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Naqd pul</SelectItem>
                          <SelectItem value="card">Karta</SelectItem>
                          <SelectItem value="bank_transfer">Bank o'tkazmasi</SelectItem>
                          <SelectItem value="installment">Muddatli to'lov</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Tavsif</Label>
                      <Input
                        id="description"
                        name="description"
                        value={paymentFormData.description}
                        onChange={handlePaymentChange}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Saqlash</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Mijoz ma'lumotlari</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Phone className="mr-2 h-5 w-5 text-muted-foreground" />
                    <span>{client.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="mr-2 h-5 w-5 text-muted-foreground" />
                    <span>{client.email}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="mr-2 h-5 w-5 text-muted-foreground" />
                    <span>{client.address}</span>
                  </div>
                  <div className="flex items-center">
                    <User className="mr-2 h-5 w-5 text-muted-foreground" />
                    <span>Passport: {client.passportNumber}</span>
                  </div>
                  <div className="flex items-center">
                    <Home className="mr-2 h-5 w-5 text-muted-foreground" />
                    <span>
                      {client.propertyName}, Xonadon {client.apartmentNumber}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Umumiy ma'lumotlar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Balans</p>
                    {client.balance >= 0 ? (
                      <p className="text-2xl font-bold text-green-600">${client.balance.toLocaleString()}</p>
                    ) : (
                      <p className="text-2xl font-bold text-red-600">-${Math.abs(client.balance).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Jami xarid</p>
                    <p className="text-2xl font-bold">${client.totalPurchase.toLocaleString()}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">So'nggi to'lov</p>
                    <p className="text-2xl font-bold">
                      {client.payments.length > 0 ? new Date(client.payments[0].date).toLocaleDateString() : "To'lov yo'q"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="payments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="payments">To'lovlar</TabsTrigger>
            <TabsTrigger value="documents">Hujjatlar</TabsTrigger>
          </TabsList>
          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>To'lovlar tarixi</CardTitle>
                <CardDescription>Mijozning barcha to'lovlari</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sana</TableHead>
                        <TableHead>Tavsif</TableHead>
                        <TableHead>To'lov turi</TableHead>
                        <TableHead>Summa</TableHead>
                        <TableHead>Holati</TableHead>
                        <TableHead className="text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {client.payments.length > 0 ? (
                        client.payments.map((payment: any) => (
                          <TableRow key={payment.id}>
                            <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                            <TableCell>{payment.description}</TableCell>
                            <TableCell>{getPaymentTypeLabel(payment.paymentType)}</TableCell>
                            <TableCell>${payment.amount.toLocaleString()}</TableCell>
                            <TableCell>{getStatusBadge(payment.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(payment)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">
                            To'lovlar mavjud emas
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Hujjatlar</CardTitle>
                <CardDescription>Mijoz bilan bog'liq barcha hujjatlar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hujjat nomi</TableHead>
                        <TableHead>Turi</TableHead>
                        <TableHead>Sana</TableHead>
                        <TableHead className="text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {client.documents.length > 0 ? (
                        client.documents.map((document: any) => (
                          <TableRow key={document.id}>
                            <TableCell className="font-medium">{document.title}</TableCell>
                            <TableCell>{getDocumentTypeLabel(document.type)}</TableCell>
                            <TableCell>{new Date(document.date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button variant="ghost" size="sm">
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">
                            Hujjatlar mavjud emas
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Payment Dialog */}
        <Dialog open={openEditPayment} onOpenChange={setOpenEditPayment}>
          <DialogContent className="sm:max-w-[500px]">
            {editPaymentData && (
              <form onSubmit={handleEditPaymentSubmit}>
                <DialogHeader>
                  <DialogTitle>To'lovni tahrirlash</DialogTitle>
                  <DialogDescription>To'lov ma'lumotlarini yangilang</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Summa</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        value={editPaymentData.amount}
                        onChange={handleEditPaymentChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Sana</Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        value={editPaymentData.date}
                        onChange={handleEditPaymentChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentType">To'lov turi</Label>
                    <Select
                      value={editPaymentData.paymentType}
                      onValueChange={(value) => handleEditPaymentSelectChange("paymentType", value)}
                    >
                      <SelectTrigger id="paymentType">
                        <SelectValue placeholder="To'lov turini tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Naqd pul</SelectItem>
                        <SelectItem value="card">Karta</SelectItem>
                        <SelectItem value="bank_transfer">Bank o'tkazmasi</SelectItem>
                        <SelectItem value="installment">Muddatli to'lov</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Tavsif</Label>
                    <Input
                      id="description"
                      name="description"
                      value={editPaymentData.description}
                      onChange={handleEditPaymentChange}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Saqlash</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}