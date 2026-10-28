import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Alerta } from '../components/Alerta.jsx';
import { Boton } from '../components/Boton.jsx';
import { Campo } from '../components/Campo.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Icono } from '../components/Icono.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTituloPagina } from '../hooks/useTituloPagina.js';

// Formulario único para registrar y editar. En edición carga el producto por
// ID y transforma sus unidades para usar exactamente los mismos controles.

const FORMULARIO_INICIAL = {
  nombre: '',
  codigo: '',
  descripcion: '',
  categoriaId: '',
  unidadReferenciaId: '',
  esFraccionado: false,
  unidades: [],
};

function ordenarPorNombre(lista) {
  return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function RegistrarProductoPage() {
  const [parametros] = useSearchParams();
  const { id } = useParams();
  const navegar = useNavigate();
  const esEdicion = Boolean(id);
  const nombreInicial = parametros.get('nombre') ?? '';
  const toast = useToast();

  const [formulario, setFormulario] = useState({
    ...FORMULARIO_INICIAL,
    nombre: nombreInicial,
  });
  const [categorias, setCategorias] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [errorCatalogos, setErrorCatalogos] = useState(null);
  const [recargaCatalogos, setRecargaCatalogos] = useState(0);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [duplicados, setDuplicados] = useState([]);
  const [dialogoDuplicado, setDialogoDuplicado] = useState(false);
  const [productoCreado, setProductoCreado] = useState(null);
  const [cargandoEdicion, setCargandoEdicion] = useState(esEdicion);
  const [errorEdicion, setErrorEdicion] = useState(null);

  const [nuevaCategoria, setNuevaCategoria] = useState({
    abierta: false,
    nombre: '',
    error: null,
    guardando: false,
  });
  const [nuevaUnidad, setNuevaUnidad] = useState({
    abierta: false,
    nombre: '',
    abreviatura: '',
    error: null,
    guardando: false,
  });

  useTituloPagina(productoCreado ? (esEdicion ? 'Producto actualizado' : 'Producto registrado') : (esEdicion ? 'Editar producto' : 'Registrar producto'));

  useEffect(() => {
    let activo = true;
    setCargandoCatalogos(true);
    setErrorCatalogos(null);

    Promise.all([api.listarCategorias(), api.listarUnidades()])
      .then(([respuestaCategorias, respuestaUnidades]) => {
        if (!activo) return;
        setCategorias(respuestaCategorias.datos);
        setUnidades(respuestaUnidades.datos);
      })
      .catch((fallo) => {
        if (activo) setErrorCatalogos(fallo);
      })
      .finally(() => {
        if (activo) setCargandoCatalogos(false);
      });

    return () => {
      activo = false;
    };
  }, [recargaCatalogos]);

  // La página de edición reutiliza el formulario de alta: solo adapta los datos
  // que llegan del detalle al estado editable que el formulario ya conoce.
  useEffect(() => {
    if (!esEdicion) return undefined;
    let activo = true;
    setCargandoEdicion(true);
    setErrorEdicion(null);
    api.obtenerProducto(id)
      .then((respuesta) => {
        if (!activo) return;
        const producto = respuesta.datos;
        setFormulario({
          nombre: producto.nombre,
          codigo: producto.codigo ?? '',
          descripcion: producto.descripcion ?? '',
          categoriaId: String(producto.categoria.id),
          unidadReferenciaId: String(producto.unidadReferencia.id),
          esFraccionado: producto.esFraccionado,
          unidades: producto.unidadesComercializacion.map((unidad) => ({
            unidadId: unidad.unidadId,
            equivalencia: unidad.equivalencia === null ? '' : String(unidad.equivalencia),
            notaEquivalencia: unidad.notaEquivalencia ?? '',
          })),
        });
      })
      .catch((fallo) => {
        if (activo) setErrorEdicion(fallo);
      })
      .finally(() => {
        if (activo) setCargandoEdicion(false);
      });
    return () => { activo = false; };
  }, [esEdicion, id]);

  const unidadReferencia = unidades.find(
    (unidad) => String(unidad.id) === String(formulario.unidadReferenciaId),
  );
  const unidadesDisponibles = unidades.filter(
    (unidad) => String(unidad.id) !== String(formulario.unidadReferenciaId),
  );
  const unidadesSeleccionadas = formulario.unidades
    .map((seleccion) => ({
      ...seleccion,
      unidad: unidades.find((unidad) => unidad.id === seleccion.unidadId),
    }))
    .filter((seleccion) => seleccion.unidad);

  function actualizarCampo(campo, valor) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actuales) => {
      if (!actuales[campo]) return actuales;
      const copia = { ...actuales };
      delete copia[campo];
      return copia;
    });
  }

  function cambiarUnidadReferencia(valor) {
    setFormulario((actual) => ({
      ...actual,
      unidadReferenciaId: valor,
      unidades: actual.unidades.filter((unidad) => String(unidad.unidadId) !== String(valor)),
    }));
    setErrores((actuales) => {
      const copia = { ...actuales };
      delete copia.unidadReferenciaId;
      return copia;
    });
  }

  function alternarUnidad(unidadId) {
    setFormulario((actual) => {
      const existe = actual.unidades.some((unidad) => unidad.unidadId === unidadId);
      return {
        ...actual,
        unidades: existe
          ? actual.unidades.filter((unidad) => unidad.unidadId !== unidadId)
          : [...actual.unidades, { unidadId, equivalencia: '', notaEquivalencia: '' }],
      };
    });
    setErrores((actuales) => {
      const copia = { ...actuales };
      for (const clave of Object.keys(copia)) {
        if (clave.startsWith(`unidad-${unidadId}-`)) delete copia[clave];
      }
      return copia;
    });
  }

  function actualizarUnidad(unidadId, campo, valor) {
    setFormulario((actual) => ({
      ...actual,
      unidades: actual.unidades.map((unidad) =>
        unidad.unidadId === unidadId ? { ...unidad, [campo]: valor } : unidad,
      ),
    }));
    setErrores((actuales) => {
      const clave = `unidad-${unidadId}-${campo}`;
      if (!actuales[clave]) return actuales;
      const copia = { ...actuales };
      delete copia[clave];
      return copia;
    });
  }

  async function crearCategoriaInline(evento) {
    evento.preventDefault();
    const nombre = nuevaCategoria.nombre.trim();
    if (!nombre) {
      setNuevaCategoria((actual) => ({ ...actual, error: 'Escriba el nombre de la categoría.' }));
      return;
    }

    setNuevaCategoria((actual) => ({ ...actual, guardando: true, error: null }));
    try {
      const respuesta = await api.crearCategoria({ nombre });
      setCategorias((actual) => ordenarPorNombre([...actual, { ...respuesta.datos, productos: 0 }]));
      setFormulario((actual) => ({ ...actual, categoriaId: String(respuesta.datos.id) }));
      setNuevaCategoria({ abierta: false, nombre: '', error: null, guardando: false });
      toast.exito('Categoría creada y seleccionada.');
    } catch (fallo) {
      setNuevaCategoria((actual) => ({ ...actual, guardando: false, error: fallo.message }));
    }
  }

  async function crearUnidadInline(evento) {
    evento.preventDefault();
    const nombre = nuevaUnidad.nombre.trim();
    const abreviatura = nuevaUnidad.abreviatura.trim();
    if (!nombre || !abreviatura) {
      setNuevaUnidad((actual) => ({
        ...actual,
        error: 'Complete el nombre y la abreviatura de la unidad.',
      }));
      return;
    }

    setNuevaUnidad((actual) => ({ ...actual, guardando: true, error: null }));
    try {
      const respuesta = await api.crearUnidad({ nombre, abreviatura });
      setUnidades((actual) => ordenarPorNombre([...actual, { ...respuesta.datos, productos: 0 }]));
      setFormulario((actual) => ({
        ...actual,
        unidadReferenciaId: String(respuesta.datos.id),
        unidades: actual.unidades.filter(
          (unidad) => unidad.unidadId !== respuesta.datos.id,
        ),
      }));
      setNuevaUnidad({ abierta: false, nombre: '', abreviatura: '', error: null, guardando: false });
      toast.exito('Unidad creada y seleccionada como referencia.');
    } catch (fallo) {
      setNuevaUnidad((actual) => ({ ...actual, guardando: false, error: fallo.message }));
    }
  }

  function validarFormulario() {
    const nuevos = {};

    if (!formulario.nombre.trim()) {
      nuevos.nombre = 'El nombre del producto es obligatorio.';
    } else if (formulario.nombre.trim().length < 2) {
      nuevos.nombre = 'El nombre debe tener al menos 2 caracteres.';
    } else if (formulario.nombre.trim().length > 150) {
      nuevos.nombre = 'El nombre no puede superar 150 caracteres.';
    }

    if (formulario.codigo.trim().length > 40) {
      nuevos.codigo = 'El código no puede superar 40 caracteres.';
    }

    if (!formulario.categoriaId) {
      nuevos.categoriaId = 'Seleccione una categoría.';
    }

    if (!formulario.unidadReferenciaId) {
      nuevos.unidadReferenciaId = 'Seleccione la unidad de referencia.';
    }

    if (formulario.descripcion.trim().length > 1000) {
      nuevos.descripcion = 'La descripción no puede superar 1000 caracteres.';
    }

    for (const seleccion of formulario.unidades) {
      if (seleccion.equivalencia.trim()) {
        const numero = Number(seleccion.equivalencia);
        if (!Number.isFinite(numero) || numero <= 0) {
          nuevos[`unidad-${seleccion.unidadId}-equivalencia`] =
            'Ingrese un número mayor que cero o deje el campo vacío.';
        }
      }
      if (seleccion.notaEquivalencia.length > 200) {
        nuevos[`unidad-${seleccion.unidadId}-notaEquivalencia`] =
          'La nota no puede superar 200 caracteres.';
      }
    }

    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  function construirPayload(confirmarDuplicado = false) {
    return {
      nombre: formulario.nombre.trim(),
      codigo: formulario.codigo.trim() || null,
      descripcion: formulario.descripcion.trim() || null,
      categoriaId: Number(formulario.categoriaId),
      unidadReferenciaId: Number(formulario.unidadReferenciaId),
      esFraccionado: formulario.esFraccionado,
      unidadesComercializacion: formulario.unidades
        .filter((unidad) => String(unidad.unidadId) !== String(formulario.unidadReferenciaId))
        .map((unidad) => ({
          unidadId: unidad.unidadId,
          equivalencia: unidad.equivalencia.trim() ? Number(unidad.equivalencia) : null,
          notaEquivalencia: unidad.notaEquivalencia.trim() || null,
        })),
      confirmarDuplicado,
    };
  }

  function mapearErroresServidor(detalles) {
    const resultado = {};
    for (const [clave, mensaje] of Object.entries(detalles ?? {})) {
      if (clave.startsWith('unidadesComercializacion.')) {
        const partes = clave.split('.');
        const indice = Number(partes[1]);
        const campo = partes[2] ?? 'unidadId';
        const seleccion = formulario.unidades[indice];
        if (seleccion) {
          resultado[`unidad-${seleccion.unidadId}-${campo}`] = mensaje;
        } else {
          resultado.unidades = mensaje;
        }
      } else if (clave === 'id') {
        resultado.general = mensaje;
      } else {
        resultado[clave] = mensaje;
      }
    }
    return resultado;
  }

  async function enviar(confirmarDuplicado = false) {
    if (!confirmarDuplicado && !validarFormulario()) {
      toast.error('Revise los campos señalados antes de continuar.');
      return;
    }

    setEnviando(true);
    try {
      const respuesta = esEdicion
        ? await api.actualizarProducto(id, construirPayload(confirmarDuplicado))
        : await api.crearProducto(construirPayload(confirmarDuplicado));
      setProductoCreado(respuesta.datos);
      setDialogoDuplicado(false);
      setDuplicados([]);
      setErrores({});
      toast.exito(respuesta.mensaje);
    } catch (fallo) {
      if (fallo.codigo === 'POSIBLE_DUPLICADO') {
        setDuplicados(fallo.duplicados);
        setDialogoDuplicado(true);
      } else if (fallo.codigo === 'CODIGO_DUPLICADO') {
        setDialogoDuplicado(false);
        setErrores({ codigo: fallo.message });
        toast.error(fallo.message);
      } else if (fallo.estado === 400 && fallo.detalles) {
        setDialogoDuplicado(false);
        setErrores(mapearErroresServidor(fallo.detalles));
        toast.error('Revise los campos señalados.');
      } else {
        setDialogoDuplicado(false);
        toast.error(fallo.message);
      }
    } finally {
      setEnviando(false);
    }
  }

  function reiniciarFormulario() {
    if (esEdicion) {
      navegar(`/productos/${id}`);
      return;
    }
    setFormulario({ ...FORMULARIO_INICIAL });
    setErrores({});
    setDuplicados([]);
    setDialogoDuplicado(false);
    setProductoCreado(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (productoCreado) {
    return (
      <div className="contenedor pagina pagina--estrecha">
        <section className="tarjeta exito-registro">
          <span className="exito-registro__icono" aria-hidden="true">
            <Icono nombre="checkCirculo" tamano={38} />
          </span>
          <p className="seccion__eyebrow">{esEdicion ? 'Edición completada' : 'Registro completado'}</p>
          <h1 className="titulo-pagina">{esEdicion ? 'Producto actualizado' : 'Producto registrado'}</h1>
          <p className="subtitulo-pagina">
            {esEdicion ? 'Los cambios se guardaron correctamente en PostgreSQL.' : 'La información se guardó correctamente en PostgreSQL y ya forma parte del catálogo.'}
          </p>

          <dl className="resumen-registro">
            <div>
              <dt>Producto</dt>
              <dd>{productoCreado.nombre}</dd>
            </div>
            <div>
              <dt>Código</dt>
              <dd>{productoCreado.codigo ?? 'Sin código'}</dd>
            </div>
            <div>
              <dt>Categoría</dt>
              <dd>{productoCreado.categoria.nombre}</dd>
            </div>
            <div>
              <dt>Unidad de referencia</dt>
              <dd>
                {productoCreado.unidadReferencia.nombre} (
                {productoCreado.unidadReferencia.abreviatura})
              </dd>
            </div>
            <div>
              <dt>ID interno</dt>
              <dd>{productoCreado.id}</dd>
            </div>
            <div>
              <dt>Unidades adicionales</dt>
              <dd>{productoCreado.unidadesComercializacion.length}</dd>
            </div>
          </dl>

          <div className="acciones-en-linea">
            <Link className="boton boton--primario" to={`/productos/${productoCreado.id}`}>
              <Icono nombre="ojo" tamano={18} />
              <span>Ver detalle</span>
            </Link>
            <Boton variante="secundario" icono={esEdicion ? 'flechaIzquierda' : 'registrar'} onClick={reiniciarFormulario}>
              {esEdicion ? 'Volver al detalle' : 'Registrar otro producto'}
            </Boton>
          </div>
        </section>
      </div>
    );
  }

  if (cargandoEdicion) {
    return <div className="contenedor pagina"><p className="actualizando">Cargando producto para editar…</p></div>;
  }

  if (errorEdicion) {
    return (
      <div className="contenedor pagina pagina--estrecha">
        <Alerta tipo="error" titulo="No se pudo cargar el producto para editar">{errorEdicion.message}</Alerta>
        <Link className="boton boton--secundario" to="/catalogo">Volver al catálogo</Link>
      </div>
    );
  }

  return (
    <div className="contenedor pagina pagina--estrecha">
      <header className="cabecera-pagina">
        <div>
          <p className="seccion__eyebrow">{esEdicion ? 'Edición' : 'Registro'}</p>
          <h1 className="titulo-pagina">{esEdicion ? 'Editar producto' : 'Registrar producto'}</h1>
          <p className="subtitulo-pagina">
            {esEdicion ? 'Actualice los datos necesarios. Antes de guardar se comprueban posibles duplicados.' : <>Complete la información básica. Los campos marcados con <strong>*</strong> son obligatorios. Antes de guardar se comprueban posibles duplicados.</>}
          </p>
        </div>
        <Link className="boton boton--secundario" to={esEdicion ? `/productos/${id}` : '/catalogo'}>
          <Icono nombre="catalogo" tamano={18} />
          <span>{esEdicion ? 'Cancelar edición' : 'Ver catálogo'}</span>
        </Link>
      </header>

      {errorCatalogos && (
        <Alerta
          tipo="error"
          titulo="No se pudieron cargar las categorías y unidades"
          accion={
            <Boton
              variante="secundario"
              tamano="sm"
              icono="recargar"
              onClick={() => setRecargaCatalogos((n) => n + 1)}
            >
              Reintentar
            </Boton>
          }
        >
          {errorCatalogos.message}
        </Alerta>
      )}

      {!cargandoCatalogos && !errorCatalogos && (categorias.length === 0 || unidades.length === 0) && (
        <Alerta tipo="advertencia" titulo="Faltan catálogos básicos">
          {categorias.length === 0 && 'No hay categorías registradas. '}
          {unidades.length === 0 && 'No hay unidades de medida registradas. '}
          Puede crearlas desde este mismo formulario con los botones «Nueva».
        </Alerta>
      )}

      <form
        className="formulario"
        onSubmit={(evento) => {
          evento.preventDefault();
          enviar(false);
        }}
        noValidate
      >
        <section className="tarjeta" aria-labelledby="titulo-datos-producto">
          <div className="tarjeta__cabecera tarjeta__cabecera--dividida">
            <div>
              <h2 className="tarjeta__titulo" id="titulo-datos-producto">
                Datos del producto
              </h2>
              <p className="tarjeta__subtitulo">
                El ID interno se genera automáticamente. El código es opcional, pero si se usa
                debe ser único.
              </p>
            </div>
          </div>

          <div className="rejilla-formulario">
            <Campo
              etiqueta="Nombre del producto"
              htmlFor="nombre"
              requerido
              error={errores.nombre}
              ayuda="Use un nombre claro y completo, por ejemplo: «Arena fina»."
              className="campo--completo"
            >
              <input
                id="nombre"
                className={`campo__control ${errores.nombre ? 'campo__control--error' : ''}`}
                type="text"
                value={formulario.nombre}
                onChange={(evento) => actualizarCampo('nombre', evento.target.value)}
                maxLength={150}
                autoFocus
                autoComplete="off"
                aria-invalid={Boolean(errores.nombre)}
              />
            </Campo>

            <Campo
              etiqueta="Código del producto"
              htmlFor="codigo"
              error={errores.codigo}
              ayuda="Opcional. Puede ser un código interno, de proveedor o de barras."
            >
              <input
                id="codigo"
                className={`campo__control ${errores.codigo ? 'campo__control--error' : ''}`}
                type="text"
                value={formulario.codigo}
                onChange={(evento) => actualizarCampo('codigo', evento.target.value)}
                maxLength={40}
                autoComplete="off"
                aria-invalid={Boolean(errores.codigo)}
              />
            </Campo>

            <Campo
              etiqueta="Categoría"
              htmlFor="categoriaId"
              requerido
              error={errores.categoriaId}
            >
              <div className="campo-con-accion">
                <select
                  id="categoriaId"
                  className={`campo__control ${errores.categoriaId ? 'campo__control--error' : ''}`}
                  value={formulario.categoriaId}
                  onChange={(evento) => actualizarCampo('categoriaId', evento.target.value)}
                  disabled={cargandoCatalogos}
                  aria-invalid={Boolean(errores.categoriaId)}
                >
                  <option value="">Seleccione una categoría</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="boton boton--secundario boton--sm"
                  onClick={() =>
                    setNuevaCategoria((actual) => ({ ...actual, abierta: !actual.abierta }))
                  }
                >
                  <Icono nombre="registrar" tamano={16} />
                  <span>Nueva</span>
                </button>
              </div>
              {nuevaCategoria.abierta && (
                <div className="creacion-inline">
                  <label className="visualmente-oculto" htmlFor="nueva-categoria">
                    Nombre de la nueva categoría
                  </label>
                  <input
                    id="nueva-categoria"
                    className="campo__control"
                    type="text"
                    placeholder="Nombre de la categoría"
                    value={nuevaCategoria.nombre}
                    onChange={(evento) =>
                      setNuevaCategoria((actual) => ({
                        ...actual,
                        nombre: evento.target.value,
                        error: null,
                      }))
                    }
                    maxLength={80}
                    autoFocus
                  />
                  <div className="creacion-inline__acciones">
                    <Boton
                      tamano="sm"
                      cargando={nuevaCategoria.guardando}
                      onClick={crearCategoriaInline}
                    >
                      Crear categoría
                    </Boton>
                    <Boton
                      variante="fantasma"
                      tamano="sm"
                      onClick={() =>
                        setNuevaCategoria({
                          abierta: false,
                          nombre: '',
                          error: null,
                          guardando: false,
                        })
                      }
                    >
                      Cancelar
                    </Boton>
                  </div>
                  {nuevaCategoria.error && (
                    <p className="campo__error" role="alert">
                      {nuevaCategoria.error}
                    </p>
                  )}
                </div>
              )}
            </Campo>

            <Campo
              etiqueta="Unidad de referencia"
              htmlFor="unidadReferenciaId"
              requerido
              error={errores.unidadReferenciaId}
              ayuda="Unidad base del producto: unidad, metro, metro cúbico, kilogramo, etc."
            >
              <div className="campo-con-accion">
                <select
                  id="unidadReferenciaId"
                  className={`campo__control ${errores.unidadReferenciaId ? 'campo__control--error' : ''}`}
                  value={formulario.unidadReferenciaId}
                  onChange={(evento) => cambiarUnidadReferencia(evento.target.value)}
                  disabled={cargandoCatalogos}
                  aria-invalid={Boolean(errores.unidadReferenciaId)}
                >
                  <option value="">Seleccione una unidad</option>
                  {unidades.map((unidad) => (
                    <option key={unidad.id} value={unidad.id}>
                      {unidad.nombre} ({unidad.abreviatura})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="boton boton--secundario boton--sm"
                  onClick={() => setNuevaUnidad((actual) => ({ ...actual, abierta: !actual.abierta }))}
                >
                  <Icono nombre="registrar" tamano={16} />
                  <span>Nueva</span>
                </button>
              </div>
              {nuevaUnidad.abierta && (
                <div className="creacion-inline">
                  <div className="creacion-inline__campos">
                    <div>
                      <label className="visualmente-oculto" htmlFor="nueva-unidad-nombre">
                        Nombre de la nueva unidad
                      </label>
                      <input
                        id="nueva-unidad-nombre"
                        className="campo__control"
                        type="text"
                        placeholder="Nombre: por ejemplo, Cubeta"
                        value={nuevaUnidad.nombre}
                        onChange={(evento) =>
                          setNuevaUnidad((actual) => ({
                            ...actual,
                            nombre: evento.target.value,
                            error: null,
                          }))
                        }
                        maxLength={60}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="visualmente-oculto" htmlFor="nueva-unidad-abreviatura">
                        Abreviatura de la nueva unidad
                      </label>
                      <input
                        id="nueva-unidad-abreviatura"
                        className="campo__control"
                        type="text"
                        placeholder="Abreviatura: cubeta"
                        value={nuevaUnidad.abreviatura}
                        onChange={(evento) =>
                          setNuevaUnidad((actual) => ({
                            ...actual,
                            abreviatura: evento.target.value,
                            error: null,
                          }))
                        }
                        maxLength={12}
                      />
                    </div>
                  </div>
                  <div className="creacion-inline__acciones">
                    <Boton tamano="sm" cargando={nuevaUnidad.guardando} onClick={crearUnidadInline}>
                      Crear unidad
                    </Boton>
                    <Boton
                      variante="fantasma"
                      tamano="sm"
                      onClick={() =>
                        setNuevaUnidad({
                          abierta: false,
                          nombre: '',
                          abreviatura: '',
                          error: null,
                          guardando: false,
                        })
                      }
                    >
                      Cancelar
                    </Boton>
                  </div>
                  {nuevaUnidad.error && (
                    <p className="campo__error" role="alert">
                      {nuevaUnidad.error}
                    </p>
                  )}
                </div>
              )}
            </Campo>

            <Campo
              etiqueta="Descripción"
              htmlFor="descripcion"
              error={errores.descripcion}
              ayuda={`Opcional. ${formulario.descripcion.length}/1000 caracteres.`}
              className="campo--completo"
            >
              <textarea
                id="descripcion"
                className={`campo__control campo__control--area ${errores.descripcion ? 'campo__control--error' : ''}`}
                value={formulario.descripcion}
                onChange={(evento) => actualizarCampo('descripcion', evento.target.value)}
                maxLength={1000}
                rows={4}
                aria-invalid={Boolean(errores.descripcion)}
              />
            </Campo>

            <div className="campo campo--completo">
              <label className="opcion-check opcion-check--destacada" htmlFor="esFraccionado">
                <input
                  id="esFraccionado"
                  type="checkbox"
                  checked={formulario.esFraccionado}
                  onChange={(evento) => actualizarCampo('esFraccionado', evento.target.checked)}
                />
                <span className="opcion-check__texto">
                  <strong>Producto fraccionado</strong>
                  <span>
                    Actívelo para productos que se venden en porciones o presentaciones, como
                    arena, grava o tierra blanca.
                  </span>
                </span>
              </label>
            </div>
          </div>
        </section>

        <section className="tarjeta" aria-labelledby="titulo-unidades-comercializacion">
          <div className="tarjeta__cabecera tarjeta__cabecera--dividida">
            <div>
              <h2 className="tarjeta__titulo" id="titulo-unidades-comercializacion">
                Otras unidades de comercialización
              </h2>
              <p className="tarjeta__subtitulo">
                Seleccione las presentaciones adicionales en las que se vende el producto. La
                unidad de referencia ya está incluida.
              </p>
            </div>
          </div>

          {!formulario.unidadReferenciaId ? (
            <Alerta tipo="info" titulo="Seleccione primero la unidad de referencia">
              Después de elegirla podrá agregar otras unidades y, si el negocio ya las confirmó,
              sus equivalencias.
            </Alerta>
          ) : unidadesDisponibles.length === 0 ? (
            <p className="texto-vacio">
              No hay otras unidades disponibles para seleccionar. Puede crear una nueva unidad
              desde el campo «Unidad de referencia».
            </p>
          ) : (
            <>
              <div className="selector-unidades">
                {unidadesDisponibles.map((unidad) => {
                  const seleccionada = formulario.unidades.some(
                    (item) => item.unidadId === unidad.id,
                  );
                  return (
                    <label
                      key={unidad.id}
                      className={`opcion-unidad ${seleccionada ? 'opcion-unidad--activa' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={seleccionada}
                        onChange={() => alternarUnidad(unidad.id)}
                      />
                      <span className="opcion-unidad__nombre">{unidad.nombre}</span>
                      <span className="opcion-unidad__abreviatura">{unidad.abreviatura}</span>
                    </label>
                  );
                })}
              </div>

              {unidadesSeleccionadas.length > 0 && (
                <div className="equivalencias">
                  <div className="equivalencias__cabecera">
                    <h3 className="equivalencias__titulo">Equivalencias (opcional)</h3>
                    <p>
                      Indique cuántas unidades de referencia contiene una unidad adicional. Si no
                      conoce la conversión, deje el campo vacío. No invente equivalencias.
                    </p>
                  </div>

                  {unidadesSeleccionadas.map((seleccion) => (
                    <div className="equivalencia" key={seleccion.unidadId}>
                      <p className="equivalencia__titulo">
                        <strong>{seleccion.unidad.nombre}</strong>{' '}
                        <span>({seleccion.unidad.abreviatura})</span>
                      </p>
                      <div className="equivalencia__campos">
                        <Campo
                          etiqueta={`1 ${seleccion.unidad.abreviatura} =`}
                          htmlFor={`equivalencia-${seleccion.unidadId}`}
                          error={errores[`unidad-${seleccion.unidadId}-equivalencia`]}
                          ayuda={`Cantidad de ${unidadReferencia?.nombre.toLowerCase() ?? 'unidad de referencia'} por cada ${seleccion.unidad.nombre.toLowerCase()}.`}
                        >
                          <div className="campo-con-sufijo">
                            <input
                              id={`equivalencia-${seleccion.unidadId}`}
                              className={`campo__control ${errores[`unidad-${seleccion.unidadId}-equivalencia`] ? 'campo__control--error' : ''}`}
                              type="number"
                              min="0.0001"
                              step="0.0001"
                              value={seleccion.equivalencia}
                              onChange={(evento) =>
                                actualizarUnidad(
                                  seleccion.unidadId,
                                  'equivalencia',
                                  evento.target.value,
                                )
                              }
                              placeholder="Sin confirmar"
                              aria-invalid={Boolean(
                                errores[`unidad-${seleccion.unidadId}-equivalencia`],
                              )}
                            />
                            <span className="campo-con-sufijo__texto">
                              {unidadReferencia?.abreviatura ?? 'und'}
                            </span>
                          </div>
                        </Campo>

                        <Campo
                          etiqueta="Nota de equivalencia"
                          htmlFor={`nota-${seleccion.unidadId}`}
                          error={errores[`unidad-${seleccion.unidadId}-notaEquivalencia`]}
                          ayuda="Opcional. Puede indicar que la conversión está pendiente de confirmar."
                        >
                          <input
                            id={`nota-${seleccion.unidadId}`}
                            className={`campo__control ${errores[`unidad-${seleccion.unidadId}-notaEquivalencia`] ? 'campo__control--error' : ''}`}
                            type="text"
                            maxLength={200}
                            value={seleccion.notaEquivalencia}
                            onChange={(evento) =>
                              actualizarUnidad(
                                seleccion.unidadId,
                                'notaEquivalencia',
                                evento.target.value,
                              )
                            }
                            placeholder="Ejemplo: pendiente de confirmar"
                            aria-invalid={Boolean(
                              errores[`unidad-${seleccion.unidadId}-notaEquivalencia`],
                            )}
                          />
                        </Campo>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <div className="formulario__acciones">
          <p className="formulario__nota">
            Los campos con <strong>*</strong> son obligatorios. El backend vuelve a validar todos
            los datos antes de guardar.
          </p>
          <div className="acciones-en-linea">
            <Boton variante="secundario" onClick={reiniciarFormulario} disabled={enviando}>
              {esEdicion ? 'Cancelar' : 'Limpiar formulario'}
            </Boton>
            <Boton type="submit" icono="guardar" cargando={enviando}>
              {esEdicion ? 'Guardar cambios' : 'Registrar producto'}
            </Boton>
          </div>
        </div>
      </form>

      <ConfirmDialog
        abierto={dialogoDuplicado}
        titulo="Posible producto duplicado"
        textoConfirmar={esEdicion ? 'Guardar de todos modos' : 'Registrar de todos modos'}
        onConfirmar={() => enviar(true)}
        onCancelar={() => setDialogoDuplicado(false)}
        cargando={enviando}
      >
        <p>
          Ya existe un producto con el mismo nombre en esta categoría. Revise la lista antes de
          continuar:
        </p>
        <ul className="lista-duplicados">
          {duplicados.map((producto) => (
            <li key={producto.id}>
              <Link to={`/productos/${producto.id}`} target="_blank" rel="noreferrer">
                {producto.nombre}
              </Link>
              <span>
                {producto.codigo ? `Código ${producto.codigo}` : 'Sin código'} · {producto.categoria}
              </span>
            </li>
          ))}
        </ul>
        <p className="texto-suave">
          Si es un producto legítimamente distinto, puede registrarlo de todos modos. Si es el
          mismo producto, cancele y consulte el existente.
        </p>
      </ConfirmDialog>
    </div>
  );
}
