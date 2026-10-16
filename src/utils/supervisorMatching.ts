import { User, EvaluationTemplate } from '../types';

/**
 * Normalizes an ID or employee number for comparison:
 * strips prefixes like 'usr_', punctuation, and converts to lowercase.
 */
export const normalizeId = (id?: string | null): string => {
  if (!id) return '';
  return id
    .toLowerCase()
    .trim()
    .replace(/^usr[_-]/, '')
    .replace(/[^a-z0-9]/g, '');
};

/**
 * Known user aliases (multiple accounts or legacy IDs for the same person)
 */
const KNOWN_ID_CLUSTERS: string[][] = [
  // Ma. Emily Peralta Floresca / Melette Floresca
  ['13200000000040008000000000000000', 'b0000000000000000000000000000006', 'r132', 'dhgaw01', 'e132'],
  // Brandon Chia
  ['cebad000000040008000000000000000', 'ceo001', 'cebad000'],
  // Gerard Marquez
  ['04d8b7d3052846039dc2369affcc6256', 'e1503000000040008000000000000000', '3054c18b8515410585fc67e56cdf7b72', 'e1503', 'e1503seedarchived'],
  // Mark Ryan Lopez Mariano
  ['685fec6dc81e4795ba4c48466dfbecd3', 'e1537000000040008000000000000000', 'emp7310', 'e1537'],
  // Eugene Paul Valdez Parel
  ['e9950000000040008000000000000000', 'fd5433b8e3074c0582bd62f4b9ebba0d', 'e995'],
  // Jorge Barraca
  ['e1161000000040008000000000000000', 'e1161'],
];

/**
 * Checks whether two IDs match, handling UUIDs, 'usr_' prefixes, employee numbers, and alias clusters.
 */
export const matchIds = (idA?: string | null, idB?: string | null): boolean => {
  if (!idA || !idB) return false;
  if (idA === idB) return true;
  const normA = normalizeId(idA);
  const normB = normalizeId(idB);
  if (normA.length > 0 && normA === normB) return true;

  // Check known ID clusters
  for (const cluster of KNOWN_ID_CLUSTERS) {
    if (cluster.includes(normA) && cluster.includes(normB)) {
      return true;
    }
  }

  return false;
};

/**
 * Robust name matching that handles punctuation, middle names, initials, and known aliases.
 */
export const matchNames = (nameA?: string | null, nameB?: string | null): boolean => {
  if (!nameA || !nameB) return false;
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const a = clean(nameA);
  const b = clean(nameB);
  if (a === b) return true;
  if (a.length > 3 && b.length > 3 && (a.includes(b) || b.includes(a))) return true;

  // Known APES Aliases
  // 1. Ma. Emily Peralta Floresca / Melette Floresca / Ma. Emily Floresca
  const isEmily = (s: string) =>
    s.includes('floresca') && (s.includes('emily') || s.includes('melette') || s.includes('peralta') || s.includes('ma'));
  if (isEmily(a) && isEmily(b)) return true;

  // 2. Brandon Chia / CEO
  const isBrandon = (s: string) => s.includes('brandon') && s.includes('chia');
  if (isBrandon(a) && isBrandon(b)) return true;

  // 3. Gerard Valeros Marquez / Gerard Marquez
  const isGerard = (s: string) => s.includes('gerard') && s.includes('marquez');
  if (isGerard(a) && isGerard(b)) return true;

  // 4. Eugene Paul Valdez Parel / Eugene Parel
  const isEugene = (s: string) => s.includes('eugene') && (s.includes('parel') || s.includes('valdez'));
  if (isEugene(a) && isEugene(b)) return true;

  // 5. Jorge Barraca
  const isJorge = (s: string) => s.includes('jorge') && s.includes('barraca');
  if (isJorge(a) && isJorge(b)) return true;

  // 6. Mark Ryan Lopez Mariano / Mark Ryan Mariano
  const isMarkRyan = (s: string) =>
    (s.includes('mark') && s.includes('ryan')) || (s.includes('mariano') && s.includes('mark'));
  if (isMarkRyan(a) && isMarkRyan(b)) return true;

  // 7. Manuel Castro Embuido / Manuel Embuido Jr. / Manuel, Jr. Embuido / Jun Embuido
  const isManuel = (s: string) => s.includes('embuido') && (s.includes('manuel') || s.includes('jun') || s.includes('castro'));
  if (isManuel(a) && isManuel(b)) return true;

  // 8. Maria Elena Pellazo / Elena Pellazo / Malene Pellazo
  const isPellazo = (s: string) => s.includes('pellazo') && (s.includes('elena') || s.includes('malene') || s.includes('maria'));
  if (isPellazo(a) && isPellazo(b)) return true;

  // 9. James Ivan Luigi Ignacio Abendan / James Ivan Abendan
  const isAbendan = (s: string) => s.includes('abendan') && (s.includes('james') || s.includes('ivan') || s.includes('luigi'));
  if (isAbendan(a) && isAbendan(b)) return true;

  // 10. Mary Anne Udtujan Murphy / Mary Anne Murphy
  const isMurphy = (s: string) => s.includes('murphy') && (s.includes('mary') || s.includes('anne') || s.includes('udtujan'));
  if (isMurphy(a) && isMurphy(b)) return true;

  // 11. Anmer Bantay Carrillo / Rara Carrillo / Anmer Carrillo
  const isCarrillo = (s: string) => s.includes('carrillo') && (s.includes('anmer') || s.includes('rara') || s.includes('bantay'));
  if (isCarrillo(a) && isCarrillo(b)) return true;

  // 12. Emmanuel Buenaventura / Emman Buenaventura
  const isBuenaventura = (s: string) => s.includes('buenaventura') && (s.includes('emmanuel') || s.includes('emman'));
  if (isBuenaventura(a) && isBuenaventura(b)) return true;

  // 13. Pamela Maureen Fernando / Pam Fernando
  const isFernando = (s: string) => s.includes('fernando') && (s.includes('pam') || s.includes('maureen'));
  if (isFernando(a) && isFernando(b)) return true;

  // 14. Jemimah Naomi De Los Santos / Jem delos Santos
  const isDelosSantos = (s: string) =>
    (s.includes('delos santos') || s.includes('de los santos')) && (s.includes('jem') || s.includes('naomi'));
  if (isDelosSantos(a) && isDelosSantos(b)) return true;

  // 15. Robert Cuevas Lulab / Robert Lulab
  const isLulab = (s: string) => s.includes('lulab') && s.includes('robert');
  if (isLulab(a) && isLulab(b)) return true;

  // 16. Lucil Albino Osorio / Lucil Osorio
  const isOsorio = (s: string) => s.includes('osorio') && s.includes('lucil');
  if (isOsorio(a) && isOsorio(b)) return true;

  // Token matching: all significant tokens of the shorter name exist in the longer name
  const tokensA = a.split(' ').filter(w => w.length > 2);
  const tokensB = b.split(' ').filter(w => w.length > 2);
  if (tokensA.length >= 2 && tokensB.length >= 2) {
    const [shorter, longer] = tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];
    const allFound = shorter.every(tok => longer.includes(tok));
    if (allFound) return true;

    // First and last name match (e.g. "Robert Lulab" matches "Robert Cuevas Lulab")
    const firstA = tokensA[0];
    const lastA = tokensA[tokensA.length - 1];
    const firstB = tokensB[0];
    const lastB = tokensB[tokensB.length - 1];
    if (firstA === firstB && lastA === lastB) return true;
  }

  return false;
};

/**
 * Checks if a given template belongs to currentUser (as creator or as target employee).
 */
export const checkIsTemplateOwner = (currentUser?: User | null, template?: EvaluationTemplate | null): boolean => {
  if (!currentUser || !template) return false;

  const curId = currentUser.id;
  const curAuthId = (currentUser as any)?.user_id;
  const curEmpNo = currentUser.employeeNumber;
  const curName = currentUser.name;

  if (matchIds(template.createdForEmployeeId, curId)) return true;
  if (curAuthId && matchIds(template.createdForEmployeeId, curAuthId)) return true;
  if (matchIds(template.createdForEmployeeNumber, curEmpNo)) return true;
  if (matchNames(template.createdForEmployeeName, curName)) return true;

  if (matchIds(template.createdByUserId, curId)) return true;
  if (curAuthId && matchIds(template.createdByUserId, curAuthId)) return true;
  if (matchNames(template.createdByName, curName)) return true;

  if (curName && template.title && matchNames(template.title, curName)) return true;

  return false;
};

/**
 * Checks whether currentUser is the Immediate Supervisor (IS) for a given template.
 */
export const checkIsISForTemplate = (
  currentUser?: User | null,
  template?: EvaluationTemplate | null,
  users: User[] = []
): boolean => {
  if (!currentUser || !template) return false;

  // CRITICAL: An employee can NEVER be the Immediate Supervisor of their own template!
  if (checkIsTemplateOwner(currentUser, template)) {
    return false;
  }

  const curId = currentUser.id;
  const curAuthId = (currentUser as any)?.user_id;
  const curEmpNo = currentUser.employeeNumber;
  const curName = currentUser.name;

  // 1. Direct match on template immediateSupervisor fields
  if (matchIds(template.immediateSupervisorId, curId)) return true;
  if (curAuthId && matchIds(template.immediateSupervisorId, curAuthId)) return true;
  if (matchIds(template.immediateSupervisorId, curEmpNo)) return true;
  if (matchNames(template.immediateSupervisorName, curName)) return true;

  // 2. Direct report lookup: check if the template belongs to any direct report of currentUser
  const myReports = users.filter(u => {
    if (u.id === curId || (curAuthId && u.id === curAuthId)) return false;
    return (
      matchIds(u.immediateSuperiorId, curId) ||
      (curAuthId && matchIds(u.immediateSuperiorId, curAuthId)) ||
      matchIds(u.immediateSuperiorId, curEmpNo) ||
      matchNames(u.immediateSuperiorName, curName)
    );
  });

  const isDirectReportTemplate = myReports.some(r => {
    // If template has a specific target employee, match against that
    if (template.createdForEmployeeId || template.createdForEmployeeNumber || template.createdForEmployeeName) {
      return (
        matchIds(template.createdForEmployeeId, r.id) ||
        matchIds(template.createdForEmployeeNumber, r.employeeNumber) ||
        matchNames(template.createdForEmployeeName, r.name)
      );
    }
    // Otherwise check creator
    return matchIds(template.createdByUserId, r.id) || matchNames(template.createdByName, r.name);
  });

  if (isDirectReportTemplate) return true;

  // 3. Target employee record check in users list
  const targetUser = users.find(u => {
    if (template.createdForEmployeeId || template.createdForEmployeeNumber || template.createdForEmployeeName) {
      return (
        matchIds(template.createdForEmployeeId, u.id) ||
        matchIds(template.createdForEmployeeNumber, u.employeeNumber) ||
        matchNames(template.createdForEmployeeName, u.name)
      );
    }
    return matchIds(template.createdByUserId, u.id) || matchNames(template.createdByName, u.name);
  });

  if (targetUser) {
    const isISOfTarget =
      matchIds(targetUser.immediateSuperiorId, curId) ||
      (curAuthId && matchIds(targetUser.immediateSuperiorId, curAuthId)) ||
      matchIds(targetUser.immediateSuperiorId, curEmpNo) ||
      matchNames(targetUser.immediateSuperiorName, curName);

    if (isISOfTarget) return true;
  }

  // 4. Department Head match: department head can review templates in their department
  if (
    currentUser.role === 'dept_head' &&
    currentUser.departmentName &&
    template.departmentName &&
    currentUser.departmentName.trim().toLowerCase() === template.departmentName.trim().toLowerCase()
  ) {
    return true;
  }

  // 5. President / Executive match: President is supervisor of Department Heads
  if (currentUser.role === 'president') {
    if (matchNames(template.immediateSupervisorName, 'Brandon Chia') || matchNames(template.immediateSupervisorName, curName)) {
      return true;
    }
    // Also if target employee is a Dept Head whose supervisor is Brandon Chia
    if (targetUser && (targetUser.role === 'dept_head' || targetUser.isDepartmentHead)) {
      const isSupervisorOfDeptHead = 
        !targetUser.immediateSuperiorName || 
        matchNames(targetUser.immediateSuperiorName, 'Brandon Chia') ||
        matchNames(targetUser.immediateSuperiorName, curName);
      if (isSupervisorOfDeptHead) return true;
    }
  }

  return false;
};

export const resolveSupervisorForUser = (employee?: User | null, users: User[] = []): User | null => {
  if (!employee) return null;

  // 1. Direct ID, employeeNumber, or Name match
  const directMatch = users.find(u =>
    (employee.immediateSuperiorId && matchIds(employee.immediateSuperiorId, u.id)) ||
    (employee.immediateSuperiorId && matchIds(employee.immediateSuperiorId, u.employeeNumber)) ||
    (employee.immediateSuperiorName && matchNames(employee.immediateSuperiorName, u.name))
  );
  if (directMatch) return directMatch;

  // 2. Department Head reporting: All Dept Heads report to the President (Brandon Chia)
  if (employee.role === 'dept_head') {
    const ceo = users.find(u => u.role === 'president' || matchNames(u.name, 'Brandon Chia'));
    if (ceo) return ceo;
  }

  // 3. Fallback: Staff without explicit supervisor report to their Department Head
  if (employee.departmentId || employee.departmentName) {
    const deptHead = users.find(u =>
      (u.role === 'dept_head' || u.isDepartmentHead) &&
      u.id !== employee.id &&
      ((employee.departmentId && u.departmentId === employee.departmentId) ||
       (employee.departmentName && u.departmentName && matchNames(u.departmentName, employee.departmentName)))
    );
    if (deptHead) return deptHead;
  }

  return null;
};
