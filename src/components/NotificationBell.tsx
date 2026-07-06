import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarClock } from 'lucide-react';
import { useDeadlines } from '../domain/deadlines/useDeadlines';
import { getDeadlineStatus, parseLocalDate } from '../utils/dateUtils';
import { ZeeMascot } from './ui';

/**
 * Top-bar deadline popover. The dot lights up only when a deadline is due
 * within the next 48 hours; the popover lists everything due in the next
 * 7 days, each row clicking through to the calendar.
 */
export const NotificationBell = () => {
  const navigate = useNavigate();
  const { deadlines } = useDeadlines();
  const [isOpen, setIsOpen] = useState(false);

  const { upcoming, hasUrgent } = useMemo(() => {
    const windowStart = new Date();
    windowStart.setHours(0, 0, 0, 0);
    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowEnd.getDate() + 7);
    windowEnd.setHours(23, 59, 59, 999);
    const urgentCutoff = new Date();
    urgentCutoff.setHours(urgentCutoff.getHours() + 48);

    const upcoming = deadlines
      .filter((d) => {
        const due = parseLocalDate(d.dueDate);
        return !isNaN(due.getTime()) && due >= windowStart && due <= windowEnd;
      })
      .sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime());

    const hasUrgent = upcoming.some((d) => parseLocalDate(d.dueDate) <= urgentCutoff);
    return { upcoming, hasUrgent };
  }, [deadlines]);

  const openDeadline = () => {
    setIsOpen(false);
    navigate('/calendar');
  };

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        onBlur={() => setIsOpen(false)}
        className="relative cursor-pointer hover:bg-primary-container p-2 transition-all active:translate-x-[2px] active:translate-y-[2px] border-2 border-transparent hover:border-ink"
      >
        <Bell size={24} />
        {hasUrgent && (
          <span
            data-testid="notification-dot"
            className="absolute top-1 right-1 w-3 h-3 bg-secondary border-2 border-ink"
          />
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-white border-4 border-ink shadow-[6px_6px_0px_#1A1A1A] z-50"
          // Keep the bell focused so its onBlur doesn't close the popover before row clicks land.
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="p-4 border-b-4 border-ink flex items-center justify-between">
            <span className="font-black uppercase tracking-tighter">Next 7 Days</span>
            <span className="text-[10px] font-black uppercase tracking-widest bg-ink text-white px-2 py-0.5">
              {upcoming.length} due
            </span>
          </div>
          {upcoming.length === 0 ? (
            <div className="p-6 text-center">
              <ZeeMascot variant="smug" size={56} className="mx-auto mb-2" />
              <p className="text-sm font-bold uppercase tracking-widest text-ink/40">
                Nothing due this week
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {upcoming.map((deadline) => {
                const status = getDeadlineStatus(deadline.dueDate);
                return (
                  <button
                    key={deadline.id}
                    onClick={openDeadline}
                    className="w-full text-left p-3 flex items-start gap-3 border-b-2 border-ink/10 last:border-b-0 hover:bg-primary-container transition-colors"
                  >
                    <span className="w-8 h-8 border-2 border-ink bg-background flex items-center justify-center shrink-0 mt-0.5">
                      <CalendarClock size={14} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-black text-sm leading-tight truncate">{deadline.title}</span>
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-ink/50 truncate">
                        {deadline.course} · {status.text}
                      </span>
                    </span>
                    {status.isUrgent && <span className="ml-auto w-2 h-2 bg-secondary border border-ink shrink-0 mt-1.5" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
