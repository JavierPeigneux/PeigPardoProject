# Modelo de datos — Primera visita de genética oncológica

## 1. Propósito y decisiones de diseño

Este documento transforma `primer_visita.md` en una especificación relacional, preparada para implementarse en **PostgreSQL**. El alcance es una prueba funcional: no se incluyen todavía roles, permisos ni control de acceso por sensibilidad.

Principios aplicados:

- Un familiar se registra una vez y puede tener muchos tumores, estudios genéticos, procedimientos y exposiciones.
- Las relaciones del árbol se guardan como enlaces padre/madre-hijo; no se duplican como campos manuales de parentesco.
- Las listas múltiples se almacenan como filas, no como texto separado por comas ni como JSON.
- Las fechas se guardan con su precisión real: exacta, año, intervalo o desconocida.
- Todo dato clínico relevante conserva origen, fecha de recogida y grado de verificación.
- Los catálogos usan códigos estables. La interfaz muestra etiquetas traducibles, pero la base de datos guarda códigos.

## 2. Convenciones

| Convención | Regla |
| --- | --- |
| Claves | UUID, generado por la base de datos. |
| Fechas | `date` si es exacta; para fechas imprecisas se usan los campos `precision`, `year` y/o intervalo. |
| Ausencia de información | Nunca se codifica como `NULL` sin significado: usar `estado_dato`. `NULL` solo significa «no aplicable todavía / no introducido». |
| Catálogos | Tablas `catalogo_*` con `codigo` inmutable, `etiqueta` y `activo`. |
| Texto libre | Solo para aclaraciones o valores sin estándar; nunca sustituye a un código normalizado. |
| Unidades | Los valores cuantitativos tienen columna de unidad o se fija explícitamente en el modelo. |
| Borrado | Baja lógica (`archived_at`) cuando haga falta; no se borran datos clínicos en cascada. |

### Estados comunes del dato

`CONOCIDO`, `DESCONOCIDO`, `ESTIMADO`, `NO_APLICA`, `NO_PREGUNTADO`, `RECHAZA_RESPONDER`.

`DESCONOCIDO` no equivale a resultado negativo. Por ejemplo, «no constan pólipos» debe ser distinto de «no tuvo pólipos».

### Precisión temporal

`EXACTA` (fecha completa), `MES_ANO`, `ANO`, `INTERVALO`, `DESCONOCIDA`.

Cuando solo se conoce una edad, se conserva como `edad_min_anios` y `edad_max_anios`; si es exacta, ambos valores son iguales. La aplicación puede calcular edades a partir de fechas, pero no debe almacenar esa edad calculada como dato independiente.

## 3. Vista general del modelo

```text
familia 1 ── N miembro_familia N ── 1 persona
                    │
                    ├── N relacion_progenitor_hijo ── N miembro_familia
                    ├── N tumor ── N biomarcador_tumor
                    ├── N estudio_genetico ── N resultado_variante
                    ├── N procedimiento_reduccion_riesgo
                    ├── N exposicion
                    ├── N observacion_fenotipica
                    ├── N muestra_biologica
                    └── N evento_cascada / consentimiento_investigacion

familia 1 ── N visita
visita 1 ── N registro_dato (proveniencia de las observaciones recogidas)
```

## 4. Tablas principales

### 4.1 `familia`

Una unidad familiar/expediente genético. No es necesariamente un hogar.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | UUID PK | |
| `codigo` | varchar(40) único | Identificador operativo, no contiene datos personales. |
| `fecha_apertura` | date | Obligatoria. |
| `observaciones` | text | Opcional. |
| `created_at`, `updated_at` | timestamptz | Auditoría técnica. |

### 4.2 `persona`

Identidad clínica mínima reutilizable. El identificador personal o de historia, si se incorpora en el futuro, debe vivir fuera de este modelo de prueba.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | UUID PK | |
| `alias_referencia` | varchar(120) | Ej.: «tía materna», «hermano mayor». No usar como clave. |
| `sexo_asignado_codigo` | FK catálogo | `FEMENINO`, `MASCULINO`, `INTERSEXUAL`, `DESCONOCIDO`. |
| `identidad_genero_codigo` | FK catálogo, nullable | Declarado solo si procede. |
| `estado_vital_codigo` | FK catálogo | `VIVO`, `FALLECIDO`, `DESCONOCIDO`. |
| `nacimiento_fecha`, `nacimiento_year`, `nacimiento_precision` | date, smallint, código | Una fecha compatible con su precisión. |
| `defuncion_fecha`, `defuncion_year`, `defuncion_precision` | date, smallint, código | Obligatorios solo si `FALLECIDO` y son conocidos. |
| `causa_defuncion_codigo` | FK catálogo, nullable | Si causa tumoral, se enlaza además al tumor correspondiente. |
| `autopsia_codigo` | FK catálogo | `REALIZADA`, `NO_REALIZADA`, `DESCONOCIDA`. |

**No almacenar:** edad actual, edad al fallecimiento, grado de parentesco, línea familiar ni número de hijos como columnas base. Son derivables de fechas y relaciones. Si se declaran como aproximación, se registran como observación con procedencia.

### 4.3 `miembro_familia`

Vincula una persona con una familia y fija su papel dentro del expediente.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | UUID PK | |
| `familia_id` | UUID FK → `familia` | Obligatorio. |
| `persona_id` | UUID FK → `persona` | Obligatorio. |
| `es_probando` | boolean | Solo un probando activo por familia, salvo que se habilite co-probandos. |
| `es_caso_indice` | boolean | Puede haber varios. |
| `estado_vinculo_codigo` | FK catálogo | `BIOLOGICO`, `ADOPTIVO`, `PAREJA`, `DESCONOCIDO`. |
| `notas` | text | Opcional. |

Restricción única: `(familia_id, persona_id)`.

### 4.4 `relacion_progenitor_hijo`

Representa el pedigree. Es la fuente de verdad para parentesco, rama materna/paterna y tamaño de descendencia.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | UUID PK | |
| `progenitor_id` | UUID FK → `miembro_familia` | |
| `hijo_id` | UUID FK → `miembro_familia` | Distinto de `progenitor_id`. |
| `tipo_vinculo_codigo` | FK catálogo | `BIOLOGICO`, `ADOPCION`, `DONACION_GAMETOS`, `GESTACION_SUBROGADA`, `DESCONOCIDO`. |
| `lado_codigo` | FK catálogo | `MATERNO`, `PATERNO`, `NO_APLICA`, `DESCONOCIDO`. |
| `verificacion_codigo` | FK catálogo | |

Restricción única: `(progenitor_id, hijo_id, tipo_vinculo_codigo)`. Una validación de aplicación impide ciclos genealógicos y enlaces entre familias distintas.

### 4.5 `evento_reproductivo`

Registra pérdidas gestacionales y nacimientos cuando sean clínicamente relevantes, sin crear una persona ficticia para cada caso desconocido.

| Campo | Tipo |
| --- | --- |
| `id`, `familia_id`, `progenitor_gestante_id` | UUID / FK |
| `tipo_codigo` | `NACIDO_VIVO`, `ABORTO_ESPONTANEO`, `IVE_ITP`, `OBITO`, `OTRO` |
| `edad_gestacional_semanas` | numeric(4,1) |
| `causa_codigo`, `descripcion_causa` | catálogo / text |
| `hijo_miembro_id` | UUID FK nullable; se informa si existe un nodo individual asociado. |

## 5. Fenotipo tumoral y benigno

### 5.1 `tumor`

Un registro por neoplasia primaria. Una recaída o metástasis se registra en `evento_tumoral`, enlazada al primario, nunca como un segundo tumor primario.

| Campo | Tipo | Regla |
| --- | --- | --- |
| `id`, `miembro_familia_id` | UUID / FK | Obligatorio. |
| `estado_diagnostico_codigo` | catálogo | `CONFIRMADO`, `SOSPECHA`, `DESCARTADO`. |
| `topografia_cieo3_codigo` | varchar(10) | CIE-O-3, obligatoria si confirmado/sospecha. |
| `morfologia_cieo3_codigo` | varchar(10), nullable | Incluye comportamiento cuando proceda. |
| `sublocalizacion_codigo` | FK catálogo, nullable | Dependiente de la topografía. |
| `lateralidad_codigo` | FK catálogo | `DERECHA`, `IZQUIERDA`, `BILATERAL`, `NO_APLICA`, `DESCONOCIDA`. |
| `diagnostico_fecha`, `diagnostico_year`, `diagnostico_precision` | temporal | |
| `edad_min_anios`, `edad_max_anios` | smallint | Alternativa o complemento a fecha estimada. |
| `grado_codigo`, `estadio_codigo` | FK catálogo, nullable | Estadio con sistema y edición documentados. |
| `verificacion_codigo` | FK catálogo | Anatomía patológica, informe clínico, certificado, relato familiar. |

### 5.2 `evento_tumoral`

| Campo | Tipo |
| --- | --- |
| `id`, `tumor_id` | UUID / FK |
| `tipo_codigo` | `PRIMARIO`, `RECIDIVA_LOCAL`, `METASTASIS`, `PROGRESION` |
| `fecha`, `year`, `precision` | temporal |
| `localizacion_codigo` | catálogo, nullable |
| `descripcion` | text, nullable |

Para tumores primarios sincrónicos o metacrónicos se crean dos filas en `tumor`; la relación temporal se puede inferir con las fechas. Si se necesita, se añade un `grupo_primarios_id`.

### 5.3 `biomarcador_tumor`

Tabla extensible para RE/RP/HER2/Ki-67, MMR, MSI, BRAF, MLH1, Gleason, ISUP, HRD, etc.

| Campo | Tipo |
| --- | --- |
| `id`, `tumor_id` | UUID / FK |
| `biomarcador_codigo` | FK catálogo |
| `resultado_codigo` | FK catálogo, nullable |
| `valor_numerico`, `unidad_codigo` | numeric / FK, nullable |
| `metodo_codigo` | FK catálogo, nullable |
| `fecha_resultado`, `verificacion_codigo` | date / FK |

Restricción única sugerida: `(tumor_id, biomarcador_codigo, metodo_codigo, fecha_resultado)`.

### 5.4 `observacion_fenotipica`

Sustituye los grandes grupos de casillas de estigmas, pólipos, manifestaciones SNC y patología benigna. Cada fila expresa un hallazgo o una ausencia comprobada.

| Campo | Tipo |
| --- | --- |
| `id`, `miembro_familia_id` | UUID / FK |
| `fenotipo_codigo` | SNOMED CT / HPO / catálogo interno mapeado |
| `estado_codigo` | `PRESENTE`, `AUSENTE`, `SOSPECHA`, `SIN_ESTUDIO`, `DESCONOCIDO` |
| `inicio_edad_min`, `inicio_edad_max` | smallint, nullable |
| `cantidad_min`, `cantidad_max`, `unidad_codigo` | numérico / FK, nullable |
| `histologia_codigo`, `verificacion_codigo`, `notas` | códigos / text |

Los pólipos se almacenan como observaciones, indicando tipo histológico y carga. Si en el futuro se necesita cada endoscopia individual, se añade `procedimiento_diagnostico` y se enlazan las observaciones.

## 6. Genética y muestras

### 6.1 `estudio_genetico`

Un familiar puede tener varios estudios. Un resultado negativo es una fila de estudio sin filas en `resultado_variante`, con su resultado global definido.

| Campo | Tipo |
| --- | --- |
| `id`, `miembro_familia_id` | UUID / FK |
| `finalidad_codigo` | `CASO_INDICE`, `CASCADA`, `DIAGNOSTICO`, `INCIDENTAL`, `OTRA` |
| `estado_codigo` | `EN_PROCESO`, `FINALIZADO`, `NO_DISPONIBLE` |
| `resultado_global_codigo` | `POSITIVO`, `VUS`, `NEGATIVO_INFORMATIVO`, `NEGATIVO_NO_INFORMATIVO`, `NO_CONCLUYENTE` |
| `fecha_informe`, `laboratorio`, `tecnologia_codigo` | date / text / FK |
| `num_genes`, `panel_nombre`, `informe_referencia` | integer / text / varchar |

### 6.2 `resultado_variante`

Una fila por variante comunicada en un estudio; evita limitar el resultado a un único gen.

| Campo | Tipo | Regla |
| --- | --- | --- |
| `id`, `estudio_genetico_id` | UUID / FK | |
| `gen_hgnc_id`, `gen_simbolo` | varchar | Validado contra catálogo HGNC. |
| `transcrito_refseq` | varchar | Ej. `NM_007294.4`. |
| `hgvs_c`, `hgvs_p`, `hgvs_g` | varchar | Validación de formato HGVS. |
| `tipo_alteracion_codigo`, `cigocidad_codigo` | FK | |
| `clasificacion_acmg_codigo` | FK | Clase 1–5. |
| `fecha_clasificacion` | date | |
| `clinvar_variation_id` | integer, nullable | |
| `estado_herencia_codigo` | FK, nullable | `GERMINAL`, `SOMATICA`, `NO_DETERMINADA`. |

### 6.3 `muestra_biologica`

| Campo | Tipo |
| --- | --- |
| `id`, `miembro_familia_id` | UUID / FK |
| `tipo_muestra_codigo` | Sangre, saliva, ADN, FFPE, fresco, PBMC… |
| `estado_disponibilidad_codigo` | `DISPONIBLE`, `NO_DISPONIBLE`, `DESCONOCIDO` |
| `institucion`, `referencia_biobanco` | text / varchar |
| `fecha_recogida`, `notas` | date / text |

El PRS no debe formar parte de una variante: usar `resultado_prs` (`miembro_familia_id`, modelo/versión, score, percentil, población de referencia, fecha).

## 7. Prevención, exposiciones y antecedentes reproductivos

### 7.1 `procedimiento_reduccion_riesgo`

Una fila por intervención. Sustituye columnas separadas para MRR, RRSO, colectomía, tiroidectomía, etc.

| Campo | Tipo |
| --- | --- |
| `id`, `miembro_familia_id` | UUID / FK |
| `tipo_codigo` | `MASTECTOMIA`, `RRSO`, `SALPINGECTOMIA`, `HISTERECTOMIA`, `COLECTOMIA`, `GASTRECTOMIA`, `TIROIDECTOMIA`, `OTRO` |
| `objetivo_codigo` | `PROFILACTICO`, `TERAPEUTICO`, `MIXTO`, `DESCONOCIDO` |
| `fecha`, `year`, `precision` | temporal |
| `edad_min_anios`, `edad_max_anios` | smallint |
| `lateralidad_codigo`, `tecnica_codigo` | FK, nullable |
| `hallazgo_patologico_codigo` | FK, nullable |
| `verificacion_codigo`, `notas` | FK / text |

La quimioprevención se guarda en `tratamiento_preventivo` (`farmaco_codigo`, dosis opcional, unidad, fecha_inicio, fecha_fin, adherencia/estado), no en una lista única.

### 7.1b `tratamiento_preventivo`

| Campo | Tipo |
| --- | --- |
| `id`, `miembro_familia_id` | UUID / FK |
| `farmaco_codigo` | FK catálogo; p. ej., tamoxifeno, raloxifeno, inhibidor de aromatasa, aspirina. |
| `objetivo_codigo` | `QUIMIOPREVENCION`, `OTRO`. |
| `dosis_valor`, `dosis_unidad_codigo` | numeric / FK, nullable |
| `fecha_inicio`, `fecha_fin`, `estado_codigo` | date / date / FK |
| `verificacion_codigo`, `notas` | FK / text |

### 7.2 `exposicion`

| Campo | Tipo |
| --- | --- |
| `id`, `miembro_familia_id` | UUID / FK |
| `agente_codigo` | Tabaco, alcohol, amianto, sílice, radón, benceno, radiación… |
| `contexto_codigo` | `LABORAL`, `AMBIENTAL`, `MEDICO`, `ESTILO_VIDA` |
| `estado_codigo` | `PRESENTE`, `AUSENTE`, `DESCONOCIDO` |
| `inicio_edad_min`, `fin_edad_max`, `duracion_meses` | numéricos, nullable |
| `intensidad_valor`, `intensidad_unidad_codigo` | opcionales; p. ej., paquetes-año. |
| `ocupacion_isco08_codigo`, `notas` | nullable |

El IMC, menarquia, menopausia, paridad, primer parto, lactancia, THS y anticoncepción se modelan como `dato_reproductivo` con `tipo_codigo`, valor numérico/unidad o resultado de catálogo y su periodo. Así se evita añadir columnas al cambiar el cuestionario.

## 8. Seguimiento familiar e investigación

### 8.1 `evento_cascada`

Historial, no estado sobrescrito. La pantalla puede mostrar el último evento como estado actual.

| Campo | Tipo |
| --- | --- |
| `id`, `miembro_familia_id` | UUID / FK |
| `fecha` | date |
| `estado_codigo` | Pendiente informar, informado, cita solicitada, asesorado/testado, rechazo… |
| `via_comunicacion_codigo` | Probando, carta, contacto clínico autorizado, telemática, sin contacto. |
| `barrera_codigo` | FK nullable; varias barreras = varias filas en `barrera_cascada`. |
| `notas` | text |

### 8.2 `consentimiento_investigacion`

| Campo | Tipo |
| --- | --- |
| `id`, `miembro_familia_id` | UUID / FK |
| `ambito_codigo` | `CONTACTO`, `MUESTRAS`, `DATOS`, `RECONTACTO` |
| `decision_codigo` | `OTORGADO`, `DENEGADO`, `PENDIENTE`, `REVOCADO` |
| `fecha_decision`, `fecha_fin` | date |
| `documento_referencia` | varchar, nullable |

El derecho a no saber se registra como consentimiento de ámbito `INFORMACION_GENETICA`, decisión `DENEGADO`, junto con su fecha; no como un booleano sin historial.

## 9. Proveniencia y visitas

### 9.1 `visita`

| Campo | Tipo |
| --- | --- |
| `id`, `familia_id` | UUID / FK |
| `fecha` | timestamptz |
| `tipo_codigo` | `PRIMERA_VISITA`, `SEGUIMIENTO`, `ACTUALIZACION_FAMILIAR` |
| `profesional_referencia` | varchar(100) |
| `notas` | text |

### 9.2 `registro_dato`

Tabla de proveniencia aplicable a cualquier entidad clínica. Se vincula mediante `entidad_tipo` + `entidad_id` o, si se usa un ORM, mediante tablas de auditoría por entidad.

| Campo | Tipo |
| --- | --- |
| `id`, `visita_id` | UUID / FK |
| `entidad_tipo`, `entidad_id` | varchar / UUID |
| `campo` | varchar |
| `fuente_codigo` | `INFORME_AP`, `INFORME_CLINICO`, `CERTIFICADO`, `RELATO_FAMILIAR`, `AUTODECLARADO`, `OTRA` |
| `verificacion_codigo`, `registrado_at` | FK / timestamptz |

Para una primera implementación pequeña, `visita_id`, `fuente_codigo` y `verificacion_codigo` pueden residir directamente en cada tabla clínica. Cuando se necesite granularidad por campo, se activa `registro_dato`.

## 10. Catálogos mínimos

Todos tienen estructura: `codigo varchar(50) PK`, `etiqueta varchar(200)`, `descripcion text`, `activo boolean`, `orden smallint`.

| Catálogo | Uso |
| --- | --- |
| `catalogo_estado_dato` | Conocido, desconocido, estimado… |
| `catalogo_verificacion` | Anatomía patológica, informe clínico, certificado, relato… |
| `catalogo_topografia_cieo3`, `catalogo_morfologia_cieo3` | Tumores. |
| `catalogo_fenotipo` | HPO/SNOMED mapeado. |
| `catalogo_biomarcador`, `catalogo_resultado_biomarcador` | Biomarcadores. |
| `catalogo_gen`, `catalogo_tecnologia_genetica`, `catalogo_clasificacion_acmg` | Genética. |
| `catalogo_procedimiento`, `catalogo_exposicion`, `catalogo_farmaco` | Prevención y exposoma. |
| `catalogo_ocupacion_isco08` | Ocupación. |

No crear un campo `enum` de PostgreSQL para catálogos clínicos que vayan a evolucionar: las tablas de catálogo se versionan y se mantienen sin cambiar el esquema.

## 11. Reglas de negocio obligatorias

1. Un `miembro_familia` solo puede enlazarse con miembros de su misma `familia`.
2. No puede haber ciclos en `relacion_progenitor_hijo`.
3. Si `persona.estado_vital_codigo = FALLECIDO`, no se permiten valores de «edad actual» manuales; la edad se calcula desde nacimiento/defunción si es posible.
4. Una metástasis o recaída debe tener `tumor_id` de un primario ya existente.
5. `resultado_variante` solo puede existir cuando su `estudio_genetico.estado_codigo = FINALIZADO`.
6. Si el resultado global es `NEGATIVO_*`, no se permiten variantes patogénicas asociadas; las variantes benignas/VUS se permiten si el informe las comunica.
7. La opción «ninguna» en catálogos multivalor se representa por una ausencia comprobada (`estado_codigo = AUSENTE`), nunca coexistiendo con exposiciones/hallazgos presentes.
8. Las fechas y edades deben ser compatibles: no nacimiento posterior a defunción, diagnóstico ni procedimiento; rango mínimo ≤ máximo.
9. Las columnas `*_codigo` deben validar contra su catálogo; las etiquetas de interfaz no se guardan como valor clínico.

## 12. DDL inicial de PostgreSQL

Este DDL crea el núcleo. Los catálogos se cargan mediante migraciones/seed separados.

```sql
create extension if not exists pgcrypto;

create table familia (
  id uuid primary key default gen_random_uuid(),
  codigo varchar(40) not null unique,
  fecha_apertura date not null default current_date,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table persona (
  id uuid primary key default gen_random_uuid(),
  alias_referencia varchar(120),
  sexo_asignado_codigo varchar(50) not null,
  identidad_genero_codigo varchar(50),
  estado_vital_codigo varchar(50) not null,
  nacimiento_fecha date,
  nacimiento_year smallint check (nacimiento_year between 1850 and 2200),
  nacimiento_precision varchar(20) not null default 'DESCONOCIDA',
  defuncion_fecha date,
  defuncion_year smallint check (defuncion_year between 1850 and 2200),
  defuncion_precision varchar(20) not null default 'DESCONOCIDA',
  causa_defuncion_codigo varchar(50),
  autopsia_codigo varchar(50) not null default 'DESCONOCIDA',
  check (defuncion_fecha is null or nacimiento_fecha is null or defuncion_fecha >= nacimiento_fecha)
);

create table miembro_familia (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references familia(id),
  persona_id uuid not null references persona(id),
  es_probando boolean not null default false,
  es_caso_indice boolean not null default false,
  estado_vinculo_codigo varchar(50) not null default 'BIOLOGICO',
  notas text,
  unique (familia_id, persona_id)
);
create unique index un_probando_por_familia
  on miembro_familia (familia_id) where es_probando;

create table relacion_progenitor_hijo (
  id uuid primary key default gen_random_uuid(),
  progenitor_id uuid not null references miembro_familia(id),
  hijo_id uuid not null references miembro_familia(id),
  tipo_vinculo_codigo varchar(50) not null,
  lado_codigo varchar(50) not null default 'DESCONOCIDO',
  verificacion_codigo varchar(50) not null default 'RELATO_FAMILIAR',
  check (progenitor_id <> hijo_id),
  unique (progenitor_id, hijo_id, tipo_vinculo_codigo)
);

create table tumor (
  id uuid primary key default gen_random_uuid(),
  miembro_familia_id uuid not null references miembro_familia(id),
  estado_diagnostico_codigo varchar(50) not null,
  topografia_cieo3_codigo varchar(10),
  morfologia_cieo3_codigo varchar(10),
  sublocalizacion_codigo varchar(50),
  lateralidad_codigo varchar(50) not null default 'DESCONOCIDA',
  diagnostico_fecha date,
  diagnostico_year smallint check (diagnostico_year between 1850 and 2200),
  diagnostico_precision varchar(20) not null default 'DESCONOCIDA',
  edad_min_anios smallint check (edad_min_anios between 0 and 125),
  edad_max_anios smallint check (edad_max_anios between 0 and 125),
  grado_codigo varchar(50),
  estadio_codigo varchar(50),
  verificacion_codigo varchar(50) not null,
  check (edad_max_anios is null or edad_min_anios is null or edad_min_anios <= edad_max_anios)
);

create table biomarcador_tumor (
  id uuid primary key default gen_random_uuid(),
  tumor_id uuid not null references tumor(id),
  biomarcador_codigo varchar(50) not null,
  resultado_codigo varchar(50),
  valor_numerico numeric(12,4),
  unidad_codigo varchar(30),
  metodo_codigo varchar(50),
  fecha_resultado date,
  verificacion_codigo varchar(50) not null
);

create table estudio_genetico (
  id uuid primary key default gen_random_uuid(),
  miembro_familia_id uuid not null references miembro_familia(id),
  finalidad_codigo varchar(50) not null,
  estado_codigo varchar(50) not null,
  resultado_global_codigo varchar(50),
  fecha_informe date,
  laboratorio text,
  tecnologia_codigo varchar(50),
  num_genes integer check (num_genes > 0),
  panel_nombre text,
  informe_referencia varchar(100)
);

create table resultado_variante (
  id uuid primary key default gen_random_uuid(),
  estudio_genetico_id uuid not null references estudio_genetico(id),
  gen_hgnc_id varchar(20),
  gen_simbolo varchar(30) not null,
  transcrito_refseq varchar(40),
  hgvs_c varchar(200),
  hgvs_p varchar(200),
  hgvs_g varchar(200),
  tipo_alteracion_codigo varchar(50),
  cigocidad_codigo varchar(50),
  clasificacion_acmg_codigo varchar(30) not null,
  fecha_clasificacion date,
  clinvar_variation_id integer,
  estado_herencia_codigo varchar(50)
);

create table procedimiento_reduccion_riesgo (
  id uuid primary key default gen_random_uuid(),
  miembro_familia_id uuid not null references miembro_familia(id),
  tipo_codigo varchar(50) not null,
  objetivo_codigo varchar(50) not null,
  fecha date,
  fecha_year smallint check (fecha_year between 1850 and 2200),
  fecha_precision varchar(20) not null default 'DESCONOCIDA',
  lateralidad_codigo varchar(50),
  tecnica_codigo varchar(50),
  hallazgo_patologico_codigo varchar(50),
  verificacion_codigo varchar(50) not null,
  notas text
);

create table tratamiento_preventivo (
  id uuid primary key default gen_random_uuid(),
  miembro_familia_id uuid not null references miembro_familia(id),
  farmaco_codigo varchar(50) not null,
  objetivo_codigo varchar(50) not null default 'QUIMIOPREVENCION',
  dosis_valor numeric(12,4),
  dosis_unidad_codigo varchar(30),
  fecha_inicio date,
  fecha_fin date,
  estado_codigo varchar(50) not null,
  verificacion_codigo varchar(50) not null,
  notas text,
  check (fecha_fin is null or fecha_inicio is null or fecha_fin >= fecha_inicio)
);

create table exposicion (
  id uuid primary key default gen_random_uuid(),
  miembro_familia_id uuid not null references miembro_familia(id),
  agente_codigo varchar(50) not null,
  contexto_codigo varchar(50) not null,
  estado_codigo varchar(50) not null,
  inicio_edad_min smallint check (inicio_edad_min between 0 and 125),
  fin_edad_max smallint check (fin_edad_max between 0 and 125),
  duracion_meses integer check (duracion_meses >= 0),
  intensidad_valor numeric(12,4),
  intensidad_unidad_codigo varchar(30),
  ocupacion_isco08_codigo varchar(10),
  notas text
);
```

## 13. Plan de implementación

1. Crear migraciones del DDL núcleo y catálogos mínimos.
2. Construir primero el formulario de árbol, tumores y estudios genéticos: son los datos de mayor rendimiento clínico.
3. Implementar reglas de visibilidad en interfaz como ayuda, pero repetir siempre las validaciones en servidor/base de datos.
4. Importar datos de prueba con una plantilla CSV por tabla, nunca con un único Excel plano.
5. Añadir procedimientos, exposiciones, fenotipo y enrolamiento en iteraciones posteriores.

## 14. Campos del documento original que cambian de forma

| Campo original | Modelo propuesto |
| --- | --- |
| ID Padre / ID Madre | Filas en `relacion_progenitor_hijo`. |
| Parentesco exacto, grado y línea familiar | Vista calculada desde el árbol; etiqueta manual solo como ayuda visual. |
| Edad actual / al fallecimiento | Calculada desde las fechas; rango de edad solo cuando la fecha es imprecisa. |
| `[+ Añadir Tumor]` | Filas en `tumor`; recaídas/metástasis en `evento_tumoral`. |
| Biomarcadores por órgano | Filas normalizadas en `biomarcador_tumor`. |
| Checkboxes de estigmas, pólipos y exposiciones | Filas en `observacion_fenotipica` o `exposicion`. |
| `[+ Añadir Estudio Genético]` | `estudio_genetico` + una o más filas en `resultado_variante`. |
| Cirugías preventivas y quimioprevención | Filas en `procedimiento_reduccion_riesgo` / `tratamiento_preventivo`. |
| Estado de cascada y derecho a no saber | Historial en `evento_cascada` y `consentimiento_investigacion`. |
