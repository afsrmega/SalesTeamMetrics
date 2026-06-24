
import * as XLSX from 'xlsx';

export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: null });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

export const normalizeMoney = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  let s = String(value).trim();
  const isNegative = s.startsWith('(') && s.endsWith(')');
  s = s.replace(/[^0-9.-]/g, '');
  const num = parseFloat(s);
  if (isNaN(num)) return null;
  return isNegative ? -num : num;
};

export const extractClientNumber = (value) => {
  if (!value) return null;
  const s = String(value).trim();
  const match = s.match(/\b(20\d{2})[-\s]?(\d{3,8})\b/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return null;
};

export const normalizeDate = (value) => {
  if (!value) return { date: null, warning: 'Missing date' };
  
  if (typeof value === 'number') {
    // Excel serial date
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return { date: date.toISOString().split('T')[0], warning: null };
  }

  const s = String(value).trim();
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return { date: parsed.toISOString().split('T')[0], warning: null };
  }

  return { date: s, warning: 'Could not parse date format completely' };
};

export const normalizeType = (value) => {
  if (!value) return null;
  const s = String(value).toLowerCase().trim();
  if (s.includes('res')) return 'residential';
  if (s.includes('com')) return 'commercial';
  if (s.includes('bpp')) return 'bpp';
  return 'other';
};

export const detectColumns = (rows) => {
  if (!rows || rows.length === 0) return {};
  
  const sampleKeys = Object.keys(rows[0]).map(k => k.toLowerCase().trim());
  const origKeys = Object.keys(rows[0]);

  const findCol = (aliases) => {
    const idx = sampleKeys.findIndex(k => aliases.some(a => k.includes(a)));
    return idx >= 0 ? origKeys[idx] : null;
  };

  return {
    clientNumberCol: findCol(["client number", "client #", "account", "account number", "property id", "property number", "número de cliente", "id", "client id"]),
    clientNameCol: findCol(["client name", "name", "nombre", "owner", "property owner"]),
    valueCol: findCol(["value", "amount", "sale value", "valor", "total", "estimated value"]),
    dateCol: findCol(["date", "created at", "sale date", "fecha"]),
    typeCol: findCol(["type", "property type", "tipo", "category"]),
    validCol: findCol(["valid?", "valid", "válido", "valida", "status", "estado"])
  };
};

export const normalizeRows = (rows, sourceName) => {
  const cols = detectColumns(rows);
  const normalized = [];
  const problemRows = [];

  rows.forEach((row, index) => {
    // skip completely empty rows
    if (Object.values(row).every(v => v === null || v === '')) return;

    // Filter by Valid column if present
    if (cols.validCol && row[cols.validCol]) {
      const vStr = String(row[cols.validCol]).toLowerCase().trim();
      const isValid = ["válida", "valida", "valid", "yes", "sí", "si", "true"].includes(vStr);
      if (!isValid) return; // skip invalid rows
    }

    const rawClientNumber = cols.clientNumberCol ? row[cols.clientNumberCol] : null;
    const clientNumber = extractClientNumber(rawClientNumber);
    const clientName = cols.clientNameCol ? row[cols.clientNameCol] : 'Unknown';
    const value = cols.valueCol ? normalizeMoney(row[cols.valueCol]) : null;
    const type = cols.typeCol ? normalizeType(row[cols.typeCol]) : null;
    const { date, warning: dateWarning } = cols.dateCol ? normalizeDate(row[cols.dateCol]) : { date: null };

    if (!clientNumber && rawClientNumber) {
      problemRows.push({
        sourceRowNumber: index + 2, // +1 for 0-index, +1 for header
        sourceFile: sourceName,
        rawClientNumber: rawClientNumber,
        problem: 'Invalid client number format',
        suggestedFix: 'Use format YYYY-NNNNNN',
        confidenceScore: 100,
        originalData: row
      });
    }

    normalized.push({
      _sourceRowNumber: index + 2,
      _sourceFile: sourceName,
      clientNumber,
      rawClientNumber,
      clientName,
      value: value || 0,
      type,
      date,
      dateWarning,
      originalData: row
    });
  });

  return { normalized, problemRows };
};

export const detectDuplicates = (rows) => {
  const groups = {};
  const duplicates = [];

  rows.forEach(row => {
    if (!row.clientNumber || !row.value || !row.type) return;
    
    const key = `${row.clientNumber}|${row.value}|${row.type}`;
    if (!groups[key]) {
      groups[key] = [row];
    } else {
      // Check date proximity
      const existing = groups[key];
      const rowDate = row.date ? new Date(row.date) : null;
      
      const isDuplicate = existing.some(ext => {
        if (!ext.date || !rowDate) return true; // If missing date, assume duplicate
        const extDate = new Date(ext.date);
        const diffTime = Math.abs(extDate - rowDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 3;
      });

      if (isDuplicate) {
        duplicates.push(row);
      }
      groups[key].push(row);
    }
  });

  return duplicates;
};

export const groupByClientNumber = (rows) => {
  const result = {};
  rows.forEach(row => {
    if (!row.clientNumber) return;
    if (!result[row.clientNumber]) {
      result[row.clientNumber] = {
        clientNumber: row.clientNumber,
        clientName: row.clientName,
        rows: [],
        total: 0,
        count: 0
      };
    }
    result[row.clientNumber].rows.push(row);
    result[row.clientNumber].total += (row.value || 0);
    result[row.clientNumber].count += 1;
  });
  return result;
};

export const compareSalesData = (officialRows, crmRows) => {
  const officialGrouped = groupByClientNumber(officialRows);
  const crmGrouped = groupByClientNumber(crmRows);
  
  const allClientNumbers = new Set([
    ...Object.keys(officialGrouped),
    ...Object.keys(crmGrouped)
  ]);

  const comparison = {
    ok: [],
    add: [],
    delete: [],
    deleteDuplicate: [],
    modifyValue: [],
    fixClientNumber: [],
    reviewManually: []
  };

  const crmDuplicates = detectDuplicates(crmRows);

  allClientNumbers.forEach(cn => {
    const off = officialGrouped[cn];
    const crm = crmGrouped[cn];

    const offTotal = off ? off.total : 0;
    const crmTotal = crm ? crm.total : 0;
    const diff = Math.abs(offTotal - crmTotal);
    const clientName = off ? off.clientName : (crm ? crm.clientName : 'Unknown');

    const resultObj = {
      clientNumber: cn,
      clientName,
      officialTotal: offTotal,
      crmTotal,
      difference: offTotal - crmTotal, // Positive = official is higher
      officialRowCount: off ? off.count : 0,
      crmRowCount: crm ? crm.count : 0,
      officialRows: off ? off.rows : [],
      crmRows: crm ? crm.rows : []
    };

    if (diff <= 1.00) {
      resultObj.status = 'OK';
      comparison.ok.push(resultObj);
    } else if (off && !crm) {
      resultObj.status = 'ADD';
      comparison.add.push(resultObj);
    } else if (!off && crm) {
      resultObj.status = 'DELETE';
      comparison.delete.push(resultObj);
    } else {
      // Both exist but differ
      let resolved = false;

      // Check for exact duplicate values in CRM causing the difference
      if (crmTotal > offTotal) {
        const excess = crmTotal - offTotal;
        const matchingDup = crmDuplicates.find(d => d.clientNumber === cn && Math.abs(d.value - excess) <= 1.00);
        if (matchingDup) {
          resultObj.status = 'DELETE_DUPLICATE';
          resultObj.targetRow = matchingDup;
          comparison.deleteDuplicate.push(resultObj);
          resolved = true;
        }
      }

      // Check if it's a simple modify (1 vs 1 row)
      if (!resolved && off && crm && off.count === 1 && crm.count === 1) {
        resultObj.status = 'MODIFY_VALUE';
        resultObj.targetRow = crm.rows[0];
        resultObj.suggestedValue = off.rows[0].value;
        comparison.modifyValue.push(resultObj);
        resolved = true;
      }

      if (!resolved) {
        resultObj.status = 'REVIEW_MANUALLY';
        comparison.reviewManually.push(resultObj);
      }
    }
  });

  return comparison;
};

export const buildRecommendedActions = (comparisonResult) => {
  const actions = [];

  const addAction = (type, item, row = null, reason = '', conf = 100) => {
    actions.push({
      action: type,
      clientNumber: item.clientNumber,
      clientName: item.clientName,
      date: row ? row.date : null,
      value: row ? row.value : item.difference,
      type: row ? row.type : null,
      reason,
      confidenceScore: conf,
      sourceRowNumber: row ? row._sourceRowNumber : null
    });
  };

  comparisonResult.add.forEach(item => {
    item.officialRows.forEach(row => {
      addAction('ADD', item, row, 'Missing in CRM', 100);
    });
  });

  comparisonResult.delete.forEach(item => {
    item.crmRows.forEach(row => {
      addAction('DELETE', item, row, 'Not in official list', 90);
    });
  });

  comparisonResult.deleteDuplicate.forEach(item => {
    addAction('DELETE_DUPLICATE', item, item.targetRow, 'Duplicate entry in CRM', 95);
  });

  comparisonResult.modifyValue.forEach(item => {
    addAction('MODIFY_VALUE', item, item.targetRow, `Value mismatch (Expected: ${item.suggestedValue})`, 85);
  });

  comparisonResult.reviewManually.forEach(item => {
    addAction('REVIEW_MANUALLY', item, null, `Difference of ${item.difference.toFixed(2)} with complex row counts`, 50);
  });

  return actions;
};

export const exportRowsToExcel = (rows, fileName, sheetName = 'Sheet1') => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
};

export const exportFullReconciliationReport = ({ actions, comparison, problemRows }) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Actions
  const wsActions = XLSX.utils.json_to_sheet(actions);
  XLSX.utils.book_append_sheet(wb, wsActions, 'Recommended Actions');

  // Sheet 2: Comparison Summary
  const flatComparison = [
    ...comparison.ok,
    ...comparison.add,
    ...comparison.delete,
    ...comparison.deleteDuplicate,
    ...comparison.modifyValue,
    ...comparison.reviewManually
  ].map(c => ({
    Status: c.status,
    ClientNumber: c.clientNumber,
    ClientName: c.clientName,
    OfficialTotal: c.officialTotal,
    CRMTotal: c.crmTotal,
    Difference: c.difference,
    OfficialRows: c.officialRowCount,
    CRMRows: c.crmRowCount
  }));
  const wsComp = XLSX.utils.json_to_sheet(flatComparison);
  XLSX.utils.book_append_sheet(wb, wsComp, 'Client Comparison');

  // Sheet 3: Problem Rows
  const flatProblems = problemRows.map(p => ({
    SourceFile: p.sourceFile,
    RowNumber: p.sourceRowNumber,
    RawClientNumber: p.rawClientNumber,
    Problem: p.problem,
    SuggestedFix: p.suggestedFix,
    Confidence: p.confidenceScore
  }));
  const wsProblems = XLSX.utils.json_to_sheet(flatProblems.length > 0 ? flatProblems : [{ Note: 'No problem rows found' }]);
  XLSX.utils.book_append_sheet(wb, wsProblems, 'Problem Rows');

  XLSX.writeFile(wb, `Sales_Reconciliation_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
};
