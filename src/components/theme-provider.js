// "use client"

// import { createContext, useContext, useEffect, useState } from "react"

// const ThemeContext = createContext({
//   theme: "light",
//   setTheme: () => null,
// })

// export const useTheme = () => useContext(ThemeContext)

// export const ThemeProvider = ({ children, defaultTheme = "light", storageKey = "theme" }) => {
//   const [theme, setTheme] = useState(defaultTheme)

//   useEffect(() => {
//     const savedTheme = localStorage.getItem(storageKey)

//     if (savedTheme) {
//       setTheme(savedTheme)
//     } else {
//       const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
//       setTheme(prefersDark ? "dark" : "light")
//     }
//   }, [storageKey])

//   useEffect(() => {
//     const root = window.document.documentElement

//     root.classList.remove("light", "dark")
//     root.classList.add(theme)

//     localStorage.setItem(storageKey, theme)
//   }, [theme, storageKey])

//   const value = {
//     theme,
//     setTheme: (newTheme) => {
//       setTheme(newTheme)
//     },
//   }

//   return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
// }

