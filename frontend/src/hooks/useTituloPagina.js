import { useEffect } from 'react';

export function useTituloPagina(titulo) {
  useEffect(() => {
    document.title = titulo
      ? `${titulo} · Ferretería La Panameña`
      : 'Ferretería La Panameña · Catálogo';
  }, [titulo]);
}
