import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Todo } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useEffect } from 'react';

export function useTodos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ['todos', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.from('todos').select('*').eq('user_id', userId);
      if (error) throw error;
      return data.map((row: any) => ({
        id: String(row.id),
        text: row.text,
        completed: Boolean(row.completed),
        dueDate: row.due_date,
        createdAt: row.created_at,
        completedAt: row.completed_at ?? undefined,
        course: row.course ?? undefined,
      }));
    },
    enabled: !!userId,
  });

  const addTodoMutation = useMutation({
    mutationFn: async (todo: Todo) => {
      const { error } = await supabase.from('todos').upsert({
        id: todo.id,
        user_id: userId,
        text: todo.text,
        completed: todo.completed,
        due_date: todo.dueDate,
        course: todo.course ?? null,
        created_at: todo.createdAt,
        completed_at: todo.completedAt ?? null,
      }, { onConflict: 'user_id,id' });
      if (error) throw error;
    },
    onMutate: async (newTodo) => {
      await queryClient.cancelQueries({ queryKey: ['todos', userId] });
      const previousTodos = queryClient.getQueryData(['todos', userId]);
      queryClient.setQueryData(['todos', userId], (old: Todo[] = []) => [...old, newTodo]);
      return { previousTodos };
    },
    onError: (_err, _, context: any) => {
      queryClient.setQueryData(['todos', userId], context?.previousTodos);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', userId] });
    },
  });

  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, completed, completedAt }: { id: string, completed: boolean, completedAt?: string }) => {
      const { error } = await supabase
        .from('todos')
        .update({ completed, completed_at: completedAt ?? null })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onMutate: async ({ id, completed, completedAt }) => {
      await queryClient.cancelQueries({ queryKey: ['todos', userId] });
      const previousTodos = queryClient.getQueryData(['todos', userId]);
      queryClient.setQueryData(['todos', userId], (old: Todo[] = []) => 
        old.map(t => t.id === id ? { ...t, completed, completedAt } : t)
      );
      return { previousTodos };
    },
    onError: (_err, _, context: any) => {
      queryClient.setQueryData(['todos', userId], context?.previousTodos);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', userId] });
    },
  });

  const toggleTodo = (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    const completed = !todo.completed;
    const completedAt = completed ? new Date().toISOString() : undefined;
    toggleTodoMutation.mutate({ id, completed, completedAt });
  };

  const removeTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('todos').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['todos', userId] });
      const previousTodos = queryClient.getQueryData(['todos', userId]);
      queryClient.setQueryData(['todos', userId], (old: Todo[] = []) => old.filter(t => t.id !== id));
      return { previousTodos };
    },
    onError: (_err, _, context: any) => {
      queryClient.setQueryData(['todos', userId], context?.previousTodos);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', userId] });
    },
  });

  const clearCompletedMutation = useMutation({
    mutationFn: async (completedIds: string[]) => {
      if (!completedIds.length) return;
      const { error } = await supabase.from('todos').delete().in('id', completedIds).eq('user_id', userId);
      if (error) throw error;
    },
    onMutate: async (_completedIds) => {
      await queryClient.cancelQueries({ queryKey: ['todos', userId] });
      const previousTodos = queryClient.getQueryData(['todos', userId]);
      queryClient.setQueryData(['todos', userId], (old: Todo[] = []) => old.filter(t => !t.completed));
      return { previousTodos };
    },
    onError: (_err, _, context: any) => {
      queryClient.setQueryData(['todos', userId], context?.previousTodos);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', userId] });
    },
  });

  const { mutate: clearCompleted } = clearCompletedMutation;

  const clearCompletedTodos = () => {
    const completedIds = todos.filter(t => t.completed).map(t => t.id);
    if (completedIds.length) clearCompleted(completedIds);
  };

  // Midnight auto-clear for completed todos
  useEffect(() => {
    const checkMidnightClear = () => {
      if (!userId || !todos.length) return;
      const todayStr = new Date().toISOString().split('T')[0];
      const toRemove = todos.filter(
        (t) => t.completed && t.completedAt && t.completedAt.split('T')[0] < todayStr
      );
      if (toRemove.length > 0) {
        clearCompleted(toRemove.map(t => t.id));
      }
    };
    const interval = setInterval(checkMidnightClear, 60_000);
    checkMidnightClear();
    return () => clearInterval(interval);
  }, [userId, todos, clearCompleted]);

  return { 
    todos, 
    isLoading,
    addTodo: addTodoMutation.mutate, 
    toggleTodo, 
    removeTodo: removeTodoMutation.mutate, 
    clearCompletedTodos 
  };
}
