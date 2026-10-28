export function Cargando({ texto = 'Cargando información…' }) {
  return (
    <div className="cargando" role="status" aria-live="polite">
      <span className="spinner spinner--grande" aria-hidden="true" />
      <p>{texto}</p>
    </div>
  );
}
