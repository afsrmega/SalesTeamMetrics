export const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start, end };
};

export const isToday = (dateStr) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const { start, end } = getTodayRange();
  return date >= start && date < end;
};

export const isOverdue = (dateStr) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const { start } = getTodayRange();
  return date < start;
};

export const isFuture = (dateStr) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const { end } = getTodayRange();
  return date >= end;
};

export const getFollowUpPriority = (dateStr) => {
  if (!dateStr) return 3; // NULL/empty
  if (isToday(dateStr)) return 0; // TODAY
  if (isOverdue(dateStr)) return 1; // OVERDUE
  if (isFuture(dateStr)) return 2; // FUTURE
  return 3; // Fallback
};

export const compareProspects = (a, b) => {
  // 1. qualification DESC
  const qualA = Number(a.qualification) || 0;
  const qualB = Number(b.qualification) || 0;
  if (qualA !== qualB) return qualB - qualA;

  // 2. followUpPriority ASC (TODAY=0, OVERDUE=1, FUTURE=2, NULL=3)
  const priorityA = getFollowUpPriority(a.follow_up_at);
  const priorityB = getFollowUpPriority(b.follow_up_at);
  if (priorityA !== priorityB) return priorityA - priorityB;

  // 3. follow_up_at ASC (if same priority, earlier date first)
  if (a.follow_up_at && b.follow_up_at) {
    const dateA = new Date(a.follow_up_at).getTime();
    const dateB = new Date(b.follow_up_at).getTime();
    if (dateA !== dateB) return dateA - dateB;
  } else if (a.follow_up_at && !b.follow_up_at) {
    return -1;
  } else if (!a.follow_up_at && b.follow_up_at) {
    return 1;
  }

  // 4. estimated_property_value DESC (if no follow-up or exact same follow-up)
  const valA = Number(a.estimated_property_value) || 0;
  const valB = Number(b.estimated_property_value) || 0;
  if (valA !== valB) return valB - valA;

  // 5. updated_at DESC (final tiebreaker)
  const upA = new Date(a.updated_at || 0).getTime();
  const upB = new Date(b.updated_at || 0).getTime();
  return upB - upA;
};

export const sortProspectsByPriority = (prospects) => {
  if (!prospects || !Array.isArray(prospects)) return [];
  return [...prospects].sort(compareProspects);
};