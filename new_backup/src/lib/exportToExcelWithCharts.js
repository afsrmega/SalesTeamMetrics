import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getCustomQuarter } from './salesUtils';
import { supabase } from './customSupabaseClient';
import { addDays, getDay, isBefore } from 'date-fns';

export const getWeeksInQuarter = (quarterStart, quarterEnd) => {
  const weeks = [];
  let currentLoopDate = new Date(quarterStart);
  
  const getNextFriday = (date) => {
     const day = getDay(date);
     const diff = (5 - day + 7) % 7; 
     if (diff === 0 && day === 5) return date;
     return addDays(date, diff);
  };

  let loopFriday = getNextFriday(currentLoopDate);
  let weekNum = 1;

  while (isBefore(loopFriday, quarterEnd) || loopFriday.getTime() === quarterEnd.getTime()) {
     weeks.push({ 
         week_number: weekNum,
         week_ending: loopFriday 
     });
     loopFriday = addDays(loopFriday, 7);
     weekNum++;
  }
  return weeks;
};

export const formatExcelDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split('T')[0];
};

export const calculateWeeklyPerformance = (memberId, weekStart, weekEnd, salesRecords, salesTeam, quarterGoal, cumulativeGoal) => {
    const validRecords = salesRecords.filter(r => 
        r.sales_member_id === memberId && 
        r.is_valid !== false && 
        r.is_deleted !== true
    );
    
    let weekly_sales = 0;
    let cumulative_sales = 0;
    let weekly_sales_excl_residential = 0;
    let cumulative_sales_excl_residential = 0;
    
    validRecords.forEach(r => {
        const d = new Date(r.created_at);
        if (isNaN(d.getTime())) return;
        
        const isRes = (r.property_type || '').toLowerCase().includes('residen');
        const val = parseFloat(r.value) || 0;
        
        if (d <= weekEnd) {
            cumulative_sales += val;
            if (!isRes) cumulative_sales_excl_residential += val;
            
            if (d > weekStart) {
                weekly_sales += val;
                if (!isRes) weekly_sales_excl_residential += val;
            }
        }
    });
    
    const run_rate_pct = cumulativeGoal > 0 ? (cumulative_sales / cumulativeGoal) * 100 : 0;
    const quarter_achievement_pct = quarterGoal > 0 ? (cumulative_sales / quarterGoal) * 100 : 0;
    
    return { 
        weekly_sales, 
        cumulative_sales, 
        run_rate_pct, 
        quarter_achievement_pct, 
        weekly_sales_excl_residential, 
        cumulative_sales_excl_residential 
    };
};

export const getWeeklyTeamPerformance = (weekStart, weekEnd, salesRecords, salesTeam, globalSettings, teamQuarterGoal, cumulativeGoal) => {
    const validRecords = salesRecords.filter(r => 
        r.is_valid !== false && 
        r.is_deleted !== true
    );
    
    let weekly_sales = 0;
    let cumulative_sales = 0;
    let weekly_sales_excl_residential = 0;
    let cumulative_sales_excl_residential = 0;
    
    validRecords.forEach(r => {
        const d = new Date(r.created_at);
        if (isNaN(d.getTime())) return;
        
        const isRes = (r.property_type || '').toLowerCase().includes('residen');
        const val = parseFloat(r.value) || 0;
        
        if (d <= weekEnd) {
            cumulative_sales += val;
            if (!isRes) cumulative_sales_excl_residential += val;
            
            if (d > weekStart) {
                weekly_sales += val;
                if (!isRes) weekly_sales_excl_residential += val;
            }
        }
    });
    
    const run_rate_pct = cumulativeGoal > 0 ? (cumulative_sales / cumulativeGoal) * 100 : 0;
    const quarter_achievement_pct = teamQuarterGoal > 0 ? (cumulative_sales / teamQuarterGoal) * 100 : 0;
    
    return { 
        weekly_sales, 
        cumulative_sales, 
        run_rate_pct, 
        quarter_achievement_pct, 
        weekly_sales_excl_residential, 
        cumulative_sales_excl_residential 
    };
};

const applySheetFormatting = (sheet) => {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } }; // Light gray
    
    sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    
    if (sheet.columnCount > 0) {
        sheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: sheet.columnCount }
        };
    }

    sheet.columns.forEach(column => {
        let maxLength = 10;
        column.eachCell({ includeEmpty: true }, cell => {
            if (cell.value) {
                const len = cell.value.toString().length;
                if (len > maxLength) maxLength = len;
            }
        });
        column.width = maxLength + 2;
    });
};

export const exportToExcelWithCharts = async (salesTeam = [], globalSettings = {}, passedSalesRecords = []) => {
    try {
        // Task 2: Fetch all sales_records from Supabase ordered by created_at DESC
        const { data: dbRecords, error } = await supabase
            .from('sales_records')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.warn("Could not fetch records from Supabase, falling back to provided records:", error);
        }
        
        const allRecords = (dbRecords && dbRecords.length > 0) ? dbRecords : (passedSalesRecords || []);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Hostinger Horizons';
        workbook.created = new Date();

        // ================= WORKSHEET 1: Sales_Records =================
        const ws1 = workbook.addWorksheet("Sales_Records");
        ws1.columns = [
            { header: 'sale_id', key: 'sale_id' },
            { header: 'created_at', key: 'created_at' },
            { header: 'sale_date', key: 'sale_date' },
            { header: 'sales_member_id', key: 'sales_member_id' },
            { header: 'member_name', key: 'member_name' },
            { header: 'state', key: 'state' },
            { header: 'property_type', key: 'property_type' },
            { header: 'property_subtype', key: 'property_subtype' },
            { header: 'value', key: 'value', style: { numFmt: '0.00' } },
            { header: 'client_number', key: 'client_number' },
            { header: 'account_number', key: 'account_number' },
            { header: 'is_valid', key: 'is_valid' },
            { header: 'is_deleted', key: 'is_deleted' },
            { header: 'invalidation_reason', key: 'invalidation_reason' },
            { header: 'deletion_reason', key: 'deletion_reason' }
        ];

        if (allRecords.length > 0) {
            allRecords.forEach(record => {
                const member = salesTeam.find(m => m.id === record.sales_member_id);
                ws1.addRow({
                    sale_id: record.id,
                    created_at: record.created_at,
                    sale_date: formatExcelDate(record.created_at),
                    sales_member_id: record.sales_member_id,
                    member_name: member ? member.name : record.sales_member_id,
                    state: record.state || '',
                    property_type: record.property_type || '',
                    property_subtype: record.property_subtype || '',
                    value: parseFloat(record.value) || 0,
                    client_number: record.client_number || '',
                    account_number: record.account_number || '',
                    is_valid: record.is_valid !== false,
                    is_deleted: record.is_deleted === true,
                    invalidation_reason: record.invalidation_reason || '',
                    deletion_reason: record.deletion_reason || ''
                });
            });
        }

        // ================= WORKSHEET 2 & 3 Setup =================
        const { quarterStart, quarterEnd } = getCustomQuarter(new Date());
        const weeks = getWeeksInQuarter(quarterStart, quarterEnd);
        const totalWeeks = weeks.length > 0 ? weeks.length : 13;

        // ================= WORKSHEET 2: Weekly_Performance_Members =================
        const ws2 = workbook.addWorksheet("Weekly_Performance_Members");
        ws2.columns = [
            { header: 'week_number', key: 'week_number' },
            { header: 'week_ending', key: 'week_ending' },
            { header: 'sales_member_id', key: 'sales_member_id' },
            { header: 'member_name', key: 'member_name' },
            { header: 'quarter_goal', key: 'quarter_goal', style: { numFmt: '0.00' } },
            { header: 'cumulative_goal', key: 'cumulative_goal', style: { numFmt: '0.00' } },
            { header: 'weekly_sales', key: 'weekly_sales', style: { numFmt: '0.00' } },
            { header: 'cumulative_sales', key: 'cumulative_sales', style: { numFmt: '0.00' } },
            { header: 'run_rate_pct', key: 'run_rate_pct', style: { numFmt: '0.00' } },
            { header: 'quarter_achievement_pct', key: 'quarter_achievement_pct', style: { numFmt: '0.00' } },
            { header: 'weekly_sales_excl_residential', key: 'weekly_sales_excl_residential', style: { numFmt: '0.00' } },
            { header: 'cumulative_sales_excl_residential', key: 'cumulative_sales_excl_residential', style: { numFmt: '0.00' } }
        ];

        if (salesTeam && salesTeam.length > 0) {
            salesTeam.forEach(member => {
                let previousFriday = new Date(quarterStart);
                previousFriday.setHours(0,0,0,0);
                
                const quarterGoal = parseFloat(member.quarterly_quota) || parseFloat(globalSettings?.individual_quarterly_target) || 0;

                weeks.forEach((week) => {
                    const weekEnd = new Date(week.week_ending);
                    weekEnd.setHours(23,59,59,999);
                    
                    const cumulativeGoal = quarterGoal * (week.week_number / totalWeeks);
                    
                    const perf = calculateWeeklyPerformance(member.id, previousFriday, weekEnd, allRecords, salesTeam, quarterGoal, cumulativeGoal);
                    
                    ws2.addRow({
                        week_number: week.week_number,
                        week_ending: formatExcelDate(week.week_ending),
                        sales_member_id: member.id,
                        member_name: member.name || member.id, // Fallback to ID
                        quarter_goal: quarterGoal,
                        cumulative_goal: cumulativeGoal,
                        weekly_sales: perf.weekly_sales,
                        cumulative_sales: perf.cumulative_sales,
                        run_rate_pct: perf.run_rate_pct,
                        quarter_achievement_pct: perf.quarter_achievement_pct,
                        weekly_sales_excl_residential: perf.weekly_sales_excl_residential,
                        cumulative_sales_excl_residential: perf.cumulative_sales_excl_residential
                    });
                    
                    previousFriday = new Date(weekEnd);
                    previousFriday.setTime(previousFriday.getTime() + 1);
                });
            });
        }

        // ================= WORKSHEET 3: Weekly_Performance_Team =================
        const ws3 = workbook.addWorksheet("Weekly_Performance_Team");
        ws3.columns = [
            { header: 'week_number', key: 'week_number' },
            { header: 'week_ending', key: 'week_ending' },
            { header: 'team_quarter_goal', key: 'team_quarter_goal', style: { numFmt: '0.00' } },
            { header: 'cumulative_goal', key: 'cumulative_goal', style: { numFmt: '0.00' } },
            { header: 'weekly_sales', key: 'weekly_sales', style: { numFmt: '0.00' } },
            { header: 'cumulative_sales', key: 'cumulative_sales', style: { numFmt: '0.00' } },
            { header: 'run_rate_pct', key: 'run_rate_pct', style: { numFmt: '0.00' } },
            { header: 'quarter_achievement_pct', key: 'quarter_achievement_pct', style: { numFmt: '0.00' } },
            { header: 'weekly_sales_excl_residential', key: 'weekly_sales_excl_residential', style: { numFmt: '0.00' } },
            { header: 'cumulative_sales_excl_residential', key: 'cumulative_sales_excl_residential', style: { numFmt: '0.00' } }
        ];

        const teamQuarterGoal = parseFloat(globalSettings?.team_quarterly_target) || 0;
        let previousFridayTeam = new Date(quarterStart);
        previousFridayTeam.setHours(0,0,0,0);

        weeks.forEach((week) => {
            const weekEnd = new Date(week.week_ending);
            weekEnd.setHours(23,59,59,999);
            
            const cumulativeGoal = teamQuarterGoal * (week.week_number / totalWeeks);
            
            const perf = getWeeklyTeamPerformance(previousFridayTeam, weekEnd, allRecords, salesTeam, globalSettings, teamQuarterGoal, cumulativeGoal);
            
            ws3.addRow({
                week_number: week.week_number,
                week_ending: formatExcelDate(week.week_ending),
                team_quarter_goal: teamQuarterGoal,
                cumulative_goal: cumulativeGoal,
                weekly_sales: perf.weekly_sales,
                cumulative_sales: perf.cumulative_sales,
                run_rate_pct: perf.run_rate_pct,
                quarter_achievement_pct: perf.quarter_achievement_pct,
                weekly_sales_excl_residential: perf.weekly_sales_excl_residential,
                cumulative_sales_excl_residential: perf.cumulative_sales_excl_residential
            });
            
            previousFridayTeam = new Date(weekEnd);
            previousFridayTeam.setTime(previousFridayTeam.getTime() + 1);
        });

        // Apply auto-formatting to all sheets
        applySheetFormatting(ws1);
        applySheetFormatting(ws2);
        applySheetFormatting(ws3);

        const buffer = await workbook.xlsx.writeBuffer();
        const dateStr = formatExcelDate(new Date().toISOString());
        saveAs(new Blob([buffer]), `sales_looker_export_${dateStr}.xlsx`);
        
        return true;
    } catch (error) {
        console.error("Error generating Looker export:", error);
        throw error;
    }
};