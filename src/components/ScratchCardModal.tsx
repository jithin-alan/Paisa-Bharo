import React, { useRef, useState, useEffect } from 'react';
import { X, Sparkles, Gift } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PollPeCoin } from './Illustrations';

interface Props {
  onClose: () => void;
}

export const ScratchCardModal: React.FC<Props> = ({ onClose }) => {
  const { claimScratchCard } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [rewardAmount] = useState(() => Math.floor(Math.random() * (120 - 35 + 1)) + 35);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Draw scratchable overlay in PollPe Royal Purple #7848F4
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#8e52f5');
    grad.addColorStop(0.5, '#7848f4');
    grad.addColorStop(1, '#602ce8');

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
    if (claimed) return;
    setClaimed(true);
    await claimScratchCard(rewardAmount);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-[28px] bg-white border border-[#e5dcfa] shadow-2xl p-6 text-center text-gray-900 relative">
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
        <div className="relative w-64 h-44 mx-auto rounded-2xl overflow-hidden border-2 border-[#e5dcfa] shadow-inner bg-gradient-to-br from-[#faf8ff] via-[#f0ebfc] to-[#e8e0fc] flex flex-col items-center justify-center select-none">
          {/* Hidden Content Beneath */}
          <div className="p-4 text-center">
            <Gift className="w-10 h-10 text-[#7848f4] mx-auto animate-bounce" />
            <div className="text-3xl font-black text-gray-900 mt-2 flex items-center justify-center gap-1.5">
              <span>+{rewardAmount}</span>
              <PollPeCoin className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-[#7848f4] uppercase tracking-widest mt-0.5">
              Paisa Coins
            </div>
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
            className="w-full py-3.5 rounded-xl bg-[#7848f4] hover:bg-[#6837e3] text-white font-black text-sm shadow-[0_4px_14px_rgba(120,72,244,0.35)] transition cursor-pointer active:scale-95"
          >
            {claimed ? 'Coins Credited! 🎉' : revealed ? `Claim +${rewardAmount} Coins Now` : 'Reveal Instantly'}
          </button>
        </div>
      </div>
    </div>
  );
};
