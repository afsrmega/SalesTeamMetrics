
export const isAdminMember = (member) => {
  if (!member) return false;
  return (
    member.is_admin === true ||
    (member.role && ['admin', 'administrator'].includes(member.role.toLowerCase()))
  );
};
