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
  alcohol: 'desconocido', exposures: '', tumors: [], genetics: []
});
const state = { members: [], activeId: null, currentStep: 1, familyCode: '', visitDate: today(), consent: 'desconocido', notes: '' };

$('#visit-date').value = state.visitDate;
$$('[data-member-field="birthYear"], [data-member-field="deathYear"]').forEach(input => { input.max = currentYear; });

function activeMember() { return state.members.find(member => member.id === state.activeId); }
function internalId(member) { return `FAM_${state.familyCode.trim() || 'PENDIENTE'}_${member.id}`; }
function siteFor(value) { return CIEO3_SITES.find(([code, label]) => value === `${code} · ${label}` || value === code || value === label); }
function siteLabel(value) { const match = siteFor(value); return match ? `${match[0]} · ${match[1]}` : value || ''; }

function populateCatalog() {
  $$('datalist').forEach(list => { list.innerHTML = CIEO3_SITES.map(([code, label]) => `<option value="${code} · ${label}"></option>`).join(''); });
}
function fillCatalog(root) {
  $$('datalist', root).forEach(list => { list.innerHTML = CIEO3_SITES.map(([code, label]) => `<option value="${code} · ${label}"></option>`).join(''); });
}

function bindMemberFields() {
  $$('[data-member-field]').forEach(field => field.addEventListener('input', () => { const member = activeMember(); if (!member) return; member[field.dataset.memberField] = field.value; refreshMemberChrome(); if (field.dataset.memberField === 'vitalStatus') updateVitalFields(); }));
  $('#family-code').addEventListener('input', () => { state.familyCode = $('#family-code').value; $('#patient-code').value = state.familyCode; state.members.forEach(member => { member.internalId = internalId(member); }); refreshMemberChrome(); });
  $('#visit-date').addEventListener('change', () => { state.visitDate = $('#visit-date').value; });
  $('#consent').addEventListener('change', () => { state.consent = $('#consent').value; });
  $('#family-notes').addEventListener('input', () => { state.notes = $('#family-notes').value; });
}

function ensurePatientCodeField() {
  const cta = $('#new-member-cta');
  const wrapper = document.createElement('div');
  wrapper.className = 'hint patient-code-hint';
  wrapper.innerHTML = '<label class="field"><span>Código del paciente / probando</span><input id="patient-code" maxlength="40" placeholder="Ej. ABC123" /><small>Necesario para generar automáticamente FAM_codigoPaciente_número.</small></label>';
  cta.before(wrapper);
  $('#patient-code').addEventListener('input', event => { state.familyCode = event.target.value.trim(); $('#family-code').value = state.familyCode; state.members.forEach(member => { member.internalId = internalId(member); }); refreshMemberChrome(); });
}

function loadMemberFields() {
  const member = activeMember();
  $$('[data-member-field]').forEach(field => { field.value = member ? (member[field.dataset.memberField] ?? '') : ''; });
  $('#member-id').value = member ? member.internalId : '';
  updateVitalFields();
}

function refreshMemberChrome() {
  const hasMembers = state.members.length > 0;
  $('#member-bar').hidden = !hasMembers; $('#new-member-cta').hidden = hasMembers; $('#lineage-form').hidden = !hasMembers;
  const member = activeMember();
  if (member) { $('#active-member-label').textContent = `${member.id} · ${member.alias || 'Familiar sin alias'}`; $('#member-id').value = member.internalId; }
  const switcher = $('#member-switch');
  switcher.innerHTML = state.members.map(item => `<option value="${item.id}">${item.id} · ${item.alias || 'Familiar sin alias'}</option>`).join('');
  switcher.value = state.activeId || '';
  $$('.step').forEach(step => { const enabled = hasMembers || Number(step.dataset.step) === 1; step.disabled = !enabled; step.classList.toggle('locked', !enabled); });
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
  const member = defaultMember(state.members.length + 1); member.internalId = internalId(member);
  state.members.push(member); state.activeId = member.id; loadMemberFields(); renderRepeats(); refreshMemberChrome(); showStep(1);
}

function switchMember(id) { if ([3, 5].includes(state.currentStep)) saveRepeatEntries(); state.activeId = id; loadMemberFields(); renderRepeats(); refreshMemberChrome(); showStep(1); }

function fieldValue(entry, key) { return $(`[data-field="${key}"]`, entry)?.value.trim() || ''; }
function repeatData(entry, type) {
  if (type === 'tumor') return { site: siteLabel(fieldValue(entry, 'siteSearch')), diagnosisDate: fieldValue(entry, 'diagnosisDate'), ageAtDiagnosis: fieldValue(entry, 'ageAtDiagnosis'), nature: fieldValue(entry, 'nature'), laterality: fieldValue(entry, 'laterality'), verification: fieldValue(entry, 'verification'), organCheck: fieldValue(entry, 'organCheck') };
  return { purpose: fieldValue(entry, 'purpose'), result: fieldValue(entry, 'result'), gene: fieldValue(entry, 'gene'), hgvsC: fieldValue(entry, 'hgvsC'), classification: fieldValue(entry, 'classification') };
}
function saveRepeatEntries() {
  const member = activeMember(); if (!member) return;
  member.tumors = $$('.tumor-entry').map(entry => repeatData(entry, 'tumor'));
  member.genetics = $$('.genetic-entry').map(entry => repeatData(entry, 'genetic'));
}
function renderRepeats() {
  const member = activeMember(); if (!member) return;
  $('#tumors-list').innerHTML = ''; $('#genetics-list').innerHTML = '';
  member.tumors.forEach(item => addRepeat('tumor', item)); member.genetics.forEach(item => addRepeat('genetic', item));
}
function addRepeat(type, data = {}) {
  const member = activeMember(); if (!member) return;
  const template = $(`#${type}-template`).content.firstElementChild.cloneNode(true); const list = $(`#${type === 'tumor' ? 'tumors' : 'genetics'}-list`);
  const values = type === 'tumor' ? { siteSearch: data.site || '', diagnosisDate: data.diagnosisDate || '', ageAtDiagnosis: data.ageAtDiagnosis || '', nature: data.nature || 'primario_unico', laterality: data.laterality || 'desconocida', verification: data.verification || 'relato_familiar', organCheck: data.organCheck || '' } : { purpose: data.purpose || 'caso_indice', result: data.result || 'positivo', gene: data.gene || '', hgvsC: data.hgvsC || '', classification: data.classification || 'clase_5_patogenica' };
  Object.entries(values).forEach(([key, value]) => { const field = $(`[data-field="${key}"]`, template); if (field) field.value = value; });
  fillCatalog(template);
  const diagnosisDate = $('[data-field="diagnosisDate"]', template);
  if (diagnosisDate) { diagnosisDate.min = '1900-01-01'; diagnosisDate.max = today(); }
  $('.remove', template).addEventListener('click', () => { template.remove(); saveRepeatEntries(); updateReview(); });
  $$('[data-field]', template).forEach(field => { ['input', 'change'].forEach(eventName => field.addEventListener(eventName, () => { saveRepeatEntries(); if (type === 'tumor') { validateTumorDates(template); showAnatomyWarning(template); } updateReview(); })); });
  list.append(template); if (type === 'tumor') { validateTumorDates(template); showAnatomyWarning(template); }
}

function validateTumorDates(entry) {
  const member = activeMember(); const field = $('[data-field="diagnosisDate"]', entry); if (!member || !field || !field.value) return;
  const min = member.birthYear ? `${member.birthYear}-01-01` : '1900-01-01'; const max = member.deathYear ? `${member.deathYear}-12-31` : today();
  field.min = min; field.max = max;
  const warning = $('.tumor-warning', entry); if (field.value < min || field.value > max) { warning.hidden = false; warning.textContent = `La fecha debe estar entre ${min.slice(0, 4)} y ${max.slice(0, 4)} y ser compatible con la vida del familiar.`; } else if (!warning.textContent.startsWith('La localización')) warning.hidden = true;
}
function showAnatomyWarning(entry) {
  const member = activeMember(); const site = fieldValue(entry, 'siteSearch').toLowerCase(); const warning = $('.tumor-warning', entry); if (!member || !site) return;
  const organs = (member.organs || '').toLowerCase(); const ovarian = site.includes('ovario') || site.includes('trompa'); const prostate = site.includes('próstata') || site.includes('prostata');
  const concern = (ovarian && member.sex === 'masculino' && !/ovari|útero|utero|órgano reproductor|organo reproductor/.test(organs)) || (prostate && member.sex === 'femenino' && !/próstata|prostata/.test(organs));
  warning.hidden = !concern; if (concern) warning.textContent = 'La localización no coincide con la anatomía registrada. Revise sexo asignado, órganos presentes y antecedentes quirúrgicos; no se ha bloqueado el registro.';
}

function showStep(step) { state.currentStep = step; $$('.panel').forEach(panel => panel.classList.toggle('active', Number(panel.dataset.panel) === step)); $$('.step').forEach(button => button.classList.toggle('active', Number(button.dataset.step) === step)); $('#previous').disabled = step === 1; $('#next').innerHTML = step === 8 ? 'Guardar JSON <span>↓</span>' : 'Continuar <span>→</span>'; if (step === 8) updateReview(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function validateStep(step) {
  $('#save-status').textContent = ''; if (!activeMember()) { $('#save-status').textContent = 'Primero introduce un familiar.'; return false; }
  saveRepeatEntries(); const member = activeMember();
  const birth = Number(member.birthYear), death = Number(member.deathYear); if (birth && (birth < 1900 || birth > currentYear) || death && (death < 1900 || death > currentYear)) { $('#save-status').textContent = `Los años deben estar entre 1900 y ${currentYear}.`; return false; }
  if (birth && death && death < birth) { $('#save-status').textContent = 'La defunción no puede ser anterior al nacimiento.'; return false; }
  if (step === 3 && member.tumors.some(t => t.diagnosisDate && (t.diagnosisDate < `${birth || 1900}-01-01` || t.diagnosisDate > `${death || currentYear}-12-31`))) { $('#save-status').textContent = 'Revisa las fechas de diagnóstico: deben ser compatibles con el familiar.'; return false; }
  return true;
}
function collectData() {
  saveRepeatEntries();
  state.members.forEach(member => { member.internalId = internalId(member); });
  return {
    schema_version: '0.2.0', generated_at: new Date().toISOString(), source: 'pedigree-beta-family-context',
    familia: { codigo: state.familyCode || null, fecha_visita: state.visitDate || null, consentimiento_codigo: state.consent, notas: state.notes || null },
    miembros_familia: state.members.map(member => ({
      id_familiar: member.id, id_interno: member.internalId, alias_referencia: member.alias || null,
      parentesco: member.relationship || null, linea_familiar: member.line, padre_id: member.fatherId || null, madre_id: member.motherId || null,
      demografia: { sexo_asignado_codigo: member.sex, identidad_genero_codigo: member.gender, estado_vital_codigo: member.vitalStatus,
        nacimiento: member.birthYear ? { year: Number(member.birthYear), precision: 'ANO' } : null,
        defuncion: member.deathYear ? { year: Number(member.deathYear), precision: 'ANO' } : null,
        causa_defuncion_codigo: member.vitalStatus === 'fallecido' ? member.deathCause : null, organos_presentes: member.organs || null },
      fenotipo: { descripcion: member.phenotype || null, estigmas_cutaneos_codigo: member.skinFindings, lesiones_benignas_codigo: member.benignFindings },
      neoplasias: member.tumors.map(t => ({ ...t, catalogo_version: 'CIE-O-3 2026' })), genetica: member.genetics,
      profilaxis: { procedimientos: member.prophylaxis || null, quimioprevencion: member.chemoprevention || null },
      expositoma: { tabaco_codigo: member.smoking, alcohol_codigo: member.alcohol, detalle: member.exposures || null }
    }))
  };
}
function updateReview() { const data = collectData(); $('#summary').innerHTML = `<div><strong>${data.miembros_familia.length}</strong><span>familiares</span></div><div><strong>${data.miembros_familia.reduce((n, m) => n + m.neoplasias.length, 0)}</strong><span>neoplasias</span></div><div><strong>${data.miembros_familia.reduce((n, m) => n + m.genetica.length, 0)}</strong><span>estudios genéticos</span></div>`; $('#json-output').textContent = JSON.stringify(data, null, 2); }

$('#add-relative').addEventListener('click', createMember); $('#new-member').addEventListener('click', createMember); $('#member-switch').addEventListener('change', event => switchMember(event.target.value)); $('#add-tumor').addEventListener('click', () => addRepeat('tumor')); $('#add-genetic').addEventListener('click', () => addRepeat('genetic')); $('#vital-status').addEventListener('change', updateVitalFields);
$$('.step').forEach(button => button.addEventListener('click', () => { const target = Number(button.dataset.step); if (!button.disabled && validateStep(state.currentStep)) showStep(target); }));
$('#next').addEventListener('click', () => { if (state.currentStep < 8) { if (validateStep(state.currentStep)) showStep(state.currentStep + 1); return; } if (!validateStep(8)) return; const data = collectData(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${state.familyCode || 'historia-familiar'}-${today()}.json`; link.click(); URL.revokeObjectURL(link.href); $('#save-status').textContent = 'JSON descargado correctamente.'; });
$('#previous').addEventListener('click', () => showStep(Math.max(1, state.currentStep - 1)));
ensurePatientCodeField(); bindMemberFields(); populateCatalog(); refreshMemberChrome();
