const form = document.querySelector('#intake-form');
let currentStep = 1;
let memberCounter = 0;

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

function today() { return new Date().toISOString().slice(0, 10); }
$('#visit-date').value = today();

function addEntry(templateId, listId, type) {
  const node = $(`#${templateId}`).content.firstElementChild.cloneNode(true);
  if (type === 'relative') {
    memberCounter += 1;
    node.dataset.memberId = `M${String(memberCounter).padStart(3, '0')}`;
    $('h3', node).textContent = `Familiar ${memberCounter}`;
    $('[data-field="alias"]', node).addEventListener('input', refreshMemberOptions);
    $('[data-field="relationship"]', node).addEventListener('change', refreshMemberOptions);
  }
  $('.remove', node).addEventListener('click', () => { node.remove(); refreshMemberOptions(); updateReview(); });
  $(`#${listId}`).append(node);
  refreshMemberOptions();
  return node;
}

function members() {
  return $$('.relative-entry').map(entry => ({
    id: entry.dataset.memberId,
    alias: $('[data-field="alias"]', entry).value.trim(),
    relationship: $('[data-field="relationship"]', entry).value
  }));
}

function refreshMemberOptions() {
  const list = members();
  $$('[data-members]').forEach(select => {
    const saved = select.value;
    select.innerHTML = '<option value="">Selecciona un familiar…</option>' + list.map(m => `<option value="${m.id}">${m.alias || 'Familiar sin alias'}${m.relationship ? ` · ${m.relationship.replaceAll('_', ' ')}` : ''}</option>`).join('');
    select.value = saved;
  });
  const none = !list.length;
  ['tumor-empty', 'genetic-empty', 'exposure-empty'].forEach(id => $(`#${id}`).hidden = !none);
  ['add-tumor', 'add-genetic', 'add-exposure'].forEach(id => $(`#${id}`).disabled = none);
}

$('#add-relative').addEventListener('click', () => addEntry('relative-template', 'relatives-list', 'relative'));
$('#add-tumor').addEventListener('click', () => addEntry('tumor-template', 'tumors-list', 'tumor'));
$('#add-genetic').addEventListener('click', () => addEntry('genetic-template', 'genetics-list', 'genetic'));
$('#add-exposure').addEventListener('click', () => addEntry('exposure-template', 'exposures-list', 'exposure'));

$$('.tab').forEach(button => button.addEventListener('click', () => {
  $$('.tab').forEach(tab => tab.classList.toggle('active', tab === button));
  $$('[data-tab-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.tabPanel === button.dataset.tab));
}));

function value(entry, key) { return $(`[data-field="${key}"]`, entry)?.value.trim() || null; }
function number(entry, key) { const v = value(entry, key); return v === null || v === '' ? null : Number(v); }

function collectData() {
  const relativeData = $$('.relative-entry').map(entry => ({
    id: entry.dataset.memberId,
    alias_referencia: value(entry, 'alias'),
    parentesco_con_probando_codigo: value(entry, 'relationship'),
    sexo_asignado_codigo: value(entry, 'sex'),
    estado_vital_codigo: value(entry, 'vitalStatus'),
    nacimiento: { year: number(entry, 'birthYear'), precision: value(entry, 'birthYear') ? 'ANO' : 'DESCONOCIDA' },
    defuncion: { year: number(entry, 'deathYear'), precision: value(entry, 'deathYear') ? 'ANO' : 'DESCONOCIDA' }
  }));
  const mapMember = id => relativeData.find(m => m.id === id)?.alias_referencia || id;
  return {
    schema_version: '0.1.0',
    generated_at: new Date().toISOString(),
    source: 'pedigree-beta-static-form',
    familia: { codigo: $('#family-code').value.trim(), fecha_visita: $('#visit-date').value || null, motivo_consulta_codigo: $('input[name="reason"]:checked').value, notas: $('#family-notes').value.trim() || null },
    probando: { alias_referencia: $('#proband-alias').value.trim() || null },
    miembros_familia: relativeData,
    tumores: $$('.tumor-entry').map(entry => ({ miembro_id: value(entry, 'memberId'), familiar_referencia: mapMember(value(entry, 'memberId')), estado_diagnostico_codigo: 'confirmado', localizacion_primaria: value(entry, 'site'), edad_diagnostico_anios: number(entry, 'ageAtDiagnosis'), lateralidad_codigo: value(entry, 'laterality'), verificacion_codigo: value(entry, 'verification') })),
    estudios_geneticos: $$('.genetic-entry').map(entry => ({ miembro_id: value(entry, 'memberId'), familiar_referencia: mapMember(value(entry, 'memberId')), finalidad_codigo: value(entry, 'purpose'), resultado_global_codigo: value(entry, 'result'), variantes: value(entry, 'gene') || value(entry, 'hgvsC') ? [{ gen_simbolo: value(entry, 'gene'), hgvs_c: value(entry, 'hgvsC'), clasificacion_acmg_codigo: value(entry, 'classification') }] : [] })),
    exposiciones: $$('.exposure-entry').map(entry => ({ miembro_id: value(entry, 'memberId'), familiar_referencia: mapMember(value(entry, 'memberId')), agente: value(entry, 'agent'), contexto_codigo: value(entry, 'context'), duracion_anios: number(entry, 'durationYears'), notas: value(entry, 'notes') }))
  };
}

function updateReview() {
  const data = collectData();
  $('#summary').innerHTML = `<div><strong>${data.miembros_familia.length}</strong><span>familiares</span></div><div><strong>${data.tumores.length}</strong><span>tumores</span></div><div><strong>${data.estudios_geneticos.length}</strong><span>estudios genéticos</span></div>`;
  $('#json-output').textContent = JSON.stringify(data, null, 2);
}

function validateStep(step) {
  const panel = $(`[data-panel="${step}"]`);
  const required = $$('[required]', panel);
  const invalid = required.find(input => !input.value.trim());
  if (invalid) { invalid.focus(); $('#save-status').textContent = 'Completa los campos obligatorios para continuar.'; return false; }
  $('#save-status').textContent = '';
  return true;
}

function showStep(step) {
  currentStep = step;
  $$('.panel').forEach(panel => panel.classList.toggle('active', Number(panel.dataset.panel) === step));
  $$('.step').forEach(button => button.classList.toggle('active', Number(button.dataset.step) === step));
  $('#previous').disabled = step === 1;
  $('#next').innerHTML = step === 4 ? 'Guardar JSON <span>↓</span>' : 'Continuar <span>→</span>';
  if (step === 4) updateReview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('#next').addEventListener('click', () => {
  if (currentStep < 4) { if (validateStep(currentStep)) showStep(currentStep + 1); return; }
  const data = collectData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${data.familia.codigo || 'primera-visita'}-${today()}.json`;
  link.click(); URL.revokeObjectURL(link.href);
  $('#save-status').textContent = 'JSON descargado correctamente.';
});
$('#previous').addEventListener('click', () => showStep(Math.max(1, currentStep - 1)));
$$('.step').forEach(button => button.addEventListener('click', () => { const target = Number(button.dataset.step); if (target <= currentStep || validateStep(currentStep)) showStep(target); }));

addEntry('relative-template', 'relatives-list', 'relative');
refreshMemberOptions();
