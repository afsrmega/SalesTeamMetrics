import { supabase } from './customSupabaseClient';

export const calculatePropertyAppreciation = (propertyData, toast) => {
  if (!propertyData.initialValue || !propertyData.currentValue) {
    if (toast) toast({ title: "Error de Validación", description: "Por favor, completa el valor inicial y el valor actual.", variant: "destructive" });
    return null;
  }
  
  const initialValueNum = parseFloat(propertyData.initialValue);
  const currentValueNum = parseFloat(propertyData.currentValue);
  const initialYearNum = parseInt(propertyData.initialYear);
  const finalYearNum = parseInt(propertyData.currentYear); 
  
  if (isNaN(initialValueNum) || isNaN(currentValueNum)) {
    if (toast) toast({ title: "Error de Formato", description: "Los valores de la propiedad deben ser números válidos.", variant: "destructive" });
    return null;
  }
  if (initialYearNum >= finalYearNum) {
    if (toast) toast({ title: "Error de Fechas", description: "El año inicial debe ser anterior al año final.", variant: "destructive" });
    return null;
  }
  if (initialValueNum <= 0) {
    if (toast) toast({ title: "Error de Valor", description: "El valor inicial debe ser mayor que cero.", variant: "destructive" });
    return null;
  }
  
  const yearDifference = finalYearNum - initialYearNum;
  const valueDifference = currentValueNum - initialValueNum;
  const percentageIncrease = (valueDifference / initialValueNum) * 100;
  const annualAppreciation = (Math.pow(currentValueNum / initialValueNum, 1 / yearDifference) - 1) * 100;
  
  return {
    initial_value: initialValueNum,
    initial_year: initialYearNum,
    current_value: currentValueNum,
    current_year: finalYearNum, 
    percentage_increase: percentageIncrease,
    annual_appreciation: annualAppreciation,
    year_difference: yearDifference,
    value_difference: valueDifference
  };
};

export const fetchValuationsData = async (userId) => {
  if (!userId) throw new Error("User ID is required to fetch valuations.");

  try {
    const { data, error } = await supabase
      .from('valuations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching property valuations:", error);
    throw new Error("No se pudieron cargar las valorizaciones: " + error.message);
  }
};

export const saveValuationData = async (valuationData) => {
  if (!valuationData.user_id) throw new Error("User ID is required to save valuation.");

  try {
    const { data, error } = await supabase
      .from('valuations')
      .insert([{
        user_id: valuationData.user_id,
        initial_year: valuationData.initial_year,
        initial_value: valuationData.initial_value,
        current_year: valuationData.current_year,
        current_value: valuationData.current_value,
        percentage_increase: valuationData.percentage_increase,
        annual_appreciation: valuationData.annual_appreciation,
        year_difference: valuationData.year_difference,
        value_difference: valuationData.value_difference
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error saving valuation:", error);
    throw new Error("No se pudo guardar la valorización: " + error.message);
  }
};

export const deleteValuationData = async (valuationId, userId) => {
  if (!userId) throw new Error("User ID is required to delete valuation.");
  
  try {
    const { error } = await supabase
      .from('valuations')
      .delete()
      .eq('id', valuationId)
      .eq('user_id', userId); 

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting valuation:", error);
    throw new Error("No se pudo eliminar la valorización: " + error.message);
  }
};

export const saveSharedValuation = async (valuationData) => {
  try {
    // Shared valuations don't necessarily need a user_id if they are meant to be public/shared links
    // But our RLS requires authenticated user to insert
    const { data, error } = await supabase
      .from('shared_valuations')
      .insert([{
        valuation_data: valuationData
      }])
      .select()
      .single();
    
    if (error) throw error;
    return { id: data.id };
  } catch (error) {
    console.error("Error saving shared valuation:", error);
    throw new Error("No se pudo guardar la valorización para compartir: " + error.message);
  }
};

export const fetchSharedValuation = async (id) => {
  try {
    const { data, error } = await supabase
      .from('shared_valuations')
      .select('valuation_data')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data?.valuation_data || null;
  } catch (error) {
    console.error("Error fetching shared valuation:", error);
    throw new Error("No se pudo encontrar la valorización compartida.");
  }
};