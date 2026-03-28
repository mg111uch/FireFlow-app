'use client';

import { useState } from 'react';
import { Product } from '@/lib/types';
import { ProductForm } from './useShop';

interface ProductsTabProps {
  products: Product[];
  saveProduct: (form: ProductForm) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
}

export default function ProductsTab({ products, saveProduct, deleteProduct }: ProductsTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>({ name: '', description: '', price: 0, stock: 10, category: '', image_url: '' });

  const editProduct = (p: Product) => {
    setForm({ name: p.name, description: p.description || '', price: p.price, stock: p.stock, category: p.category || '', image_url: p.image_url || '' });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSave = async () => {
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
    await saveProduct(form);
    setForm({ name: '', description: '', price: 0, stock: 10, category: '', image_url: '' });
    setShowForm(false);
    setEditingId(null);
  };

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
          <button onClick={handleSave} className="bg-green-600 px-4 py-2 rounded text-white mt-3">{editingId ? 'Update' : 'Save'}</button>
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