function advancedDefinitions(type, step) {
  return type === 'member' ? ADVANCED_FIELDS.member[step] || [] : ADVANCED_FIELDS[type] || [];
}
function hasAdvancedValue(value) { return Array.isArray(value) ? value.length > 0 : value !== '' && value != null; }
function advancedDisplay(field, value) {
  const label = item => field.options?.find(option => option.value === String(item))?.label || String(item);
  const text = Array.isArray(value) ? value.map(label).join(', ') : label(value);
  return field.unit && text ? `${text} ${field.unit}` : text;
}
function advancedValidationIssues(member, type, values, now, index = null) {
  const issues = [];
  const currentYear = Number(now.slice(0, 4));
  const sections = type === 'member' ? Object.entries(ADVANCED_FIELDS.member) : [[type === 'tumor' ? 3 : 5, ADVANCED_FIELDS[type]]];
  const add = (field, step, message) => issues.push({ memberId: member.id, step: Number(step), key: field.key, message: `${field.label}: ${message}`, advanced: true, type: type === 'member' ? null : type, index });
  const ageLimit = member.birthYear && /^\d{4}$/.test(member.birthYear) ? Math.min(125, (member.vitalStatus === 'fallecido' && member.deathYear ? Number(member.deathYear) : currentYear) - Number(member.birthYear)) : 125;
  for (const [step, fields] of sections) for (const field of fields) {
    const value = values?.[field.key];
    if (!hasAdvancedValue(value)) continue;
    if (field.kind === 'multi') {
      if (!Array.isArray(value) || value.some(item => !field.options.some(option => option.value === item))) add(field, step, 'selecciona opciones válidas.');
      else if (value.length > 1 && value.some(item => ['ninguna', 'ninguno', 'desconocida', 'desconocido'].includes(item))) add(field, step, 'no combines ninguna/desconocida con otros hallazgos.');
    } else if (Array.isArray(value)) add(field, step, 'introduce un único valor.');
    else if (field.kind === 'select' && !field.options.some(option => option.value === String(value))) add(field, step, 'selecciona una opción válida.');
    else if (field.kind === 'number') {
      const number = Number(String(value).replace(',', '.'));
      const max = field.year ? currentYear : field.max;
      if (!Number.isFinite(number) || String(value).trim() === '' || number < field.min || number > max || (field.integer && !Number.isInteger(number))) add(field, step, `introduce ${field.integer ? 'un entero' : 'un número'} entre ${field.min} y ${max}.`);
      else if (field.unit === 'años' && /Age$/.test(field.key) && number > ageLimit) add(field, step, 'la edad supera la compatible con el nacimiento y estado vital.');
      else if (field.key === 'currentAge' && member.vitalStatus === 'fallecido') add(field, step, 'usa la edad al fallecimiento para un familiar fallecido.');
      else if (field.key === 'deathAge' && member.vitalStatus === 'vivo') add(field, step, 'no corresponde a un familiar registrado como vivo.');
      else if (field.key === 'currentAge' && member.birthYear && ![currentYear - Number(member.birthYear), currentYear - Number(member.birthYear) - 1].includes(number)) add(field, step, 'no coincide con el año de nacimiento.');
      else if (field.key === 'deathAge' && member.birthYear && member.deathYear && ![Number(member.deathYear) - Number(member.birthYear), Number(member.deathYear) - Number(member.birthYear) - 1].includes(number)) add(field, step, 'no coincide con los años de nacimiento y defunción.');
    } else if (field.kind === 'date') {
      const parsed = new Date(`${value}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value || value > now || value < '1900-01-01') add(field, step, 'introduce una fecha real entre 1900 y hoy (AAAA-MM-DD).');
      else if (field.key === 'birthDate' && member.birthYear && value.slice(0, 4) !== String(member.birthYear)) add(field, step, 'no coincide con el año de nacimiento registrado.');
      else if (field.key === 'deathDate' && member.deathYear && value.slice(0, 4) !== String(member.deathYear)) add(field, step, 'no coincide con el año de defunción registrado.');
      else if (field.key === 'deathDate' && values.birthDate && value < values.birthDate) add(field, step, 'no puede ser anterior al nacimiento.');
      else if (field.key === 'reportDate' && values.reportYear && value.slice(0, 4) !== String(values.reportYear)) add(field, step, 'no coincide con el año del informe.');
    } else if (field.kind === 'relative') {
      if (value === member.id || !/^\d{2}$/.test(value)) add(field, step, 'indica el ID de otro familiar.');
    } else if (/AgeRange$/.test(field.key)) {
      const range = String(value).match(/^(\d{1,3})\s*[-–]\s*(\d{1,3})$/);
      if (!range || Number(range[1]) > Number(range[2]) || Number(range[2]) > 125) add(field, step, 'introduce un rango ordenado, por ejemplo 40-44.');
    }
  }
  if (type === 'member' && values.smokingStartAge && values.smokingEndAge && Number(values.smokingEndAge) < Number(values.smokingStartAge)) {
    const field = ADVANCED_FIELDS.member[7].find(f => f.key === 'smokingEndAge'); add(field, 7, 'el abandono no puede ser anterior al inicio.');
  }
  return issues;
}
let advancedPanelId = 0;
function appendAdvancedSection(root, type, step, values = {}) {
  const fields = advancedDefinitions(type, step);
  const wrap = document.createElement('div'); wrap.className = 'advanced-section';
  const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'button secondary advanced-toggle'; toggle.textContent = 'Variables de alta especificación';
  const panel = document.createElement('div'); panel.className = 'form-grid advanced-panel'; panel.dataset.advancedPanel = type; panel.dataset.step = step;
  panel.id = `advanced-panel-${++advancedPanelId}`; panel.hidden = !fields.some(field => hasAdvancedValue(values[field.key]));
  toggle.setAttribute('aria-controls', panel.id); toggle.setAttribute('aria-expanded', String(!panel.hidden));
  toggle.addEventListener('click', () => { panel.hidden = !panel.hidden; toggle.setAttribute('aria-expanded', String(!panel.hidden)); });
  for (const definition of fields) {
    const label = document.createElement('label'); label.className = 'field';
    const title = document.createElement('span'); title.textContent = definition.label; label.append(title);
    const field = document.createElement(['select', 'multi'].includes(definition.kind) ? 'select' : 'input');
    field.dataset.advancedKey = definition.key;
    if (definition.options) {
      if (definition.kind === 'multi') { field.multiple = true; field.size = Math.min(5, definition.options.length); }
      else { const blank = document.createElement('option'); blank.value = ''; blank.textContent = 'Sin registrar'; field.append(blank); }
      definition.options.forEach(option => { const item = document.createElement('option'); item.value = option.value; item.textContent = option.label; field.append(item); });
    } else { field.type = 'text'; if (definition.kind === 'number') field.inputMode = definition.integer ? 'numeric' : 'decimal'; }
    label.append(field);
    if (definition.hint || definition.unit || definition.kind === 'multi') {
      const help = document.createElement('small'); help.textContent = definition.hint || (definition.kind === 'multi' ? 'Puedes seleccionar varias opciones con ⌘ o Ctrl. Deja sin selección si no consta.' : definition.unit); label.append(help);
    }
    setEditableValue(field, values[definition.key] ?? (definition.kind === 'multi' ? [] : ''));
    ['input', 'change'].forEach(event => field.addEventListener(event, () => {
      const member = activeMember(); if (!member) return;
      if (type === 'member') {
        member.advanced ||= {};
        const value = field.multiple ? [...field.selectedOptions].map(option => option.value) : field.value.trim();
        if (hasAdvancedValue(value)) member.advanced[definition.key] = value; else delete member.advanced[definition.key];
      } else saveRepeatEntries();
      updateReview();
    }));
    panel.append(label);
  }
  wrap.append(toggle, panel); root.append(wrap);
}
function readAdvancedFields(entry) {
  const result = { ...(entry.advancedOriginal || {}) };
  $$('[data-advanced-key]', entry).forEach(field => {
    const value = field.multiple ? [...field.selectedOptions].map(option => option.value) : field.value.trim();
    if (hasAdvancedValue(value)) result[field.dataset.advancedKey] = value; else delete result[field.dataset.advancedKey];
  });
  return result;
}
function loadAdvancedMemberFields() {
  const values = activeMember()?.advanced || {};
  $$('.panel > .advanced-section').forEach(wrap => {
    const panel = $('[data-advanced-panel]', wrap);
    $$('[data-advanced-key]', panel).forEach(field => setEditableValue(field, values[field.dataset.advancedKey] ?? (field.multiple ? [] : '')));
    const populated = advancedDefinitions('member', panel.dataset.step).some(field => hasAdvancedValue(values[field.key]));
    panel.hidden = !populated; $('.advanced-toggle', wrap).setAttribute('aria-expanded', String(populated));
  });
}
function initializeAdvancedFields() {
  Object.keys(ADVANCED_FIELDS.member).forEach(step => appendAdvancedSection($(`[data-panel="${step}"]`), 'member', step));
}
