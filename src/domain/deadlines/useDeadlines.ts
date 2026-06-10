import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Deadline } from '../../types';
import { DbDeadlineRow } from '../db-types';

const toPayload = (d: Deadline, userId: string) => ({
  id: d.id,
  user_id: userId,
  title: d.title,
  course: d.course,
  topic: d.topic,
  due_date: d.dueDate,
  priority: d.priority,
});

export function useDeadlines(userId: string | undefined, reportSyncError: (msg: string) => void) {
  const [deadlines, setDeadlinesState] = useState<Deadline[]>([]);

  const hydrateDeadlines = (data: DbDeadlineRow[]) => {
    setDeadlinesState(
      data.map((row) => ({
        id: String(row.id),
        title: row.title,
        course: row.course,
        topic: row.topic,
        dueDate: row.due_date,
        priority: row.priority,
      })),
    );
  };

  const syncDeadlines = async (next: Deadline[], prev: Deadline[]) => {
    if (!userId) return;

    const removedIds = prev.map((d) => d.id).filter((id) => !next.some((n) => n.id === id));

    if (removedIds.length > 0) {
      const { error } = await supabase.from('deadlines').delete().eq('user_id', userId).in('id', removedIds);
      if (error) reportSyncError(`Failed to delete removed deadlines: ${error.message}`);
    }

    if (next.length > 0) {
      const payload = next.map((d) => toPayload(d, userId));
      const { error } = await supabase.from('deadlines').upsert(payload, { onConflict: 'user_id,id' });
      if (error) reportSyncError(`Failed to sync deadlines: ${error.message}`);
    }
  };

  const setDeadlines = (next: Deadline[]) => {
    let snapshotPrev: Deadline[] = [];
    setDeadlinesState((prev) => {
      snapshotPrev = prev;
      return next;
    });
    void syncDeadlines(next, snapshotPrev);
  };

  const addDeadline = (deadline: Deadline) => {
    setDeadlinesState((prev) => [...prev, deadline]);

    if (!userId) return;

    void supabase
      .from('deadlines')
      .upsert(toPayload(deadline, userId), { onConflict: 'user_id,id' })
      .then(({ error }) => {
        if (error) {
          reportSyncError(`Failed to add deadline: ${error.message}`);
          setDeadlinesState((prev) => prev.filter((d) => d.id !== deadline.id));
        }
      });
  };

  const reset = () => setDeadlinesState([]);

  return { deadlines, setDeadlines, addDeadline, hydrateDeadlines, reset };
}
