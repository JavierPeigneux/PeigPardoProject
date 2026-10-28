// Birth and death are known only to the year: allow either possible birthday.
function diagnosisLimits(member, now) {
  const birth = Number(member.birthYear) || 1900;
  const death = member.vitalStatus === 'fallecido' && member.deathYear ? Math.min(Number(member.deathYear), Number(now.slice(0, 4))) : Number(now.slice(0, 4));
  return { min: `${birth}-01-01`, max: `${death}-12-31` < now ? `${death}-12-31` : now,
    maxAge: member.birthYear ? Math.min(125, death - birth) : 125 };
}
function diagnosisError(member, tumor, now) {
  const limits = diagnosisLimits(member, now);
  const date = tumor.diagnosisDate || '';
  if (date) {
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < limits.min || date > limits.max)
      return `La fecha de diagnóstico debe estar entre ${limits.min} y ${limits.max}.`;
  }
  if (tumor.ageAtDiagnosis !== '' && tumor.ageAtDiagnosis != null) {
    const age = Number(tumor.ageAtDiagnosis);
    if (!Number.isInteger(age) || age < 0 || age > limits.maxAge)
      return `La edad al diagnóstico debe ser un número entero entre 0 y ${limits.maxAge} años, compatible con el nacimiento y el estado vital.`;
    if (date && member.birthYear) {
      const difference = Number(date.slice(0, 4)) - Number(member.birthYear);
      if (age < Math.max(0, difference - 1) || age > difference)
        return 'La edad al diagnóstico no coincide con el año de nacimiento y la fecha de diagnóstico.';
    }
  }
  return '';
}
