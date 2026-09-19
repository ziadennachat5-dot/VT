import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, X, Plus, Minus, Menu } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CheckoutForm from '../components/CheckoutForm';

/* ── FadeIn helper ───────────────────────────────────────────────────────── */
function FadeIn({ children, className = '', delay = 0 }) {
  const [isVisible, setVisible] = useState(false);
  const domRef = useRef();
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setVisible(true); }),
      { threshold: 0.07 }
    );
    if (domRef.current) observer.observe(domRef.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={domRef}
      className={`fade-up ${isVisible ? 'visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/* ── Storefront ──────────────────────────────────────────────────────────── */
export default function Storefront() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase
          .from('products').select('*').eq('is_active', true).order('created_at', { ascending: true });
        if (!error && data) setProducts(data);
        else if (error) console.error('Error fetching products:', error);
      } catch (err) {
        console.error('Failed to fetch products:', err);
      } finally {
        setLoadingProducts(false);
      }
    }
    fetchProducts();
  }, []);

  const [cartItems, setCartItems] = useState(() => {
    try { const s = localStorage.getItem('vellune_cart'); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });
  const [isCartOpen, setIsCartOpen]     = useState(false);
  const [isMenuOpen, setIsMenuOpen]     = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const drawerRef = useRef(null);

  useEffect(() => { localStorage.setItem('vellune_cart', JSON.stringify(cartItems)); }, [cartItems]);
  useEffect(() => {
    if (isCartOpen) { document.body.style.overflow = 'hidden'; drawerRef.current?.focus(); }
    else { document.body.style.overflow = ''; setTimeout(() => setIsCheckingOut(false), 500); }
    return () => { document.body.style.overflow = ''; };
  }, [isCartOpen]);
  useEffect(() => {
    const h = e => { if (e.key === 'Escape' && isCartOpen) setIsCartOpen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isCartOpen]);

  const showToast = msg => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 2500); };

  const addToCart = product => {
    setCartItems(prev => {
      const ex = prev.find(i => i.id === product.id);
      if (ex) { if (ex.quantity >= 10) return prev; return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i); }
      return [...prev, { ...product, quantity: 1 }];
    });
    showToast(`Added — ${product.name}`);
  };
  const updateQuantity = (id, delta) => setCartItems(prev =>
    prev.map(i => { if (i.id !== id) return i; const q = i.quantity + delta; if (q > 10) return i; return q > 0 ? { ...i, quantity: q } : null; }).filter(Boolean)
  );
  const removeItem = id => setCartItems(prev => prev.filter(i => i.id !== id));
  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const closeCart = () => setIsCartOpen(false);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden pt-20">

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      <div className={`fixed bottom-8 right-8 z-[200] bg-[#111] text-white px-6 py-4 font-mono text-[10px] uppercase tracking-[0.25em] shadow-2xl transition-all duration-500 ${toastMessage ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 pointer-events-none'}`}>
        {toastMessage}
      </div>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-40 bg-[#FAFAF8]/96 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-16 h-20 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button className="md:hidden p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <a href="#" className="font-display font-semibold text-sm tracking-[0.28em] uppercase">Vellune Time</a>
          </div>

          <nav className="hidden md:flex items-center gap-12 font-sans text-[11px] font-medium tracking-[0.18em] uppercase text-gray-500">
            <a href="#collection" className="hover:text-black transition-colors duration-200">Collection</a>
            <a href="#build"      className="hover:text-black transition-colors duration-200">The Build</a>
            <a href="#warranty"   className="hover:text-black transition-colors duration-200">Warranty</a>
          </nav>

          <button className="relative flex items-center gap-3 hover:opacity-60 transition-opacity" onClick={() => setIsCartOpen(true)}>
            <span className="font-sans text-[11px] font-medium tracking-[0.18em] uppercase hidden sm:block text-gray-700">Cart</span>
            <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-3 bg-black text-white text-[9px] font-mono w-4 h-4 flex items-center justify-center rounded-full shadow-sm animate-pulse-once">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        <div className={`md:hidden overflow-hidden transition-all duration-300 ${isMenuOpen ? 'max-h-56 border-b border-black/5' : 'max-h-0'}`}>
          <div className="px-8 py-8 flex flex-col gap-7 font-sans text-xs font-medium tracking-[0.2em] uppercase text-gray-600">
            <a href="#collection" onClick={() => setIsMenuOpen(false)} className="hover:text-black transition-colors">Collection</a>
            <a href="#build"      onClick={() => setIsMenuOpen(false)} className="hover:text-black transition-colors">The Build</a>
            <a href="#warranty"   onClick={() => setIsMenuOpen(false)} className="hover:text-black transition-colors">Warranty</a>
          </div>
        </div>
      </header>

      {/* ── Cart Overlay ───────────────────────────────────────────────── */}
      {isCartOpen && <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm cursor-pointer" onClick={closeCart} />}

      {/* ── Cart Drawer ─────────────────────────────────────────────────── */}
      <div
        ref={drawerRef} tabIndex="-1"
        onClick={e => e.stopPropagation()}
        className={`fixed top-0 right-0 z-[60] w-full max-w-md h-full bg-[#FAFAF8] shadow-2xl border-l border-black/10 flex flex-col outline-none transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCartOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
      >
        <div className="px-8 py-7 border-b border-black/5 flex items-center justify-between shrink-0">
          <h2 className="font-sans text-[11px] font-semibold tracking-[0.25em] uppercase">
            {isCheckingOut ? 'Checkout' : `Cart (${cartCount})`}
          </h2>
          <button onClick={closeCart} className="p-2 hover:bg-black/5 rounded-full transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {isCheckingOut ? (
          <CheckoutForm cartItems={cartItems} cartTotal={cartTotal} onComplete={() => setCartItems([])} onCancel={() => setIsCheckingOut(false)} />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-8 py-8 flex flex-col gap-8">
              {cartItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 py-20 opacity-50">
                  <ShoppingBag className="w-9 h-9 stroke-[1.25]" />
                  <p className="font-sans text-[11px] uppercase tracking-[0.2em]">Your cart is empty</p>
                  <a href="#collection" onClick={closeCart} className="mt-2 btn-outline">Browse Collection</a>
                </div>
              ) : cartItems.map(item => (
                <div key={item.id} className="flex gap-5 items-start">
                  <div className="w-20 h-20 overflow-hidden border border-black/5 shrink-0 bg-white">
                    <img src={item.image_url || item.img} alt={item.name} className="w-full h-full object-cover grayscale" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className="font-mono text-[9px] text-gray-400 tracking-[0.2em] mb-0.5">{item.ref}</span>
                    <h3 className="font-sans text-xs font-medium uppercase tracking-[0.15em] mb-1">{item.name}</h3>
                    <span className="font-mono text-sm font-medium mb-3">${item.price}</span>
                    <div className="flex items-center gap-3 border border-black/10 w-fit px-2.5 py-1.5 mb-2 bg-white">
                      <button onClick={() => updateQuantity(item.id, -1)} className="hover:text-gray-400 transition-colors"><Minus className="w-2.5 h-2.5" /></button>
                      <span className="font-mono text-[11px] w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="hover:text-gray-400 transition-colors"><Plus className="w-2.5 h-2.5" /></button>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="font-sans text-[10px] uppercase tracking-[0.15em] text-gray-400 hover:text-black transition-colors w-fit">Remove</button>
                  </div>
                </div>
              ))}
            </div>

            {cartItems.length > 0 && (
              <div className="px-8 py-8 border-t border-black/5 shrink-0">
                <div className="flex flex-col gap-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-gray-500 mb-6">
                  <div className="flex justify-between"><span>Subtotal</span><span>${cartTotal}</span></div>
                  <div className="flex justify-between"><span>Shipping</span><span>Free</span></div>
                </div>
                <div className="flex justify-between font-sans text-sm font-semibold tracking-[0.1em] uppercase mb-7 pt-5 border-t border-black/5">
                  <span>Total</span><span className="font-mono">${cartTotal}</span>
                </div>
                <button type="button" onClick={() => setIsCheckingOut(true)} className="btn-primary w-full">Secure Checkout</button>
                <p className="text-center font-mono text-[10px] uppercase tracking-[0.15em] mt-4 text-gray-400">Taxes calculated at checkout</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          HERO  —  #FAFAF8 warm off-white
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative flex flex-col md:flex-row min-h-[calc(100vh-5rem)] bg-[#FAFAF8]">
        {/* Mobile image */}
        <div className="w-full h-[55vw] min-h-[260px] max-h-[58vh] md:hidden relative">
          <img src="https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=80&w=900" alt="Vellune Timepiece" className="w-full h-full object-cover object-center grayscale" />
        </div>

        {/* Left — text */}
        <div className="w-full md:w-[54%] min-w-0 flex flex-col justify-center px-8 md:pl-16 lg:pl-24 xl:pl-32 py-14 md:py-0 relative z-10">
          <FadeIn className="flex flex-col items-start w-full">
            {/* Eyebrow */}
            <span className="font-mono text-[10px] text-gray-400 tracking-[0.32em] uppercase mb-10 md:mb-12">
              Seiko NH35 · Hand-assembled in the USA
            </span>

            {/* Headline — two contrasting lines */}
            <h1 className="w-full mb-9 md:mb-11 leading-none">
              {/* Line 1: Space Grotesk bold uppercase — geometric power */}
              <span className="block font-display font-bold uppercase text-[clamp(2.9rem,7.2vw,7.2rem)] tracking-[0.02em] leading-[0.9] text-black">
                Automatic
              </span>
              {/* Line 2: Playfair Display italic — classical elegance */}
              <span
                className="block font-headline font-bold italic text-[clamp(2.9rem,7.2vw,7.2rem)] leading-[1.02] text-[#1c1c1c]"
                style={{ letterSpacing: '-0.025em' }}
              >
                Timepieces.
              </span>
            </h1>

            <p className="font-sans font-light text-[15px] md:text-base text-gray-500 max-w-[360px] mb-11 md:mb-13 leading-[1.85]">
              Built one movement at a time. Precision, durability, and timeless style without compromise.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-13 md:mb-14">
              <a href="#collection" className="btn-primary text-center">Shop the collection</a>
              <a href="#build"      className="btn-outline  text-center">How it's built</a>
            </div>

            <div className="w-56 h-px bg-black/10 mb-7" />
            <div className="font-mono text-[10px] text-gray-400 tracking-[0.28em] uppercase flex flex-wrap gap-x-5 gap-y-1">
              <span>±10 sec/day</span>
              <span className="opacity-30">·</span>
              <span>200m WR</span>
              <span className="opacity-30">·</span>
              <span>1-year warranty</span>
            </div>
          </FadeIn>
        </div>

        {/* Right — image (contained within its column) */}
        <div className="hidden md:block md:w-[46%] relative overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=80&w=1200"
            alt="Vellune Timepiece"
            className="absolute inset-0 w-full h-full object-cover object-center grayscale"
          />
          {/* Soft left gradient for a seamless blend into the text column */}
          <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[#FAFAF8] to-transparent pointer-events-none" />
        </div>
      </section>

      {/* ── Trust Marquee ─────────────────────────────────────────────── */}
      <div className="bg-[#111] text-white overflow-hidden relative w-full flex items-center h-11 shrink-0">
        <div className="flex whitespace-nowrap animate-marquee-slow font-mono text-[10px] uppercase tracking-[0.35em]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center shrink-0">
              <span className="mx-10">Free US Shipping</span><span className="opacity-20 mx-1">—</span>
              <span className="mx-10">1-Year Warranty</span><span className="opacity-20 mx-1">—</span>
              <span className="mx-10">±10 Sec/Day Regulation</span><span className="opacity-20 mx-1">—</span>
              <span className="mx-10">2–3 Week Build Time</span><span className="opacity-20 mx-1">—</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          COLLECTION  —  pure #FFFFFF (contrast with hero off-white)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="collection" className="py-36 md:py-52 bg-white">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-16">
          <FadeIn>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 md:mb-28 gap-6">
              <div>
                <p className="font-mono text-[9px] text-gray-400 tracking-[0.35em] uppercase mb-5">— 01</p>
                <h2 className="font-headline font-bold text-[clamp(2.4rem,5.5vw,5.5rem)] leading-[0.93] tracking-[-0.025em] text-black">
                  The<br />Collection
                </h2>
              </div>
              <p className="font-sans font-light text-[13px] text-gray-400 max-w-[240px] leading-relaxed md:text-right">
                Hand-assembled to order.<br />No shortcuts. No compromises.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-20 md:gap-y-28">
            {loadingProducts ? (
              <div className="col-span-full py-24 text-center font-mono text-[11px] tracking-[0.25em] text-gray-400 uppercase">Loading collection…</div>
            ) : products.map((product, index) => (
              <FadeIn key={product.id} delay={index * 90}>
                <div className="flex flex-col group cursor-pointer h-full" onClick={() => addToCart(product)}>

                  {/* Image container */}
                  <div className="relative aspect-[4/5] mb-7 overflow-hidden bg-[#F7F6F3]">
                    <img
                      src={product.image_url || product.img}
                      alt={product.name}
                      className="w-full h-full object-cover grayscale transition-transform duration-[1400ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-[1.05]"
                    />
                    {/* Style badge — refined pill */}
                    <div className="absolute top-5 left-5 z-10">
                      <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-gray-600 bg-white/85 backdrop-blur-sm px-3 py-1.5 border border-black/8">
                        {product.style_tag || product.style}
                      </span>
                    </div>
                    {/* Hover CTA — rises from bottom */}
                    <div className="absolute inset-x-0 bottom-0 flex justify-center pb-7 z-10 pointer-events-none group-hover:pointer-events-auto">
                      <button
                        onClick={e => { e.stopPropagation(); addToCart(product); }}
                        className="btn-primary shadow-xl translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out"
                      >
                        Add to cart
                      </button>
                    </div>
                  </div>

                  {/* Product info */}
                  <div className="flex items-baseline justify-between mb-1.5">
                    <h3 className="font-display font-semibold text-sm uppercase tracking-[0.12em] text-black">{product.name}</h3>
                    <span className="font-mono text-sm font-medium text-black ml-4 shrink-0">${product.price}</span>
                  </div>
                  <p className="font-mono text-[9px] text-gray-400 tracking-[0.22em] mb-5">{product.ref}</p>

                  {/* Spec badges */}
                  {Array.isArray(product.specs) && product.specs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-auto pt-5 border-t border-black/5">
                      {product.specs.map((spec, i) => (
                        <span key={i} className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500 border border-black/10 px-2.5 py-1">
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          EDITORIAL PULL-QUOTE  —  #111 dark (signature divider)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#111] text-white py-32 md:py-48 px-8">
        <div className="max-w-3xl mx-auto text-center">
          <FadeIn>
            {/* Oversized opening mark */}
            <div
              className="font-headline font-bold italic text-white/8 select-none leading-none mb-2"
              style={{ fontSize: 'clamp(5rem,14vw,11rem)' }}
              aria-hidden="true"
            >
              "
            </div>
            <blockquote
              className="font-headline font-bold italic text-white leading-[1.22]"
              style={{ fontSize: 'clamp(1.6rem,3.8vw,3.4rem)', letterSpacing: '-0.01em' }}
            >
              Built the way it should be. One movement, one craftsman, one timepiece.
            </blockquote>
            <div className="flex items-center justify-center gap-5 mt-12">
              <div className="w-10 h-px bg-white/20" />
              <p className="font-mono text-[10px] text-white/35 tracking-[0.32em] uppercase">Vellune Time · Made in the USA</p>
              <div className="w-10 h-px bg-white/20" />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          THE CRAFT  —  #F5F3EF warm cream (2×2 editorial grid)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="build" className="py-36 md:py-52 bg-[#F5F3EF]">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-16">
          <FadeIn>
            <div className="mb-24 md:mb-36">
              <p className="font-mono text-[9px] text-gray-400 tracking-[0.35em] uppercase mb-5">— 02</p>
              <h2 className="font-headline font-bold text-[clamp(2.4rem,5.5vw,5.5rem)] leading-[0.93] tracking-[-0.025em] text-black">
                The Craft
              </h2>
            </div>
          </FadeIn>

          {/* 2×2 editorial grid — each step bounded in its own cell */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 lg:gap-x-24 gap-y-16 md:gap-y-20">
            {[
              { n: '01', title: 'Movement Regulation', desc: 'Every NH35 movement is placed on a timegrapher and regulated to ±10 seconds per day or better before a single part is cased.' },
              { n: '02', title: 'Case Assembly',       desc: 'Dial and hands are meticulously set under magnification. Movement is cased and the stem cut to exact length — no shortcuts.' },
              { n: '03', title: 'Pressure & QC Test',  desc: 'Seals are greased and the case is pressure-tested to confirm water resistance. Each piece is then inspected under a watchmaker\'s loupe.' },
              { n: '04', title: 'Final Packaging',     desc: 'The watch is fitted to its strap, protective films applied, and securely boxed for safe delivery directly to you.' },
            ].map((step, i) => (
              <FadeIn key={i} delay={i * 90}>
                <div className="border-l-2 border-black/10 pl-8 py-1">
                  <span className="block font-mono text-[9px] text-gray-400 tracking-[0.35em] uppercase mb-6">{step.n}</span>
                  <h3 className="font-display font-semibold text-base md:text-lg uppercase tracking-[0.1em] text-black mb-4 leading-snug">{step.title}</h3>
                  <p className="font-sans font-light text-[14px] text-gray-500 leading-[1.9] max-w-sm">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          OUR GUARANTEE  —  #FFFFFF white
      ══════════════════════════════════════════════════════════════════ */}
      <section id="warranty" className="py-36 md:py-52 bg-white">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-16">
          <FadeIn>
            <div className="mb-24 md:mb-36">
              <p className="font-mono text-[9px] text-gray-400 tracking-[0.35em] uppercase mb-5">— 03</p>
              <h2 className="font-headline font-bold text-[clamp(2.4rem,5.5vw,5.5rem)] leading-[0.93] tracking-[-0.025em] text-black">
                Our Guarantee
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-16 gap-y-14 border-t border-black/8 pt-16">
            {[
              { label: '1-Year Warranty', desc: 'Full coverage on movement defects and water resistance failure under normal use conditions.' },
              { label: '15-Day Returns',  desc: 'Not satisfied? Return it unworn within 15 days for a full refund, minus shipping costs.' },
              { label: 'Built by Us',     desc: 'No dropshipping. Every watch is hand-assembled in our shop to exacting standards.' },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div>
                  {/* Short vertical rule as distinctive marker */}
                  <div className="w-px h-10 bg-black mb-8" />
                  <h3 className="font-display font-semibold text-sm uppercase tracking-[0.16em] text-black mb-4">{item.label}</h3>
                  <p className="font-sans font-light text-[14px] text-gray-500 leading-[1.9]">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER  —  #111 dark (mirrors pull-quote for visual bookending)
      ══════════════════════════════════════════════════════════════════ */}
      <footer className="bg-[#111] text-white pt-24 pb-12 px-8 lg:px-16 mt-auto">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-16 mb-20 pb-16 border-b border-white/8">
            <div className="max-w-xs">
              <span className="block font-display font-semibold text-sm tracking-[0.28em] uppercase mb-5 text-white">Vellune Time</span>
              <p className="font-sans font-light text-[13px] text-white/40 leading-relaxed">
                Precision automatic watches, hand-assembled one at a time in the United States.
              </p>
            </div>
            <div className="flex gap-16 md:gap-24 font-sans text-[11px] tracking-[0.2em] uppercase">
              <div className="flex flex-col gap-4">
                <span className="font-medium text-white/25 mb-1">Shop</span>
                <a href="#collection" className="text-white/55 hover:text-white transition-colors duration-200">Collection</a>
                <a href="#"           className="text-white/55 hover:text-white transition-colors duration-200">Accessories</a>
              </div>
              <div className="flex flex-col gap-4">
                <span className="font-medium text-white/25 mb-1">Support</span>
                <a href="#build"    className="text-white/55 hover:text-white transition-colors duration-200">The Craft</a>
                <a href="#warranty" className="text-white/55 hover:text-white transition-colors duration-200">Warranty</a>
                <a href="#"         className="text-white/55 hover:text-white transition-colors duration-200">Contact</a>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/22">
            <div>© {new Date().getFullYear()} Vellune Time. All rights reserved.</div>
            <div className="flex gap-8">
              <a href="#" className="hover:text-white/60 transition-colors">Terms</a>
              <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
