function familyBirthLimits(member, members, currentYear) {
  const parents = [member.fatherId, member.motherId].map(id => members.find(other => other.id === id)).filter(Boolean);
  const children = members.filter(other => other.fatherId === member.id || other.motherId === member.id);
  const knownYear = value => /^\d{4}$/.test(String(value || '')) && Number(value) >= 1900 && Number(value) <= currentYear;
  return {
    min: Math.max(1900, ...parents.filter(parent => knownYear(parent.birthYear)).map(parent => Number(parent.birthYear))),
    max: Math.min(currentYear, ...children.filter(child => knownYear(child.birthYear)).map(child => Number(child.birthYear)))
  };
}
function familyAgeError(members, currentYear) {
  for (const member of members) {
    for (const key of ['birthYear', 'deathYear']) {
      const year = member[key];
      if (year !== '' && year != null && (!/^\d{4}$/.test(String(year)) || Number(year) < 1900 || Number(year) > currentYear))
        return `Familiar ${member.id}: los años deben ser enteros entre 1900 y ${currentYear}.`;
    }
    if (member.birthYear && member.deathYear && Number(member.deathYear) < Number(member.birthYear))
      return `Familiar ${member.id}: la defunción no puede ser anterior al nacimiento.`;
    for (const key of ['fatherId', 'motherId']) {
      const parent = members.find(other => other.id === member[key]);
      if (parent && member.birthYear && parent.birthYear && Number(member.birthYear) < Number(parent.birthYear))
        return `El familiar ${member.id} no puede nacer antes que su ${key === 'fatherId' ? 'padre' : 'madre'} (${parent.id}). Revisa los años de nacimiento o los vínculos.`;
    }
  }
  return '';
}
