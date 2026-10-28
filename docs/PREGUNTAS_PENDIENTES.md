# Preguntas pendientes para la ferretería

Estas decisiones no se pueden inventar desde el código. Cada una afecta la forma de cargar y mantener el catálogo. Mientras no se confirmen, el sistema usa el comportamiento indicado en la columna “Hoy”.

---

## 1. Campos obligatorios

| Pregunta | Hoy | Por qué importa |
|---|---|---|
| ¿El **código** debe ser obligatorio? | Opcional | Si se usa, debe ser único. Si se vuelve obligatorio, hay que definirlo para todos los productos existentes. |
| ¿La **descripción** debe ser obligatoria? | Opcional | Una descripción ayuda a distinguir productos parecidos, pero exige más trabajo al registrar. |
| ¿La **categoría** es obligatoria? | Sí | Organiza el catálogo y participa en la detección de duplicados. |
| ¿La **unidad de referencia** es obligatoria? | Sí | Sin unidad no se puede interpretar el producto. |

**Recomendación:** dejar código y descripción opcionales al inicio; exigir código solo si la ferretería ya tiene una nomenclatura estable.

---

## 2. Categorías

Hoy existen 12 categorías iniciales:

Herramientas manuales, Herramientas eléctricas, Materiales de construcción, Áridos y agregados, Plomería, Electricidad, Pinturas y acabados, Tornillería y fijaciones, Jardín y exteriores, Seguridad industrial, Adhesivos y selladores, Ferretería general.

Preguntas:

1. ¿Son las categorías correctas para la operación real?
2. ¿Falta alguna (por ejemplo “Cerraduras”, “Fontanería”, “Herramientas de jardín”)?
3. ¿Sobra alguna?
4. ¿Se permiten subcategorías? Hoy **no**; solo un nivel.
5. ¿Quién puede crear categorías nuevas? Hoy cualquiera desde el formulario, sin autenticación.

**Impacto:** cambiar categorías después requiere actualizar productos y puede afectar la detección de duplicados.

---

## 3. Unidades de medida

Hoy existen 27 unidades genéricas (unidad, pieza, par, docena, ciento, millar, metro, metro cuadrado, metro cúbico, centímetro, milímetro, pulgada, pie, yarda, kilogramo, libra, gramo, quintal, litro, galón, mililitro, saco, bolsa, cubeta, carretillada, rollo, caja).

Preguntas:

1. ¿Las abreviaturas son las que usa la ferretería? (`und`, `pza`, `qq`, `gal`, etc.)
2. ¿Falta alguna presentación (barril, lata, tubo, plancha, lámina, varilla)?
3. ¿Sobra alguna?
4. ¿Se necesita más de 4 decimales de precisión en las equivalencias? Hoy `numeric(14,4)`.
5. ¿Las unidades deben poder renombrarse? Hoy no hay edición; se crean nuevas.

**Impacto:** una unidad mal nombrada se repite en todo el catálogo.

---

## 4. Productos fraccionados y equivalencias

Hoy:

- Un producto puede marcarse como fraccionado.
- Tiene una unidad de referencia.
- Puede tener unidades adicionales de venta.
- La equivalencia es opcional y **no se inventa**.
- `equivalencia = N` significa **1 unidad adicional = N unidades de referencia**.

Preguntas críticas:

1. ¿Cuántos **metros cúbicos** tiene una **cubeta** de arena?
2. ¿Cuántos **metros cúbicos** tiene una **carretillada**?
3. ¿Un **saco** de cemento se vende por peso o por unidad? ¿Tiene equivalencia?
4. ¿La **bolsa** y el **saco** son lo mismo en esta ferretería?
5. ¿Hay productos que se venden por **metro lineal** y también por **pieza**? ¿Cuál es la equivalencia?
6. ¿Las equivalencias cambian con el tiempo o son fijas?
7. ¿Se debe permitir vender una fracción sin equivalencia registrada? Hoy sí: se muestra “pendiente de confirmar”.

**Recomendación:** confirmar las equivalencias con el propietario y registrarlas una por una. No usar conversiones genéricas de internet.

---

## 5. Duplicados

Hoy:

- **Código:** único, sin distinguir mayúsculas ni tildes. Bloqueo duro.
- **Nombre:** se advierte solo si coincide exactamente (normalizado) **y** es la misma categoría. El usuario puede confirmar y crear igual.
- **Nombres parecidos:** no se bloquean.

Preguntas:

1. ¿Es suficiente advertir por nombre exacto + categoría?
2. ¿Se deben advertir nombres **parecidos** (por ejemplo “Tornillo 1/2” y “Tornillo 1/2 pulgada”)?
3. ¿Se debe comparar también la **unidad** o el **código**?
4. ¿Un mismo nombre en **categorías distintas** es un duplicado? Hoy no.
5. ¿Se debe impedir el alta hasta que un encargado revise? Hoy el usuario puede confirmar.
6. ¿El código debe ser único **global** o por categoría? Hoy global.

**Riesgo:** un criterio demasiado estricto bloquea productos legítimos; uno demasiado laxo permite duplicados. Conviene revisar ejemplos reales.

---

## 6. Estado del producto

Hoy:

- `activo` / `inactivo`.
- No se borra.
- El catálogo puede filtrar por estado; por defecto muestra todos.
- Un producto inactivo sigue apareciendo si el filtro es “Todos”.

Preguntas:

1. ¿“Inactivo” significa “ya no se vende”, “descontinuado” o “suspendido temporalmente”?
2. ¿Debe desaparecer de la búsqueda para el personal? Hoy no desaparece; se marca.
3. ¿Se debe impedir registrar una unidad adicional en un producto inactivo? Hoy no.
4. ¿Se necesita un estado “agotado” o “por pedido”? Hoy no existe (y no hay existencias).
5. ¿Se necesita **eliminar** definitivamente? Hoy no hay endpoint de borrado.

---

## 7. Edición y borrado

Hoy:

- Se puede **crear**, **consultar**, **buscar** y **cambiar estado**.
- **No** se puede editar nombre, código, categoría, descripción ni unidades desde la interfaz.
- **No** se puede borrar desde la interfaz.

Preguntas:

1. ¿Se necesita corregir errores de captura? (Muy probable.)
2. ¿Quién puede editar? (Sin autenticación, cualquiera con acceso.)
3. ¿Se debe guardar un historial de cambios?
4. ¿El borrado debe ser lógico (inactivo) o físico?
5. Si se borra físicamente un producto, ¿qué pasa con su código? ¿Se puede reutilizar?

**Recomendación:** agregar edición con auditoría antes de cargar el catálogo definitivo. Mientras tanto, cualquier corrección en la base debe hacerse con respaldo previo.

---

## 8. Búsqueda

Hoy:

- Busca en **nombre** y **código**.
- No distingue mayúsculas, minúsculas ni tildes.
- No busca en descripción.
- No hay sinónimos (“tornillo” ≠ “tornillería”).
- No hay búsqueda por código de barras específica, aunque el código puede contenerlo.

Preguntas:

1. ¿Se debe buscar también en la **descripción**?
2. ¿Se necesitan **sinónimos** o términos locales (“arena” / “árido fino”)?
3. ¿Se usa **lector de código de barras**? Si sí, ¿el código debe ser obligatorio?
4. ¿Se necesita búsqueda por **categoría** dentro de los resultados? Hoy se filtra aparte.
5. ¿El orden por defecto debe ser alfabético o “más reciente”? Hoy alfabético.

---

## 9. Códigos

Hoy:

- Opcional.
- Máximo 40 caracteres.
- Letras, números, espacios, `.`, `_`, `-`, `/`.
- Único global, sin distinguir mayúsculas ni tildes.
- Se muestra tal como se escribió.

Preguntas:

1. ¿La ferretería usa códigos internos, de proveedor o de barras?
2. ¿Puede haber **el mismo código** para productos de proveedores distintos? Hoy no.
3. ¿Se necesita un formato fijo (por ejemplo `FAM-###`)?
4. ¿Se necesita imprimir etiquetas con el código?

---

## 10. Respaldos

Hoy:

- Respaldo manual desde la interfaz o con `npm.cmd run respaldo`.
- Formato *custom* de PostgreSQL.
- Se guarda en `backups/` (excluido de Git).
- No hay respaldo automático programado.
- La restauración es manual y con confirmación.
- Se verificó una restauración en `ferreteria_restauracion`.

Preguntas:

1. ¿Cada cuánto se debe respaldar? (diario, al cerrar, semanal)
2. ¿Dónde se guardará la copia **fuera del equipo**? (USB, NAS, nube privada)
3. ¿Cuántos respaldos se conservan? (30 días, 12 meses)
4. ¿Quién es responsable de verificarlos?
5. ¿Se necesita una tarea programada de Windows?
6. ¿Se debe cifrar el archivo? Hoy no se cifra.
7. ¿Se necesita restaurar desde la interfaz? Hoy **no**, por seguridad.

**Recomendación:** respaldo diario + copia semanal fuera del equipo + prueba mensual de restauración.

---

## 11. Usuarios, red y seguridad

Hoy:

- Sin autenticación.
- Sin roles.
- Pensado para un solo equipo local.
- CORS restringido a `localhost`/`127.0.0.1`.
- Sin HTTPS.

Preguntas:

1. ¿La aplicación se usará en **un solo equipo** o desde varios?
2. Si se usa en red, ¿quién debe poder **registrar**, **cambiar estado** y **generar respaldos**?
3. ¿Se necesita inicio de sesión? ¿Con usuario local o con directorio de Windows?
4. ¿Se necesita HTTPS?
5. ¿Se debe impedir que alguien descargue respaldos sin permiso?

**Advertencia:** mientras no haya autenticación, no exponga el puerto 4000 a internet ni a redes no confiables.

---

## 12. Importación y exportación

Hoy:

- No hay importación CSV.
- No hay exportación CSV/Excel.
- La carga es manual, producto por producto.

Preguntas:

1. ¿Existe un inventario previo en Excel o en otro sistema?
2. ¿Se necesita importar masivamente?
3. ¿Se necesita exportar el catálogo para imprimir o compartir?
4. ¿Qué columnas debe tener el archivo?
5. ¿Cómo se validan duplicados en una importación?

**Recomendación:** si hay más de 100 productos, conviene una importación CSV validada antes de cargar a mano.

---

## 13. Imágenes y códigos de barras

Hoy no hay imágenes ni generación de códigos de barras.

Preguntas:

1. ¿Se necesitan fotos de producto?
2. ¿Se necesita imprimir etiquetas con código de barras?
3. ¿Se escaneará el código para buscar?

Estas funciones cambian el almacenamiento y la interfaz; no están incluidas.

---

## 14. Precios, costos y existencias

**Fuera de alcance por pedido explícito.** El sistema no registra:

- Precios de venta.
- Costos.
- Existencias.
- Movimientos de inventario.
- Proveedores.
- Ventas ni facturación.

Si en el futuro se agregan, requieren un módulo aparte, reglas contables y posiblemente integración con facturación. No se deben simular con campos vacíos.

---

## 15. Volumen y crecimiento

Preguntas:

1. ¿Cuántos productos hay hoy? ¿Cuántos se esperan en 1 año?
2. ¿Cuántas categorías y unidades reales?
3. ¿Con qué frecuencia se agregan productos?
4. ¿Se necesita histórico de precios o solo catálogo?

El diseño actual está probado para miles de productos. Para cientos de miles convendría revisar índices y búsqueda.

---

## 16. Operación y capacitación

Preguntas:

1. ¿Quién cargará los datos?
2. ¿Se necesita un manual impreso de una página?
3. ¿Se necesita capacitación para el personal?
4. ¿Qué hacer si alguien registra un producto con error?
5. ¿Quién revisa los duplicados confirmados?

---

## 17. Decisiones ya tomadas (para no reabrir sin motivo)

| Decisión | Motivo |
|---|---|
| Sin autenticación | Alcance del pedido y uso local |
| Sin ventas, precios, costos, existencias ni proveedores | Pedido explícito |
| Sin borrado desde la interfaz | Evitar pérdida accidental; se usa estado |
| Duplicado de nombre suave | No bloquear productos legítimamente parecidos |
| Código único global | Evitar ambigüedad al buscar |
| Equivalencias opcionales | No inventar conversiones |
| Respaldo real con `pg_dump` | Requisito de verificabilidad |
| Restauración fuera de la interfaz | Evitar sobrescrituras accidentales |
| UI blanca + aqua | Requisito visual |
| Español | Idioma de la ferretería |

---

## 18. Prioridad sugerida

| Prioridad | Tema | Motivo |
|---|---|---|
| Alta | Equivalencias de fraccionados | Afecta la venta real |
| Alta | Edición de productos | Corregir errores de captura |
| Alta | Frecuencia y destino de respaldos | Proteger los datos |
| Media | Categorías y unidades definitivas | Evitar recategorizar después |
| Media | Criterio de duplicados | Calidad del catálogo |
| Media | Importación CSV | Carga inicial eficiente |
| Baja | Imágenes, códigos de barras, etiquetas | Mejora operativa |
| Baja | Usuarios y red | Solo si se sale del equipo único |

---

## 19. Cómo registrar las respuestas

Se recomienda una reunión breve con el propietario de la ferretería y dejar constancia escrita de:

- Lista final de categorías.
- Lista final de unidades y abreviaturas.
- Equivalencias confirmadas, con ejemplo y fecha.
- Campos obligatorios.
- Significado de “inactivo”.
- Responsable y frecuencia de respaldos.
- Si se usará en un equipo o en red.

Cualquier cambio posterior debe acompañarse de un respaldo y de una prueba en `ferreteria_test`.
