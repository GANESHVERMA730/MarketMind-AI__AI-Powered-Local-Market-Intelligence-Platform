import { useCallback, useEffect, useState } from 'react';
import { Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api, { getApiError } from '../api/http';
import { EmptyState, ErrorNotice, Loading, PageHeading } from '../components/common';
import { formatCurrency } from '../utils/format';
import { Field } from './LoginPage';

const categories = ['groceries', 'beverages', 'snacks', 'personal_care', 'household', 'other'];
const blankProduct = {
  name: '', sku: '', category: 'groceries', description: '', costPrice: '', sellingPrice: '',
  stockQuantity: '', minStockThreshold: 5, supplierName: '',
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalProduct, setModalProduct] = useState(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/products', {
        params: { limit: 100, search: search || undefined, includeArchived: includeArchived ? 'true' : undefined },
      });
      setProducts(data.data.items);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [search, includeArchived]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  async function deleteProduct(product) {
    if (!window.confirm(`Remove ${product.name}? Products with sales history are archived instead.`)) return;
    setNotice('');
    setError('');
    try {
      const { data } = await api.delete(`/products/${product.id}`);
      setNotice(data.data.message);
      await loadProducts();
    } catch (requestError) {
      setError(getApiError(requestError));
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Inventory"
        title="Products & stock"
        description="Keep your catalog current and catch low stock before it catches you."
        action={<button className="primary-button" onClick={() => setModalProduct({ ...blankProduct, id: null })}><Plus size={17} /> Add product</button>}
      />
      <ErrorNotice message={error} onRetry={loadProducts} />
      {notice && <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-[#cde1d0] bg-[#edf5ee] px-4 py-3 text-sm text-forest" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={17} /></button></div>}

      <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <form className="flex w-full gap-2 sm:max-w-md" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); }}>
          <div className="relative flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className="form-input !mt-0 pl-10" placeholder="Search name or SKU" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></div>
          <button className="secondary-button" type="submit">Search</button>
        </form>
        <label className="flex items-center gap-2 text-sm font-medium text-muted">
          <input type="checkbox" className="h-4 w-4 accent-forest" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} />
          Include archived products
        </label>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card/50">
        {loading ? <Loading label="Loading products…" /> : products.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-[#fafbf9] text-[11px] font-bold uppercase tracking-wider text-muted"><tr>
                  <th className="px-5 py-4">Product</th><th className="px-4 py-4">Category</th><th className="px-4 py-4 text-right">Cost / price</th><th className="px-4 py-4 text-right">In stock</th><th className="px-4 py-4 text-right">Inventory value</th><th className="px-5 py-4 text-right">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {products.map((product) => <tr key={product.id} className="hover:bg-canvas/70">
                    <td className="px-5 py-4"><p className="font-semibold">{product.name}</p><p className="mt-1 text-xs text-muted">{product.sku}</p></td>
                    <td className="px-4 py-4 text-sm capitalize text-muted">{product.category.replaceAll('_', ' ')}</td>
                    <td className="px-4 py-4 text-right text-sm"><span className="text-muted">{formatCurrency(product.costPrice)}</span><span className="mx-1 text-muted">/</span><span className="font-semibold">{formatCurrency(product.sellingPrice)}</span></td>
                    <td className="px-4 py-4 text-right"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${product.isLowStock ? 'bg-[#fff4e8] text-[#9b682b]' : 'bg-[#edf5ee] text-forest'}`}>{product.stockQuantity} {product.isLowStock ? '· Low' : ''}</span><p className="mt-1 text-[11px] text-muted">Threshold {product.minStockThreshold}</p></td>
                    <td className="px-4 py-4 text-right text-sm font-semibold">{formatCurrency(product.inventoryValue)}</td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-2">
                      <button className="icon-button" aria-label={`Edit ${product.name}`} onClick={() => setModalProduct(product)}><Edit3 size={16} /></button>
                      <button className="icon-button text-red-700 hover:bg-red-50" aria-label={`Delete ${product.name}`} onClick={() => deleteProduct(product)}><Trash2 size={16} /></button>
                    </div></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-line md:hidden">
              {products.map((product) => <article key={product.id} className="p-4">
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{product.name}</h3><p className="mt-1 text-xs text-muted">{product.sku} · <span className="capitalize">{product.category.replaceAll('_', ' ')}</span></p></div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.isLowStock ? 'bg-[#fff4e8] text-[#9b682b]' : 'bg-[#edf5ee] text-forest'}`}>{product.stockQuantity} in stock</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><p className="text-muted">Cost / selling</p><p className="mt-1 font-semibold">{formatCurrency(product.costPrice)} / {formatCurrency(product.sellingPrice)}</p></div><div><p className="text-muted">Inventory value</p><p className="mt-1 font-semibold">{formatCurrency(product.inventoryValue)}</p></div></div>
                <div className="mt-4 flex justify-end gap-2"><button className="secondary-button !px-3 !py-2" onClick={() => setModalProduct(product)}><Edit3 size={14} /> Edit</button><button className="secondary-button !px-3 !py-2 text-red-700" onClick={() => deleteProduct(product)}><Trash2 size={14} /> Remove</button></div>
              </article>)}
            </div>
          </>
        ) : <EmptyState title={search ? 'No matching products' : 'Your inventory starts here'} description={search ? 'Try a different product name or SKU.' : 'Add the products you carry to keep stock and sales connected.'} action={!search && <button className="primary-button" onClick={() => setModalProduct({ ...blankProduct, id: null })}><Plus size={16} /> Add your first product</button>} />}
      </section>
      {modalProduct && <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} onSaved={async (message) => { setModalProduct(null); setNotice(message); await loadProducts(); }} />}
    </>
  );
}

function ProductModal({ product, onClose, onSaved }) {
  const isEditing = Boolean(product.id);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: isEditing ? product : blankProduct,
  });
  const [error, setError] = useState('');

  async function onSubmit(values) {
    setError('');
    try {
      const payload = {
        ...values,
        costPrice: Number(values.costPrice),
        sellingPrice: Number(values.sellingPrice),
        stockQuantity: Number(values.stockQuantity),
        minStockThreshold: Number(values.minStockThreshold),
      };
      if (isEditing) {
        const { data } = await api.patch(`/products/${product.id}`, payload);
        await onSaved(data.message || 'Product updated.');
      } else {
        const { data } = await api.post('/products', payload);
        await onSaved(data.message || 'Product created.');
      }
    } catch (requestError) {
      setError(getApiError(requestError));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
        <div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-forest">{isEditing ? 'Product details' : 'Inventory'}</p><h2 id="product-modal-title" className="mt-1 text-xl font-bold">{isEditing ? 'Edit product' : 'Add a product'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>
        {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Product name" error={errors.name?.message}><input className="form-input" {...register('name', { required: 'Enter a product name', minLength: { value: 2, message: 'Use at least 2 characters' }, maxLength: { value: 120, message: 'Use no more than 120 characters' } })} /></Field>
          <Field label="SKU" error={errors.sku?.message}><input className="form-input uppercase" {...register('sku', { required: 'Enter a SKU', minLength: { value: 2, message: 'Use at least 2 characters' }, maxLength: { value: 40, message: 'Use no more than 40 characters' }, pattern: { value: /^[A-Za-z0-9_-]+$/, message: 'Use letters, numbers, hyphens, or underscores' } })} /></Field>
          <Field label="Category" error={errors.category?.message}><select className="select-input form-input" {...register('category', { required: true })}>{categories.map((category) => <option key={category} value={category}>{category.replaceAll('_', ' ')}</option>)}</select></Field>
          <Field label="Supplier (optional)" error={errors.supplierName?.message}><input className="form-input" {...register('supplierName', { maxLength: { value: 120, message: 'Use no more than 120 characters' } })} /></Field>
          <Field label="Cost price (₹)" error={errors.costPrice?.message}><input className="form-input" type="number" min="0" step="0.01" {...register('costPrice', { required: 'Enter the cost price', valueAsNumber: true, min: { value: 0, message: 'Cannot be negative' } })} /></Field>
          <Field label="Selling price (₹)" error={errors.sellingPrice?.message}><input className="form-input" type="number" min="0" step="0.01" {...register('sellingPrice', { required: 'Enter the selling price', valueAsNumber: true, min: { value: 0, message: 'Cannot be negative' } })} /></Field>
          <Field label="Stock quantity" error={errors.stockQuantity?.message}><input className="form-input" type="number" min="0" step="1" {...register('stockQuantity', { required: 'Enter stock quantity', valueAsNumber: true, min: { value: 0, message: 'Cannot be negative' }, validate: (value) => Number.isInteger(value) || 'Use a whole number' })} /></Field>
          <Field label="Low-stock threshold" error={errors.minStockThreshold?.message}><input className="form-input" type="number" min="0" step="1" {...register('minStockThreshold', { required: 'Enter a threshold', valueAsNumber: true, min: { value: 0, message: 'Cannot be negative' }, validate: (value) => Number.isInteger(value) || 'Use a whole number' })} /></Field>
          <div className="sm:col-span-2"><Field label="Description (optional)" error={errors.description?.message}><textarea className="form-input min-h-20 resize-y" maxLength={500} {...register('description', { maxLength: { value: 500, message: 'Use no more than 500 characters' } })} /></Field></div>
          {isEditing && <label className="flex items-center gap-2 text-sm font-medium text-muted sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-forest" {...register('isActive')} /> Active and available for sale</label>}
          <div className="mt-2 flex flex-col-reverse gap-3 border-t border-line pt-4 sm:col-span-2 sm:flex-row sm:justify-end">
            <button type="button" className="secondary-button justify-center" onClick={onClose}>Cancel</button>
            <button className="primary-button justify-center" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create product'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
