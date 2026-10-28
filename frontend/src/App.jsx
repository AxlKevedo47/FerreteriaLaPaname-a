import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { InicioPage } from './pages/InicioPage.jsx';
import { BuscarPage } from './pages/BuscarPage.jsx';
import { CatalogoPage } from './pages/CatalogoPage.jsx';
import { ProductoDetallePage } from './pages/ProductoDetallePage.jsx';
import { RegistrarProductoPage } from './pages/RegistrarProductoPage.jsx';
import { RespaldoPage } from './pages/RespaldoPage.jsx';
import { NoEncontradoPage } from './pages/NoEncontradoPage.jsx';

export default function App() {
  return (
    <ToastProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<InicioPage />} />
          <Route path="/buscar" element={<BuscarPage />} />
          <Route path="/catalogo" element={<CatalogoPage />} />
          <Route path="/productos/:id" element={<ProductoDetallePage />} />
          <Route path="/productos/:id/editar" element={<RegistrarProductoPage />} />
          <Route path="/registrar" element={<RegistrarProductoPage />} />
          <Route path="/respaldos" element={<RespaldoPage />} />
          <Route path="*" element={<NoEncontradoPage />} />
        </Routes>
      </Layout>
    </ToastProvider>
  );
}
