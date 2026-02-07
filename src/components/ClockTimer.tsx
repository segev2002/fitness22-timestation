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

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isRunning || !startTime) {
      setElapsed({ hours: 0, minutes: 0, seconds: 0 });
      return;
    }
    const updateElapsed = () => {
      const diff = Date.now() - startTime;
      const totalSeconds = Math.floor(diff / 1000);
      setElapsed({
        hours: Math.floor(totalSeconds / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      });
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const fmt = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="clock-timer">
      <div className="clock-time">
        <div className="clock-digits">
          {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </div>
        <div className="clock-date">
          {`${currentTime.getDate().toString().padStart(2, '0')}/${(currentTime.getMonth() + 1).toString().padStart(2, '0')}/${currentTime.getFullYear()}`}
        </div>
      </div>

      {isRunning && (
        <div className="elapsed-box">
          <div className="elapsed-label">{t.workingFor}:</div>
          <div className="elapsed-digits">
            <div className="elapsed-unit">
              <div className="elapsed-value">{fmt(elapsed.hours)}</div>
              <div className="elapsed-sublabel">{t.hours}</div>
            </div>
            <div className="elapsed-colon">:</div>
            <div className="elapsed-unit">
              <div className="elapsed-value">{fmt(elapsed.minutes)}</div>
              <div className="elapsed-sublabel">{t.minutes}</div>
            </div>
            <div className="elapsed-colon">:</div>
            <div className="elapsed-unit">
              <div className="elapsed-value">{fmt(elapsed.seconds)}</div>
              <div className="elapsed-sublabel">{t.seconds}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClockTimer;
