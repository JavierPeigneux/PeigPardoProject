const COURSE_LABELS = {
  "member-switch": {},
  "relationship": {
    "": "Selecciona…",
    "madre": "Madre",
    "padre": "Padre",
    "hermana": "Hermana",
    "hermano": "Hermano",
    "hija": "Hija",
    "hijo": "Hijo",
    "abuela_materna": "Abuela materna",
    "abuelo_materno": "Abuelo materno",
    "abuela_paterna": "Abuela paterna",
    "abuelo_paterno": "Abuelo paterno",
    "tia_tio": "Tía / tío",
    "prima_primo": "Prima / primo",
    "medio_hermano_materno": "Medio hermano/a materno",
    "medio_hermano_paterno": "Medio hermano/a paterno",
    "bisabuelo_materno": "Bisabuelo/a materno",
    "bisabuelo_paterno": "Bisabuelo/a paterno",
    "sobrino": "Sobrino/a",
    "nieto": "Nieto/a",
    "pareja": "Pareja / cónyuge",
    "otro": "Otro"
  },
  "line": {
    "desconocida": "Desconocida",
    "materna": "Materna",
    "paterna": "Paterna",
    "ambas": "Ambas"
  },
  "sex": {
    "desconocido": "Desconocido",
    "femenino": "Femenino",
    "masculino": "Masculino",
    "intersexual": "Intersexual"
  },
  "gender": {
    "desconocida": "Desconocida",
    "mujer": "Mujer",
    "hombre": "Hombre",
    "no_binaria": "No binaria",
    "otra": "Otra",
    "no_responde": "Prefiere no responder"
  },
  "vitalStatus": {
    "desconocido": "Desconocido",
    "vivo": "Vivo",
    "fallecido": "Fallecido"
  },
  "deathCause": {
    "desconocida": "Desconocida",
    "cancer": "Cáncer",
    "cardiovascular": "Enfermedad cardiovascular",
    "cerebrovascular": "Enfermedad cerebrovascular",
    "infeccion": "Infección",
    "respiratoria": "Causa respiratoria",
    "traumatismo": "Traumatismo / accidente",
    "subita": "Muerte súbita inexplicada",
    "natural": "Causa natural",
    "otra": "Otra"
  },
  "skinFindings": {
    "desconocido": "Desconocido",
    "ausente": "Ausentes",
    "presente": "Presentes"
  },
  "benignFindings": {
    "desconocido": "Desconocido",
    "ausente": "Ausentes",
    "presente": "Presentes"
  },
  "smoking": {
    "desconocido": "Desconocido",
    "nunca": "Nunca fumador",
    "activo": "Fumador activo",
    "exfumador": "Exfumador"
  },
  "alcohol": {
    "desconocido": "Desconocido",
    "no": "No",
    "si": "Sí"
  },
  "consent": {
    "desconocido": "Desconocido",
    "diagnostico": "Uso diagnóstico",
    "investigacion": "Autoriza investigación",
    "sin_consentimiento": "Sin consentimiento"
  },
  "nature": {
    "primario_unico": "Primario único",
    "primario_sincronico": "Primario sincrónico",
    "primario_metacronico": "Primario metacrónico",
    "recaida_metastasis": "Recaída / metástasis"
  },
  "laterality": {
    "desconocida": "Desconocida",
    "no_aplica": "No aplica",
    "derecha": "Derecha",
    "izquierda": "Izquierda",
    "bilateral": "Bilateral",
    "bilateral_sincronica": "Bilateral sincrónica",
    "bilateral_metacronica": "Bilateral metacrónica"
  },
  "verification": {
    "relato_familiar": "Relato familiar",
    "informe_clinico": "Informe clínico",
    "anatomia_patologica": "Anatomía patológica",
    "certificado_defuncion": "Certificado de defunción"
  },
  "purpose": {
    "caso_indice": "Caso índice",
    "cascada": "Estudio en cascada",
    "diagnostico": "Diagnóstico",
    "incidental": "Hallazgo incidental",
    "desconocida": "Desconocida"
  },
  "result": {
    "positivo": "Positivo",
    "vus": "VUS",
    "negativo_informativo": "Negativo informativo",
    "negativo_no_informativo": "Negativo no informativo",
    "no_concluyente": "No concluyente",
    "no_disponible": "No disponible"
  },
  "classification": {
    "": "Sin clasificar",
    "clase_5_patogenica": "Clase 5 · Patogénica",
    "clase_4_probablemente_patogenica": "Clase 4 · Probablemente patogénica",
    "clase_3_vus": "Clase 3 · VUS",
    "clase_2_probablemente_benigna": "Clase 2 · Probablemente benigna",
    "clase_1_benigna": "Clase 1 · Benigna"
  }
};
const COURSE_SECTIONS = { 1: 'Linaje', 2: 'Datos demográficos', 3: 'Antecedentes tumorales', 4: 'Fenotipo', 5: 'Antecedentes de estudio genético', 6: 'Prevención', 7: 'Exposiciones y antecedentes hormonales', 8: 'Comunicación y gestión de este familiar' };
function courseLabel(key, value) {
  if (value == null || value === '') return '';
  return COURSE_LABELS[key]?.[String(value)] || String(value).replace(/_/g, ' ');
}
function courseAdvanced(type, values, step) {
  return advancedDefinitions(type, step).filter(field => hasAdvancedValue(values?.[field.key])).map(field => `${field.label}: ${advancedDisplay(field, values[field.key])}.`).join(' ');
}
function generateClinicalCourse(history, issues = []) {
  const paragraphs = [`HISTORIA FAMILIAR${history.familyCode ? ' — ' + history.familyCode : ''}`, `Visita: ${history.visitDate || 'fecha no registrada'}.`];
  if (issues.length) paragraphs.push(`BORRADOR: ${issues.length} ${issues.length === 1 ? 'campo pendiente' : 'campos pendientes'} de revisión. Los datos siguientes se transcriben según el registro y pueden contener incoherencias.`);
  if (!history.members.length) paragraphs.push('No hay familiares registrados.');
  for (const member of history.members) {
    paragraphs.push(`Familiar ${member.id}${member.alias ? ' · ' + member.alias : ''}${member.relationship ? ' (' + courseLabel('relationship', member.relationship) + ')' : ''}`);
    const vital = [];
    if (member.line && member.line !== 'desconocida') vital.push(`Línea familiar ${courseLabel('line', member.line).toLowerCase()}.`);
    if (member.birthYear) vital.push(`Año de nacimiento: ${member.birthYear}.`);
    if (member.sex && member.sex !== 'desconocido') vital.push(`Sexo asignado al nacer: ${courseLabel('sex', member.sex).toLowerCase()}.`);
    if (member.gender && member.gender !== 'desconocida') vital.push(`Identidad de género: ${courseLabel('gender', member.gender).toLowerCase()}.`);
    vital.push(`Estado vital: ${courseLabel('vitalStatus', member.vitalStatus) || 'desconocido'}.`);
    if (member.deathYear) vital.push(`Año de defunción registrado: ${member.deathYear}.`);
    if (member.vitalStatus === 'fallecido' && member.deathCause && member.deathCause !== 'desconocida') vital.push(`Causa de defunción: ${courseLabel('deathCause', member.deathCause)}.`);
    for (const [key, label] of [['fatherId', 'Padre'], ['motherId', 'Madre']]) if (member[key]) {
      const relative = history.members.find(m => m.id === member[key]);
      vital.push(`${label}: familiar ${member[key]}${relative?.alias ? ' (' + relative.alias + ')' : ''}.`);
    }
    if (member.organs) vital.push(`Órganos relevantes registrados: ${member.organs}.`);
    paragraphs.push(vital.join(' '));
    for (const step of [1, 2, 3]) { const text = courseAdvanced('member', member.advanced, step); if (text) paragraphs.push(`${COURSE_SECTIONS[step]}: ${text}`); }
    if (!member.tumors.length && member.advanced?.malignancyHistory !== 'no') paragraphs.push('No hay neoplasias registradas; esto no confirma su ausencia.');
    [...member.tumors].sort((a, b) => (Number(a.diagnosisYear) || Infinity) - (Number(b.diagnosisYear) || Infinity)).forEach((tumor, index) => {
      const parts = [];
      if (tumor.advanced?.malignancy === 'no') parts.push(`Registro tumoral ${index + 1}: se ha indicado ausencia de neoplasia maligna.`);
      else parts.push(`${tumor.diagnosisYear ? 'En ' + tumor.diagnosisYear : 'Sin año de diagnóstico registrado'}, consta una neoplasia${tumor.site ? ' de ' + tumor.site.replace(/^C[\d.]+\s*·\s*/, '') : ' de localización no especificada'}${tumor.ageAtDiagnosis !== '' && tumor.ageAtDiagnosis != null ? ', con edad al diagnóstico de ' + tumor.ageAtDiagnosis + ' años' : ''}.`);
      if (tumor.nature) parts.push(`Naturaleza: ${courseLabel('nature', tumor.nature)}.`);
      if (tumor.laterality && tumor.laterality !== 'desconocida') parts.push(`Lateralidad: ${courseLabel('laterality', tumor.laterality)}.`);
      if (tumor.verification) parts.push(`Fuente: ${courseLabel('verification', tumor.verification)}.`);
      if (tumor.organCheck) parts.push(`Comprobación anatómica: ${tumor.organCheck}.`);
      const advanced = courseAdvanced('tumor', tumor.advanced); if (advanced) parts.push(advanced);
      paragraphs.push(parts.join(' '));
    });
    const phenotype = [];
    if (member.phenotype) phenotype.push(member.phenotype);
    if (member.skinFindings && member.skinFindings !== 'desconocido') phenotype.push(`Estigmas cutáneos/mucosos: ${courseLabel('skinFindings', member.skinFindings)}.`);
    if (member.benignFindings && member.benignFindings !== 'desconocido') phenotype.push(`Poliposis o lesiones benignas: ${courseLabel('benignFindings', member.benignFindings)}.`);
    const detailedPhenotype = courseAdvanced('member', member.advanced, 4); if (detailedPhenotype) phenotype.push(detailedPhenotype);
    if (phenotype.length) paragraphs.push(`Fenotipo: ${phenotype.join(' ')}`);
    const studyHistory = courseAdvanced('member', member.advanced, 5); if (studyHistory) paragraphs.push(studyHistory);
    if (!member.genetics.length && member.advanced?.previousGeneticStudy !== 'no') paragraphs.push('No hay estudios genéticos registrados; esto no confirma que no se hayan realizado.');
    member.genetics.forEach((study, index) => {
      const parts = [`Estudio genético ${index + 1}.`];
      for (const [key, label] of [['purpose', 'Finalidad'], ['result', 'Resultado registrado'], ['gene', 'Gen'], ['hgvsC', 'Variante cDNA'], ['classification', 'Clasificación registrada']]) {
        if (study[key]) parts.push(`${label}: ${courseLabel(key, study[key])}.`);
      }
      const advanced = courseAdvanced('genetic', study.advanced); if (advanced) parts.push(advanced);
      paragraphs.push(parts.join(' '));
    });
    const prevention = [];
    if (member.prophylaxis) prevention.push(`Procedimientos registrados: ${member.prophylaxis}.`);
    if (member.chemoprevention) prevention.push(`Quimioprevención registrada: ${member.chemoprevention}.`);
    const detailedPrevention = courseAdvanced('member', member.advanced, 6); if (detailedPrevention) prevention.push(detailedPrevention);
    if (prevention.length) paragraphs.push(`Prevención: ${prevention.join(' ')}`);
    const exposures = [];
    if (member.smoking && member.smoking !== 'desconocido') exposures.push(`Tabaco: ${courseLabel('smoking', member.smoking)}.`);
    if (member.alcohol && member.alcohol !== 'desconocido') exposures.push(`Consumo de alcohol registrado: ${courseLabel('alcohol', member.alcohol)}.`);
    if (member.exposures) exposures.push(`Exposiciones descritas: ${member.exposures}.`);
    const detailedExposures = courseAdvanced('member', member.advanced, 7); if (detailedExposures) exposures.push(detailedExposures);
    if (exposures.length) paragraphs.push(exposures.join(' '));
    const management = courseAdvanced('member', member.advanced, 8); if (management) paragraphs.push(`Gestión del familiar: ${management}`);
  }
  if (history.consent && history.consent !== 'desconocido') paragraphs.push(`Consentimiento registrado para la historia: ${courseLabel('consent', history.consent)}.`);
  if (history.notes) paragraphs.push(`Notas de gestión: ${history.notes}`);
  if (issues.length) paragraphs.push('DATOS POR REVISAR\n' + issues.map(issue => `${issue.memberId ? 'Familiar ' + issue.memberId : 'Gestión'}: ${issue.message}`).join('\n'));
  return paragraphs.join('\n\n');
}
function refreshClinicalCourse() {
  if ($('#clinical-course-panel').hidden) return;
  $('#clinical-course-text').value = generateClinicalCourse(state, currentHistoryIssues);
  $('#clinical-course-status').textContent = currentHistoryIssues.length ? 'Borrador con datos pendientes de revisión. Se actualiza al corregir la historia.' : 'Texto generado a partir de los datos registrados. Se actualiza al editar la historia.';
}
function initializeClinicalCourse() {
  $('#generate-course').addEventListener('click', () => {
    saveRepeatEntries(); $('#clinical-course-panel').hidden = false; refreshFormValidation();
    $('#clinical-course-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#copy-course').addEventListener('click', async () => {
    refreshClinicalCourse();
    try { await navigator.clipboard.writeText($('#clinical-course-text').value); $('#clinical-course-status').textContent = 'Texto copiado.'; }
    catch { $('#clinical-course-text').focus(); $('#clinical-course-text').select(); $('#clinical-course-status').textContent = 'Selecciona Copiar en tu navegador para copiar el texto seleccionado.'; }
  });
  $('#download-course').addEventListener('click', () => {
    refreshClinicalCourse();
    const blob = new Blob([$('#clinical-course-text').value], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `curso-clinico-${(state.familyCode || 'familia').replace(/[^a-zA-Z0-9_-]/g, '-')}.txt`; link.click(); URL.revokeObjectURL(link.href);
  });
}
