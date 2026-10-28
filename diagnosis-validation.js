// Birth and death are known only to the year: allow either possible birthday.
function diagnosisLimits(member, now) {
  const birth = Number(member.birthYear) || 1900;
  const death = member.vitalStatus === 'fallecido' && member.deathYear ? Math.min(Number(member.deathYear), Number(now.slice(0, 4))) : Number(now.slice(0, 4));
  return { min: birth, max: death,
    maxAge: member.birthYear ? Math.min(125, death - birth) : 125 };
}
function diagnosisError(member, tumor, now) {
  const limits = diagnosisLimits(member, now);
  const year = tumor.diagnosisYear;
  const hasYear = year !== '' && year != null;
  if (hasYear && (!/^\d{4}$/.test(String(year)) || Number(year) < limits.min || Number(year) > limits.max))
    return `El año de diagnóstico debe ser un año entero entre ${limits.min} y ${limits.max}.`;
  if (tumor.ageAtDiagnosis !== '' && tumor.ageAtDiagnosis != null) {
    const age = Number(tumor.ageAtDiagnosis);
    if (!Number.isInteger(age) || age < 0 || age > limits.maxAge)
      return `La edad al diagnóstico debe ser un número entero entre 0 y ${limits.maxAge} años, compatible con el nacimiento y el estado vital.`;
    if (hasYear && member.birthYear) {
      const difference = Number(year) - Number(member.birthYear);
      if (age < Math.max(0, difference - 1) || age > difference)
        return 'La edad al diagnóstico no coincide con el año de nacimiento y el año de diagnóstico.';
    }
  }
  return '';
}
