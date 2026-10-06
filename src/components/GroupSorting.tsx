import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Box, Stack } from '@mui/material';
import SortableGroupItem from './SortableGroupItem';
import type { GroupWithSites } from '../types';

export default function GroupSorting({
  groups,
  onReorder,
}: {
  groups: GroupWithSites[];
  onReorder: (groups: GroupWithSites[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 1, delay: 0 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 3 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return;
        const from = groups.findIndex((g) => g.id.toString() === active.id);
        const to = groups.findIndex((g) => g.id.toString() === over.id);
        if (from !== -1 && to !== -1) onReorder(arrayMove(groups, from, to));
      }}
    >
      <SortableContext
        items={groups.map((g) => g.id.toString())}
        strategy={verticalListSortingStrategy}
      >
        <Stack spacing={2} sx={{ '& > *': { transition: 'none' } }}>
          {groups.map((group) => (
            <Box key={group.id} id={`group-${group.id}`} sx={{ scrollMarginTop: 24 }}>
              <SortableGroupItem id={group.id.toString()} group={group} />
            </Box>
          ))}
        </Stack>
      </SortableContext>
    </DndContext>
  );
}
