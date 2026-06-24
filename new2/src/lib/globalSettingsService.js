
import { supabase } from './customSupabaseClient';
import { DEFAULT_QUARTER_DEFINITIONS } from './getQuarterDateRange';

export const DEFAULT_TIERS = [
  { min: 0, max: 49.99, rate: 1 },
  { min: 50, max: 74.99, rate: 4 },
  { min: 75, max: 99.99, rate: 5 },
  { min: 100, max: 124.99, rate: 7 },
  { min: 125, max: 149.99, rate: 8 },
  { min: 150, max: 174.99, rate: 9 },
  { min: 175, max: 199.99, rate: 10 },
  { min: 200, max: 249.99, rate: 11 },
  { min: 250, max: 299.99, rate: 12 },
  { min: 300, max: 349.99, rate: 13 },
  { min: 350, max: 999999, rate: 15 }
];

export const DEFAULT_RATES = {
  natl_res_rate: 0.000038,
  natl_comm_rate: 0.000054,
  tx_res_rate: 0.000254,
  tx_comm_rate: 0.000251
};

export const GOAL_AFFECTING_VARIABLES = [
    'individual_monthly_commission_threshold',
    'individual_quarterly_target',
];

export const getDefaultSettings = () => ({
  settings_key: 'team',
  team_monthly_target: 135000000,
  individual_monthly_commission_threshold: 5000,
  individual_quarterly_target: 15000,
  team_quarterly_target: 58200000,
  commission_percentage: 0.01,
  commission_threshold: 16000000,
  commission_tiers: DEFAULT_TIERS,
  quarter_definitions: DEFAULT_QUARTER_DEFINITIONS,
  ...DEFAULT_RATES
});

export const getGoalAffectingVariables = () => {
    return GOAL_AFFECTING_VARIABLES;
};

export const fetchGlobalSettings = async () => {
  const { data, error } = await supabase
    .from('global_settings')
    .select('*')
    .eq('settings_key', 'team')
    .maybeSingle();

  if (error) {
    console.error(`Error fetching settings: ${error.message}`);
    throw new Error(`Error fetching settings: ${error.message}`);
  }
  
  if (!data) {
     return getDefaultSettings();
  }
  
  const safeData = {
    ...data,
    commission_percentage: data.commission_percentage !== null ? data.commission_percentage : 0.01,
    commission_threshold: data.commission_threshold !== null ? data.commission_threshold : 16000000,
    commission_tiers: data.commission_tiers || DEFAULT_TIERS,
    quarter_definitions: data.quarter_definitions || DEFAULT_QUARTER_DEFINITIONS,
    natl_res_rate: data.natl_res_rate !== null ? Number(data.natl_res_rate) : DEFAULT_RATES.natl_res_rate,
    natl_comm_rate: data.natl_comm_rate !== null ? Number(data.natl_comm_rate) : DEFAULT_RATES.natl_comm_rate,
    tx_res_rate: data.tx_res_rate !== null ? Number(data.tx_res_rate) : DEFAULT_RATES.tx_res_rate,
    tx_comm_rate: data.tx_comm_rate !== null ? Number(data.tx_comm_rate) : DEFAULT_RATES.tx_comm_rate,
  };
  
  return safeData;
};

export const saveGlobalSettings = async (settings) => {
  const validation = validateSettings(settings);
  if (!validation.isValid) {
      console.error("Validation failed:", validation.message);
      throw new Error(validation.message);
  }

  const cleanPayload = {
      settings_key: 'team',
      team_monthly_target: parseFloat(settings.team_monthly_target),
      individual_monthly_commission_threshold: parseFloat(settings.individual_monthly_commission_threshold),
      team_quarterly_target: parseFloat(settings.team_quarterly_target),
      individual_quarterly_target: parseFloat(settings.individual_quarterly_target),
      commission_percentage: parseFloat(settings.commission_percentage),
      commission_threshold: parseFloat(settings.commission_threshold),
      commission_tiers: settings.commission_tiers || DEFAULT_TIERS,
      quarter_definitions: settings.quarter_definitions || DEFAULT_QUARTER_DEFINITIONS,
      natl_res_rate: parseFloat(settings.natl_res_rate) || DEFAULT_RATES.natl_res_rate,
      natl_comm_rate: parseFloat(settings.natl_comm_rate) || DEFAULT_RATES.natl_comm_rate,
      tx_res_rate: parseFloat(settings.tx_res_rate) || DEFAULT_RATES.tx_res_rate,
      tx_comm_rate: parseFloat(settings.tx_comm_rate) || DEFAULT_RATES.tx_comm_rate,
      updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('global_settings')
    .upsert(cleanPayload, { onConflict: 'settings_key' })
    .select()
    .single();

  if (error) {
      console.error("Supabase error saving settings:", error);
      throw new Error(`Error saving settings: ${error.message}`);
  }
  
  return data;
};

export const validateSettings = (settings) => {
  if (!settings) return { isValid: false, message: "Settings object is missing" };
  
  const fields = [
    { key: 'team_monthly_target', label: 'Meta Mensual Equipo' },
    { key: 'individual_monthly_commission_threshold', label: 'Meta Comisión Ind.' },
    { key: 'team_quarterly_target', label: 'Meta Trimestral Equipo' },
    { key: 'individual_quarterly_target', label: 'Meta Trimestral Ind.' },
  ];

  for (const field of fields) {
      const val = parseFloat(settings[field.key]);
      if (isNaN(val) || val < 0) {
          return { isValid: false, message: `${field.label} debe ser un número positivo.` };
      }
  }

  if (settings.commission_tiers && Array.isArray(settings.commission_tiers)) {
      for (const tier of settings.commission_tiers) {
          if (isNaN(parseFloat(tier.min)) || isNaN(parseFloat(tier.max)) || isNaN(parseFloat(tier.rate))) {
              return { isValid: false, message: "Los valores de los rangos deben ser numéricos." };
          }
          if (parseFloat(tier.min) > parseFloat(tier.max)) {
               return { isValid: false, message: `Rango inválido: Min ${tier.min} es mayor que Max ${tier.max}` };
          }
      }
  }

  return { isValid: true };
};
