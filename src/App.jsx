import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Storefront from './pages/Storefront';
import AdminLayout from './pages/admin/AdminLayout';
import Orders from './pages/admin/Orders';
import Products from './pages/admin/Products';

export default function App() {
  return (
    <BrowserRouter basename="/">
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Orders />} />
          <Route path="products" element={<Products />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
