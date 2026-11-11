import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Clock, Award, ShieldCheck, ChevronRight } from 'lucide-react';
import { CintSurvey } from '../providers/types';
import { cintAdapter } from '../providers/cintAdapter';
import { useApp } from '../context/AppContext';
import { PollPeCoin } from './Illustrations';
import { formatCoinsValue } from '../services/currencies';

interface Props {
  survey: CintSurvey | null;
  onClose: () => void;
}

export const CintSurveyModal: React.FC<Props> = ({ survey, onClose }) => {
  const { user, selectedCurrency, awardCoins } = useApp();
  const [currentStep, setCurrentStep] = useState<'intro' | 'question1' | 'question2' | 'submitting' | 'result'>('intro');
  const [answer1, setAnswer1] = useState<string>('');
  const [answer2, setAnswer2] = useState<string>('');
  const [outcome, setOutcome] = useState<'complete' | 'screenout' | 'reversed' | null>(null);

  if (!survey) return null;

  const handleStartSurvey = () => {
    setCurrentStep('question1');
  };

  const handleFinishSurvey = async (status: 'complete' | 'screenout' | 'reversed' = 'complete') => {
    setCurrentStep('submitting');
    setOutcome(status);

    setTimeout(async () => {
      // Process through Cint adapter (async with signature verification)
      const result = await cintAdapter.processCallback({
        respondentId: user.uid,
        surveyId: survey.id,
        status: status,
        rewardUsd: survey.cpiUsd,
        coinsAwarded: status === 'complete' ? survey.rewardCoins : (status === 'screenout' ? 15 : survey.rewardCoins),
        timestamp: new Date().toISOString(),
      });

      // For local dev mode (no real signature), still handle the coins awarding
      if (result.coinsAwarded !== 0) {
        await awardCoins(result.coinsAwarded, `Cint: ${survey.name}`);
      }

      setCurrentStep('result');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-[28px] bg-white border border-[#e5dcfa] shadow-2xl p-6 text-gray-900 relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#f0ebfc] flex items-center justify-center text-[#7848f4] font-black text-sm">
            C
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#7848f4] bg-[#f0ebfc] px-2 py-0.5 rounded-md">
                Cint Survey Supply API
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded-md border border-emerald-200">
                {survey.matchScore}% Match
              </span>
            </div>
            <h3 className="font-extrabold text-base text-gray-900 mt-1 line-clamp-1">
              {survey.name}
            </h3>
          </div>
        </div>

        {/* Step: Intro */}
        {currentStep === 'intro' && (
          <div className="space-y-4">
            <div className="bg-[#f0ebfc] p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 font-medium">Estimated Reward</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <PollPeCoin className="w-5 h-5 shrink-0" />
                  <span className="text-xl font-black text-gray-900">+{survey.rewardCoins}</span>
                  <span className="text-xs text-gray-500 font-semibold">
                    ({formatCoinsValue(survey.rewardCoins, selectedCurrency)})
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-gray-500 font-medium">Estimated Time</span>
                <div className="flex items-center justify-end gap-1 mt-0.5 text-gray-800 font-bold text-sm">
                  <Clock className="w-4 h-4 text-[#7848f4]" />
                  <span>~{survey.loiMinutes} mins</span>
                </div>
              </div>
            </div>

            {/* Criteria */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                Target Demographics:
              </h4>
              <div className="space-y-1.5 bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-xs text-gray-700">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Category: <strong>{survey.category}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#7848f4] shrink-0" />
                  <span>Incidence Rate: <strong>{survey.incidenceRate}% qualification</strong></span>
                </div>
                {survey.qualificationCriteria?.map((crit, idx) => (
                  <div key={`crit-${idx}`} className="flex items-center gap-2 text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7848f4]" />
                    <span>{crit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleStartSurvey}
                className="flex-1 py-3.5 rounded-xl bg-[#7848f4] hover:bg-[#6837e3] text-white font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Begin Cint Survey</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step: Question 1 */}
        {currentStep === 'question1' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
              <span>Question 1 of 2</span>
              <span>50%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#7848f4] w-1/2 rounded-full" />
            </div>

            <h4 className="text-sm font-extrabold text-gray-900 pt-2">
              How often do you make online purchases or digital wallet payments?
            </h4>

            <div className="space-y-2">
              {['Multiple times daily', '2-4 times a week', 'Once a week', 'Rarely / Never'].map((opt, idx) => (
                <button
                  key={`q1-${idx}-${opt}`}
                  onClick={() => setAnswer1(opt)}
                  className={`w-full text-left p-3.5 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                    answer1 === opt
                      ? 'border-[#7848f4] bg-[#f0ebfc] text-[#7848f4]'
                      : 'border-gray-200 hover:border-[#7848f4] text-gray-700'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={!answer1}
                onClick={() => setCurrentStep('question2')}
                className="w-full py-3 rounded-xl bg-[#7848f4] hover:bg-[#6837e3] disabled:opacity-40 text-white font-extrabold text-xs shadow transition cursor-pointer"
              >
                Next Question
              </button>
            </div>
          </div>
        )}

        {/* Step: Question 2 */}
        {currentStep === 'question2' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
              <span>Question 2 of 2</span>
              <span>100%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#7848f4] w-full rounded-full" />
            </div>

            <h4 className="text-sm font-extrabold text-gray-900 pt-2">
              Which rewards format motivates you the most when completing sponsor tasks?
            </h4>

            <div className="space-y-2">
              {['Direct UPI / Bank Transfer Cash', 'Amazon / Flipkart Gift Cards', 'Gaming Credits & Skins', 'Charity / Donations'].map((opt, idx) => (
                <button
                  key={`q2-${idx}-${opt}`}
                  onClick={() => setAnswer2(opt)}
                  className={`w-full text-left p-3.5 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                    answer2 === opt
                      ? 'border-[#7848f4] bg-[#f0ebfc] text-[#7848f4]'
                      : 'border-gray-200 hover:border-[#7848f4] text-gray-700'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                disabled={!answer2}
                onClick={() => handleFinishSurvey('complete')}
                className="flex-1 py-3 rounded-xl bg-[#7848f4] hover:bg-[#6837e3] disabled:opacity-40 text-white font-extrabold text-xs shadow transition cursor-pointer"
              >
                Submit Survey (Complete)
              </button>
              <button
                onClick={() => handleFinishSurvey('screenout')}
                className="px-3 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition"
                title="Simulate demographic screenout"
              >
                Simulate Screenout
              </button>
            </div>
          </div>
        )}

        {/* Step: Submitting */}
        {currentStep === 'submitting' && (
          <div className="py-10 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-[#7848f4] border-t-transparent rounded-full animate-spin mx-auto" />
            <h4 className="text-sm font-black text-gray-900">
              Verifying Cint completion callback...
            </h4>
            <p className="text-xs text-gray-500">
              Communicating with Cint respondent fulfillment API.
            </p>
          </div>
        )}

        {/* Step: Result */}
        {currentStep === 'result' && (
          <div className="text-center py-6 space-y-4">
            {outcome === 'complete' && (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-gray-900">
                  Survey Successfully Completed!
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Your responses have been validated by the Cint survey sponsor.
                </p>
                <div className="bg-[#f0ebfc] p-3.5 rounded-2xl max-w-xs mx-auto flex items-center justify-center gap-2">
                  <PollPeCoin className="w-5 h-5" />
                  <span className="text-xl font-black text-[#7848f4]">
                    +{survey.rewardCoins} Coins Credited
                  </span>
                </div>
              </>
            )}

            {outcome === 'screenout' && (
              <>
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-gray-900">
                  Survey Quota Reached / Screened Out
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  The sponsor reached their targeted quota for this profile. We credited +15 consolation coins for your time!
                </p>
              </>
            )}

            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-[#7848f4] text-white font-extrabold text-xs shadow-md transition cursor-pointer hover:bg-[#6837e3]"
            >
              Done & Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
