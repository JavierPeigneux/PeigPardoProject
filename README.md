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

No incluyas datos identificables o clínicos reales en un repositorio público. Cada descarga contiene la versión de esquema `0.1.0` y puede validarse después contra el modelo de `modelo_bdd_primera_visita.md`.

## Vínculos entre familiares

Al seleccionar hermano o hermana se completan los IDs de los padres del probando, o los progenitores indicados en otro hermano. Se recalculan al registrar o cambiar parentescos, incluso si los padres se añaden después. Madre y padre se enlazan asimismo con los abuelos de su rama. Los IDs enlazados son los números `id_familiar` (01, 02…), estables al cambiar el código del probando.

Las correcciones manuales, incluido borrar un ID, se conservan. Si existen candidatos contradictorios, no se completa ese campo. Hermano/hermana supone ambos progenitores compartidos; para otros casos, corrige los vínculos manualmente.

Pruebas de vínculos con JavaScriptCore en macOS:

```bash
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc family-links.js tests/family-links.js
```
