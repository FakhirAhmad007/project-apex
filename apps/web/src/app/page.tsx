"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Badge, Confetti, EmptyState, Logo, Mascot, PrimaryButton, Spinner } from "@/components/Shared";
import type { Branch, CartLine, Order, Product, Review } from "@/lib/types";

const CART_KEY = "crustissues.cart.v1";

function loadCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const CATEGORY_EMOJI: Record<string, string> = {
  Cookies: "🍪",
  Cakes: "🎂",
  Pastries: "🥐",
  Bread: "🍞",
  Savories: "🥟",
};

export default function StorefrontPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState<Product | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<{ id: number; total: number } | null>(null);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    setCart(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [p, b] = await Promise.all([api.get<Product[]>("/api/products"), api.get<Branch[]>("/api/branches")]);
        setProducts(p);
        setBranches(b);
      } catch {
        // storefront still renders empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const visibleProducts = useMemo(() => (category === "All" ? products : products.filter((p) => p.category === category)), [products, category]);
  const cartCount = cart.reduce((a, l) => a + l.quantity, 0);
  const cartTotal = cart.reduce((a, l) => a + l.quantity * l.product.price, 0);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { product, quantity: 1 }];
    });
  }
  function changeQty(productId: number, delta: number) {
    setCart((prev) => prev.map((l) => (l.product.id === productId ? { ...l, quantity: l.quantity + delta } : l)).filter((l) => l.quantity > 0));
  }

  return (
    <div className="min-h-screen">
      <Confetti show={confetti} />
      <Header cartCount={cartCount} onCart={() => setCartOpen(true)} onTrack={() => setTrackOpen(true)} />
      <Hero categories={categories.filter((c) => c !== "All")} onOrderNow={() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" })} />

      <main id="menu" className="max-w-6xl mx-auto px-5 pb-24">
        <div className="flex items-center gap-2 flex-wrap mb-8 sticky top-[64px] z-20 bg-[var(--cream)]/90 backdrop-blur py-3 -mx-5 px-5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-full font-display font-600 text-sm border-2 transition-all ${
                category === c ? "bg-[var(--plum)] text-white border-[var(--plum)]" : "bg-white text-[var(--plum)] border-[var(--plum)]/15 hover:border-[var(--plum)]/40"
              }`}
            >
              {CATEGORY_EMOJI[c] ? `${CATEGORY_EMOJI[c]} ${c}` : c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-24 text-[var(--plum)]"><Spinner className="w-8 h-8" /></div>
        ) : visibleProducts.length === 0 ? (
          <EmptyState title="No treats here yet" subtitle="Run the seed script or check your API connection." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleProducts.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} onAdd={() => addToCart(p)} onReviews={() => setReviewsOpen(p)} />
            ))}
          </div>
        )}
      </main>

      <Footer />

      {cartOpen && (
        <CartDrawer
          cart={cart}
          total={cartTotal}
          onClose={() => setCartOpen(false)}
          onChangeQty={changeQty}
          onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
        />
      )}
      {checkoutOpen && (
        <CheckoutModal
          cart={cart}
          total={cartTotal}
          branches={branches}
          onClose={() => setCheckoutOpen(false)}
          onPlaced={(order) => {
            setCheckoutOpen(false);
            setConfirmedOrder(order);
            setCart([]);
            setConfetti(true);
            setTimeout(() => setConfetti(false), 2600);
          }}
        />
      )}
      {confirmedOrder && <ConfirmationModal order={confirmedOrder} onClose={() => setConfirmedOrder(null)} />}
      {trackOpen && <TrackOrderModal onClose={() => setTrackOpen(false)} />}
      {reviewsOpen && <ReviewsModal product={reviewsOpen} onClose={() => setReviewsOpen(null)} />}
    </div>
  );
}

function Header({ cartCount, onCart, onTrack }: { cartCount: number; onCart: () => void; onTrack: () => void }) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-[var(--plum)]/10">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={onTrack} className="hidden sm:inline-flex text-sm font-semibold text-[var(--plum)]/80 hover:text-[var(--plum)] px-3 py-2">
            Track Order
          </button>
          <button onClick={onCart} className="relative inline-flex items-center gap-2 bg-[var(--plum)] text-white rounded-2xl px-4 py-2.5 font-display font-600 text-sm hover:bg-[var(--plum-light)] transition-colors">
            🛍️ Cart
            {cartCount > 0 && <span className="absolute -top-2 -right-2 bg-[var(--coral)] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center animate-pop">{cartCount}</span>}
          </button>
          <Link href="/admin" className="text-xs text-[var(--plum)]/40 hover:text-[var(--plum)]/70 px-2">Staff</Link>
        </div>
      </div>
    </header>
  );
}

function Hero({ categories, onOrderNow }: { categories: string[]; onOrderNow: () => void }) {
  return (
    <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, var(--plum), #452a72)" }}>
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-[var(--coral)]/30 blur-2xl animate-blob-slow" />
      <div className="absolute -bottom-24 -right-10 w-80 h-80 rounded-full bg-[var(--teal)]/25 blur-2xl animate-blob" />
      <div className="absolute top-10 right-10 w-40 h-40 rounded-full bg-[var(--sun)]/25 blur-xl animate-blob" />
      <div className="relative max-w-6xl mx-auto px-5 py-16 sm:py-24 flex flex-col sm:flex-row items-center gap-10">
        <div className="flex-1 text-center sm:text-left">
          <Badge color="sun">Fresh from 6 branches, nationwide delivery</Badge>
          <h1 className="font-display font-700 text-4xl sm:text-6xl text-white mt-4 leading-[1.05]">
            Warm bakes, <span className="hand-underline text-[var(--sun)]">big smiles.</span>
          </h1>
          <p className="text-white/70 mt-4 max-w-md mx-auto sm:mx-0">
            Cookies stuffed silly, cakes worth the calories, and bread that actually smells like a bakery should.
          </p>
          <div className="mt-7 flex items-center justify-center sm:justify-start gap-3">
            <PrimaryButton onClick={onOrderNow}>Order Now 🍩</PrimaryButton>
            <div className="flex -space-x-2">
              {categories.slice(0, 4).map((c) => (
                <span key={c} className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-lg">
                  {CATEGORY_EMOJI[c] || "✨"}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0"><Mascot className="w-48 h-48 sm:w-64 sm:h-64 animate-bob" mood="excited" /></div>
      </div>
    </section>
  );
}

function ProductCard({ product, index, onAdd, onReviews }: { product: Product; index: number; onAdd: () => void; onReviews: () => void }) {
  const [justAdded, setJustAdded] = useState(false);
  const accents = ["var(--coral)", "var(--teal)", "var(--sun)"];
  const accent = accents[index % accents.length];
  return (
    <div className="card-tilt bg-white rounded-3xl p-5 shadow-sm border border-black/5 flex flex-col">
      <div className="w-full h-36 rounded-2xl flex items-center justify-center text-6xl mb-4" style={{ background: `${accent}1A` }}>
        <span className="animate-bob" style={{ animationDuration: `${3 + (index % 3)}s` }}>{product.emoji}</span>
      </div>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display font-600 text-[var(--plum)] leading-tight">{product.name}</h3>
        <Badge color="plum">{product.category}</Badge>
      </div>
      <p className="text-sm text-[var(--ink)]/60 mt-1.5 flex-1">{product.description}</p>
      <button onClick={onReviews} className="text-xs text-[var(--teal)] font-semibold mt-2 self-start hover:underline">See reviews</button>
      <div className="flex items-center justify-between mt-4">
        <span className="font-display font-700 text-lg" style={{ color: accent }}>Rs. {product.price.toLocaleString()}</span>
        <button
          onClick={() => { onAdd(); setJustAdded(true); setTimeout(() => setJustAdded(false), 900); }}
          className="bg-[var(--plum)] text-white rounded-xl px-4 py-2 font-display font-600 text-sm hover:bg-[var(--plum-light)] transition-colors"
        >
          {justAdded ? "Added ✓" : "Add +"}
        </button>
      </div>
    </div>
  );
}

function CartDrawer({ cart, total, onClose, onChangeQty, onCheckout }: { cart: CartLine[]; total: number; onClose: () => void; onChangeQty: (id: number, d: number) => void; onCheckout: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-[var(--plum)]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[var(--cream)] h-full shadow-2xl flex flex-col animate-pop">
        <div className="flex items-center justify-between px-5 h-16 border-b border-black/5">
          <h2 className="font-display font-700 text-lg text-[var(--plum)]">Your Cart</h2>
          <button onClick={onClose} className="text-[var(--plum)]/50 hover:text-[var(--plum)] text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {cart.length === 0 ? (
            <EmptyState title="Your cart is empty" subtitle="Add something delicious from the menu." />
          ) : (
            cart.map((l) => (
              <div key={l.product.id} className="flex items-center gap-3 bg-white rounded-2xl p-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--sun)]/20 flex items-center justify-center text-2xl">{l.product.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--plum)] truncate">{l.product.name}</p>
                  <p className="text-xs text-[var(--ink)]/50">Rs. {l.product.price.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onChangeQty(l.product.id, -1)} className="w-7 h-7 rounded-full bg-[var(--cream)] border border-black/10">−</button>
                  <span className="w-5 text-center font-semibold text-sm">{l.quantity}</span>
                  <button onClick={() => onChangeQty(l.product.id, 1)} className="w-7 h-7 rounded-full bg-[var(--cream)] border border-black/10">+</button>
                </div>
              </div>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div className="p-5 border-t border-black/5 bg-white">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-[var(--ink)]/70">Total</span>
              <span className="font-display font-700 text-xl text-[var(--plum)]">Rs. {total.toLocaleString()}</span>
            </div>
            <PrimaryButton className="w-full" onClick={onCheckout}>Checkout →</PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--plum)]/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--cream)] rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl animate-pop">
        <div className="flex items-center justify-between px-6 h-16 border-b border-black/5 sticky top-0 bg-[var(--cream)]">
          <h2 className="font-display font-700 text-lg text-[var(--plum)]">{title}</h2>
          <button onClick={onClose} className="text-[var(--plum)]/50 hover:text-[var(--plum)] text-xl">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function CheckoutModal({ cart, total, branches, onClose, onPlaced }: { cart: CartLine[]; total: number; branches: Branch[]; onClose: () => void; onPlaced: (o: { id: number; total: number }) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id || 0);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!name || !phone || !branchId) {
      setErr("Please fill in your name, phone, and pickup/delivery branch.");
      return;
    }
    setSubmitting(true);
    setErr("");
    try {
      const res = await api.post<{ id: number; total: number }>("/api/orders", {
        customer_name: name,
        customer_phone: phone,
        delivery_address: address,
        branch_id: branchId,
        items: cart.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      });
      onPlaced(res);
    } catch {
      setErr("Something went wrong placing your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Checkout" onClose={onClose}>
      <div className="space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full rounded-xl border border-black/10 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--teal)]" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number (03XX-XXXXXXX)" className="w-full rounded-xl border border-black/10 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--teal)]" />
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address (optional for pickup)" rows={2} className="w-full rounded-xl border border-black/10 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--teal)]" />
        <select value={branchId} onChange={(e) => setBranchId(Number(e.target.value))} className="w-full rounded-xl border border-black/10 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--teal)]">
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
          <span className="text-sm text-[var(--ink)]/60">Cash on Delivery / Pickup</span>
          <span className="font-display font-700 text-lg text-[var(--plum)]">Rs. {total.toLocaleString()}</span>
        </div>
        {err && <p className="text-sm text-[var(--coral)] font-medium">{err}</p>}
        <PrimaryButton className="w-full" onClick={submit} disabled={submitting}>
          {submitting ? <span className="inline-flex items-center gap-2"><Spinner className="w-4 h-4" /> Placing order…</span> : "Place Order 🎉"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}

function ConfirmationModal({ order, onClose }: { order: { id: number; total: number }; onClose: () => void }) {
  return (
    <Modal title="Order confirmed!" onClose={onClose}>
      <div className="text-center py-4">
        <Mascot className="w-28 h-28 mx-auto animate-bob" mood="excited" />
        <p className="font-display font-700 text-2xl text-[var(--plum)] mt-4">Yay, it&apos;s on the way!</p>
        <p className="text-sm text-[var(--ink)]/60 mt-2">Order reference</p>
        <p className="font-mono text-xs bg-white rounded-lg px-3 py-2 mt-1 inline-block">#{order.id}</p>
        <p className="mt-3 font-semibold text-[var(--plum)]">Total: Rs. {order.total.toLocaleString()}</p>
        <p className="text-xs text-[var(--ink)]/50 mt-4">Track it anytime using your phone number.</p>
      </div>
    </Modal>
  );
}

function TrackOrderModal({ onClose }: { onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!phone) return;
    setLoading(true);
    try {
      const res = await api.get<Order[]>(`/api/orders/track?phone=${encodeURIComponent(phone)}`);
      setOrders(res);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  const statusColor: Record<string, "sun" | "teal" | "coral" | "plum"> = {
    pending: "sun", preparing: "sun", out_for_delivery: "teal", delivered: "teal", cancelled: "coral",
  };

  return (
    <Modal title="Track your order" onClose={onClose}>
      <div className="flex gap-2 mb-4">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" className="flex-1 rounded-xl border border-black/10 px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--teal)]" />
        <button onClick={search} className="bg-[var(--plum)] text-white rounded-xl px-4 font-display font-600 text-sm">{loading ? <Spinner className="w-4 h-4" /> : "Find"}</button>
      </div>
      {orders === null ? (
        <p className="text-sm text-[var(--ink)]/50 text-center py-6">Enter the phone number used at checkout.</p>
      ) : orders.length === 0 ? (
        <EmptyState title="No orders found" subtitle="Double check the phone number and try again." />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--ink)]/50">{new Date(o.created_at).toLocaleString()}</span>
                <Badge color={statusColor[o.status] || "plum"}>{o.status.replace(/_/g, " ")}</Badge>
              </div>
              <p className="text-sm mt-2">{o.items.map((it) => `#${it.product_id} ×${it.quantity}`).join(", ")}</p>
              <p className="font-display font-700 text-[var(--plum)] mt-1">Rs. {o.total.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function ReviewsModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<Review[]>(`/api/reviews?product_id=${product.id}`);
        setReviews(res);
      } finally {
        setLoading(false);
      }
    })();
  }, [product.id]);

  async function submit() {
    if (!name || !phone || !text) return;
    setSubmitting(true);
    try {
      await api.post("/api/reviews", { product_id: product.id, customer_name: name, customer_phone: phone, rating, text });
      setDone(true);
      setText("");
    } catch {
      // keep form so they can retry
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Reviews · ${product.name}`} onClose={onClose}>
      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="space-y-3 mb-6 max-h-52 overflow-y-auto">
          {reviews.length === 0 && <p className="text-sm text-[var(--ink)]/50">No reviews yet, be the first!</p>}
          {reviews.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-3">
              <span className="text-[var(--sun)]">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              <p className="text-sm text-[var(--ink)]/70 mt-1">{r.text}</p>
            </div>
          ))}
        </div>
      )}
      {done ? (
        <p className="text-sm text-[var(--teal)] font-semibold text-center py-2">Thanks for the review! 🎉</p>
      ) : (
        <div className="space-y-2 border-t border-black/5 pt-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full rounded-xl border border-black/10 px-3 py-2 bg-white text-sm" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your phone" className="w-full rounded-xl border border-black/10 px-3 py-2 bg-white text-sm" />
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? "text-[var(--sun)]" : "text-black/15"}`}>★</button>
            ))}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="How was it?" rows={2} className="w-full rounded-xl border border-black/10 px-3 py-2 bg-white text-sm" />
          <button onClick={submit} disabled={submitting} className="w-full bg-[var(--plum)] text-white rounded-xl py-2.5 font-display font-600 text-sm disabled:opacity-50">
            {submitting ? "Submitting…" : "Submit review"}
          </button>
        </div>
      )}
    </Modal>
  );
}

function Footer() {
  return (
    <footer className="bg-[var(--plum)] text-white/70 mt-8">
      <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo />
        <p className="text-sm">Made fresh daily across Karachi, Lahore &amp; Islamabad 🇵🇰</p>
      </div>
    </footer>
  );
}
