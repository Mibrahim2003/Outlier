import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Deadline } from '../../types';
import { useAuth } from '../../context/AuthContext';

const toPayload = (d: Deadline, userId: string) => ({
  id: d.id,
  user_id: userId,
  title: d.title,
  course: d.course,
  topic: d.topic,
  due_date: d.dueDate,
  priority: d.priority,
});

export function useDeadlines() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: deadlines = [], isLoading } = useQuery({
    queryKey: ['deadlines', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.from('deadlines').select('*').eq('user_id', userId);
      if (error) throw error;
      return data.map((row: any) => ({
        id: String(row.id),
        title: row.title,
        course: row.course,
        topic: row.topic,
        dueDate: row.due_date,
        priority: row.priority,
      }));
    },
    enabled: !!userId,
  });

  const addDeadlineMutation = useMutation({
    mutationFn: async (deadline: Deadline) => {
      const { error } = await supabase.from('deadlines').upsert(toPayload(deadline, userId!), { onConflict: 'user_id,id' });
      if (error) throw error;
    },
    onMutate: async (newDeadline) => {
      await queryClient.cancelQueries({ queryKey: ['deadlines', userId] });
      const previousDeadlines = queryClient.getQueryData(['deadlines', userId]);
      queryClient.setQueryData(['deadlines', userId], (old: Deadline[] = []) => [...old, newDeadline]);
      return { previousDeadlines };
    },
    onError: (_err, _, context: any) => {
      queryClient.setQueryData(['deadlines', userId], context?.previousDeadlines);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deadlines', userId] });
    },
  });

  const setDeadlinesMutation = useMutation({
    mutationFn: async (next: Deadline[]) => {
      const removedIds = deadlines.map((d) => d.id).filter((id) => !next.some((n) => n.id === id));
      if (removedIds.length > 0) {
        await supabase.from('deadlines').delete().eq('user_id', userId!).in('id', removedIds);
      }
      if (next.length > 0) {
        const payload = next.map((d) => toPayload(d, userId!));
        await supabase.from('deadlines').upsert(payload, { onConflict: 'user_id,id' });
      }
    },
    onMutate: async (nextDeadlines) => {
      await queryClient.cancelQueries({ queryKey: ['deadlines', userId] });
      const previousDeadlines = queryClient.getQueryData(['deadlines', userId]);
      queryClient.setQueryData(['deadlines', userId], nextDeadlines);
      return { previousDeadlines };
    },
    onError: (_err, _, context: any) => {
      queryClient.setQueryData(['deadlines', userId], context?.previousDeadlines);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deadlines', userId] });
    },
  });

  return { 
    deadlines, 
    isLoading,
    addDeadline: addDeadlineMutation.mutate, 
    setDeadlines: setDeadlinesMutation.mutate 
  };
}
