"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, getToken, setToken, ApiError } from "@/lib/api";
import { Badge, Logo, Mascot, PrimaryButton, Spinner } from "@/components/Shared";
import type { AlertRow, Branch, ForecastRow, InventoryItem, Order, Product, StaffMember } from "@/lib/types";

type Tab = "overview" | "orders" | "inventory" | "catalog" | "waste" | "ai" | "team";
type Me = { id: number; name: string; email: string; role: "owner" | "manager" | "staff"; branch_id: number | null };

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    (async () => {
      if (getToken()) {
        try {
          const user = await api.get<Me>("/api/auth/me", true);
          setMe(user);
        } catch {
          setToken(null);
        }
      }
      setChecking(false);
    })();
  }, []);

  function signOut() {
    setToken(null);
    setMe(null);
  }

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner className="w-8 h-8 text-[var(--plum)]" /></div>;
  }

  if (!me) {
    return <AuthScreen onAuthenticated={setMe} />;
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#F5F1FB" }}>
      <aside className="w-60 shrink-0 bg-[var(--plum)] text-white/80 flex flex-col">
        <div className="p-5 border-b border-white/10">
          <Logo size="text-xl" />
          <p className="text-xs text-white/50 mt-1">{me.email}</p>
          <Badge color="sun">{me.role}</Badge>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {[
            { id: "overview", label: "📊 Overview" },
            { id: "orders", label: "🧾 Orders" },
            { id: "inventory", label: "📦 Inventory" },
            { id: "catalog", label: "🏬 Branches & Menu" },
            { id: "waste", label: "🗑️ Waste Log" },
            { id: "ai", label: "🤖 AI Insights" },
            { id: "team", label: "👥 Team" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === t.id ? "bg-white/15 text-white" : "hover:bg-white/5"}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-1">
          <Link href="/" className="block w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-white/5">← Storefront</Link>
          <button onClick={signOut} className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-white/5">Sign out</button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6 sm:p-8">
        {tab === "overview" && <Overview />}
        {tab === "orders" && <OrdersTab />}
        {tab === "inventory" && <InventoryTab />}
        {tab === "catalog" && <CatalogTab role={me.role} />}
        {tab === "waste" && <WasteTab />}
        {tab === "ai" && <AiInsightsTab />}
        {tab === "team" && <TeamTab role={me.role} myEmail={me.email} />}
      </main>
    </div>
  );
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (me: Me) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email, password } : { name, email, password };
      const res = await api.post<{ access_token: string; user: Me }>(path, body);
      setToken(res.access_token);
      onAuthenticated(res.user);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: "linear-gradient(135deg, var(--plum), #452a72)" }}>
      <div className="bg-[var(--cream)] rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-pop">
        <Mascot className="w-24 h-24 mx-auto animate-bob" />
        <h1 className="font-display font-700 text-2xl text-[var(--plum)] mt-4">Crust Issues HQ</h1>
        <p className="text-sm text-[var(--ink)]/60 mt-2">
          {mode === "login" ? "Sign in to manage branches, inventory and AI insights." : "First account to register becomes the owner automatically."}
        </p>
        <div className="space-y-2 mt-5 text-left">
          {mode === "register" && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full rounded-xl border border-black/10 px-4 py-2.5 bg-white text-sm" />
          )}
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="w-full rounded-xl border border-black/10 px-4 py-2.5 bg-white text-sm" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="w-full rounded-xl border border-black/10 px-4 py-2.5 bg-white text-sm" />
        </div>
        {err && <p className="text-sm text-[var(--coral)] mt-3">{err}</p>}
        <PrimaryButton className="w-full mt-5" onClick={submit} disabled={busy}>
          {busy ? <Spinner className="w-4 h-4" /> : mode === "login" ? "Sign in" : "Create account"}
        </PrimaryButton>
        <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-xs text-[var(--plum)]/60 mt-4 hover:underline">
          {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
        </button>
        <div><Link href="/" className="text-xs text-[var(--plum)]/50 mt-4 inline-block hover:underline">← Back to storefront</Link></div>
      </div>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-700 text-xl text-[var(--plum)]">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
      <p className="text-xs text-[var(--ink)]/50 font-medium">{label}</p>
      <p className="font-display font-700 text-2xl mt-1" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function Overview() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [o, b] = await Promise.all([api.get<Order[]>("/api/orders", true), api.get<Branch[]>("/api/branches")]);
        setOrders(o);
        setBranches(b);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Spinner className="w-6 h-6 text-[var(--plum)]" /></div>;

  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => o.created_at.slice(0, 10) === today);
  const weekOrders = orders.filter((o) => o.created_at.slice(0, 10) >= sevenDaysAgo);
  const byDay: Record<string, number> = {};
  weekOrders.forEach((o) => { const d = o.created_at.slice(0, 10); byDay[d] = (byDay[d] || 0) + o.total; });
  const byBranch: Record<number, number> = {};
  orders.forEach((o) => { byBranch[o.branch_id] = (byBranch[o.branch_id] || 0) + o.total; });
  const branchPerf = branches.map((b) => ({ name: b.name, revenue: byBranch[b.id] || 0 })).sort((a, b) => b.revenue - a.revenue);
  const weekTrend = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0])).map(([date, revenue]) => ({ date, revenue }));

  return (
    <Panel title="Overview">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Today's Revenue" value={`Rs. ${todayOrders.reduce((a, o) => a + o.total, 0).toLocaleString()}`} accent="var(--coral)" />
        <Stat label="Today's Orders" value={String(todayOrders.length)} accent="var(--teal)" />
        <Stat label="7-Day Revenue" value={`Rs. ${weekOrders.reduce((a, o) => a + o.total, 0).toLocaleString()}`} accent="var(--sun)" />
        <Stat label="All-Time Orders" value={String(orders.length)} accent="var(--plum)" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
          <p className="font-display font-600 text-[var(--plum)] mb-3">Last 7 days revenue</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weekTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#FF6B6B" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
          <p className="font-display font-600 text-[var(--plum)] mb-3">Branch performance (all-time)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={branchPerf}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#00C2A8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Panel>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  async function load() {
    setLoading(true);
    try { setOrders(await api.get<Order[]>("/api/orders", true)); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(id: number, status: string) {
    await api.put(`/api/orders/${id}/status`, { status }, true);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <Panel title="Orders" action={
      <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-black/10 px-3 py-2 text-sm bg-white">
        {["all", "pending", "preparing", "out_for_delivery", "delivered", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    }>
      {loading ? <Spinner className="w-6 h-6 text-[var(--plum)]" /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 && <p className="p-6 text-sm text-[var(--ink)]/50">No orders match this filter.</p>}
            {filtered.map((o) => (
              <div key={o.id} className="p-4 border-b border-black/5 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                <div>
                  <p className="font-semibold text-sm text-[var(--plum)]">Order #{o.id}</p>
                  <p className="text-xs text-[var(--ink)]/50">{new Date(o.created_at).toLocaleString()} · {o.items.map((it) => `#${it.product_id} ×${it.quantity}`).join(", ")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display font-700 text-[var(--plum)]">Rs. {o.total.toLocaleString()}</span>
                  <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)} className="rounded-lg border border-black/10 px-2 py-1.5 text-xs bg-[var(--cream)]">
                    {["pending", "preparing", "out_for_delivery", "delivered", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

function InventoryTab() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState<number | "all">("all");

  useEffect(() => {
    (async () => {
      try {
        const [inv, p, b] = await Promise.all([api.get<InventoryItem[]>("/api/inventory", true), api.get<Product[]>("/api/products"), api.get<Branch[]>("/api/branches")]);
        setInventory(inv); setProducts(p); setBranches(b);
      } finally { setLoading(false); }
    })();
  }, []);

  async function updateThreshold(id: number, quantity: number, safety_threshold: number) {
    await api.put(`/api/inventory/${id}`, { quantity, safety_threshold }, true);
    setInventory((prev) => prev.map((r) => (r.id === id ? { ...r, quantity, safety_threshold } : r)));
  }

  const pName = (id: number) => products.find((p) => p.id === id)?.name || String(id);
  const bName = (id: number) => branches.find((b) => b.id === id)?.name || String(id);
  const rows = branchFilter === "all" ? inventory : inventory.filter((r) => r.branch_id === branchFilter);

  return (
    <Panel title="Inventory" action={
      <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value === "all" ? "all" : Number(e.target.value))} className="rounded-xl border border-black/10 px-3 py-2 text-sm bg-white">
        <option value="all">All branches</option>
        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
    }>
      {loading ? <Spinner className="w-6 h-6 text-[var(--plum)]" /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[var(--ink)]/50 border-b border-black/5">
              <th className="p-3">Product</th><th className="p-3">Branch</th><th className="p-3">Qty</th><th className="p-3">Threshold</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {rows.slice(0, 300).map((r) => <InventoryRowEdit key={r.id} row={r} productName={pName(r.product_id)} branchName={bName(r.branch_id)} onSave={updateThreshold} />)}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function InventoryRowEdit({ row, productName, branchName, onSave }: { row: InventoryItem; productName: string; branchName: string; onSave: (id: number, q: number, t: number) => void }) {
  const [qty, setQty] = useState(row.quantity);
  const [threshold, setThreshold] = useState(row.safety_threshold);
  const low = qty < threshold;
  return (
    <tr className={`border-b border-black/5 ${low ? "bg-[var(--coral)]/5" : ""}`}>
      <td className="p-3 font-medium text-[var(--plum)]">{productName}</td>
      <td className="p-3 text-[var(--ink)]/60">{branchName}</td>
      <td className="p-3"><input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-16 rounded-lg border border-black/10 px-2 py-1" /></td>
      <td className="p-3"><input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-16 rounded-lg border border-black/10 px-2 py-1" /></td>
      <td className="p-3"><button onClick={() => onSave(row.id, qty, threshold)} className="text-xs bg-[var(--teal)]/15 text-[#00897B] px-3 py-1.5 rounded-lg font-semibold">Save</button></td>
    </tr>
  );
}

function CatalogTab({ role }: { role: string }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBranch, setNewBranch] = useState({ name: "", address: "" });
  const [newProduct, setNewProduct] = useState({ name: "", category: "Cookies", price: "", emoji: "🍪", description: "" });
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [b, p] = await Promise.all([api.get<Branch[]>("/api/branches"), api.get<Product[]>("/api/products")]);
      setBranches(b); setProducts(p);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function addBranch() {
    if (!newBranch.name || !newBranch.address) return;
    try { await api.post("/api/branches", newBranch, true); setNewBranch({ name: "", address: "" }); setMsg("Branch added."); load(); }
    catch { setMsg("Only an owner can add branches."); }
  }
  async function addProduct() {
    if (!newProduct.name || !newProduct.price) return;
    try { await api.post("/api/products", { ...newProduct, price: Number(newProduct.price) }, true); setNewProduct({ name: "", category: "Cookies", price: "", emoji: "🍪", description: "" }); setMsg("Product added."); load(); }
    catch { setMsg("You don't have permission to add products."); }
  }

  return (
    <Panel title="Branches & Menu">
      {msg && <p className="text-sm text-[var(--teal)] mb-3">{msg}</p>}
      {loading ? <Spinner className="w-6 h-6 text-[var(--plum)]" /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
            <p className="font-display font-600 text-[var(--plum)] mb-3">Branches ({branches.length})</p>
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {branches.map((b) => <div key={b.id} className="flex justify-between text-sm bg-[var(--cream)] rounded-xl p-2.5"><span className="font-medium">{b.name}</span><span className="text-[var(--ink)]/50">{b.address}</span></div>)}
            </div>
            {role === "owner" && (
              <div className="space-y-2 border-t border-black/5 pt-3">
                <input value={newBranch.name} onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })} placeholder="Branch name" className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
                <input value={newBranch.address} onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })} placeholder="Address" className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
                <button onClick={addBranch} className="w-full bg-[var(--plum)] text-white rounded-lg py-2 text-sm font-display font-600">Add branch</button>
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
            <p className="font-display font-600 text-[var(--plum)] mb-3">Menu ({products.length})</p>
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {products.slice(0, 50).map((p) => <div key={p.id} className="flex justify-between items-center text-sm bg-[var(--cream)] rounded-xl p-2.5"><span>{p.emoji} {p.name}</span><span className="text-[var(--plum)] font-semibold">Rs. {p.price.toLocaleString()}</span></div>)}
            </div>
            {role !== "staff" && (
              <div className="space-y-2 border-t border-black/5 pt-3">
                <input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Product name" className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
                <div className="flex gap-2">
                  <select value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm">
                    {["Cookies", "Cakes", "Pastries", "Bread", "Savories"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <input value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} placeholder="Price" type="number" className="w-24 rounded-lg border border-black/10 px-3 py-2 text-sm" />
                </div>
                <button onClick={addProduct} className="w-full bg-[var(--plum)] text-white rounded-lg py-2 text-sm font-display font-600">Add product</button>
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

function WasteTab() {
  const [waste, setWaste] = useState<{ id: number; product_id: number; branch_id: number; quantity: number; reason: string; date: string }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ product_id: 0, branch_id: 0, quantity: "", reason: "Unsold end of day" });

  async function load() {
    setLoading(true);
    try {
      const [w, p, b] = await Promise.all([api.get<any[]>("/api/waste", true), api.get<Product[]>("/api/products"), api.get<Branch[]>("/api/branches")]);
      setWaste(w); setProducts(p); setBranches(b);
      if (p[0]) setForm((f) => ({ ...f, product_id: p[0].id }));
      if (b[0]) setForm((f) => ({ ...f, branch_id: b[0].id }));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    if (!form.product_id || !form.branch_id || !form.quantity) return;
    await api.post("/api/waste", { ...form, quantity: Number(form.quantity) }, true);
    setForm({ ...form, quantity: "" });
    load();
  }

  const pName = (id: number) => products.find((p) => p.id === id)?.name || String(id);
  const bName = (id: number) => branches.find((b) => b.id === id)?.name || String(id);

  return (
    <Panel title="Waste Log">
      {loading ? <Spinner className="w-6 h-6 text-[var(--plum)]" /> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-black/5 max-h-[60vh] overflow-y-auto">
            {waste.length === 0 && <p className="p-6 text-sm text-[var(--ink)]/50">No waste logged yet.</p>}
            {waste.map((w) => (
              <div key={w.id} className="p-3 border-b border-black/5 flex justify-between text-sm">
                <span>{pName(w.product_id)} · {bName(w.branch_id)}</span>
                <span className="text-[var(--ink)]/50">{w.quantity} units · {w.reason} · {w.date}</span>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 space-y-2 h-fit">
            <p className="font-display font-600 text-[var(--plum)] mb-1">Log new waste</p>
            <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: Number(e.target.value) })} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm">
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: Number(e.target.value) })} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm">
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} type="number" placeholder="Quantity" className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
            <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm">
              {["Unsold end of day", "Damaged in transit", "Overproduction", "Quality control reject"].map((r) => <option key={r}>{r}</option>)}
            </select>
            <button onClick={submit} className="w-full bg-[var(--plum)] text-white rounded-lg py-2 text-sm font-display font-600">Log waste</button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function AiInsightsTab() {
  const [forecast, setForecast] = useState<{ data: ForecastRow[]; computedAt: string | null }>({ data: [], computedAt: null });
  const [alerts, setAlerts] = useState<{ data: AlertRow[]; computedAt: string | null }>({ data: [], computedAt: null });
  const [summary, setSummary] = useState<{ text: string | null }>({ text: null });
  const [sentiment, setSentiment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [f, a, s, sent] = await Promise.all([
        api.get<any>("/api/ai/forecast/weekly", true),
        api.get<any>("/api/ai/procurement/alerts", true),
        api.get<any>("/api/ai/summary/daily", true),
        api.get<any>("/api/ai/sentiment/trend", true),
      ]);
      setForecast(f); setAlerts(a); setSummary(s); setSentiment(sent);
    } finally { setLoading(false); }
  }
  useEffect(() => { loadAll(); }, []);

  async function refresh(kind: "forecast" | "alerts" | "summary") {
    setBusy(kind);
    try {
      if (kind === "forecast") setForecast(await api.post("/api/ai/forecast/weekly/refresh", {}, true));
      if (kind === "alerts") setAlerts(await api.post("/api/ai/procurement/alerts/refresh", {}, true));
      if (kind === "summary") setSummary(await api.post("/api/ai/summary/daily/refresh", {}, true));
    } finally { setBusy(null); }
  }

  async function classifyPending() {
    setBusy("sentiment");
    try {
      await api.post("/api/reviews/classify-pending", {}, true);
      setSentiment(await api.get("/api/ai/sentiment/trend", true));
    } finally { setBusy(null); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner className="w-6 h-6 text-[var(--plum)]" /></div>;

  return (
    <Panel title="AI Insights">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-display font-600 text-[var(--plum)]">📝 Executive Summary</p>
            <button onClick={() => refresh("summary")} disabled={busy === "summary"} className="text-xs text-[var(--teal)] font-semibold">{busy === "summary" ? "Generating…" : "Refresh"}</button>
          </div>
          <p className="text-sm text-[var(--ink)]/70 leading-relaxed">{summary.text || "No summary yet — click Refresh."}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-display font-600 text-[var(--plum)]">⚠️ Low Stock Alerts</p>
            <button onClick={() => refresh("alerts")} disabled={busy === "alerts"} className="text-xs text-[var(--teal)] font-semibold">{busy === "alerts" ? "Scanning…" : "Refresh"}</button>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1.5">
            {alerts.data.length === 0 && <p className="text-sm text-[var(--ink)]/50">All stock levels look healthy.</p>}
            {alerts.data.slice(0, 8).map((a, i) => (
              <div key={i} className="flex justify-between text-sm bg-[var(--cream)] rounded-lg px-3 py-1.5">
                <span>{a.productName} · {a.branchName}</span>
                <Badge color={a.severity === "reorder_now" ? "coral" : "sun"}>{a.currentQuantity}/{a.safetyThreshold}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-display font-600 text-[var(--plum)]">📈 Demand Forecast (next 7 days)</p>
            <button onClick={() => refresh("forecast")} disabled={busy === "forecast"} className="text-xs text-[var(--teal)] font-semibold">{busy === "forecast" ? "Running Prophet…" : "Refresh"}</button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1.5">
            {forecast.data.length === 0 && <p className="text-sm text-[var(--ink)]/50">No forecast yet — click Refresh.</p>}
            {forecast.data.slice(0, 10).map((f, i) => (
              <div key={i} className="flex justify-between text-sm bg-[var(--cream)] rounded-lg px-3 py-1.5">
                <span>{f.productName} · {f.branchName} <span className="text-[10px] text-[var(--ink)]/40">({f.model})</span></span>
                <span className="font-semibold text-[var(--plum)]">{f.predictedQuantity} units</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-display font-600 text-[var(--plum)]">💬 Review Sentiment</p>
            <button onClick={classifyPending} disabled={busy === "sentiment"} className="text-xs text-[var(--teal)] font-semibold">{busy === "sentiment" ? "Classifying…" : "Classify pending"}</button>
          </div>
          {sentiment && (
            <>
              <div className="flex gap-2 mb-3">
                <Badge color="teal">😊 {sentiment.counts.positive}</Badge>
                <Badge color="sun">😐 {sentiment.counts.neutral}</Badge>
                <Badge color="coral">😕 {sentiment.counts.negative}</Badge>
                {sentiment.counts.unclassified > 0 && <Badge color="plum">{sentiment.counts.unclassified} pending</Badge>}
              </div>
              {sentiment.watchlist?.length > 0 && <p className="text-xs text-[var(--coral)] font-medium mb-1">Watch: {sentiment.watchlist.join(", ")}</p>}
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}

function TeamTab({ role, myEmail }: { role: string; myEmail: string }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<"manager" | "staff">("staff");
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try { setStaff(await api.get<StaffMember[]>("/api/staff", true)); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function grant() {
    const target = staff.find((s) => s.email.toLowerCase() === email.toLowerCase());
    if (!target) { setMsg("That email hasn't registered an account yet — ask them to sign up first, then grant their role here."); return; }
    try { await api.put(`/api/staff/${target.id}/role`, { role: newRole }, true); setEmail(""); setMsg(`${target.email} is now ${newRole}.`); load(); }
    catch { setMsg("Only an owner can grant access."); }
  }

  return (
    <Panel title="Team">
      {loading ? <Spinner className="w-6 h-6 text-[var(--plum)]" /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-5">
            <p className="font-display font-600 text-[var(--plum)] mb-3">Dashboard access</p>
            <div className="space-y-2">
              {staff.map((s) => (
                <div key={s.id} className="flex justify-between text-sm bg-[var(--cream)] rounded-xl p-2.5">
                  <span>{s.email} {s.email === myEmail && <span className="text-xs text-[var(--teal)]">(you)</span>}</span>
                  <Badge color={s.role === "owner" ? "coral" : s.role === "manager" ? "sun" : "teal"}>{s.role}</Badge>
                </div>
              ))}
            </div>
          </div>
          {role === "owner" && (
            <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-5 h-fit">
              <p className="font-display font-600 text-[var(--plum)] mb-3">Grant access</p>
              <p className="text-xs text-[var(--ink)]/50 mb-2">The teammate must register their own account first — you then assign their role here.</p>
              {msg && <p className="text-sm text-[var(--teal)] mb-2">{msg}</p>}
              <div className="space-y-2">
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@email.com" className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
                <select value={newRole} onChange={(e) => setNewRole(e.target.value as any)} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm">
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                </select>
                <button onClick={grant} className="w-full bg-[var(--plum)] text-white rounded-lg py-2 text-sm font-display font-600">Grant access</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
