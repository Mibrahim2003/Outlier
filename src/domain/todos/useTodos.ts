import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Todo } from '../../types';
import { DbTodoRow } from '../db-types';

export function useTodos(userId: string | undefined, reportSyncError: (msg: string) => void) {
  const [todos, setTodosState] = useState<Todo[]>([]);

  const hydrateTodos = (data: DbTodoRow[]) => {
    setTodosState(
      data.map((row) => ({
        id: String(row.id),
        text: row.text,
        completed: Boolean(row.completed),
        dueDate: row.due_date,
        createdAt: row.created_at,
        completedAt: row.completed_at ?? undefined,
        course: row.course ?? undefined,
      })),
    );
  };

  const addTodo = (todo: Todo) => {
    setTodosState((prev) => [...prev, todo]);

    if (!userId) return;

    void supabase
      .from('todos')
      .upsert(
        {
          id: todo.id,
          user_id: userId,
          text: todo.text,
          completed: todo.completed,
          due_date: todo.dueDate,
          course: todo.course ?? null,
          created_at: todo.createdAt,
          completed_at: todo.completedAt ?? null,
        },
        { onConflict: 'user_id,id' },
      )
      .then(({ error }) => {
        if (error) {
          reportSyncError(`Failed to add todo: ${error.message}`);
          setTodosState((prev) => prev.filter((t) => t.id !== todo.id));
        }
      });
  };

  const toggleTodo = (id: string) => {
    let originalTodo: Todo | undefined;
    let updatedTodo: Todo | undefined;
    setTodosState((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          originalTodo = { ...t };
          updatedTodo = {
            ...t,
            completed: !t.completed,
            completedAt: !t.completed ? new Date().toISOString() : undefined,
          };
          return updatedTodo;
        }
        return t;
      }),
    );

    if (!userId || !updatedTodo || !originalTodo) return;

    void supabase
      .from('todos')
      .update({
        completed: updatedTodo.completed,
        completed_at: updatedTodo.completedAt ?? null,
      })
      .eq('user_id', userId)
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          reportSyncError(`Failed to toggle todo: ${error.message}`);
          setTodosState((prev) => prev.map((t) => (t.id === id ? originalTodo! : t)));
        }
      });
  };

  const removeTodo = (id: string) => {
    let removedItem: Todo | undefined;
    setTodosState((prev) => {
      removedItem = prev.find((t) => t.id === id);
      return prev.filter((t) => t.id !== id);
    });

    if (!userId) return;

    void supabase
      .from('todos')
      .delete()
      .eq('user_id', userId)
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          reportSyncError(`Failed to remove todo: ${error.message}`);
          if (removedItem) setTodosState((prev) => [...prev, removedItem!]);
        }
      });
  };

  const clearCompletedTodos = () => {
    let completedIds: string[] = [];
    let completedItems: Todo[] = [];
    setTodosState((prev) => {
      completedItems = prev.filter((t) => t.completed);
      completedIds = completedItems.map((t) => t.id);
      return prev.filter((t) => !t.completed);
    });

    if (!userId || completedIds.length === 0) return;

    void supabase
      .from('todos')
      .delete()
      .eq('user_id', userId)
      .in('id', completedIds)
      .then(({ error }) => {
        if (error) {
          reportSyncError(`Failed to clear completed todos: ${error.message}`);
          setTodosState((prev) => [...prev, ...completedItems]);
        }
      });
  };

  // Midnight auto-clear for completed todos
  useEffect(() => {
    const checkMidnightClear = () => {
      const todayStr = new Date().toISOString().split('T')[0];

      setTodosState((prev) => {
        const toRemove = prev.filter(
          (t) => t.completed && t.completedAt && t.completedAt.split('T')[0] < todayStr,
        );
        if (toRemove.length === 0) return prev;

        if (userId) {
          void supabase
            .from('todos')
            .delete()
            .eq('user_id', userId)
            .in('id', toRemove.map((t) => t.id))
            .then(({ error }) => {
              if (error) console.warn('Midnight auto-clear failed:', error.message);
            });
        }

        return prev.filter((t) => !toRemove.some((r) => r.id === t.id));
      });
    };

    const interval = setInterval(checkMidnightClear, 60_000);
    checkMidnightClear();
    return () => clearInterval(interval);
  }, [userId]);

  const reset = () => setTodosState([]);

  return { todos, addTodo, toggleTodo, removeTodo, clearCompletedTodos, hydrateTodos, reset };
}
