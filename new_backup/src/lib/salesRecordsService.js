import { supabase } from './customSupabaseClient';
import { syncMemberMonthlyMetrics } from './salesService';

export const isWithin48Hours = (createdAt) => {
  if (!createdAt) return false;
  const createdDate = new Date(createdAt);
  const now = new Date();
  const diffInHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
  return diffInHours <= 48;
};

export const invalidateSale = async (recordId, reason, userId) => {
  try {
    if (!recordId) throw new Error("Record ID is required");

    const { data: updatedRecord, error: updateError } = await supabase
      .from('sales_records')
      .update({
        is_valid: false,
        invalidated_at: new Date().toISOString(),
        invalidated_by: userId,
        invalidation_reason: reason || null
      })
      .eq('id', recordId)
      .select('sales_member_id')
      .single();

    if (updateError) throw updateError;
    if (!updatedRecord) throw new Error("Record not found");

    const memberId = updatedRecord.sales_member_id;
    await syncMemberMonthlyMetrics(memberId);

    return { success: true, memberId };
  } catch (error) {
    console.error("Error invalidating sale:", error);
    throw new Error(`Failed to invalidate sale: ${error.message}`);
  }
};

export const deleteSale = async (recordId, reason, userId) => {
  try {
    if (!recordId) throw new Error("Record ID is required");
    if (!reason || reason.trim().length < 5) throw new Error("Reason must be at least 5 characters long");

    // Fetch the record to validate the 48-hour window
    const { data: record, error: fetchError } = await supabase
      .from('sales_records')
      .select('created_at, sales_member_id')
      .eq('id', recordId)
      .single();

    if (fetchError || !record) throw new Error("Sale record not found");

    if (!isWithin48Hours(record.created_at)) {
      return { success: false, error: "Sale can only be deleted within 48 hours of creation" };
    }

    // Update the record as deleted
    const { error: updateError } = await supabase
      .from('sales_records')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
        deletion_reason: reason.trim()
      })
      .eq('id', recordId);

    if (updateError) throw updateError;

    // Recalculate metrics
    await syncMemberMonthlyMetrics(record.sales_member_id);

    return { success: true, memberId: record.sales_member_id };
  } catch (error) {
    console.error("Error deleting sale:", error);
    return { success: false, error: error.message };
  }
};