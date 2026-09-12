const sameValue = (left, right) =>
  String(left ?? '').trim().toLowerCase() === String(right ?? '').trim().toLowerCase();

export function resolveTaxonomyFilters(departments = [], filters = {}) {
  const resolved = { ...filters };
  const requestedDepartment = filters.department;

  const department = requestedDepartment
    ? departments.find(
        (item) => sameValue(item.id, requestedDepartment) || sameValue(item.name, requestedDepartment)
      )
    : null;

  if (department) resolved.department = department.name;

  if (filters.subject) {
    const departmentPool = department ? [department] : departments;
    const subject = departmentPool
      .flatMap((item) => item.subjects || [])
      .find(
        (item) => sameValue(item.id, filters.subject) || sameValue(item.name, filters.subject)
      );

    if (subject) resolved.subject = subject.name;
  }

  return resolved;
}
