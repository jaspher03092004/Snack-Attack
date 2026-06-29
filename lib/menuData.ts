export type MenuCategory =
  | "Milktea Series"
  | "Milk Shakes"
  | "Burgers & Sandwiches"
  | "Pizza"
  | "Sides & Others"
  | "Siomai"
  | "Combos";

export interface MenuSizeOption {
  label: string;
  price: number;
}

export interface MenuAddOn {
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  basePrice: number;
  sizes?: MenuSizeOption[];
  addOns?: MenuAddOn[];
  description?: string;
  comboItems?: string[];
  image?: string;
}

export interface ComboMenuItem extends MenuItem {
  comboItems: string[];
  description: string;
  requiresShakeFlavor: boolean;
  hasBurgerAddons: boolean;
  requiresSiomaiChoice: boolean;
  requiresMilkteaFlavor: boolean;
}

const RAW_MENU_ITEMS = [
  {
    id: "milktea-matcha",
    name: "Matcha Milktea",
    category: "Milktea Series",
    basePrice: 39,
    sizes: [
      { label: "M 16oz", price: 39 },
      { label: "L 22oz", price: 55 },
    ],
    addOns: [
      { name: "Nata", price: 15 },
      { name: "Pearl", price: 15 },
    ],
  },
  {
    id: "milktea-chocolate",
    name: "Chocolate Milktea",
    category: "Milktea Series",
    basePrice: 39,
    sizes: [
      { label: "M 16oz", price: 39 },
      { label: "L 22oz", price: 55 },
    ],
    addOns: [
      { name: "Nata", price: 15 },
      { name: "Pearl", price: 15 },
    ],
  },
  {
    id: "milktea-red-velvet",
    name: "Red Velvet Milktea",
    category: "Milktea Series",
    basePrice: 39,
    sizes: [
      { label: "M 16oz", price: 39 },
      { label: "L 22oz", price: 55 },
    ],
    addOns: [
      { name: "Nata", price: 15 },
      { name: "Pearl", price: 15 },
    ],
  },
  {
    id: "milktea-salted-caramel",
    name: "Salted Caramel Milktea",
    category: "Milktea Series",
    basePrice: 39,
    sizes: [
      { label: "M 16oz", price: 39 },
      { label: "L 22oz", price: 55 },
    ],
    addOns: [
      { name: "Nata", price: 15 },
      { name: "Pearl", price: 15 },
    ],
  },
  {
    id: "milktea-rocky-road",
    name: "Rocky Road Milktea",
    category: "Milktea Series",
    basePrice: 39,
    sizes: [
      { label: "M 16oz", price: 39 },
      { label: "L 22oz", price: 55 },
    ],
    addOns: [
      { name: "Nata", price: 15 },
      { name: "Pearl", price: 15 },
    ],
  },
  {
    id: "milktea-cookies-and-cream",
    name: "Cookies and Cream Milktea",
    category: "Milktea Series",
    basePrice: 39,
    sizes: [
      { label: "M 16oz", price: 39 },
      { label: "L 22oz", price: 55 },
    ],
    addOns: [
      { name: "Nata", price: 15 },
      { name: "Pearl", price: 15 },
    ],
  },
  {
    id: "milkshake-cookies-and-cream",
    name: "Cookies and Cream Milk Shake",
    category: "Milk Shakes",
    basePrice: 39,
    sizes: [{ label: "16oz", price: 39 }],
    addOns: [
      { name: "Fruit Jelly", price: 5 },
      { name: "Popping Boba", price: 5 },
      { name: "Black Pearl", price: 5 },
    ],
  },
  {
    id: "milkshake-choco-kisses",
    name: "Choco Kisses Milk Shake",
    category: "Milk Shakes",
    basePrice: 39,
    sizes: [{ label: "16oz", price: 39 }],
    addOns: [
      { name: "Fruit Jelly", price: 5 },
      { name: "Popping Boba", price: 5 },
      { name: "Black Pearl", price: 5 },
    ],
  },
  {
    id: "milkshake-mango",
    name: "Mango Milk Shake",
    category: "Milk Shakes",
    basePrice: 39,
    sizes: [{ label: "16oz", price: 39 }],
    addOns: [
      { name: "Fruit Jelly", price: 5 },
      { name: "Popping Boba", price: 5 },
      { name: "Black Pearl", price: 5 },
    ],
  },
  {
    id: "milkshake-ube-macapuno",
    name: "Ube Macapuno Milk Shake",
    category: "Milk Shakes",
    basePrice: 39,
    sizes: [{ label: "16oz", price: 39 }],
    addOns: [
      { name: "Fruit Jelly", price: 5 },
      { name: "Popping Boba", price: 5 },
      { name: "Black Pearl", price: 5 },
    ],
  },
  {
    id: "milkshake-avocado",
    name: "Avocado Milk Shake",
    category: "Milk Shakes",
    basePrice: 39,
    sizes: [{ label: "16oz", price: 39 }],
    addOns: [
      { name: "Fruit Jelly", price: 5 },
      { name: "Popping Boba", price: 5 },
      { name: "Black Pearl", price: 5 },
    ],
  },
  {
    id: "milkshake-strawberry",
    name: "Straw Berry Milk Shake",
    category: "Milk Shakes",
    basePrice: 39,
    sizes: [{ label: "16oz", price: 39 }],
    addOns: [
      { name: "Fruit Jelly", price: 5 },
      { name: "Popping Boba", price: 5 },
      { name: "Black Pearl", price: 5 },
    ],
  },
  {
    id: "milkshake-buco-pandan",
    name: "Buco Pandan Milk Shake",
    category: "Milk Shakes",
    basePrice: 39,
    sizes: [{ label: "16oz", price: 39 }],
    addOns: [
      { name: "Fruit Jelly", price: 5 },
      { name: "Popping Boba", price: 5 },
      { name: "Black Pearl", price: 5 },
    ],
  },
  {
    id: "milkshake-melon",
    name: "Melon Milk Shake",
    category: "Milk Shakes",
    basePrice: 39,
    sizes: [{ label: "16oz", price: 39 }],
    addOns: [
      { name: "Fruit Jelly", price: 5 },
      { name: "Popping Boba", price: 5 },
      { name: "Black Pearl", price: 5 },
    ],
  },
  {
    id: "burger-plain",
    name: "Plain Burger",
    category: "Burgers & Sandwiches",
    basePrice: 25,
  },
  {
    id: "burger-egg",
    name: "Egg Burger",
    category: "Burgers & Sandwiches",
    basePrice: 35,
  },
  {
    id: "burger-cheese",
    name: "Cheese Burger",
    category: "Burgers & Sandwiches",
    basePrice: 35,
  },
  {
    id: "burger-egg-cheese",
    name: "Egg & Cheese Burger",
    category: "Burgers & Sandwiches",
    basePrice: 45,
  },
  {
    id: "burger-overload",
    name: "Overload Burger",
    category: "Burgers & Sandwiches",
    basePrice: 65,
  },
  {
    id: "sandwich-footlong",
    name: "Footlong Sandwich",
    category: "Burgers & Sandwiches",
    basePrice: 40,
  },
  {
    id: "pizza-hawaiian",
    name: "Hawaiian Pizza",
    category: "Pizza",
    basePrice: 130,
    description: "11 inches",
  },
  {
    id: "pizza-pepperoni",
    name: "Pepperoni Pizza",
    category: "Pizza",
    basePrice: 140,
    description: "11 inches",
  },
  {
    id: "pizza-beef-mushroom",
    name: "Beef Mushroom Pizza",
    category: "Pizza",
    basePrice: 150,
    description: "11 inches",
  },
  {
    id: "pizza-overload",
    name: "Overload Pizza",
    category: "Pizza",
    basePrice: 165,
    description: "11 inches",
  },
  {
    id: "fries-cheese-regular",
    name: "Frenchy Fries w/ Cheese",
    category: "Sides & Others",
    basePrice: 35,
    sizes: [
      { label: "Regular", price: 35 },
      { label: "Large", price: 60 },
    ],
  },
  {
    id: "nachos",
    name: "Nachos",
    category: "Sides & Others",
    basePrice: 110,
  },
  {
    id: "halo-halo-regular",
    name: "Halo-Halo",
    category: "Sides & Others",
    basePrice: 75,
    sizes: [
      { label: "Regular 12oz", price: 75 },
      { label: "Overload Especial", price: 95 },
    ],
  },
  {
    id: "siomai-chicken",
    name: "Chicken Siomai",
    category: "Siomai",
    basePrice: 5,
    description: "₱5 each",
  },
  {
    id: "siomai-beef",
    name: "Beef Siomai",
    category: "Siomai",
    basePrice: 5,
    description: "₱5 each",
  },
  {
    id: "siomai-japanese",
    name: "Japanese Siomai",
    category: "Siomai",
    basePrice: 25,
    description: "4 pcs",
  },
  {
    id: "combo-attack-1",
    name: "Attack 1",
    category: "Combos",
    basePrice: 114,
    comboItems: ["Footlong Sandwich", "Milk Shake (16oz)", "French Fries"],
    description: "Footlong Sandwich, Milk Shake (16 oz), French Fries",
    requiresShakeFlavor: true,
    hasBurgerAddons: false,
    requiresSiomaiChoice: false,
    requiresMilkteaFlavor: false,
  },
  {
    id: "combo-attack-2",
    name: "Attack 2",
    category: "Combos",
    basePrice: 150,
    comboItems: ["Regular Halo-Halo (22oz)", "Footlong Sandwich", "French Fries"],
    description: "Regular Halo-Halo (22 oz), Footlong Sandwich, French Fries",
    requiresShakeFlavor: false,
    hasBurgerAddons: false,
    requiresSiomaiChoice: false,
    requiresMilkteaFlavor: false,
  },
  {
    id: "combo-attack-3",
    name: "Attack 3",
    category: "Combos",
    basePrice: 79,
    comboItems: ["Footlong Sandwich", "Milk Shake (16oz)"],
    description: "Footlong Sandwich, Milk Shake (16 oz)",
    requiresShakeFlavor: true,
    hasBurgerAddons: false,
    requiresSiomaiChoice: false,
    requiresMilkteaFlavor: false,
  },
  {
    id: "combo-attack-4",
    name: "Attack 4",
    category: "Combos",
    basePrice: 104,
    comboItems: ["Plain Burger", "Milk Shake (16oz)", "French Fries"],
    description: "Plain Burger, Milk Shake (16 oz), French Fries",
    requiresShakeFlavor: true,
    hasBurgerAddons: true,
    requiresSiomaiChoice: false,
    requiresMilkteaFlavor: false,
  },
  {
    id: "combo-attack-5",
    name: "Attack 5",
    category: "Combos",
    basePrice: 74,
    comboItems: ["French Fries", "Milk Shake (16oz)"],
    description: "French Fries, Milk Shake (16 oz)",
    requiresShakeFlavor: true,
    hasBurgerAddons: false,
    requiresSiomaiChoice: false,
    requiresMilkteaFlavor: false,
  },
  {
    id: "combo-attack-6",
    name: "Attack 6",
    category: "Combos",
    basePrice: 69,
    comboItems: ["Siomai (Beef/Chicken 4pcs OR Japanese 3pcs)", "Milk Shake (16oz)"],
    description: "Siomai, Milk Shake (16 oz)",
    requiresShakeFlavor: true,
    hasBurgerAddons: false,
    requiresSiomaiChoice: true,
    requiresMilkteaFlavor: false,
  },
  {
    id: "combo-tea-1",
    name: "Tea 1",
    category: "Combos",
    basePrice: 104,
    comboItems: ["Milktea Medium", "Plain Burger", "Regular Fries"],
    description: "Milktea Medium, Plain Burger, Regular Fries",
    requiresShakeFlavor: false,
    hasBurgerAddons: true,
    requiresSiomaiChoice: false,
    requiresMilkteaFlavor: true,
  },
  {
    id: "combo-tea-2",
    name: "Tea 2",
    category: "Combos",
    basePrice: 114,
    comboItems: ["Milktea Medium", "Footlong Sandwich", "Regular Fries"],
    description: "Milktea Medium, Footlong Sandwich, Regular Fries",
    requiresShakeFlavor: false,
    hasBurgerAddons: false,
    requiresSiomaiChoice: false,
    requiresMilkteaFlavor: true,
  },
  {
    id: "combo-tea-3",
    name: "Tea 3",
    category: "Combos",
    basePrice: 74,
    comboItems: ["Milktea Medium", "Regular Fries"],
    description: "Milktea Medium, Regular Fries",
    requiresShakeFlavor: false,
    hasBurgerAddons: false,
    requiresSiomaiChoice: false,
    requiresMilkteaFlavor: true,
  },
];

export const menuItems: (MenuItem | ComboMenuItem)[] = RAW_MENU_ITEMS.map((item) => ({
  ...item,
  image: `/images/menu/${item.id}.webp`,
}));
