export const getDateOnly = (date) => {
  if (!date) return null;

  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

export const isMemberActiveForPeriod = (member, periodStart, periodEnd) => {
  const startDate = getDateOnly(periodStart);
  const endDate = getDateOnly(periodEnd);

  if (!startDate || !endDate) return true;

  const memberStart = getDateOnly(member?.employment_start_date || member?.created_at);
  const memberEnd = getDateOnly(member?.employment_end_date);

  // If the member started after the selected period ended, do not show.
  if (memberStart && memberStart > endDate) return false;

  // If the member ended before the selected period started, do not show.
  if (memberEnd && memberEnd < startDate) return false;

  // Otherwise, the member was active at least one day in the selected period.
  return true;
};

export const hasSalesInPeriod = (member, salesRecords = [], periodStart, periodEnd) => {
  const startDate = getDateOnly(periodStart);
  const endDate = getDateOnly(periodEnd);

  if (!member?.id || !startDate || !endDate) return false;

  return salesRecords.some((record) => {
    const recordMemberId =
      record.sales_member_id ||
      record.salesMemberId ||
      record.member_id ||
      record.memberId;

    if (recordMemberId !== member.id) return false;

    if (record.is_valid === false) return false;
    if (record.is_deleted === true) return false;

    const recordDate = getDateOnly(record.created_at);
    if (!recordDate) return false;

    return recordDate >= startDate && recordDate <= endDate;
  });
};

export const shouldShowMemberForPeriod = (
  member,
  salesRecords = [],
  periodStart,
  periodEnd
) => {
  const isArchived = member?.is_archived === true;

  // Active members should always show.
  if (!isArchived) return true;

  // Archived members show if they worked at least one day in the selected period.
  if (isMemberActiveForPeriod(member, periodStart, periodEnd)) {
    return true;
  }

  // Also show archived members if they have sales in the selected period.
  if (hasSalesInPeriod(member, salesRecords, periodStart, periodEnd)) {
    return true;
  }

  return false;
};

export const getVisibleMembersForPeriod = (
  members = [],
  salesRecords = [],
  periodStart,
  periodEnd
) => {
  return members.filter((member) =>
    shouldShowMemberForPeriod(member, salesRecords, periodStart, periodEnd)
  );
};

export const getMemberStatusLabel = (member) => {
  return member?.is_archived ? "Archived" : "Active";
};