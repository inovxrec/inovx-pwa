import { useCallback, useState } from 'react';

/**
 * Minimal HTML5 drag-and-drop helper for the Board's kanban columns.
 * A dragged task's id is tracked in state; each column calls onDropOnColumn
 * with that id when the browser fires a drop event on it.
 */
export function useDragDrop<T extends { id: string }>(onDropOnColumn: (taskId: string, columnId: string) => void) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const dragProps = useCallback(
    (item: T) => ({
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = 'move';
        setDraggedId(item.id);
      },
      onDragEnd: () => setDraggedId(null),
    }),
    []
  );

  const dropZoneProps = useCallback(
    (columnId: string) => ({
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedId) {
          onDropOnColumn(draggedId, columnId);
          setDraggedId(null);
        }
      },
    }),
    [draggedId, onDropOnColumn]
  );

  return { draggedId, dragProps, dropZoneProps };
}
