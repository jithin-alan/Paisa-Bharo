import React, { useRef, useState, useEffect } from 'react';
import { X, Sparkles, Gift, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PaisaBharoCoin } from './Illustrations';

interface Props {
  onClose: () => void;
}

export const ScratchCardModal: React.FC<Props> = ({ onClose }) => {
  const { claimScratchCard } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [rewardAmount, setRewardAmount] = useState<number>(0);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Draw scratchable overlay in Paisa Bharo Royal Blue #072ac8
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#1d4ed8');
    grad.addColorStop(0.5, '#072ac8');
    grad.addColorStop(1, '#05219e');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Decorative pattern
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, width - 24, height - 24);

    // Text instructions
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ Scratch Here ✨', width / 2, height / 2 - 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.fillText('Rub with mouse or touch', width / 2, height / 2 + 18);
  }, []);

  const handleScratch = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      let transparentCount = 0;
      for (let i = 3; i < data.length; i += 16) {
        if (data[i] === 0) transparentCount++;
      }
      const totalSamples = data.length / 16;
      if (transparentCount / totalSamples > 0.35) {
        setRevealed(true);
      }
    } catch {
      // ignore
    }
  };

  const handleClaim = async () => {
    if (claimed || processing) return;
    setProcessing(true);
    const result = await claimScratchCard();
    setRewardAmount(result.coins);
    setClaimed(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-[28px] bg-white border border-[#bde0fe] shadow-2xl p-6 text-center text-gray-900 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-xl hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-[#fef3c7] flex items-center justify-center mx-auto mb-3 text-[#d97706]">
          <Sparkles className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-black text-gray-900">Daily Lucky Scratch Card</h3>
        <p className="text-xs text-gray-500 mt-1 mb-5">
          Scratch off the card below to reveal your daily bonus jackpot!
        </p>

        {/* Scratch Area */}
        <div className="relative w-64 h-44 mx-auto rounded-2xl overflow-hidden border-2 border-[#bde0fe] shadow-inner bg-gradient-to-br from-[#f0f8fc] via-[#e6f4fa] to-[#d0e8f7] flex flex-col items-center justify-center select-none">
          {/* Hidden Content Beneath - shows amount from server */}
          <div className="p-4 text-center">
            {processing ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-[#072ac8] animate-spin mb-2" />
                <Gift className="w-6 h-6 text-[#072ac8] mx-auto mb-1" />
              </div>
            ) : (
              <>
                <Gift className="w-10 h-10 text-[#072ac8] mx-auto animate-bounce" />
                <div className="text-3xl font-black text-gray-900 mt-2 flex items-center justify-center gap-1.5">
                  <span>+{rewardAmount > 0 ? rewardAmount : '?'}</span>
                  <PaisaBharoCoin className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-[#072ac8] uppercase tracking-widest mt-0.5">
                  Paisa Coins
                </div>
              </>
            )}
          </div>

          {/* Canvas Scratch Layer */}
          {!claimed && (
            <canvas
              ref={canvasRef}
              width={256}
              height={176}
              onMouseMove={handleScratch}
              onTouchMove={handleScratch}
              className={`absolute inset-0 cursor-pointer touch-none transition-opacity duration-500 ${
                revealed ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            />
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={revealed ? handleClaim : () => setRevealed(true)}
            disabled={!revealed || processing}
            className="w-full py-3.5 rounded-xl bg-[#072ac8] hover:bg-[#05219e] text-white font-black text-sm shadow-[0_4px_14px_rgba(7,42,200,0.35)] transition cursor-pointer active:scale-95 disabled:opacity-60"
          >
            {processing ? 'Processing...' : claimed ? 'Coins Credited! 🎉' : revealed ? `Claim +${rewardAmount > 0 ? rewardAmount : '?'} Coins Now` : 'Reveal Instantly'}
          </button>
        </div>
      </div>
    </div>
  );
};
