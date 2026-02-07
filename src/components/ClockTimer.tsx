import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface ClockTimerProps {
  isRunning: boolean;
  startTime: number | null;
}

const ClockTimer = ({ isRunning, startTime }: ClockTimerProps) => {
  const { t } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsed, setElapsed] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate elapsed time when in shift
  useEffect(() => {
    if (!isRunning || !startTime) {
      setElapsed({ hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const updateElapsed = () => {
      const diff = Date.now() - startTime;
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setElapsed({ hours, minutes, seconds });
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="my-8">
      {/* Current Time Display */}
      <div className="text-center mb-6">
        <div className="text-6xl md:text-7xl font-extrabold text-[var(--f22-text)] tracking-tight">
          {currentTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: false 
          })}
        </div>
        <div className="text-[var(--f22-text-muted)] mt-3 text-sm font-medium">
          {`${currentTime.getDate().toString().padStart(2, '0')}/${(currentTime.getMonth() + 1).toString().padStart(2, '0')}/${currentTime.getFullYear()}`}
        </div>
      </div>

      {/* Elapsed Time (when in shift) */}
      {isRunning && (
        <div className="bg-[#39FF14]/10 border border-[#39FF14]/25 rounded-2xl p-5 mt-4">
          <div className="text-center">
            <div className="text-[#39FF14] font-semibold mb-3 text-sm uppercase tracking-wider">{t.workingFor}:</div>
            <div className="flex items-center justify-center gap-2">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-extrabold text-[#39FF14] tracking-tight">
                  {formatNumber(elapsed.hours)}
                </div>
                <div className="text-[#39FF14]/60 text-xs mt-1.5 font-semibold uppercase tracking-wider">{t.hours}</div>
              </div>
              <div className="text-3xl md:text-4xl font-extrabold text-[#39FF14]/40">:</div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-extrabold text-[#39FF14] tracking-tight">
                  {formatNumber(elapsed.minutes)}
                </div>
                <div className="text-[#39FF14]/60 text-xs mt-1.5 font-semibold uppercase tracking-wider">{t.minutes}</div>
              </div>
              <div className="text-3xl md:text-4xl font-extrabold text-[#39FF14]/40">:</div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-extrabold text-[#39FF14] tracking-tight">
                  {formatNumber(elapsed.seconds)}
                </div>
                <div className="text-[#39FF14]/60 text-xs mt-1.5 font-semibold uppercase tracking-wider">{t.seconds}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClockTimer;
