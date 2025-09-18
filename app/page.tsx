"use client"

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
  { id: 12, name: "CHOCOMOUSSE", price: 5.0, category: "desserts" },
  { id: 13, name: "FRISCO", price: 3.5, category: "desserts" },

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

  const supabase = createClient()

  const categories = [
    { id: "hoofdgerechten", name: "HOOFDGERECHTEN", icon: null },
    { id: "jetons", name: "JETONS", icon: null },
    { id: "dranken", name: "DRANKEN", icon: null },
    { id: "wijn", name: "WIJN & SPECIALS", icon: null },
    { id: "warme-dranken", name: "WARME DRANKEN", icon: null },
    { id: "desserts", name: "DESSERTS", icon: null },
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
    if (cart.length === 0 || !customerName.trim()) return

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
      customer_name: customerName.trim(),
      customerName: customerName.trim(),
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
        customer_name: customerName.trim(),
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
    if (paymentMethod === "cash") {
      setShowCashInput(true)
    } else {
      setShowCashInput(false)
    }
    setShowCheckoutConfirm(true)
  }

  const calculateChange = () => {
    const cash = Number.parseFloat(cashAmount)
    const total = calculateTotal()
    if (isNaN(cash)) return 0
    return Math.max(0, cash - total)
  }

  return (
    <div className="min-h-screen corporate-background">
      <header className="corporate-header shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/images/86-logo.png" alt="86 Logo" className="w-12 h-12 object-contain rounded-lg" />
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
                <strong>Customer:</strong> {customerName}
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
        <div className="corporate-sidebar flex flex-col py-4">
          {categories.map((category) => {
            return (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`corporate-sidebar-item p-3 flex items-center gap-3 text-left ${
                  activeCategory === category.id ? "active" : ""
                }`}
              >
                <span className="text-sm font-medium">{category.name}</span>
              </button>
            )
          })}
        </div>

        <div className="flex-1 p-6">
          <div className={`menu-content-transition ${isTransitioning ? "menu-content-exit" : "menu-content-enter"}`}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="corporate-section-header">
                  <div className="flex items-center gap-2">{currentCategory?.name || "Menu Systeem"}</div>
                </div>
                <div className="corporate-content p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{filteredItems.length} items beschikbaar</span>
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
                          disabled={cart.length === 0 || !customerName.trim()}
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
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
