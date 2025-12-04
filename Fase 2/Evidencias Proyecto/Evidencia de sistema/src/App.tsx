import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Compare from "@/pages/Compare";
import About from "@/pages/About";
import NotFound from "@/pages/NotFound";
import ScrollToTop from "@/components/ScrollToTop";
import AccountProfilePage from "@/pages/AccountProfilePage";
import DevErrorBoundary from "@/components/DevErrorBoundary";

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/productos" element={<Products />} />
          <Route path="/productos/:id" element={<ProductDetail />} />
          <Route path="/comparar" element={<Compare />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/account/profile"
            element={
              <DevErrorBoundary>
                <AccountProfilePage />
              </DevErrorBoundary>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}