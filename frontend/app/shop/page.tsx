'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Shop, Product, Order } from '@/lib/types';
import Tabs from '@/components/ui/Tabs';
import { shopsApi, productsApi, ordersApi } from '@/lib/api';
import ProductCard from './ProductCard';
import ShowCart from './ShowCart';

export default function ShopPage() {
  const { currentUser } = useAuth();
  const { cartCount } = useCart();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [outerTab, setOuterTab] = useState<string>('all-products');
  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);

  const shopTabs = [
    { label: 'Dashboard', value: 'dashboard' },
    { label: `Products (${products.length})`, value: 'products' },
    { label: `Orders (${orders.length})`, value: 'orders' },
  ];

  const outerTabs = [
    { label: 'All products', value: 'all-products' },
    { label: 'Shops list', value: 'shops-list' },
    { label: 'My shop', value: 'my-shop' },
  ];

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      const shops = await shopsApi.getAll();
      setAllShops(shops);

      // Fetch products from all shops
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
      console.error('Error loading shops:', err);
    } finally {
      setLoading(false);
    }
  };

  const createShop = async (name: string, description: string) => {
    try {
      const newShop = await shopsApi.create({ name, description });
      setShop(newShop);
      setAllShops([...allShops, newShop]);
      setOuterTab('my-shop');
    } catch (err) {
      console.error('Error creating shop:', err);
      alert('Failed to create shop');
    }
  };

  const saveProduct = async () => {
    if (!form.name) {
      alert('Please enter a product name');
      return;
    }
    if (!form.price || form.price <= 0) {
      alert('Please enter a valid unit price');
      return;
    }
    if (!form.stock || form.stock <= 0) {
      alert('Please enter a valid quantity');
      return;
    }
    if (!shop) return;
    try {
      if (editingId) {
        const updated = await productsApi.update(Number(editingId), form);
        setProducts(products.map(p => p.id === editingId ? { ...p, ...updated } : p));
        setEditingId(null);
      } else {
        const newProduct = await productsApi.create({ shop_id: Number(shop.id), ...form });
        setProducts([...products, newProduct]);
      }
      setForm({ name: '', description: '', price: 0, stock: 0, category: '', image_url: '' });
      setShowForm(false);
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Failed to save product');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await productsApi.delete(Number(id));
      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Failed to delete product');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const updated = await ordersApi.updateStatus(Number(id), status);
      setOrders(orders.map(o => o.id === id ? { ...o, status: updated.status } : o));
    } catch (err) {
      console.error('Error updating order:', err);
      alert('Failed to update order');
    }
  };

  function ShopHeaderCard({ shop }: { shop: Shop }) {
    return (
      <div className="bg-gray-900 p-2 rounded-lg mb-1 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{shop.name}</h2>
          <p className="text-gray-400">{shop.description}</p>
        </div>
        <Link href={`/shop/${shop.owner_id}`} className="bg-blue-600 px-4 py-2 rounded text-white">
          View Shop
        </Link>
      </div>
    );
  }

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', price: 0, stock: 10, category: '', image_url: '' });

  const editProduct = (p: Product) => {
    setForm({ name: p.name, description: p.description || '', price: p.price, stock: p.stock, category: p.category || '', image_url: p.image_url || '' });
    setEditingId(p.id);
    setShowForm(true);
  };

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-2">
      <header className="bg-gray-900 p-2 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-start">
          <h2 className="text-xm text-gray-400 flex-1 pr-2">Create and manage your custom store with products.</h2>
          <button onClick={() => setShowCart(true)} className="bg-blue-600 px-3 py-2 rounded text-sm">🛒 Cart ({cartCount})</button>
        </div>
      </header>
      
      <Tabs
        tabs={outerTabs}
        activeTab={outerTab}
        onChange={(value) => setOuterTab(value)}
      />

      {outerTab === 'all-products' ? (
        <div className="mt-2">
          {allProducts.length === 0 ? (
            <p className="text-gray-400">No products available yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
              {allProducts.map((p) => (
                <ProductCard key={p.id} product={p} showAddToCart={true} showViewShop={true} />
              ))}
            </div>
          )}
        </div>
      ) : outerTab === 'shops-list' ? (
        <div className="mt-2">
          {allShops.length === 0 ? (
            <p className="text-gray-400">No shops available yet.</p>
          ) : (
            <div className="space-y-3">
              {allShops.map((s) => (
                <ShopHeaderCard key={s.id} shop={s} />
              ))}
            </div>
          )}
        </div>
      ) : (
        !shop ? (
          <CreateShopForm onCreate={createShop} />
        ) : (
          <>
            <Tabs
              tabs={shopTabs}
              activeTab={activeTab}
              onChange={(value) => setActiveTab(value)}
            />

            {activeTab === 'dashboard' && <Dashboard products={products} orders={orders} shop={shop} />}
            {activeTab === 'products' && (
              <ProductsTab 
                products={products} 
                showForm={showForm}
                editingId={editingId}
                form={form}
                setShowForm={setShowForm}
                setEditingId={setEditingId}
                setForm={setForm}
                saveProduct={saveProduct}
                deleteProduct={deleteProduct}
                editProduct={editProduct}
              />
            )}
            {activeTab === 'orders' && <OrdersTab orders={orders} updateStatus={updateStatus} />}
          </>
        )
      )}

      <ShowCart showCart={showCart} setShowCart={setShowCart} />
    </div>
  );
}

function CreateShopForm({ onCreate }: { onCreate: (name: string, desc: string) => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  return (
    <div className="bg-gray-900 p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Create Your Shop</h2>
      <div className="mb-4">
        <label className="block text-gray-300 mb-2">Shop Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700" placeholder="My Awesome Store" />
      </div>
      <div className="mb-4">
        <label className="block text-gray-300 mb-2">Description</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700" rows={3} placeholder="Tell customers about your shop..." />
      </div>
      <button onClick={() => name && onCreate(name, desc)} className="bg-blue-600 px-6 py-2 rounded text-white">Create Shop</button>
    </div>
  );
}

function Dashboard({ products, orders, shop }: { products: Product[]; orders: Order[]; shop?: Shop | null }) {
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  
  return (
    <div>
      {shop && (
        <div className="bg-gray-900 p-2 rounded-lg mb-2 mt-2 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">{shop.name}</h2>
            <p className="text-gray-400">{shop.description}</p>
          </div>
          <Link href={`/shop/${shop.owner_id}`} className="bg-blue-600 px-4 py-2 rounded text-white">
            View Shop
          </Link>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
        <div className="bg-gray-900 p-4 rounded-lg">
          <h3 className="text-gray-400">Total Products</h3>
          <p className="text-2xl font-bold">{products.length}</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg">
          <h3 className="text-gray-400">Total Orders</h3>
          <p className="text-2xl font-bold">{orders.length}</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg">
          <h3 className="text-gray-400">Total Revenue</h3>
          <p className="text-2xl font-bold">₹{totalRevenue}</p>
        </div>
      </div>
    </div>
  );
}

function ProductsTab({ products, showForm, editingId, form, setShowForm, setEditingId, setForm, saveProduct, deleteProduct, editProduct }: { 
  products: Product[]; 
  showForm: boolean;
  editingId: string | null;
  form: { name: string; description: string; price: number; stock: number; category: string; image_url: string };
  setShowForm: (v: boolean) => void;
  setEditingId: (v: string | null) => void;
  setForm: (f: any) => void;
  saveProduct: () => void;
  deleteProduct: (id: string) => void;
  editProduct: (p: Product) => void;
}) {
  return (
    <div>
      <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: '', description: '', price: 0, stock: 0, category: '', image_url: '' }); }} className="bg-blue-600 px-4 py-2 rounded text-white mb-1 ">
        {showForm ? 'Cancel' : '+ Add Product'}
      </button>
      
      {showForm && (
        <div className="bg-gray-800 p-4 rounded-lg mb-4">
          <h3 className="font-semibold mb-3">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Product Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="p-2 rounded bg-gray-700 border border-gray-600" />
            <input type="number" placeholder="Unit Price" value={form.price || ''} onChange={e => setForm({...form, price: Number(e.target.value)})} className="p-2 rounded bg-gray-700 border border-gray-600" />
            <input type="number" placeholder="Quantity" value={form.stock || ''} onChange={e => setForm({...form, stock: Number(e.target.value)})} className="p-2 rounded bg-gray-700 border border-gray-600" />
            <input placeholder="Category" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="p-2 rounded bg-gray-700 border border-gray-600" />
          </div>
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-2 rounded bg-gray-700 border border-gray-600 mt-3" rows={2} />
          <button onClick={saveProduct} className="bg-green-600 px-4 py-2 rounded text-white mt-3">{editingId ? 'Update' : 'Save'}</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
        {products.map(p => (
          <div key={p.id} className="bg-gray-800 p-4 rounded-lg flex justify-between">
            <div>
              <h4 className="font-semibold">{p.name}</h4>
              <p className="text-gray-400 text-sm">{p.description}</p>
              <p className="text-green-400 font-bold">₹{p.price}</p>
              <p className="text-gray-500 text-sm">Stock: {p.stock}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => editProduct(p)} className="text-blue-400 text-sm">Edit</button>
              <button onClick={() => deleteProduct(p.id)} className="text-red-400 text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersTab({ orders, updateStatus }: { orders: Order[]; updateStatus: (id: string, status: string) => void }) {
  return (
    <div className="space-y-3">
      {orders.length === 0 ? <p className="text-gray-400">No orders yet</p> : orders.map(o => (
        <div key={o.id} className="bg-gray-800 p-4 rounded-lg">
          <div className="flex justify-between mb-2">
            <span className="font-semibold">Order #{String(o.id).slice(-6)}</span>
            <span className={`px-2 py-1 rounded text-sm ${o.status === 'pending' ? 'bg-yellow-600' : o.status === 'processing' ? 'bg-blue-600' : o.status === 'shipped' ? 'bg-purple-600' : 'bg-green-600'}`}>{o.status}</span>
          </div>
          <p className="text-gray-400 text-sm">Customer: {o.customer_username || 'User ' + o.customer_id}</p>
          <p className="text-gray-400 text-sm">Items: {o.items?.length || 0} | Total: ₹{o.total}</p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => updateStatus(String(o.id), 'processing')} className="text-blue-400 text-sm">Mark Processing</button>
            <button onClick={() => updateStatus(String(o.id), 'shipped')} className="text-purple-400 text-sm">Mark Shipped</button>
            <button onClick={() => updateStatus(String(o.id), 'delivered')} className="text-green-400 text-sm">Mark Delivered</button>
          </div>
        </div>
      ))}
    </div>
  );
}