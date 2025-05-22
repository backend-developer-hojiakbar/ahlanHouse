import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("us-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString, options = {}) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("us-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  }).format(date)
}

export function formatDateTime(dateString) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("us-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function getStatusColor(status) {
  switch (status) {
    case "available":
      return "bg-blue-500"
    case "reserved":
      return "bg-yellow-500"
    case "sold":
      return "bg-green-500"
    case "paid":
      return "bg-green-500"
    case "pending":
      return "bg-yellow-500"
    case "overdue":
      return "bg-red-500"
    default:
      return "bg-gray-500"
  }
}

export function getStatusText(status) {
  switch (status) {
    case "available":
      return "Bo'sh"
    case "reserved":
      return "Band"
    case "sold":
      return "Sotilgan"
    case "paid":
      return "To'langan"
    case "pending":
      return "Kutilmoqda"
    case "overdue":
      return "Muddati o'tgan"
    default:
      return status
  }
}

export function getExpenseTypeText(type) {
  switch (type) {
    case "construction_materials":
      return "Qurilish materiallari"
    case "labor":
      return "Ishchi kuchi"
    case "equipment":
      return "Jihozlar"
    case "utilities":
      return "Kommunal xizmatlar"
    case "other":
      return "Boshqa"
    default:
      return type
  }
}

export function getDocumentTypeText(type) {
  switch (type) {
    case "contract":
      return "Shartnoma"
    case "payment_schedule":
      return "To'lov jadvali"
    case "acceptance_certificate":
      return "Qabul dalolatnomasi"
    case "invoice":
      return "Hisob-faktura"
    case "other":
      return "Boshqa"
    default:
      return type
  }
}

export function getPaymentTypeText(type) {
  switch (type) {
    case "cash":
      return "Naqd pul"
    case "card":
      return "Karta"
    case "bank_transfer":
      return "Bank o'tkazmasi"
    case "installment":
      return "Bo'lib to'lash"
    default:
      return type
  }
}

export function truncateText(text, maxLength) {
  if (!text) return ""
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "..."
}

export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export function calculateTotalPages(totalItems, itemsPerPage) {
  return Math.ceil(totalItems / itemsPerPage)
}

export function generatePaginationArray(currentPage, totalPages) {
  const delta = 2
  const range = []
  const rangeWithDots = []
  let l

  range.push(1)

  for (let i = currentPage - delta; i <= currentPage + delta; i++) {
    if (i > 1 && i < totalPages) {
      range.push(i)
    }
  }

  range.push(totalPages)

  for (const i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1)
      } else if (i - l !== 1) {
        rangeWithDots.push("...")
      }
    }
    rangeWithDots.push(i)
    l = i
  }

  return rangeWithDots
}

export function downloadCSV(data, filename) {
  if (!data || !data.length) return

  const headers = Object.keys(data[0])
  const csvRows = []

  // Add headers
  csvRows.push(headers.join(","))

  // Add rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header]
      const escaped = ("" + value).replace(/"/g, '\\"')
      return `"${escaped}"`
    })
    csvRows.push(values.join(","))
  }

  const csvString = csvRows.join("\n")
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })

  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", filename || "export.csv")
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function downloadPDF(elementId, filename) {
  // This is a placeholder. In a real app, you would use a library like jsPDF or html2pdf
  console.log(`Downloading PDF of element ${elementId} as ${filename}`)
  alert("PDF yuklab olish funksiyasi hozircha mavjud emas.")
}

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(String(email).toLowerCase())
}

export function validatePhone(phone) {
  // Basic validation for Uzbekistan phone numbers
  const re = /^\+998\s?[0-9]{2}\s?[0-9]{3}\s?[0-9]{2}\s?[0-9]{2}$/
  return re.test(String(phone))
}

export function formatPhoneNumber(phone) {
  if (!phone) return ""

  // Format: +998 XX XXX XX XX
  const cleaned = ("" + phone).replace(/\D/g, "")

  if (cleaned.length < 12) return phone

  const match = cleaned.match(/^(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})$/)

  if (match) {
    return `+${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`
  }

  return phone
}

export function getInitials(name) {
  if (!name) return ""

  const names = name.split(" ")
  if (names.length === 1) return names[0].charAt(0).toUpperCase()

  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
}

export function getRandomColor() {
  const colors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ]

  return colors[Math.floor(Math.random() * colors.length)]
}

export function getContrastColor(hexColor) {
  // If no hex color provided, return black
  if (!hexColor) return "#000000"

  // Convert hex to RGB
  let r = 0,
    g = 0,
    b = 0

  if (hexColor.length === 4) {
    r = Number.parseInt(hexColor[1] + hexColor[1], 16)
    g = Number.parseInt(hexColor[2] + hexColor[2], 16)
    b = Number.parseInt(hexColor[3] + hexColor[3], 16)
  } else if (hexColor.length === 7) {
    r = Number.parseInt(hexColor.substring(1, 3), 16)
    g = Number.parseInt(hexColor.substring(3, 5), 16)
    b = Number.parseInt(hexColor.substring(5, 7), 16)
  }

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return black or white based on luminance
  return luminance > 0.5 ? "#000000" : "#FFFFFF"
}

