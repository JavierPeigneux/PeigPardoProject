let currentHistoryIssues = [];
function setEditableValue(field, value) {
  value = String(value ?? '');
  if (field.tagName === 'SELECT') {
    [...field.options].filter(option => option.dataset.importedValue).forEach(option => option.remove());
    if (![...field.options].some(option => option.value === value)) {
      const option = document.createElement('option');
      option.value = value; option.textContent = `Valor importado: ${value || '(vacío)'}`;
      option.dataset.importedValue = 'true'; field.append(option);
    }
  }
  if (field.type === 'date' && value) {
    field.value = value;
    if (field.value !== value) { field.type = 'text'; field.placeholder = 'AAAA-MM-DD'; }
  }
  field.value = value;
}
function historyValidationRules() {
  const options = field => field.tagName === 'SELECT' ? [...field.options].filter(option => !option.dataset.importedValue).map(option => option.value) : undefined;
  const member = {};
  $$('[data-member-field]').forEach(field => {
    member[field.dataset.memberField] = { options: options(field), step: Number(field.closest('[data-panel]').dataset.panel), maxLength: field.maxLength > 0 ? field.maxLength : undefined };
  });
  const rules = { member, consent: options($('#consent')), tumor: {}, genetic: {} };
  for (const type of ['tumor', 'genetic']) {
    $$('select[data-field]', $(`#${type}-template`).content).forEach(field => { rules[type][field.dataset.field] = options(field); });
  }
  return rules;
}
function focusHistoryIssue(issue) {
  saveRepeatEntries();
  if (issue.memberId && issue.memberId !== state.activeId) switchMember(issue.memberId);
  showStep(issue.step);
  refreshFormValidation();
  const field = issueField(issue);
  if (field) { field.focus(); field.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}
function issueField(issue) {
  if (!issue.memberId) return $({ consent: '#consent', visitDate: '#visit-date', familyCode: '#family-code' }[issue.key]);
  if (issue.memberId !== state.activeId) return null;
  if (issue.type) {
    const entry = $$(`.${issue.type}-entry`)[issue.index];
    return entry ? $(`[data-field="${issue.key}"]`, entry) : null;
  }
  return $(`[data-member-field="${issue.key}"]`);
}
function refreshFormValidation() {
  currentHistoryIssues = historyIssues(state, historyValidationRules(), today(), geneError);
  $$('[data-error-note]').forEach(note => note.remove());
  $$('[data-member-field], [data-field], #consent, #visit-date, #family-code').forEach(field => {
    field.setCustomValidity(''); field.removeAttribute('aria-invalid');
    if (field.dataset.errorId) {
      const ids = (field.getAttribute('aria-describedby') || '').split(' ').filter(id => id && !id.startsWith('field-error-'));
      if (ids.length) field.setAttribute('aria-describedby', ids.join(' ')); else field.removeAttribute('aria-describedby');
      delete field.dataset.errorId;
    }
  });
  // Field-specific messages supersede the older entry-wide warnings.
  $$('.gene-warning, .tumor-warning, #family-age-warning').forEach(warning => { warning.hidden = true; });
  currentHistoryIssues.forEach((issue, index) => {
    const field = issueField(issue);
    if (!field) return;
    field.setCustomValidity(issue.message); field.setAttribute('aria-invalid', 'true');
    if (field.disabled) field.disabled = false;
    const note = document.createElement('small'); note.className = 'field-error';
    note.dataset.errorNote = 'true'; note.id = `field-error-${index}`; note.textContent = issue.message;
    field.dataset.errorId = note.id;
    field.setAttribute('aria-describedby', [field.getAttribute('aria-describedby'), note.id].filter(Boolean).join(' '));
    field.closest('label').append(note);
  });
  const container = $('#correction-list'); container.replaceChildren();
  $('#correction-summary').textContent = currentHistoryIssues.length ? `${currentHistoryIssues.length} ${currentHistoryIssues.length === 1 ? 'campo' : 'campos'} por revisar · puedes seguir navegando` : 'Sin errores pendientes';
  $('#correction-panel').hidden = !currentHistoryIssues.length;
  currentHistoryIssues.forEach(issue => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'correction-link';
    button.textContent = `${issue.memberId ? 'Familiar ' + issue.memberId : 'Gestión'} · ${issue.type ? (issue.type === 'tumor' ? 'Neoplasia' : 'Estudio genético') + ' ' + (issue.index + 1) + ': ' : ''}${issue.message}`;
    button.addEventListener('click', () => focusHistoryIssue(issue)); container.append(button);
  });
  $$('.step').forEach(button => {
    const count = currentHistoryIssues.filter(issue => issue.step === Number(button.dataset.step) && (!issue.memberId || issue.memberId === state.activeId)).length;
    button.classList.toggle('has-errors', count > 0);
    button.title = count ? `${count} campos por revisar` : '';
  });
  if (!currentHistoryIssues.length && $('#save-status').textContent.startsWith('Hay ')) $('#save-status').textContent = '';
  return currentHistoryIssues;
}
