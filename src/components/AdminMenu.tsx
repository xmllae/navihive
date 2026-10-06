import { Menu, MenuItem, Divider, ListItemIcon, ListItemText } from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';
import SettingsIcon from '@mui/icons-material/Settings';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import LogoutIcon from '@mui/icons-material/Logout';
interface Props {
  menuAnchorEl: HTMLElement | null;
  openMenu: boolean;
  handleMenuClose: () => void;
  startGroupSort: () => void;
  handleOpenConfig: () => void;
  handleExportData: () => void;
  handleOpenImport: () => void;
  isAuthenticated: boolean;
  handleLogout: () => void;
}
export default function AdminMenu({
  menuAnchorEl,
  openMenu,
  handleMenuClose,
  startGroupSort,
  handleOpenConfig,
  handleExportData,
  handleOpenImport,
  isAuthenticated,
  handleLogout,
}: Props) {
  return (
    <Menu
      id='navigation-menu'
      anchorEl={menuAnchorEl}
      open={openMenu}
      onClose={handleMenuClose}
      MenuListProps={{
        'aria-labelledby': 'navigation-button',
      }}
    >
      <MenuItem onClick={startGroupSort}>
        <ListItemIcon>
          <SortIcon fontSize='small' />
        </ListItemIcon>
        <ListItemText>编辑排序</ListItemText>
      </MenuItem>
      <MenuItem onClick={handleOpenConfig}>
        <ListItemIcon>
          <SettingsIcon fontSize='small' />
        </ListItemIcon>
        <ListItemText>网站设置</ListItemText>
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleExportData}>
        <ListItemIcon>
          <FileDownloadIcon fontSize='small' />
        </ListItemIcon>
        <ListItemText>导出数据</ListItemText>
      </MenuItem>
      <MenuItem onClick={handleOpenImport}>
        <ListItemIcon>
          <FileUploadIcon fontSize='small' />
        </ListItemIcon>
        <ListItemText>导入数据</ListItemText>
      </MenuItem>
      {isAuthenticated && (
        <>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon sx={{ color: 'error.main' }}>
              <LogoutIcon fontSize='small' />
            </ListItemIcon>
            <ListItemText>退出登录</ListItemText>
          </MenuItem>
        </>
      )}
    </Menu>
  );
}
