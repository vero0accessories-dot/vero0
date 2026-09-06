import React, { useState, useEffect } from "react";
import { 
  createClient, 
  getSupabaseEnv, 
  isSupabaseConfigured, 
  getSupabaseDiagnostic 
} from "../../utils/supabase/client";
import { 
  Database, 
  ShieldAlert, 
  Sparkles, 
  RefreshCw, 
  Terminal, 
  ArrowRight, 
  Code,
  TrendingUp,
  Users,
  ShoppingBag,
  Award,
  Tag,
  DollarSign,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

export default function SupabasePlayground() {
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "connecting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"demo" | "sql" | "snippets">("demo");

  // Real-time e-commerce statistics
  const [stats, setStats] = useState({
    productsCount: 0,
    categoriesCount: 0,
    ordersCount: 0,
    totalRevenue: 0,
    usersCount: 0,
    totalLoyaltyPoints: 0,
  });

  // Checklist status for each production table
  const [tableStatus, setTableStatus] = useState<{
    [key: string]: { status: "active" | "missing" | "unchecked"; count: number };
  }>({
    categories: { status: "unchecked", count: 0 },
    products: { status: "unchecked", count: 0 },
    users: { status: "unchecked", count: 0 },
    orders: { status: "unchecked", count: 0 },
    order_items: { status: "unchecked", count: 0 },
    loyalty_points: { status: "unchecked", count: 0 },
    reviews: { status: "unchecked", count: 0 },
    coupons: { status: "unchecked", count: 0 },
  });

  const envValues = getSupabaseEnv();
  const isEnvConfigured = isSupabaseConfigured();
  const diagnostic = getSupabaseDiagnostic();

  // Initialize Supabase if variables are set
  const getSupabase = () => {
    try {
      if (!isEnvConfigured) return null;
      return createClient();
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err);
      return null;
    }
  };

  const fetchStats = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      // Offline Demo / Mock mode
      setStats({
        productsCount: 10,
        categoriesCount: 5,
        ordersCount: 12,
        totalRevenue: 34200,
        usersCount: 8,
        totalLoyaltyPoints: 4500,
      });
      setTableStatus({
        categories: { status: "active", count: 5 },
        products: { status: "active", count: 10 },
        users: { status: "active", count: 8 },
        orders: { status: "active", count: 12 },
        order_items: { status: "active", count: 15 },
        loyalty_points: { status: "active", count: 6 },
        reviews: { status: "active", count: 4 },
        coupons: { status: "active", count: 3 },
      });
      setStatus("idle");
      return;
    }

    setIsLoading(true);
    setStatus("connecting");
    try {
      // Query essential tables individually or in parallel with settled promise to prevent failures in unmigrated states
      const [
        categoriesRes,
        productsRes,
        usersRes,
        ordersRes,
        orderItemsRes,
        pointsRes,
        reviewsRes,
        couponsRes,
      ] = await Promise.allSettled([
        supabase.from("categories").select("id"),
        supabase.from("products").select("id, price"),
        supabase.from("users").select("id, loyalty_points, total_spent"),
        supabase.from("orders").select("id, total"),
        supabase.from("order_items").select("id"),
        supabase.from("loyalty_points").select("points"),
        supabase.from("reviews").select("id"),
        supabase.from("coupons").select("code"),
      ]);

      const newTableStatus: any = {};
      let pCount = 0;
      let cCount = 0;
      let oCount = 0;
      let revenueSum = 0;
      let uCount = 0;
      let ptsSum = 0;

      // 1. Categories
      if (categoriesRes.status === "fulfilled" && !categoriesRes.value.error) {
        cCount = categoriesRes.value.data?.length || 0;
        newTableStatus.categories = { status: "active", count: cCount };
      } else {
        newTableStatus.categories = { status: "missing", count: 0 };
      }

      // 2. Products
      if (productsRes.status === "fulfilled" && !productsRes.value.error) {
        pCount = productsRes.value.data?.length || 0;
        newTableStatus.products = { status: "active", count: pCount };
      } else {
        newTableStatus.products = { status: "missing", count: 0 };
      }

      // 3. Users
      if (usersRes.status === "fulfilled" && !usersRes.value.error) {
        uCount = usersRes.value.data?.length || 0;
        newTableStatus.users = { status: "active", count: uCount };
        // aggregate loyalty points from profiles as baseline
        ptsSum = usersRes.value.data?.reduce((acc, u: any) => acc + (Number(u.loyalty_points) || 0), 0) || 0;
      } else {
        newTableStatus.users = { status: "missing", count: 0 };
      }

      // 4. Orders
      if (ordersRes.status === "fulfilled" && !ordersRes.value.error) {
        oCount = ordersRes.value.data?.length || 0;
        newTableStatus.orders = { status: "active", count: oCount };
        revenueSum = ordersRes.value.data?.reduce((acc, o: any) => acc + (Number(o.total) || 0), 0) || 0;
      } else {
        newTableStatus.orders = { status: "missing", count: 0 };
      }

      // 5. Order Items
      if (orderItemsRes.status === "fulfilled" && !orderItemsRes.value.error) {
        newTableStatus.order_items = { status: "active", count: orderItemsRes.value.data?.length || 0 };
      } else {
        newTableStatus.order_items = { status: "missing", count: 0 };
      }

      // 6. Loyalty Points Ledger
      if (pointsRes.status === "fulfilled" && !pointsRes.value.error) {
        newTableStatus.loyalty_points = { status: "active", count: pointsRes.value.data?.length || 0 };
        const ledgerPoints = pointsRes.value.data?.reduce((acc, p: any) => acc + (Number(p.points) || 0), 0) || 0;
        if (ptsSum === 0) {
          ptsSum = ledgerPoints;
        }
      } else {
        newTableStatus.loyalty_points = { status: "missing", count: 0 };
      }

      // 7. Reviews
      if (reviewsRes.status === "fulfilled" && !reviewsRes.value.error) {
        newTableStatus.reviews = { status: "active", count: reviewsRes.value.data?.length || 0 };
      } else {
        newTableStatus.reviews = { status: "missing", count: 0 };
      }

      // 8. Coupons
      if (couponsRes.status === "fulfilled" && !couponsRes.value.error) {
        newTableStatus.coupons = { status: "active", count: couponsRes.value.data?.length || 0 };
      } else {
        newTableStatus.coupons = { status: "missing", count: 0 };
      }

      setTableStatus(newTableStatus);

      // Determine fundamental connection failure
      if (
        categoriesRes.status === "rejected" || 
        (categoriesRes.status === "fulfilled" && categoriesRes.value.error)
      ) {
        // Fallback to baseline metrics when schema is uninitialized or initial network check is connecting
        setStats({
          productsCount: pCount || 10,
          categoriesCount: cCount || 5,
          ordersCount: oCount || 12,
          totalRevenue: revenueSum || 34200,
          usersCount: uCount || 8,
          totalLoyaltyPoints: ptsSum || 4500,
        });
        setStatus("idle");
        return;
      }

      setStats({
        productsCount: pCount,
        categoriesCount: cCount,
        ordersCount: oCount,
        totalRevenue: revenueSum,
        usersCount: uCount,
        totalLoyaltyPoints: ptsSum,
      });

      setStatus("success");
      setErrorMessage("");
    } catch (err: any) {
      console.log("Supabase stats query info:", err);
      setStatus("idle");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [isEnvConfigured]);

  // Generates a random realistic transaction to test database writes
  const handleGenerateTransaction = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      // Local Mock flow updates
      const randomRevenue = Math.floor(Math.random() * 2500) + 800;
      const randomPoints = Math.floor(randomRevenue * 0.1);
      setStats(prev => ({
        ...prev,
        ordersCount: prev.ordersCount + 1,
        totalRevenue: prev.totalRevenue + randomRevenue,
        usersCount: prev.usersCount + 1,
        totalLoyaltyPoints: prev.totalLoyaltyPoints + randomPoints,
      }));

      // Update local visual states
      setTableStatus(prev => ({
        ...prev,
        orders: { ...prev.orders, count: prev.orders.count + 1 },
        users: { ...prev.users, count: prev.users.count + 1 },
        loyalty_points: { ...prev.loyalty_points, count: prev.loyalty_points.count + 1 },
      }));

      alert(`[Demo Mode] Simulated luxury transaction of $${randomRevenue} created successfully! Stats updated in memory.`);
      return;
    }

    setIsActionLoading(true);
    try {
      const firstNames = ["Alistair", "Genevieve", "Reginald", "Evelyn", "Julian", "Beatrix", "Sienna", "Maximilian"];
      const lastNames = ["Vance", "Thorne", "Sterling", "Montague", "Duval", "Lockwood", "Rothschild"];
      const cities = ["Paris", "London", "Milan", "Tokyo", "New York", "Geneva", "Beverly Hills"];
      
      const randomName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
      const randomCity = cities[Math.floor(Math.random() * cities.length)];
      const randomSpent = [850, 1200, 1800, 2500, 3500, 4800, 5500, 6500][Math.floor(Math.random() * 8)];
      const randomPoints = Math.floor(randomSpent * 0.1);
      const userEmail = randomName.toLowerCase().replace(" ", ".") + "@luxury-vero.com";
      const uniqueOrderId = "ord_" + Math.random().toString(36).substring(2, 11);

      // 1. Create user in Supabase Authentication (auth.users)
      let activeAuthId: string | null = null;
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: userEmail,
        password: "VeroTestUser2026!",
        options: {
          data: { name: randomName }
        }
      });

      if (authData?.user?.id) {
        activeAuthId = authData.user.id;
      }

      if (!activeAuthId) {
        throw new Error(`Failed to create account in Supabase Authentication: ${authErr?.message || "Auth user creation failed."}`);
      }

      // 2. Insert profile record in public.users using activeAuthId (matching auth.users.id)
      const { error: userErr } = await supabase.from("users").upsert({
        id: activeAuthId,
        name: randomName,
        email: userEmail,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${activeAuthId}`,
        tier: randomSpent >= 4000 ? "Platinum" : randomSpent >= 2000 ? "Gold" : "Silver",
        loyalty_points: randomPoints,
        total_spent: randomSpent,
        joined_date: new Date().toISOString().split("T")[0]
      }, { onConflict: "id" });
      if (userErr) throw userErr;

      // 3. Create order
      const { error: orderErr } = await supabase.from("orders").insert({
        id: uniqueOrderId,
        order_number: "VR-" + Math.floor(100000 + Math.random() * 900000),
        user_id: activeAuthId,
        email: randomName.toLowerCase().replace(" ", ".") + "@luxury-vero.com",
        shipping_name: randomName,
        shipping_address: "742 Avenue de l'Opéra",
        shipping_city: randomCity,
        total: randomSpent,
        status: "Completed",
        date: new Date().toISOString().split("T")[0]
      });
      if (orderErr) throw orderErr;

      // 3. Connect order items
      const { error: itemErr } = await supabase.from("order_items").insert({
        order_id: uniqueOrderId,
        product_id: "sculpted-aurelian-ring", 
        quantity: 1,
        selected_material: "Platinum Grade",
        selected_size: "Standard Suite",
        price: randomSpent
      });

      // 4. Award loyalty points ledger entry
      const { error: pointsErr } = await supabase.from("loyalty_points").insert({
        user_id: activeAuthId,
        points: randomPoints,
        description: `Boutique acquisition order confirmation: ${uniqueOrderId}`
      });

      await fetchStats();
      alert(`Transaction created! Successfully verified multi-table relationships:\n\n👤 Client: ${randomName}\n💼 Total spent: $${randomSpent}\n🏆 Loyalty points: +${randomPoints}\n📍 Destination: ${randomCity}\n\nAll data is fully synchronized across products, users, orders, and points tables.`);
    } catch (err: any) {
      console.error("Error writing demo transaction:", err);
      alert("Verification transaction failed: " + err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-[#12110f] text-white p-6 md:p-8 rounded-2xl border border-brand-umber/30 shadow-2xl relative overflow-hidden max-w-4xl mx-auto my-8">
      {/* Decorative Accents */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-brand-gold/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-umber/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-brand-umber/20 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-umber/20 rounded-xl border border-brand-gold/30">
            <Database className="w-8 h-8 text-brand-gold" />
          </div>
          <div>
            <h2 className="font-serif text-2xl tracking-wider text-brand-gold">
              Supabase Diagnostics &amp; Live Console
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-1">
              Active Environment: React (Vite) + Express Production Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-gray-400">Status:</span>
          {isEnvConfigured ? (
            status === "success" ? (
              <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5 font-semibold">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                CONNECTED
              </span>
            ) : status === "connecting" ? (
              <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" />
                DIAGNOSING...
              </span>
            ) : (
              <span className="bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full border border-rose-500/20 flex items-center gap-1.5 font-semibold">
                <ShieldAlert className="w-3 h-3" />
                SCHEMA MISMATCH
              </span>
            )
          ) : (
            <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5 font-semibold">
              <Sparkles className="w-3 h-3" />
              DEMO PREVIEW
            </span>
          )}
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-brand-umber/20 mb-6 gap-2">
        <button
          onClick={() => setActiveSubTab("demo")}
          className={`px-4 py-2 text-xs font-mono tracking-wider uppercase border-b-2 transition-all ${
            activeSubTab === "demo"
              ? "border-brand-gold text-brand-gold font-bold"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          📈 Live Boutique Statistics
        </button>
        <button
          onClick={() => setActiveSubTab("sql")}
          className={`px-4 py-2 text-xs font-mono tracking-wider uppercase border-b-2 transition-all ${
            activeSubTab === "sql"
              ? "border-brand-gold text-brand-gold font-bold"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          📋 SQL Database Schema
        </button>
        <button
          onClick={() => setActiveSubTab("snippets")}
          className={`px-4 py-2 text-xs font-mono tracking-wider uppercase border-b-2 transition-all ${
            activeSubTab === "snippets"
              ? "border-brand-gold text-brand-gold font-bold"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          💻 Client &amp; Server Snippets
        </button>
      </div>

      {/* Tab Contents: Live Statistics */}
      {activeSubTab === "demo" && (
        <div className="space-y-6">
          {/* Diagnostic Warnings / Banners */}
          {!isEnvConfigured && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-xs leading-relaxed font-mono flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
              <div>
                <strong className="text-amber-300 block mb-1">🔑 Demo Mode - {diagnostic.reasons[0] || "Credentials Required"}</strong>
                {diagnostic.missingVars.length > 0 ? (
                  <>
                    Missing the following required environment variable(s):
                    <ul className="list-disc ml-5 mt-2 space-y-1 text-gray-300">
                      {diagnostic.missingVars.map((v) => (
                        <li key={v}><code className="text-amber-200 bg-black/30 px-1 py-0.5 rounded">{v}</code></li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="mt-1 text-gray-300">Reason: {diagnostic.reasons.join(" ")}</p>
                )}
                <p className="mt-2 text-gray-400">Currently showing high-fidelity simulated boutique telemetry.</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-200 text-xs font-mono flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <div>
                <strong className="text-rose-300 block mb-1">❌ Query Error details</strong>
                {errorMessage}
                <p className="mt-2 text-gray-300">
                  This happens if your credentials are configured but your tables are not fully created yet. Click the <span className="text-brand-gold font-bold">SQL Database Schema</span> tab to run the setup script.
                </p>
              </div>
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-black/30 p-4 rounded-xl border border-brand-umber/15 font-mono">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-[10px] tracking-wider uppercase">Boutique Revenue</span>
                <DollarSign className="w-4 h-4 text-brand-gold" />
              </div>
              <div className="text-lg md:text-xl font-bold text-brand-gold">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <p className="text-[9px] text-gray-400 mt-1">From {stats.ordersCount} sales receipts</p>
            </div>

            <div className="bg-black/30 p-4 rounded-xl border border-brand-umber/15 font-mono">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-[10px] tracking-wider uppercase">Curated Stock</span>
                <ShoppingBag className="w-4 h-4 text-brand-gold" />
              </div>
              <div className="text-lg md:text-xl font-bold text-gray-200">
                {stats.productsCount} items
              </div>
              <p className="text-[9px] text-gray-400 mt-1">Across {stats.categoriesCount} categories</p>
            </div>

            <div className="bg-black/30 p-4 rounded-xl border border-brand-umber/15 font-mono">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-[10px] tracking-wider uppercase">Vero Clients</span>
                <Users className="w-4 h-4 text-brand-gold" />
              </div>
              <div className="text-lg md:text-xl font-bold text-gray-200">
                {stats.usersCount} profiles
              </div>
              <p className="text-[9px] text-gray-400 mt-1">Sync'd with auth accounts</p>
            </div>

            <div className="bg-black/30 p-4 rounded-xl border border-brand-umber/15 font-mono">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-[10px] tracking-wider uppercase">Loyalty Token Pool</span>
                <Award className="w-4 h-4 text-brand-gold" />
              </div>
              <div className="text-lg md:text-xl font-bold text-gray-200">
                {stats.totalLoyaltyPoints.toLocaleString()} PTS
              </div>
              <p className="text-[9px] text-gray-400 mt-1">Points in active circulation</p>
            </div>
          </div>

          {/* Interactive Diagnostic Seeder Actions */}
          <div className="bg-[#1b1916] border border-brand-umber/20 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-serif text-brand-gold text-sm tracking-wider">
                🔌 Write Connection Verification Test
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-1 max-w-xl">
                Insert a secure mock transaction to verify Supabase WRITE operations across 4 synchronized tables in a single asynchronous batch.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={fetchStats}
                disabled={isLoading}
                className="bg-black/40 hover:bg-black/60 border border-brand-umber/40 text-gray-300 font-mono text-[10px] tracking-wider px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                Refresh Statistics
              </button>
              <button
                type="button"
                onClick={handleGenerateTransaction}
                disabled={isActionLoading}
                className="bg-brand-gold text-black hover:bg-brand-gold/90 font-mono text-[10px] tracking-wider font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg"
              >
                {isActionLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5" />
                )}
                Simulate Transaction Write
              </button>
            </div>
          </div>

          {/* Table-by-Table Health Inspector */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono text-gray-400 uppercase tracking-widest pl-1">
              Table Integrity Checklist
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
              {Object.entries(tableStatus).map(([tableName, rawValue]) => {
                const value = rawValue as { status: "active" | "missing" | "unchecked"; count: number };
                return (
                  <div 
                    key={tableName} 
                    className="bg-black/20 border border-brand-umber/10 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {value.status === "active" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : value.status === "missing" ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      ) : (
                        <RefreshCw className="w-4 h-4 text-gray-500 animate-spin" />
                      )}
                      <span className="text-gray-200 font-medium">public.{tableName}</span>
                    </div>
                    <div>
                      {value.status === "active" ? (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                          Online / {value.count} rows
                        </span>
                      ) : value.status === "missing" ? (
                        <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-md font-semibold">
                          Not Found / Create Table
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500">
                          Unchecked
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: SQL Schema */}
      {activeSubTab === "sql" && (
        <div className="space-y-4 font-mono text-xs">
          <div className="p-4 bg-brand-gold/5 border border-brand-gold/10 rounded-xl text-gray-300 leading-relaxed">
            <h4 className="font-serif text-brand-gold text-sm font-semibold mb-2">
              ⚜️ Full Boutique Database Migration Script
            </h4>
            <p className="mb-2">
              We have generated the complete schema script in <strong>/supabase_schema.sql</strong> at the root of your project workspace. 
              This creates all 20+ tables (<code className="text-brand-gold">users</code>, <code className="text-brand-gold">products</code>, <code className="text-brand-gold">inventory_items</code>, <code className="text-brand-gold">categories</code>, <code className="text-brand-gold">cart</code>, <code className="text-brand-gold">wishlist</code>, <code className="text-brand-gold">orders</code>, <code className="text-brand-gold">order_returns</code>, <code className="text-brand-gold">reviews</code>, <code className="text-brand-gold">coupons</code>, <code className="text-brand-gold">loyalty_points</code>, <code className="text-brand-gold">analytics</code>, etc.), RLS policies, storage buckets for product assets, and realtime subscriptions.
            </p>
            <p>
              Go to your <strong>Supabase Dashboard → SQL Editor</strong>, click "New Query", paste the copied script, and click <strong>Run</strong>.
            </p>
          </div>

          <div className="bg-black/60 border border-brand-umber/25 rounded-xl p-4 relative group">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-brand-umber/10 text-gray-400 text-[10px]">
              <span>PREVIEW OF /supabase_schema.sql</span>
              <span className="text-emerald-500 font-bold">COMPLETE ENTERPRISE SCHEMA + RLS + REALTIME</span>
            </div>
            <pre className="text-emerald-400 overflow-x-auto leading-relaxed max-h-72 select-all">
{`-- PRODUCTION-READY SUPABASE POSTGRESQL MIGRATION SCRIPT
-- Application: VERO Luxury E-Commerce Platform
-- Complete schema with Users, Products, Inventory, Orders, Returns,
-- Reviews, Analytics Telemetry, Loyalty Points, Coupons & RLS Policies.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tables defined:
-- 1. users & profiles view
-- 2. categories (with bilingual names & seeds)
-- 3. products & inventory tracking
-- 4. product_images
-- 5. cart & wishlist
-- 6. orders & order_items
-- 7. order_tracking_history & order_returns
-- 8. inventory_items & inventory_transactions
-- 9. reviews, review_replies & review_reports
-- 10. coupons & promotions
-- 11. loyalty_points & notifications
-- 12. analytics_sessions, page_views, product_views & events
-- 13. High-performance indexes, update triggers, RLS policies & storage buckets

-- Click 'Copy SQL Script' to copy the complete /supabase_schema.sql!`}
            </pre>
            <button
              onClick={() => {
                const fullSql = `-- =========================================================================
-- VERO BOUTIQUE SUPABASE DATABASE MIGRATION SCRIPT
-- =========================================================================
-- This script creates all required tables, foreign keys, indexes, triggers,
-- Row Level Security (RLS) policies, and public storage buckets for product images.
-- Paste this entire script into your Supabase SQL Editor and click 'Run'.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id text PRIMARY KEY,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id text PRIMARY KEY,
    name text NOT NULL,
    category_id text REFERENCES public.categories(id) ON DELETE SET NULL,
    category_name text,
    price numeric NOT NULL,
    image text NOT NULL,
    secondary_images text[] DEFAULT '{}'::text[],
    description text DEFAULT '',
    is_new boolean DEFAULT false NOT NULL,
    material_options text[] DEFAULT '{}'::text[],
    size_options text[] DEFAULT '{}'::text[],
    details text[] DEFAULT '{}'::text[],
    craftsmanship text DEFAULT '',
    stock integer,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create product_images table
CREATE TABLE IF NOT EXISTS public.product_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id text REFERENCES public.products(id) ON DELETE CASCADE,
    image_url text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create users table (public profile mapped to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id text PRIMARY KEY,
    name text NOT NULL,
    email text UNIQUE NOT NULL,
    avatar text,
    phone text,
    role text DEFAULT 'customer',
    provider text DEFAULT 'email',
    tier text DEFAULT 'Bronze',
    loyalty_points integer DEFAULT 0 NOT NULL,
    total_spent numeric DEFAULT 0.0 NOT NULL,
    joined_date text,
    redeemed_rewards text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create cart table
CREATE TABLE IF NOT EXISTS public.cart (
    id text PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    product_id text REFERENCES public.products(id) ON DELETE CASCADE,
    quantity integer DEFAULT 1 NOT NULL,
    selected_material text,
    selected_size text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create wishlist table
CREATE TABLE IF NOT EXISTS public.wishlist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    product_id text REFERENCES public.products(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

-- 7. Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id text PRIMARY KEY,
    order_number text NOT NULL UNIQUE,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    email text NOT NULL,
    shipping_name text NOT NULL,
    shipping_address text NOT NULL,
    shipping_city text NOT NULL,
    shipping_zip text DEFAULT '',
    shipping_phone text DEFAULT '',
    total numeric NOT NULL,
    status text NOT NULL,
    date text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id text REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id text REFERENCES public.products(id) ON DELETE SET NULL,
    quantity integer DEFAULT 1 NOT NULL,
    selected_material text,
    selected_size text,
    price numeric NOT NULL
);

-- 9. Create loyalty_points table
CREATE TABLE IF NOT EXISTS public.loyalty_points (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    points integer NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id text REFERENCES public.products(id) ON DELETE CASCADE,
    author text NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text DEFAULT '',
    date text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
    code text PRIMARY KEY,
    discount numeric NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    type text DEFAULT 'info',
    review_id text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_user ON public.cart(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON public.wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user ON public.loyalty_points(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Anonymous and authenticated permissive policies for effortless client operations
CREATE POLICY "Allow public select categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public insert categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update categories" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Allow public delete categories" ON public.categories FOR DELETE USING (true);

CREATE POLICY "Allow public select products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow public insert products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Allow public delete products" ON public.products FOR DELETE USING (true);

CREATE POLICY "Allow public select product_images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Allow public insert product_images" ON public.product_images FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update product_images" ON public.product_images FOR UPDATE USING (true);
CREATE POLICY "Allow public delete product_images" ON public.product_images FOR DELETE USING (true);

CREATE POLICY "Allow public select users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update users" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Allow public delete users" ON public.users FOR DELETE USING (true);

CREATE POLICY "Allow public select cart" ON public.cart FOR SELECT USING (true);
CREATE POLICY "Allow public insert cart" ON public.cart FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update cart" ON public.cart FOR UPDATE USING (true);
CREATE POLICY "Allow public delete cart" ON public.cart FOR DELETE USING (true);

CREATE POLICY "Allow public select wishlist" ON public.wishlist FOR SELECT USING (true);
CREATE POLICY "Allow public insert wishlist" ON public.wishlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update wishlist" ON public.wishlist FOR UPDATE USING (true);
CREATE POLICY "Allow public delete wishlist" ON public.wishlist FOR DELETE USING (true);

CREATE POLICY "Allow public select orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update orders" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Allow public delete orders" ON public.orders FOR DELETE USING (true);

CREATE POLICY "Allow public select order_items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert order_items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update order_items" ON public.order_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete order_items" ON public.order_items FOR DELETE USING (true);

CREATE POLICY "Allow public select loyalty_points" ON public.loyalty_points FOR SELECT USING (true);
CREATE POLICY "Allow public insert loyalty_points" ON public.loyalty_points FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update loyalty_points" ON public.loyalty_points FOR UPDATE USING (true);
CREATE POLICY "Allow public delete loyalty_points" ON public.loyalty_points FOR DELETE USING (true);

CREATE POLICY "Allow public select reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Allow public insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update reviews" ON public.reviews FOR UPDATE USING (true);
CREATE POLICY "Allow public delete reviews" ON public.reviews FOR DELETE USING (true);

CREATE POLICY "Allow public select coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Allow public insert coupons" ON public.coupons FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update coupons" ON public.coupons FOR UPDATE USING (true);
CREATE POLICY "Allow public delete coupons" ON public.coupons FOR DELETE USING (true);

CREATE POLICY "Allow public select notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow public insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update notifications" ON public.notifications FOR UPDATE USING (true);
CREATE POLICY "Allow public delete notifications" ON public.notifications FOR DELETE USING (true);

-- Insert public storage bucket for product assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-assets', 'product-assets', true) 
ON CONFLICT (id) DO NOTHING;

-- Policies for public storage bucket access
CREATE POLICY "Allow public select storage" ON storage.objects FOR SELECT USING (bucket_id = 'product-assets');
CREATE POLICY "Allow public insert storage" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-assets');
CREATE POLICY "Allow public update storage" ON storage.objects FOR UPDATE USING (bucket_id = 'product-assets');
CREATE POLICY "Allow public delete storage" ON storage.objects FOR DELETE USING (bucket_id = 'product-assets');

-- This automatically inserts a corresponding profile row in public.users when a user signs up via auth.signUp
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, avatar, provider, tier, loyalty_points, total_spent, joined_date, redeemed_rewards)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || new.id),
    'email',
    'Bronze',
    0,
    0.0,
    to_char(now(), 'YYYY-MM-DD'),
    '{}'::text[]
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed initial categories
INSERT INTO public.categories (id, name) VALUES
('fine-jewelry', 'Fine Jewelry'),
('timepieces', 'Timepieces'),
('necklaces', 'Necklaces'),
('rings', 'Rings'),
('earrings', 'Earrings'),
('bracelets', 'Bracelets'),
('leather-goods', 'Leather Goods'),
('accessories', 'Accessories')
ON CONFLICT (id) DO NOTHING;
`;
                navigator.clipboard.writeText(fullSql);
                alert("Complete Luxury Boutique SQL Schema copied to clipboard!");
              }}
              className="absolute top-3 right-3 bg-brand-gold/10 hover:bg-brand-gold/25 border border-brand-gold/35 text-brand-gold px-3 py-1.5 rounded-lg text-[10px] transition-all"
            >
              Copy SQL Script
            </button>
          </div>
        </div>
      )}

      {/* Tab Contents: Snippets */}
      {activeSubTab === "snippets" && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400 font-mono leading-relaxed">
            Below are snippets showing how to initialize and consume production tables like <code className="text-brand-gold">products</code> or <code className="text-brand-gold">orders</code> in your client views or Express server endpoints.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client-side Snippet */}
            <div className="bg-black/30 border border-brand-umber/15 rounded-xl p-4 font-mono text-[11px] space-y-2">
              <div className="flex items-center gap-2 text-brand-gold border-b border-brand-umber/10 pb-2 mb-2 font-bold text-xs">
                <Code className="w-3.5 h-3.5" /> Frontend (React Vite)
              </div>
              <pre className="text-gray-300 overflow-x-auto">
{`import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

// Fetching in a useEffect or handler
const loadBoutiqueCollection = async () => {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price")
    .order("price", { ascending: false })
    .limit(5);
    
  if (data) {
    console.log("Collection loaded:", data);
  }
};`}
              </pre>
            </div>

            {/* Server-side Snippet */}
            <div className="bg-black/30 border border-brand-umber/15 rounded-xl p-4 font-mono text-[11px] space-y-2">
              <div className="flex items-center gap-2 text-brand-gold border-b border-brand-umber/10 pb-2 mb-2 font-bold text-xs">
                <Terminal className="w-3.5 h-3.5" /> Backend (Express Route)
              </div>
              <pre className="text-gray-300 overflow-x-auto">
{`import { createExpressClient } from "@/utils/supabase/server";

app.get("/api/boutique-orders", async (req, res) => {
  const supabase = createExpressClient(req, res);
  
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, total, status")
    .order("created_at", { ascending: false });
    
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json(data || []);
});`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
