import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CourseDeliverable } from '../../types';
import { DbDeliverableRow } from '../db-types';

const toPayload = (d: CourseDeliverable, userId: string) => ({
  id: d.id,
  user_id: userId,
  course_id: d.courseId,
  type: d.type,
  title: d.title,
  date: d.date,
  score: d.score ?? null,
  status: d.status,
  metadata: d.metadata ?? {},
});

export function useDeliverables(userId: string | undefined, reportSyncError: (msg: string) => void) {
  const [deliverables, setDeliverablesState] = useState<CourseDeliverable[]>([]);

  const hydrateDeliverables = (data: DbDeliverableRow[]) => {
    setDeliverablesState(
      data.map((row) => ({
        id: String(row.id),
        courseId: row.course_id,
        type: row.type,
        title: row.title,
        date: row.date,
        score: row.score ?? undefined,
        status: row.status,
        metadata: row.metadata as CourseDeliverable['metadata'],
      })),
    );
  };

  const syncDeliverables = async (next: CourseDeliverable[], prev: CourseDeliverable[]) => {
    if (!userId) return;

    const removedIds = prev.map((d) => d.id).filter((id) => !next.some((n) => n.id === id));

    if (removedIds.length > 0) {
      const { error } = await supabase
        .from('course_deliverables')
        .delete()
        .eq('user_id', userId)
        .in('id', removedIds);
      if (error) reportSyncError(`Failed to delete removed deliverables: ${error.message}`);
    }

    if (next.length > 0) {
      const payload = next.map((d) => toPayload(d, userId));
      const { error } = await supabase.from('course_deliverables').upsert(payload, { onConflict: 'user_id,id' });
      if (error) reportSyncError(`Failed to sync deliverables: ${error.message}`);
    }
  };

  const setDeliverables = (next: CourseDeliverable[]) => {
    let snapshotPrev: CourseDeliverable[] = [];
    setDeliverablesState((prev) => {
      snapshotPrev = prev;
      return next;
    });
    void syncDeliverables(next, snapshotPrev);
  };

  const addDeliverable = (deliverable: CourseDeliverable) => {
    setDeliverablesState((prev) => [...prev, deliverable]);

    if (!userId) return;

    void supabase
      .from('course_deliverables')
      .upsert(toPayload(deliverable, userId), { onConflict: 'user_id,id' })
      .then(({ error }) => {
        if (error) {
          reportSyncError(`Failed to add deliverable: ${error.message}`);
          setDeliverablesState((prev) => prev.filter((d) => d.id !== deliverable.id));
        }
      });
  };

  const updateDeliverable = (deliverable: CourseDeliverable) => {
    setDeliverablesState((prev) => prev.map((d) => (d.id === deliverable.id ? deliverable : d)));

    if (!userId) return;

    void supabase
      .from('course_deliverables')
      .upsert(toPayload(deliverable, userId), { onConflict: 'user_id,id' })
      .then(({ error }) => {
        if (error) reportSyncError(`Failed to update deliverable: ${error.message}`);
      });
  };

  const removeDeliverable = (id: string) => {
    let removedItem: CourseDeliverable | undefined;
    setDeliverablesState((prev) => {
      removedItem = prev.find((d) => d.id === id);
      return prev.filter((d) => d.id !== id);
    });

    if (!userId) return;

    void supabase
      .from('course_deliverables')
      .delete()
      .eq('user_id', userId)
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          reportSyncError(`Failed to remove deliverable: ${error.message}`);
          if (removedItem) setDeliverablesState((prev) => [...prev, removedItem!]);
        }
      });
  };

  const reset = () => setDeliverablesState([]);

  return { deliverables, setDeliverables, addDeliverable, updateDeliverable, removeDeliverable, hydrateDeliverables, reset };
}
