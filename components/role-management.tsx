"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { toast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Edit, Trash, Shield } from "lucide-react"

export function RoleManagement() {
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: {
      dashboard: {
        view: true,
      },
      properties: {
        view: true,
        create: false,
        edit: false,
        delete: false,
      },
      apartments: {
        view: true,
        create: false,
        edit: false,
        delete: false,
      },
      clients: {
        view: true,
        create: false,
        edit: false,
        delete: false,
      },
      payments: {
        view: true,
        create: false,
        edit: false,
        delete: false,
      },
      documents: {
        view: true,
        create: false,
        edit: false,
        delete: false,
      },
      reports: {
        view: false,
      },
      settings: {
        view: false,
      },
      users: {
        view: false,
        create: false,
        edit: false,
        delete: false,
      },
    },
  })

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      // Generate mock roles data
      const mockRoles = [
        {
          id: 1,
          name: "Administrator",
          description: "Tizimning barcha funksiyalariga to'liq kirish huquqi",
          usersCount: 1,
          permissions: {
            dashboard: { view: true },
            properties: { view: true, create: true, edit: true, delete: true },
            apartments: { view: true, create: true, edit: true, delete: true },
            clients: { view: true, create: true, edit: true, delete: true },
            payments: { view: true, create: true, edit: true, delete: true },
            documents: { view: true, create: true, edit: true, delete: true },
            reports: { view: true },
            settings: { view: true },
            users: { view: true, create: true, edit: true, delete: true },
          },
        },
        {
          id: 2,
          name: "Sotuv bo'limi",
          description: "Sotuvlar va mijozlar bilan ishlash uchun kirish huquqi",
          usersCount: 3,
          permissions: {
            dashboard: { view: true },
            properties: { view: true, create: false, edit: false, delete: false },
            apartments: { view: true, create: false, edit: true, delete: false },
            clients: { view: true, create: true, edit: true, delete: false },
            payments: { view: true, create: true, edit: false, delete: false },
            documents: { view: true, create: true, edit: false, delete: false },
            reports: { view: false },
            settings: { view: false },
            users: { view: false, create: false, edit: false, delete: false },
          },
        },
        {
          id: 3,
          name: "Buxgalter",
          description: "To'lovlar va hisobotlar bilan ishlash uchun kirish huquqi",
          usersCount: 2,
          permissions: {
            dashboard: { view: true },
            properties: { view: true, create: false, edit: false, delete: false },
            apartments: { view: true, create: false, edit: false, delete: false },
            clients: { view: true, create: false, edit: false, delete: false },
            payments: { view: true, create: true, edit: true, delete: false },
            documents: { view: true, create: true, edit: true, delete: false },
            reports: { view: true },
            settings: { view: false },
            users: { view: false, create: false, edit: false, delete: false },
          },
        },
      ]

      setRoles(mockRoles)
      setLoading(false)
    }, 1000)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePermissionChange = (section: string, permission: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [section]: {
          ...prev.permissions[section as keyof typeof prev.permissions],
          [permission]: checked,
        },
      },
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Simulate API call
    setTimeout(() => {
      const newRole = {
        id: roles.length + 1,
        name: formData.name,
        description: formData.description,
        usersCount: 0,
        permissions: formData.permissions,
      }

      setRoles([...roles, newRole])
      setFormData({
        name: "",
        description: "",
        permissions: {
          dashboard: {
            view: true,
          },
          properties: {
            view: true,
            create: false,
            edit: false,
            delete: false,
          },
          apartments: {
            view: true,
            create: false,
            edit: false,
            delete: false,
          },
          clients: {
            view: true,
            create: false,
            edit: false,
            delete: false,
          },
          payments: {
            view: true,
            create: false,
            edit: false,
            delete: false,
          },
          documents: {
            view: true,
            create: false,
            edit: false,
            delete: false,
          },
          reports: {
            view: false,
          },
          settings: {
            view: false,
          },
          users: {
            view: false,
            create: false,
            edit: false,
            delete: false,
          },
        },
      })
      setOpen(false)

      toast({
        title: "Rol qo'shildi",
        description: "Yangi rol muvaffaqiyatli qo'shildi",
      })
    }, 500)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rollar</CardTitle>
        <CardDescription>Tizim rollarini va ruxsatlarini boshqarish</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Shield className="mr-2 h-4 w-4" />
                Yangi rol
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Yangi rol qo'shish</DialogTitle>
                  <DialogDescription>Yangi rol ma'lumotlarini va ruxsatlarini kiriting</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Rol nomi</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Tavsif</Label>
                    <Input
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <Label>Ruxsatlar</Label>

                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-2">Boshqaruv paneli</h4>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="dashboard-view"
                          checked={formData.permissions.dashboard.view}
                          onCheckedChange={(checked) => handlePermissionChange("dashboard", "view", checked as boolean)}
                        />
                        <Label htmlFor="dashboard-view">Ko'rish</Label>
                      </div>
                    </div>

                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-2">Obyektlar</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="properties-view"
                            checked={formData.permissions.properties.view}
                            onCheckedChange={(checked) =>
                              handlePermissionChange("properties", "view", checked as boolean)
                            }
                          />
                          <Label htmlFor="properties-view">Ko'rish</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="properties-create"
                            checked={formData.permissions.properties.create}
                            onCheckedChange={(checked) =>
                              handlePermissionChange("properties", "create", checked as boolean)
                            }
                          />
                          <Label htmlFor="properties-create">Yaratish</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="properties-edit"
                            checked={formData.permissions.properties.edit}
                            onCheckedChange={(checked) =>
                              handlePermissionChange("properties", "edit", checked as boolean)
                            }
                          />
                          <Label htmlFor="properties-edit">Tahrirlash</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="properties-delete"
                            checked={formData.permissions.properties.delete}
                            onCheckedChange={(checked) =>
                              handlePermissionChange("properties", "delete", checked as boolean)
                            }
                          />
                          <Label htmlFor="properties-delete">O'chirish</Label>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-2">Xonadonlar</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="apartments-view"
                            checked={formData.permissions.apartments.view}
                            onCheckedChange={(checked) =>
                              handlePermissionChange("apartments", "view", checked as boolean)
                            }
                          />
                          <Label htmlFor="apartments-view">Ko'rish</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="apartments-create"
                            checked={formData.permissions.apartments.create}
                            onCheckedChange={(checked) =>
                              handlePermissionChange("apartments", "create", checked as boolean)
                            }
                          />
                          <Label htmlFor="apartments-create">Yaratish</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="apartments-edit"
                            checked={formData.permissions.apartments.edit}
                            onCheckedChange={(checked) =>
                              handlePermissionChange("apartments", "edit", checked as boolean)
                            }
                          />
                          <Label htmlFor="apartments-edit">Tahrirlash</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="apartments-delete"
                            checked={formData.permissions.apartments.delete}
                            onCheckedChange={(checked) =>
                              handlePermissionChange("apartments", "delete", checked as boolean)
                            }
                          />
                          <Label htmlFor="apartments-delete">O'chirish</Label>
                        </div>
                      </div>
                    </div>

                    {/* Other permissions sections would follow the same pattern */}
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
            <p className="text-muted-foreground">Rollar ma'lumotlari yuklanmoqda...</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rol nomi</TableHead>
                  <TableHead>Tavsif</TableHead>
                  <TableHead>Foydalanuvchilar</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>{role.description}</TableCell>
                    <TableCell>{role.usersCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled={role.id === 1}>
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

