import { useState, type ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import SiteGrid from './SiteGrid';
import SiteCard from './SiteCard';
import SortableSiteCard from './SortableSiteCard';
import type { Site } from '../API/http';

export default function SiteSortingGrid({
  sites,
  onReorder,
  isSaving,
  cardProps,
  onDraggingChange,
}: {
  sites: Site[];
  onReorder: (sites: Site[]) => void;
  isSaving: boolean;
  cardProps: Omit<ComponentProps<typeof SiteCard>, 'site'>;
  onDraggingChange: (dragging: boolean) => void;
}) {
  const [activeSiteId, setActiveSiteId] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const activeSite = sites.find((s) => s.id === activeSiteId);
  return (
    <DndContext
      sensors={sensors}
      autoScroll={{ threshold: { x: 0.05, y: 0.05 } }}
      collisionDetection={(args) =>
        args.pointerCoordinates ? pointerWithin(args) : closestCenter(args)
      }
      onDragStart={({ active }) => {
        setActiveSiteId(sites.find((s) => `site-${s.id}` === active.id)?.id ?? null);
        onDraggingChange(true);
      }}
      onDragCancel={() => {
        setActiveSiteId(null);
        onDraggingChange(false);
      }}
      onDragEnd={({ active, over }) => {
        setActiveSiteId(null);
        onDraggingChange(false);
        if (!over || active.id === over.id) return;
        const from = sites.findIndex((s) => `site-${s.id}` === active.id);
        const to = sites.findIndex((s) => `site-${s.id}` === over.id);
        if (from !== -1 && to !== -1) onReorder(arrayMove(sites, from, to));
      }}
    >
      <SortableContext items={sites.map((s) => `site-${s.id}`)} strategy={rectSortingStrategy}>
        <SiteGrid>
          {sites.map((site) => (
            <SortableSiteCard key={site.id} site={site} {...cardProps} disabled={isSaving} />
          ))}
        </SiteGrid>
      </SortableContext>
      {createPortal(
        <DragOverlay dropAnimation={null}>
          {activeSite ? <SiteCard site={activeSite} {...cardProps} isEditMode /> : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
