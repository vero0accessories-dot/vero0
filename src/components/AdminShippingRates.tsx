import React, { useState, useEffect } from "react";
import { 
  Truck, 
  MapPin, 
  Search, 
  Check, 
  AlertCircle, 
  Edit2, 
  X, 
  ShieldAlert, 
  ArrowUpDown, 
  SlidersHorizontal,
  RefreshCw
} from "lucide-react";
import { ShippingRate } from "../types";

interface AdminShippingRatesProps {
  getAuthHeaders?: () => Record<string, string>;
  onShowNotification?: (text: string, type: "success" | "error") => void;
}

export const AdminShippingRates: React.FC<AdminShippingRatesProps> = ({
  getAuthHeaders,
  onShowNotification,
}) => {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);
  const [inputRate, setInputRate] = useState<string>("");
  const [inputActive, setInputActive] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/shipping-rates");
      if (res.ok) {
        const data = await res.json();
        setRates(data);
      }
    } catch (err) {
      console.error("Failed to fetch shipping rates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const showBanner = (text: string, type: "success" | "error") => {
    setNotification({ text, type });
    if (onShowNotification) {
      onShowNotification(text, type);
    }
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleStartEdit = (rate: ShippingRate) => {
    setEditingRate(rate);
    setInputRate(rate.rate.toString());
    setInputActive(rate.is_active);
    setValidationError("");
  };

  const handleRateInputChange = (val: string) => {
    setInputRate(val);
    const num = Number(val);
    if (val.trim() === "" || isNaN(num)) {
      setValidationError("Please enter a valid numeric rate.");
    } else if (num < 0) {
      setValidationError("Shipping rate cannot be negative.");
    } else if (num > 90) {
      setValidationError("Maximum shipping rate is 90 EGP.");
    } else {
      setValidationError("");
    }
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRate) return;

    const num = Number(inputRate);
    if (isNaN(num)) {
      setValidationError("Please enter a valid rate.");
      return;
    }
    if (num < 0) {
      setValidationError("Shipping rate cannot be negative.");
      return;
    }
    if (num > 90) {
      setValidationError("Maximum shipping rate is 90 EGP.");
      return;
    }

    try {
      setIsSaving(true);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(getAuthHeaders ? getAuthHeaders() : { "x-admin-authorized": "true" }),
      };

      const res = await fetch(`/api/shipping-rates/${editingRate.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          rate: num,
          is_active: inputActive,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || "Failed to update shipping rate");
      }

      const updated = await res.json();
      setRates((prev) =>
        prev.map((r) => (r.id === editingRate.id ? { ...r, ...updated.rate } : r))
      );
      showBanner(
        `Updated ${editingRate.governorate} shipping rate to ${num} EGP (${inputActive ? "Active" : "Inactive"}).`,
        "success"
      );
      setEditingRate(null);
    } catch (err: any) {
      setValidationError(err.message || "Error saving rate.");
      showBanner(err.message || "Error saving rate.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRates = rates.filter((r) => {
    const matchesSearch =
      r.governorate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.governorate_ar.includes(searchQuery) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? r.is_active
        : !r.is_active;
    return matchesSearch && matchesStatus;
  });

  const activeCount = rates.filter((r) => r.is_active).length;
  const avgRate = rates.length > 0 ? (rates.reduce((acc, r) => acc + Number(r.rate), 0) / rates.length).toFixed(0) : "0";

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Top Banner / Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border shadow-sm ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-stone-400 hover:text-stone-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Meta Summary Cards */}
      <div className="bg-[#1c1917] text-white p-6 rounded-2xl shadow-sm border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Truck className="w-5 h-5 text-amber-400" />
            <h2 className="font-serif text-lg tracking-wide text-amber-100">
              Egyptian Governorate Shipping Rates
            </h2>
          </div>
          <p className="text-xs text-stone-400 font-light max-w-xl">
            Manage automated delivery fees across all 27 Egyptian governorates. Server-side validation strictly enforces the 90 EGP ceiling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-amber-950/60 border border-amber-500/30 text-amber-300">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Max Rate: 90 EGP</span>
          </span>
          <button
            onClick={fetchRates}
            disabled={loading}
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
            title="Refresh rates"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
            Total Governorates
          </span>
          <span className="text-xl font-serif font-bold text-stone-900 mt-1 block">
            {rates.length}
          </span>
          <span className="text-[10px] text-stone-500">All Egyptian zones</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
            Active Delivery Zones
          </span>
          <span className="text-xl font-serif font-bold text-emerald-700 mt-1 block">
            {activeCount}
          </span>
          <span className="text-[10px] text-stone-500">Available at Checkout</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
            Average Rate
          </span>
          <span className="text-xl font-serif font-bold text-amber-800 mt-1 block">
            {avgRate} <span className="text-xs font-sans font-normal">EGP</span>
          </span>
          <span className="text-[10px] text-stone-500">Tiered by region</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
            Rate Bounds
          </span>
          <span className="text-xl font-serif font-bold text-stone-900 mt-1 block">
            50 - 90 <span className="text-xs font-sans font-normal">EGP</span>
          </span>
          <span className="text-[10px] text-amber-600 font-medium">Ceiling enforced</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search governorate (Cairo, القاهرة)..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:border-amber-500 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <span className="text-xs text-stone-400 font-medium mr-1 hidden sm:inline">Status:</span>
          {(["all", "active", "inactive"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all capitalize cursor-pointer ${
                statusFilter === filter
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {filter === "all" ? "All (27)" : filter === "active" ? `Active (${activeCount})` : `Inactive (${rates.length - activeCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Rates Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 text-[10px] font-bold text-stone-500 uppercase tracking-wider border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Governorate / المحافظة</th>
                <th className="py-3 px-4">Canonical Identifier</th>
                <th className="py-3 px-4 text-right">Shipping Rate (EGP)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-stone-400" />
                    <span>Loading Egyptian shipping rates...</span>
                  </td>
                </tr>
              ) : filteredRates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-400">
                    No governorates matched your search.
                  </td>
                </tr>
              ) : (
                filteredRates.map((rate) => (
                  <tr
                    key={rate.id}
                    className="hover:bg-amber-50/30 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-medium text-stone-900">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-600 transition-colors" />
                        <div>
                          <span className="font-semibold text-stone-900 block">{rate.governorate}</span>
                          <span className="text-[11px] text-stone-500 font-serif" dir="rtl">{rate.governorate_ar}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-stone-500">
                      <span className="px-2 py-0.5 bg-stone-100 rounded text-stone-600 border border-stone-200">
                        {rate.id}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900 text-sm">
                      {rate.rate} <span className="text-[10px] font-sans font-normal text-stone-500">EGP</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          rate.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-stone-100 text-stone-500 border border-stone-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            rate.is_active ? "bg-emerald-500" : "bg-stone-400"
                          }`}
                        />
                        <span>{rate.is_active ? "Active" : "Inactive"}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleStartEdit(rate)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 font-medium text-xs transition-all shadow-2xs hover:border-amber-400 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3 text-stone-500" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Shipping Rate Modal */}
      {editingRate && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-stone-200 shadow-2xl overflow-hidden animate-scaleIn">
            <div className="bg-[#1c1917] text-white p-5 flex items-center justify-between border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-serif text-sm text-amber-100 font-semibold tracking-wide">
                    Edit Shipping Rate
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    {editingRate.governorate} — {editingRate.governorate_ar}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingRate(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="p-6 space-y-5">
              {/* Info block */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Governorate</span>
                  <span className="font-semibold text-stone-900">{editingRate.governorate}</span>
                  <span className="text-stone-500 ml-1">({editingRate.governorate_ar})</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Identifier</span>
                  <span className="font-mono text-stone-700 bg-stone-200/70 px-1.5 py-0.5 rounded text-[11px]">{editingRate.id}</span>
                </div>
              </div>

              {/* Rate input with max 90 EGP enforcement */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block">
                    Shipping Rate (EGP) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Max: 90 EGP
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="90"
                    step="1"
                    required
                    value={inputRate}
                    onChange={(e) => handleRateInputChange(e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border ${
                      validationError
                        ? "border-rose-400 bg-rose-50/30 text-rose-900 focus:border-rose-500"
                        : "border-stone-300 bg-white focus:border-amber-500"
                    } focus:outline-none transition-all`}
                    placeholder="Enter rate (e.g. 50, 70, 90)"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                    EGP
                  </span>
                </div>

                {/* Validation Error Message */}
                {validationError && (
                  <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5 mt-1 animate-shake">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{validationError}</span>
                  </p>
                )}
                {!validationError && (
                  <p className="text-[10px] text-stone-400">
                    Rates must be between 0 and 90 EGP. Values above 90 EGP are rejected by the system.
                  </p>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <span className="text-xs font-bold text-stone-800 block">Zone Availability</span>
                  <span className="text-[11px] text-stone-500 font-light block">
                    {inputActive
                      ? "Customers in this governorate can place delivery orders."
                      : "Delivery to this governorate is temporarily disabled at checkout."}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inputActive}
                    onChange={(e) => setInputActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingRate(null)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !!validationError || inputRate.trim() === ""}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#1c1917] hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Shipping Rate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
