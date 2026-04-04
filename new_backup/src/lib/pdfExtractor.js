import * as pdfjsLib from 'pdfjs-dist';

// This new approach for setting the worker source is more robust for production builds.
// It directly points to the expected location of the worker file provided by the library.
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;


const extractTextFromPdf = async (file) => {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onload = async (event) => {
      try {
        const typedArray = new Uint8Array(event.target.result);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map(item => item.str).join(' ');
        }
        resolve(fullText);
      } catch (error) {
        reject(new Error('Error parsing PDF file: ' + error.message));
      }
    };
    fileReader.onerror = () => reject(new Error('Failed to read file.'));
    fileReader.readAsArrayBuffer(file);
  });
};

const findValue = (text, regex) => {
    const match = text.match(regex);
    if (match && match[1]) {
        return parseFloat(match[1].replace(/[$,]/g, ''));
    }
    return null;
};

export const extractTaxDataFromPdf = async (file) => {
    const text = await extractTextFromPdf(file);
    const sanitizedText = text.replace(/\s+/g, ' '); // Normalize whitespace

    // --- More Robust Regex Patterns ---

    const patterns = {
        // Looks for "GBA" followed by a number, targeting the first instance.
        gba: /GBA\s*(\d[\d,]*)/,
        // Looks for "Overpaid $" or "Overpaid Property Taxes $"
        estimatedOverpayment: /Overpaid\s*(?:Property\s*Taxes\s*)?\$([\d,]+\.?\d*)/i,
        // Looks for "2023 Value" and grabs the first monetary value that follows.
        currentValue2024: /2023\s*Value\s*\$([\d,]+\.?\d*)/i,
    };
    
    // Regex for comparables: finds the "2023 Value Per sq ft" line
    // and captures the FOUR monetary values that follow it.
    const compSectionRegex = /2023\s*Value\s*Per\s*sq\s*ft\s*\$([\d,.]+)\s*\$([\d,.]+)\s*\$([\d,.]+)\s*\$([\d,.]+)/i;
    
    let comparables = [];
    const compMatch = sanitizedText.match(compSectionRegex);
    if (compMatch) {
        // The first value is for "Your Office". We need the next three for the comparables.
        // compMatch[0] is the full match, [1] is the first capture group, etc.
        comparables.push(parseFloat(compMatch[2].replace(/[,]/g, ''))); // Comp #1
        comparables.push(parseFloat(compMatch[3].replace(/[,]/g, ''))); // Comp #2
        comparables.push(parseFloat(compMatch[4].replace(/[,]/g, ''))); // Comp #3
    }

    const extractedData = {
        gba: findValue(sanitizedText, patterns.gba),
        currentValue2024: findValue(sanitizedText, patterns.currentValue2024),
        estimatedOverpayment: findValue(sanitizedText, patterns.estimatedOverpayment),
        comp1SqFt: comparables.length > 0 ? comparables[0] : null,
        comp2SqFt: comparables.length > 1 ? comparables[1] : null,
        comp3SqFt: comparables.length > 2 ? comparables[2] : null,
    };
    
    // Filter out null or NaN values before returning to ensure clean data.
    const finalData = Object.fromEntries(
        Object.entries(extractedData).filter(([_, v]) => v !== null && !isNaN(v))
    );

    return finalData;
};