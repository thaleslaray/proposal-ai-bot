import { useEffect, useState } from 'react';

interface VotingTimerProps {
  votingClosesAt: string | null;
  onTimeUp?: () => void;
  onCountdownUpdate?: (countdown: number, totalSeconds: number) => void;
}

export function VotingTimer({ votingClosesAt, onTimeUp, onCountdownUpdate }: VotingTimerProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);

  useEffect(() => {
    if (!votingClosesAt) {
      setCountdown(null);
      return;
    }

    const startTime = new Date().getTime();
    const endTime = new Date(votingClosesAt).getTime();
    const total = Math.floor((endTime - startTime) / 1000);
    setTotalSeconds(total);

    const updateCountdown = () => {
      const now = new Date().getTime();
      const end = new Date(votingClosesAt).getTime();
      const remaining = Math.max(0, Math.floor((end - now) / 1000));
      
      setCountdown(remaining);

      if (onCountdownUpdate) {
        onCountdownUpdate(remaining, total);
      }

      if (remaining === 0 && onTimeUp) {
        onTimeUp();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [votingClosesAt, onTimeUp, onCountdownUpdate]);

  if (countdown === null) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="font-mono text-black">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  );
}

// Função auxiliar para calcular cor baseada no countdown
export function getProgressColorClass(countdown: number): string {
  if (countdown > 60) return 'bg-green-500';
  if (countdown > 30) return 'bg-yellow-500';
  return 'bg-red-500';
}
