import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, IconButton } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { ComponentProps } from 'react';
import SiteCard from './SiteCard';

export default function SortableSiteCard({
  disabled = false,
  ...props
}: ComponentProps<typeof SiteCard> & { disabled?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `site-${props.site.id}`, disabled });

  return (
    <Box
      ref={setNodeRef}
      data-site-id={props.site.id}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.25 : 1,
      }}
      sx={{ minWidth: 0, height: '100%' }}
    >
      <SiteCard
        {...props}
        isEditMode
        dragHandle={
          <IconButton
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`拖动 ${props.site.name}`}
            size='small'
            disabled={disabled}
            color='primary'
            sx={{ touchAction: 'none', cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <DragIndicatorIcon fontSize='small' />
          </IconButton>
        }
      />
    </Box>
  );
}
