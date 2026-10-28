const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const today = () => new Date().toISOString().slice(0, 10);
const currentYear = new Date().getFullYear();

// Topografías frecuentes. El catálogo está preparado para sustituirse por el catálogo
// completo versionado de CIE-O-3 cuando se incorpore al backend.
const CIEO3_SITES = [
  ['C00.9', 'Labio'], ['C01.9', 'Base de lengua'], ['C15.9', 'Esófago'], ['C16.9', 'Estómago'],
  ['C18.9', 'Colon'], ['C19.9', 'Unión rectosigmoidea'], ['C20.9', 'Recto'], ['C21.9', 'Ano'],
  ['C22.0', 'Hígado'], ['C23.9', 'Vesícula biliar'], ['C24.8', 'Vías biliares'], ['C25.9', 'Páncreas'],
  ['C32.9', 'Laringe'], ['C33.9', 'Tráquea'], ['C34.9', 'Pulmón'], ['C37.9', 'Timo'], ['C38.3', 'Mediastino'],
  ['C40.9', 'Hueso'], ['C41.9', 'Hueso / tejido articular'], ['C43.9', 'Melanoma de piel'], ['C44.9', 'Piel'],
  ['C47.9', 'Nervios periféricos'], ['C48.8', 'Retroperitoneo'], ['C49.9', 'Tejido conjuntivo'], ['C50.9', 'Mama'],
  ['C51.9', 'Vulva'], ['C52.9', 'Vagina'], ['C53.9', 'Cuello uterino'], ['C54.9', 'Endometrio / cuerpo uterino'],
  ['C55.9', 'Útero, parte no especificada'], ['C56.9', 'Ovario'], ['C57.9', 'Trompa de Falopio / anejos'],
  ['C58.9', 'Placenta'], ['C60.9', 'Pene'], ['C61.9', 'Próstata'], ['C62.9', 'Testículo'], ['C64.9', 'Riñón'],
  ['C65.9', 'Pelvis renal'], ['C66.9', 'Uréter'], ['C67.9', 'Vejiga'], ['C68.9', 'Vías urinarias'],
  ['C69.9', 'Ojo'], ['C70.9', 'Meninges'], ['C71.9', 'Encéfalo'], ['C72.9', 'Sistema nervioso central'],
  ['C73.9', 'Tiroides'], ['C74.9', 'Glándula suprarrenal'], ['C75.9', 'Glándula endocrina'], ['C76.9', 'Localización mal definida'],
  ['C80.9', 'Localización primaria desconocida'], ['C81.9', 'Linfoma de Hodgkin'], ['C82.9', 'Linfoma folicular'],
  ['C83.9', 'Linfoma no Hodgkin'], ['C90.0', 'Mieloma múltiple'], ['C91.9', 'Leucemia linfoide'], ['C92.9', 'Leucemia mieloide'],
  ['C95.9', 'Leucemia de tipo celular no especificado']
];

const defaultMember = (number) => ({
  id: String(number).padStart(2, '0'), internalId: `FAM_PENDIENTE_${String(number).padStart(2, '0')}`,
  alias: '', relationship: '', line: 'desconocida', fatherId: '', motherId: '', sex: 'desconocido', gender: 'desconocida',
  vitalStatus: 'desconocido', birthYear: '', deathYear: '', deathCause: 'desconocida', organs: '', phenotype: '',
  skinFindings: 'desconocido', benignFindings: 'desconocido', prophylaxis: '', chemoprevention: '', smoking: 'desconocido',
  alcohol: 'desconocido', exposures: '', tumors: [], genetics: [], advanced: {}
});
const state = { members: [], activeId: null, currentStep: 1, familyCode: '', visitDate: today(), consent: 'desconocido', notes: '' };

$('#visit-date').value = state.visitDate;
$$('[data-member-field="birthYear"], [data-member-field="deathYear"]').forEach(input => { input.max = currentYear; });

function activeMember() { return state.members.find(member => member.id === state.activeId); }
function internalId(member) { return `FAM_${state.familyCode.trim() || 'PENDIENTE'}_${member.id}`; }
function siteFor(value) { return CIEO3_SITES.find(([code, label]) => value === `${code} · ${label}` || value === code || value === label); }
function siteLabel(value) { const match = siteFor(value); return match ? `${match[0]} · ${match[1]}` : value || ''; }

function populateCatalog() {
  $$('datalist:not(.gene-options)').forEach(list => { list.innerHTML = CIEO3_SITES.map(([code, label]) => `<option value="${code} · ${label}"></option>`).join(''); });
}
function fillCatalog(root) {
  $$('datalist:not(.gene-options)', root).forEach(list => { list.innerHTML = CIEO3_SITES.map(([code, label]) => `<option value="${code} · ${label}"></option>`).join(''); });
}

function bindMemberFields() {
  $$('[data-member-field]').forEach(field => field.addEventListener('input', () => { const member = activeMember(); if (!member) return; member[field.dataset.memberField] = field.value; if (['fatherId', 'motherId'].includes(field.dataset.memberField)) setManualParent(member, field.dataset.memberField); if (['relationship', 'fatherId', 'motherId'].includes(field.dataset.memberField)) { synchronizeFamilyLinks(state.members); refreshParentFields(); } refreshMemberChrome(); if (field.dataset.memberField === 'vitalStatus') updateVitalFields(); if (['birthYear', 'deathYear', 'vitalStatus'].includes(field.dataset.memberField)) $$('.tumor-entry').forEach(validateTumorDates); updateFamilyAgeFields(); refreshFormValidation(); }));
  $('#family-code').addEventListener('input', () => { state.familyCode = $('#family-code').value; $('#patient-code').value = state.familyCode; state.members.forEach(member => { member.internalId = internalId(member); }); refreshMemberChrome(); refreshFormValidation(); });
  $('#visit-date').addEventListener('change', () => { state.visitDate = $('#visit-date').value; refreshFormValidation(); });
  $('#consent').addEventListener('change', () => { state.consent = $('#consent').value; refreshFormValidation(); });
  $('#family-notes').addEventListener('input', () => { state.notes = $('#family-notes').value; });
}

function ensurePatientCodeField() {
  const cta = $('#new-member-cta');
  const wrapper = document.createElement('div');
  wrapper.className = 'hint patient-code-hint';
  wrapper.innerHTML = '<label class="field"><span>Código del paciente / probando</span><input id="patient-code" maxlength="40" placeholder="Ej. ABC123" /><small>Necesario para generar automáticamente FAM_codigoPaciente_número.</small></label>';
  cta.before(wrapper);
  $('#patient-code').addEventListener('input', event => { state.familyCode = event.target.value.trim(); $('#family-code').value = state.familyCode; state.members.forEach(member => { member.internalId = internalId(member); }); refreshMemberChrome(); refreshFormValidation(); });
}

function refreshParentFields() {
  const member = activeMember();
  if (!member) return;
  ['fatherId', 'motherId'].forEach(key => {
    $(`[data-member-field="${key}"]`).value = member[key];
  });
}

function loadMemberFields() {
  const member = activeMember();
  $$('[data-member-field]').forEach(field => { setEditableValue(field, member ? (member[field.dataset.memberField] ?? '') : ''); });
  $('#member-id').value = member ? member.internalId : '';
  updateVitalFields();
  updateFamilyAgeFields();
  loadAdvancedMemberFields();
}

function refreshMemberChrome() {
  const hasMembers = state.members.length > 0;
  $('#member-bar').hidden = !hasMembers; $('#new-member-cta').hidden = hasMembers; $('#lineage-form').hidden = !hasMembers;
  const member = activeMember();
  if (member) { $('#active-member-label').textContent = `${member.id} · ${member.alias || 'Familiar sin alias'}`; $('#member-id').value = member.internalId; }
  const switcher = $('#member-switch');
  switcher.replaceChildren(...state.members.map(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = `${item.id} · ${item.alias || 'Familiar sin alias'}`; return option; }));
  switcher.value = state.activeId || '';
  $$('.panel > .advanced-section .advanced-toggle').forEach(button => { button.disabled = !hasMembers; });
  $$('.step').forEach(step => { const enabled = hasMembers || [1, 8].includes(Number(step.dataset.step)); step.disabled = !enabled; step.classList.toggle('locked', !enabled); });
}

function updateFamilyAgeFields() {
  const member = activeMember();
  const field = $('[data-member-field="birthYear"]');
  const error = familyAgeError(state.members, currentYear);
  if (member) {
    const limits = familyBirthLimits(member, state.members, currentYear);
    field.min = limits.min; field.max = limits.max;
  } else { field.min = 1900; field.max = currentYear; }
  field.setCustomValidity(error);
  $('#family-age-warning').hidden = !error;
  $('#family-age-warning').textContent = error;
}

function updateVitalFields() {
  const member = activeMember(); if (!member) return;
  const deceased = member.vitalStatus === 'fallecido';
  $$('.death-field').forEach(label => { const input = $('input, select', label); if (input) input.disabled = !deceased; label.style.opacity = deceased ? '1' : '.55'; });
  $('#vital-hint').textContent = member.vitalStatus === 'vivo' ? 'Familiar vivo: fecha y causa de defunción están desactivadas.' : member.vitalStatus === 'fallecido' ? 'Familiar fallecido: introduce la fecha de defunción si se conoce.' : 'Estado vital desconocido: se permiten datos parciales.';
}

function createMember() {
  if (state.members.length >= 99) { $('#save-status').textContent = 'No se pueden registrar más de 99 familiares.'; return; }
  if (!state.familyCode.trim()) { $('#save-status').textContent = 'Introduce primero el código del paciente/probando para generar el ID_Familiar.'; $('#patient-code').focus(); return; }
  if ([3, 5].includes(state.currentStep)) saveRepeatEntries();
  const number = Array.from({ length: 99 }, (_, i) => i + 1).find(n => !state.members.some(m => m.id === String(n).padStart(2, '0')));
  const member = defaultMember(number); member.internalId = internalId(member);
  state.members.push(member); state.activeId = member.id; loadMemberFields(); renderRepeats(); refreshMemberChrome(); showStep(1);
}

function switchMember(id) { if ([3, 5].includes(state.currentStep)) saveRepeatEntries(); state.activeId = id; loadMemberFields(); renderRepeats(); refreshMemberChrome(); showStep(1); }

function fieldValue(entry, key) { return $(`[data-field="${key}"]`, entry)?.value.trim() || ''; }
function repeatData(entry, type) {
  if (type === 'tumor') return { site: siteLabel(fieldValue(entry, 'siteSearch')), diagnosisYear: fieldValue(entry, 'diagnosisYear'), ageAtDiagnosis: fieldValue(entry, 'ageAtDiagnosis'), nature: fieldValue(entry, 'nature'), laterality: fieldValue(entry, 'laterality'), verification: fieldValue(entry, 'verification'), organCheck: fieldValue(entry, 'organCheck'), advanced: readAdvancedFields(entry) };
  return { purpose: fieldValue(entry, 'purpose'), result: fieldValue(entry, 'result'), gene: approvedGene(fieldValue(entry, 'gene')) || fieldValue(entry, 'gene'), hgvsC: fieldValue(entry, 'hgvsC'), classification: fieldValue(entry, 'classification'), advanced: readAdvancedFields(entry) };
}
function saveRepeatEntries() {
  const member = activeMember(); if (!member) return;
  member.tumors = $$('.tumor-entry').map(entry => repeatData(entry, 'tumor'));
  member.genetics = $$('.genetic-entry').map(entry => repeatData(entry, 'genetic'));
}
function renderRepeats() {
  const member = activeMember(); if (!member) return;
  $('#tumors-list').innerHTML = ''; $('#genetics-list').innerHTML = '';
  member.tumors.forEach(item => addRepeat('tumor', item)); member.genetics.forEach(item => addRepeat('genetic', item)); refreshFormValidation();
}
function addRepeat(type, data = {}) {
  const member = activeMember(); if (!member) return;
  const template = $(`#${type}-template`).content.firstElementChild.cloneNode(true); const list = $(`#${type === 'tumor' ? 'tumors' : 'genetics'}-list`);
  const values = type === 'tumor' ? { siteSearch: data.site || '', diagnosisYear: data.diagnosisYear || '', ageAtDiagnosis: data.ageAtDiagnosis ?? '', nature: data.nature ?? 'primario_unico', laterality: data.laterality ?? 'desconocida', verification: data.verification ?? 'relato_familiar', organCheck: data.organCheck || '' } : { purpose: data.purpose ?? 'desconocida', result: data.result ?? 'no_disponible', gene: data.gene || '', hgvsC: data.hgvsC || '', classification: data.classification ?? '' };
  Object.entries(values).forEach(([key, value]) => { const field = $(`[data-field="${key}"]`, template); if (field) setEditableValue(field, value); });
  template.advancedOriginal = { ...(data.advanced || {}) };
  appendAdvancedSection(template, type, type === 'tumor' ? 3 : 5, data.advanced || {});
  fillCatalog(template);
  if (type === 'genetic') bindGeneSelection(template);
  const diagnosisYear = $('[data-field="diagnosisYear"]', template);
  if (diagnosisYear) { diagnosisYear.min = '1900'; diagnosisYear.max = currentYear; }
  $('.remove', template).addEventListener('click', () => { template.remove(); saveRepeatEntries(); updateReview(); });
  $$('[data-field]', template).forEach(field => { ['input', 'change'].forEach(eventName => field.addEventListener(eventName, () => { saveRepeatEntries(); if (type === 'tumor') { validateTumorDates(template); showAnatomyWarning(template); } updateReview(); })); });
  list.append(template); if (type === 'tumor') { validateTumorDates(template); showAnatomyWarning(template); }
}

function validateTumorDates(entry) {
  const member = activeMember(); if (!member) return;
  const date = $('[data-field="diagnosisYear"]', entry);
  const age = $('[data-field="ageAtDiagnosis"]', entry);
  const limits = diagnosisLimits(member, today());
  date.min = limits.min; date.max = limits.max; age.max = Math.max(0, limits.maxAge);
  const error = diagnosisError(member, repeatData(entry, 'tumor'), today());
  date.setCustomValidity(error); age.setCustomValidity(error);
  const warning = $('.tumor-warning', entry);
  warning.hidden = !error; warning.textContent = error;
}
function showAnatomyWarning(entry) {
  const member = activeMember(); const site = fieldValue(entry, 'siteSearch').toLowerCase(); const warning = $('.anatomy-warning', entry); warning.hidden = true; if (!member || !site) return;
  const organs = (member.organs || '').toLowerCase(); const ovarian = site.includes('ovario') || site.includes('trompa'); const prostate = site.includes('próstata') || site.includes('prostata');
  const concern = (ovarian && member.sex === 'masculino' && !/ovari|útero|utero|órgano reproductor|organo reproductor/.test(organs)) || (prostate && member.sex === 'femenino' && !/próstata|prostata/.test(organs));
  warning.hidden = !concern; if (concern) warning.textContent = 'La localización no coincide con la anatomía registrada. Revise sexo asignado, órganos presentes y antecedentes quirúrgicos; no se ha bloqueado el registro.';
}

function showStep(step) { state.currentStep = step; $$('.panel').forEach(panel => panel.classList.toggle('active', Number(panel.dataset.panel) === step)); $$('.step').forEach(button => button.classList.toggle('active', Number(button.dataset.step) === step)); $('#previous').disabled = step === 1; $('#next').innerHTML = step === 8 ? 'Guardar JSON <span>↓</span>' : 'Continuar <span>→</span>'; if (step === 8) updateReview(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function validateStep(step) {
  $('#save-status').textContent = '';
  if (!activeMember()) { $('#save-status').textContent = 'Primero introduce un familiar.'; return false; }
  saveRepeatEntries();
  const issues = refreshFormValidation();
  if (issues.length) {
    $('#save-status').textContent = `Hay ${issues.length} ${issues.length === 1 ? 'campo' : 'campos'} por revisar. Corrígelos antes de guardar.`;
    $('#correction-panel').open = true;
    return false;
  }
  return true;
}
function collectData() {
  saveRepeatEntries();
  state.members.forEach(member => { member.internalId = internalId(member); });
  return {
    schema_version: '0.4.0', generated_at: new Date().toISOString(), source: 'pedigree-beta-family-context',
    familia: { codigo: state.familyCode || null, fecha_visita: state.visitDate || null, consentimiento_codigo: state.consent, notas: state.notes || null },
    miembros_familia: state.members.map(member => ({
      variables_alta_especificacion: member.advanced || {},
      id_familiar: member.id, id_interno: member.internalId, alias_referencia: member.alias || null,
      parentesco: member.relationship || null, linea_familiar: member.line, padre_id: member.fatherId || null, madre_id: member.motherId || null,
      demografia: { sexo_asignado_codigo: member.sex, identidad_genero_codigo: member.gender, estado_vital_codigo: member.vitalStatus,
        nacimiento: member.birthYear ? { year: Number(member.birthYear), precision: 'ANO' } : null,
        defuncion: member.deathYear ? { year: Number(member.deathYear), precision: 'ANO' } : null,
        causa_defuncion_codigo: member.vitalStatus === 'fallecido' ? member.deathCause : null, organos_presentes: member.organs || null },
      fenotipo: { descripcion: member.phenotype || null, estigmas_cutaneos_codigo: member.skinFindings, lesiones_benignas_codigo: member.benignFindings },
      neoplasias: member.tumors.map(({ advanced, ...t }) => ({ ...t, variables_alta_especificacion: advanced || {}, diagnosisYear: t.diagnosisYear ? Number(t.diagnosisYear) : null, catalogo_version: 'CIE-O-3 2026' })), genetica: member.genetics.map(({ advanced, ...g }) => ({ ...g, variables_alta_especificacion: advanced || {} })),
      profilaxis: { procedimientos: member.prophylaxis || null, quimioprevencion: member.chemoprevention || null },
      expositoma: { tabaco_codigo: member.smoking, alcohol_codigo: member.alcohol, detalle: member.exposures || null }
    }))
  };
}
function updateReview() { const data = collectData(); refreshFormValidation(); $('#summary').innerHTML = `<div><strong>${data.miembros_familia.length}</strong><span>familiares</span></div><div><strong>${data.miembros_familia.reduce((n, m) => n + m.neoplasias.length, 0)}</strong><span>neoplasias</span></div><div><strong>${data.miembros_familia.reduce((n, m) => n + m.genetica.length, 0)}</strong><span>estudios genéticos</span></div>`; $('#json-output').textContent = JSON.stringify(data, null, 2); }

$('#add-relative').addEventListener('click', createMember); $('#new-member').addEventListener('click', createMember); $('#member-switch').addEventListener('change', event => switchMember(event.target.value)); $('#add-tumor').addEventListener('click', () => addRepeat('tumor')); $('#add-genetic').addEventListener('click', () => addRepeat('genetic')); $('#vital-status').addEventListener('change', updateVitalFields);
$$('.step').forEach(button => button.addEventListener('click', () => { const target = Number(button.dataset.step); if (!button.disabled) { saveRepeatEntries(); showStep(target); refreshFormValidation(); } }));
$('#next').addEventListener('click', () => { if (state.currentStep < 8) { if (activeMember()) { saveRepeatEntries(); showStep(state.currentStep + 1); refreshFormValidation(); } else { showStep(8); } return; } if (!validateStep(8)) return; const data = collectData(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${state.familyCode || 'historia-familiar'}-${today()}.json`; link.click(); URL.revokeObjectURL(link.href); $('#save-status').textContent = 'JSON descargado correctamente.'; });
$('#previous').addEventListener('click', () => { saveRepeatEntries(); showStep(Math.max(1, state.currentStep - 1)); refreshFormValidation(); });
ensurePatientCodeField(); bindMemberFields(); populateCatalog(); initializeAdvancedFields(); initializeClinicalCourse(); refreshMemberChrome();

let pendingImport = null;
let importReadVersion = 0;
function checkImportOptions(imported) {
  imported.members.forEach(member => {
    member.genetics.forEach(study => { study.gene = approvedGene(study.gene) || study.gene; });
  });
}
function resetPendingImport() {
  pendingImport = null;
  $('#import-json').disabled = true;
  $('#import-status').textContent = '';
  return ++importReadVersion;
}
function prepareImportText(text, version) {
  if (version !== importReadVersion) return;
  try {
    if (new Blob([text]).size > 5 * 1024 * 1024) throw new Error('El JSON supera el límite de 5 MB.');
    const imported = parseFamilyImport(text, defaultMember);
    checkImportOptions(imported);
    pendingImport = imported;
    $('#import-status').textContent = `Historia preparada: ${imported.members.length} familiares. Podrás corregir los datos después de importar. Se sustituye la historia abierta.`;
    $('#import-json').disabled = false;
  } catch (error) { $('#import-status').textContent = error.message; }
}
$('#import-json-file').addEventListener('change', async event => {
  const version = resetPendingImport();
  $('#import-json-text').value = '';
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('El archivo supera el límite de 5 MB.');
    prepareImportText(await file.text(), version);
  } catch (error) { if (version === importReadVersion) $('#import-status').textContent = error.message; }
});
$('#import-json-text').addEventListener('input', event => {
  const version = resetPendingImport();
  $('#import-json-file').value = '';
  if (event.target.value.trim()) prepareImportText(event.target.value, version);
});
$('#import-json').addEventListener('click', () => {
  if (!pendingImport) return;
  if (state.members.length && !window.confirm('Se sustituirá la historia abierta. Descarga primero su JSON si quieres conservarla. ¿Importar la historia seleccionada?')) return;
  const imported = pendingImport;
  Object.assign(state, imported, { activeId: imported.members[0]?.id || null });
  state.members.forEach(member => {
    member.internalId = internalId(member);
    // Existing links, including deliberately empty ones, belong to the saved history.
    ['fatherId', 'motherId'].forEach(key => setManualParent(member, key));
  });
  $('#family-code').value = state.familyCode; $('#patient-code').value = state.familyCode;
  setEditableValue($('#visit-date'), state.visitDate); setEditableValue($('#consent'), state.consent); $('#family-notes').value = state.notes;
  $('#tumors-list').replaceChildren(); $('#genetics-list').replaceChildren();
  loadMemberFields(); renderRepeats(); refreshMemberChrome(); showStep(8);
  $('#save-status').textContent = '';
  $('#import-status').textContent = `Historia importada: ${state.members.length} familiares. Puedes revisar y continuar editando.`;
  pendingImport = null; ++importReadVersion; $('#import-json').disabled = true; $('#import-json-file').value = ''; $('#import-json-text').value = '';
});
