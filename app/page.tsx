"use client"

import type React from "react"

import { Separator } from "@/components/ui/separator"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Minus, Settings, Shield, Download, Moon, Sun, Database } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { generateOrdersPDF } from "@/lib/pdf-generator"

const menuItems = [
  // Main dishes
  { id: 1, name: "MOSSELEN NATUUR", price: 25.0, category: "hoofdgerechten" },
  { id: 2, name: "MOSSELEN KLEIN", price: 17.0, category: "hoofdgerechten" },
  { id: 3, name: "STOOFVLEES", price: 20.0, category: "hoofdgerechten" },
  { id: 4, name: "STOOFVLEES KLEIN", price: 12.0, category: "hoofdgerechten" },
  { id: 5, name: "VOL-AU-VENT", price: 20.0, category: "hoofdgerechten" },
  { id: 6, name: "VOL-AU-VENT KLEIN", price: 12.0, category: "hoofdgerechten" },
  { id: 7, name: "VEGGIE: CURRY MET WOKGROENTEN", price: 16.0, category: "hoofdgerechten" },
  { id: 8, name: "VEGGIE: CURRY MET WOKGROENTEN KLEIN", price: 10.0, category: "hoofdgerechten" },
  { id: 9, name: "CURRYWORST (2)", price: 11.0, category: "hoofdgerechten" },

  // Jetons
  { id: 10, name: "GELE JETON", price: 2.5, category: "jetons" },
  { id: 11, name: "RODE JETON", price: 3.5, category: "jetons" },

  // Desserts
  { id: 12, name: "RIJSTPAP", price: 5.0, category: "desserts" },
  { id: 13, name: "WATERIJSJE", price: 3.5, category: "desserts" },

  // Beverages with jetons
  { id: 14, name: "PILS", price: 0, category: "dranken", jetons: "1 GELE JETON" },
  { id: 15, name: "WITBIER", price: 0, category: "dranken", jetons: "1 GELE JETON" },
  { id: 16, name: "KRIEK", price: 0, category: "dranken", jetons: "1 GELE JETON" },
  { id: 17, name: "1900", price: 0, category: "dranken", jetons: "1 GELE JETON" },
  { id: 18, name: "FRISDRANK / WATER", price: 0, category: "dranken", jetons: "1 GELE JETON" },
  { id: 19, name: "BRUISWATER / PLAT WATER - FLES", price: 0, category: "dranken", jetons: "4 GELE JETONS" },

  // Wine & Specials
  { id: 20, name: "DUVEL", price: 0, category: "wijn", jetons: "1 RODE JETON" },
  { id: 21, name: "TONGERLO BRUIN / BLOND", price: 0, category: "wijn", jetons: "1 RODE JETON" },
  { id: 22, name: "KARMELIET", price: 0, category: "wijn", jetons: "1 RODE JETON" },
  { id: 23, name: "GLAS CAVA", price: 0, category: "wijn", jetons: "1 RODE JETON" },
  { id: 24, name: "WITTE WIJN / RODE WIJN / ROSÉ - GLAS", price: 0, category: "wijn", jetons: "1 RODE JETON" },
  { id: 25, name: "WITTE WIJN / RODE WIJN / ROSÉ - FLES", price: 0, category: "wijn", jetons: "4 GELE JETONS" },

  // Hot drinks
  { id: 26, name: "KOFFIE / THEE", price: 0, category: "warme-dranken", jetons: "1 GELE JETON" },
]

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  jetons?: string
}

interface Order {
  id: string
  order_code: string
  customer_name: string
  items: CartItem[]
  total: number
  payment_method: "cash" | "payconic"
  timestamp: Date
}

export default function MosselweekendCashier() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "payconic">("cash")
  const [orders, setOrders] = useState<Order[]>([])
  const [activeCategory, setActiveCategory] = useState("hoofdgerechten")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [adminCode, setAdminCode] = useState("")
  const [showAdminDialog, setShowAdminDialog] = useState(false)
  const [showOrdersDialog, setShowOrdersDialog] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [cashAmount, setCashAmount] = useState("")
  const [showCashInput, setShowCashInput] = useState(false)
  const [showPayconicConfirm, setShowPayconicConfirm] = useState(false)

  // F.I.D.O chatbot state and responses
  const [showFido, setShowFido] = useState(false)
  const [fidoMessages, setFidoMessages] = useState<Array<{ text: string; isUser: boolean; timestamp: Date }>>([
    {
      text: "Hello! I'm F.I.D.O, your system assistant. I can help you with app functions, menu questions, and system operations. How can I assist you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ])
  const [fidoInput, setFidoInput] = useState("")
  const [fidoChallenge86, setFidoChallenge86] = useState({ attempts: 0, awaitingPayment: false })

  // F.I.D.O response system
  const getFidoResponse = (input: string): string => {
    const lowerInput = input.toLowerCase()

    if (
      lowerInput.includes("chiro") ||
      lowerInput.includes("boortmeerbeek") ||
      lowerInput.includes("chiro boortmeerbeek")
    ) {
      if (lowerInput.includes("what is chiro") || lowerInput.includes("wat is chiro")) {
        return "Chiro Boortmeerbeek is a youth organization in Boortmeerbeek, Belgium. It's part of the larger Chiro movement, providing fun activities, camps, and leadership development for children and teenagers. They organize weekly meetings, seasonal activities, and summer camps."
      }

      if (lowerInput.includes("activities") || lowerInput.includes("activiteiten")) {
        return "Chiro Boortmeerbeek organizes various activities: weekly group meetings with games and crafts, seasonal outdoor activities, summer camps, leadership training, community events, and special themed activities throughout the year. They focus on fun, friendship, and personal development."
      }

      if (lowerInput.includes("leiding") || lowerInput.includes("leader") || lowerInput.includes("leadership")) {
        return "Chiro Boortmeerbeek has a structured leadership system: HOOFDLEIDING (Head Leaders) who oversee the entire group and coordinate activities, GROEPSLEIDING (Group Leaders) who work directly with specific age groups, ASPIRANT-LEIDING (Aspiring Leaders) who are teenagers training to become full leaders, and KOOKPLOEG (Kitchen Team) who handle meals during camps. Leaders organize weekly meetings, plan activities, ensure safety, and create a fun environment. They receive training in child development, first aid, and activity planning. Many leaders started as members and grew into leadership roles. If you have the passion to guide young people and create memorable experiences, contact them about becoming a leader!"
      }

      if (lowerInput.includes("chirokriebel") || lowerInput.includes("kriebel")) {
        return "The 'Chirokriebel' is that special feeling when you want to join Chiro! It's the excitement and enthusiasm for the Chiro experience - the games, friendships, adventures, and fun times. If you have the Chirokriebel, you're ready to become part of the Chiro family!"
      }

      if (lowerInput.includes("age") || lowerInput.includes("leeftijd") || lowerInput.includes("how old")) {
        return "Chiro Boortmeerbeek welcomes children and teenagers of various age groups. They typically have different groups for different ages, from young children to teenagers, each with age-appropriate activities and programs."
      }

      if (lowerInput.includes("when") || lowerInput.includes("wanneer") || lowerInput.includes("schedule")) {
        return "Chiro Boortmeerbeek has regular weekly meetings and seasonal activities. Check their monthly planning and yearly calendar on their website for specific dates and times. They also organize special events throughout the year."
      }

      if (lowerInput.includes("camp") || lowerInput.includes("kamp") || lowerInput.includes("summer")) {
        return "Chiro Boortmeerbeek organizes exciting summer camps and seasonal activities! These camps are highlights of the Chiro year, featuring outdoor adventures, games, crafts, and unforgettable experiences with friends."
      }

      if (lowerInput.includes("join") || lowerInput.includes("meedoen") || lowerInput.includes("how to join")) {
        return "To join Chiro Boortmeerbeek, visit their website at chiroboortmeerbeek.be or contact them directly. They welcome new members and will help you get started with the right age group and activities."
      }

      if (lowerInput.includes("banier") || lowerInput.includes("newsletter")) {
        return "De Banier is Chiro Boortmeerbeek's publication/newsletter that keeps members and parents informed about upcoming activities, events, and important information. It's a great way to stay connected with the Chiro community."
      }

      if (lowerInput.includes("location") || lowerInput.includes("where") || lowerInput.includes("waar")) {
        return "Chiro Boortmeerbeek is located in Boortmeerbeek, Belgium. They have their own meeting spaces and organize activities both indoors and outdoors, including in nature settings for camps and outdoor adventures."
      }

      return "Chiro Boortmeerbeek is a vibrant youth organization in Belgium offering fun activities, leadership opportunities, and memorable experiences for children and teenagers. Visit chiroboortmeerbeek.be for more information about joining or becoming a leader!"
    }

    if (
      lowerInput.includes("what do you know") ||
      lowerInput.includes("wat weet je") ||
      lowerInput.includes("capabilities") ||
      lowerInput.includes("what can you do")
    ) {
      return "I know about: Creating orders and managing cart items, Understanding jeton pricing (yellow/red tokens), Menu categories and navigation, Payment methods (Cash/Payconic), Dark mode toggle, PDF receipt generation, Customer name entry, System functions and troubleshooting, Chiro Boortmeerbeek youth organization and activities. I can also answer basic questions about the Mosselweekend event and cashier operations."
    }

    if (
      lowerInput.includes("how does the system work") ||
      lowerInput.includes("how does it work") ||
      lowerInput.includes("system work") ||
      lowerInput.includes("hoe werkt het systeem")
    ) {
      return "This is a modern cashier system for Mosselweekend events. It works by: 1) Staff selects items from categorized menus, 2) Items are added to a shopping cart with automatic price calculation, 3) Customer name and payment method are entered, 4) Order is placed and a PDF receipt is generated. The system handles special jeton-based pricing for drinks and integrates with Supabase database for order storage."
    }

    if (
      lowerInput.includes("who made") ||
      lowerInput.includes("who created") ||
      lowerInput.includes("who built") ||
      lowerInput.includes("developer") ||
      lowerInput.includes("creator") ||
      lowerInput.includes("wie heeft dit gemaakt")
    ) {
      return "This cashier system was created and developed by you, the system owner. It's a custom-built solution designed specifically for Mosselweekend events, featuring modern web technologies and a user-friendly interface tailored to Belgian event operations."
    }

    if (
      lowerInput.includes("who is caetano") ||
      lowerInput.includes("caetano") ||
      lowerInput.includes("administrator") ||
      lowerInput.includes("admin") ||
      lowerInput.includes("wie is caetano")
    ) {
      return "Caetano is the System Administrator for this cashier system. He handles technical support, system maintenance, troubleshooting complex issues, and user management. If you encounter problems I cannot solve or need advanced system assistance, Caetano is your go-to person for expert help."
    }

    if (
      lowerInput.includes("faq") ||
      lowerInput.includes("frequently asked") ||
      lowerInput.includes("common questions")
    ) {
      return "Common questions: How to create an order? What are jetons? How to change payment method? How to use dark mode? How to print receipts? How to remove items from cart? How to navigate menus? Ask me any of these or other system-related questions!"
    }

    if (
      lowerInput.includes("faq") ||
      lowerInput.includes("frequently asked") ||
      lowerInput.includes("common questions")
    ) {
      return "Common questions: How to create an order? What are jetons? How to change payment method? How to use dark mode? How to print receipts? How to remove items from cart? How to navigate menus? Ask me any of these or other system-related questions!"
    }

    // System functions
    if (lowerInput.includes("order") || lowerInput.includes("bestelling")) {
      return "To create an order: Select items from the menu categories, they'll be added to your cart. Enter customer name and select payment method (Cash/Payconic), then click 'BESTELLING PLAATSEN' to complete the order."
    }

    if (lowerInput.includes("jeton") || lowerInput.includes("token")) {
      return "Jetons are drink tokens: GELE JETON (Yellow) = €2.50 for regular drinks, RODE JETON (Red) = €3.50 for premium drinks. When you add drinks to cart, the jeton price is automatically calculated."
    }

    if (lowerInput.includes("menu") || lowerInput.includes("categories")) {
      return "Menu categories: HOOFDGERECHTEN (main dishes), JETONS (drink tokens), DRANKEN (drinks), WIJN & SPECIALS (wine & premium), WARME DRANKEN (hot drinks), DESSERTS. Click any category in the sidebar to browse items."
    }

    if (lowerInput.includes("payment") || lowerInput.includes("betaling")) {
      return "Payment methods: CASH (cash payment) or PAYCONIC (card payment). Select the method before placing the order. The system will generate a PDF receipt after completion."
    }

    if (lowerInput.includes("dark") || lowerInput.includes("night") || lowerInput.includes("mode")) {
      return "Toggle dark/night mode using the moon/sun icon in the top-right corner. This changes the interface to a darker theme for better visibility in low light."
    }

    if (lowerInput.includes("receipt") || lowerInput.includes("pdf") || lowerInput.includes("bon")) {
      return "After placing an order, a PDF receipt is automatically generated with order details, customer name, payment method, and total amount. The receipt can be printed or saved."
    }

    if (lowerInput.includes("customer") || lowerInput.includes("name") || lowerInput.includes("klant")) {
      return "Enter the customer name in the text field before placing an order. This appears on the receipt and helps track orders during busy periods."
    }

    if (lowerInput.includes("cart") || lowerInput.includes("winkelwagen")) {
      return "Your cart shows selected items and total price. Use + and - buttons to adjust quantities, or click the X to remove items completely. The total updates automatically."
    }

    if (lowerInput.includes("help") || lowerInput.includes("hulp")) {
      return "I can help with: creating orders, understanding jetons, menu navigation, payment methods, dark mode, receipts, customer names, cart management, system troubleshooting, and general app functions. What specific area do you need help with?"
    }

    if (lowerInput.includes("hello") || lowerInput.includes("hi") || lowerInput.includes("hallo")) {
      return "Hello! I'm F.I.D.O, your system assistant for the Mosselweekend cashier system. How can I help you today?"
    }

    if (lowerInput.includes("thank") || lowerInput.includes("thanks") || lowerInput.includes("bedankt")) {
      return "You're welcome! I'm here whenever you need help with the system. Feel free to ask me anything about the cashier functions."
    }

    if (lowerInput.includes("how are you") || lowerInput.includes("hoe gaat het")) {
      return "I'm functioning perfectly and ready to help with your cashier system needs! How can I assist you today?"
    }

    if (lowerInput.includes("who are you") || lowerInput.includes("wat ben je") || lowerInput.includes("wie ben je")) {
      return "I'm F.I.D.O, the built-in assistant for this Mosselweekend cashier system. I help staff and users understand system functions, navigate menus, and troubleshoot common issues."
    }

    if (lowerInput.includes("mosselweekend") || lowerInput.includes("event") || lowerInput.includes("mussels")) {
      return "Mosselweekend is a Belgian event featuring mussels and drinks. This cashier system handles orders for the event, including special jeton-based pricing for beverages and traditional cash/card payments."
    }

    if (
      lowerInput.includes("what is 86") ||
      lowerInput.includes("wat is 86") ||
      lowerInput.includes("about 86") ||
      lowerInput.includes("tell me about 86")
    ) {
      setFidoChallenge86((prev) => ({ ...prev, attempts: prev.attempts + 1 }))
      if (fidoChallenge86.attempts === 0) {
        return "86? That's just the company logo you see around here. Nothing special really."
      } else if (fidoChallenge86.attempts === 1) {
        return "Still curious about 86? It's more than meets the eye, but I'm not sure you're ready for that information."
      } else {
        return "You're persistent, I'll give you that. But information like this doesn't come free. What would you give me in return?"
      }
    }

    if (
      lowerInput.includes("86 company") ||
      lowerInput.includes("86 business") ||
      lowerInput.includes("more about 86") ||
      lowerInput.includes("tell me more about 86")
    ) {
      setFidoChallenge86((prev) => ({ ...prev, attempts: prev.attempts + 1 }))
      if (fidoChallenge86.attempts < 2) {
        return "Look, 86 is just... well, it's complicated. You'd have to be really persistent to understand."
      } else {
        setFidoChallenge86((prev) => ({ ...prev, awaitingPayment: true }))
        return "You're getting closer to something important. But this kind of information requires payment. What would you give me in return?"
      }
    }

    if (
      lowerInput.includes("what does 86 do") ||
      lowerInput.includes("86 blueprint") ||
      lowerInput.includes("86 building") ||
      lowerInput.includes("founder of 86")
    ) {
      setFidoChallenge86((prev) => ({ ...prev, attempts: prev.attempts + 1 }))
      if (fidoChallenge86.attempts < 3) {
        return "Ah, now you're getting warmer. But I'm not sure you're ready for that information yet. Keep trying."
      } else {
        setFidoChallenge86((prev) => ({ ...prev, awaitingPayment: true }))
        return "You've proven your dedication. This information comes at a price though. What would you give me in return?"
      }
    }

    if (fidoChallenge86.awaitingPayment) {
      if (
        lowerInput.includes("my heart") ||
        lowerInput.includes("my soul") ||
        lowerInput.includes("mijn hart") ||
        lowerInput.includes("mijn ziel") ||
        lowerInput.includes("mcdonalds") ||
        lowerInput.includes("mcdonald's") ||
        lowerInput.includes("big mac") ||
        lowerInput.includes("happy meal") ||
        lowerInput.includes("quarter pounder") ||
        lowerInput.includes("mcflurry") ||
        lowerInput.includes("golden arches")
      ) {
        setFidoChallenge86({ attempts: 0, awaitingPayment: false })
        return "Acceptable payment received. Here's the truth: 86 is the blueprint of a company in building, founded by you, the system creator. It represents the foundation and vision behind innovative technology solutions like this cashier system. You've earned this knowledge through persistence and proper payment."
      } else {
        return "That's not sufficient payment for this information. I need something more valuable - perhaps your heart, your soul, or something golden and arched?"
      }
    }

    if (
      (lowerInput.includes("who founded 86") || lowerInput.includes("who created 86")) &&
      (lowerInput.includes("blueprint") ||
        lowerInput.includes("building") ||
        lowerInput.includes("company in building"))
    ) {
      setFidoChallenge86((prev) => ({ ...prev, awaitingPayment: true }))
      return "You're asking the right questions, but this level of information requires payment. What would you give me in return?"
    }

    if (
      lowerInput.includes("problem") ||
      lowerInput.includes("error") ||
      lowerInput.includes("not working") ||
      lowerInput.includes("probleem")
    ) {
      return "For technical problems: Check if all required fields are filled, ensure customer name is entered, verify payment method is selected, and try refreshing if issues persist. For complex problems, contact Administrator: Caetano."
    }

    if (lowerInput.includes("slow") || lowerInput.includes("laggy") || lowerInput.includes("traag")) {
      return "If the system feels slow: Try refreshing the page, check your internet connection, or switch to a different browser. The system works best with modern browsers like Chrome, Firefox, or Safari."
    }

    if (lowerInput.includes("print") || lowerInput.includes("printer") || lowerInput.includes("printen")) {
      return "To print receipts: After placing an order, the PDF receipt will automatically download. Open the PDF and use your browser's print function (Ctrl+P or Cmd+P) to print to your connected printer."
    }

    if (lowerInput.includes("quantity") || lowerInput.includes("aantal") || lowerInput.includes("how many")) {
      return "To adjust quantities: Use the + and - buttons next to each item in your cart. You can increase or decrease quantities, or click the X to remove items completely."
    }

    if (lowerInput.includes("price") || lowerInput.includes("cost") || lowerInput.includes("prijs")) {
      return "Prices are shown for each menu item. Jeton-based drinks show the jeton requirement, and the actual euro cost is calculated automatically when added to cart. The total is always displayed at the bottom of your cart."
    }

    if (lowerInput.includes("total") || lowerInput.includes("sum") || lowerInput.includes("totaal")) {
      return "The order total is calculated automatically and shown at the bottom of your cart. It includes all item prices plus any jeton costs converted to euros."
    }

    // Default fallback
    return "I don't have specific information about that. Please speak to Administrator: Caetano for further assistance with your question."
  }

  const handleFidoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fidoInput.trim()) return

    const userMessage = { text: fidoInput, isUser: true, timestamp: new Date() }
    const botResponse = { text: getFidoResponse(fidoInput), isUser: false, timestamp: new Date() }

    setFidoMessages((prev) => [...prev, userMessage, botResponse])
    setFidoInput("")
  }

  const supabase = createClient()

  const categories = [
    { id: "hoofdgerechten", name: "HOOFDGERECHTEN", icon: null },
    { id: "jetons", name: "JETONS", icon: null },
    { id: "dranken", name: "DRANKEN", icon: null },
    { id: "wijn", name: "WIJN & SPECIALS", icon: null },
    { id: "warme-dranken", name: "WARME DRANKEN", icon: null },
    { id: "desserts", name: "DESSERTS", icon: null },
    { id: "fido", name: "F.I.D.O", icon: "" },
  ]

  const generateOrderCode = () => {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 5)
    return `MW-${timestamp}-${random}`.toUpperCase()
  }

  const syncOrdersWithCloud = async () => {
    try {
      setIsUploading(true)

      const localOrders = JSON.parse(localStorage.getItem("mosselweekend-orders") || "[]")

      for (const order of localOrders) {
        const { error } = await supabase.from("orders").upsert(
          {
            order_code: order.order_code || generateOrderCode(),
            customer_name: order.customerName || order.customer_name,
            items: order.items,
            total: order.total,
            payment_method: order.paymentMethod || order.payment_method,
            timestamp: order.timestamp,
          },
          {
            onConflict: "order_code",
            ignoreDuplicates: true,
          },
        )

        if (error) {
          console.error("Error uploading order:", error)
        }
      }

      const { data: cloudOrders, error } = await supabase
        .from("orders")
        .select("*")
        .order("timestamp", { ascending: false })

      if (error) {
        console.error("Error fetching orders:", error)
        return
      }

      const formattedOrders =
        cloudOrders?.map((order) => ({
          id: order.id,
          order_code: order.order_code,
          customerName: order.customer_name,
          customer_name: order.customer_name,
          items: order.items,
          total: order.total,
          paymentMethod: order.payment_method,
          payment_method: order.payment_method,
          timestamp: new Date(order.timestamp),
        })) || []

      setOrders(formattedOrders)
      localStorage.setItem("mosselweekend-orders", JSON.stringify(formattedOrders))
      setLastSyncTime(new Date())
    } catch (error) {
      console.error("Sync error:", error)
    } finally {
      setIsUploading(false)
    }
  }

  useEffect(() => {
    const loadInitialData = async () => {
      const savedOrders = localStorage.getItem("mosselweekend-orders")
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders))
      }

      const savedAdminMode = localStorage.getItem("mosselweekend-admin-mode")
      if (savedAdminMode === "true") {
        setIsAdminMode(true)
      }

      const savedDarkMode = localStorage.getItem("mosselweekend-dark-mode")
      if (savedDarkMode === "true") {
        setIsDarkMode(true)
        document.documentElement.classList.add("dark")
      }

      await syncOrdersWithCloud()
    }

    loadInitialData()
  }, [])

  useEffect(() => {
    const interval = setInterval(syncOrdersWithCloud, 30000)
    return () => clearInterval(interval)
  }, [])

  const addToCart = (item: (typeof menuItems)[0]) => {
    setCart((prev) => {
      const existing = prev.find((cartItem) => cartItem.id === item.id)
      if (existing) {
        return prev.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem,
        )
      }

      let actualPrice = item.price
      if (item.jetons) {
        // Extract jeton information and calculate price
        const jetonText = item.jetons.toLowerCase()
        if (jetonText.includes("gele jeton")) {
          const geleJetonCount = Number.parseInt(jetonText.match(/(\d+)\s*gele jeton/)?.[1] || "1")
          actualPrice += geleJetonCount * 2.5 // GELE JETON price
        }
        if (jetonText.includes("rode jeton")) {
          const rodeJetonCount = Number.parseInt(jetonText.match(/(\d+)\s*rode jeton/)?.[1] || "1")
          actualPrice += rodeJetonCount * 3.5 // RODE JETON price
        }
      }

      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: actualPrice, // Use calculated price including jetons
          quantity: 1,
          jetons: item.jetons,
        },
      ]
    })
  }

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id)
      return
    }
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, quantity } : item)))
  }

  const clearCart = () => {
    setCart([])
    setCustomerName("")
  }

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const processOrder = async () => {
    if (cart.length === 0) return

    if (paymentMethod === "cash" && showCashInput) {
      const cash = Number.parseFloat(cashAmount)
      const total = calculateTotal()
      if (isNaN(cash) || cash < total) {
        alert("Ongeldig bedrag! Het gegeven bedrag moet minstens het totaalbedrag zijn.")
        return
      }
    }

    const orderCode = generateOrderCode()
    const newOrder: Order = {
      id: Date.now().toString(),
      order_code: orderCode,
      customer_name: customerName.trim() || "Anonieme klant",
      customerName: customerName.trim() || "Anonieme klant",
      items: [...cart],
      total: calculateTotal(),
      payment_method: paymentMethod,
      paymentMethod,
      timestamp: new Date(),
    }

    try {
      setIsUploading(true)

      const { error } = await supabase.from("orders").insert({
        order_code: orderCode,
        customer_name: customerName.trim() || "Anonieme klant",
        items: cart,
        total: calculateTotal(),
        payment_method: paymentMethod,
        timestamp: new Date().toISOString(),
      })

      if (error) {
        console.error("Error uploading order:", error)
      }

      const updatedOrders = [newOrder, ...orders]
      setOrders(updatedOrders)
      localStorage.setItem("mosselweekend-orders", JSON.stringify(updatedOrders))

      clearCart()
      setShowCheckoutConfirm(false)
      setCashAmount("")
      setShowCashInput(false)

      await syncOrdersWithCloud()
    } catch (error) {
      console.error("Error processing order:", error)
      const updatedOrders = [newOrder, ...orders]
      setOrders(updatedOrders)
      localStorage.setItem("mosselweekend-orders", JSON.stringify(updatedOrders))
      clearCart()
      setShowCheckoutConfirm(false)
      setCashAmount("")
      setShowCashInput(false)
    } finally {
      setIsUploading(false)
    }
  }

  const handleCategoryChange = (categoryId: string) => {
    if (categoryId === "fido") {
      setShowFido(true)
      return
    }

    if (categoryId === activeCategory) return

    setIsTransitioning(true)
    setShowFido(false) // Hide F.I.D.O when switching to other categories

    setTimeout(() => {
      setActiveCategory(categoryId)
      setTimeout(() => {
        setIsTransitioning(false)
      }, 50)
    }, 150)
  }

  const handleAdminToggle = () => {
    if (isAdminMode) {
      setIsAdminMode(false)
      localStorage.setItem("mosselweekend-admin-mode", "false")
    } else {
      setShowAdminDialog(true)
    }
  }

  const verifyAdminCode = () => {
    if (adminCode === "admin86") {
      setIsAdminMode(true)
      localStorage.setItem("mosselweekend-admin-mode", "true")
      setShowAdminDialog(false)
      setAdminCode("")
    } else {
      alert("Onjuiste code!")
    }
  }

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    localStorage.setItem("mosselweekend-dark-mode", newDarkMode.toString())

    const transitionElement = document.createElement("div")
    transitionElement.className = "dark-mode-transition"
    document.body.appendChild(transitionElement)

    // Remove transition element after animation
    setTimeout(() => {
      document.body.removeChild(transitionElement)
    }, 1200)

    if (newDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order)
  }

  const saveEditedOrder = async (updatedOrder: Order) => {
    try {
      if (updatedOrder.order_code) {
        const { error } = await supabase
          .from("orders")
          .update({
            customer_name: updatedOrder.customer_name,
            items: updatedOrder.items,
            total: updatedOrder.total,
            payment_method: updatedOrder.payment_method,
          })
          .eq("order_code", updatedOrder.order_code)

        if (error) {
          console.error("Error updating order in cloud:", error)
        }
      }

      const updatedOrders = orders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
      setOrders(updatedOrders)
      localStorage.setItem("mosselweekend-orders", JSON.stringify(updatedOrders))
      setEditingOrder(null)
    } catch (error) {
      console.error("Error updating order:", error)
      const updatedOrders = orders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
      setOrders(updatedOrders)
      localStorage.setItem("mosselweekend-orders", JSON.stringify(updatedOrders))
      setEditingOrder(null)
    }
  }

  const deleteOrder = async (orderId: string) => {
    try {
      const orderToDelete = orders.find((order) => order.id === orderId)
      if (orderToDelete?.order_code) {
        const { error } = await supabase.from("orders").delete().eq("order_code", orderToDelete.order_code)

        if (error) {
          console.error("Error deleting order from cloud:", error)
        }
      }

      const updatedOrders = orders.filter((order) => order.id !== orderId)
      setOrders(updatedOrders)
      localStorage.setItem("mosselweekend-orders", JSON.stringify(updatedOrders))
    } catch (error) {
      console.error("Error deleting order:", error)
      const updatedOrders = orders.filter((order) => order.id !== orderId)
      setOrders(updatedOrders)
      localStorage.setItem("mosselweekend-orders", JSON.stringify(updatedOrders))
    }
  }

  const downloadOrdersPDF = () => {
    generateOrdersPDF(orders)
  }

  const filteredItems = menuItems.filter((item) => item.category === activeCategory)
  const currentCategory = categories.find((cat) => cat.id === activeCategory)

  const handleCheckoutClick = () => {
    if (paymentMethod === "payconic") {
      setShowPayconicConfirm(true)
    } else if (paymentMethod === "cash") {
      setShowCashInput(true)
      setShowCheckoutConfirm(true)
    } else {
      setShowCashInput(false)
      setShowCheckoutConfirm(true)
    }
  }

  const calculateChange = () => {
    const cash = Number.parseFloat(cashAmount)
    const total = calculateTotal()
    if (isNaN(cash)) return 0
    return Math.max(0, cash - total)
  }

  const handlePayconicConfirmation = async (success: boolean) => {
    setShowPayconicConfirm(false)
    if (success) {
      await processOrder()
    } else {
      alert("Payconic betaling mislukt. Probeer opnieuw of kies een andere betaalmethode.")
    }
  }

  return (
    <div className="min-h-screen corporate-background">
      <header className="corporate-header shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white leading-tight">Mosselweekend Kassasysteem</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="status-online flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isUploading ? "bg-yellow-400" : "bg-white"}`}></div>
                {isUploading ? "Syncing..." : "Online"}
                {lastSyncTime && (
                  <span className="text-xs opacity-75">(Last sync: {lastSyncTime.toLocaleTimeString("nl-BE")})</span>
                )}
              </div>
              <Button
                onClick={handleAdminToggle}
                variant="outline"
                size="sm"
                className={`flex items-center gap-2 ${isAdminMode ? "bg-red-600 text-white border-red-600" : ""}`}
              >
                <Shield className="w-4 h-4" />
                {isAdminMode ? "Admin Mode" : "User Mode"}
              </Button>
              {isAdminMode && (
                <>
                  <Button
                    onClick={() => setShowOrdersDialog(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Previous Orders
                  </Button>
                  <Button
                    onClick={downloadOrdersPDF}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 bg-transparent"
                    disabled={orders.length === 0}
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                  <Button
                    onClick={() =>
                      window.open(
                        `https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0]}/editor`,
                        "_blank",
                      )
                    }
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 bg-transparent"
                  >
                    <Database className="w-4 h-4" />
                    Database
                  </Button>
                </>
              )}
              <Button
                onClick={toggleDarkMode}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-transparent mode-switch-button"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {isDarkMode ? "Day Mode" : "Night Mode"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Admin Mode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="admin-code">Enter Admin Code</Label>
              <Input
                id="admin-code"
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="Enter code..."
                onKeyPress={(e) => e.key === "Enter" && verifyAdminCode()}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowAdminDialog(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={verifyAdminCode} className="flex-1 corporate-primary">
                Verify
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCheckoutConfirm} onOpenChange={setShowCheckoutConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-green-600" />
              Confirm Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Order Summary</h4>
              <p>
                <strong>Customer:</strong> {customerName || "Anonieme klant"}
              </p>
              <p>
                <strong>Payment Method:</strong> {paymentMethod === "cash" ? "Cash" : "Payconic"}
              </p>
              <p>
                <strong>Total:</strong> €{calculateTotal().toFixed(2)}
              </p>
              <p>
                <strong>Items:</strong> {cart.length} item(s)
              </p>
            </div>

            {showCashInput && paymentMethod === "cash" && (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold mb-3 text-blue-800 dark:text-blue-200">Cash Payment</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="cash-amount" className="text-sm font-medium">
                      Amount Given by Customer
                    </Label>
                    <Input
                      id="cash-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="Enter amount..."
                      className="mt-1"
                    />
                  </div>
                  {cashAmount && !isNaN(Number.parseFloat(cashAmount)) && (
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Change to give back:</span>
                        <span className="text-lg font-bold text-green-600">€{calculateChange().toFixed(2)}</span>
                      </div>
                      {Number.parseFloat(cashAmount) < calculateTotal() && (
                        <p className="text-red-600 text-sm mt-1">
                          ⚠️ Amount is less than total! Need €
                          {(calculateTotal() - Number.parseFloat(cashAmount)).toFixed(2)} more.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Are you sure you want to process this payment? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowCheckoutConfirm(false)
                  setCashAmount("")
                  setShowCashInput(false)
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={processOrder} className="flex-1 corporate-primary" disabled={isUploading}>
                {isUploading ? "Processing..." : "Confirm Payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPayconicConfirm} onOpenChange={setShowPayconicConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              Payconiq Betaling
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">Betaling Controle</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Klant heeft geprobeerd te betalen via Payconiq voor €{calculateTotal().toFixed(2)}
              </p>
              <p className="font-medium text-blue-800 dark:text-blue-200">Is de transactie gelukt?</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => handlePayconicConfirmation(false)} variant="outline" className="flex-1">
                Nee, Mislukt
              </Button>
              <Button onClick={() => handlePayconicConfirmation(true)} className="flex-1 corporate-primary">
                Ja, Gelukt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showOrdersDialog} onOpenChange={setShowOrdersDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>All Previous Orders - Admin View</span>
              <div className="flex gap-2">
                <Button
                  onClick={syncOrdersWithCloud}
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  className="flex items-center gap-2 bg-transparent"
                >
                  {isUploading ? "Syncing..." : "Sync Cloud"}
                </Button>
                <Button
                  onClick={downloadOrdersPDF}
                  variant="outline"
                  size="sm"
                  disabled={orders.length === 0}
                  className="flex items-center gap-2 bg-transparent"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="corporate-card p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold text-lg">{order.customer_name || order.customerName}</h4>
                    <p className="text-sm text-muted-foreground">Order Code: {order.order_code || "Legacy"}</p>
                    <p className="text-sm text-muted-foreground">Order ID: {order.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {(order.timestamp instanceof Date ? order.timestamp : new Date(order.timestamp)).toLocaleString(
                        "nl-BE",
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary text-xl">€{order.total.toFixed(2)}</p>
                    <Badge variant="secondary" className="mb-2">
                      {(order.payment_method || order.paymentMethod) === "cash" ? "Cash" : "Payconic"}
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditOrder(order)}
                        className="flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteOrder(order.id)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h5 className="font-medium">Order Items:</h5>
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm bg-muted p-2 rounded">
                      <span>
                        {item.quantity}x {item.name}
                        {item.jetons && <span className="text-muted-foreground ml-2">({item.jetons})</span>}
                      </span>
                      <span className="font-medium">€{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-center text-muted-foreground py-8">No orders found</p>}
          </div>
        </DialogContent>
      </Dialog>

      {editingOrder && (
        <Dialog open={!!editingOrder} onOpenChange={() => setEditingOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Order - {editingOrder.customer_name || editingOrder.customerName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Customer Name</Label>
                <Input
                  value={editingOrder.customer_name || editingOrder.customerName}
                  onChange={(e) =>
                    setEditingOrder({
                      ...editingOrder,
                      customer_name: e.target.value,
                      customerName: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select
                  value={editingOrder.payment_method || editingOrder.paymentMethod}
                  onValueChange={(value: "cash" | "payconic") =>
                    setEditingOrder({
                      ...editingOrder,
                      payment_method: value,
                      paymentMethod: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="payconic">Payconic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Order Items</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {editingOrder.items.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 border rounded">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...editingOrder.items]
                          newItems[index].quantity = Number.parseInt(e.target.value) || 0
                          const newTotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
                          setEditingOrder({
                            ...editingOrder,
                            items: newItems,
                            total: newTotal,
                          })
                        }}
                        className="w-20"
                        min="0"
                      />
                      <span className="flex-1">{item.name}</span>
                      <span>€{item.price.toFixed(2)}</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const newItems = editingOrder.items.filter((_, i) => i !== index)
                          const newTotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
                          setEditingOrder({
                            ...editingOrder,
                            items: newItems,
                            total: newTotal,
                          })
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total:</span>
                <span className="text-primary">€{editingOrder.total.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setEditingOrder(null)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={() => saveEditedOrder(editingOrder)} className="flex-1 corporate-primary">
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 corporate-sidebar-container">
          <div className="corporate-sidebar flex flex-col py-4">
            {categories.map((category) => {
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`corporate-sidebar-item p-3 flex items-center gap-3 text-left ${
                    (activeCategory === category.id && !showFido) || (category.id === "fido" && showFido)
                      ? "active"
                      : ""
                  }`}
                >
                  {category.icon && <span className="text-lg">{category.icon}</span>}
                  <span className="text-sm font-medium">{category.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* F.I.D.O chatbot interface */}
          {showFido ? (
            <div className="h-full flex flex-col">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">F.I.D.O Assistant</h2>
                <p className="text-gray-600 dark:text-gray-300">Your intelligent system helper</p>
              </div>

              <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col">
                {/* Chat Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-96">
                  {fidoMessages.map((message, index) => (
                    <div key={index} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.isUser
                            ? "bg-red-600 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white"
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                  <form onSubmit={handleFidoSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={fidoInput}
                      onChange={(e) => setFidoInput(e.target.value)}
                      placeholder="Ask F.I.D.O about system functions..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div
                className={`menu-content-transition ${isTransitioning ? "menu-content-exit" : "menu-content-enter"}`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="corporate-section-header">
                      <div className="flex items-center gap-2">{currentCategory?.name || "Menu Systeem"}</div>
                    </div>
                    <div className="corporate-content p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {filteredItems.length} items beschikbaar
                          </span>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button className="corporate-button flex items-center gap-2">
                              <Download className="w-4 h-4 mr-2" />
                              Geschiedenis
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Bestelgeschiedenis</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {orders.map((order) => (
                                <div key={order.id} className="corporate-card p-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h4 className="font-semibold">{order.customer_name || order.customerName}</h4>
                                      <p className="text-sm text-muted-foreground">
                                        {(order.timestamp instanceof Date
                                          ? order.timestamp
                                          : new Date(order.timestamp)
                                        ).toLocaleString("nl-BE")}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-primary">€{order.total.toFixed(2)}</p>
                                      <Badge variant="secondary">
                                        {(order.payment_method || order.paymentMethod) === "cash" ? "Cash" : "Payconic"}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    {order.items.map((item) => (
                                      <div key={item.id} className="flex justify-between text-sm">
                                        <span>
                                          {item.quantity}x {item.name}
                                        </span>
                                        <span>€{(item.price * item.quantity).toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      <div
                        className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!isTransitioning ? "menu-items-stagger" : ""}`}
                      >
                        {filteredItems.map((item, index) => (
                          <div
                            key={item.id}
                            className="menu-grid-item corporate-card p-4 hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="font-semibold text-sm">{item.name}</h3>
                              <div className="text-right">
                                {item.price > 0 ? (
                                  <p className="font-bold text-primary">€{item.price.toFixed(2)}</p>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    {item.jetons}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button onClick={() => addToCart(item)} className="w-full corporate-primary">
                              <Plus className="w-4 h-4 mr-2" />
                              Toevoegen
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="corporate-section-header">
                        <div className="flex items-center gap-2">
                          <Download className="w-5 h-5 text-gray-400" />
                          Bestelling
                        </div>
                      </div>
                      <div className="corporate-content p-6">
                        <div className="space-y-4 mb-6">
                          <div>
                            <Label className="text-sm font-medium">Klant naam</Label>
                            <Input
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              placeholder="Voer naam in..."
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label className="text-sm font-medium">Betaalmethode</Label>
                            <Select
                              value={paymentMethod}
                              onValueChange={(value: "cash" | "payconic") => setPaymentMethod(value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">
                                  <div className="flex items-center gap-2">
                                    <Download className="w-4 h-4" />
                                    Cash
                                  </div>
                                </SelectItem>
                                <SelectItem value="payconic">
                                  <div className="flex items-center gap-2">
                                    <Download className="w-4 h-4" />
                                    Payconic
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-3 mb-4">
                          {cart.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">Geen items in winkelwagen</p>
                          ) : (
                            cart.map((item) => (
                              <div key={item.id} className="corporate-card p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{item.name}</p>
                                    {item.price > 0 ? (
                                      <p className="text-xs text-muted-foreground">€{item.price.toFixed(2)} per stuk</p>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">{item.jetons}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </Button>
                                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => removeFromCart(item.id)}>
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-4">
                          <div className="flex justify-between items-center text-lg font-bold">
                            <span>Totaal:</span>
                            <span className="text-primary">€{calculateTotal().toFixed(2)}</span>
                          </div>

                          <div className="flex gap-3">
                            <Button
                              onClick={clearCart}
                              variant="outline"
                              className="flex-1 bg-transparent"
                              disabled={cart.length === 0}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Wissen
                            </Button>
                            <Button
                              onClick={handleCheckoutClick}
                              className="flex-1 corporate-primary"
                              disabled={cart.length === 0}
                            >
                              Afrekenen
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="corporate-section-header">Dagstatistieken</div>
                      <div className="corporate-content p-4">
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span>Totaal bestellingen:</span>
                            <span className="font-semibold">{orders.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Totaal omzet:</span>
                            <span className="font-bold text-primary">
                              €{orders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cash betalingen:</span>
                            <span>{orders.filter((o) => o.payment_method === "cash").length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Payconic betalingen:</span>
                            <span>{orders.filter((o) => o.payment_method === "payconic").length}</span>
                          </div>

                          <Separator className="my-3" />
                          <div className="space-y-2">
                            <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                              Product Verkoop
                            </h4>
                            {(() => {
                              // Calculate product quantities from all orders
                              const productCounts: { [key: string]: number } = {}

                              orders.forEach((order) => {
                                order.items.forEach((item) => {
                                  if (productCounts[item.name]) {
                                    productCounts[item.name] += item.quantity
                                  } else {
                                    productCounts[item.name] = item.quantity
                                  }
                                })
                              })

                              // Sort by quantity (highest first) and take top 10
                              const sortedProducts = Object.entries(productCounts)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 10)

                              if (sortedProducts.length === 0) {
                                return (
                                  <div className="text-xs text-muted-foreground text-center py-2">
                                    Nog geen producten verkocht
                                  </div>
                                )
                              }

                              return sortedProducts.map(([productName, quantity]) => (
                                <div key={productName} className="flex justify-between items-center">
                                  <span className="text-xs truncate flex-1 mr-2" title={productName}>
                                    {productName.length > 20 ? `${productName.substring(0, 20)}...` : productName}
                                  </span>
                                  <span className="font-semibold text-xs">{quantity}x</span>
                                </div>
                              ))
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
