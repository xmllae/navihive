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
}));
vi.mock('../API/mock', () => ({
  MockNavigationClient: class {
    checkAuthStatus = api.checkAuthStatus;
    getGroupsWithSites = api.getGroupsWithSites;
    getConfigs = api.getConfigs;
    updateSiteOrder = api.updateSiteOrder;
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
});

describe('应用排序保存与导航', () => {
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
