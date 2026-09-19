import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export default function CheckoutForm({ cartItems, cartTotal, onComplete, onCancel }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    email: '',
    address_line: '',
    city: '',
    state: '',
    zip: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [isValidated, setIsValidated] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [paypalError, setPaypalError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.customer_name) newErrors.customer_name = 'Required';
    if (!formData.phone || formData.phone.replace(/\D/g, '').length < 10) newErrors.phone = 'Valid phone required';
    if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Valid email required';
    if (!formData.address_line) newErrors.address_line = 'Required';
    if (!formData.city) newErrors.city = 'Required';
    if (!formData.state) newErrors.state = 'Required';
    if (!formData.zip || !/^\d{5}$/.test(formData.zip)) newErrors.zip = '5-digit ZIP required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinueToPayment = (e) => {
    e.preventDefault();
    if (validate()) {
      setIsValidated(true);
      setPaypalError('');
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: null }));
    }
    setIsValidated(false); // require re-validation if they change something
  };

  const createOrder = async () => {
    setPaypalError('');
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-paypal-order', {
        body: {
          cartItems: cartItems.map(item => ({ id: item.id, quantity: item.quantity })),
          customerDetails: formData
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data.paypal_order_id;
    } catch (err) {
      console.error(err);
      setPaypalError('Could not initialize PayPal order. Please try again.');
      setIsProcessing(false);
      throw err;
    }
  };

  const onApprove = async (data) => {
    try {
      const { data: captureData, error } = await supabase.functions.invoke('capture-paypal-order', {
        body: { paypal_order_id: data.orderID }
      });
      if (error) throw error;
      if (captureData?.error) throw new Error(captureData.error);

      setOrderNumber(captureData.order_number);
      setIsSuccess(true);
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      setPaypalError('Payment capture failed. If you were charged, please contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onCancelPayPal = () => {
    setIsProcessing(false);
    setPaypalError('Payment was cancelled.');
  };

  const onErrorPayPal = (err) => {
    console.error('PayPal onError', err);
    setIsProcessing(false);
    setPaypalError('An error occurred with PayPal. Please try again.');
  };

  if (isSuccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 fade-up visible p-6">
        <div className="w-16 h-16 rounded-full border-2 border-green-500 flex items-center justify-center text-green-500 mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <div>
          <h3 className="font-display text-2xl tracking-widest mb-2 uppercase">Order Received</h3>
          <p className="font-mono text-sm opacity-60">Order #{orderNumber}</p>
        </div>
        <div className="w-12 h-[1px] bg-[#111111]/20" />
        <p className="font-sans text-sm opacity-80 max-w-[250px] leading-relaxed">
          Thank you. Your PayPal payment was successful. We'll contact you on {formData.phone} to confirm. Build time is 2–3 weeks.
        </p>
        <button type="button" onClick={onCancel} className="btn-outline mt-8 w-full">
          CONTINUE SHOPPING
        </button>
      </div>
    );
  }

  const initialOptions = {
    "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID || "test",
    currency: "USD",
    intent: "capture"
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-8 flex-1 flex flex-col gap-6">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.2em] mb-2 text-gray-500 font-medium">Full Name</label>
          <input type="text" name="customer_name" value={formData.customer_name} onChange={handleChange} disabled={isValidated} className="w-full bg-white border border-black/10 p-3.5 outline-none focus:border-black focus:ring-1 focus:ring-black disabled:opacity-50 disabled:bg-gray-50 transition-all font-sans text-sm shadow-sm" />
          {errors.customer_name && <span className="text-red-500 text-xs mt-1.5 block">{errors.customer_name}</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] mb-2 text-gray-500 font-medium">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={isValidated} className="w-full bg-white border border-black/10 p-3.5 outline-none focus:border-black focus:ring-1 focus:ring-black disabled:opacity-50 disabled:bg-gray-50 transition-all font-sans text-sm shadow-sm" />
            {errors.email && <span className="text-red-500 text-xs mt-1.5 block">{errors.email}</span>}
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] mb-2 text-gray-500 font-medium">Phone</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} disabled={isValidated} className="w-full bg-white border border-black/10 p-3.5 outline-none focus:border-black focus:ring-1 focus:ring-black disabled:opacity-50 disabled:bg-gray-50 transition-all font-sans text-sm shadow-sm" />
            {errors.phone && <span className="text-red-500 text-xs mt-1.5 block">{errors.phone}</span>}
          </div>
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.2em] mb-2 text-gray-500 font-medium">Address</label>
          <input type="text" name="address_line" value={formData.address_line} onChange={handleChange} disabled={isValidated} className="w-full bg-white border border-black/10 p-3.5 outline-none focus:border-black focus:ring-1 focus:ring-black disabled:opacity-50 disabled:bg-gray-50 transition-all font-sans text-sm shadow-sm" />
          {errors.address_line && <span className="text-red-500 text-xs mt-1.5 block">{errors.address_line}</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="col-span-1">
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] mb-2 text-gray-500 font-medium">City</label>
            <input type="text" name="city" value={formData.city} onChange={handleChange} disabled={isValidated} className="w-full bg-white border border-black/10 p-3.5 outline-none focus:border-black focus:ring-1 focus:ring-black disabled:opacity-50 disabled:bg-gray-50 transition-all font-sans text-sm shadow-sm" />
            {errors.city && <span className="text-red-500 text-xs mt-1.5 block">{errors.city}</span>}
          </div>
          <div className="col-span-1">
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] mb-2 text-gray-500 font-medium">State</label>
            <input type="text" name="state" value={formData.state} onChange={handleChange} disabled={isValidated} className="w-full bg-white border border-black/10 p-3.5 outline-none focus:border-black focus:ring-1 focus:ring-black disabled:opacity-50 disabled:bg-gray-50 transition-all font-sans text-sm shadow-sm" />
            {errors.state && <span className="text-red-500 text-xs mt-1.5 block">{errors.state}</span>}
          </div>
          <div className="col-span-1">
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] mb-2 text-gray-500 font-medium">ZIP</label>
            <input type="text" name="zip" value={formData.zip} onChange={handleChange} disabled={isValidated} className="w-full bg-white border border-black/10 p-3.5 outline-none focus:border-black focus:ring-1 focus:ring-black disabled:opacity-50 disabled:bg-gray-50 transition-all font-sans text-sm shadow-sm" />
            {errors.zip && <span className="text-red-500 text-xs mt-1.5 block">{errors.zip}</span>}
          </div>
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.2em] mb-2 text-gray-500 font-medium">Notes (Optional)</label>
          <textarea name="notes" value={formData.notes} onChange={handleChange} disabled={isValidated} className="w-full bg-white border border-black/10 p-3.5 outline-none focus:border-black focus:ring-1 focus:ring-black resize-none disabled:opacity-50 disabled:bg-gray-50 transition-all font-sans text-sm shadow-sm" rows="3"></textarea>
        </div>
        
        {isValidated && (
          <div className="mt-2">
             <button onClick={() => setIsValidated(false)} disabled={isProcessing} className="text-xs font-medium font-sans underline text-gray-500 hover:text-black transition-colors disabled:opacity-30">
               Edit Details
             </button>
          </div>
        )}
      </div>
      
      <div className="p-8 border-t border-black/5 bg-white/50 backdrop-blur-md shrink-0">
        <div className="flex flex-col gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-500 mb-6">
          <div className="flex justify-between"><span>Items</span><span>{cartItems.length}</span></div>
          <div className="flex justify-between"><span>Subtotal</span><span>${cartTotal}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>Free</span></div>
        </div>
        <div className="flex justify-between font-display text-lg font-medium tracking-[0.2em] mb-8 pt-6 border-t border-black/5">
          <span>TOTAL</span><span className="font-mono">${cartTotal}</span>
        </div>
        
        {paypalError && (
          <div className="mb-6 text-red-600 text-xs font-medium p-4 border border-red-200 bg-red-50 rounded-sm">
            {paypalError}
          </div>
        )}

        {!isValidated ? (
          <button onClick={handleContinueToPayment} className="btn-primary w-full">
            CONTINUE TO PAYMENT
          </button>
        ) : (
          <div className="w-full relative z-10">
            <PayPalScriptProvider options={initialOptions}>
              <PayPalButtons
                style={{ layout: "vertical", color: "black", shape: "rect", label: "pay" }}
                createOrder={createOrder}
                onApprove={onApprove}
                onCancel={onCancelPayPal}
                onError={onErrorPayPal}
                disabled={isProcessing}
              />
            </PayPalScriptProvider>
            {isProcessing && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.2em] font-medium backdrop-blur-sm z-20">
                Processing...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
