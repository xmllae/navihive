import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import type { Group, Site } from '../API/http';
import { extractDomain } from '../utils/url';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Switch,
  Button,
  Stack,
  InputAdornment,
  Slider,
  Alert,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import FileUploadIcon from '@mui/icons-material/FileUpload';

interface AddGroupDialogProps {
  openAddGroup: boolean;
  handleCloseAddGroup: () => void;
  newGroup: Partial<Group>;
  handleGroupInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  setNewGroup: Dispatch<SetStateAction<Partial<Group>>>;
  handleCreateGroup: () => void;
}
export function AddGroupDialog({
  openAddGroup,
  handleCloseAddGroup,
  newGroup,
  handleGroupInputChange,
  setNewGroup,
  handleCreateGroup,
}: AddGroupDialogProps) {
  return (
    <Dialog
      open={openAddGroup}
      onClose={handleCloseAddGroup}
      maxWidth='md'
      fullWidth
      PaperProps={{
        sx: {
          m: { xs: 2, sm: 3, md: 4 },
          width: { xs: 'calc(100% - 32px)', sm: '80%', md: '70%', lg: '60%' },
          maxWidth: { sm: '600px' },
        },
      }}
    >
      <DialogTitle>
        新增分组
        <IconButton
          aria-label='close'
          onClick={handleCloseAddGroup}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>请输入新分组的信息</DialogContentText>
        <TextField
          autoFocus
          margin='dense'
          id='group-name'
          name='name'
          label='分组名称'
          type='text'
          fullWidth
          variant='outlined'
          value={newGroup.name}
          onChange={handleGroupInputChange}
          sx={{ mb: 2 }}
        />

        {/* 公开/私密开关 */}
        <FormControlLabel
          control={
            <Switch
              checked={newGroup.is_public !== 0}
              onChange={(e) => setNewGroup({ ...newGroup, is_public: e.target.checked ? 1 : 0 })}
              color='primary'
            />
          }
          label={
            <Box>
              <Typography variant='body1'>
                {newGroup.is_public !== 0 ? '公开分组' : '私密分组'}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {newGroup.is_public !== 0
                  ? '所有访客都可以看到此分组'
                  : '只有管理员登录后才能看到此分组'}
              </Typography>
            </Box>
          }
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleCloseAddGroup} variant='outlined'>
          取消
        </Button>
        <Button onClick={handleCreateGroup} variant='contained' color='primary'>
          创建
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface AddSiteDialogProps {
  openAddSite: boolean;
  handleCloseAddSite: () => void;
  newSite: Partial<Site>;
  handleSiteInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleError: (message: string) => void;
  configs: Record<string, string>;
  setNewSite: Dispatch<SetStateAction<Partial<Site>>>;
  handleCreateSite: () => void;
}
export function AddSiteDialog({
  openAddSite,
  handleCloseAddSite,
  newSite,
  handleSiteInputChange,
  handleError,
  configs,
  setNewSite,
  handleCreateSite,
}: AddSiteDialogProps) {
  return (
    <Dialog
      open={openAddSite}
      onClose={handleCloseAddSite}
      maxWidth='md'
      fullWidth
      PaperProps={{
        sx: {
          m: { xs: 2, sm: 'auto' },
          width: { xs: 'calc(100% - 32px)', sm: 'auto' },
        },
      }}
    >
      <DialogTitle>
        新增站点
        <IconButton
          aria-label='close'
          onClick={handleCloseAddSite}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>请输入新站点的信息</DialogContentText>
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              flexDirection: { xs: 'column', sm: 'row' },
            }}
          >
            <Box sx={{ flex: 1 }}>
              <TextField
                autoFocus
                margin='dense'
                id='site-name'
                name='name'
                label='站点名称'
                type='text'
                fullWidth
                variant='outlined'
                value={newSite.name}
                onChange={handleSiteInputChange}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <TextField
                margin='dense'
                id='site-url'
                name='url'
                label='站点URL'
                type='url'
                fullWidth
                variant='outlined'
                value={newSite.url}
                onChange={handleSiteInputChange}
              />
            </Box>
          </Box>
          <TextField
            margin='dense'
            id='site-icon'
            name='icon'
            label='图标URL'
            type='url'
            fullWidth
            variant='outlined'
            value={newSite.icon}
            onChange={handleSiteInputChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position='end'>
                  <IconButton
                    onClick={() => {
                      if (!newSite.url) {
                        handleError('请先输入站点URL');
                        return;
                      }
                      const domain = extractDomain(newSite.url);
                      if (domain) {
                        const actualIconApi =
                          configs['site.iconApi'] ||
                          'https://www.faviconextractor.com/favicon/{domain}?larger=true';
                        const iconUrl = actualIconApi.replace('{domain}', domain);
                        setNewSite({
                          ...newSite,
                          icon: iconUrl,
                        });
                      } else {
                        handleError('无法从URL中获取域名');
                      }
                    }}
                    edge='end'
                    title='自动获取图标'
                  >
                    <AutoFixHighIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            margin='dense'
            id='site-description'
            name='description'
            label='站点描述'
            type='text'
            fullWidth
            variant='outlined'
            value={newSite.description}
            onChange={handleSiteInputChange}
          />
          <TextField
            margin='dense'
            id='site-notes'
            name='notes'
            label='备注'
            type='text'
            fullWidth
            multiline
            rows={2}
            variant='outlined'
            value={newSite.notes}
            onChange={handleSiteInputChange}
          />

          {/* 公开/私密开关 */}
          <FormControlLabel
            control={
              <Switch
                checked={newSite.is_public !== 0}
                onChange={(e) => setNewSite({ ...newSite, is_public: e.target.checked ? 1 : 0 })}
                color='primary'
              />
            }
            label={
              <Box>
                <Typography variant='body1'>
                  {newSite.is_public !== 0 ? '公开站点' : '私密站点'}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {newSite.is_public !== 0
                    ? '所有访客都可以看到此站点'
                    : '只有管理员登录后才能看到此站点'}
                </Typography>
              </Box>
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleCloseAddSite} variant='outlined'>
          取消
        </Button>
        <Button onClick={handleCreateSite} variant='contained' color='primary'>
          创建
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface ConfigDialogProps {
  openConfig: boolean;
  handleCloseConfig: () => void;
  tempConfigs: Record<string, string>;
  handleConfigInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  setTempConfigs: Dispatch<SetStateAction<Record<string, string>>>;
  handleSaveConfig: () => void;
}
export function ConfigDialog({
  openConfig,
  handleCloseConfig,
  tempConfigs,
  handleConfigInputChange,
  setTempConfigs,
  handleSaveConfig,
}: ConfigDialogProps) {
  return (
    <Dialog
      open={openConfig}
      onClose={handleCloseConfig}
      maxWidth='sm'
      fullWidth
      PaperProps={{
        sx: {
          m: { xs: 2, sm: 3, md: 4 },
          width: { xs: 'calc(100% - 32px)', sm: '80%', md: '70%', lg: '60%' },
          maxWidth: { sm: '600px' },
        },
      }}
    >
      <DialogTitle>
        网站设置
        <IconButton
          aria-label='close'
          onClick={handleCloseConfig}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>配置网站的基本信息和外观</DialogContentText>
        <Stack spacing={2}>
          <TextField
            margin='dense'
            id='site-title'
            name='site.title'
            label='网站标题 (浏览器标签)'
            type='text'
            fullWidth
            variant='outlined'
            value={tempConfigs['site.title']}
            onChange={handleConfigInputChange}
          />
          <TextField
            margin='dense'
            id='site-name'
            name='site.name'
            label='网站名称 (显示在页面中)'
            type='text'
            fullWidth
            variant='outlined'
            value={tempConfigs['site.name']}
            onChange={handleConfigInputChange}
          />
          {/* 获取图标API设置项 */}
          <Box sx={{ mb: 1 }}>
            <Typography variant='subtitle1' gutterBottom>
              获取图标API设置
            </Typography>
            <TextField
              margin='dense'
              id='site-icon-api'
              name='site.iconApi'
              label='获取图标API URL'
              type='text'
              fullWidth
              variant='outlined'
              value={tempConfigs['site.iconApi']}
              onChange={handleConfigInputChange}
              placeholder='https://example.com/favicon/{domain}'
              helperText='输入获取图标API的地址，使用 {domain} 作为域名占位符'
            />
          </Box>
          {/* 新增背景图片设置 */}
          <Box sx={{ mb: 1 }}>
            <Typography variant='subtitle1' gutterBottom>
              背景图片设置
            </Typography>
            <TextField
              margin='dense'
              id='site-background-image'
              name='site.backgroundImage'
              label='背景图片URL'
              type='url'
              fullWidth
              variant='outlined'
              value={tempConfigs['site.backgroundImage']}
              onChange={handleConfigInputChange}
              placeholder='https://example.com/background.jpg'
              helperText='输入图片URL，留空则不使用背景图片'
            />

            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography
                variant='body2'
                color='text.secondary'
                id='background-opacity-slider'
                gutterBottom
              >
                背景蒙版透明度: {Number(tempConfigs['site.backgroundOpacity']).toFixed(2)}
              </Typography>
              <Slider
                aria-labelledby='background-opacity-slider'
                name='site.backgroundOpacity'
                min={0}
                max={1}
                step={0.01}
                valueLabelDisplay='auto'
                value={Number(tempConfigs['site.backgroundOpacity'])}
                onChange={(_, value) => {
                  setTempConfigs({
                    ...tempConfigs,
                    'site.backgroundOpacity': String(value),
                  });
                }}
              />
              <Typography variant='caption' color='text.secondary'>
                值越大，背景图片越清晰，内容可能越难看清
              </Typography>
            </Box>
          </Box>
          {/* 搜索框功能设置 */}
          <Box sx={{ mb: 1 }}>
            <Typography variant='subtitle1' gutterBottom>
              搜索框功能设置
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={tempConfigs['site.searchBoxEnabled'] === 'true'}
                  onChange={(e) =>
                    setTempConfigs({
                      ...tempConfigs,
                      'site.searchBoxEnabled': e.target.checked ? 'true' : 'false',
                    })
                  }
                  color='primary'
                />
              }
              label={
                <Box>
                  <Typography variant='body1'>启用搜索框</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    控制是否在页面中显示搜索框功能
                  </Typography>
                </Box>
              }
            />
            {tempConfigs['site.searchBoxEnabled'] === 'true' && (
              <FormControlLabel
                control={
                  <Switch
                    checked={tempConfigs['site.searchBoxGuestEnabled'] === 'true'}
                    onChange={(e) =>
                      setTempConfigs({
                        ...tempConfigs,
                        'site.searchBoxGuestEnabled': e.target.checked ? 'true' : 'false',
                      })
                    }
                    color='primary'
                  />
                }
                label={
                  <Box>
                    <Typography variant='body1'>访客可用搜索框</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      允许未登录的访客使用搜索功能
                    </Typography>
                  </Box>
                }
                sx={{ ml: 4, mt: 1 }}
              />
            )}
          </Box>
          <TextField
            margin='dense'
            id='site-custom-css'
            name='site.customCss'
            label='自定义CSS'
            type='text'
            fullWidth
            multiline
            rows={6}
            variant='outlined'
            value={tempConfigs['site.customCss']}
            onChange={handleConfigInputChange}
            placeholder='/* 自定义样式 */\nbody { }'
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleCloseConfig} variant='outlined'>
          取消
        </Button>
        <Button onClick={handleSaveConfig} variant='contained' color='primary'>
          保存设置
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface ImportDialogProps {
  openImport: boolean;
  handleCloseImport: () => void;
  handleFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  importFile: File | null;
  importError: string | null;
  importLoading: boolean;
  handleImportData: () => void;
}
export function ImportDialog({
  openImport,
  handleCloseImport,
  handleFileSelect,
  importFile,
  importError,
  importLoading,
  handleImportData,
}: ImportDialogProps) {
  return (
    <Dialog
      open={openImport}
      onClose={handleCloseImport}
      maxWidth='sm'
      fullWidth
      PaperProps={{
        sx: {
          m: { xs: 2, sm: 'auto' },
          width: { xs: 'calc(100% - 32px)', sm: 'auto' },
        },
      }}
    >
      <DialogTitle>
        导入数据
        <IconButton
          aria-label='close'
          onClick={handleCloseImport}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          请选择要导入的JSON文件，导入将覆盖现有数据。
        </DialogContentText>
        <Box sx={{ mb: 2 }}>
          <Button
            variant='outlined'
            component='label'
            startIcon={<FileUploadIcon />}
            sx={{ mb: 2 }}
          >
            选择文件
            <input type='file' hidden accept='.json' onChange={handleFileSelect} />
          </Button>
          {importFile && (
            <Typography variant='body2' sx={{ mt: 1 }}>
              已选择: {importFile.name}
            </Typography>
          )}
        </Box>
        {importError && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {importError}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleCloseImport} variant='outlined'>
          取消
        </Button>
        <Button
          onClick={handleImportData}
          variant='contained'
          color='primary'
          disabled={!importFile || importLoading}
          startIcon={importLoading ? <CircularProgress size={20} /> : <FileUploadIcon />}
        >
          {importLoading ? '导入中...' : '导入'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
