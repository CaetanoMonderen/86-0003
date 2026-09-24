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
import { Trash2, Plus, Minus, Settings, Shield, Download, Moon, Sun, Database, RefreshCw, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { generateOrdersPDF } from "@/lib/pdf-generator"
import { ShiftsView } from "@/components/shifts-view"
import { BrickBreaker } from "@/components/brick-breaker"

const ORDERS_STORAGE_KEY = "mosselweekend-orders-2026"

const menuItems = [
  // Main dishes
  { id: 1, name: "MOSSELEN NATUUR", price: 26.0, category: "hoofdgerechten" },
  { id: 2, name: "MOSSELEN KLEIN", price: 17.0, category: "hoofdgerechten" },
  { id: 5, name: "VOL-AU-VENT", price: 22.0, category: "hoofdgerechten" },
  { id: 6, name: "VOL-AU-VENT KLEIN", price: 15.0, category: "hoofdgerechten" },
  { id: 3, name: "STOOFVLEES", price: 22.0, category: "hoofdgerechten" },
  { id: 4, name: "STOOFVLEES KLEIN", price: 15.0, category: "hoofdgerechten" },
  { id: 9, name: "EÉN CURRYWORST", price: 11.0, category: "hoofdgerechten" },
  { id: 27, name: "TWEE CURRYWORSTEN", price: 15.0, category: "hoofdgerechten" },
  { id: 7, name: "VEGGIE", price: 18.0, category: "hoofdgerechten" },

  // Jetons
  { id: 10, name: "GELE JETON", price: 2.5, category: "jetons" },
  { id: 11, name: "RODE JETON", price: 3.5, category: "jetons" },

  // Desserts
  { id: 12, name: "RIJSTPAP", price: 5.0, category: "desserts" },
  { id: 13, name: "IJSJE", price: 3.5, category: "desserts" },
  { id: 28, name: "CHOCOMOUSSE", price: 5.0, category: "desserts" },

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
  customerName?: string
  items: CartItem[]
  total: number
  payment_method: "cash" | "payconic"
  paymentMethod?: "cash" | "payconic"
  timestamp: Date
  synced?: boolean
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
  const [now, setNow] = useState<number>(() => Date.now())
  const [successToast, setSuccessToast] = useState<{ code: string; total: number } | null>(null)
  const [contributionAmount, setContributionAmount] = useState("")
  const [cashAmount, setCashAmount] = useState("")
  const [showCashInput, setShowCashInput] = useState(false)
  const [showPayconicConfirm, setShowPayconicConfirm] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  const supabase = createClient()

  const categories = [
    { id: "hoofdgerechten", name: "HOOFDGERECHTEN", icon: null },
    { id: "jetons", name: "JETONS", icon: null },
    { id: "dranken", name: "DRANKEN", icon: null },
    { id: "wijn", name: "WIJN & SPECIALS", icon: null },
    { id: "warme-dranken", name: "WARME DRANKEN", icon: null },
    { id: "desserts", name: "DESSERTS", icon: null },
    { id: "shiften", name: "SHIFTEN", icon: null },
    { id: "game", name: "BRICK BREAKER", icon: null },
  ]

  const generateOrderCode = () => {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 5)
    return `MW-${timestamp}-${random}`.toUpperCase()
  }

  const formatCloudOrder = (order: any): Order => ({
    id: order.id?.toString() ?? order.order_code,
    order_code: order.order_code,
    customer_name: order.customer_name,
    customerName: order.customer_name,
    items: order.items,
    total: order.total,
    payment_method: order.payment_method,
    paymentMethod: order.payment_method,
    timestamp: new Date(order.timestamp),
    synced: true,
  })

  const markOrderSynced = (orderCode: string) => {
    setOrders((prev) => {
      const updated = prev.map((o) => (o.order_code === orderCode ? { ...o, synced: true } : o))
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }

  // Push only the orders that have not been saved to the cloud yet, then pull
  // the authoritative list. This keeps every sync cheap even after hundreds of
  // orders: we never re-upload orders that are already synced, so the app stays
  // responsive throughout a busy weekend.
  const syncOrders = async ({ showSpinner = false }: { showSpinner?: boolean } = {}) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return

    try {
      if (showSpinner) setIsUploading(true)

      const local: Order[] = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || "[]")
      const pending = local.filter((order) => !order.synced)

      for (const order of pending) {
        const { error } = await supabase.from("orders").upsert(
          {
            order_code: order.order_code || generateOrderCode(),
            customer_name: order.customer_name || order.customerName,
            items: order.items,
            total: order.total,
            payment_method: order.payment_method || order.paymentMethod,
            timestamp: new Date(order.timestamp).toISOString(),
          },
          {
            onConflict: "order_code",
            ignoreDuplicates: true,
          },
        )

        if (!error) order.synced = true
      }

      const { data: cloudOrders, error } = await supabase
        .from("orders")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(2000)

      if (error) {
        // Pull failed (likely a flaky connection) — keep whatever we pushed so
        // no data is lost, and let the next sync reconcile.
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(local))
        setOrders(local)
        return
      }

      const cloud = (cloudOrders || []).map(formatCloudOrder)
      const cloudCodes = new Set(cloud.map((o) => o.order_code))
      // Preserve orders still queued locally that the cloud hasn't stored yet.
      const stillPending = local.filter((o) => !o.synced && !cloudCodes.has(o.order_code))
      const merged = [...stillPending, ...cloud]

      setOrders(merged)
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(merged))
      setLastSyncTime(new Date())
    } catch (error) {
      console.error("[v0] Sync error:", error)
    } finally {
      if (showSpinner) setIsUploading(false)
    }
  }

  useEffect(() => {
    const loadInitialData = async () => {
      const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY)
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

      await syncOrders({ showSpinner: true })
    }

    loadInitialData()
  }, [])

  // Periodic background sync plus reaction to connectivity changes, so orders
  // placed while offline are flushed the moment the connection returns.
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine)
    }

    const handleOnline = () => {
      setIsOnline(true)
      void syncOrders({ showSpinner: true })
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    const interval = setInterval(() => {
      void syncOrders()
    }, 30000)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(interval)
    }
  }, [])

  // Keep "X min geleden" fresh without needing a new sync to happen.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(tick)
  }, [])

  // Auto-dismiss the "bestelling geplaatst" confirmation after a few seconds.
  useEffect(() => {
    if (!successToast) return
    const timer = setTimeout(() => setSuccessToast(null), 3500)
    return () => clearTimeout(timer)
  }, [successToast])

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

  const addContribution = (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return
    const rounded = Math.round(amount * 100) / 100
    setCart((prev) => [
      ...prev,
      {
        // Negative, unique id so contributions never merge with menu items or
        // with each other, while +/- and remove keep working by id.
        id: -Date.now(),
        name: "Vrije bijdrage",
        price: rounded,
        quantity: 1,
      },
    ])
    setContributionAmount("")
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

  const processOrder = () => {
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
      synced: false,
    }

    // Save locally and reset the UI immediately so the cashier is never blocked
    // waiting on the network. This is the key to staying fast under heavy load:
    // the order is recorded instantly and uploaded in the background.
    setOrders((prev) => {
      const updated = [newOrder, ...prev]
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })

    setSuccessToast({ code: orderCode, total: newOrder.total })

    clearCart()
    setShowCheckoutConfirm(false)
    setCashAmount("")
    setShowCashInput(false)

    // Fire-and-forget upload. If it fails or we're offline, the order stays
    // queued (synced: false) and the periodic sync retries it automatically.
    void saveOrderToCloud(newOrder)
  }

  const saveOrderToCloud = async (order: Order) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return

    try {
      const { error } = await supabase.from("orders").insert({
        order_code: order.order_code,
        customer_name: order.customer_name,
        items: order.items,
        total: order.total,
        payment_method: order.payment_method,
        timestamp: new Date(order.timestamp).toISOString(),
      })

      if (error) {
        console.error("[v0] Order queued, will retry on next sync:", error)
        return
      }

      markOrderSynced(order.order_code)
    } catch (error) {
      console.error("[v0] Order queued, will retry on next sync:", error)
    }
  }

  const handleCategoryChange = (categoryId: string) => {
    if (categoryId === activeCategory) return

    setIsTransitioning(true)

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
    if (adminCode === "admin123") {
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
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders))
      setEditingOrder(null)
    } catch (error) {
      console.error("Error updating order:", error)
      const updatedOrders = orders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
      setOrders(updatedOrders)
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders))
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
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders))
    } catch (error) {
      console.error("Error deleting order:", error)
      const updatedOrders = orders.filter((order) => order.id !== orderId)
      setOrders(updatedOrders)
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders))
    }
  }

  const downloadOrdersPDF = () => {
    generateOrdersPDF(orders)
  }

  const filteredItems = menuItems.filter((item) => item.category === activeCategory)
  const currentCategory = categories.find((cat) => cat.id === activeCategory)
  const pendingCount = orders.filter((order) => !order.synced).length

  // Sync freshness: how long since the last successful cloud sync, and whether
  // that (or a non-empty upload queue / being offline) counts as "stale".
  const STALE_AFTER_MIN = 2
  const syncMinutesAgo = lastSyncTime ? Math.floor((now - lastSyncTime.getTime()) / 60000) : null
  const syncAgeLabel =
    syncMinutesAgo === null
      ? "nog niet gesynct"
      : syncMinutesAgo < 1
        ? "zonet gesynct"
        : `${syncMinutesAgo} min geleden`
  const syncStale = !isOnline || pendingCount > 0 || (syncMinutesAgo !== null && syncMinutesAgo >= STALE_AFTER_MIN)

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
      {successToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-6 left-1/2 z-50 -translate-x-1/2 order-toast-enter"
        >
          <div className="flex items-center gap-3 rounded-xl bg-emerald-600 px-5 py-3 text-white shadow-2xl ring-1 ring-emerald-400/40">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <div className="leading-tight">
              <div className="font-bold">Bestelling geplaatst</div>
              <div className="text-sm text-emerald-50">
                #{successToast.code} · €{successToast.total.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="corporate-header shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white leading-tight">Mosselweekend Kassasysteem</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
                    !isOnline
                      ? "bg-red-600 text-white"
                      : isUploading
                        ? "bg-amber-500 text-white"
                        : "bg-emerald-500 text-white"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full bg-white ${!isOnline || isUploading ? "animate-pulse" : ""}`}
                  ></span>
                  {!isOnline ? "Offline" : isUploading ? "Synchroniseren..." : "Online"}
                </div>

                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    syncStale
                      ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/30"
                      : "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                  }`}
                  title={lastSyncTime ? `Laatste sync om ${lastSyncTime.toLocaleTimeString("nl-BE")}` : undefined}
                >
                  {pendingCount > 0 ? (
                    <>
                      <RefreshCw className={`w-3 h-3 ${isOnline ? "animate-spin" : ""}`} />
                      {pendingCount} in wachtrij
                    </>
                  ) : (
                    <>
                      <span className={`w-1.5 h-1.5 rounded-full ${syncStale ? "bg-red-400" : "bg-emerald-400"}`}></span>
                      {syncAgeLabel}
                    </>
                  )}
                </div>
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
                          ��️ Amount is less than total! Need €
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
                  onClick={() => syncOrders({ showSpinner: true })}
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
        <div className="w-64 corporate-sidebar-container p-4">
          <div className="corporate-sidebar flex flex-col gap-1 p-3">
            {categories.map((category) => {
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`corporate-sidebar-item p-3 flex items-center gap-3 text-left ${
                    activeCategory === category.id ? "active" : ""
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
          {activeCategory === "shiften" ? (
            <ShiftsView />
          ) : activeCategory === "game" ? (
            <BrickBreaker />
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

                        <div className="mb-4">
                          <Label className="text-sm font-medium">Vrije bijdrage</Label>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                              <Input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.5"
                                value={contributionAmount}
                                onChange={(e) => setContributionAmount(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                                    addContribution(Number.parseFloat(contributionAmount))
                                  }
                                }}
                                placeholder="Bedrag"
                                className="pl-7"
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={() => addContribution(Number.parseFloat(contributionAmount))}
                              disabled={
                                !contributionAmount || Number.parseFloat(contributionAmount) <= 0
                              }
                              className="corporate-primary shrink-0"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Toevoegen
                            </Button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {[1, 2, 5, 10].map((amount) => (
                              <Button
                                key={amount}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addContribution(amount)}
                              >
                                +€{amount}
                              </Button>
                            ))}
                          </div>
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
                        {orders.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                              <Database className="h-7 w-7 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">Nog geen bestellingen dit weekend</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                De statistieken verschijnen zodra de eerste bestelling is geplaatst.
                              </p>
                            </div>
                          </div>
                        ) : (
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
                        )}
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
