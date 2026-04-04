import PptxGenJS from "pptxgenjs";
import { formatCurrency, getCustomQuarter } from "@/lib/salesUtils";

export const generatePowerPointReport = async (salesTeam, globalSettings, weeklyData, teamStats) => {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  
  // Theme Colors
  const COLORS = {
    primary: "1e3a8a",   // blue-900
    secondary: "3b82f6", // blue-500
    accent: "f59e0b",    // amber-500
    bg: "f3f4f6",        // gray-100
    text: "111827",      // gray-900
    white: "FFFFFF",
    border: "E5E7EB"
  };

  const { quarterLabel } = getCustomQuarter();
  const dateStr = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

  // ---------------------------------------------------------
  // SLIDE 1: COVER PAGE
  // ---------------------------------------------------------
  const slide1 = pptx.addSlide();
  slide1.background = { color: COLORS.bg };
  
  // Header Stripe
  slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.2, fill: COLORS.primary });
  
  // Title
  slide1.addText("Reporte de Ventas Trimestral", {
    x: 0.5, y: 2.5, w: "90%", h: 1,
    fontSize: 44, color: COLORS.primary, bold: true, align: "center", fontFace: "Arial"
  });
  
  // Subtitle
  slide1.addText(`${quarterLabel} - ${dateStr}`, {
    x: 0.5, y: 3.5, w: "90%", h: 0.5,
    fontSize: 24, color: "6B7280", align: "center", fontFace: "Arial"
  });

  // Footer Branding
  slide1.addText("Generado por Sales Metrics Dashboard", {
    x: 0, y: 6.8, w: "100%", h: 0.5,
    fontSize: 12, color: "9CA3AF", align: "center", fontFace: "Arial"
  });

  // ---------------------------------------------------------
  // SLIDE 2: EXECUTIVE SUMMARY
  // ---------------------------------------------------------
  const slide2 = pptx.addSlide();
  // Page Title
  slide2.addText("Resumen Ejecutivo", { x: 0.5, y: 0.3, w: "90%", h: 0.5, fontSize: 24, color: COLORS.primary, bold: true });
  slide2.addShape(pptx.ShapeType.line, { x: 0.5, y: 0.9, w: "90%", h: 0, line: { color: COLORS.secondary, width: 2 } });

  const metrics = [
    { label: "Ventas Totales (Mes)", value: formatCurrency(teamStats.totalMonthlySales) },
    { label: `Ventas Totales (${quarterLabel})`, value: formatCurrency(teamStats.totalQuarterlySales) },
    { label: "Logro de Equipo (Mes)", value: `${teamStats.teamMonthlyAchievement.toFixed(1)}%` },
    { label: "Miembros Activos", value: salesTeam.length.toString() },
    { label: "Top Performer (Mes)", value: teamStats.topPerformerMonthly ? teamStats.topPerformerMonthly.name : "N/A" },
    { label: "Promedio Ventas (Mes)", value: formatCurrency(teamStats.averageMonthlySales) }
  ];

  // Grid layout for cards (2 rows x 3 cols)
  metrics.forEach((m, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const xPos = 0.5 + (col * 3.2); // Spacing
    const yPos = 1.5 + (row * 2.2);

    // Card background
    slide2.addShape(pptx.ShapeType.rect, { 
      x: xPos, y: yPos, w: 2.8, h: 1.8, 
      fill: COLORS.white, 
      line: { color: COLORS.border, width: 1 },
      rectRadius: 0.1,
      shadow: { type: "outer", color: "000000", opacity: 0.1, offset: 2 }
    });
    
    // Label
    slide2.addText(m.label, { 
      x: xPos + 0.1, y: yPos + 0.2, w: 2.6, h: 0.4, 
      fontSize: 14, color: "6B7280", align: "center" 
    });
    
    // Value
    slide2.addText(m.value, { 
      x: xPos + 0.1, y: yPos + 0.7, w: 2.6, h: 0.8, 
      fontSize: 20, color: COLORS.primary, bold: true, align: "center" 
    });
  });

  // ---------------------------------------------------------
  // SLIDE 3: TEAM PERFORMANCE (CHARTS)
  // ---------------------------------------------------------
  const slide3 = pptx.addSlide();
  slide3.addText("Desempeño del Equipo (Billing Amount)", { x: 0.5, y: 0.3, w: "90%", h: 0.5, fontSize: 24, color: COLORS.primary, bold: true });
  slide3.addShape(pptx.ShapeType.line, { x: 0.5, y: 0.9, w: "90%", h: 0, line: { color: COLORS.secondary, width: 2 } });

  const chartLabels = salesTeam.map(m => m.name);
  const chartValuesMonthly = salesTeam.map(m => parseFloat(m.monthlyBillingAmount) || 0);
  const chartValuesQuarterly = salesTeam.map(m => parseFloat(m.quarterlyBillingAmount) || 0);

  const barChartData = [
    {
      name: "Billing Mensual",
      labels: chartLabels,
      values: chartValuesMonthly
    },
    {
      name: "Billing Trimestral",
      labels: chartLabels,
      values: chartValuesQuarterly
    }
  ];

  slide3.addChart(pptx.charts.BAR, barChartData, {
    x: 0.5, y: 1.2, w: 9, h: 5.5,
    showLegend: true,
    barGrouping: "clustered",
    barGapWidthPct: 50,
    colors: [COLORS.secondary, "8b5cf6"], // blue, purple
    valAxisLabelFormatCode: "$#,##0",
    catAxisLabelFontSize: 10
  });

  // ---------------------------------------------------------
  // SLIDE 4: QUARTER PROGRESS TABLE
  // ---------------------------------------------------------
  if (weeklyData && weeklyData.length > 0) {
    const slide4 = pptx.addSlide();
    slide4.addText("Progreso Trimestral Detallado", { x: 0.5, y: 0.3, w: "90%", h: 0.5, fontSize: 24, color: COLORS.primary, bold: true });
    slide4.addShape(pptx.ShapeType.line, { x: 0.5, y: 0.9, w: "90%", h: 0, line: { color: COLORS.secondary, width: 2 } });

    const headerOpts = { fill: COLORS.primary, color: COLORS.white, bold: true, align: "center", valign: "middle", fontSize: 11 };
    const rowOpts = { color: COLORS.text, fontSize: 10, valign: "middle" };
    
    // Headers
    const tableHeaders = [
      { text: "Semana", options: { ...headerOpts, w: 0.8 } },
      { text: "Fecha Corte", options: { ...headerOpts, w: 1.5 } },
      { text: "Meta Acum.", options: { ...headerOpts, w: 1.8 } },
      { text: "Logrado Acum.", options: { ...headerOpts, w: 1.8 } },
      { text: "Run Rate", options: { ...headerOpts, w: 1.2 } },
      { text: "% Q", options: { ...headerOpts, w: 1.2 } },
    ];

    // Rows
    const tableRows = weeklyData.map((week, index) => {
      const isEven = index % 2 === 0;
      const fill = isEven ? "FFFFFF" : "F9FAFB";
      
      return [
        { text: week.weekNumber.toString(), options: { ...rowOpts, fill, align: "center" } },
        { text: new Date(week.weekEnding).toLocaleDateString(), options: { ...rowOpts, fill, align: "center" } },
        { text: formatCurrency(week.goal), options: { ...rowOpts, fill, align: "right", fontFace: "Courier New" } },
        { text: formatCurrency(week.accomplished), options: { ...rowOpts, fill, align: "right", fontFace: "Courier New", bold: true } },
        { text: `${week.runRate.toFixed(1)}%`, options: { ...rowOpts, fill, align: "center", color: week.runRate >= 100 ? "059669" : (week.runRate < 75 ? "DC2626" : "D97706") } },
        { text: `${week.quarterAchievement.toFixed(1)}%`, options: { ...rowOpts, fill, align: "center" } }
      ];
    });

    slide4.addTable([tableHeaders, ...tableRows], {
      x: 0.8, y: 1.3, w: 8.4,
      border: { color: COLORS.border, pt: 1 },
      autoPage: true,
      autoPageCharWeight: -0.2, // Adjust text fitting logic
    });
  }

  // ---------------------------------------------------------
  // SLIDE 5: CONCLUSIONS & INSIGHTS
  // ---------------------------------------------------------
  const slide5 = pptx.addSlide();
  slide5.addText("Conclusiones y Recomendaciones", { x: 0.5, y: 0.3, w: "90%", h: 0.5, fontSize: 24, color: COLORS.primary, bold: true });
  slide5.addShape(pptx.ShapeType.line, { x: 0.5, y: 0.9, w: "90%", h: 0, line: { color: COLORS.secondary, width: 2 } });

  // Calculate some simple insights
  const totalGap = (parseFloat(globalSettings.team_monthly_target) || 0) - teamStats.totalMonthlySales;
  const gapMessage = totalGap > 0 
    ? `Brecha para alcanzar la meta mensual: ${formatCurrency(totalGap)}`
    : "¡La meta mensual ha sido superada con éxito!";

  const participationRate = salesTeam.length > 0 
    ? (salesTeam.filter(m => parseFloat(m.monthlySales) > 0).length / salesTeam.length) * 100
    : 0;

  const bulletPoints = [
    { text: "Resumen de Rendimiento:", options: { fontSize: 18, color: COLORS.primary, bold: true, breakLine: true } },
    { text: gapMessage, options: { fontSize: 14, bullet: true, breakLine: true, indentLevel: 1 } },
    { text: `Porcentaje de cumplimiento mensual del equipo: ${teamStats.teamMonthlyAchievement.toFixed(1)}%`, options: { fontSize: 14, bullet: true, breakLine: true, indentLevel: 1 } },
    { text: `Participación activa (miembros con ventas > 0): ${participationRate.toFixed(0)}%`, options: { fontSize: 14, bullet: true, breakLine: true, indentLevel: 1 } },
    
    { text: "Acciones Recomendadas:", options: { fontSize: 18, color: COLORS.primary, bold: true, breakLine: true } },
    { text: "Revisar pipelines individuales para cierre de mes.", options: { fontSize: 14, bullet: true, breakLine: true, indentLevel: 1 } },
    { text: "Identificar oportunidades de 'upsell' en clientes actuales.", options: { fontSize: 14, bullet: true, breakLine: true, indentLevel: 1 } },
    { text: "Focalizar esfuerzos en productos de alta comisión.", options: { fontSize: 14, bullet: true, breakLine: true, indentLevel: 1 } }
  ];

  slide5.addText(bulletPoints, { x: 0.8, y: 1.5, w: 8.5, h: 5, color: COLORS.text, lineSpacing: 32 });

  // Save File
  return pptx.writeFile({ fileName: `Reporte_Ventas_${new Date().toISOString().split('T')[0]}.pptx` });
};