'use client';

import React, { useState, useMemo } from 'react';
import { 
  Utensils, 
  CupSoda, 
  Pizza, 
  Package,
  Search, 
  Trash2, 
  ArrowRight,
  Plus,
  Minus,
  LogOut,
  Check
} from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { PaymentModal } from '@/components/payment-modal';
import { ReceiptTemplate } from '@/components/receipt-template';
import { menuItems } from '@/lib/menuData';

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
  description?: string;
  sizes?: { label: string; price: number }[];
  addOns?: { name: string; price: number }[];
  requiresShakeFlavor?: boolean;
  hasBurgerAddons?: boolean;
  requiresSiomaiChoice?: boolean;
  requiresMilkteaFlavor?: boolean;
};

type CartItem = {
  id: string; // unique instance id for cart
  productId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers: string[];
  selectedSize?: string;
  selectedAddOns?: string[];
  selectedShakeFlavor?: string;
  selectedBurgerAddon?: string;
  selectedSiomaiChoice?: string;
  selectedMilkteaFlavor?: string;
};

// --- Mock Data ---
const CATEGORIES: Category[] = [
  { id: 'combos', name: 'Combos', icon: Utensils },
  { id: 'milktea', name: 'Milktea', icon: CupSoda },
  { id: 'milk-shakes', name: 'Milk Shakes', icon: CupSoda },
  { id: 'burgers', name: 'Burgers', icon: Utensils },
  { id: 'pizza', name: 'Pizza', icon: Pizza },
  { id: 'sides', name: 'Sides', icon: Package },
  { id: 'siomai', name: 'Siomai', icon: Utensils },
];

const getCategoryId = (menuCategory: string) => {
  switch (menuCategory) {
    case 'Combos':
      return 'combos';
    case 'Milktea Series':
      return 'milktea';
    case 'Milk Shakes':
      return 'milk-shakes';
    case 'Burgers & Sandwiches':
      return 'burgers';
    case 'Pizza':
      return 'pizza';
    case 'Sides & Others':
      return 'sides';
    case 'Siomai':
      return 'siomai';
    default:
      return 'sides';
  }
};

const PRODUCTS: Product[] = menuItems.map((item) => ({
  id: item.id,
  name: item.name,
  price: item.sizes?.[0]?.price ?? item.basePrice,
  image: item.image ?? `/images/menu/${item.id}.webp`,
  categoryId: getCategoryId(item.category),
  sizes: item.sizes,
  addOns: item.addOns,
  requiresShakeFlavor: (item as any).requiresShakeFlavor ?? false,
  hasBurgerAddons: (item as any).hasBurgerAddons ?? false,
  requiresSiomaiChoice: (item as any).requiresSiomaiChoice ?? false,
  requiresMilkteaFlavor: (item as any).requiresMilkteaFlavor ?? false,
  description: item.description,
}));

const generateOrderNumber = () => {
  const seed = Math.floor(1000 + Math.random() * 9000);
  return `#${seed}`;
};

export default function POSScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState('combos');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNumber, setOrderNumber] = useState(() => generateOrderNumber());
  const [orderType, setOrderType] = useState<'Dine In' | 'Take Out' | null>(() => {
    const param = searchParams?.get('orderType');
    if (param === 'dine-in') return 'Dine In';
    if (param === 'take-out') return 'Take Out';
    return null;
  });
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [selectedShakeFlavor, setSelectedShakeFlavor] = useState('');
  const [selectedBurgerAddon, setSelectedBurgerAddon] = useState('');
  const [selectedSiomaiChoice, setSelectedSiomaiChoice] = useState('');
  const [selectedMilkteaFlavor, setSelectedMilkteaFlavor] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isClearCartModalOpen, setIsClearCartModalOpen] = useState(false);

  // --- Derived State ---
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      const matchesCategory = product.categoryId === activeCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const total = subtotal;

  const getItemPrice = (product: Product, customization?: { sizeLabel?: string; addOns?: string[] }) => {
    const selectedSizePrice = product.sizes?.find((size) => size.label === customization?.sizeLabel)?.price ?? product.price;
    const addOnTotal = (customization?.addOns ?? []).reduce((sum, addOnName) => {
      const matchingAddOn = product.addOns?.find((addOn) => addOn.name === addOnName);
      return sum + (matchingAddOn?.price ?? 0);
    }, 0);

    // burger addon prices (optional combo extras)
    let burgerAddonTotal = 0;
    const burgerAddonKey = (customization as any)?.burgerAddon as string | undefined;
    if (burgerAddonKey) {
      if (burgerAddonKey === 'add-cheese') burgerAddonTotal += 5;
      if (burgerAddonKey === 'add-egg') burgerAddonTotal += 15;
      if (burgerAddonKey === 'add-cheese-egg') burgerAddonTotal += 20;
    }

    return selectedSizePrice + addOnTotal + burgerAddonTotal;
  };

  const handleProductClick = (product: Product) => {
    if (product.soldOut) return;

    const needsCustomization = Boolean(
      product.sizes?.length ||
      product.addOns?.length ||
      product.requiresShakeFlavor ||
      product.hasBurgerAddons ||
      product.requiresSiomaiChoice ||
      product.requiresMilkteaFlavor
    );

    if (needsCustomization) {
      setCustomizingProduct(product);
      setSelectedSize(product.sizes?.[0]?.label ?? '');
      setSelectedAddOns([]);
      setSelectedShakeFlavor('');
      setSelectedBurgerAddon('');
      setSelectedSiomaiChoice('');
      setSelectedMilkteaFlavor('');
      return;
    }

    handleAddToCart(product);
  };

  const handleAddToCart = (
    product: Product,
    customization?: {
      sizeLabel?: string;
      addOns?: string[];
      burgerAddon?: string;
      shakeFlavor?: string;
      siomaiChoice?: string;
      milkteaFlavor?: string;
    },
    extraModifiers: string[] = [],
    quantity = 1,
  ) => {
    const finalPrice = getItemPrice(product, customization);
    const modifiers = [
      ...(customization?.sizeLabel ? [`Size: ${customization.sizeLabel}`] : []),
      ...(customization?.addOns?.map((addOnName) => `Add-on: ${addOnName}`) ?? []),
      ...extraModifiers,
    ];

    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex((item) => item.productId === product.id || item.name === product.name);

      if (existingItemIndex >= 0) {
        const newCart = [...prevCart];
        const existingItem = newCart[existingItemIndex];
        newCart[existingItemIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + quantity,
          modifiers: Array.from(new Set([...(existingItem.modifiers ?? []), ...modifiers])),
        };
        return newCart;
      }

      return [
        ...prevCart,
        {
          id: `new-${Date.now()}`,
          productId: product.id,
          name: product.name,
          price: finalPrice,
          quantity,
          modifiers,
          selectedSize: customization?.sizeLabel,
          selectedAddOns: customization?.addOns,
          selectedBurgerAddon: customization?.burgerAddon,
          selectedShakeFlavor: customization?.shakeFlavor,
          selectedSiomaiChoice: customization?.siomaiChoice,
          selectedMilkteaFlavor: customization?.milkteaFlavor,
        },
      ];
    });
  };

  const handleConfirmCustomization = () => {
    if (!customizingProduct) return;
    // ensure required fields are filled
    const missingRequired = (
      (customizingProduct.requiresShakeFlavor && !selectedShakeFlavor) ||
      (customizingProduct.requiresSiomaiChoice && !selectedSiomaiChoice) ||
      (customizingProduct.requiresMilkteaFlavor && !selectedMilkteaFlavor)
    );

    if (missingRequired) {
      setErrorMessage('Please select all required options for this combo.');
      return;
    }

    const customizationPayload: any = {
      sizeLabel: selectedSize,
      addOns: selectedAddOns,
      burgerAddon: selectedBurgerAddon || undefined,
      shakeFlavor: selectedShakeFlavor || undefined,
      siomaiChoice: selectedSiomaiChoice || undefined,
      milkteaFlavor: selectedMilkteaFlavor || undefined,
    };

    // add non-price selections into modifiers
    const extraModifiers: string[] = [];
    if (selectedShakeFlavor) extraModifiers.push(`Shake: ${selectedShakeFlavor}`);
    if (selectedBurgerAddon) {
      const label = selectedBurgerAddon === 'add-cheese' ? 'Add Cheese' : selectedBurgerAddon === 'add-egg' ? 'Add Egg' : 'Add Cheese & Egg';
      extraModifiers.push(`Burger Add-on: ${label}`);
    }
    if (selectedSiomaiChoice) extraModifiers.push(`Siomai: ${selectedSiomaiChoice}`);
    if (selectedMilkteaFlavor) extraModifiers.push(`Milktea: ${selectedMilkteaFlavor}`);

    handleAddToCart(customizingProduct, customizationPayload, extraModifiers);
    setCustomizingProduct(null);
    setSelectedSize('');
    setSelectedAddOns([]);
    setSelectedShakeFlavor('');
    setSelectedBurgerAddon('');
    setSelectedSiomaiChoice('');
    setSelectedMilkteaFlavor('');
  };

  const toggleAddOn = (addOnName: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(addOnName) ? prev.filter((item) => item !== addOnName) : [...prev, addOnName],
    );
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
    setCart([]);
    setIsClearCartModalOpen(false);
  };

  const handleOrderComplete = () => {
    setCart([]);
    setOrderType(null);
    setOrderNumber(generateOrderNumber());
    router.push('/start-order');
  };

  const selectedTotal = customizingProduct
    ? getItemPrice(customizingProduct, {
        sizeLabel: selectedSize,
        addOns: selectedAddOns,
        burgerAddon: selectedBurgerAddon,
      })
    : 0;

  return (
    <>
    <div className="flex h-screen w-full bg-[#FAFAFA] font-sans text-slate-900 overflow-hidden print:hidden">
      
      {/* --- Left Sidebar (Navigation) --- */}
      <aside className="hidden lg:flex w-[100px] bg-white border-r border-slate-200 flex-col items-center py-6 flex-shrink-0">
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
      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-[#FAFBFF] w-full">
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

        <nav
          aria-label="Mobile product categories"
          className="flex lg:hidden overflow-x-auto whitespace-nowrap gap-3 py-3 px-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {CATEGORIES.map((category) => {
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 hover:text-gray-800'
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </nav>

        {/* Product Grid */}
        <div className="flex-1 w-full overflow-y-auto p-8 pb-32 lg:pb-8">
          <div className="w-full flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
            {filteredProducts.map((product) => (
              <div 
                key={product.id}
                onClick={() => handleProductClick(product)}
                className={`group relative bg-white rounded-[24px] overflow-hidden border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col ${
                  product.soldOut ? 'opacity-60 grayscale-[0.5] pointer-events-none' : 'hover:-translate-y-1'
                }`}
              >
                {/* Image Container */}
                <div className="relative w-full h-80 overflow-hidden bg-slate-100">
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={400}
                    height={300}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Price Badge */}
                  <div className="absolute bottom-3 right-3 bg-slate-900 px-3 py-1.5 rounded-full shadow-xl text-white font-bold text-base tracking-tight">
                    <span className="font-sans text-sm align-text-top mr-[2px]">₱</span>{product.price}
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
                  <h3 className="text-xl font-bold text-slate-900 leading-snug">
                    {product.name}
                  </h3>
                  {product.description ? (
                    <p className="mt-2 text-sm text-slate-500 line-clamp-2 leading-snug">
                      {product.description}
                    </p>
                  ) : null}
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

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 bg-white/95 border-t border-slate-200 px-5 py-4 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] lg:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Total</p>
          <p className="text-2xl font-bold text-slate-900">₱{total.toFixed(2)}</p>
        </div>
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10"
        >
          View Current Order
        </button>
      </div>

      {/* --- Right Order Panel (Cart) --- */}
      <aside className="hidden lg:flex w-[400px] bg-white border-l border-slate-200 flex flex-col h-full shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-20 flex-shrink-0">
        
        {/* Cart Header */}
        <header className="flex items-center justify-between px-6 py-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Current Order</h2>
            <p className="text-sm text-slate-500 font-medium">{orderNumber} · {orderType ?? 'Select Type'}</p>
          </div>
          <button 
            onClick={() => setIsClearCartModalOpen(true)}
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

    <div className={`fixed inset-0 z-40 lg:hidden ${isMobileCartOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        onClick={() => setIsMobileCartOpen(false)}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isMobileCartOpen ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        className={`absolute inset-x-0 bottom-0 z-50 w-full max-h-[85vh] overflow-hidden bg-white rounded-t-[32px] shadow-2xl transition-transform duration-300 ease-in-out ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="mx-auto flex max-w-3xl h-full flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Current Order</h2>
              <p className="text-sm text-slate-500">{orderNumber} · {orderType ?? 'Select Type'}</p>
            </div>
            <button
              onClick={() => setIsMobileCartOpen(false)}
              className="text-slate-500 hover:text-slate-900 font-semibold"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cart.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-slate-400">
                <p className="font-medium">Order is empty.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-4">
                      <h4 className="font-semibold text-slate-900">{item.name}</h4>
                      {item.modifiers.length > 0 && (
                        <div className="mt-1 flex flex-col gap-0.5">
                          {item.modifiers.map((mod, idx) => (
                            <span key={idx} className="text-xs text-slate-500 font-medium whitespace-nowrap">- {mod}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-slate-900 text-lg whitespace-nowrap">
                      <span className="font-sans mr-[2px]">₱</span>{item.price * item.quantity}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="flex items-center bg-slate-50 rounded-full p-1 border border-slate-200">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-600 shadow-sm hover:text-slate-900 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center font-bold text-slate-900 tabular-nums">{item.quantity}</span>
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

          <div className="p-6 bg-slate-50 border-t border-slate-200">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Subtotal</span>
                <span className="text-slate-900">₱{subtotal.toFixed(2)}</span>
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
              onClick={() => {
                setIsPaymentModalOpen(true);
                setIsMobileCartOpen(false);
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-emerald-500/20 shadow-lg shadow-emerald-500/20"
            >
              CHARGE
              <ArrowRight className="w-6 h-6 stroke-[2.5px]" />
            </button>
          </div>
        </div>
      </div>
    </div>

    {customizingProduct && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4 py-6">
        <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Customize item</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">{customizingProduct.name}</h3>
            </div>
            <button
              onClick={() => {
                setCustomizingProduct(null);
                setSelectedSize('');
                setSelectedAddOns([]);
              }}
              className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>

          {customizingProduct.sizes && customizingProduct.sizes.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Size</h4>
              <div className="mt-3 flex flex-wrap gap-3">
                {customizingProduct.sizes.map((size) => {
                  const isSelected = selectedSize === size.label;
                  return (
                    <button
                      key={size.label}
                      onClick={() => setSelectedSize(size.label)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {size.label} · ₱{size.price}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {customizingProduct.requiresShakeFlavor && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Milk Shake Flavor</h4>
              <div className="mt-3 flex flex-wrap gap-3">
                {[
                  'Cookies and Cream',
                  'Choco Kisses',
                  'Mango',
                  'Ube Macapuno',
                  'Avocado',
                  'Straw Berry',
                  'Buco Pandan',
                  'Melon',
                ].map((flavor) => {
                  const isSelected = selectedShakeFlavor === flavor;
                  return (
                    <button
                      key={flavor}
                      onClick={() => setSelectedShakeFlavor(flavor)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {flavor}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {customizingProduct.addOns && customizingProduct.addOns.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Add-ons</h4>
              <div className="mt-3 space-y-3">
                {customizingProduct.addOns.map((addOn) => {
                  const isActive = selectedAddOns.includes(addOn.name);
                  return (
                    <button
                      key={addOn.name}
                      onClick={() => toggleAddOn(addOn.name)}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-semibold">{addOn.name}</span>
                      <span className="text-sm font-medium">+₱{addOn.price}</span>
                      {isActive && <Check className="ml-3 h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {customizingProduct.hasBurgerAddons && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Burger Add-ons</h4>
              <div className="mt-3 flex flex-wrap gap-3">
                {[
                  { key: '', label: 'None', price: 0 },
                  { key: 'add-cheese', label: 'Add Cheese', price: 5 },
                  { key: 'add-egg', label: 'Add Egg', price: 15 },
                  { key: 'add-cheese-egg', label: 'Add Cheese & Egg', price: 20 },
                ].map((opt) => {
                  const isSelected = selectedBurgerAddon === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setSelectedBurgerAddon(opt.key)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}{opt.price ? ` · +₱${opt.price}` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {customizingProduct.requiresSiomaiChoice && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Siomai Choice</h4>
              <div className="mt-3 flex flex-wrap gap-3">
                {['Beef', 'Chicken'].map((opt) => {
                  const isSelected = selectedSiomaiChoice === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setSelectedSiomaiChoice(opt)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {customizingProduct.requiresMilkteaFlavor && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Milktea Flavor</h4>
              <div className="mt-3 flex flex-wrap gap-3">
                {['Matcha','Chocolate','Red Velvet','Salted Caramel','Rocky Road','Cookies and Cream'].map((flav) => {
                  const isSelected = selectedMilkteaFlavor === flav;
                  return (
                    <button
                      key={flav}
                      onClick={() => setSelectedMilkteaFlavor(flav)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {flav}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Selected total</span>
              <span className="text-xl font-bold text-slate-900">₱{selectedTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => {
                setCustomizingProduct(null);
                setSelectedSize('');
                setSelectedAddOns([]);
              }}
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Close
            </button>
            <button
              onClick={handleConfirmCustomization}
              className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              Add to Order
            </button>
          </div>
        </div>
      </div>
    )}

    {errorMessage && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
          <h3 className="text-lg font-semibold text-slate-900">Required selection missing</h3>
          <p className="mt-3 text-sm text-slate-600">{errorMessage}</p>
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setErrorMessage('')}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    )}

    {isClearCartModalOpen && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
          <h3 className="text-lg font-semibold text-slate-900">Clear current order?</h3>
          <p className="mt-3 text-sm text-slate-600">Are you sure you want to clear the current order?</p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setIsClearCartModalOpen(false)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleClearCart}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Clear Order
            </button>
          </div>
        </div>
      </div>
    )}

    <ReceiptTemplate cart={cart} orderNumber={orderNumber} orderType={orderType ?? 'Dine In'} />

    <PaymentModal
      isOpen={isPaymentModalOpen}
      onClose={() => setIsPaymentModalOpen(false)}
      onComplete={handleOrderComplete}
      totalDue={Number(total.toFixed(2))}
      orderNumber={orderNumber}
      orderType="Dine In"
      items={cart}
    />
    </>
  );
}
