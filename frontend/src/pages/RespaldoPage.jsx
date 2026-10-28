import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Alerta } from '../components/Alerta.jsx';
import { Boton } from '../components/Boton.jsx';
import { Cargando } from '../components/Cargando.jsx';
import { EstadoVacio } from '../components/EstadoVacio.jsx';
import { Icono } from '../components/Icono.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTituloPagina } from '../hooks/useTituloPagina.js';
import { formatearFechaHora, formatearTamano } from '../utils/formato.js';

export function RespaldoPage() {
  useTituloPagina('Respaldos');
  const toast = useToast();
  const [respaldos, setRespaldos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [creando, setCreando] = useState(false);
  const [ultimoCreado, setUltimoCreado] = useState(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);

    api
      .listarRespaldos()
      .then((respuesta) => {
        if (activo) setRespaldos(respuesta.datos);
      })
      .catch((fallo) => {
        if (activo) setError(fallo);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [recarga]);

  async function generarRespaldo() {
    setCreando(true);
    setError(null);
    setUltimoCreado(null);
    try {
      const respuesta = await api.crearRespaldo();
      setUltimoCreado(respuesta.datos);
      setRespaldos((actuales) => [respuesta.datos, ...actuales]);
      toast.exito('Respaldo generado correctamente.');
    } catch (fallo) {
      setError(fallo);
      toast.error(fallo.message);
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="contenedor pagina pagina--estrecha">
      <header className="cabecera-pagina">
        <div>
          <p className="seccion__eyebrow">Protección de la información</p>
          <h1 className="titulo-pagina">Respaldos de la base de datos</h1>
          <p className="subtitulo-pagina">
            Genere una copia real de PostgreSQL con <code>pg_dump</code>, descárguela y consérvela
            fuera del equipo. Un respaldo solo es útil si puede restaurarse.
          </p>
        </div>
      </header>

      <section className="tarjeta tarjeta--respaldo" aria-labelledby="titulo-generar">
        <div className="tarjeta__cabecera tarjeta__cabecera--dividida">
          <div>
            <h2 className="tarjeta__titulo" id="titulo-generar">
              Generar un respaldo ahora
            </h2>
            <p className="tarjeta__subtitulo">
              Se ejecuta <code>pg_dump</code> contra la base configurada en <code>.env</code> y se
              guarda un archivo con formato custom en la carpeta de respaldos del servidor.
            </p>
          </div>
          <Boton icono="respaldo" cargando={creando} onClick={generarRespaldo}>
            {creando ? 'Generando respaldo…' : 'Generar respaldo'}
          </Boton>
        </div>

        <div className="aviso-respaldo">
          <Icono nombre="info" tamano={19} />
          <p>
            El archivo queda en el equipo donde corre el backend. Para protegerse de una falla del
            disco, descárguelo y guárdelo en otro medio o ubicación.
          </p>
        </div>

        {ultimoCreado && (
          <div className="respaldo-creado" role="status">
            <span className="respaldo-creado__icono" aria-hidden="true">
              <Icono nombre="checkCirculo" tamano={26} />
            </span>
            <div className="respaldo-creado__texto">
              <p className="respaldo-creado__titulo">Respaldo generado correctamente</p>
              <p>
                {ultimoCreado.nombre} · {formatearTamano(ultimoCreado.tamano)} ·{' '}
                {formatearFechaHora(ultimoCreado.creadoEn)}
              </p>
            </div>
            <a
              className="boton boton--primario boton--sm"
              href={api.urlDescargaRespaldo(ultimoCreado.nombre)}
              download
            >
              <Icono nombre="descargar" tamano={17} />
              <span>Descargar</span>
            </a>
          </div>
        )}

        {error && (
          <Alerta
            tipo="error"
            titulo="No se pudo generar el respaldo"
            accion={
              <Boton variante="secundario" tamano="sm" icono="recargar" onClick={generarRespaldo}>
                Reintentar
              </Boton>
            }
          >
            <p>{error.message}</p>
            {error.detalles?.causa && (
              <p className="detalle-tecnico">Detalle técnico: {error.detalles.causa}</p>
            )}
          </Alerta>
        )}
      </section>

      <section className="seccion" aria-labelledby="titulo-historial">
        <div className="seccion__cabecera">
          <div>
            <p className="seccion__eyebrow">Historial</p>
            <h2 className="seccion__titulo" id="titulo-historial">
              Respaldos disponibles
            </h2>
          </div>
          <Boton
            variante="fantasma"
            tamano="sm"
            icono="recargar"
            onClick={() => setRecarga((n) => n + 1)}
            cargando={cargando}
          >
            Actualizar lista
          </Boton>
        </div>

        {cargando && respaldos.length === 0 ? (
          <Cargando texto="Leyendo la carpeta de respaldos…" />
        ) : respaldos.length === 0 ? (
          <EstadoVacio
            icono="respaldo"
            titulo="Todavía no hay respaldos"
            mensaje="Genere el primer respaldo para tener una copia de seguridad de los productos registrados."
            accion={
              <Boton icono="respaldo" onClick={generarRespaldo} cargando={creando}>
                Generar respaldo
              </Boton>
            }
          />
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla tabla--respaldos">
              <thead>
                <tr>
                  <th scope="col">Archivo</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Tamaño</th>
                  <th scope="col">
                    <span className="visualmente-oculto">Descargar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {respaldos.map((respaldo) => (
                  <tr key={respaldo.nombre}>
                    <td data-etiqueta="Archivo">
                      <span className="archivo-celda">
                        <Icono nombre="respaldo" tamano={17} />
                        {respaldo.nombre}
                      </span>
                    </td>
                    <td data-etiqueta="Fecha">{formatearFechaHora(respaldo.creadoEn)}</td>
                    <td data-etiqueta="Tamaño">{formatearTamano(respaldo.tamano)}</td>
                    <td data-etiqueta="Descargar" className="tabla__acciones">
                      <a
                        className="boton boton--fantasma boton--sm"
                        href={api.urlDescargaRespaldo(respaldo.nombre)}
                        download
                      >
                        <Icono nombre="descargar" tamano={16} />
                        <span>Descargar</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="tarjeta" aria-labelledby="titulo-restauracion">
        <div className="tarjeta__cabecera">
          <h2 className="tarjeta__titulo" id="titulo-restauracion">
            Cómo restaurar un respaldo
          </h2>
          <p className="tarjeta__subtitulo">
            La restauración no se ejecuta desde esta interfaz para evitar sobrescrituras
            accidentales. Se realiza desde una terminal, con confirmación explícita.
          </p>
        </div>

        <ol className="pasos">
          <li>
            <strong>Detenga la aplicación</strong> para que nadie esté escribiendo en la base
            mientras se restaura.
          </li>
          <li>
            <strong>Cree una base de destino</strong> o use una base de prueba. No restaure sobre la
            base en uso sin haber generado antes un respaldo de seguridad.
          </li>
          <li>
            <strong>Ejecute pg_restore</strong> con el archivo descargado:
            <pre className="bloque-codigo">
              <code>
                pg_restore -h 127.0.0.1 -p &lt;puerto&gt; -U ferreteria_app -d
                ferreteria_restauracion --clean --if-exists "ruta\al\respaldo.dump"
              </code>
            </pre>
            <p className="nota-codigo">
              Sustituya <code>&lt;puerto&gt;</code> por el puerto configurado en <code>.env</code>:
              5432 en una instalación habitual o 5433 si usa el clúster local de los scripts.
            </p>
          </li>
          <li>
            <strong>Verifique</strong> que los productos aparezcan en el catálogo antes de apuntar
            la aplicación a la base restaurada.
          </li>
        </ol>

        <Alerta tipo="advertencia" titulo="Antes de restaurar">
          Una restauración con <code>--clean</code> elimina los objetos existentes en la base de
          destino. Confirme dos veces la base seleccionada y conserve una copia del respaldo actual.
        </Alerta>
      </section>
    </div>
  );
}
