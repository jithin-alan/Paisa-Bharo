import React, { useState } from 'react';
import { Flame, Sparkles, CheckCircle2, Clock, Users, Gift, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../services/i18n';
import { formatCoinsValue } from '../services/currencies';
import { ScratchCardModal } from '../components/ScratchCardModal';
import { PollPeCoin } from '../components/Illustrations';
import { calculateStreakStatus, DAILY_REWARDS_MAP } from '../services/streakService';

export const PollsView: React.FC = () => {
  const {
    user,
    polls,
    surveys,
    votePoll,
    claimDailyCheckIn,
    setActiveSurvey,
    selectedLanguage,
    selectedCurrency,
    scratchCardAvailable,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showScratchModal, setShowScratchModal] = useState(false);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  // Timezone-safe streak calculation
  const streakStatus = calculateStreakStatus(user?.lastCheckInDate, user?.streakDays, user?.timezone);
  const {
    effectiveStreak,
    isCheckedInToday,
    isStreakBroken,
    currentCycleDay,
    nextRewardDay,
    nextRewardBonus,
  } = streakStatus;

  const categories = ['All', 'Tech', 'Finance', 'Lifestyle', 'Entertainment', 'Shopping'];

  const filteredPolls = polls.filter(p => {
    if (selectedCategory === 'All') return true;
    return p.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const handleVote = async (pollId: string, optionIdx: number) => {
    setVotingPollId(pollId);
    await votePoll(pollId, optionIdx);
    setVotingPollId(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Daily Streak & Mystery Card Quick Access in PollPe Light Clean Theme */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Streak Card */}
        <div className="sm:col-span-2 relative overflow-hidden rounded-[26px] bg-white border border-[#e5dcfa] p-5 sm:p-6 shadow-[0_4px_20px_rgba(120,72,244,0.05)] text-gray-900">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#f0ebfc] flex items-center justify-center text-[#7848f4]">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-base text-gray-900">
                    {isCheckedInToday || (!isStreakBroken && effectiveStreak > 0)
                      ? `${effectiveStreak} Day Streak!`
                      : isStreakBroken
                      ? 'Streak Expired'
                      : '0 Day Streak'}
                  </h3>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                      isCheckedInToday
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : isStreakBroken
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-[#f0ebfc] text-[#7848f4]'
                    }`}
                  >
                    {isCheckedInToday
                      ? '✓ Claimed Today'
                      : isStreakBroken
                      ? '⚠️ Missed Yesterday'
                      : '🔥 Active'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isCheckedInToday
                    ? `Come back tomorrow to continue your streak for Day ${((effectiveStreak) % 7) + 1}!`
                    : isStreakBroken
                    ? 'You missed yesterday! Check in today to start a new 7-day streak (+20 coins).'
                    : effectiveStreak > 0
                    ? `Claim today to continue your streak and earn +${nextRewardBonus} coins!`
                    : 'Check in daily to unlock bonus coin multipliers.'}
                </p>
              </div>
            </div>

            <button
              disabled={isCheckedInToday}
              onClick={claimDailyCheckIn}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm ${
                isCheckedInToday
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-[#7848f4] hover:bg-[#6837e3] text-white cursor-pointer active:scale-95 shadow-[0_4px_12px_rgba(120,72,244,0.3)]'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>
                {isCheckedInToday
                  ? getTranslation(selectedLanguage, 'claimed')
                  : isStreakBroken
                  ? `Restart (+${nextRewardBonus})`
                  : `${getTranslation(selectedLanguage, 'claimBonus')} (+${nextRewardBonus})`}
              </span>
            </button>
          </div>

          {/* 7-Day Dots in PollPe Palette */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-1 text-center">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const isCompleted = isCheckedInToday
                ? day <= currentCycleDay
                : !isStreakBroken && effectiveStreak > 0 && day <= currentCycleDay;
              const isTargetToday = !isCheckedInToday && day === nextRewardDay;
              const rewardAmount = DAILY_REWARDS_MAP[day];

              return (
                <div key={day} className="flex-1 flex flex-col items-center">
                  <span className="text-[10px] text-gray-400 mb-1 font-semibold">D{day}</span>
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                      isCompleted
                        ? 'bg-[#7848f4] text-white shadow-sm shadow-purple-500/20'
                        : isTargetToday
                        ? 'bg-[#f0ebfc] border-2 border-[#7848f4] text-[#7848f4] shadow-sm animate-pulse'
                        : 'bg-gray-50 text-gray-400 border border-gray-200'
                    }`}
                  >
                    {isCompleted ? '✓' : `+${rewardAmount}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lucky Scratch Card Teaser */}
        <div
          onClick={() => setShowScratchModal(true)}
          className="relative overflow-hidden rounded-[26px] bg-white border border-[#e5dcfa] p-5 sm:p-6 shadow-[0_4px_20px_rgba(120,72,244,0.05)] text-gray-900 flex flex-col justify-between cursor-pointer hover:border-[#7848f4] transition group"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-[#fef3c7] flex items-center justify-center text-[#d97706]">
              <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            </div>
            {scratchCardAvailable ? (
              <span className="text-[10px] bg-[#fef3c7] text-[#b45309] border border-[#fde68a] px-2.5 py-0.5 rounded-full font-black animate-pulse">
                READY
              </span>
            ) : (
              <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium">
                Done for today
              </span>
            )}
          </div>
          <div className="mt-3">
            <h4 className="font-black text-sm text-gray-900">{getTranslation(selectedLanguage, 'scratchCard')}</h4>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
              Scratch & reveal up to +120 bonus Paisa Coins!
            </p>
          </div>
          <div className="mt-3 text-xs font-bold text-[#7848f4] flex items-center gap-1">
            <span>{getTranslation(selectedLanguage, 'scratchNow')}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* High-Payout Surveys Spotlight */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
              <span>{getTranslation(selectedLanguage, 'marketSurveys')}</span>
              <span className="text-[10px] bg-[#f0ebfc] text-[#7848f4] font-bold px-2 py-0.5 rounded-full">
                PollPe Research
              </span>
            </h2>
            <p className="text-xs text-gray-500">{getTranslation(selectedLanguage, 'marketSurveysDesc')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {surveys.map((survey) => (
            <div
              key={survey.id}
              className={`rounded-[24px] border p-5 flex flex-col justify-between transition-all ${
                survey.completed
                  ? 'bg-gray-50 border-gray-200 opacity-60'
                  : 'bg-white border-[#e5dcfa] hover:border-[#7848f4] shadow-[0_4px_20px_rgba(120,72,244,0.05)]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold text-[#7848f4] bg-[#f0ebfc] px-2.5 py-0.5 rounded-md">
                    {survey.category}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>~{survey.estimatedMinutes} mins</span>
                  </div>
                </div>
                <h4 className="font-extrabold text-sm text-gray-900 line-clamp-2 leading-snug">
                  {survey.title}
                </h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {survey.description}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <PollPeCoin className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-black text-gray-900">+{survey.rewardCoins}</span>
                  <span className="text-[10px] text-gray-400">
                    ({formatCoinsValue(survey.rewardCoins, selectedCurrency)})
                  </span>
                </div>
                {survey.completed ? (
                  <span className="text-xs font-semibold text-[#7848f4] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{getTranslation(selectedLanguage, 'completed')}</span>
                  </span>
                ) : (
                  <button
                    onClick={() => setActiveSurvey(survey)}
                    className="px-4 py-2 rounded-xl bg-[#7848f4] hover:bg-[#6837e3] text-white font-extrabold text-xs transition cursor-pointer active:scale-95 shadow-[0_4px_12px_rgba(120,72,244,0.25)]"
                  >
                    {getTranslation(selectedLanguage, 'startSurvey')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Category filter pills for Flash Polls */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
              <span>{getTranslation(selectedLanguage, 'flashPolls')}</span>
              <span className="text-[10px] bg-[#f0ebfc] text-[#7848f4] font-bold px-2 py-0.5 rounded-full">
                5 Seconds
              </span>
            </h2>
            <p className="text-xs text-gray-500">{getTranslation(selectedLanguage, 'flashPollsDesc')}</p>
          </div>

          {/* Categories in PollPe purple */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat, idx) => (
              <button
                key={`pollcat-${idx}-${cat}`}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#7848f4] text-white shadow-sm'
                    : 'bg-white hover:bg-[#f0ebfc] text-gray-600 border border-[#e5dcfa]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Polls Feed in Clean White Cards */}
        <div className="space-y-4">
          {filteredPolls.map((poll) => {
            const hasVoted = poll.userVotedIndex !== undefined;

            return (
              <div
                key={poll.id}
                className="rounded-[26px] bg-white border border-[#e5dcfa] hover:border-[#7848f4]/60 p-5 sm:p-6 shadow-[0_4px_20px_rgba(120,72,244,0.05)] transition-all space-y-4"
              >
                {/* Poll Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#7848f4] bg-[#f0ebfc] px-2.5 py-0.5 rounded-lg">
                      {poll.category}
                    </span>
                    {poll.country && (
                      <span className="text-[10px] bg-gray-100 text-gray-700 font-semibold px-2 py-0.5 rounded-md">
                        {poll.country === 'INR' ? '🇮🇳 India Focus' : poll.country}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-black text-gray-900 bg-[#fef3c7] border border-[#fde68a] px-2.5 py-1 rounded-xl">
                    <PollPeCoin className="w-4 h-4" />
                    <span>+{poll.rewardCoins}</span>
                  </div>
                </div>

                {/* Poll Question */}
                <h3 className="text-sm sm:text-base font-extrabold text-gray-900 leading-relaxed">
                  {poll.title}
                </h3>

                {/* Options List */}
                <div className="space-y-2.5">
                  {poll.options.map((option, idx) => {
                    const isSelected = poll.userVotedIndex === idx;
                    const votePercent = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;

                    return (
                      <button
                        key={`pollopt-${poll.id}-${idx}`}
                        disabled={hasVoted || votingPollId === poll.id}
                        onClick={() => handleVote(poll.id, idx)}
                        className={`relative w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all overflow-hidden flex items-center justify-between select-none ${
                          hasVoted
                            ? isSelected
                              ? 'bg-[#f0ebfc] border-[#7848f4] text-[#7848f4] font-extrabold shadow-sm'
                              : 'bg-gray-50 border-gray-200 text-gray-600'
                            : 'bg-white hover:bg-[#faf7ff] hover:border-[#7848f4] border-gray-200 text-gray-800 cursor-pointer active:scale-[0.99]'
                        }`}
                      >
                        {/* Percentage fill bar with PollPe purple gradient */}
                        {hasVoted && (
                          <div
                            className={`absolute top-0 bottom-0 left-0 transition-all duration-700 ${
                              isSelected
                                ? 'bg-[#7848f4]/15 border-r-2 border-[#7848f4]'
                                : 'bg-gray-200/50'
                            }`}
                            style={{ width: `${votePercent}%` }}
                          />
                        )}

                        {/* Content text */}
                        <div className="relative z-10 flex items-center gap-3 pr-2">
                          <span
                            className={`w-6 h-6 rounded-full border text-xs font-black flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-[#7848f4] border-[#7848f4] text-white shadow-sm'
                                : 'border-gray-300 text-gray-500 bg-white'
                            }`}
                          >
                            {isSelected ? '✓' : String.fromCharCode(65 + idx)}
                          </span>
                          <span className="text-xs sm:text-sm">{option.text}</span>
                        </div>

                        {/* Percentage value */}
                        {hasVoted && (
                          <span className="relative z-10 text-xs font-black text-[#7848f4] shrink-0 ml-2">
                            {votePercent}%
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Poll Footer details */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#7848f4]" />
                    <span>{poll.totalVotes.toLocaleString()} {getTranslation(selectedLanguage, 'totalVotes')}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{getTranslation(selectedLanguage, 'expiresIn')} {poll.expiresIn || '2 days'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Lucky Scratch Card Modal */}
      {showScratchModal && (
        <ScratchCardModal onClose={() => setShowScratchModal(false)} />
      )}
    </div>
  );
};
