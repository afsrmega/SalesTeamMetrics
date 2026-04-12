
import React from 'react';
import PipelineFunnel from './PipelineFunnel';
import FollowUpTimeline from './FollowUpTimeline';

const InsightsSection = ({ filteredProspects, isLoading }) => {
  return (
    <div className="space-y-4 my-8">
      <h2 className="text-xl font-bold">Insights</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PipelineFunnel filteredProspects={filteredProspects} isLoading={isLoading} />
        <FollowUpTimeline filteredProspects={filteredProspects} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default InsightsSection;
