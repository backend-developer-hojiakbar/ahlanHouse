"use client"

import { Badge } from "@/components/ui/badge"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { Plus, FileText, DollarSign } from "lucide-react"

interface PropertyExpensesProps {
  propertyId: number
}

export function PropertyExpenses({ propertyId }: PropertyExpensesProps) {
  const [expenses, setExpenses] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    date: "",
    supplierId: "",
    description: "",
    invoiceNumber: "",
    category: "material",
  })

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      // Generate mock expenses data
      const mockExpenses = Array.from({ length: 10 }, (_, i) => {
        const categories = ["material", "labor", "equipment", "other"]
        const category = categories[Math.floor(Math.random() * categories.length)]
        const amount = 1000 + Math.floor(Math.random() * 9000)
        const date = new Date()
        date.setDate(date.getDate() - Math.floor(Math.random() * 30))

        return {
          id: i + 1,
          propertyId,
          title:
            category === "material"
              ? "Qurilish materiallari"
              : category === "labor"
                ? "Ishchi kuchi"
                : category === "equipment"
                  ? "Jihozlar"
                  : "Boshqa xarajatlar",
          amount,
          date: date.toISOString(),
          supplierId: Math.floor(Math.random() * 5) + 1,
          supplierName: `Yetkazib beruvchi ${Math.floor(Math.random() * 5) + 1}`,
          description: "Xarajat tavsifi",
          invoiceNumber: `INV-${2023}${String(i + 1).padStart(4, "0")}`,
          category,
          isPaid: Math.random() > 0.3,
        }
      })

      // Generate mock suppliers data
      const mockSuppliers = Array.from({ length: 5 }, (_, i) => {
        return {
          id: i + 1,
          name: `Yetkazib beruvchi ${i + 1}`,
          contactPerson: `Aloqa shaxsi ${i + 1}`,
          phone: `+998 9${i} 123 45 67`,
          email: `supplier${i + 1}@example.com`,
        }
      })

      setExpenses(mockExpenses)
      setSuppliers(mockSuppliers)
      setLoading(false)
    }, 1000)
  }, [propertyId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Simulate API call
    setTimeout(() => {
      const newExpense = {
        id: expenses.length + 1,
        propertyId,
        title: formData.title,
        amount: Number.parseFloat(formData.amount),
        date: formData.date,
        supplierId: Number.parseInt(formData.supplierId),
        supplierName: suppliers.find((s) => s.id === Number.parseInt(formData.supplierId))?.name || "",
        description: formData.description,
        invoiceNumber: formData.invoiceNumber,
        category: formData.category,
        isPaid: false,
      }

      setExpenses([newExpense, ...expenses])
      setFormData({
        title: "",
        amount: "",
        date: "",
        supplierId: "",
        description: "",
        invoiceNumber: "",
        category: "material",
      })
      setOpen(false)

      toast({
        title: "Xarajat qo'shildi",
        description: "Yangi xarajat muvaffaqiyatli qo'shildi",
      })
    }, 500)
  }

  const getTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + expense.amount, 0)
  }

  const getTotalPaidExpenses = () => {
    return expenses.filter((e) => e.isPaid).reduce((total, expense) => total + expense.amount, 0)
  }

  const getTotalUnpaidExpenses = () => {
    return expenses.filter((e) => !e.isPaid).reduce((total, expense) => total + expense.amount, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Xarajatlar ma'lumotlari yuklanmoqda...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jami xarajatlar</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${getTotalExpenses().toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">To'langan</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${getTotalPaidExpenses().toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((getTotalPaidExpenses() / getTotalExpenses()) * 100)}% to'langan
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">To'lanmagan</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${getTotalUnpaidExpenses().toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((getTotalUnpaidExpenses() / getTotalExpenses()) * 100)}% to'lanmagan
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="all">Barcha xarajatlar</TabsTrigger>
            <TabsTrigger value="paid">To'langan</TabsTrigger>
            <TabsTrigger value="unpaid">To'lanmagan</TabsTrigger>
          </TabsList>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Yangi xarajat qo'shish
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Yangi xarajat qo'shish</DialogTitle>
                  <DialogDescription>Yangi xarajat ma'lumotlarini kiriting</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Xarajat nomi</Label>
                      <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Summa</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        value={formData.amount}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Sana</Label>
                      <Input id="date" name="date" type="date" value={formData.date} onChange={handleChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Kategoriya</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => handleSelectChange("category", value)}
                      >
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Kategoriyani tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="material">Qurilish materiallari</SelectItem>
                          <SelectItem value="labor">Ishchi kuchi</SelectItem>
                          <SelectItem value="equipment">Jihozlar</SelectItem>
                          <SelectItem value="other">Boshqa xarajatlar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplierId">Yetkazib beruvchi</Label>
                      <Select
                        value={formData.supplierId}
                        onValueChange={(value) => handleSelectChange("supplierId", value)}
                      >
                        <SelectTrigger id="supplierId">
                          <SelectValue placeholder="Yetkazib beruvchini tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id.toString()}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoiceNumber">Hisob-faktura raqami</Label>
                      <Input
                        id="invoiceNumber"
                        name="invoiceNumber"
                        value={formData.invoiceNumber}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="description">Tavsif</Label>
                      <Input id="description" name="description" value={formData.description} onChange={handleChange} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Saqlash</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="all">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hisob-faktura</TableHead>
                    <TableHead>Nomi</TableHead>
                    <TableHead>Sana</TableHead>
                    <TableHead>Yetkazib beruvchi</TableHead>
                    <TableHead className="text-right">Summa</TableHead>
                    <TableHead className="text-center">Holati</TableHead>
                    <TableHead className="text-right">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.invoiceNumber}</TableCell>
                      <TableCell>{expense.title}</TableCell>
                      <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell>{expense.supplierName}</TableCell>
                      <TableCell className="text-right">${expense.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        {expense.isPaid ? (
                          <Badge className="bg-green-500">To'langan</Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-500 border-red-500">
                            To'lanmagan
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paid">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hisob-faktura</TableHead>
                    <TableHead>Nomi</TableHead>
                    <TableHead>Sana</TableHead>
                    <TableHead>Yetkazib beruvchi</TableHead>
                    <TableHead className="text-right">Summa</TableHead>
                    <TableHead className="text-right">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses
                    .filter((e) => e.isPaid)
                    .map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.invoiceNumber}</TableCell>
                        <TableCell>{expense.title}</TableCell>
                        <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                        <TableCell>{expense.supplierName}</TableCell>
                        <TableCell className="text-right">${expense.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unpaid">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hisob-faktura</TableHead>
                    <TableHead>Nomi</TableHead>
                    <TableHead>Sana</TableHead>
                    <TableHead>Yetkazib beruvchi</TableHead>
                    <TableHead className="text-right">Summa</TableHead>
                    <TableHead className="text-right">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses
                    .filter((e) => !e.isPaid)
                    .map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.invoiceNumber}</TableCell>
                        <TableCell>{expense.title}</TableCell>
                        <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                        <TableCell>{expense.supplierName}</TableCell>
                        <TableCell className="text-right">${expense.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

