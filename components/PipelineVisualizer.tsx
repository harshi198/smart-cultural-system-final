
import React from 'react';

const PipelineStep = ({ title, description, active }: { title: string; description: string; active: boolean }) => (
  <div className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${active ? 'border-purple-500 bg-purple-50 scale-105 shadow-md' : 'border-gray-200 bg-white opacity-60'}`}>
    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${active ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
      {active ? '●' : '○'}
    </div>
    <h4 className="font-bold text-sm text-gray-800">{title}</h4>
    <p className="text-[10px] text-center text-gray-500 mt-1">{description}</p>
  </div>
);

export const PipelineVisualizer: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = [
    { title: "Data Ingestion", desc: "Regional Datasets Collection" },
    { title: "NLP Preprocessing", desc: "Segmentation & Entity Extraction" },
    { title: "Analysis Engine", desc: "Emotion & Theme Classification" },
    { title: "Expansion LLM", desc: "Culturally-Respectful Narration" },
    { title: "Audio Synthesis", desc: "Neural TTS Generation" },
    { title: "Video Generation", desc: "Veo Multimodal Synthesis" }
  ];

  return (
    <div className="w-full py-8 bg-white rounded-2xl shadow-sm border border-gray-100 px-6 mb-8 overflow-x-auto">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">AI/ML Workflow Pipeline</h3>
      <div className="flex items-center justify-between min-w-[800px]">
        {steps.map((step, idx) => (
          <React.Fragment key={idx}>
            <PipelineStep 
              title={step.title} 
              description={step.desc} 
              active={currentStep >= idx} 
            />
            {idx < steps.length - 1 && (
              <div className={`h-1 w-full mx-2 rounded ${currentStep > idx ? 'bg-purple-500' : 'bg-gray-100'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
