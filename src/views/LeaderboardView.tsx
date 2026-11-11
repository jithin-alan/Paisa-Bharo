import React, { useState } from 'react';
import { Trophy, Crown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../services/i18n';
import { LEADERBOARD_DATA } from '../services/regionOffers';
import { formatCoinsValue } from '../services/currencies';
import { PollPeCoin } from '../components/Illustrations';

export const LeaderboardView: React.FC = () => {
  const { user, selectedLanguage, selectedCurrency } = useApp();

  // Defensive check: user should always exist but handle null gracefully
  const coinsBalance = user?.coinsBalance ?? 0;

  const [filter, setFilter] = useState<'today' | 'alltime'>('today');

  const topThree = LEADERBOARD_DATA.slice(0, 3);
  const restUsers = LEADERBOARD_DATA.slice(3);

  return (
    <div className="space-y-6 pb-12">
      {/* Header in PollPe Clean Theme */}
      <div className="rounded-[28px] bg-white border border-[#e5dcfa] p-6 shadow-[0_4px_20px_rgba(120,72,244,0.06)] text-gray-900 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[#f0ebfc] flex items-center justify-center mx-auto text-[#7848f4]">
          <Trophy className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900">
          {getTranslation(selectedLanguage, 'leaderboardTitle')}
        </h2>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          Top opinion leaders worldwide earning daily prizes and community badges!
        </p>

        {/* Filter Switcher */}
        <div className="flex items-center justify-center pt-2">
          <div className="flex items-center gap-1 p-1 bg-[#f0ebfc] rounded-full border border-[#e5dcfa]">
            <button
              onClick={() => setFilter('today')}
              className={`px-4 py-1.5 rounded-full text-xs font-black transition cursor-pointer ${
                filter === 'today'
                  ? 'bg-[#7848f4] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {getTranslation(selectedLanguage, 'topEarnersToday')}
            </button>
            <button
              onClick={() => setFilter('alltime')}
              className={`px-4 py-1.5 rounded-full text-xs font-black transition cursor-pointer ${
                filter === 'alltime'
                  ? 'bg-[#7848f4] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {getTranslation(selectedLanguage, 'allTime')}
            </button>
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-2 sm:gap-5 items-end pt-6 px-1">
        {/* Rank 2 (Silver) */}
        <div className="flex flex-col items-center">
          <div className="relative mb-2">
            <img
              src={topThree[1].avatar}
              alt={topThree[1].name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-slate-300 shadow-md"
            />
            <span className="absolute -top-2.5 -right-2 text-xl">{topThree[1].countryCode}</span>
            <div className="absolute -bottom-2 inset-x-0 mx-auto w-6 h-6 rounded-full bg-slate-300 text-gray-950 font-black text-xs flex items-center justify-center shadow">
              2
            </div>
          </div>
          <div className="w-full bg-white border border-[#e5dcfa] rounded-t-[22px] p-3 text-center h-28 flex flex-col justify-end shadow-sm">
            <h4 className="text-xs font-bold text-gray-900 truncate">{topThree[1].name}</h4>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <PollPeCoin className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-black text-gray-900">
                {topThree[1].coins.toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] text-gray-400">Coins</span>
          </div>
        </div>

        {/* Rank 1 (Gold) */}
        <div className="flex flex-col items-center">
          <div className="relative mb-2">
            <Crown className="w-6 h-6 text-[#f59e0b] absolute -top-6 inset-x-0 mx-auto animate-bounce" />
            <img
              src={topThree[0].avatar}
              alt={topThree[0].name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-4 border-[#f59e0b] shadow-xl ring-4 ring-amber-400/20"
            />
            <span className="absolute -top-2.5 -right-2 text-2xl">{topThree[0].countryCode}</span>
            <div className="absolute -bottom-2.5 inset-x-0 mx-auto w-7 h-7 rounded-full bg-[#f59e0b] text-gray-950 font-black text-xs flex items-center justify-center shadow-lg">
              1
            </div>
          </div>
          <div className="w-full bg-gradient-to-t from-white via-[#faf7ff] to-[#f0ebfc] border-2 border-[#7848f4] rounded-t-[26px] p-3.5 text-center h-36 flex flex-col justify-end shadow-md">
            <span className="text-[10px] bg-[#7848f4] text-white font-black px-2 py-0.5 rounded-full self-center mb-1 shadow-sm">
              Top Earner
            </span>
            <h4 className="text-xs sm:text-sm font-black text-gray-900 truncate">{topThree[0].name}</h4>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <PollPeCoin className="w-4 h-4 shrink-0" />
              <span className="text-sm font-black text-gray-900">
                {topThree[0].coins.toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] text-gray-500 font-semibold">Coins</span>
          </div>
        </div>

        {/* Rank 3 (Bronze) */}
        <div className="flex flex-col items-center">
          <div className="relative mb-2">
            <img
              src={topThree[2].avatar}
              alt={topThree[2].name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-amber-700 shadow-md"
            />
            <span className="absolute -top-2.5 -right-2 text-xl">{topThree[2].countryCode}</span>
            <div className="absolute -bottom-2 inset-x-0 mx-auto w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow">
              3
            </div>
          </div>
          <div className="w-full bg-white border border-[#e5dcfa] rounded-t-[22px] p-3 text-center h-24 flex flex-col justify-end shadow-sm">
            <h4 className="text-xs font-bold text-gray-900 truncate">{topThree[2].name}</h4>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <PollPeCoin className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-black text-gray-900">
                {topThree[2].coins.toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] text-gray-400">Coins</span>
          </div>
        </div>
      </div>

      {/* User's current rank status */}
      <div className="p-4 sm:p-5 rounded-[24px] bg-[#f0ebfc] border border-[#e5dcfa] flex items-center justify-between text-gray-900 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#7848f4] flex items-center justify-center font-black text-sm text-white shadow-sm">
            #42
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-gray-900">Your Rank: #{42}</span>
              <span className="text-[10px] bg-white text-[#7848f4] font-black px-2 py-0.5 rounded-full border border-[#e5dcfa]">
                Rising Star
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Only 2,400 Coins away from Top 25 leaderboard rewards!
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            <PollPeCoin className="w-4 h-4" />
            <span className="text-sm font-black text-gray-900">
              {coinsBalance.toLocaleString()} Coins
            </span>
          </div>
          <div className="text-[10px] text-gray-500">
            {formatCoinsValue(coinsBalance, selectedCurrency)}
          </div>
        </div>
      </div>

      {/* Ranks 4 to 10 */}
      <div className="space-y-2.5">
        {restUsers.map((poller, idx) => (
          <div
            key={`poller-${poller.rank}-${poller.name}-${idx}`}
            className="p-3.5 sm:p-4 rounded-[22px] bg-white border border-[#e5dcfa] hover:border-[#7848f4] flex items-center justify-between transition shadow-sm"
          >
            <div className="flex items-center gap-3.5">
              <span className="w-6 text-center text-xs font-black text-gray-400">
                #{poller.rank}
              </span>
              <img
                src={poller.avatar}
                alt={poller.name}
                className="w-10 h-10 rounded-xl object-cover border border-gray-100"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-xs sm:text-sm text-gray-900">{poller.name}</h4>
                  <span className="text-sm">{poller.countryCode}</span>
                </div>
                {poller.badge ? (
                  <span className="text-[10px] text-[#7848f4] font-bold">
                    {poller.badge}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400">
                    Active Poll Contributor
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center justify-end gap-1">
                <PollPeCoin className="w-3.5 h-3.5" />
                <span className="text-xs sm:text-sm font-black text-gray-900">
                  {poller.coins.toLocaleString()}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 block">Coins</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
