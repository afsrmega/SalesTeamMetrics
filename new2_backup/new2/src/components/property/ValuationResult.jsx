import React, { useState } from "react";
import { motion } from "framer-motion";
import { BarChart2, Expand, Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import ValuationResultDisplay from "@/components/property/ValuationResultDisplay";
import ValuationChart from "@/components/property/ValuationChart";

const ValuationResult = ({ result }) => {
  const { toast } = useToast();
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const { data, error } = await supabase
        .from('shared_valuations')
        .insert([{ valuation_data: result }])
        .select('id')
        .single();

      if (error) throw error;

      const shareUrl = `${window.location.origin}/share/valuation/${data.id}`;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      toast({
        title: "Link Copied",
        description: "The shareable link has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Sharing Error",
        description: "Could not generate the link for sharing.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-green-50 p-6 rounded-lg shadow relative"
      >
        <div className="absolute top-2 right-2 flex gap-1">
          <Button variant="ghost" size="icon" onClick={handleShare} disabled={isSharing} className="text-gray-500 hover:text-green-600 h-8 w-8">
            {isSharing ? <Copy className="h-4 w-4 animate-pulse" /> : (copied ? <Check className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4" />)}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsResultModalOpen(true)} className="text-gray-500 hover:text-green-600 h-8 w-8">
            <Expand className="h-4 w-4" />
          </Button>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <BarChart2 className="h-6 w-6 mr-2 text-green-700" />
          Calculation Result
        </h3>
        <ValuationResultDisplay result={result} />
        <ValuationChart result={result} />
      </motion.div>

      <Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white rounded-lg shadow-xl p-0">
          <DialogHeader className="bg-gray-50 p-4 border-b">
            <DialogTitle className="text-xl font-semibold text-gray-800">Detailed Result: Valuation</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">Expanded view of the calculation.</DialogDescription>
          </DialogHeader>
          <div className="p-6">
            <ValuationResultDisplay result={result} />
            <ValuationChart result={result} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ValuationResult;