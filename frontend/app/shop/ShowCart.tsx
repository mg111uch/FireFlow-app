'use client';

import { useCart } from '@/context/CartContext';
import { ordersApi, shopsApi } from '@/lib/api';
import { useState, useEffect } from 'react';

interface ShowCartProps {
  showCart: boolean;
  setShowCart: (show: boolean) => void;
  shopId?: number | null;
}

interface ShopInfo {
  id: number;
  name: string;
}

export default function ShowCart({ showCart, setShowCart, shopId }: ShowCartProps) {
  const { cart, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const [shopNames, setShopNames] = useState<Record<number, string>>({});
  const [loadingShops, setLoadingShops] = useState(false);

  useEffect(() => {
    if (showCart && cart.length > 0) {
      const uniqueShopIds = [...new Set(cart.map(item => Number(item.product.shop_id)))];
      loadShopNames(uniqueShopIds);
    }
  }, [showCart, cart.length]);

  const loadShopNames = async (ids: number[]) => {
    setLoadingShops(true);
    const names: Record<number, string> = {};
    for (const id of ids) {
      try {
        const shop = await shopsApi.getById(id);
        names[id] = shop.name;
      } catch {
        names[id] = `Shop ${id}`;
      }
    }
    setShopNames(names);
    setLoadingShops(false);
  };

  const getCartByShop = () => {
    const grouped: Record<number, typeof cart> = {};
    cart.forEach(item => {
      const shopId = Number(item.product.shop_id);
      if (!grouped[shopId]) grouped[shopId] = [];
      grouped[shopId].push(item);
    });
    return grouped;
  };

  const getShopTotal = (items: typeof cart) => {
    return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;

    const cartByShop = getCartByShop();
    let successCount = 0;
    let failCount = 0;

    for (const [shopIdStr, items] of Object.entries(cartByShop)) {
      const shopId = Number(shopIdStr);
      const shopTotal = getShopTotal(items);
      
      try {
        const orderItems = items.map(item => ({
          product_id: item.product_id,
          product: item.product,
          quantity: item.quantity
        }));
        
        await ordersApi.create({
          shop_id: shopId,
          items: orderItems,
          total: shopTotal
        });
        
        successCount++;
      } catch (err) {
        console.error('Error placing order for shop:', shopId, err);
        failCount++;
      }
    }

    if (successCount > 0) {
      clearCart();
      setShowCart(false);
      if (failCount > 0) {
        alert(`Orders placed for ${successCount} shop(s). ${failCount} failed.`);
      } else {
        alert('Orders placed successfully!');
      }
    } else {
      alert('Failed to place orders');
    }
  };

  const canPlaceOrder = !shopId && cart.length > 0;

  if (!showCart) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-end">
      <div className="w-full sm:max-w-md bg-gray-900 h-full p-4 overflow-y-auto max-w-[85vw]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Your Cart</h2>
          <button onClick={() => setShowCart(false)} className="text-gray-400 text-2xl">&times;</button>
        </div>
        
        {cart.length === 0 ? (
          <p className="text-gray-400">Your cart is empty</p>
        ) : (
          <>
            {Object.entries(getCartByShop()).map(([shopIdStr, items]) => {
              const shopId = Number(shopIdStr);
              return (
                <div key={shopId} className="mb-4 pb-4 border-b border-gray-700">
                  <h3 className="font-semibold text-blue-400 mb-2">
                    {loadingShops ? 'Loading...' : shopNames[shopId] || `Shop ${shopId}`}
                  </h3>
                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item.product_id} className="bg-gray-800 p-3 rounded flex gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold">{item.product.name}</h4>
                          <p className="text-green-400">₹{item.product.price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="bg-gray-700 w-8 h-8 rounded">-</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="bg-gray-700 w-8 h-8 rounded">+</button>
                          <button onClick={() => removeFromCart(item.product_id)} className="text-red-400 ml-2">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-right font-semibold">
                    Subtotal: ₹{getShopTotal(items)}
                  </div>
                </div>
              );
            })}
            <div className="border-t border-gray-700 pt-4">
              <div className="flex justify-between text-xl font-bold mb-4">
                <span>Total:</span>
                <span>₹{cartTotal}</span>
              </div>
              {(shopId || canPlaceOrder) && (
                <button onClick={placeOrder} className="w-full bg-green-600 py-3 rounded text-lg font-semibold hover:bg-green-700">
                  Place Order{!shopId ? 's' : ''}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}