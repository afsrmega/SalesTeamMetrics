import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchSharedValuation } from '@/lib/propertyService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ValuationResultDisplay from '@/components/property/ValuationResultDisplay';
import ValuationChart from '@/components/property/ValuationChart';
import { TrendingUp, AlertTriangle, Download, Loader2 } from 'lucide-react';
import { generatePdf } from '@/lib/pdfGenerator';

const SharedValuationPage = () => {
  const { id } = useParams();
  const [valuationData, setValuationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    const fetchValuation = async () => {
      if (!id) {
        setError("No valuation ID provided.");
        setLoading(false);
        return;
      }

      try {
        const data = await fetchSharedValuation(id);
        
        if (!data) {
          throw new Error("Valuation not found.");
        }

        setValuationData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchValuation();
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsDownloading(true);
    await generatePdf(reportRef.current, 'Property_Valuation_Report.pdf');
    setIsDownloading(false);
  };

  const renderContent = () => {
    if (loading) {
      return <div className="text-center text-gray-500">Loading result...</div>;
    }

    if (error) {
      return (
        <div className="text-center text-red-500 flex flex-col items-center">
          <AlertTriangle className="h-12 w-12 mb-4" />
          <p className="font-semibold">Error Loading Result</p>
          <p>{error}</p>
        </div>
      );
    }

    if (valuationData) {
      return (
        <div className="w-full max-w-2xl mx-auto">
          <Card ref={reportRef} className="shadow-xl border-t-4 border-green-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-gray-800">
                <TrendingUp className="h-7 w-7 text-green-700" />
                Property Valuation Result
              </CardTitle>
              <CardDescription>This is a shared calculation result.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <ValuationResultDisplay result={valuationData} />
              <ValuationChart result={valuationData} />
            </CardContent>
          </Card>
          <div className="mt-6 text-center">
            <Button onClick={handleDownloadPdf} disabled={isDownloading}>
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          {renderContent()}
        </motion.div>
      </main>
    </div>
  );
};

export default SharedValuationPage;