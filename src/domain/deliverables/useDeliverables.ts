import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { CourseDeliverable } from '../../types';
import { useAuth } from '../../context/AuthContext';

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

export function useDeliverables() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: deliverables = [], isLoading } = useQuery({
    queryKey: ['deliverables', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.from('course_deliverables').select('*').eq('user_id', userId);
      if (error) throw error;
      return data.map((row: any) => ({
        id: String(row.id),
        courseId: row.course_id,
        type: row.type,
        title: row.title,
        date: row.date,
        score: row.score ?? undefined,
        status: row.status,
        metadata: row.metadata as CourseDeliverable['metadata'],
      }));
    },
    enabled: !!userId,
  });

  const addDeliverableMutation = useMutation({
    meta: { sound: 'success' },
    mutationFn: async (deliverable: CourseDeliverable) => {
      const { error } = await supabase.from('course_deliverables').upsert(toPayload(deliverable, userId!), { onConflict: 'user_id,id' });
      if (error) throw error;
    },
    onMutate: async (newDeliverable) => {
      await queryClient.cancelQueries({ queryKey: ['deliverables', userId] });
      const previousDeliverables = queryClient.getQueryData(['deliverables', userId]);
      queryClient.setQueryData(['deliverables', userId], (old: CourseDeliverable[] = []) => [...old, newDeliverable]);
      return { previousDeliverables };
    },
    onError: (_err, _, context: any) => {
      queryClient.setQueryData(['deliverables', userId], context?.previousDeliverables);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverables', userId] });
    },
  });

  const updateDeliverableMutation = useMutation({
    mutationFn: async (deliverable: CourseDeliverable) => {
      const { error } = await supabase.from('course_deliverables').upsert(toPayload(deliverable, userId!), { onConflict: 'user_id,id' });
      if (error) throw error;
    },
    onMutate: async (updatedDeliverable) => {
      await queryClient.cancelQueries({ queryKey: ['deliverables', userId] });
      const previousDeliverables = queryClient.getQueryData(['deliverables', userId]);
      queryClient.setQueryData(['deliverables', userId], (old: CourseDeliverable[] = []) => 
        old.map(d => d.id === updatedDeliverable.id ? updatedDeliverable : d)
      );
      return { previousDeliverables };
    },
    onError: (_err, _, context: any) => {
      queryClient.setQueryData(['deliverables', userId], context?.previousDeliverables);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverables', userId] });
    },
  });

  const removeDeliverableMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('course_deliverables').delete().eq('user_id', userId!).eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['deliverables', userId] });
      const previousDeliverables = queryClient.getQueryData(['deliverables', userId]);
      queryClient.setQueryData(['deliverables', userId], (old: CourseDeliverable[] = []) => old.filter(d => d.id !== id));
      return { previousDeliverables };
    },
    onError: (_err, _, context: any) => {
      queryClient.setQueryData(['deliverables', userId], context?.previousDeliverables);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverables', userId] });
    },
  });

  const setDeliverablesMutation = useMutation({
    mutationFn: async (next: CourseDeliverable[]) => {
      const removedIds = deliverables.map((d) => d.id).filter((id) => !next.some((n) => n.id === id));
      if (removedIds.length > 0) {
        await supabase.from('course_deliverables').delete().eq('user_id', userId!).in('id', removedIds);
      }
      if (next.length > 0) {
        const payload = next.map((d) => toPayload(d, userId!));
        await supabase.from('course_deliverables').upsert(payload, { onConflict: 'user_id,id' });
      }
    },
    onMutate: async (nextDeliverables) => {
      await queryClient.cancelQueries({ queryKey: ['deliverables', userId] });
      const previousDeliverables = queryClient.getQueryData(['deliverables', userId]);
      queryClient.setQueryData(['deliverables', userId], nextDeliverables);
      return { previousDeliverables };
    },
    onError: (_err, _, context: any) => {
      queryClient.setQueryData(['deliverables', userId], context?.previousDeliverables);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverables', userId] });
    },
  });

  return { 
    deliverables, 
    isLoading,
    addDeliverable: addDeliverableMutation.mutate, 
    updateDeliverable: updateDeliverableMutation.mutate, 
    removeDeliverable: removeDeliverableMutation.mutate,
    setDeliverables: setDeliverablesMutation.mutate 
  };
}
