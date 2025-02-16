"use client"

import { create } from 'zustand';

interface Location {
  column: string;
  position: string;
  level: string;
  cases: number;
}

export interface Product {
  code: string;
  name: string;
  quantityPerCase: number;
  totalCases: number;
  totalQuantity: number;
  locations: Location[];
  minimumStock: number;
}

interface InventoryHistory {
  id: string;
  timestamp: Date;
  productCode: string;
  type: 'inbound' | 'outbound' | 'move';
  cases: number;
  quantity: number;
  fromLocation?: Location;
  toLocation?: Location;
}

interface ShelfConfig {
  positions: number;
  levels: number;
}

interface ProductStore {
  products: Product[];
  history: InventoryHistory[];
  shelfConfigs: Record<string, ShelfConfig>;
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (code: string, product: Partial<Product>) => void;
  deleteProduct: (code: string) => void;
  addHistory: (data: Omit<InventoryHistory, 'id' | 'timestamp'>) => void;
  setShelfConfig: (column: string, config: ShelfConfig) => void;
  deleteShelfConfig: (column: string) => void;
}

export const useProductStore = create<ProductStore>((set) => ({
  products: [
    {
      code: "PRD001",
      name: "プレミアムコーヒー豆",
      quantityPerCase: 24,
      totalCases: 50,
      totalQuantity: 1200,
      locations: [
        { column: 'A', position: '1', level: '1', cases: 24 },
        { column: 'B', position: '3', level: '2', cases: 26 }
      ],
      minimumStock: 800,
    },
    {
      code: "PRD002",
      name: "オーガニック紅茶",
      quantityPerCase: 36,
      totalCases: 30,
      totalQuantity: 1080,
      locations: [
        { column: 'A', position: '1', level: '1', cases: 12 },
        { column: 'C', position: '5', level: '3', cases: 18 }
      ],
      minimumStock: 720,
    },
    {
      code: "PRD003",
      name: "抹茶パウダー",
      quantityPerCase: 20,
      totalCases: 25,
      totalQuantity: 500,
      locations: [
        { column: 'A', position: '1', level: '2', cases: 18 },
        { column: 'D', position: '2', level: '1', cases: 7 }
      ],
      minimumStock: 400,
    }
  ],
  history: [],
  // 初期の棚設定
  shelfConfigs: {
    'A': { positions: 15, levels: 3 },
    'B': { positions: 12, levels: 4 },
    'C': { positions: 10, levels: 3 },
    'D': { positions: 15, levels: 3 },
    'E': { positions: 8, levels: 2 },
    'F': { positions: 15, levels: 3 },
    'G': { positions: 15, levels: 3 },
    'H': { positions: 15, levels: 3 },
    'I': { positions: 15, levels: 3 },
    'J': { positions: 15, levels: 3 },
    'K': { positions: 15, levels: 3 },
  },
  setProducts: (products) => set({ products }),
  addProduct: (product) => set((state) => ({
    products: [...state.products, product]
  })),
  updateProduct: (code, updates) => set((state) => ({
    products: state.products.map((p) =>
      p.code === code ? { ...p, ...updates } : p
    )
  })),
  deleteProduct: (code) => set((state) => ({
    products: state.products.filter((p) => p.code !== code)
  })),
  addHistory: (data) => set((state) => ({
    history: [
      {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        ...data
      },
      ...state.history
    ]
  })),
  setShelfConfig: (column, config) => set((state) => ({
    shelfConfigs: {
      ...state.shelfConfigs,
      [column]: config
    }
  })),
  deleteShelfConfig: (column) => set((state) => {
    const newConfigs = { ...state.shelfConfigs };
    delete newConfigs[column];
    return { shelfConfigs: newConfigs };
  })
}));