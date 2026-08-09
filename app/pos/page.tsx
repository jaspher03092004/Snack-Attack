'use client';

import React, { Suspense, useState, useMemo, useEffect, useRef } from 'react';
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
import { supabase } from '@/lib/supabase/client';

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

// --- Recipe Mapping Dictionaries ---
const recipeMap = {
  // COMBOS
  'Attack 1': [{ ingredient: 'Hotdog', qty: 1 }, { ingredient: 'Footlong Buns', qty: 1 }, { ingredient: '16 oz Cups', qty: 1 }, { ingredient: 'Fries', qty: 1 }],
  'Attack 2': [{ ingredient: 'Hotdog', qty: 1 }, { ingredient: 'Footlong Buns', qty: 1 }, { ingredient: 'Halo-Halo', qty: 1 }, { ingredient: '22 oz Cups', qty: 1 }, { ingredient: 'Fries', qty: 1 }],
  'Attack 3': [{ ingredient: 'Hotdog', qty: 1 }, { ingredient: 'Footlong Buns', qty: 1 }, { ingredient: '16 oz Cups', qty: 1 }],
  'Attack 4': [{ ingredient: 'Burger Patty', qty: 1 }, { ingredient: 'Burger Buns', qty: 1 }, { ingredient: '16 oz Cups', qty: 1 }, { ingredient: 'Fries', qty: 1 }],
  'Attack 5': [{ ingredient: '16 oz Cups', qty: 1 }, { ingredient: 'Fries', qty: 1 }],
  'Attack 6': [{ ingredient: '16 oz Cups', qty: 1 }],
  'Tea 1': [{ ingredient: '22 oz Cups', qty: 1 }, { ingredient: 'Burger Patty', qty: 1 }, { ingredient: 'Burger Buns', qty: 1 }, { ingredient: 'Fries', qty: 1 }],
  'Tea 2': [{ ingredient: '22 oz Cups', qty: 1 }, { ingredient: 'Hotdog', qty: 1 }, { ingredient: 'Footlong Buns', qty: 1 }, { ingredient: 'Fries', qty: 1 }],
  'Tea 3': [{ ingredient: '22 oz Cups', qty: 1 }, { ingredient: 'Fries', qty: 1 }],
  // MILKTEA & MILKSHAKES
  'Matcha Milktea': [{ ingredient: '22 oz Cups', qty: 1 }],
  'Chocolate Milktea': [{ ingredient: '22 oz Cups', qty: 1 }],
  'Red Velvet Milktea': [{ ingredient: '22 oz Cups', qty: 1 }],
  'Salted Caramel Milktea': [{ ingredient: '22 oz Cups', qty: 1 }],
  'Rocky Road Milktea': [{ ingredient: '22 oz Cups', qty: 1 }],
  'Cookies and Cream Milktea': [{ ingredient: '22 oz Cups', qty: 1 }],
  'Cookies and Cream Milk Shake': [{ ingredient: '16 oz Cups', qty: 1 }],
  'Choco Kisses Milk Shake': [{ ingredient: '16 oz Cups', qty: 1 }],
  'Mango Milk Shake': [{ ingredient: '16 oz Cups', qty: 1 }],
  'Ube Macapuno Milk Shake': [{ ingredient: '16 oz Cups', qty: 1 }],
  'Avocado Milk Shake': [{ ingredient: '16 oz Cups', qty: 1 }],
  'Straw Berry Milk Shake': [{ ingredient: '16 oz Cups', qty: 1 }],
  'Buco Pandan Milk Shake': [{ ingredient: '16 oz Cups', qty: 1 }],
  'Melon Milk Shake': [{ ingredient: '16 oz Cups', qty: 1 }],
  // BURGERS
  'Plain Burger': [{ ingredient: 'Burger Patty', qty: 1 }, { ingredient: 'Burger Buns', qty: 1 }],
  'Cheese Burger': [{ ingredient: 'Burger Patty', qty: 1 }, { ingredient: 'Burger Buns', qty: 1 }, { ingredient: 'Cheese', qty: 1 }],
  'Egg Burger': [{ ingredient: 'Burger Patty', qty: 1 }, { ingredient: 'Burger Buns', qty: 1 }, { ingredient: 'Itlog/Egg', qty: 1 }],
  'Egg & Cheese Burger': [{ ingredient: 'Burger Patty', qty: 1 }, { ingredient: 'Burger Buns', qty: 1 }, { ingredient: 'Cheese', qty: 1 }, { ingredient: 'Itlog/Egg', qty: 1 }],
  'Overload Burger': [{ ingredient: 'Burger Patty', qty: 2 }, { ingredient: 'Burger Buns', qty: 1 }, { ingredient: 'Cheese', qty: 2 }, { ingredient: 'Itlog/Egg', qty: 1 }],
  'Footlong Sandwich': [{ ingredient: 'Hotdog', qty: 1 }, { ingredient: 'Footlong Buns', qty: 1 }],
  // PIZZA
  'Hawaiian Pizza': [{ ingredient: 'Pizza Hawaiian', qty: 1 }],
  'Pepperoni Pizza': [{ ingredient: 'Pizza Pepperoni', qty: 1 }],
  'Beef Mushroom Pizza': [{ ingredient: 'Pizza Beef Mushroom', qty: 1 }],
  'Ham and Cheese Pizza': [{ ingredient: 'Pizza Ham and Cheese', qty: 1 }],
  'Overload Pizza': [{ ingredient: 'Pizza Overload', qty: 1 }],
  // SIDES & DRINKS
  'Frenchy Fries w/ Cheese': [{ ingredient: 'Fries', qty: 1 }, { ingredient: 'Cheese', qty: 1 }],
  'Nachos': [{ ingredient: 'Nachos', qty: 1 }],
  'Halo-Halo': [{ ingredient: 'Halo-Halo', qty: 1 }, { ingredient: '22 oz Cups', qty: 1 }],
  'Chicken Siomai': [{ ingredient: 'Siomai Chicken', qty: 1 }],
  'Beef Siomai': [{ ingredient: 'Siomai Beef', qty: 1 }],
  'Japanese Siomai': [{ ingredient: 'Siomai Japanese', qty: 1 }],
  'Coke': [{ ingredient: 'Coke', qty: 1 }],
  'Pepsi': [{ ingredient: 'Pepsi', qty: 1 }],
  '7Up': [{ ingredient: '7Up', qty: 1 }],
  'Water': [{ ingredient: 'Water', qty: 1 }]
};

const burgerAddons = {
  '': [],
  'add-cheese': [{ ingredient: 'Cheese', qty: 1 }],
  'add-egg': [{ ingredient: 'Itlog/Egg', qty: 1 }],
  'add-cheese-egg': [{ ingredient: 'Cheese', qty: 1 }, { ingredient: 'Itlog/Egg', qty: 1 }]
};

const siomaiChoices = {
  'Chicken': [{ ingredient: 'Siomai Chicken', qty: 6 }],
  'Beef': [{ ingredient: 'Siomai Beef', qty: 6 }]
};

const getFullFlavorName = (shortName: string, type: string) => {
  if (type === 'milktea') return `${shortName} Milktea`;
  if (type === 'milkshake') return `${shortName} Milk Shake`;
  return shortName;
};

// --- Availability Checker ---
type InventoryItem = {
  product_name: string;
  pieces_stock: number;
  [key: string]: any;
};

const checkAvailability = (
  posItem: { name: string; selectedBurgerAddon?: string; selectedSiomaiChoice?: string },
  currentInventory: InventoryItem[]
): boolean => {
  let deductions: { ingredient: string; qty: number }[] = [];

  // Get base recipe from mapping
  const itemName = posItem.name;
  if (recipeMap[itemName as keyof typeof recipeMap]) {
    deductions.push(...recipeMap[itemName as keyof typeof recipeMap]);
  } else {
    // Fallback for unmapped items
    deductions.push({ ingredient: itemName, qty: 1 });
  }

  // Append dynamic choices if they exist
  const posItemTyped = posItem as any;
  if (posItemTyped.selectedBurgerAddon && burgerAddons[posItemTyped.selectedBurgerAddon as keyof typeof burgerAddons]) {
    deductions.push(...burgerAddons[posItemTyped.selectedBurgerAddon as keyof typeof burgerAddons]);
  }
  if (posItemTyped.selectedSiomaiChoice && siomaiChoices[posItemTyped.selectedSiomaiChoice as keyof typeof siomaiChoices]) {
    deductions.push(...siomaiChoices[posItemTyped.selectedSiomaiChoice as keyof typeof siomaiChoices]);
  }

  // Check each required ingredient
  for (const deduction of deductions) {
    const inventoryItem = currentInventory.find(
      (inv) => inv.product_name.toLowerCase() === deduction.ingredient.toLowerCase()
    );

    if (!inventoryItem || inventoryItem.pieces_stock < deduction.qty) {
      return false;
    }
  }

  return true;
};

// --- Cart Tally Function ---
const calculateTotalDeductions = (cart: CartItem[]): Record<string, number> => {
  const ingredientTotals: Record<string, number> = {};

  const processDeductions = (deductionArray: { ingredient: string; qty: number }[], cartItemQty: number) => {
    deductionArray.forEach((req) => {
      ingredientTotals[req.ingredient] = (ingredientTotals[req.ingredient] || 0) + (req.qty * cartItemQty);
    });
  };

  cart.forEach((item) => {
    // Ensure quantity has a fallback
    const itemQty = item.quantity || 1;
    const normalizedItemName = item.name?.trim();

    // Find a matching key in the recipe map regardless of casing
    const recipeKey = Object.keys(recipeMap).find(
      (key) => key.toLowerCase() === (normalizedItemName ?? '').toLowerCase()
    );

    if (recipeKey) {
      processDeductions(recipeMap[recipeKey as keyof typeof recipeMap], itemQty);
    } else {
      // Fallback for unmapped items
      processDeductions([{ ingredient: normalizedItemName || item.name, qty: 1 }], itemQty);
    }

    // Burger add-ons (case-insensitive)
    if (item.selectedBurgerAddon) {
      const addonKey = Object.keys(burgerAddons).find(
        (key) => key.toLowerCase() === item.selectedBurgerAddon!.toLowerCase().trim()
      );
      if (addonKey) {
        processDeductions(burgerAddons[addonKey as keyof typeof burgerAddons], itemQty);
      }
    }

    // Siomai choices (case-insensitive)
    if (item.selectedSiomaiChoice) {
      const siomaiKey = Object.keys(siomaiChoices).find(
        (key) => key.toLowerCase() === item.selectedSiomaiChoice!.toLowerCase().trim()
      );
      if (siomaiKey) {
        processDeductions(siomaiChoices[siomaiKey as keyof typeof siomaiChoices], itemQty);
      }
    }
  });

  return ingredientTotals;
};

const generateOrderNumber = () => {
  const seed = Math.floor(1000 + Math.random() * 9000);
  return `#${seed}`;
};

function POSScreenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState('combos');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNumber, setOrderNumber] = useState('');
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
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [isIceCreamModalOpen, setIsIceCreamModalOpen] = useState(false);
  const [iceCreamPriceInput, setIceCreamPriceInput] = useState('');
  
  // --- New State for UX Flash Effect ---
  const [justAddedProductId, setJustAddedProductId] = useState<string | null>(null);
  
  // --- New State for Popup Count Effect ---
  const [popups, setPopups] = useState<{ id: string; productId: string; count: number }[]>([]);
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  // Generate order number on client after mount to avoid hydration mismatch.
  useEffect(() => {
    setOrderNumber(generateOrderNumber());
  }, []);

  // --- Effect to clear the "Just Added" highlight after 600ms ---
  useEffect(() => {
    if (justAddedProductId) {
      const timer = setTimeout(() => {
        setJustAddedProductId(null);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [justAddedProductId]);

  // --- Fetch Inventory Data ---
  useEffect(() => {
    const fetchInventory = async () => {
      if (!supabase) return;

      const { data, error } = await supabase
        .from('inventory')
        .select('product_name, pieces_stock, status')
        .order('product_name', { ascending: true });

      if (!error && data) {
        setInventoryData(data as InventoryItem[]);
      }
    };

    fetchInventory();
  }, []);

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

  const getItemPrice = (product: Product, customization?: { sizeLabel?: string; addOns?: string[]; burgerAddon?: string }) => {
    const selectedSizePrice = product.sizes?.find((size) => size.label === customization?.sizeLabel)?.price ?? product.price;
    const addOnTotal = (customization?.addOns ?? []).reduce((sum, addOnName) => {
      const matchingAddOn = product.addOns?.find((addOn) => addOn.name === addOnName);
      return sum + (matchingAddOn?.price ?? 0);
    }, 0);

    // burger addon prices (optional combo extras)
    let burgerAddonTotal = 0;
    const burgerAddonKey = customization?.burgerAddon;
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

  const handleAddCustomIceCream = () => {
    const parsedPrice = parseFloat(iceCreamPriceInput);
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) return;

    const baseIceCream = PRODUCTS.find((item) => item.name === 'Ice Cream');
    if (!baseIceCream) return;

    const customItem: Product = {
      ...baseIceCream,
      id: `${baseIceCream.id}-${Date.now()}`,
      price: parsedPrice,
    };

    handleAddToCart(customItem, undefined, [`Custom Price: ₱${parsedPrice.toFixed(2)}`]);
    setIceCreamPriceInput('');
    setIsIceCreamModalOpen(false);
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
    // --- Trigger UX Flash Effect ---
    setJustAddedProductId(product.id);
    
    // --- Trigger Popup Count Effect (Accumulates on rapid taps) ---
    const popupId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setPopups(prev => {
      const existingIndex = prev.findIndex(p => p.productId === product.id);
      const newCount = existingIndex !== -1 ? prev[existingIndex].count + 1 : 1;
      // Remove old popup for this product to force a fresh animation reset
      const filtered = prev.filter(p => p.productId !== product.id);
      return [...filtered, { id: popupId, productId: product.id, count: newCount }];
    });

    // Clear any existing timer for this product
    if (timeoutRefs.current[product.id]) {
      clearTimeout(timeoutRefs.current[product.id]);
    }
    // Set new timer to remove this specific popup after 0.8 seconds
    timeoutRefs.current[product.id] = setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== popupId));
      delete timeoutRefs.current[product.id];
    }, 800);

    const finalPrice = getItemPrice(product, customization);
    const modifiers = [
      ...(customization?.sizeLabel ? [`Size: ${customization.sizeLabel}`] : []),
      ...(customization?.addOns?.map((addOnName) => `Add-on: ${addOnName}`) ?? []),
      ...extraModifiers,
    ];

    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item.productId === product.id || (product.name !== 'Ice Cream' && item.name === product.name),
      );

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
        <header className="flex items-center justify-between px-4 py-3 md:px-8 md:py-6 bg-white/50 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-10">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            {CATEGORIES.find(c => c.id === activeCategory)?.name || 'Products'}
          </h1>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="pl-11 pr-4 py-3 w-32 md:w-64 lg:w-[300px] rounded-full border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all placeholder:text-slate-400 font-medium"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        <nav
          aria-label="Mobile product categories"
          className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-3 scrollbar-hide w-full lg:hidden px-4 md:px-0"
        >
          {CATEGORIES.map((category) => {
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex-shrink-0 px-3 py-1.5 text-xs md:text-sm rounded-full font-medium transition-colors ${
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
        <div className="flex-1 w-full overflow-y-auto p-4 pb-24 md:p-8 lg:pb-8">
          <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5 md:gap-4 overflow-y-auto pb-24">
            {filteredProducts.map((product) => {
              const isAvailable = checkAvailability(product as unknown as CartItem, inventoryData);
              const inventoryItem = inventoryData.find(
                (inv) => inv.product_name.toLowerCase() === product.name.toLowerCase()
              );
              const isOutOfStock = inventoryItem ? Number(inventoryItem.pieces_stock) <= 0 : false;
              const isCardUnavailable = !isAvailable || isOutOfStock || Boolean(product.soldOut);
              
              // Determine if this card just got an item added to trigger the flash effect
              const isJustAdded = justAddedProductId === product.id && !isCardUnavailable;
              
              // Find popup for this product
              const popup = popups.find(p => p.productId === product.id);
              const hasPopup = !!popup;

              return (
              <div 
                key={product.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isOutOfStock) return;

                  if (product.name.toLowerCase() === 'ice cream') {
                    setIceCreamPriceInput('');
                    setIsIceCreamModalOpen(true);
                  } else {
                    handleProductClick(product);
                  }
                }}
                className={`relative rounded-xl bg-white shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${
                  isCardUnavailable ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'
                } ${
                  isJustAdded 
                    ? 'ring-4 ring-emerald-500 shadow-xl shadow-emerald-500/30 scale-[1.02] z-10' 
                    : ''
                }`}
              >
                {/* Image Container */}
                <div className="relative w-full h-20 md:h-32 bg-slate-100">
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={400}
                    height={300}
                    className="h-full w-full object-cover"
                  />
                  {/* Price Badge */}
                  <div className="absolute bottom-1 right-1 bg-slate-900 text-white text-[9px] md:text-xs font-bold px-1.5 py-0.5 rounded-md">
                    <span className="font-sans mr-[2px]">₱</span>{product.price}
                  </div>
                  
                  {/* Out of Stock / Sold Out Overlay */}
                  {isCardUnavailable && (
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-[2px]">
                      <span className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold tracking-wider text-sm">
                        {product.soldOut ? 'SOLD OUT' : 'OUT OF STOCK'}
                      </span>
                    </div>
                  )}
                  
                  {/* Popup "+X" Effect */}
                  {hasPopup && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <span className="popup-animate text-emerald-500 text-2xl md:text-3xl font-extrabold bg-white/80 rounded-full px-2 py-1 shadow-lg">
                        +{popup.count}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info Container */}
                <div className="flex flex-col justify-between flex-1">
                  <h3 className="p-1 md:p-3 text-[11px] md:text-sm font-bold text-slate-900 leading-tight line-clamp-2">
                    {product.name}
                  </h3>
                  {product.description ? (
                    <p className="px-1 pb-1 md:px-3 md:pb-3 text-[10px] md:text-xs text-slate-500 line-clamp-2 leading-tight">
                      {product.description}
                    </p>
                  ) : null}
                </div>
              </div>
            );
            })}


            {filteredProducts.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                <Utensils className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-medium text-lg">No products found.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <div className={`fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-3 md:p-4 items-center justify-between z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] ${isMobileCartOpen ? 'hidden' : 'flex md:hidden'}`}>
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
        className={`fixed inset-0 z-50 flex flex-col h-[100dvh] w-full bg-slate-50 md:relative md:h-full md:w-96 md:border-l md:border-slate-200 overflow-hidden transition-transform duration-300 ease-in-out ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="flex h-full w-full flex-col">
          <div className="shrink-0 bg-white p-4 border-b border-slate-200 flex justify-between items-center">
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

          <div className="flex-1 overflow-y-auto p-4 pb-24">
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

          <div className="shrink-0 bg-white p-4 border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
            <div className="flex flex-col gap-3 w-full">
              <div className="space-y-3 mb-3">
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
              className="w-full py-4 text-lg font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white transition-colors focus:outline-none focus:ring-4 focus:ring-emerald-500/20 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              CHARGE
              <ArrowRight className="w-6 h-6 stroke-[2.5px]" />
            </button>
            </div>
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
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${(
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      )}`}
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
                  const fullDBName = getFullFlavorName(flavor, 'milkshake');
                  const inventoryItem = inventoryData.find(
                    (item) => item.product_name.trim().toLowerCase() === fullDBName.toLowerCase()
                  );
                  const isOutOfStock = inventoryItem ? Number(inventoryItem.pieces_stock) <= 0 : false;
                  const isSelected = selectedShakeFlavor === flavor;
                  return (
                    <button
                      key={flavor}
                      onClick={() => setSelectedShakeFlavor(flavor)}
                      disabled={isOutOfStock}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                        isOutOfStock
                          ? 'opacity-50 grayscale cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                          : isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {flavor}{isOutOfStock ? ' · Out of Stock' : ''}
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
                  const fullDBName = getFullFlavorName(flav, 'milktea');
                  const inventoryItem = inventoryData.find(
                    (item) => item.product_name.trim().toLowerCase() === fullDBName.toLowerCase()
                  );
                  const isOutOfStock = inventoryItem ? Number(inventoryItem.pieces_stock) <= 0 : false;
                  const isSelected = selectedMilkteaFlavor === flav;
                  return (
                    <button
                      key={flav}
                      onClick={() => setSelectedMilkteaFlavor(flav)}
                      disabled={isOutOfStock}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                        isOutOfStock
                          ? 'opacity-50 grayscale cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                          : isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {flav}{isOutOfStock ? ' · Out of Stock' : ''}
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
      calculateTotalDeductions={calculateTotalDeductions}
      supabaseClient={supabase}
    />

    {isIceCreamModalOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Enter Ice Cream Amount</h3>
          <div className="relative mb-6">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-slate-500">₱</span>
            <input
              type="number"
              value={iceCreamPriceInput}
              onChange={(e) => setIceCreamPriceInput(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-8 pr-4 font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="0.00"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setIsIceCreamModalOpen(false);
                setIceCreamPriceInput('');
              }}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddCustomIceCream}
              className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-600"
            >
              Add to Order
            </button>
          </div>
        </div>
      </div>
    )}
    
    <style jsx>{`
      @keyframes popUp {
        0% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -150%) scale(1.5);
        }
      }
      .popup-animate {
        animation: popUp 0.8s ease-out forwards;
      }
    `}</style>
    </>
  );
}

export default function POSScreen() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading POS...</div>}>
      <POSScreenContent />
    </Suspense>
  );
}