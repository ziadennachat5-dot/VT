import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Filter, Phone, MessageCircle, X } from 'lucide-react';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('paid');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const token = localStorage.getItem('vellune_admin_token');
    const { data, error } = await supabase.functions.invoke('admin-api', {
      body: { action: 'get_orders' },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!error && data?.data) {
      setOrders(data.data);
    }
    setLoading(false);
  };

  const updateOrderStatus = async (id, newStatus) => {
    const token = localStorage.getItem('vellune_admin_token');
    const { data, error } = await supabase.functions.invoke('admin-api', {
      body: { action: 'update_order_status', payload: { id, status: newStatus } },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!error) {
      setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === id) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    }
  };

  const filteredOrders = orders.filter(o => {
    if (paymentStatusFilter !== 'all' && o.payment_status !== paymentStatusFilter) return false;
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return o.order_number.toLowerCase().includes(s) || 
             o.customer_name.toLowerCase().includes(s) || 
             o.phone.includes(s) ||
             (o.paypal_transaction_id && o.paypal_transaction_id.toLowerCase().includes(s));
    }
    return true;
  });

  const newPaidOrdersCount = orders.filter(o => o.status === 'paid' && o.payment_status === 'paid').length;

  if (loading) return <div className="p-8 font-mono text-sm opacity-50 uppercase tracking-widest">Loading orders...</div>;

  return (
    <div className="flex-1 flex flex-col relative h-full">
      <div className="p-6 hairline-border-b flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center bg-v-white  sticky top-0 z-10">
        <div>
          <h1 className="font-display text-2xl tracking-widest uppercase mb-1">Orders</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">
            {newPaidOrdersCount} New Paid / {orders.length} Total
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
            <input 
              type="text" 
              placeholder="Search orders..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent hairline-border pl-10 pr-4 py-2 font-mono text-xs outline-none focus:border-v-black"
            />
          </div>
          
          <div className="relative shrink-0">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
            <select 
              value={paymentStatusFilter}
              onChange={e => setPaymentStatusFilter(e.target.value)}
              className="appearance-none bg-transparent hairline-border pl-10 pr-8 py-2 font-mono text-xs outline-none focus:border-v-black"
            >
              <option value="all">ALL PAYMENTS</option>
              <option value="paid">PAID</option>
              <option value="pending">PENDING</option>
              <option value="failed">FAILED</option>
            </select>
          </div>

          <div className="relative shrink-0">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none bg-transparent hairline-border pl-10 pr-8 py-2 font-mono text-xs outline-none focus:border-v-black"
            >
              <option value="all">ALL STATUSES</option>
              <option value="pending">PENDING</option>
              <option value="paid">PAID/NEW</option>
              <option value="confirmed">CONFIRMED</option>
              <option value="shipped">SHIPPED</option>
              <option value="delivered">DELIVERED</option>
              <option value="cancelled">CANCELLED</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto bg-[#FAFAF8] p-6">
        <div className="bg-white border border-black/10 shadow-sm rounded-sm overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="p-16 text-center font-mono text-[11px] opacity-40 uppercase tracking-[0.2em]">No orders found</div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#FAFAF8] font-mono text-[10px] uppercase tracking-widest text-gray-500 border-b border-black/10">
                  <th className="py-4 px-6 font-medium">Order</th>
                  <th className="py-4 px-6 font-medium">Date</th>
                  <th className="py-4 px-6 font-medium">Customer</th>
                  <th className="py-4 px-6 font-medium">Total</th>
                  <th className="py-4 px-6 font-medium">Payment</th>
                  <th className="py-4 px-6 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr 
                    key={order.id} 
                    onClick={() => setSelectedOrder(order)}
                    className="border-b border-black/5 cursor-pointer hover:bg-black/[0.02] transition-colors font-mono text-xs text-[#111111]"
                  >
                    <td className="py-4 px-6 font-semibold">{order.order_number}</td>
                    <td className="py-4 px-6 text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="py-4 px-6">
                      <div className="font-sans font-medium text-sm text-[#111111]">{order.customer_name}</div>
                      <div className="text-[10px] text-gray-500 mt-1">{order.phone}</div>
                    </td>
                    <td className="py-4 px-6 font-medium">${order.total}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-block px-2.5 py-1 text-[9px] font-medium uppercase tracking-widest rounded-sm ${order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {order.payment_status || 'unknown'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-block px-2.5 py-1 text-[9px] font-medium uppercase tracking-widest rounded-sm ${order.status === 'paid' || order.status === 'new' ? 'bg-[#111111] text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Slide-over Panel */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-v-white  hairline-border-l transform transition-transform duration-300 ease-out flex flex-col ${selectedOrder ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedOrder && (
          <>
            <div className="p-6 hairline-border-b flex justify-between items-center bg-v-white  shrink-0">
              <h2 className="font-display text-xl tracking-widest uppercase">Order {selectedOrder.order_number}</h2>
              <button onClick={() => setSelectedOrder(null)} className="hover:rotate-90 transition-transform p-2"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
              {/* Actions */}
              <div className="flex gap-4">
                <select 
                  value={selectedOrder.status}
                  onChange={e => updateOrderStatus(selectedOrder.id, e.target.value)}
                  className="flex-1 bg-transparent hairline-border px-4 py-3 font-mono text-xs uppercase tracking-widest outline-none focus:border-v-black appearance-none"
                >
                  <option value="pending">Status: PENDING</option>
                  <option value="paid">Status: PAID/NEW</option>
                  <option value="confirmed">Status: CONFIRMED</option>
                  <option value="shipped">Status: SHIPPED</option>
                  <option value="delivered">Status: DELIVERED</option>
                  <option value="cancelled">Status: CANCELLED</option>
                </select>
              </div>

              {/* Payment Details */}
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest opacity-50 mb-4">Payment Details</h3>
                <div className="font-sans text-sm bg-v-black/5 p-4 hairline-border">
                  <div className="flex justify-between mb-2">
                    <span className="opacity-70">Status:</span>
                    <span className={`font-mono uppercase ${selectedOrder.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>{selectedOrder.payment_status || 'unknown'}</span>
                  </div>
                  {selectedOrder.paypal_transaction_id && (
                    <div className="flex justify-between mb-2">
                      <span className="opacity-70">Transaction ID:</span>
                      <span className="font-mono text-xs">{selectedOrder.paypal_transaction_id}</span>
                    </div>
                  )}
                  {selectedOrder.payer_email && (
                    <div className="flex justify-between">
                      <span className="opacity-70">Payer Email:</span>
                      <span>{selectedOrder.payer_email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer */}
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest opacity-50 mb-4">Customer</h3>
                <div className="font-sans text-sm bg-v-black/5 p-4 hairline-border">
                  <div className="font-bold mb-1">{selectedOrder.customer_name}</div>
                  <div className="opacity-80 mb-1">{selectedOrder.email}</div>
                  <div className="flex items-center justify-between mt-3 pt-3 hairline-border-t">
                    <span className="opacity-80">{selectedOrder.phone}</span>
                    <div className="flex gap-2">
                      <a href={`tel:${selectedOrder.phone}`} className="p-2 border border-current hover:bg-v-black hover:text-v-white transition-colors" title="Call"><Phone className="w-4 h-4" /></a>
                      <a href={`https://wa.me/${selectedOrder.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="p-2 border border-current hover:bg-v-black hover:text-v-white transition-colors" title="WhatsApp"><MessageCircle className="w-4 h-4" /></a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest opacity-50 mb-4">Shipping Address</h3>
                <div className="font-sans text-sm opacity-80 leading-relaxed bg-v-black/5 p-4 hairline-border">
                  {selectedOrder.address_line}<br/>
                  {selectedOrder.city}, {selectedOrder.state} {selectedOrder.zip}<br/>
                </div>
              </div>
              
              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <h3 className="font-mono text-[10px] uppercase tracking-widest opacity-50 mb-4">Notes</h3>
                  <div className="font-sans text-sm bg-yellow-50 text-yellow-900 p-4 hairline-border border-yellow-200">
                    {selectedOrder.notes}
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest opacity-50 mb-4">Items</h3>
                <div className="flex flex-col gap-4">
                  {selectedOrder.order_items?.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm pb-4 hairline-border-b">
                      <div>
                        <span className="font-mono mr-3 opacity-50">{item.quantity}x</span>
                        <span className="font-bold font-sans">{item.product_name}</span>
                      </div>
                      <span className="font-mono">${item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="font-mono text-sm pt-4 flex flex-col gap-2">
                <div className="flex justify-between opacity-60"><span>Subtotal</span><span>${selectedOrder.subtotal}</span></div>
                <div className="flex justify-between opacity-60"><span>Shipping</span><span>${selectedOrder.shipping}</span></div>
                <div className="flex justify-between font-bold text-lg pt-4 hairline-border-t mt-2"><span>Total</span><span>${selectedOrder.total}</span></div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Overlay for slide-over */}
      {selectedOrder && (
        <div 
          className="fixed inset-0 z-40 bg-[#111111]/20 backdrop-blur-sm md:hidden"
          onClick={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}


