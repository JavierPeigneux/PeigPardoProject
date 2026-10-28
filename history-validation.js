function historyIssues(history, rules, now, checkGene) {
  const issues = [];
  const currentYear = Number(now.slice(0, 4));
  const add = (memberId, step, key, message, type = null, index = null) => {
    const existing = issues.find(issue => issue.memberId === memberId && issue.step === step && issue.key === key && issue.type === type && issue.index === index);
    if (existing) existing.message += ' ' + message;
    else issues.push({ memberId, step, key, message, type, index });
  };
  const checkOptions = (value, options) => options && !options.includes(value);
  const validYear = year => /^\d{4}$/.test(String(year)) && Number(year) >= 1900 && Number(year) <= currentYear;
  if (checkOptions(history.consent, rules.consent)) add(null, 8, 'consent', 'Selecciona un consentimiento válido.');
  if (history.visitDate) {
    const parsed = new Date(`${history.visitDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(history.visitDate) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== history.visitDate)
      add(null, 8, 'visitDate', 'Revisa la fecha de visita (AAAA-MM-DD).');
  }
  if (history.familyCode.length > 40) add(null, 8, 'familyCode', 'El código admite hasta 40 caracteres.');
  for (const member of history.members) {
    for (const [key, rule] of Object.entries(rules.member)) {
      if (checkOptions(member[key], rule.options)) add(member.id, rule.step, key, 'Selecciona una opción válida; se conserva el valor importado.');
      if (rule.maxLength && String(member[key]).length > rule.maxLength) add(member.id, rule.step, key, `Admite hasta ${rule.maxLength} caracteres.`);
    }
    for (const key of ['birthYear', 'deathYear']) {
      if (member[key] && !validYear(member[key])) add(member.id, 2, key, `Introduce un año entero entre 1900 y ${currentYear}.`);
    }
    if (validYear(member.birthYear) && validYear(member.deathYear) && Number(member.deathYear) < Number(member.birthYear))
      add(member.id, 2, 'deathYear', 'La defunción no puede ser anterior al nacimiento.');
    for (const key of ['fatherId', 'motherId']) {
      const id = member[key];
      if (!id) continue;
      const parent = history.members.find(m => m.id === id);
      if (!parent || id === member.id) add(member.id, 1, key, 'Elige el ID de otro familiar registrado o borra el vínculo.');
      else if (validYear(member.birthYear) && validYear(parent.birthYear) && Number(member.birthYear) < Number(parent.birthYear)) {
        add(member.id, 2, 'birthYear', `No puede nacer antes que su progenitor ${id}.`);
        add(parent.id, 2, 'birthYear', `Su hijo/a ${member.id} figura con un nacimiento anterior. Revisa ambos años o el vínculo.`);
      }
    }
    for (const [type, items, step] of [['tumor', member.tumors, 3], ['genetic', member.genetics, 5]]) {
      items.forEach((item, index) => {
        for (const [key, options] of Object.entries(rules[type])) {
          if (checkOptions(item[key], options)) add(member.id, step, key, 'Selecciona una opción válida; se conserva el valor importado.', type, index);
        }
        if (type === 'genetic') {
          const error = checkGene(item.gene);
          if (error) add(member.id, step, 'gene', error, type, index);
        } else {
          // Attribute errors to the actual field instead of marking the whole entry.
          const yearError = diagnosisError(member, { ...item, ageAtDiagnosis: '' }, now);
          if (yearError) add(member.id, step, 'diagnosisYear', yearError, type, index);
          const ageError = diagnosisError(member, { ...item, diagnosisYear: yearError ? '' : item.diagnosisYear }, now);
          if (ageError) add(member.id, step, 'ageAtDiagnosis', ageError, type, index);
        }
      });
    }
  }
  return issues;
}
