'use client';

import React, { useState, useMemo } from 'react';
import { 
  Utensils, 
  CupSoda, 
  Pizza, 
  Tag, 
  Search, 
  Trash2, 
  ArrowRight,
  Plus,
  Minus,
  LogOut
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PaymentModal } from '@/components/payment-modal';

// --- Types ---
type Category = {
  id: string;
  name: string;
  icon: React.ElementType;
};

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  soldOut?: boolean;
  categoryId: string;
};

type CartItem = {
  id: string; // unique instance id for cart
  productId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers: string[];
};

// --- Mock Data ---
const CATEGORIES: Category[] = [
  { id: 'combos', name: 'Combos', icon: Utensils },
  { id: 'drinks', name: 'Drinks', icon: CupSoda },
  { id: 'sides', name: 'Sides', icon: Pizza }, // Using Pizza as substitute for Sides icon per prompt
  { id: 'pizza', name: 'Pizza', icon: Pizza },
  { id: 'promos', name: 'Promos', icon: Tag },
];

const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Classic Cheeseburger', price: 150, image: 'https://picsum.photos/seed/burger1/400/300', categoryId: 'combos' },
  { id: 'p2', name: 'Double Smash Burger', price: 220, image: 'https://picsum.photos/seed/burger2/400/300', categoryId: 'combos' },
  { id: 'p3', name: 'Spicy Crispy Chicken', price: 280, image: 'https://picsum.photos/seed/burger3/400/300', soldOut: true, categoryId: 'combos' },
  { id: 'p4', name: 'Bacon BBQ Stack', price: 280, image: 'https://picsum.photos/seed/burger4/400/300', categoryId: 'combos' },
  { id: 'p5', name: 'Mushroom Swiss Veggie', price: 190, image: 'https://picsum.photos/seed/burger5/400/300', categoryId: 'combos' },
  { id: 'p6', name: 'Kids Beef Slider', price: 110, image: 'https://picsum.photos/seed/burger6/400/300', categoryId: 'combos' },
  // Add some dummy products for other categories just to show state changes
  { id: 'p7', name: 'Pepperoni Pizza', price: 450, image: 'https://picsum.photos/seed/pizza1/400/300', categoryId: 'pizza' },
  { id: 'p8', name: 'Cola Regular', price: 60, image: 'https://picsum.photos/seed/cola/400/300', categoryId: 'drinks' },
];

const INITIAL_CART: CartItem[] = [
  {
    id: 'c1',
    productId: 'p1',
    name: 'Classic Cheeseburger',
    price: 150,
    quantity: 2,
    modifiers: ['No Onions', 'Extra Mayo']
  },
  {
    id: 'c2',
    productId: 'sides1', // pretend product
    name: 'Large Fries',
    price: 85,
    quantity: 1,
    modifiers: []
  }
];

export default function POSScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('combos');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>(INITIAL_CART);

  // --- Derived State ---
  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter(p => {
      const matchesCategory = p.categoryId === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const vat = subtotal * 0.12;
  const total = subtotal + vat;

  // --- Handlers ---
  const handleAddToCart = (product: Product) => {
    if (product.soldOut) return;

    setCart(prev => {
      // Check if item already exists WITHOUT modifiers (simple case for prototype)
      const existingItemIndex = prev.findIndex(item => item.productId === product.id && item.modifiers.length === 0);
      
      if (existingItemIndex >= 0) {
        // Increment quantity
        const newCart = [...prev];
        newCart[existingItemIndex].quantity += 1;
        return newCart;
      } else {
        // Add new
        return [...prev, {
          id: `new-${Date.now()}`,
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          modifiers: []
        }];
      }
    });
  };

  const handleUpdateQuantity = (cartItemId: string, change: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === cartItemId) {
        const newQty = Math.max(0, item.quantity + change);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear the current order?')) {
      setCart([]);
    }
  };

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(true);

  return (
    <>
    <div className="flex h-screen w-full bg-[#FAFAFA] font-sans text-slate-900 overflow-hidden">
      
      {/* --- Left Sidebar (Navigation) --- */}
      <aside className="w-[100px] bg-white border-r border-slate-200 flex flex-col items-center py-6 flex-shrink-0">
        {/* Profile Circle */}
        <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-lg mb-8 shadow-sm">
          JS
        </div>

        {/* Categories */}
        <nav className="flex flex-col w-full gap-4 px-3">
          {CATEGORIES.map((category) => {
            const isActive = activeCategory === category.id;
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex flex-col items-center justify-center py-4 rounded-2xl transition-all duration-200 border ${
                  isActive 
                    ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' 
                    : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-7 h-7 mb-2 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                <span className="text-xs font-semibold tracking-wide">
                  {category.name}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Log Out Button */}
        <div className="mt-auto mb-4 px-3 w-full">
          <button 
            onClick={() => router.push('/')}
            className="flex flex-col items-center justify-center py-4 w-full rounded-2xl transition-all duration-200 border bg-transparent border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900 focus:outline-none"
            aria-label="Log Out"
          >
            <LogOut className="w-6 h-6 mb-2 stroke-[2px]" />
            <span className="text-xs font-semibold tracking-wide">
              Log Out
            </span>
          </button>
        </div>
      </aside>

      {/* --- Center Main Area (Products) --- */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#FAFBFF]">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-6 bg-white/50 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {CATEGORIES.find(c => c.id === activeCategory)?.name || 'Products'}
          </h1>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="pl-11 pr-4 py-3 w-[300px] rounded-full border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all placeholder:text-slate-400 font-medium"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div 
                key={product.id}
                onClick={() => handleAddToCart(product)}
                className={`group relative bg-white rounded-[24px] overflow-hidden border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col ${
                  product.soldOut ? 'opacity-60 grayscale-[0.5] pointer-events-none' : 'hover:-translate-y-1'
                }`}
              >
                {/* Image Container */}
                <div className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden">
                  <Image 
                    src={product.image} 
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    unoptimized
                  />
                  {/* Price Badge */}
                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-sm text-slate-900 font-bold text-sm tracking-tight border border-slate-100">
                    <span className="font-sans mr-[2px]">₱</span>{product.price}
                  </div>
                  
                  {/* Sold Out Overlay */}
                  {product.soldOut && (
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-[2px]">
                      <span className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold tracking-wider text-sm">
                        SOLD OUT
                      </span>
                    </div>
                  )}
                </div>

                {/* Info Container */}
                <div className="p-4 flex flex-col justify-between flex-1">
                  <h3 className="font-semibold text-slate-800 leading-snug">
                    {product.name}
                  </h3>
                </div>
              </div>
            ))}

            {filteredProducts.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                <Utensils className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-medium text-lg">No products found.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* --- Right Order Panel (Cart) --- */}
      <aside className="w-[400px] bg-white border-l border-slate-200 flex flex-col h-full shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-20 flex-shrink-0">
        
        {/* Cart Header */}
        <header className="flex items-center justify-between px-6 py-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Current Order</h2>
            <p className="text-sm text-slate-500 font-medium">Order #042 · Dine In</p>
          </div>
          <button 
            onClick={handleClearCart}
            className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors focus:outline-none"
            aria-label="Clear cart"
            title="Clear Cart"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </header>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <p className="font-medium">Order is empty.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <h4 className="font-semibold text-slate-900">{item.name}</h4>
                    
                    {/* Modifiers */}
                    {item.modifiers.length > 0 && (
                      <div className="mt-1 flex flex-col gap-0.5">
                        {item.modifiers.map((mod, idx) => (
                          <span key={idx} className="text-xs text-slate-500 font-medium whitespace-nowrap">
                            - {mod}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Edit Modifiers Link (Mock) */}
                    {item.modifiers.length > 0 && (
                      <button className="text-[11px] text-slate-400 underline underline-offset-2 mt-2 hover:text-slate-600 transition-colors">
                        Edit Modifiers
                      </button>
                    )}
                  </div>
                  
                  <div className="font-bold text-slate-900 text-lg whitespace-nowrap">
                    <span className="font-sans mr-[2px]">₱</span>{item.price * item.quantity}
                  </div>
                </div>

                {/* Quantity Control */}
                <div className="flex justify-end">
                  <div className="flex items-center bg-slate-50 rounded-full p-1 border border-slate-200">
                    <button 
                      onClick={() => handleUpdateQuantity(item.id, -1)}
                      className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-600 shadow-sm hover:text-slate-900 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-bold text-slate-900 tabular-nums">
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => handleUpdateQuantity(item.id, 1)}
                      className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-600 shadow-sm hover:text-slate-900 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Checkout */}
        <div className="p-6 bg-slate-50 mt-auto border-t border-slate-200">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Subtotal</span>
              <span className="text-slate-900">₱{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 font-medium">
              <span>VAT (12%)</span>
              <span className="text-slate-900">₱{vat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-end pt-3 border-t border-slate-200/60">
              <span className="text-lg font-bold text-slate-900">Total</span>
              <span className="text-[32px] font-black text-emerald-500 leading-none tracking-tight">
                <span className="font-sans mr-1">₱</span>{total.toFixed(2)}
              </span>
            </div>
          </div>

          <button 
            disabled={cart.length === 0}
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-full flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-4 focus:ring-emerald-500/20 shadow-lg shadow-emerald-500/20"
          >
            CHARGE
            <ArrowRight className="w-6 h-6 stroke-[2.5px]" />
          </button>
        </div>

      </aside>
    </div>
    
    <PaymentModal
      isOpen={isPaymentModalOpen}
      onClose={() => setIsPaymentModalOpen(false)}
      totalDue={Number(total.toFixed(2))}
      orderNumber="042"
      orderType="Dine In"
      items={cart}
    />
    </>
  );
}
