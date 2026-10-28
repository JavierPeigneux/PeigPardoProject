function check(condition, message) { if (!condition) throw new Error(message); }
const now = '2026-10-28';
const person = { birthYear: '1980', vitalStatus: 'vivo', deathYear: '' };
function error(year, age, member = person) { return diagnosisError(member, { diagnosisYear: year, ageAtDiagnosis: age }, now); }
check(error('1979', ''), 'Diagnóstico anterior al nacimiento');
check(error('2027', ''), 'Diagnóstico futuro');
check(error('2025.5', ''), 'Año fraccionario');
check(!error('2024', '43'), 'Año válido');
check(!error('2024', '44'), 'Edad antes o después del cumpleaños');
check(error('2024', '42'), 'Edad incompatible con fecha');
check(error('', '47'), 'Edad superior a la posible hoy');
check(error('', '-1') && error('', '1.5'), 'Edad entera no negativa');
check(!error('', '0') && !error('', ''), 'Cero y desconocida');
const deceased = { ...person, vitalStatus: 'fallecido', deathYear: '2000' };
check(error('2001', '', deceased), 'Diagnóstico posterior al fallecimiento');
check(error('', '21', deceased), 'Edad superior a la alcanzable al fallecer');
check(!error('2000', '20', deceased), 'Diagnóstico en año de defunción');
check(!error('2026', '45', { ...person, deathYear: '2000' }), 'Ignorar defunción desactivada');
check(diagnosisLimits(person, now).min === 1980, 'Límites disponibles sin fecha introducida');
check(error('', '126', { birthYear: '', vitalStatus: 'desconocido' }), 'Límite general sin nacimiento');
check(error('2024-02-29', ''), 'Rechazar fechas completas');
check(error('abcd', ''), 'Rechazar texto');
check(!error(2024, '44'), 'Año numérico en exportación');
print('OK: años enteros, nacimiento, futuro, defunción y coherencia de edades');
