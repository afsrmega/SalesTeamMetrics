import { supabase } from './customSupabaseClient';

/**
 * Logs a change to the global settings in the audit table.
 * @param {string} userId - The ID of the admin making the change.
 * @param {object} changedVariables - Object containing changed variables.
 * @param {object} oldValues - The settings object before the change.
 * @param {object} newValues - The settings object after the change.
 * @param {number} membersUpdatedCount - Number of members successfully updated.
 * @param {number} errorCount - Number of members that failed to update.
 * @returns {Promise<object|null>} The created audit log entry or null if failed.
 */
export const logGlobalSettingsChange = async ({ userId, changedVariables, oldValues, newValues, membersUpdatedCount, errorCount }) => {
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] Attempting to log global settings change...`);
  console.log(`[${timestamp}] Attempting to log global settings change with admin_id:`, userId);
  console.log(`[${timestamp}] Admin ID:`, userId);
  console.log(`[${timestamp}] Changed variables:`, changedVariables);
  console.log(`[${timestamp}] Old values:`, oldValues);
  console.log(`[${timestamp}] New values:`, newValues);

  if (!userId) {
    console.error(`[${timestamp}] Audit Log Error: User ID is required.`);
    return null;
  }
  
  try {
    const { data, error } = await supabase.rpc('log_global_settings_change', {
      p_admin_id: userId,
      p_changed_variables: changedVariables,
      p_old_values: oldValues,
      p_new_values: newValues,
      p_members_updated_count: membersUpdatedCount || 0,
      p_error_count: errorCount || 0
    });

    if (error) {
      if (error.code === '42501') {
         console.error(`[${timestamp}] RLS Policy Error - User may not have permission to insert audit logs`);
      }
      console.error(`[${timestamp}] Full error:`, error);
      // Return null to allow operation to continue without throwing
      return null;
    }

    console.log(`[${timestamp}] Audit log created successfully with ID:`, data);
    return data;
  } catch (err) {
    console.error(`[${timestamp}] Unexpected error in logGlobalSettingsChange:`, err);
    return null;
  }
};

/**
 * Retrieves the audit history for global settings changes.
 * @param {string} userId - The ID of the user requesting the history (for RLS).
 * @param {number} [limit=50] - The number of records to retrieve.
 * @returns {Promise<Array>} A list of audit log entries.
 */
export const getAuditHistory = async (userId, limit = 50) => {
  if (!userId) {
    console.error("Audit History Error: User ID is required.");
    return [];
  }

  const { data, error } = await supabase
    .from('global_settings_audit')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching audit history:", error);
    return [];
  }

  return data;
};