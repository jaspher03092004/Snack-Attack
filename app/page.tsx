'use client';

import React, { useState } from 'react';
import { Store, Delete, PackagePlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type InventoryItem = {
  id: string;
  product_name: string;
  category: string;
  pieces_stock: number;
  inventory_type?: string;
};

export default function EntrancePage() {
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isProductInOpen, setIsProductInOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addBulk, setAddBulk] = useState('0');
  const [addPieces, setAddPieces] = useState('0');
  const [productInTab, setProductInTab] = useState('Main');
  const [productSearch, setProductSearch] = useState('');
  const router = useRouter();

  const getBulkMultiplier = (productName: string) => {
    const name = (productName || '').toLowerCase();
    if (name.includes('cup')) return 100;
    if (name.includes('halo-halo')) return 50;
    if (name.includes('egg') || name.includes('itlog')) return 30;
    if (name.includes('pizza')) return 5;
    if (name.includes('fries')) return 4;
    if (name.includes('hotdog') || name.includes('cheese')) return 12;
    if (name.includes('siomai')) return 60;
    if (name.includes('patty') || name.includes('7up') || name.includes('coke') || name.includes('pepsi') || name.includes('water')) return 24;
    if (name.includes('chips')) return 10;
    return 1;
  };

  const getBulkLabel = (productName: string) => {
    const name = (productName || '').toLowerCase();
    if (name.includes('halo-halo')) return '(1 pack = 50 cups)';
    if (name.includes('hotdog')) return '(1 pack = 12 pcs)';
    if (name.includes('egg') || name.includes('itlog')) return '(1 tray = 30 pcs)';
    if (name.includes('pizza')) return '(1 pack = 5 pcs)';
    if (name.includes('fries')) return '(1kg pack = 4 servings)';
    if (name.includes('siomai')) return '(1 pack = 60 pcs)';
    if (name.includes('7up') || name.includes('coke') || name.includes('pepsi') || name.includes('water')) return '(1 case = 24 pcs)';
    if (name.includes('chips')) return '(1 pack = 10 pcs)';
    return '(Bulk)';
  };

      const openProductInModal = async () => {
    if (!supabase) {
      alert('Supabase client is not configured.');
      return;
    }

    // Products to EXCLUDE from fetching
    const excludedProducts = [
      '7up', 'Coke', 'Ice Cream', 'Itlog/Egg', 'Pepsi', 'Water',
      'Burger Buns', 'Footlong Buns',
    ];

    try {
      // 1. Fetch ALL inventory products (to avoid Supabase .not().in() parsing issues)
      const { data, error } = await supabase
        .from('inventory')
        .select('id, product_name, category, inventory_type, pieces_stock')
        .order('product_name', { ascending: true });

      if (error) {
        console.error('Inventory fetch error details:', JSON.stringify(error, null, 2));
        alert('Failed to load inventory products. Please check the console for more details.');
        return;
      }

      if (!data || data.length === 0) {
        alert('No products found in inventory.');
        return;
      }

      const items = (data ?? []) as InventoryItem[];

      // 2. Perform the EXCLUDE filtering in JavaScript (Client-side)
      const filteredItems = items.filter(item => !excludedProducts.includes(item.product_name));

      if (filteredItems.length === 0) {
        alert('No available products found after filtering.');
        return;
      }

      // 3. Set state with the client-side filtered list
      setInventoryItems(filteredItems);
      setSelectedProductId(filteredItems[0]?.id ?? '');
      setAddBulk('0');
      setAddPieces('0');
      setProductInTab('Main');
      setProductSearch('');
      setIsProductInOpen(true);
      
    } catch (err) {
      console.error('Unexpected error during inventory fetch:', err);
      alert('An unexpected error occurred while connecting to the server.');
    }
  };

  const handleProductInSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!supabase || !selectedProductId) return;

    const selectedItem = inventoryItems.find((item) => item.id === selectedProductId);
    if (!selectedItem) return;

    const addedPiecesFromBulk = Number(addBulk || 0) * getBulkMultiplier(selectedItem.product_name);
    const newTotalPieces = Number(selectedItem.pieces_stock || 0) + addedPiecesFromBulk + Number(addPieces || 0);

    const { error } = await supabase
      .from('inventory')
      .update({ pieces_stock: newTotalPieces })
      .eq('id', selectedProductId);

    if (error) {
      console.error('Product In update error:', error);
      alert('Failed to update stock.');
      return;
    }

    alert('Product stock updated successfully.');
    setIsProductInOpen(false);
    setSelectedProductId('');
    setAddBulk('0');
    setAddPieces('0');
  };

  const selectedProduct = inventoryItems.find((item) => item.id === selectedProductId) ?? null;
  const isSubInventory = selectedProduct?.category?.toLowerCase() !== 'main inventory' && selectedProduct?.category?.toLowerCase() !== 'main';
  const isBun = selectedProduct?.product_name?.toLowerCase().includes('bun');
  const isBulkOnly = isSubInventory && !isBun;
  const filteredInventory = inventoryItems.filter((item) => {
    const normalizedCategory = (item.category || '').toLowerCase();
    const normalizedType = (item.inventory_type || '').toLowerCase();
    const matchesTab = productInTab === 'Main'
      ? normalizedCategory === 'main inventory' || normalizedType === 'main'
      : normalizedCategory !== 'main inventory' && normalizedType !== 'main';

    const matchesSearch = item.product_name.toLowerCase().includes(productSearch.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const handlePinSubmit = async (enteredPin: string) => {
    setErrorMessage('');

    if (!supabase) {
      setErrorMessage('Authentication service is unavailable.');
      return;
    }

    const { data, error } = await supabase
      .from('staff')
      .select('id, name')
      .eq('pin_code', enteredPin)
      .limit(1)
      .single();

    if (error || !data) {
      setErrorMessage('Invalid PIN');
      setPin('');
      return;
    }

    localStorage.setItem('activeCashier', data.name);
    localStorage.setItem('activeCashierId', data.id);
    router.push('/start-order');
  };

  const handleKeyPress = (digit: string) => {
    setErrorMessage('');

    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);

      if (newPin.length === 4) {
        void handlePinSubmit(newPin);
      }
    }
  };

  // Handle backspace/delete
  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-white text-slate-900 font-sans selection:bg-none">
      
      {/* Top Right Actions */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 flex items-center gap-2">
        <button
          onClick={() => {
            void openProductInModal();
          }}
          className="flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md focus:outline-none"
          aria-label="Product In"
        >
          <PackagePlus className="w-4 h-4" />
          <span className="uppercase tracking-wide">Product In</span>
        </button>
        <button 
          onClick={() => router.push('/admin')}
          className="flex flex-col items-center justify-center w-[72px] bg-slate-100 hover:bg-slate-200 rounded-xl py-3 px-4 transition-colors focus:outline-none border-none cursor-pointer"
          aria-label="Admin Access"
        >
          <Store className="w-6 h-6 text-emerald-500 mb-1 stroke-[2px]" />
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Admin</span>
        </button>
      </div>

      {/* Main Content Container */}
      <div className="flex flex-col items-center w-full max-w-[400px] pt-16 md:pt-0">
        
        {/* Header Typography */}
        <div className="text-center mb-8">
          <h1 className="text-[32px] font-bold tracking-tight text-slate-900 mb-1">
            Enter PIN
          </h1>
          <p className="text-[16px] text-slate-500 m-0">
            Snack Attack Terminal 01
          </p>
        </div>

        {/* PIN Entry Display (4 circles) */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="flex justify-center gap-4 mb-8 md:mb-12" aria-live="polite">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i} 
                className={`h-4 w-4 md:h-5 md:w-5 rounded-full transition-all duration-100 border-2 ${
                  i < pin.length 
                    ? 'bg-slate-400 border-slate-400' 
                    : 'bg-transparent border-slate-200'
                }`} 
              />
            ))}
          </div>
          {errorMessage && <p className="text-sm text-rose-600">{errorMessage}</p>}
        </div>

        {/* Numeric Keypad Grid */}
        <div className="grid grid-cols-3 max-w-xs md:max-w-md mx-auto gap-3 md:gap-6 mb-8">
          {/* Numbers 1-9 */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="h-16 w-16 text-2xl md:h-24 md:w-24 md:text-4xl bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center font-semibold text-slate-900 transition-colors active:bg-slate-300 focus:outline-none select-none border-none cursor-pointer"
              aria-label={`Digit ${num}`}
            >
              {num}
            </button>
          ))}
          
          {/* Empty bottom left cell */}
          <div className="h-16 w-16 md:h-24 md:w-24"></div>

          {/* 0 Button */}
          <button
            onClick={() => handleKeyPress('0')}
            className="h-16 w-16 text-2xl md:h-24 md:w-24 md:text-4xl bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center font-semibold text-slate-900 transition-colors active:bg-slate-300 focus:outline-none select-none border-none cursor-pointer"
            aria-label="Digit 0"
          >
            0
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="h-16 w-16 md:h-24 md:w-24 bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center transition-colors active:bg-slate-300 focus:outline-none border-none cursor-pointer select-none"
            aria-label="Delete last digit"
          >
            <Delete className="w-8 h-8 text-slate-900 stroke-[2px] pointer-events-none fill-transparent" />
          </button>
        </div>

        {/* Clock-in Toggle container */}
        <div 
          className="flex items-center justify-between w-full max-w-xs mx-auto mt-8 px-2" 
        >
          <span className="text-[18px] font-medium text-slate-900 select-none cursor-default">
            Clock-in for shift
          </span>
          <div 
            onClick={() => setIsClockingIn(!isClockingIn)}
            role="switch"
            aria-checked={isClockingIn}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsClockingIn(!isClockingIn);
              }
            }}
            className={`relative w-14 h-8 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
              isClockingIn ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
          >
            <div 
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
                isClockingIn ? 'translate-x-6' : 'translate-x-0'
              }`} 
            />
          </div>
        </div>
        
      </div>

      {isProductInOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Product In</h2>
                <p className="mt-1 text-sm text-slate-500">Select a product and add stock.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsProductInOpen(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProductInSubmit} className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700">Product</label>
                <div className="mt-1.5 space-y-3">
                  <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setProductInTab('Main')}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${(
                        productInTab === 'Main'
                          ? 'bg-slate-900 text-white'
                          : 'bg-transparent text-slate-600 hover:bg-slate-200'
                      )}`}
                    >
                      Main Inventory
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductInTab('Sub')}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${(
                        productInTab === 'Sub'
                          ? 'bg-slate-900 text-white'
                          : 'bg-transparent text-slate-600 hover:bg-slate-200'
                      )}`}
                    >
                      Sub Inventory
                    </button>
                  </div>

                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search product..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                  />

                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                    {filteredInventory.length > 0 ? (
                      filteredInventory.map((item) => {
                        const isSelected = selectedProductId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedProductId(item.id);
                              setAddBulk('0');
                              setAddPieces('0');
                            }}
                            className={`mb-2 w-full rounded-lg border px-3 py-2 text-left transition last:mb-0 ${(
                              isSelected
                                ? 'border-emerald-400 bg-emerald-50'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            )}`}
                          >
                            <p className="text-sm font-semibold text-slate-900">{item.product_name}</p>
                            <p className="text-xs text-slate-500">Current: {Number(item.pieces_stock || 0)} pcs</p>
                          </button>
                        );
                      })
                    ) : (
                      <p className="px-2 py-3 text-sm text-slate-500">No matching products found.</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Add Bulk {getBulkLabel(selectedProduct?.product_name || '')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={addBulk}
                  onChange={(e) => setAddBulk(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {!isBulkOnly && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">Add Pieces</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={addPieces}
                    onChange={(e) => setAddPieces(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProductInOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 focus:ring-4 focus:ring-slate-200"
                >
                  Save Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}