import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { NavigationClient } from './API/client';
import { MockNavigationClient } from './API/mock';
import { Site, Group } from './API/http';
import { GroupWithSites } from './types';
import ThemeToggle from './components/ThemeToggle';
import GroupCard from './components/GroupCard';
import GroupNavigation from './components/GroupNavigation';
const LoginForm = lazy(() => import('./components/LoginForm'));
const AddGroupDialog = lazy(() =>
  import('./components/AdminDialogs').then((m) => ({ default: m.AddGroupDialog }))
);
const AddSiteDialog = lazy(() =>
  import('./components/AdminDialogs').then((m) => ({ default: m.AddSiteDialog }))
);
const ConfigDialog = lazy(() =>
  import('./components/AdminDialogs').then((m) => ({ default: m.ConfigDialog }))
);
const ImportDialog = lazy(() =>
  import('./components/AdminDialogs').then((m) => ({ default: m.ImportDialog }))
);
import SearchBox from './components/SearchBox';
const AdminMenu = lazy(() => import('./components/AdminMenu'));
const PageFeedback = lazy(() => import('./components/PageFeedback'));
import { sanitizeCSS, isSecureUrl } from './utils/url';
import { SearchResultItem } from './utils/search';
import './App.css';
const GroupSorting = lazy(() => import('./components/GroupSorting'));
import { useBootstrap } from './hooks/useBootstrap';
import type { BootstrapData } from './API/http';
// Material UI 导入
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Stack,
  createTheme,
  ThemeProvider,
  CssBaseline,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import MenuIcon from '@mui/icons-material/Menu';

// 根据环境选择使用真实API还是模拟API
const isDevEnvironment = import.meta.env.DEV;
const useRealApi = import.meta.env.VITE_USE_REAL_API === 'true';

const api =
  isDevEnvironment && !useRealApi
    ? new MockNavigationClient()
    : new NavigationClient(isDevEnvironment ? 'http://localhost:8788/api' : '/api');

// 排序模式枚举
enum SortMode {
  None, // 不排序
  GroupSort, // 分组排序
  SiteSort, // 站点排序
}

// 默认配置
const DEFAULT_CONFIGS = {
  'site.title': '导航站',
  'site.name': '导航站',
  'site.customCss': '',
  'site.backgroundImage': '', // 背景图片URL
  'site.backgroundOpacity': '0.15', // 背景蒙版透明度
  'site.iconApi': 'https://www.faviconextractor.com/favicon/{domain}?larger=true', // 默认使用的API接口，带上 ?larger=true 参数可以获取最大尺寸的图标
  'site.searchBoxEnabled': 'true', // 是否启用搜索框
  'site.searchBoxGuestEnabled': 'true', // 访客是否可以使用搜索框
};

function App() {
  const [navigationTarget, setNavigationTarget] = useState({ groupId: 0, request: 0 });
  const navigateToGroup = (groupId: number) => {
    setNavigationTarget((previous) => ({ groupId, request: previous.request + 1 }));
  };

  useEffect(() => {
    if (!navigationTarget.request) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`group-${navigationTarget.groupId}`)?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [navigationTarget]);

  // 主题模式状态
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // 创建Material UI主题
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
        },
      }),
    [darkMode]
  );

  // 切换主题的回调函数
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
  };

  const [groups, setGroups] = useState<GroupWithSites[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>(SortMode.None);
  const [currentSortingGroupId, setCurrentSortingGroupId] = useState<number | null>(null);

  // 新增认证状态
  const [isAuthRequired, setIsAuthRequired] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [savingSidebarPreference, setSavingSidebarPreference] = useState(false);
  const sidebarSession = useRef(0);

  useEffect(
    () => () => {
      sidebarSession.current += 1;
    },
    []
  );
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // 访问模式状态 (readonly: 访客模式, edit: 编辑模式)
  type ViewMode = 'readonly' | 'edit';
  const [viewMode, setViewMode] = useState<ViewMode>('readonly');

  // 配置状态
  const [configs, setConfigs] = useState<Record<string, string>>(DEFAULT_CONFIGS);
  const [openConfig, setOpenConfig] = useState(false);
  const [tempConfigs, setTempConfigs] = useState<Record<string, string>>(DEFAULT_CONFIGS);

  // 新增状态管理
  const [openAddGroup, setOpenAddGroup] = useState(false);
  const [openAddSite, setOpenAddSite] = useState(false);
  const [newGroup, setNewGroup] = useState<Partial<Group>>({
    name: '',
    order_num: 0,
    is_public: 1, // 默认为公开
  });
  const [newSite, setNewSite] = useState<Partial<Site>>({
    name: '',
    url: '',
    icon: '',
    description: '',
    notes: '',
    order_num: 0,
    group_id: 0,
    is_public: 1, // 默认为公开
  });

  // 新增菜单状态
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(menuAnchorEl);

  // 新增导入对话框状态
  const [openImport, setOpenImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  // 错误提示框状态
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  // 导入结果提示框状态
  const [importResultOpen, setImportResultOpen] = useState(false);
  const [importResultMessage, setImportResultMessage] = useState('');

  // 菜单打开关闭
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // 处理错误的函数
  const handleError = useCallback((errorMessage: string) => {
    setSnackbarMessage(errorMessage);
    setSnackbarOpen(true);
    console.error(errorMessage);
  }, []);

  // 加载配置
  const fetchConfigs = useCallback(async () => {
    try {
      const configsData = await api.getConfigs();
      setConfigs({
        ...DEFAULT_CONFIGS,
        ...configsData,
      });
      setTempConfigs({
        ...DEFAULT_CONFIGS,
        ...configsData,
      });
    } catch (error) {
      console.error('加载配置失败:', error);
      // 使用默认配置
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 使用新的 getGroupsWithSites API 优化 N+1 查询问题
      const groupsWithSites = await api.getGroupsWithSites();

      setGroups(groupsWithSites);
    } catch (error) {
      console.error('加载数据失败:', error);
      handleError('加载数据失败: ' + (error instanceof Error ? error.message : '未知错误'));

      // 如果因为认证问题导致加载失败，处理认证状态
      if (error instanceof Error && error.message.includes('认证')) {
        setIsAuthRequired(true);
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const changeSidebarPreference = async (collapsed: boolean) => {
    if (savingSidebarPreference) return;
    const previous = desktopSidebarCollapsed;
    const session = sidebarSession.current;
    setDesktopSidebarCollapsed(collapsed);
    if (!isAuthenticated) return;
    setSavingSidebarPreference(true);
    try {
      await api.setDesktopSidebarPreference(collapsed);
    } catch {
      if (sidebarSession.current === session) {
        setDesktopSidebarCollapsed(previous);
        handleError('侧栏状态保存失败，请重试');
      }
    } finally {
      if (sidebarSession.current === session) setSavingSidebarPreference(false);
    }
  };

  const applyBootstrap = useCallback(
    (data: BootstrapData) => {
      setIsAuthenticated(data.authenticated);
      setIsAuthRequired(false);
      setViewMode(data.authenticated ? 'edit' : 'readonly');
      setGroups(data.groups);
      setConfigs({ ...DEFAULT_CONFIGS, ...data.configs });
      setTempConfigs({ ...DEFAULT_CONFIGS, ...data.configs });
      setDesktopSidebarCollapsed(data.desktopSidebarPreference?.collapsed ?? false);
      setSavingSidebarPreference(false);
      setLoading(false);
      setError(null);
      if (data.desktopSidebarPreferenceError) handleError(data.desktopSidebarPreferenceError);
    },
    [handleError]
  );
  const bootstrapError = useCallback(
    (message: string) => {
      setGroups([]);
      setIsAuthenticated(false);
      setViewMode('readonly');
      setDesktopSidebarCollapsed(false);
      setLoading(false);
      setError(message);
      handleError(message);
    },
    [handleError]
  );
  const { checking: isAuthChecking, load: checkAuthStatus } = useBootstrap(
    api,
    applyBootstrap,
    bootstrapError,
    sidebarSession
  );

  // 登录功能
  const handleLogin = async (username: string, password: string, rememberMe: boolean = false) => {
    try {
      setLoginLoading(true);
      setLoginError(null);

      // 调用登录接口
      const loginResponse = await api.login(username, password, rememberMe);

      if (loginResponse?.success) {
        await checkAuthStatus();
      } else {
        // 登录失败
        const message = loginResponse?.message || '用户名或密码错误';
        handleError(message);
        setLoginError(message);
        setIsAuthenticated(false);
        setViewMode('readonly');
        return;
      }
    } catch (error) {
      console.error('登录失败:', error);
      handleError('登录失败: ' + (error instanceof Error ? error.message : '未知错误'));
      setIsAuthenticated(false);
      setViewMode('readonly');
    } finally {
      setLoginLoading(false);
    }
  };

  // 登出功能
  const handleLogout = async () => {
    sidebarSession.current += 1;
    setGroups([]);
    setDesktopSidebarCollapsed(false);
    setSavingSidebarPreference(false);
    await api.logout();
    setIsAuthenticated(false);
    setIsAuthRequired(false); // 允许继续以访客身份访问
    setViewMode('readonly'); // 切换到只读模式

    // 重新加载数据（仅公开内容）
    await checkAuthStatus();

    handleMenuClose();

    // 显示提示信息
    setSnackbarMessage('已退出登录，当前为访客模式');
    setSnackbarOpen(true);
  };

  useEffect(() => {
    // 检查认证状态
    checkAuthStatus();

    // 确保初始化时重置排序状态
    setSortMode(SortMode.None);
    setCurrentSortingGroupId(null);
  }, [checkAuthStatus]);

  // 设置文档标题
  useEffect(() => {
    document.title = configs['site.title'] || '导航站';
  }, [configs]);

  // 应用自定义CSS
  useEffect(() => {
    const customCss = configs['site.customCss'];
    let styleElement = document.getElementById('custom-style');

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'custom-style';
      document.head.appendChild(styleElement);
    }

    // 使用安全的 CSS 清理函数，防止XSS攻击
    const sanitized = sanitizeCSS(customCss || '');
    styleElement.textContent = sanitized;

    // 清理函数：组件卸载时移除样式
    return () => {
      const el = document.getElementById('custom-style');
      if (el) {
        el.remove();
      }
    };
  }, [configs]);

  // 同步HTML的class以保持与现有CSS兼容
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // 关闭错误提示框
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // 更新站点
  const handleSiteUpdate = useCallback(
    async (updatedSite: Site) => {
      try {
        if (updatedSite.id) {
          await api.updateSite(updatedSite.id, updatedSite);
          await fetchData(); // 重新加载数据
        }
      } catch (error) {
        console.error('更新站点失败:', error);
        handleError('更新站点失败: ' + (error as Error).message);
      }
    },
    [fetchData, handleError]
  );

  // 删除站点
  const handleSiteDelete = useCallback(
    async (siteId: number) => {
      try {
        await api.deleteSite(siteId);
        await fetchData(); // 重新加载数据
      } catch (error) {
        console.error('删除站点失败:', error);
        handleError('删除站点失败: ' + (error as Error).message);
      }
    },
    [fetchData, handleError]
  );

  // 保存分组排序
  const handleSaveGroupOrder = async () => {
    try {
      console.log('保存分组顺序', groups);
      // 构造需要更新的分组顺序数据
      const groupOrders = groups.map((group, index) => ({
        id: group.id as number, // 断言id为number类型
        order_num: index,
      }));

      // 调用API更新分组顺序
      const result = await api.updateGroupOrder(groupOrders);

      if (result) {
        console.log('分组排序更新成功');
        // 重新获取最新数据
        await fetchData();
      } else {
        throw new Error('分组排序更新失败');
      }

      setSortMode(SortMode.None);
      setCurrentSortingGroupId(null);
    } catch (error) {
      console.error('更新分组排序失败:', error);
      handleError('更新分组排序失败: ' + (error as Error).message);
    }
  };

  // 保存站点排序
  const handleSaveSiteOrder = useCallback(
    async (groupId: number, sites: Site[]) => {
      try {
        console.log('保存站点排序', groupId, sites);

        // 构造需要更新的站点顺序数据
        const siteOrders = sites.map((site, index) => ({
          id: site.id as number,
          order_num: index,
        }));

        // 调用API更新站点顺序
        const result = await api.updateSiteOrder(siteOrders);

        if (result) {
          console.log('站点排序更新成功');
          // 保留卡片和排序草稿，避免刷新失败时因卸载组件丢失草稿。
          setGroups(await api.getGroupsWithSites());
        } else {
          throw new Error('站点排序更新失败');
        }

        setSortMode(SortMode.None);
        setCurrentSortingGroupId(null);
      } catch (error) {
        console.error('更新站点排序失败:', error);
        handleError('更新站点排序失败: ' + (error as Error).message);
      }
    },
    [handleError]
  );

  // 启动分组排序
  const startGroupSort = () => {
    console.log('开始分组排序');
    setSortMode(SortMode.GroupSort);
    setCurrentSortingGroupId(null);
  };

  // 启动站点排序
  const startSiteSort = useCallback((groupId: number) => {
    console.log('开始站点排序');
    setSortMode(SortMode.SiteSort);
    setCurrentSortingGroupId(groupId);
  }, []);

  // 取消排序
  const cancelSort = () => {
    setSortMode(SortMode.None);
    setCurrentSortingGroupId(null);
  };

  // 新增分组相关函数
  const handleOpenAddGroup = () => {
    setNewGroup({ name: '', order_num: groups.length, is_public: 1 }); // 默认公开
    setOpenAddGroup(true);
  };

  const handleCloseAddGroup = () => {
    setOpenAddGroup(false);
  };

  const handleGroupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGroup({
      ...newGroup,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateGroup = async () => {
    try {
      if (!newGroup.name) {
        handleError('分组名称不能为空');
        return;
      }

      await api.createGroup(newGroup as Group);
      await fetchData(); // 重新加载数据
      handleCloseAddGroup();
      setNewGroup({ name: '', order_num: 0 }); // 重置表单
    } catch (error) {
      console.error('创建分组失败:', error);
      handleError('创建分组失败: ' + (error as Error).message);
    }
  };

  // 新增站点相关函数
  const handleOpenAddSite = useCallback(
    (groupId: number) => {
      const group = groups.find((g) => g.id === groupId);
      const maxOrderNum = group?.sites.length
        ? Math.max(...group.sites.map((s) => s.order_num)) + 1
        : 0;

      setNewSite({
        name: '',
        url: '',
        icon: '',
        description: '',
        notes: '',
        group_id: groupId,
        order_num: maxOrderNum,
        is_public: 1, // 默认为公开
      });

      setOpenAddSite(true);
    },
    [groups]
  );

  const handleCloseAddSite = () => {
    setOpenAddSite(false);
  };

  const handleSiteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewSite({
      ...newSite,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateSite = async () => {
    try {
      if (!newSite.name || !newSite.url) {
        handleError('站点名称和URL不能为空');
        return;
      }

      await api.createSite(newSite as Site);
      await fetchData(); // 重新加载数据
      handleCloseAddSite();
    } catch (error) {
      console.error('创建站点失败:', error);
      handleError('创建站点失败: ' + (error as Error).message);
    }
  };

  // 配置相关函数
  const handleOpenConfig = () => {
    setTempConfigs({ ...configs });
    setOpenConfig(true);
  };

  const handleCloseConfig = () => {
    setOpenConfig(false);
  };

  const handleConfigInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempConfigs({
      ...tempConfigs,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveConfig = async () => {
    try {
      // 保存所有配置
      for (const [key, value] of Object.entries(tempConfigs)) {
        if (configs[key] !== value) {
          await api.setConfig(key, value);
        }
      }

      // 更新配置状态
      setConfigs({ ...tempConfigs });
      handleCloseConfig();
    } catch (error) {
      console.error('保存配置失败:', error);
      handleError('保存配置失败: ' + (error as Error).message);
    }
  };

  // 处理导出数据
  const handleExportData = async () => {
    try {
      setLoading(true);

      // 提取所有站点数据为单独的数组
      const allSites: Site[] = [];
      groups.forEach((group) => {
        if (group.sites && group.sites.length > 0) {
          allSites.push(...group.sites);
        }
      });

      const exportData = {
        // 只导出分组基本信息，不包含站点
        groups: groups.map((group) => ({
          id: group.id,
          name: group.name,
          order_num: group.order_num,
        })),
        // 站点数据作为单独的顶级数组
        sites: allSites,
        configs: configs,
        // 添加版本和导出日期
        version: '1.0',
        exportDate: new Date().toISOString(),
      };

      // 创建并下载JSON文件
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      const exportFileName = `导航站备份_${new Date().toISOString().slice(0, 10)}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();
    } catch (error) {
      console.error('导出数据失败:', error);
      handleError('导出数据失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 处理导入对话框
  const handleOpenImport = () => {
    setImportFile(null);
    setImportError(null);
    setOpenImport(true);
    handleMenuClose();
  };

  const handleCloseImport = () => {
    setOpenImport(false);
  };

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile) {
        setImportFile(selectedFile);
        setImportError(null);
      }
    }
  };

  // 处理导入数据
  const handleImportData = async () => {
    if (!importFile) {
      handleError('请选择要导入的文件');
      return;
    }

    try {
      setImportLoading(true);
      setImportError(null);

      const fileReader = new FileReader();
      fileReader.readAsText(importFile, 'UTF-8');

      fileReader.onload = async (e) => {
        try {
          if (!e.target?.result) {
            throw new Error('读取文件失败');
          }

          const importData = JSON.parse(e.target.result as string);

          // 验证导入数据格式
          if (!importData.groups || !Array.isArray(importData.groups)) {
            throw new Error('导入文件格式错误：缺少分组数据');
          }

          if (!importData.sites || !Array.isArray(importData.sites)) {
            throw new Error('导入文件格式错误：缺少站点数据');
          }

          if (!importData.configs || typeof importData.configs !== 'object') {
            throw new Error('导入文件格式错误：缺少配置数据');
          }

          // 调用API导入数据
          const result = await api.importData(importData);

          if (!result.success) {
            throw new Error(result.error || '导入失败');
          }

          // 显示导入结果统计
          const stats = result.stats;
          if (stats) {
            const summary = [
              `导入成功！`,
              `分组：发现${stats.groups.total}个，新建${stats.groups.created}个，合并${stats.groups.merged}个`,
              `卡片：发现${stats.sites.total}个，新建${stats.sites.created}个，更新${stats.sites.updated}个，跳过${stats.sites.skipped}个`,
            ].join('\n');

            setImportResultMessage(summary);
            setImportResultOpen(true);
          }

          // 刷新数据
          await fetchData();
          await fetchConfigs();
          handleCloseImport();
        } catch (error) {
          console.error('解析导入数据失败:', error);
          handleError('解析导入数据失败: ' + (error instanceof Error ? error.message : '未知错误'));
        } finally {
          setImportLoading(false);
        }
      };

      fileReader.onerror = () => {
        handleError('读取文件失败');
        setImportLoading(false);
      };
    } catch (error) {
      console.error('导入数据失败:', error);
      handleError('导入数据失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setImportLoading(false);
    }
  };

  // 渲染登录页面
  // 更新分组
  const handleGroupUpdate = useCallback(
    async (updatedGroup: Group) => {
      try {
        if (updatedGroup.id) {
          await api.updateGroup(updatedGroup.id, updatedGroup);
          await fetchData(); // 重新加载数据
        }
      } catch (error) {
        console.error('更新分组失败:', error);
        handleError('更新分组失败: ' + (error as Error).message);
      }
    },
    [fetchData, handleError]
  );

  // 删除分组
  const handleGroupDelete = useCallback(
    async (groupId: number) => {
      try {
        await api.deleteGroup(groupId);
        await fetchData(); // 重新加载数据
      } catch (error) {
        console.error('删除分组失败:', error);
        handleError('删除分组失败: ' + (error as Error).message);
      }
    },
    [fetchData, handleError]
  );

  const renderLoginForm = () => {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Suspense fallback={<CircularProgress />}>
          <LoginForm onLogin={handleLogin} loading={loginLoading} error={loginError} />
        </Suspense>
      </Box>
    );
  };

  // 如果正在检查认证状态，显示加载界面
  if (isAuthChecking) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
          }}
        >
          <CircularProgress size={60} thickness={4} />
        </Box>
      </ThemeProvider>
    );
  }

  // 如果需要认证但未认证，显示登录界面
  if (isAuthRequired && !isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {renderLoginForm()}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Suspense fallback={<CircularProgress />}>
        <CssBaseline />

        {/* 错误提示 Snackbar */}
        {(snackbarOpen || importResultOpen) && (
          <Suspense fallback={null}>
            <PageFeedback
              snackbarOpen={snackbarOpen}
              handleCloseSnackbar={handleCloseSnackbar}
              snackbarMessage={snackbarMessage}
              importResultOpen={importResultOpen}
              setImportResultOpen={setImportResultOpen}
              importResultMessage={importResultMessage}
            />
          </Suspense>
        )}

        {/* 导入结果提示 Snackbar */}

        <Box
          sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
            color: 'text.primary',
            transition: 'all 0.3s ease-in-out',
            position: 'relative', // 添加相对定位，作为背景图片的容器
            overflow: 'hidden', // 防止背景图片溢出
          }}
        >
          {/* 背景图片 */}
          {configs['site.backgroundImage'] && isSecureUrl(configs['site.backgroundImage']) && (
            <>
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: `url(${configs['site.backgroundImage']})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  zIndex: 0,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(0, 0, 0, ' + (1 - Number(configs['site.backgroundOpacity'])) + ')'
                        : 'rgba(255, 255, 255, ' +
                          (1 - Number(configs['site.backgroundOpacity'])) +
                          ')',
                    zIndex: 1,
                  },
                }}
              />
            </>
          )}

          <Container
            maxWidth='lg'
            sx={{
              py: 4,
              px: { xs: 2, sm: 3, md: 4 },
              position: 'relative', // 使内容位于背景图片和蒙版之上
              zIndex: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 5,
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 2, sm: 0 },
              }}
            >
              <Typography
                variant='h3'
                component='h1'
                fontWeight='bold'
                color='text.primary'
                sx={{
                  fontSize: { xs: '1.75rem', sm: '2.125rem', md: '3rem' },
                  textAlign: { xs: 'center', sm: 'left' },
                }}
              >
                {configs['site.name']}
              </Typography>
              <Stack
                direction={{ xs: 'row', sm: 'row' }}
                spacing={{ xs: 1, sm: 2 }}
                alignItems='center'
                width={{ xs: '100%', sm: 'auto' }}
                justifyContent={{ xs: 'center', sm: 'flex-end' }}
                flexWrap='wrap'
                sx={{ gap: { xs: 1, sm: 2 }, py: { xs: 1, sm: 0 } }}
              >
                {sortMode !== SortMode.None ? (
                  <>
                    {sortMode === SortMode.GroupSort && (
                      <Button
                        variant='contained'
                        color='primary'
                        startIcon={<SaveIcon />}
                        onClick={handleSaveGroupOrder}
                        size='small'
                        sx={{
                          minWidth: 'auto',
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        }}
                      >
                        保存分组顺序
                      </Button>
                    )}
                    <Button
                      variant='outlined'
                      color='inherit'
                      startIcon={<CancelIcon />}
                      onClick={cancelSort}
                      size='small'
                      sx={{
                        minWidth: 'auto',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      }}
                    >
                      取消编辑
                    </Button>
                  </>
                ) : (
                  <>
                    {viewMode === 'readonly' ? (
                      // 访客模式：显示登录按钮
                      <Button
                        variant='contained'
                        color='primary'
                        onClick={() => setIsAuthRequired(true)}
                        size='small'
                        sx={{
                          minWidth: 'auto',
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        }}
                      >
                        管理员登录
                      </Button>
                    ) : (
                      // 编辑模式：显示管理按钮
                      <>
                        <Button
                          variant='contained'
                          color='primary'
                          startIcon={<AddIcon />}
                          onClick={handleOpenAddGroup}
                          size='small'
                          sx={{
                            minWidth: 'auto',
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          }}
                        >
                          新增分组
                        </Button>

                        <Button
                          variant='outlined'
                          color='primary'
                          startIcon={<MenuIcon />}
                          onClick={handleMenuOpen}
                          aria-controls={openMenu ? 'navigation-menu' : undefined}
                          aria-haspopup='true'
                          aria-expanded={openMenu ? 'true' : undefined}
                          size='small'
                          sx={{
                            minWidth: 'auto',
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          }}
                        >
                          更多选项
                        </Button>
                        {openMenu && (
                          <Suspense fallback={null}>
                            <AdminMenu
                              menuAnchorEl={menuAnchorEl}
                              openMenu={openMenu}
                              handleMenuClose={handleMenuClose}
                              startGroupSort={startGroupSort}
                              handleOpenConfig={handleOpenConfig}
                              handleExportData={handleExportData}
                              handleOpenImport={handleOpenImport}
                              isAuthenticated={isAuthenticated}
                              handleLogout={handleLogout}
                            />
                          </Suspense>
                        )}
                      </>
                    )}
                  </>
                )}
                <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} />
              </Stack>
            </Box>

            {/* 搜索框 - 根据配置条件渲染 */}
            {(() => {
              // 检查搜索框是否启用
              const searchBoxEnabled = configs['site.searchBoxEnabled'] === 'true';
              if (!searchBoxEnabled) {
                return null;
              }

              // 如果是访客模式，检查访客是否可用搜索框
              if (viewMode === 'readonly') {
                const guestEnabled = configs['site.searchBoxGuestEnabled'] === 'true';
                if (!guestEnabled) {
                  return null;
                }
              }

              return (
                <Box sx={{ mb: 4 }}>
                  <SearchBox
                    groups={groups.map((g) => ({
                      id: g.id,
                      name: g.name,
                      order_num: g.order_num,
                      is_public: g.is_public,
                      created_at: g.created_at,
                      updated_at: g.updated_at,
                    }))}
                    sites={groups.flatMap((g) => g.sites || [])}
                    onInternalResultClick={(result: SearchResultItem) => {
                      // 可选：滚动到对应的元素
                      if (result.type === 'group') {
                        const groupElement = document.getElementById(`group-${result.id}`);
                        groupElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      } else if (result.type === 'site' && result.groupId) {
                        const groupElement = document.getElementById(`group-${result.groupId}`);
                        groupElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                  />
                </Box>
              );
            })()}

            {loading && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '200px',
                }}
              >
                <CircularProgress size={60} thickness={4} />
              </Box>
            )}

            {!loading && !error && (
              <Box
                sx={{
                  '& > *': { mb: 5 },
                  minHeight: '100px',
                }}
              >
                <GroupNavigation
                  groups={groups}
                  onNavigate={navigateToGroup}
                  desktopCollapsed={desktopSidebarCollapsed}
                  onDesktopCollapsedChange={changeSidebarPreference}
                  savingDesktopPreference={savingSidebarPreference}
                />
                {sortMode === SortMode.GroupSort ? (
                  <GroupSorting groups={groups} onReorder={setGroups} />
                ) : (
                  <Stack spacing={5}>
                    {groups.map((group) => (
                      <Box
                        key={`group-${group.id}`}
                        id={`group-${group.id}`}
                        sx={{ scrollMarginTop: 24 }}
                      >
                        <GroupCard
                          group={group}
                          sortMode={sortMode === SortMode.None ? 'None' : 'SiteSort'}
                          currentSortingGroupId={currentSortingGroupId}
                          viewMode={viewMode}
                          onUpdate={handleSiteUpdate}
                          onDelete={handleSiteDelete}
                          onSaveSiteOrder={handleSaveSiteOrder}
                          onStartSiteSort={startSiteSort}
                          onAddSite={handleOpenAddSite}
                          onUpdateGroup={handleGroupUpdate}
                          onDeleteGroup={handleGroupDelete}
                          configs={configs}
                          expandRequest={
                            navigationTarget.groupId === group.id ? navigationTarget.request : 0
                          }
                        />
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            )}

            {/* 新增分组对话框 */}
            {openAddGroup && (
              <Suspense fallback={null}>
                <AddGroupDialog
                  openAddGroup={openAddGroup}
                  handleCloseAddGroup={handleCloseAddGroup}
                  newGroup={newGroup}
                  handleGroupInputChange={handleGroupInputChange}
                  setNewGroup={setNewGroup}
                  handleCreateGroup={handleCreateGroup}
                />
              </Suspense>
            )}

            {/* 新增站点对话框 */}
            {openAddSite && (
              <Suspense fallback={null}>
                <AddSiteDialog
                  openAddSite={openAddSite}
                  handleCloseAddSite={handleCloseAddSite}
                  newSite={newSite}
                  handleSiteInputChange={handleSiteInputChange}
                  handleError={handleError}
                  configs={configs}
                  setNewSite={setNewSite}
                  handleCreateSite={handleCreateSite}
                />
              </Suspense>
            )}

            {/* 网站配置对话框 */}
            {openConfig && (
              <Suspense fallback={null}>
                <ConfigDialog
                  openConfig={openConfig}
                  handleCloseConfig={handleCloseConfig}
                  tempConfigs={tempConfigs}
                  handleConfigInputChange={handleConfigInputChange}
                  setTempConfigs={setTempConfigs}
                  handleSaveConfig={handleSaveConfig}
                />
              </Suspense>
            )}

            {/* 导入数据对话框 */}
            {openImport && (
              <Suspense fallback={null}>
                <ImportDialog
                  openImport={openImport}
                  handleCloseImport={handleCloseImport}
                  handleFileSelect={handleFileSelect}
                  importFile={importFile}
                  importError={importError}
                  importLoading={importLoading}
                  handleImportData={handleImportData}
                />
              </Suspense>
            )}
          </Container>
        </Box>
      </Suspense>
    </ThemeProvider>
  );
}

export default App;
