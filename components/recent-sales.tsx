"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function RecentSales({ extended = false }: { extended?: boolean }) {
  const sales = [
    {
      name: "Abdullayev Jasur",
      email: "jasur@example.com",
      amount: "$45,230",
      property: "Navoiy 108K",
      apartment: "1201",
      date: "12.05.2023",
    },
    {
      name: "Karimova Nilufar",
      email: "nilufar@example.com",
      amount: "$32,500",
      property: "Navoiy 108L",
      apartment: "1105",
      date: "10.05.2023",
    },
    {
      name: "Rahimov Bobur",
      email: "bobur@example.com",
      amount: "$38,900",
      property: "Baqachorsu",
      apartment: "1402",
      date: "08.05.2023",
    },
    {
      name: "Umarova Malika",
      email: "malika@example.com",
      amount: "$42,700",
      property: "Navoiy 108K",
      apartment: "1304",
      date: "05.05.2023",
    },
    {
      name: "Ismoilov Sardor",
      email: "sardor@example.com",
      amount: "$35,600",
      property: "Baqachorsu",
      apartment: "1203",
      date: "03.05.2023",
    },
    {
      name: "Ahmedova Ziyoda",
      email: "ziyoda@example.com",
      amount: "$39,800",
      property: "Navoiy 108L",
      apartment: "1102",
      date: "01.05.2023",
    },
    {
      name: "Toshmatov Alisher",
      email: "alisher@example.com",
      amount: "$41,200",
      property: "Navoiy 108K",
      apartment: "1405",
      date: "28.04.2023",
    },
    {
      name: "Yusupova Dilnoza",
      email: "dilnoza@example.com",
      amount: "$36,900",
      property: "Baqachorsu",
      apartment: "1301",
      date: "25.04.2023",
    },
    {
      name: "Qodirov Jahongir",
      email: "jahongir@example.com",
      amount: "$43,500",
      property: "Navoiy 108L",
      apartment: "1204",
      date: "22.04.2023",
    },
    {
      name: "Saidova Gulnora",
      email: "gulnora@example.com",
      amount: "$37,800",
      property: "Navoiy 108K",
      apartment: "1103",
      date: "20.04.2023",
    },
  ]

  const displaySales = extended ? sales : sales.slice(0, 5)

  return (
    <div className="space-y-8">
      {displaySales.map((sale, index) => (
        <div key={index} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarImage src={`/placeholder.svg?height=36&width=36&text=${sale.name.charAt(0)}`} alt={sale.name} />
            <AvatarFallback>{sale.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{sale.name}</p>
            <p className="text-sm text-muted-foreground">{sale.email}</p>
            {extended && (
              <div className="flex space-x-2 text-xs text-muted-foreground">
                <span>{sale.property}</span>
                <span>•</span>
                <span>Xonadon {sale.apartment}</span>
                <span>•</span>
                <span>{sale.date}</span>
              </div>
            )}
          </div>
          <div className="ml-auto font-medium">{sale.amount}</div>
        </div>
      ))}
    </div>
  )
}

