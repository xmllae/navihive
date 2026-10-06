import { cloneElement, lazy, Suspense, useId, useState, type ReactElement } from 'react';

const Tooltip = lazy(() => import('@mui/material/Tooltip'));

export default function DeferredTooltip({
  title,
  children,
}: {
  title: string;
  children: ReactElement;
}) {
  const [loaded, setLoaded] = useState(false);
  const [anchor, setAnchor] = useState<Element | null>(null);
  const id = useId();
  const child = children as ReactElement<{ 'aria-label'?: string; 'aria-describedby'?: string }>;
  return (
    <span
      style={{ display: 'contents' }}
      onMouseEnter={(event) => {
        setLoaded(true);
        setAnchor(event.currentTarget.firstElementChild);
      }}
      onMouseLeave={() => setAnchor(null)}
      onFocus={(event) => {
        setLoaded(true);
        setAnchor(event.currentTarget.firstElementChild);
      }}
      onBlur={() => setAnchor(null)}
    >
      {cloneElement(child, {
        'aria-label': child.props['aria-label'] ?? title,
        'aria-describedby': anchor ? id : undefined,
      })}
      {loaded && (
        <Suspense fallback={null}>
          <Tooltip title={title} id={id} open={Boolean(anchor)} PopperProps={{ anchorEl: anchor }}>
            <span style={{ display: 'none' }} />
          </Tooltip>
        </Suspense>
      )}
    </span>
  );
}
