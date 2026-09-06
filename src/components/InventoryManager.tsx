import React, { useState, useEffect, useMemo } from "react";
import {
  Boxes,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Minus,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  FileText,
  History,
  TrendingDown,
  TrendingUp,
  Package,
  Layers,
  X,
  ChevronRight,
  DollarSign,
  ShieldCheck,
  Tag,
  Sliders,
  AlertCircle
} from "lucide-react";
import { InventoryItem, InventoryTransaction, InventoryAdjustmentType } from "../types";
import PriceDisplay from "./PriceDisplay";

interface InventoryManagerProps {
  getAuthHeaders: () => Record<string, string>;
  onRefreshProducts?: () => void;
  currentUser?: any;
}

export default function InventoryManager({ getAuthHeaders, onRefreshProducts, currentUser }: InventoryManagerProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Drawers & Modals
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState<boolean>(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<InventoryItem | null>(null);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null);

  // Adjustment form state
  const [adjustQuantity, setAdjustQuantity] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<InventoryAdjustmentType>("Stock Received");
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [adjustNotes, setAdjustNotes] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchInventoryData = async () => {
    setIsLoading(true);
    try {
      const [invRes, kpiRes, txRes] = await Promise.all([
        fetch("/api/inventory", { headers: getAuthHeaders() }),
        fetch("/api/inventory/kpis", { headers: getAuthHeaders() }),
        fetch("/api/inventory/transactions", { headers: getAuthHeaders() })
      ]);

      if (invRes.ok) {
        const data = await invRes.json();
        setInventory(data);
      }
      if (kpiRes.ok) {
        const kpiData = await kpiRes.json();
        setKpis(kpiData);
      }
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData);
      }
    } catch (err) {
      console.error("Error fetching inventory:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtered inventory items
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const search = searchQuery.toLowerCase();
      const matchesSearch =
        !search ||
        item.productName.toLowerCase().includes(search) ||
        item.sku.toLowerCase().includes(search) ||
        (item.categoryName || "").toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "all" || item.stockStatus === statusFilter;

      const matchesCategory =
        categoryFilter === "all" || item.categoryName === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [inventory, searchQuery, statusFilter, categoryFilter]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach((it) => {
      if (it.categoryName) set.add(it.categoryName);
    });
    return Array.from(set);
  }, [inventory]);

  // Handle Manual Stock Adjustment
  const handlePerformAdjustment = async () => {
    if (!selectedItemForAdjust) return;
    if (!adjustReason || !adjustReason.trim()) {
      showToast("A clear reason must be specified for stock adjustment", "error");
      return;
    }
    if (adjustQuantity === 0) {
      showToast("Adjustment quantity cannot be 0", "error");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productId: selectedItemForAdjust.productId,
          sku: selectedItemForAdjust.sku,
          adjustmentQuantity: adjustQuantity,
          adjustmentType: adjustType,
          reason: adjustReason.trim(),
          notes: adjustNotes.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Stock updated for ${selectedItemForAdjust.sku} (${adjustQuantity > 0 ? "+" : ""}${adjustQuantity} units).`);
        setIsAdjustModalOpen(false);
        setAdjustReason("");
        setAdjustNotes("");
        setAdjustQuantity(1);
        fetchInventoryData();
        if (onRefreshProducts) onRefreshProducts();
      } else {
        showToast(data.error || "Failed to adjust stock", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Open adjustment modal for a given item
  const openAdjustModal = (item: InventoryItem) => {
    setSelectedItemForAdjust(item);
    setAdjustQuantity(1);
    setAdjustType("Stock Received");
    setAdjustReason("");
    setAdjustNotes("");
    setIsAdjustModalOpen(true);
  };

  // Open transaction audit drawer for an item or all items
  const openAuditDrawer = (item?: InventoryItem) => {
    setSelectedItemForHistory(item || null);
    setIsAuditDrawerOpen(true);
  };

  // Helper status badge
  const renderStockStatusBadge = (status: string) => {
    switch (status) {
      case "in_stock":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" /> In Stock</span>;
      case "low_stock":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20"><AlertTriangle className="w-3 h-3" /> Low Stock</span>;
      case "out_of_stock":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20"><AlertCircle className="w-3 h-3" /> Out of Stock</span>;
      case "overstocked":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20"><Boxes className="w-3 h-3" /> High Stock</span>;
      default:
        return null;
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
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Inventory & Stock Tiers</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Shopify-grade multi-tier stock architecture with traceable ledger auditing
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => openAuditDrawer()}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 rounded-xl transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            Audit Ledger ({transactions.length})
          </button>

          <button
            onClick={fetchInventoryData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Executive KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total SKUs</div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
            {kpis?.totalSkus ?? inventory.length}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Catalog items</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">On Hand</div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
            {kpis?.totalOnHand ?? inventory.reduce((acc, i) => acc + i.onHand, 0)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Physical warehouse units</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Committed</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {kpis?.totalCommitted ?? inventory.reduce((acc, i) => acc + i.committed, 0)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Reserved in open orders</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Available</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {kpis?.totalAvailable ?? inventory.reduce((acc, i) => acc + i.available, 0)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Ready for checkout</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Low / Out</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {kpis?.lowStockCount ?? inventory.filter((i) => i.available <= i.lowStockThreshold).length}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Items need reorder</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Valuation</div>
          <div className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-1 truncate">
            <PriceDisplay price={kpis?.totalInventoryValue ?? inventory.reduce((acc, i) => acc + (i.inventoryValue || (i.onHand * (i.unitCost || i.retailPrice || 0))), 0)} />
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Asset cost basis</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by product name, SKU (e.g. VERO-RNG-001), category..."
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

        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value="all">Stock Status: All</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock (≤ Threshold)</option>
            <option value="out_of_stock">Out of Stock (0 Available)</option>
            <option value="overstocked">High Stock</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value="all">Category: All</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Multi-Tier Inventory Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Product & SKU</th>
                <th className="px-4 py-3.5 text-center">On Hand (Physical)</th>
                <th className="px-4 py-3.5 text-center text-amber-600 dark:text-amber-400">Committed</th>
                <th className="px-4 py-3.5 text-center text-emerald-600 dark:text-emerald-400">Available (Sellable)</th>
                <th className="px-4 py-3.5 text-center">Threshold</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Asset Value</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-400 dark:text-zinc-500">
                    <Boxes className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm font-medium">No inventory records matching filters</p>
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.productImage || "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&q=80"}
                          alt={item.productName}
                          className="w-10 h-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-zinc-900 dark:text-zinc-100 max-w-[200px] truncate">{item.productName}</div>
                          <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                            <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{item.sku}</span>
                            <span>•</span>
                            <span>{item.categoryName}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                      {item.onHand}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 font-bold font-mono">
                        {item.committed}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-sm">
                      <span className={item.available <= item.lowStockThreshold ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                        {item.available}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center text-zinc-400 font-mono">
                      {item.lowStockThreshold}
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      {renderStockStatusBadge(item.stockStatus)}
                    </td>

                    <td className="px-4 py-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                      <PriceDisplay price={item.inventoryValue ?? (item.onHand * (item.unitCost || item.retailPrice || 0))} />
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openAdjustModal(item)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:opacity-90 transition-colors"
                        >
                          Adjust Stock
                        </button>
                        <button
                          onClick={() => openAuditDrawer(item)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="View Item History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUSTMENT MODAL */}
      {isAdjustModalOpen && selectedItemForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">Adjust Physical Stock</h3>
              </div>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product Summary */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex items-center gap-3">
              <img
                src={selectedItemForAdjust.productImage || "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&q=80"}
                alt={selectedItemForAdjust.productName}
                className="w-12 h-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700"
              />
              <div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">{selectedItemForAdjust.productName}</div>
                <div className="text-[11px] text-zinc-400 font-mono">SKU: {selectedItemForAdjust.sku}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Current On Hand: <strong>{selectedItemForAdjust.onHand}</strong> • Available: <strong>{selectedItemForAdjust.available}</strong>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none"
                >
                  <option value="Stock Received">Stock Received from Supplier (+)</option>
                  <option value="Inventory Count Correction">Physical Cycle Count Correction (+ / -)</option>
                  <option value="Damaged Stock">Damaged / Defective Stock (-)</option>
                  <option value="Return Restock">Customer Return Restock (+)</option>
                  <option value="Promotion or Gift">VIP Gift / Showroom Display (-)</option>
                  <option value="Write-off / Scrap">Loss / Write-off (-)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Quantity Adjustment ({adjustQuantity >= 0 ? `+${adjustQuantity}` : adjustQuantity})
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustQuantity((prev) => prev - 1)}
                    className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(Number(e.target.value))}
                    className="flex-1 px-3 py-2 text-center bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustQuantity((prev) => prev + 1)}
                    className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Before and After Preview */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex justify-between">
                <div>
                  New On Hand: <strong>{Math.max(0, selectedItemForAdjust.onHand + adjustQuantity)}</strong>
                </div>
                <div>
                  New Available: <strong>{Math.max(0, selectedItemForAdjust.available + adjustQuantity)}</strong>
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Reason for Adjustment <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received shipment batch #891 / Monthly physical count audit"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Additional Staff Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Warehouse location shelf, batch number, etc..."
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handlePerformAdjustment}
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 rounded-xl shadow-sm hover:opacity-90 transition-colors flex items-center gap-2"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Commit Stock Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT TRAIL / TRANSACTIONS DRAWER */}
      {isAuditDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl h-full border-l border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
                    {selectedItemForHistory ? `Audit Trail: ${selectedItemForHistory.sku}` : "Full Inventory Audit Trail"}
                  </h3>
                  <p className="text-xs text-zinc-500">Traceable historical ledger of all stock movements</p>
                </div>
              </div>
              <button onClick={() => setIsAuditDrawerOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 text-xs">
              {transactions
                .filter((tx) => !selectedItemForHistory || tx.sku === selectedItemForHistory.sku || tx.productId === selectedItemForHistory.productId)
                .map((tx) => (
                  <div key={tx.id} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-amber-600 dark:text-amber-400">{tx.sku}</span>
                        <span className="text-zinc-400">•</span>
                        <span className="text-zinc-900 dark:text-zinc-100">{tx.productName}</span>
                      </div>
                      <span className={`font-mono font-bold text-sm ${tx.quantityDelta > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {tx.quantityDelta > 0 ? `+${tx.quantityDelta}` : tx.quantityDelta} units
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span className="px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium">
                        {tx.movementType}
                      </span>
                      <span>{new Date(tx.createdAt).toLocaleString()}</span>
                    </div>

                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800/80 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                      <div><strong>Reason:</strong> {tx.reason}</div>
                      {tx.performedBy && <div className="mt-0.5 text-zinc-400">Actor: {tx.performedBy}</div>}
                    </div>

                    <div className="flex justify-between text-[10px] text-zinc-400 font-mono pt-1">
                      <span>On Hand: {tx.onHandBefore} → {tx.onHandAfter}</span>
                      <span>Available: {tx.availableBefore} → {tx.availableAfter}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
