'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shop, Product, Order } from '@/lib/types';
import { shopsApi, productsApi, ordersApi } from '@/lib/api';

interface UseShopReturn {
  shop: Shop | null;
  products: Product[];
  orders: Order[];
  allShops: Shop[];
  allProducts: Product[];
  loading: boolean;
  error: string | null;
  loadData: () => Promise<void>;
  createShop: (name: string, description: string) => Promise<void>;
  saveProduct: (form: ProductForm) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  updateStatus: (id: string, status: string) => Promise<boolean>;
  resetStatus: (id: string) => Promise<boolean>;
}

export interface ProductForm {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url: string;
}

export function useShop(currentUser: any): UseShopReturn {
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const shops = await shopsApi.getAll();
      setAllShops(shops);

      const productsPromises = shops.map((s: Shop) => productsApi.getByShop(Number(s.id)));
      const productsResults = await Promise.all(productsPromises);
      const combinedProducts = productsResults.flat();
      setAllProducts(combinedProducts);

      if (currentUser) {
        try {
          const myShop = await shopsApi.getByOwner(currentUser.id);
          setShop(myShop);
          const shopProducts = await productsApi.getByShop(myShop.id);
          setProducts(shopProducts);
          const shopOrders = await ordersApi.getByShop(myShop.id);
          setOrders(shopOrders);
        } catch (err) {
          setShop(null);
        }
      }
    } catch (err) {
      setError('Error loading shop data');
      console.error('Error loading shops:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const createShop = useCallback(async (name: string, description: string) => {
    try {
      const newShop = await shopsApi.create({ name, description });
      setShop(newShop);
      setAllShops((prev) => [...prev, newShop]);
    } catch (err) {
      alert('Failed to create shop');
      console.error('Error creating shop:', err);
    }
  }, []);

  const saveProduct = useCallback(async (form: ProductForm): Promise<boolean> => {
    if (!form.name) {
      alert('Please enter a product name');
      return false;
    }
    if (!form.price || form.price <= 0) {
      alert('Please enter a valid unit price');
      return false;
    }
    if (!form.stock || form.stock <= 0) {
      alert('Please enter a valid quantity');
      return false;
    }
    if (!shop) return false;

    try {
      const newProduct = await productsApi.create({ shop_id: Number(shop.id), ...form });
      setProducts([...products, newProduct]);
      return true;
    } catch (err) {
      alert('Failed to save product');
      console.error('Error saving product:', err);
      return false;
    }
  }, [shop, products]);

  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    try {
      await productsApi.delete(Number(id));
      setProducts(products.filter(p => p.id !== id));
      return true;
    } catch (err) {
      alert('Failed to delete product');
      console.error('Error deleting product:', err);
      return false;
    }
  }, [products]);

  const updateStatus = useCallback(async (id: string, status: string): Promise<boolean> => {
    try {
      const updated = await ordersApi.updateStatus(Number(id), status);
      setOrders(orders.map(o => String(o.id) === id ? { ...o, status: updated.status } : o));
      return true;
    } catch (err) {
      alert('Failed to update order');
      console.error('Error updating order:', err);
      return false;
    }
  }, [orders]);

  const resetStatus = useCallback(async (id: string): Promise<boolean> => {
    try {
      const updated = await ordersApi.resetStatus(Number(id));
      setOrders(orders.map(o => String(o.id) === id ? { ...o, status: updated.status } : o));
      return true;
    } catch (err) {
      alert('Failed to reset order');
      console.error('Error resetting order:', err);
      return false;
    }
  }, [orders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    shop,
    products,
    orders,
    allShops,
    allProducts,
    loading,
    error,
    loadData,
    createShop,
    saveProduct,
    deleteProduct,
    updateStatus,
    resetStatus,
  };
}