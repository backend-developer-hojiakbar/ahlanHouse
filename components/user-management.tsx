"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash, UserPlus, Search } from "lucide-react"

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    roleId: "",
  })

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      // Generate mock roles data
      const mockRoles = [
        { id: 1, name: "Administrator" },
        { id: 2, name: "Sotuv bo'limi" },
        { id: 3, name: "Buxgalter" },
      ]

      // Generate mock users data
      const mockUsers = [
        {
          id: 1,
          name: "Admin User",
          email: "admin@ahlanhouse.uz",
          phone: "+998 90 123 45 67",
          roleId: 1,
          roleName: "Administrator",
          lastLogin: new Date().toISOString(),
        },
        {
          id: 2,
          name: "Sales User",
          email: "sales@ahlanhouse.uz",
          phone: "+998 91 234 56 78",
          roleId: 2,
          roleName: "Sotuv bo'limi",
          lastLogin: new Date().toISOString(),
        },
        {
          id: 3,
          name: "Accountant User",
          email: "accountant@ahlanhouse.uz",
          phone: "+998 93 345 67 89",
          roleId: 3,
          roleName: "Buxgalter",
          lastLogin: new Date().toISOString(),
        },
      ]

      setRoles(mockRoles)
      setUsers(mockUsers)
      setLoading(false)
    }, 1000)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const roleName = roles.find((r) => r.id === Number.parseInt(formData.roleId))?.name || ""

      const newUser = {
        id: users.length + 1,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        roleId: Number.parseInt(formData.roleId),
        roleName,
        lastLogin: new Date().toISOString(),
      }

      setUsers([...users, newUser])
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        roleId: "",
      })
      setOpen(false)

      toast({
        title: "Foydalanuvchi qo'shildi",
        description: "Yangi foydalanuvchi muvaffaqiyatli qo'shildi",
      })
    }, 500)
  }

  const filteredUsers = users.filter((user) => {
    if (
      searchTerm &&
      !user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !user.email.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !user.phone.includes(searchTerm)
    ) {
      return false
    }
    return true
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Foydalanuvchilar</CardTitle>
        <CardDescription>Tizim foydalanuvchilarini boshqarish</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Qidirish..."
                className="pl-8 w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>
              Tozalash
            </Button>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Yangi foydalanuvchi
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Yangi foydalanuvchi qo'shish</DialogTitle>
                  <DialogDescription>Yangi foydalanuvchi ma'lumotlarini kiriting</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">F.I.O.</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon</Label>
                      <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Parol</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roleId">Rol</Label>
                    <Select
                      value={formData.roleId}
                      onValueChange={(value) => handleSelectChange("roleId", value)}
                      required
                    >
                      <SelectTrigger id="roleId">
                        <SelectValue placeholder="Rolni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Saqlash</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-muted-foreground">Foydalanuvchilar ma'lumotlari yuklanmoqda...</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>F.I.O.</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>So'nggi kirish</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.roleName}</Badge>
                    </TableCell>
                    <TableCell>{new Date(user.lastLogin).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

