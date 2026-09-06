import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown,
  FileText,
  DollarSign,
  Undo2,
  ChevronRight,
  X,
  ExternalLink,
  Plus,
  Send,
  Printer,
  ShieldCheck,
  Ban,
  Tag,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Layers,
  ArrowRight,
  Info
} from "lucide-react";
import { Order, OrderTimelineEvent, OrderFulfillment, OrderReturn, OrderRefund, PaymentStatus, FulfillmentStatus, ShippingStatus } from "../types";
import PriceDisplay from "./PriceDisplay";

interface OrdersManagerProps {
  getAuthHeaders: () => Record<string, string>;
  onRefreshOrders?: () => void;
  currentUser?: any;
}

export default function OrdersManager({ getAuthHeaders, onRefreshOrders, currentUser }: OrdersManagerProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>("all");
  const [shippingFilter, setShippingFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"all" | "unfulfilled" | "unpaid" | "returns" | "completed">("all");

  // Modals
  const [isFulfillModalOpen, setIsFulfillModalOpen] = useState<boolean>(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState<boolean>(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Form states
  const [fulfillCourier, setFulfillCourier] = useState<string>("Aramex");
  const [fulfillTrackingNum, setFulfillTrackingNum] = useState<string>("");
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState<string>("Customer Request");
  const [refundNotes, setRefundNotes] = useState<string>("");
  const [returnReason, setReturnReason] = useState<string>("Customer Exchange / Return");
  const [returnNotes, setReturnNotes] = useState<string>("");
  const [cancelReason, setCancelReason] = useState<string>("Customer Request");
  const [newTimelineNote, setNewTimelineNote] = useState<string>("");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/orders", {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        if (selectedOrder) {
          const updated = data.find((o: Order) => o.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderNum = (order.orderNumber || order.id || "").toLowerCase();
      const customerName = (order.shippingName || "").toLowerCase();
      const email = (order.shippingEmail || order.userEmail || "").toLowerCase();
      const phone = (order.shippingPhone || "").toLowerCase();
      const city = (order.shippingCity || order.governorate || "").toLowerCase();
      const search = searchQuery.toLowerCase();

      const matchesSearch =
        !search ||
        orderNum.includes(search) ||
        customerName.includes(search) ||
        email.includes(search) ||
        phone.includes(search) ||
        city.includes(search);

      const matchesPayment =
        paymentFilter === "all" || order.paymentStatus === paymentFilter;
      const matchesFulfillment =
        fulfillmentFilter === "all" || order.fulfillmentStatus === fulfillmentFilter;
      const matchesShipping =
        shippingFilter === "all" || order.shippingStatus === shippingFilter;
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      let matchesTab = true;
      if (activeTab === "unfulfilled") {
        matchesTab = order.fulfillmentStatus === "unfulfilled" || order.fulfillmentStatus === "processing";
      } else if (activeTab === "unpaid") {
        matchesTab = order.paymentStatus === "pending" || (order.paymentStatus as any) === "unpaid";
      } else if (activeTab === "returns") {
        matchesTab = (order.returns && order.returns.length > 0) || false;
      } else if (activeTab === "completed") {
        matchesTab = order.fulfillmentStatus === "fulfilled" && order.paymentStatus === "paid";
      }

      return matchesSearch && matchesPayment && matchesFulfillment && matchesShipping && matchesStatus && matchesTab;
    });
  }, [orders, searchQuery, paymentFilter, fulfillmentFilter, shippingFilter, statusFilter, activeTab]);

  // Order Actions
  const handleFulfillOrder = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/fulfill`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          courier: fulfillCourier,
          trackingNumber: fulfillTrackingNum
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Order #${selectedOrder.orderNumber} successfully fulfilled and dispatched.`);
        setIsFulfillModalOpen(false);
        setFulfillTrackingNum("");
        fetchOrders();
        if (onRefreshOrders) onRefreshOrders();
      } else {
        showToast(data.error || "Failed to fulfill order", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssueRefund = async () => {
    if (!selectedOrder) return;
    if (refundAmount <= 0) {
      showToast("Please enter a valid refund amount", "error");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/refund`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: refundAmount,
          reason: refundReason,
          notes: refundNotes
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Refund of $${refundAmount.toLocaleString()} processed successfully.`);
        setIsRefundModalOpen(false);
        setRefundAmount(0);
        setRefundNotes("");
        fetchOrders();
      } else {
        showToast(data.error || "Failed to issue refund", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateReturn = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const returnItems = (selectedOrder.items || []).map((it) => ({
        productId: it.product?.id || it.productId,
        productName: it.product?.name || it.name,
        quantity: it.quantity,
        sku: it.sku,
        unitPrice: it.unitPrice || it.product?.price
      }));

      const res = await fetch(`/api/orders/${selectedOrder.id}/returns`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: returnItems,
          reason: returnReason,
          notes: returnNotes
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Return RMA #${data.return?.id} created successfully.`);
        setIsReturnModalOpen(false);
        setReturnNotes("");
        fetchOrders();
      } else {
        showToast(data.error || "Failed to create return", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/cancel`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: cancelReason })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Order #${selectedOrder.orderNumber} cancelled and stock reservation released.`);
        setIsCancelModalOpen(false);
        fetchOrders();
        if (onRefreshOrders) onRefreshOrders();
      } else {
        showToast(data.error || "Failed to cancel order", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddTimelineNote = async () => {
    if (!selectedOrder || !newTimelineNote.trim()) return;
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/timeline`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "Staff Note",
          description: newTimelineNote.trim(),
          type: "note_added"
        })
      });
      if (res.ok) {
        setNewTimelineNote("");
        fetchOrders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestockReturnItem = async (returnId: string) => {
    try {
      const res = await fetch(`/api/returns/${returnId}/status`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: "restocked", restock: true })
      });
      if (res.ok) {
        showToast(`Returned items restocked back into available inventory with traceable log.`);
        fetchOrders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Helper status badges
  const renderPaymentBadge = (status?: PaymentStatus) => {
    switch (status) {
      case "paid":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" /> Paid</span>;
      case "pending":
      case "unpaid" as any:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20"><Clock className="w-3 h-3" /> Pending Payment</span>;
      case "refunded":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 border border-purple-500/20"><Undo2 className="w-3 h-3" /> Refunded</span>;
      case "partially_refunded":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 border border-violet-500/20"><Undo2 className="w-3 h-3" /> Partially Refunded</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-600 border border-zinc-500/20">Pending</span>;
    }
  };

  const renderFulfillmentBadge = (status?: FulfillmentStatus) => {
    switch (status) {
      case "fulfilled":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><Package className="w-3 h-3" /> Fulfilled</span>;
      case "unfulfilled":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20"><Clock className="w-3 h-3" /> Unfulfilled</span>;
      case "processing":
      case "packed":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20"><Package className="w-3 h-3" /> In Processing</span>;
      case "cancelled":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20"><Ban className="w-3 h-3" /> Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-600 border border-zinc-500/20">Unfulfilled</span>;
    }
  };

  const renderShippingBadge = (status?: ShippingStatus) => {
    switch (status) {
      case "delivered":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-600 border border-teal-500/20"><CheckCircle2 className="w-3 h-3" /> Delivered</span>;
      case "shipped":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"><Truck className="w-3 h-3" /> Shipped</span>;
      case "out_for_delivery":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-600 border border-sky-500/20"><Truck className="w-3 h-3" /> Out for Delivery</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-600 border border-zinc-500/20">Not Shipped</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-medium transition-all transform animate-in fade-in slide-in-from-bottom-5 ${
            notification.type === "success"
              ? "bg-zinc-950 text-white border-zinc-800"
              : "bg-rose-950 text-rose-100 border-rose-800"
          }`}
        >
          {notification.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Orders & Deliveries</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Shopify-grade independent fulfillment, traceable stock reservation & returns
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={() => {
              const csvContent =
                "data:text/csv;charset=utf-8," +
                ["Order Number,Date,Customer,Email,Total,Payment Status,Fulfillment Status,Shipping Status,Items Count"]
                  .concat(
                    orders.map(
                      (o) =>
                        `"${o.orderNumber}","${o.date}","${o.shippingName}","${o.shippingEmail}","${o.total}","${o.paymentStatus}","${o.fulfillmentStatus}","${o.shippingStatus}","${o.items?.length || 0}"`
                    )
                  )
                  .join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `VERO_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 rounded-xl transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="space-y-4">
        {/* Sub-tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 overflow-x-auto">
          {[
            { id: "all", label: "All Orders", count: orders.length },
            { id: "unfulfilled", label: "Unfulfilled", count: orders.filter((o) => o.fulfillmentStatus === "unfulfilled" || o.fulfillmentStatus === "processing").length },
            { id: "unpaid", label: "Unpaid / Pending", count: orders.filter((o) => o.paymentStatus === "pending" || (o.paymentStatus as any) === "unpaid").length },
            { id: "returns", label: "Returns / RMAs", count: orders.filter((o) => o.returns && o.returns.length > 0).length },
            { id: "completed", label: "Completed", count: orders.filter((o) => o.fulfillmentStatus === "fulfilled" && o.paymentStatus === "paid").length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab.id
                    ? "bg-white/20 text-white dark:bg-zinc-950/20 dark:text-zinc-950"
                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by order #, client name, email, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="sm:col-span-2">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="all">Payment: All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
              <option value="partially_refunded">Partially Refunded</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={fulfillmentFilter}
              onChange={(e) => setFulfillmentFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="all">Fulfillment: All</option>
              <option value="unfulfilled">Unfulfilled</option>
              <option value="processing">In Processing</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={shippingFilter}
              onChange={(e) => setShippingFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="all">Shipping: All</option>
              <option value="not_shipped">Not Shipped</option>
              <option value="shipped">Shipped</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Order</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Customer & City</th>
                <th className="px-4 py-3.5">Payment</th>
                <th className="px-4 py-3.5">Fulfillment</th>
                <th className="px-4 py-3.5">Shipping</th>
                <th className="px-4 py-3.5">Items</th>
                <th className="px-4 py-3.5 text-right">Total</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-zinc-400 dark:text-zinc-500">
                    <Package className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm font-medium">No orders found matching your criteria</p>
                    <p className="text-xs text-zinc-400 mt-1">Try resetting filters or searching a different term</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const itemCount = order.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 0;
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-amber-500/[0.03] dark:hover:bg-amber-500/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-600 dark:text-amber-400 font-mono">#{order.orderNumber}</span>
                          {order.returns && order.returns.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-600 font-bold border border-purple-500/20">
                              RMA
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                        {order.date ? new Date(order.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recent"}
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[160px]">
                          {order.shippingName || "Valued Customer"}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate max-w-[160px]">
                          {order.shippingCity || "Cairo"}, Egypt
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {renderPaymentBadge(order.paymentStatus)}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {renderFulfillmentBadge(order.fulfillmentStatus)}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {renderShippingBadge(order.shippingStatus)}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{itemCount} items</span>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-right font-bold text-zinc-900 dark:text-zinc-100">
                        <PriceDisplay price={order.total} />
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          Manage <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED ORDER MODAL / DRAWER */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl max-h-[90vh] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold font-mono">
                  #{selectedOrder.orderNumber?.toString().slice(-4)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      Order #{selectedOrder.orderNumber}
                    </h2>
                    {renderPaymentBadge(selectedOrder.paymentStatus)}
                    {renderFulfillmentBadge(selectedOrder.fulfillmentStatus)}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Placed on {new Date(selectedOrder.date).toLocaleString()} • {selectedOrder.paymentMethod.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  title="Print Packing Slip"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Quick Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2.5 p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mr-2">Quick Actions:</span>

                {selectedOrder.fulfillmentStatus !== "fulfilled" && selectedOrder.fulfillmentStatus !== "cancelled" && (
                  <button
                    onClick={() => setIsFulfillModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                  >
                    <Package className="w-3.5 h-3.5" /> Fulfill & Dispatch
                  </button>
                )}

                {selectedOrder.paymentStatus !== "refunded" && (
                  <button
                    onClick={() => {
                      setRefundAmount(selectedOrder.total - (selectedOrder.amountRefunded || 0));
                      setIsRefundModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-colors"
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Issue Refund
                  </button>
                )}

                <button
                  onClick={() => setIsReturnModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors"
                >
                  <Undo2 className="w-3.5 h-3.5" /> Create Return (RMA)
                </button>

                {selectedOrder.fulfillmentStatus !== "cancelled" && (
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 transition-colors ml-auto"
                  >
                    <Ban className="w-3.5 h-3.5" /> Cancel Order
                  </button>
                )}
              </div>

              {/* Grid: Order Items & Customer Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Line Items (Left 7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-white dark:bg-zinc-800/40 p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center justify-between">
                      <span>Line Items ({selectedOrder.items?.length || 0})</span>
                      <span className="text-[11px] text-zinc-500">Shopify-style SKU mapping</span>
                    </h3>

                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {(selectedOrder.items || []).map((item, idx) => (
                        <div key={idx} className="py-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.product?.image || "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&q=80"}
                              alt={item.product?.name || item.name}
                              className="w-12 h-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700"
                            />
                            <div>
                              <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.product?.name || item.name}</div>
                              <div className="text-[11px] text-zinc-400">
                                SKU: <span className="font-mono text-zinc-600 dark:text-zinc-300">{item.sku || "VERO-SKU-AUTO"}</span>
                              </div>
                              <div className="text-[11px] text-amber-600 dark:text-amber-400">
                                Variant: {item.selectedMaterial || "Gold"} / {item.selectedSize || "Standard"}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-bold text-zinc-900 dark:text-zinc-100">
                              <PriceDisplay price={(item.unitPrice || item.product?.price || 0) * (item.quantity || 1)} />
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              Qty: {item.quantity} × <PriceDisplay price={item.unitPrice || item.product?.price || 0} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Financial Summary */}
                    <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5 text-zinc-600 dark:text-zinc-400 text-xs">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span><PriceDisplay price={selectedOrder.subtotal || selectedOrder.total} /></span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping ({selectedOrder.courier || "Standard Delivery"})</span>
                        <span><PriceDisplay price={selectedOrder.shippingCost || 0} /></span>
                      </div>
                      {selectedOrder.discount ? (
                        <div className="flex justify-between text-emerald-600">
                          <span>Discount</span>
                          <span>-<PriceDisplay price={selectedOrder.discount} /></span>
                        </div>
                      ) : null}
                      <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 text-sm pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        <span>Total</span>
                        <span><PriceDisplay price={selectedOrder.total} /></span>
                      </div>
                      {selectedOrder.amountRefunded ? (
                        <div className="flex justify-between text-purple-600 font-semibold pt-1">
                          <span>Total Refunded</span>
                          <span>-<PriceDisplay price={selectedOrder.amountRefunded} /></span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Fulfillment Details Card */}
                  <div className="bg-white dark:bg-zinc-800/40 p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-amber-500" />
                      <span>Fulfillment & Dispatch Details</span>
                    </h3>

                    {selectedOrder.fulfillments && selectedOrder.fulfillments.length > 0 ? (
                      <div className="space-y-3">
                        {selectedOrder.fulfillments.map((f, i) => (
                          <div key={i} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-zinc-900 dark:text-zinc-100">{f.courier}</span>
                              <span className="text-[11px] text-zinc-400">{new Date(f.shippedAt).toLocaleString()}</span>
                            </div>
                            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 flex items-center gap-2">
                              <span>Tracking #: <strong className="font-mono text-amber-600 dark:text-amber-400">{f.trackingNumber}</strong></span>
                              {f.trackingUrl && (
                                <a href={f.trackingUrl} target="_blank" rel="noreferrer" className="text-blue-500 underline flex items-center gap-0.5">
                                  Track Package <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-zinc-500 text-xs flex items-center justify-between">
                        <span>Items are currently held in warehouse as <strong>Committed Stock</strong>.</span>
                        <button
                          onClick={() => setIsFulfillModalOpen(true)}
                          className="text-amber-600 font-bold hover:underline"
                        >
                          Fulfill Now →
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer & Shipping Info (Right 5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Customer Card */}
                  <div className="bg-white dark:bg-zinc-800/40 p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-500" />
                      <span>Customer & Delivery Details</span>
                    </h3>

                    <div className="space-y-2">
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{selectedOrder.shippingName}</div>
                        <div className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3 text-zinc-400" />
                          <span>{selectedOrder.shippingEmail || selectedOrder.userEmail}</span>
                        </div>
                        {selectedOrder.shippingPhone && (
                          <div className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-zinc-400" />
                            <span>{selectedOrder.shippingPhone}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="text-[11px] font-semibold text-zinc-400">Shipping Address:</div>
                        <div className="text-zinc-700 dark:text-zinc-300 mt-0.5">
                          {selectedOrder.shippingAddress}
                        </div>
                        <div className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                          {selectedOrder.shippingCity || selectedOrder.governorate}, Egypt ({selectedOrder.shippingZip || "11511"})
                        </div>
                      </div>

                      {selectedOrder.customerNotes && (
                        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                          <div className="text-[11px] font-semibold text-zinc-400">Client Instructions:</div>
                          <p className="text-amber-700 dark:text-amber-400 italic mt-0.5 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                            "{selectedOrder.customerNotes}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Returns & RMAs */}
                  {selectedOrder.returns && selectedOrder.returns.length > 0 && (
                    <div className="bg-white dark:bg-zinc-800/40 p-4.5 rounded-2xl border border-purple-500/30">
                      <h3 className="font-bold text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-2">
                        <Undo2 className="w-4 h-4" />
                        <span>Return & RMA Requests</span>
                      </h3>
                      <div className="space-y-2.5">
                        {selectedOrder.returns.map((ret) => (
                          <div key={ret.id} className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/15">
                            <div className="flex items-center justify-between font-bold">
                              <span>RMA #{ret.id}</span>
                              <span className="capitalize px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-600">
                                {ret.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-1">Reason: {ret.reason}</p>
                            {ret.status !== "restocked" && (
                              <button
                                onClick={() => handleRestockReturnItem(ret.id)}
                                className="mt-2.5 w-full py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                              >
                                Restock to Inventory (+Traceable Audit)
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Order Timeline */}
                  <div className="bg-white dark:bg-zinc-800/40 p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span>Order Timeline & Activity</span>
                    </h3>

                    {/* Timeline List */}
                    <div className="relative pl-5 space-y-4 border-l border-zinc-200 dark:border-zinc-800 max-h-56 overflow-y-auto">
                      {(selectedOrder.timeline || []).map((ev) => (
                        <div key={ev.id} className="relative">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 absolute -left-[26px] top-1 ring-4 ring-white dark:ring-zinc-900" />
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-[11px]">{ev.title}</div>
                          <div className="text-zinc-500 dark:text-zinc-400 text-[11px]">{ev.description}</div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            {new Date(ev.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {ev.performedBy || "System"}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Staff Note */}
                    <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
                      <input
                        type="text"
                        placeholder="Add internal note to order timeline..."
                        value={newTimelineNote}
                        onChange={(e) => setNewTimelineNote(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddTimelineNote()}
                        className="flex-1 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none"
                      />
                      <button
                        onClick={handleAddTimelineNote}
                        className="px-3 py-1.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold rounded-xl text-xs hover:opacity-90"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULFILL MODAL */}
      {isFulfillModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">Fulfill & Dispatch Order</h3>
              <button onClick={() => setIsFulfillModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Fulfilling this order will automatically deduct physical stock (On Hand) and remove Committed reservations, while generating a traceable inventory ledger transaction.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Courier / Shipping Partner</label>
                <select
                  value={fulfillCourier}
                  onChange={(e) => setFulfillCourier(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none"
                >
                  <option value="Aramex">Aramex Egypt</option>
                  <option value="Bosta">Bosta Logistics</option>
                  <option value="DHL">DHL Express Worldwide</option>
                  <option value="Mylerz">Mylerz Same-Day</option>
                  <option value="VERO Private Courier">VERO Private VIP Armored Courier</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Tracking Number / AWB</label>
                <input
                  type="text"
                  placeholder="e.g. AMX-EG-893021"
                  value={fulfillTrackingNum}
                  onChange={(e) => setFulfillTrackingNum(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setIsFulfillModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleFulfillOrder}
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {isRefundModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">Issue Refund (Decoupled from Stock)</h3>
              <button onClick={() => setIsRefundModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              <strong>Shopify Architecture Notice:</strong> Issuing a monetary refund does NOT automatically modify inventory. If the physical item is returned, restock it separately via Returns.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Refund Amount ($) — Max: ${(selectedOrder.total - (selectedOrder.amountRefunded || 0)).toLocaleString()}
                </label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Reason for Refund</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none"
                >
                  <option value="Customer Satisfaction">Customer Satisfaction</option>
                  <option value="Order Cancellation">Order Cancellation</option>
                  <option value="Defective Product">Defective Product</option>
                  <option value="Billing Error">Billing Error</option>
                  <option value="Goodwill Courtesy">Goodwill Courtesy</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="Staff reference notes..."
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setIsRefundModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleIssueRefund}
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Process Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE RETURN MODAL */}
      {isReturnModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">Create Return Merchandise Auth (RMA)</h3>
              <button onClick={() => setIsReturnModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Initiates a formal RMA return. Once the package is inspected at the atelier, you can execute a traceable restock to available inventory.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Return Reason</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none"
                >
                  <option value="Customer Size Exchange">Customer Size Exchange</option>
                  <option value="Changed Mind">Changed Mind</option>
                  <option value="Defect Inspection">Defect Inspection</option>
                  <option value="Incorrect Item Shipped">Incorrect Item Shipped</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Atelier Notes</label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Notes for inspection team..."
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReturn}
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Generate RMA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {isCancelModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-rose-600 text-base">Cancel Order #{selectedOrder.orderNumber}</h3>
              <button onClick={() => setIsCancelModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Cancelling will release all committed inventory back to <strong>Available</strong> stock and record an inventory transaction in the audit log.
            </p>

            <div className="text-xs">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Cancellation Reason</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Back
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
