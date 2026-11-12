import React, { useState } from 'react';
import { X, Award, CheckCircle2, ChevronRight, Clock, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCoinsValue } from '../services/currencies';
import { PaisaBharoCoin } from './Illustrations';

export const SurveyModal: React.FC = () => {
  const { activeSurvey, setActiveSurvey, completeSurvey, selectedCurrency } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!activeSurvey) return null;

  const question = activeSurvey.questions[currentStep];
  const totalSteps = activeSurvey.questions.length;
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);

  const handleSelectOption = (option: string) => {
    if (question.type === 'multiple') {
      const currentList = (answers[question.id] as string[]) || [];
      const updated = currentList.includes(option)
        ? currentList.filter(item => item !== option)
        : [...currentList, option];
      setAnswers(prev => ({ ...prev, [question.id]: updated }));
    } else {
      setAnswers(prev => ({ ...prev, [question.id]: option }));
    }
  };

  const handleRate = (rating: number) => {
    setAnswers(prev => ({ ...prev, [question.id]: rating }));
  };

  const isCurrentStepAnswered = () => {
    const val = answers[question.id];
    if (val === undefined || val === null) return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  };

  const handleNext = async () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsSubmitting(true);
      await completeSurvey(activeSurvey.id, answers);
      setIsSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-[28px] bg-white border border-[#bde0fe] shadow-2xl overflow-hidden flex flex-col text-gray-900 max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-white border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e6f4fa] flex items-center justify-center shrink-0 text-[#072ac8]">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#072ac8] bg-[#e6f4fa] px-2 py-0.5 rounded-full">
                {activeSurvey.category} Survey
              </span>
              <h3 className="text-sm sm:text-base font-black text-gray-900 line-clamp-1 mt-0.5">{activeSurvey.title}</h3>
            </div>
          </div>
          <button
            onClick={() => setActiveSurvey(null)}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reward & Progress ribbon */}
        <div className="px-5 py-2.5 bg-[#f0f8fc] border-b border-gray-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-gray-900 font-extrabold">
            <PaisaBharoCoin className="w-4 h-4" />
            <span>Reward: +{activeSurvey.rewardCoins} Coins</span>
            <span className="text-gray-500 font-normal">({formatCoinsValue(activeSurvey.rewardCoins, selectedCurrency)})</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500 font-medium">
            <Clock className="w-3.5 h-3.5 text-[#072ac8]" />
            <span>~{activeSurvey.estimatedMinutes} mins</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#e6f4fa] h-1.5">
          <div
            className="bg-[#072ac8] h-1.5 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto">
          {submitted ? (
            <div className="py-8 text-center space-y-4 animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-[#e6f4fa] border-2 border-[#072ac8] flex items-center justify-center mx-auto text-[#072ac8]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-gray-900">Survey Completed!</h3>
              <p className="text-sm text-gray-600 max-w-sm mx-auto">
                Thank you for contributing your valuable opinion. Your reward of{' '}
                <strong className="text-[#072ac8]">+{activeSurvey.rewardCoins} Paisa Coins</strong> has been added to your balance.
              </p>
              <div className="pt-4">
                <button
                  onClick={() => setActiveSurvey(null)}
                  className="px-6 py-2.5 rounded-xl bg-[#072ac8] hover:bg-[#05219e] text-white font-extrabold text-sm transition shadow-[0_4px_12px_rgba(7,42,200,0.3)]"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#072ac8]">
                  Question {currentStep + 1} of {totalSteps}
                </span>
                <span className="text-[11px] text-gray-500">
                  {question.type === 'multiple' ? 'Select all that apply' : question.type === 'rating' ? 'Rate 1 to 5' : 'Select one'}
                </span>
              </div>

              <h4 className="text-base sm:text-lg font-extrabold text-gray-900 leading-snug">
                {question.question}
              </h4>

              {/* Options */}
              {question.type === 'rating' ? (
                <div className="py-4 space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    {[1, 2, 3, 4, 5].map((star, idx) => {
                      const selected = answers[question.id] >= star;
                      return (
                        <button
                          key={`star-${question.id}-${star}-${idx}`}
                          onClick={() => handleRate(star)}
                          className={`p-3 rounded-2xl border transition-all transform active:scale-95 ${
                            selected
                              ? 'bg-[#fef3c7] border-[#f59e0b] text-[#f59e0b] scale-105 shadow-sm'
                              : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-amber-500'
                          }`}
                        >
                          <Star className={`w-8 h-8 ${selected ? 'fill-[#f59e0b]' : ''}`} />
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500 px-4">
                    <span>1 - Poor / Unlikely</span>
                    <span>5 - Excellent / Extremely</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {question.options?.map((opt, idx) => {
                    const isSelected = question.type === 'multiple'
                      ? ((answers[question.id] as string[]) || []).includes(opt)
                      : answers[question.id] === opt;

                    return (
                      <button
                        key={`opt-${question.id}-${idx}`}
                        onClick={() => handleSelectOption(opt)}
                        className={`w-full p-3.5 rounded-2xl border text-left text-sm transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-[#e6f4fa] border-[#072ac8] text-[#072ac8] font-bold shadow-sm'
                            : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-800'
                        }`}
                      >
                        <span>{opt}</span>
                        <div
                          className={`w-5 h-5 rounded-${question.type === 'multiple' ? 'md' : 'full'} border flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-[#072ac8] border-[#072ac8] text-white' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer controls */}
        {!submitted && (
          <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-500">
              Sponsored by {activeSurvey.sponsor}
            </span>
            <button
              disabled={!isCurrentStepAnswered() || isSubmitting}
              onClick={handleNext}
              className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition shadow-sm ${
                isCurrentStepAnswered() && !isSubmitting
                  ? 'bg-[#072ac8] hover:bg-[#05219e] text-white cursor-pointer active:scale-95 shadow-[0_4px_12px_rgba(7,42,200,0.3)]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
              }`}
            >
              <span>{currentStep === totalSteps - 1 ? 'Submit & Earn Reward' : 'Next Question'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
