# Pedigree β — prototipo de primera visita

Formulario estático para probar la recogida de antecedentes familiares en genética oncológica. No hay servidor ni base de datos: el botón final descarga un fichero JSON en el navegador.

## Probar en local

Abrir `index.html` en el navegador es suficiente. Para una experiencia idéntica a producción puede servirse como sitio estático, por ejemplo:

```bash
python3 -m http.server 8080
```

Después abre `http://localhost:8080`.

## Publicar para pruebas en GitHub Pages

1. Crea un repositorio en GitHub y sube estos archivos a la rama principal.
2. En **Settings → Pages**, selecciona **Deploy from a branch**.
3. Selecciona la rama `main` y la carpeta `/ (root)`.
4. GitHub mostrará la URL pública de prueba al completar el despliegue.

No incluyas datos identificables o clínicos reales en un repositorio público. Cada descarga contiene la versión de esquema `0.3.0` y puede validarse después contra el modelo de `modelo_bdd_primera_visita.md`.

## Vínculos entre familiares

Al seleccionar hermano o hermana se completan los IDs de los padres del probando, o los progenitores indicados en otro hermano. Se recalculan al registrar o cambiar parentescos, incluso si los padres se añaden después. Madre y padre se enlazan asimismo con los abuelos de su rama. Los IDs enlazados son los números `id_familiar` (01, 02…), estables al cambiar el código del probando.

Las correcciones manuales, incluido borrar un ID, se conservan. Si existen candidatos contradictorios, no se completa ese campo. Hermano/hermana supone ambos progenitores compartidos; para otros casos, corrige los vínculos manualmente.

Pruebas de vínculos con JavaScriptCore en macOS:

```bash
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc family-links.js tests/family-links.js
```

El diagnóstico se introduce solo como año (AAAA). El JSON guarda `diagnosisYear` como número o `null` si se desconoce, sin inventar día ni mes. La versión de esquema 0.3.0 sustituye el anterior campo `diagnosisDate`. Se comprueba su compatibilidad con nacimiento, defunción, año actual y edad al diagnóstico.

## Importar una historia

En **Gestión → Importar una historia anterior (JSON)** selecciona el archivo y pulsa **Importar historia**. Gestión está disponible también sin familiares registrados. Se admiten las versiones 0.2.0 y 0.3.0; los diagnósticos con fecha completa se convierten al año. Se recuperan los familiares, sus vínculos, los datos clínicos y la gestión. Si ya hay una historia abierta, se pide confirmar su sustitución; cancela y descarga su JSON antes si quieres conservarla. Los archivos con estructura incompatible no modifican la historia; los valores incorrectos se importan para corregirlos. El archivo se procesa en el navegador.

Los años de nacimiento de hijos y progenitores vinculados se comprueban en ambos sentidos, también al importar y antes de guardar. Con solo el año no se puede determinar la edad exacta dentro de ese año.

Pruebas adicionales con JavaScriptCore:

```bash
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc json-import.js tests/json-import.js
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc family-age-validation.js tests/family-age-validation.js
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc diagnosis-validation.js tests/diagnosis-validation.js
```

## Listado de genes HGNC

El campo Gen es opcional y permite buscar por símbolo o nombre en el catálogo local de símbolos aprobados de HGNC. Se guarda el símbolo oficial. Los valores ajenos al catálogo se señalan para corregirlos antes de guardar. Al importar se conservan los símbolos antiguos no reconocidos para revisarlos, y se normalizan las mayúsculas de los reconocidos.

Fuente: [descarga oficial de HGNC](https://www.genenames.org/download/). La fecha, el número de símbolos y la huella del archivo original están en `hgnc-source.json`. El catálogo se distribuye con el formulario y la búsqueda se realiza en el navegador. Para actualizarlo, ejecuta `python3 scripts/update-hgnc.py`.

```bash
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc hgnc-catalog.js gene-selection.js tests/gene-selection.js
```

## Corregir datos importados

La importación admite años, edades, fechas y opciones que necesiten revisión, conservando su valor original para editarlos. Las fechas de diagnóstico antiguas válidas se convierten al año; las incorrectas se mantienen visibles para corregirlas. Se rechazan JSON ilegibles, estructuras incompatibles y familiares con IDs duplicados o no admitidos.

Puedes cambiar de familiar, moverte por cualquier pestaña y usar Anterior/Continuar aunque haya errores. Cada campo incorrecto aparece marcado con su explicación. El listado de incidencias permite saltar directamente al familiar y al campo correspondiente. Las marcas se actualizan al editar. Solo se bloquea Guardar JSON mientras queden errores.

```bash
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc hgnc-catalog.js gene-selection.js diagnosis-validation.js json-import.js history-validation.js tests/history-correction.js
```
