import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Site, Group } from '../API/http';
import SiteCard from './SiteCard';
import SortableSiteCard from './SortableSiteCard';
import { GroupWithSites } from '../types';
import EditGroupDialog from './EditGroupDialog';
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
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
// 引入Material UI组件
import {
  Paper,
  Typography,
  Button,
  Box,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Collapse,
} from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// 更新组件属性接口
interface GroupCardProps {
  group: GroupWithSites;
  index?: number; // 用于Draggable的索引，仅在分组排序模式下需要
  sortMode: 'None' | 'GroupSort' | 'SiteSort';
  currentSortingGroupId: number | null;
  viewMode?: 'readonly' | 'edit'; // 访问模式
  onUpdate: (updatedSite: Site) => void;
  onDelete: (siteId: number) => void;
  onSaveSiteOrder: (groupId: number, sites: Site[]) => void | Promise<void>;
  onStartSiteSort: (groupId: number) => void;
  onAddSite?: (groupId: number) => void; // 新增添加卡片的可选回调函数
  onUpdateGroup?: (group: Group) => void; // 更新分组的回调函数
  onDeleteGroup?: (groupId: number) => void; // 删除分组的回调函数
  configs?: Record<string, string>; // 传入配置
  expandRequest?: number;
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  sortMode,
  currentSortingGroupId,
  viewMode = 'edit', // 默认为编辑模式
  onUpdate,
  onDelete,
  onSaveSiteOrder,
  onStartSiteSort,
  onAddSite,
  onUpdateGroup,
  onDeleteGroup,
  configs,
  expandRequest,
}) => {
  // 添加本地状态来管理站点排序
  const [sites, setSites] = useState<Site[]>(group.sites);
  const [activeSiteId, setActiveSiteId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // 添加编辑弹窗的状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  // 添加提示消息状态
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  // 添加折叠状态
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = localStorage.getItem(`group-${group.id}-collapsed`);
    return savedState ? JSON.parse(savedState) : false;
  });

  // 保存折叠状态到本地存储
  useEffect(() => {
    if (group.id) {
      localStorage.setItem(`group-${group.id}-collapsed`, JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, group.id]);

  useEffect(() => {
    if (expandRequest) setIsCollapsed(false);
  }, [expandRequest]);

  // 处理折叠切换
  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // 配置传感器，支持鼠标、触摸和键盘操作
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5, // 5px 的移动才激活拖拽，防止误触
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 延迟250ms激活，防止误触
        tolerance: 5, // 容忍5px的移动
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 站点拖拽结束处理函数
  const handleSiteDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSiteId(null);

    if (!over) return;

    if (active.id !== over.id) {
      // 查找拖拽的站点索引
      const oldIndex = sites.findIndex((site) => `site-${site.id}` === active.id);
      const newIndex = sites.findIndex((site) => `site-${site.id}` === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // 更新本地站点顺序
        const newSites = arrayMove(sites, oldIndex, newIndex);
        setSites(newSites);
      }
    }
  };

  // 编辑分组处理函数
  const handleEditClick = () => {
    setEditDialogOpen(true);
  };

  // 更新分组处理函数
  const handleUpdateGroup = (updatedGroup: Group) => {
    if (onUpdateGroup) {
      onUpdateGroup(updatedGroup);
      setEditDialogOpen(false);
    }
  };

  // 删除分组处理函数
  const handleDeleteGroup = (groupId: number) => {
    if (onDeleteGroup) {
      onDeleteGroup(groupId);
      setEditDialogOpen(false);
    }
  };

  // 判断是否为当前正在编辑的分组
  const isCurrentEditingGroup = sortMode === 'SiteSort' && currentSortingGroupId === group.id;

  // 渲染站点卡片区域
  const renderSites = () => {
    const sitesToRender = isCurrentEditingGroup ? sites : group.sites;
    const activeSite = sites.find((site) => site.id === activeSiteId);
    const grid = (
      <Box
        data-site-grid
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, minmax(0, 1fr))',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))',
            xl: 'repeat(5, minmax(0, 1fr))',
          },
          gap: 2,
          gridAutoRows: '1fr',
        }}
      >
        {sitesToRender.map((site) => {
          const props = {
            site,
            onUpdate,
            onDelete,
            viewMode,
            iconApi: configs?.['site.iconApi'],
          };
          return isCurrentEditingGroup ? (
            <SortableSiteCard key={site.id} {...props} disabled={isSaving} />
          ) : (
            <Box key={site.id} data-site-id={site.id} sx={{ minWidth: 0, height: '100%' }}>
              <SiteCard {...props} />
            </Box>
          );
        })}
      </Box>
    );

    if (!isCurrentEditingGroup) return grid;

    return (
      <DndContext
        sensors={sensors}
        autoScroll={{ threshold: { x: 0.05, y: 0.05 } }}
        collisionDetection={(args) =>
          args.pointerCoordinates ? pointerWithin(args) : closestCenter(args)
        }
        onDragStart={(event: DragStartEvent) => {
          const site = sites.find((item) => `site-${item.id}` === event.active.id);
          setActiveSiteId(site?.id ?? null);
        }}
        onDragEnd={handleSiteDragEnd}
        onDragCancel={() => setActiveSiteId(null)}
      >
        <SortableContext
          items={sitesToRender.map((site) => `site-${site.id}`)}
          strategy={rectSortingStrategy}
        >
          {grid}
        </SortableContext>
        {createPortal(
          <DragOverlay dropAnimation={null}>
            {activeSite ? (
              <SiteCard
                site={activeSite}
                onUpdate={onUpdate}
                onDelete={onDelete}
                isEditMode
                viewMode={viewMode}
                iconApi={configs?.['site.iconApi']}
              />
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    );
  };

  const handleSaveSiteOrder = async () => {
    if (!group.id) {
      console.error('分组 ID 不存在,无法保存排序');
      return;
    }
    setIsSaving(true);
    try {
      await onSaveSiteOrder(group.id, sites);
    } finally {
      setIsSaving(false);
    }
  };

  // 处理排序按钮点击
  const handleSortClick = () => {
    if (!group.id) {
      console.error('分组 ID 不存在,无法开始排序');
      return;
    }
    if (group.sites.length < 2) {
      setSnackbarMessage('至少需要2个站点才能进行排序');
      setSnackbarOpen(true);
      return;
    }
    // 确保分组展开
    setSites([...group.sites]);
    setActiveSiteId(null);
    if (isCollapsed) {
      setIsCollapsed(false);
    }
    onStartSiteSort(group.id);
  };

  // 关闭提示消息
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // 修改分组标题区域的渲染
  return (
    <Paper
      elevation={sortMode === 'None' ? 2 : 3}
      sx={{
        borderRadius: 4,
        p: { xs: 2, sm: 3 },
        transition: 'all 0.3s ease-in-out',
        border: '1px solid transparent',
        '&:hover': {
          boxShadow: sortMode === 'None' ? 6 : 3,
          borderColor: 'divider',
          transform: sortMode === 'None' ? 'scale(1.01)' : 'none',
        },
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(33, 33, 33, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(5px)',
      }}
    >
      <Box
        display='flex'
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent='space-between'
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        mb={2.5}
        gap={1}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            '&:hover': {
              '& .collapse-icon': {
                color: 'primary.main',
              },
            },
          }}
          onClick={handleToggleCollapse}
        >
          <IconButton
            size='small'
            aria-label={`${isCollapsed ? '展开' : '折叠'}分组 ${group.name}`}
            className='collapse-icon'
            sx={{
              transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.3s ease-in-out',
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
          <Typography
            variant='h5'
            component='h2'
            fontWeight='600'
            color='text.primary'
            sx={{ mb: { xs: 1, sm: 0 } }}
          >
            {group.name}
            <Typography component='span' variant='body2' color='text.secondary' sx={{ ml: 1 }}>
              ({group.sites.length})
            </Typography>
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'row', sm: 'row' },
            gap: 1,
            width: { xs: '100%', sm: 'auto' },
            flexWrap: 'wrap',
            justifyContent: { xs: 'flex-start', sm: 'flex-end' },
          }}
        >
          {isCurrentEditingGroup ? (
            <Button
              variant='contained'
              color='primary'
              size='small'
              startIcon={<SaveIcon />}
              onClick={handleSaveSiteOrder}
              disabled={isSaving || activeSiteId !== null}
              sx={{
                minWidth: 'auto',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
              }}
            >
              保存顺序
            </Button>
          ) : (
            sortMode === 'None' &&
            viewMode === 'edit' && ( // 只在编辑模式显示按钮
              <>
                {onAddSite && group.id && (
                  <Button
                    variant='contained'
                    color='primary'
                    size='small'
                    onClick={() => onAddSite(group.id)}
                    startIcon={<AddIcon />}
                    sx={{
                      minWidth: 'auto',
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    }}
                  >
                    添加卡片
                  </Button>
                )}
                <Button
                  variant='outlined'
                  color='primary'
                  size='small'
                  startIcon={<SortIcon />}
                  onClick={handleSortClick}
                  sx={{
                    minWidth: 'auto',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  }}
                >
                  排序
                </Button>

                {onUpdateGroup && onDeleteGroup && (
                  <Tooltip title='编辑分组'>
                    <IconButton
                      color='primary'
                      onClick={handleEditClick}
                      size='small'
                      sx={{ alignSelf: 'center' }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            )
          )}
        </Box>
      </Box>

      {/* 使用 Collapse 组件包装站点卡片区域 */}
      <Collapse in={!isCollapsed} timeout='auto'>
        {renderSites()}
      </Collapse>

      {/* 编辑分组弹窗 */}
      {onUpdateGroup && onDeleteGroup && (
        <EditGroupDialog
          open={editDialogOpen}
          group={group}
          onClose={() => setEditDialogOpen(false)}
          onSave={handleUpdateGroup}
          onDelete={handleDeleteGroup}
        />
      )}

      {/* 提示消息 */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity='info' sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default GroupCard;
