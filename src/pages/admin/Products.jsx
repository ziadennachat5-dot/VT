import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X, Upload, Pencil, Trash2 } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    style_tag: '',
    price: '',
    description: '',
    specs: ['', '', '', ''],
    stock: 0,
    is_active: true,
    image_url: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const token = localStorage.getItem('vellune_admin_token');
    const { data, error } = await supabase.functions.invoke('admin-api', {
      body: { action: 'get_products' },
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!error && data?.data) setProducts(data.data);
    setLoading(false);
  };

  const openForm = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        style_tag: product.style_tag,
        price: product.price.toString(),
        description: product.description || '',
        specs: product.specs || ['', '', '', ''],
        stock: product.stock,
        is_active: product.is_active,
        image_url: product.image_url
      });
      setImagePreview(product.image_url);
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        style_tag: '',
        price: '',
        description: '',
        specs: ['', '', '', ''],
        stock: 0,
        is_active: true,
        image_url: ''
      });
      setImagePreview(null);
    }
    setImageFile(null);
    setIsFormOpen(true);
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSpecChange = (index, value) => {
    const newSpecs = [...formData.specs];
    newSpecs[index] = value;
    setFormData({ ...formData, specs: newSpecs });
  };

  const uploadImage = async () => {
    if (!imageFile) return formData.image_url;
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      reader.onload = async () => {
        try {
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const token = localStorage.getItem('vellune_admin_token');
          
          const { data, error } = await supabase.functions.invoke('admin-api', {
            body: { action: 'upload_image', payload: { fileName, fileType: imageFile.type, fileData: reader.result } },
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (error) throw error;
          resolve(data.data.publicUrl);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let finalImageUrl = formData.image_url;
      if (imageFile) {
        finalImageUrl = await uploadImage();
      }

      const productData = {
        name: formData.name,
        style_tag: formData.style_tag,
        price: parseFloat(formData.price),
        description: formData.description,
        specs: formData.specs.filter(s => s.trim() !== ''),
        stock: parseInt(formData.stock),
        is_active: formData.is_active,
        image_url: finalImageUrl
      };

      let payload;
      if (editingProduct) {
        payload = { ...editingProduct, ...productData };
      } else {
        productData.ref = 'REF. ' + Math.floor(100 + Math.random() * 900);
        payload = productData;
      }
      
      const token = localStorage.getItem('vellune_admin_token');
      const { error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'upsert_product', payload },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (error) throw error;
      
      await fetchProducts();
      setIsFormOpen(false);
    } catch (error) {
      console.error(error);
      const msg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      alert('Error saving product: ' + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (product) => {
    const token = localStorage.getItem('vellune_admin_token');
    const updatedProduct = { ...product, is_active: !product.is_active };
    const { error } = await supabase.functions.invoke('admin-api', {
      body: { action: 'upsert_product', payload: updatedProduct },
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!error) {
      setProducts(products.map(p => p.id === product.id ? updatedProduct : p));
    }
  };

  const deleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      const token = localStorage.getItem('vellune_admin_token');
      const { error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'delete_product', payload: { id } },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!error) {
        setProducts(products.filter(p => p.id !== id));
      }
    }
  };

  if (loading) return <div className="p-8 font-mono text-sm opacity-50 uppercase tracking-widest">Loading products...</div>;

  return (
    <div className="flex-1 flex flex-col relative h-full">
      <div className="p-6 hairline-border-b flex justify-between items-center bg-[#FAFAF8]  sticky top-0 z-10">
        <div>
          <h1 className="font-display text-2xl tracking-widest uppercase mb-1">Products</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">
            {products.length} Items in Catalog
          </p>
        </div>
        <button onClick={() => openForm()} className="btn-primary flex items-center gap-2 text-xs py-2 px-4">
          <Plus className="w-4 h-4" /> ADD WATCH
        </button>
      </div>

      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map(product => (
            <div key={product.id} className={`bg-white border border-black/10 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col rounded-sm overflow-hidden ${!product.is_active ? 'opacity-50 grayscale' : ''}`}>
              <div className="aspect-square bg-gray-50 relative border-b border-black/5">
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover grayscale mix-blend-multiply" />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-2.5 py-1 border border-black/10 font-mono text-[9px] uppercase tracking-widest shadow-sm rounded-sm">
                  {product.ref}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-display font-semibold uppercase tracking-widest text-sm">{product.name}</h3>
                  <span className="font-mono text-sm font-medium">${product.price}</span>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-6">
                  Stock: {product.stock} | {product.style_tag}
                </div>
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-black/5">
                  <label className="flex items-center gap-2 cursor-pointer font-mono text-[10px] font-medium uppercase tracking-widest">
                    <input type="checkbox" checked={product.is_active} onChange={() => toggleActive(product)} className="accent-black w-3.5 h-3.5" />
                    Active
                  </label>
                  <div className="flex gap-1.5">
                    <button onClick={() => openForm(product)} className="p-2 hover:bg-black/5 rounded-full transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteProduct(product.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Slide-over */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#FAFAF8]  hairline-border-l transform transition-transform duration-300 ease-out flex flex-col ${isFormOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 hairline-border-b flex justify-between items-center shrink-0">
          <h2 className="font-display text-xl tracking-widest uppercase">{editingProduct ? 'Edit Watch' : 'New Watch'}</h2>
          <button onClick={() => setIsFormOpen(false)} className="hover:rotate-90 transition-transform p-2"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* Image Upload */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest mb-2">Product Image</label>
            <div 
              className="aspect-video hairline-border border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-[#111111]/5  relative overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover grayscale" />
              ) : (
                <>
                  <Upload className="w-6 h-6 mb-2 opacity-50" />
                  <span className="font-mono text-xs uppercase tracking-widest opacity-50">Click to upload image</span>
                </>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest mb-2">Name</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full bg-transparent hairline-border p-3 outline-none focus:border-v-black font-sans text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest mb-2">Style Tag</label>
              <input type="text" value={formData.style_tag} onChange={e => setFormData({...formData, style_tag: e.target.value})} required placeholder="e.g. Diver, GMT" className="w-full bg-transparent hairline-border p-3 outline-none focus:border-v-black font-sans text-sm" />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest mb-2">Price ($)</label>
              <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required className="w-full bg-transparent hairline-border p-3 outline-none focus:border-v-black font-mono text-sm" />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest mb-2">Description</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="3" className="w-full bg-transparent hairline-border p-3 outline-none focus:border-v-black font-sans text-sm resize-none"></textarea>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest mb-2">Technical Specs (Max 4)</label>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map(i => (
                <input 
                  key={i} 
                  type="text" 
                  value={formData.specs[i] || ''} 
                  onChange={e => handleSpecChange(i, e.target.value)} 
                  placeholder={`Spec ${i+1}`}
                  className="w-full bg-transparent hairline-border p-2 outline-none focus:border-v-black font-mono text-xs" 
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest mb-2">Initial Stock</label>
            <input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} required min="0" className="w-full bg-transparent hairline-border p-3 outline-none focus:border-v-black font-mono text-sm" />
          </div>

          <div className="mt-auto pt-6">
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'SAVING...' : 'SAVE WATCH'}
            </button>
          </div>
        </form>
      </div>

      {/* Overlay */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 z-40 bg-[#111111]/20 backdrop-blur-sm md:hidden"
          onClick={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
}




