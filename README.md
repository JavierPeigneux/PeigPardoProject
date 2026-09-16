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
