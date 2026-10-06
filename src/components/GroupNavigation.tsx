import { useEffect, useState, lazy, Suspense } from 'react';
import {
  Box,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { GroupWithSites } from '../types';
const NavigationDrawer = lazy(() => import('./NavigationDrawer'));

interface GroupNavigationProps {
  groups: GroupWithSites[];
  onNavigate: (groupId: number) => void;
  desktopCollapsed?: boolean;
  onDesktopCollapsedChange?: (collapsed: boolean) => void;
  savingDesktopPreference?: boolean;
}

export default function GroupNavigation({
  groups,
  onNavigate,
  desktopCollapsed: savedCollapsed,
  onDesktopCollapsedChange,
  savingDesktopPreference = false,
}: GroupNavigationProps) {
  const isWideScreen = useMediaQuery('(min-width:1680px)');
  const [open, setOpen] = useState(false);
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const desktopCollapsed = savedCollapsed ?? localCollapsed;
  const changeDesktopCollapsed = (collapsed: boolean) => {
    if (onDesktopCollapsedChange) onDesktopCollapsedChange(collapsed);
    else setLocalCollapsed(collapsed);
  };
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);

  useEffect(() => {
    let frame = 0;
    const updateActiveGroup = () => {
      const sections = groups
        .map((group) => ({ id: group.id, element: document.getElementById(`group-${group.id}`) }))
        .filter((section) => section.element);
      let activeId = sections[0]?.id ?? null;
      for (const section of sections) {
        if (section.element!.getBoundingClientRect().top <= 96) activeId = section.id;
      }
      if (
        document.documentElement.scrollHeight > window.innerHeight + 1 &&
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      ) {
        activeId = sections[sections.length - 1]?.id ?? activeId;
      }
      setActiveGroupId(activeId);
    };
    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateActiveGroup);
    };
    updateActiveGroup();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [groups]);

  if (!groups.length) return null;

  const navigation = (
    <Box component='nav' aria-label='分组导航' sx={{ p: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
        <Typography variant='subtitle1' fontWeight={600}>
          分组导航
        </Typography>
        <IconButton
          aria-label={isWideScreen ? '收起分组导航' : '关闭分组导航'}
          onClick={() => (isWideScreen ? changeDesktopCollapsed(true) : setOpen(false))}
          disabled={isWideScreen && savingDesktopPreference}
          size='small'
        >
          <CloseIcon fontSize='small' />
        </IconButton>
      </Box>
      <List>
        {groups.map((group) => (
          <ListItemButton
            key={group.id}
            selected={activeGroupId === group.id}
            aria-current={activeGroupId === group.id ? 'location' : undefined}
            onClick={() => {
              setOpen(false);
              setActiveGroupId(group.id);
              onNavigate(group.id);
            }}
            sx={{ borderRadius: 2, gap: 1, minHeight: 44 }}
          >
            <ListItemText primary={group.name} slotProps={{ primary: { noWrap: true } }} />
            <Typography variant='caption' color='text.secondary'>
              {group.sites.length}
            </Typography>
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  if (isWideScreen && !desktopCollapsed) {
    return (
      <Paper
        elevation={2}
        sx={{
          position: 'fixed',
          left: 0,
          top: 32,
          width: 200,
          maxHeight: 'calc(100dvh - 64px)',
          overflowY: 'auto',
          borderRadius: 3,
          zIndex: (theme) => theme.zIndex.drawer,
        }}
      >
        {navigation}
      </Paper>
    );
  }

  return (
    <>
      <IconButton
        aria-label={isWideScreen ? '展开分组导航' : '打开分组导航'}
        aria-expanded={isWideScreen ? false : open}
        onClick={() => (isWideScreen ? changeDesktopCollapsed(false) : setOpen(true))}
        disabled={isWideScreen && savingDesktopPreference}
        color='primary'
        sx={{
          position: 'fixed',
          left: 12,
          top: isWideScreen ? 32 : undefined,
          bottom: isWideScreen ? undefined : 'calc(16px + env(safe-area-inset-bottom, 0px))',
          width: 40,
          height: 40,
          bgcolor: 'background.paper',
          boxShadow: 3,
          zIndex: (theme) => theme.zIndex.drawer - 1,
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <MenuIcon sx={{ fontSize: 20 }} />
      </IconButton>
      {!isWideScreen && open && (
        <Suspense fallback={null}>
          <NavigationDrawer onClose={() => setOpen(false)}>{navigation}</NavigationDrawer>
        </Suspense>
      )}
    </>
  );
}
