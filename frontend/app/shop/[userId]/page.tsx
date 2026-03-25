'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Product, CartItem } from '@/lib/types';
import { useCart } from '@/context/CartContext';

const PRODUCTS_KEY = 'shop_products';
const ORDERS_KEY = 'shop_orders';

export default function PublicShopPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { cart, addToCart, updateQuantity, removeFromCart, cartTotal, cartCount } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [shopName, setShopName] = useState('Shop');
  const [showCart, setShowCart] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const allProducts = localStorage.getItem(PRODUCTS_KEY);
    if (allProducts) {
      const parsed = JSON.parse(allProducts);
      setProducts(parsed);
      const catsArray = parsed.map((p: Product) => p.category).filter((c: unknown) => c) as string[];
      const uniqueCats = Array.from(new Set(catsArray));
      setCategories(uniqueCats);
    }
    
    const shopData = localStorage.getItem('user_shop');
    if (shopData) {
      const shop = JSON.parse(shopData);
      setShopName(shop.name || 'My Shop');
    }
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !category || p.category === category;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    alert(`${product.name} added to cart!`);
  };

  const placeOrder = () => {
    if (cart.length === 0) return;
    
    const order = {
      id: Date.now().toString(),
      shop_id: '1',
      customer_id: 1,
      customer_username: 'customer',
      items: cart,
      total: cartTotal,
      status: 'pending' as const,
      created_at: new Date().toISOString()
    };
    
    const existingOrders = localStorage.getItem(ORDERS_KEY);
    const orders = existingOrders ? JSON.parse(existingOrders) : [];
    orders.push(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    
    alert('Order placed successfully!');
    setShowCart(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 overflow-x-hidden">
      <header className="bg-gray-900 p-2 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold truncate">{shopName}</h1>
          <button onClick={() => setShowCart(true)} className="relative bg-blue-600 px-3 py-2 rounded text-sm">
            🛒 Cart ({cartCount})
          </button>
        </div>
      </header>

      <div className="container mx-auto p-2">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 p-3 rounded bg-gray-800 border border-gray-700 w-full sm:w-auto" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="p-3 rounded bg-gray-800 border border-gray-700 w-full sm:w-auto min-w-[140px]">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-gray-900 rounded-lg overflow-hidden hover:shadow-lg transition">
              {product.image_url && <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover" />}
              <div className="p-4">
                <h3 className="font-semibold text-lg">{product.name}</h3>
                {product.category && <span className="text-xs bg-gray-700 px-2 py-1 rounded">{product.category}</span>}
                <p className="text-gray-400 text-sm mt-2">{product.description}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-green-400 font-bold text-xl">₹{product.price}</span>
                  <span className="text-gray-500 text-sm">Stock: {product.stock}</span>
                </div>
                <button onClick={() => handleAddToCart(product)} disabled={product.stock === 0} className="w-full mt-3 bg-blue-600 py-2 rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed">
                  {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && <p className="text-center text-gray-400 mt-10">No products found</p>}
      </div>

      {showCart && (
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
                <div className="space-y-4 mb-4">
                  {cart.map(item => (
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
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex justify-between text-xl font-bold mb-4">
                    <span>Total:</span>
                    <span>₹{cartTotal}</span>
                  </div>
                  <button onClick={placeOrder} className="w-full bg-green-600 py-3 rounded text-lg font-semibold hover:bg-green-700">
                    Place Order
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
