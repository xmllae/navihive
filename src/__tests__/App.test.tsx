import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentProps } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import App from '../App';

const api = vi.hoisted(() => ({
  checkAuthStatus: vi.fn(),
  getGroupsWithSites: vi.fn(),
  getConfigs: vi.fn(),
  updateSiteOrder: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));
vi.mock('../API/mock', () => ({
  MockNavigationClient: class {
    checkAuthStatus = api.checkAuthStatus;
    getGroupsWithSites = api.getGroupsWithSites;
    getConfigs = api.getConfigs;
    updateSiteOrder = api.updateSiteOrder;
    login = api.login;
    logout = api.logout;
    isLoggedIn = () => false;
  },
}));
let dragEnd: ComponentProps<typeof DndContext>['onDragEnd'];
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...original,
    DndContext: (props: ComponentProps<typeof DndContext>) => {
      dragEnd = props.onDragEnd;
      return <original.DndContext {...props} />;
    },
  };
});

const group = {
  id: 1,
  name: '个人网站',
  order_num: 0,
  sites: [1, 2, 3].map((id) => ({
    id,
    name: `网站 ${id}`,
    group_id: 1,
    url: 'https://example.com',
    icon: '',
    description: '',
    notes: '',
    order_num: id - 1,
  })),
};

beforeEach(() => {
  api.checkAuthStatus.mockResolvedValue(true);
  api.getGroupsWithSites.mockResolvedValue([group]);
  api.getConfigs.mockResolvedValue({ 'site.searchBoxEnabled': 'false' });
  api.updateSiteOrder.mockReset();
  api.login.mockResolvedValue({ success: true });
  api.logout.mockResolvedValue(undefined);
});

describe('应用排序保存与导航', () => {
  it('初始化后重新渲染不重复认证或数据加载', async () => {
    const { rerender } = render(<App />);
    await screen.findByRole('button', { name: '排序' });
    expect(api.checkAuthStatus).toHaveBeenCalledTimes(1);
    expect(api.getGroupsWithSites).toHaveBeenCalledTimes(1);
    expect(api.getConfigs).toHaveBeenCalledTimes(1);
    rerender(<App />);
    await act(async () => {});
    expect(api.checkAuthStatus).toHaveBeenCalledTimes(1);
    expect(api.getGroupsWithSites).toHaveBeenCalledTimes(1);
    expect(api.getConfigs).toHaveBeenCalledTimes(1);
  });

  it('访客登录、登出后重新加载数据，重新挂载重新检查认证', async () => {
    api.checkAuthStatus.mockResolvedValue(false);
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(await screen.findByRole('button', { name: '管理员登录' }));
    await user.type(screen.getByLabelText('用户名', { exact: false }), 'test-admin');
    await user.type(screen.getByLabelText('密码', { exact: false }), 'test-password');
    await user.click(screen.getByRole('button', { name: '登录' }));
    await screen.findByRole('button', { name: '排序' });
    expect(api.login).toHaveBeenCalledWith('test-admin', 'test-password', false);
    expect(api.getGroupsWithSites).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('button', { name: '更多选项' }));
    await user.click(screen.getByRole('menuitem', { name: '退出登录' }));
    await screen.findByRole('button', { name: '管理员登录' });
    expect(api.logout).toHaveBeenCalledTimes(1);
    expect(api.getGroupsWithSites).toHaveBeenCalledTimes(3);
    expect(api.getConfigs).toHaveBeenCalledTimes(3);
    expect(api.checkAuthStatus).toHaveBeenCalledTimes(1);
    unmount();
    render(<App />);
    await screen.findByRole('button', { name: '管理员登录' });
    expect(api.checkAuthStatus).toHaveBeenCalledTimes(2);
    expect(api.getGroupsWithSites).toHaveBeenCalledTimes(4);
  });

  it('保存及刷新失败均保留草稿，重试成功后退出排序', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(await screen.findByRole('button', { name: '排序' }));
    act(() => dragEnd?.({ active: { id: 'site-1' }, over: { id: 'site-3' } } as DragEndEvent));
    const order = () =>
      [...container.querySelectorAll('[data-site-id]')].map((e) => e.getAttribute('data-site-id'));
    api.updateSiteOrder.mockRejectedValueOnce(new Error('模拟保存失败'));
    await user.click(screen.getByRole('button', { name: '保存顺序' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '保存顺序' })).toBeEnabled());
    expect(order()).toEqual(['2', '3', '1']);
    api.updateSiteOrder.mockResolvedValue(true);
    api.getGroupsWithSites.mockRejectedValueOnce(new Error('模拟刷新失败'));
    await user.click(screen.getByRole('button', { name: '保存顺序' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '保存顺序' })).toBeEnabled());
    expect(order()).toEqual(['2', '3', '1']);
    api.getGroupsWithSites.mockResolvedValue([
      { ...group, sites: [group.sites[1], group.sites[2], group.sites[0]] },
    ]);
    await user.click(screen.getByRole('button', { name: '保存顺序' }));
    await screen.findByRole('button', { name: '排序' });
    expect(order()).toEqual(['2', '3', '1']);
    expect(api.updateSiteOrder).toHaveBeenLastCalledWith([
      { id: 2, order_num: 0 },
      { id: 3, order_num: 1 },
      { id: 1, order_num: 2 },
    ]);
  });

  it('访客导航仅显示 API 返回的分组，可展开并跳转折叠分组', async () => {
    api.checkAuthStatus.mockResolvedValue(false);
    localStorage.setItem('group-1-collapsed', 'true');
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: '打开分组导航' }));
    await user.click(screen.getByRole('button', { name: '个人网站 3' }));
    await waitFor(() => expect(screen.getByText('网站 1')).toBeVisible());
    await waitFor(() => expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: '排序' })).not.toBeInTheDocument();
  });
});
