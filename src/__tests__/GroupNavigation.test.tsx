import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GroupNavigation from '../components/GroupNavigation';

const groups = [
  { id: 1, name: '个人网站', order_num: 0, sites: [] },
  { id: 2, name: '工具', order_num: 1, sites: [] },
];

describe('分组导航', () => {
  it('移动端抽屉开关不覆盖已保存的桌面状态', async () => {
    const change = vi.fn();
    const user = userEvent.setup();
    render(
      <GroupNavigation
        groups={groups}
        onNavigate={vi.fn()}
        desktopCollapsed
        onDesktopCollapsedChange={change}
      />
    );
    await user.click(screen.getByRole('button', { name: '打开分组导航' }));
    await user.click(screen.getByRole('button', { name: '关闭分组导航' }));
    await waitFor(() => expect(screen.queryByRole('navigation')).not.toBeInTheDocument());
    expect(change).not.toHaveBeenCalled();
  });

  it('宽屏导航默认展开，可以收起和重新展开，跳转后保持展开', async () => {
    const matchMedia = window.matchMedia;
    const mediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      ...matchMedia(query),
      matches: query === '(min-width:1680px)',
    }));
    try {
      const user = userEvent.setup();
      const navigate = vi.fn();
      render(<GroupNavigation groups={groups} onNavigate={navigate} />);
      expect(screen.getByRole('navigation', { name: '分组导航' })).toBeVisible();
      await user.click(screen.getByRole('button', { name: '收起分组导航' }));
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: '展开分组导航' }));
      await user.click(screen.getByRole('button', { name: '工具 0' }));
      expect(navigate).toHaveBeenCalledWith(2);
      expect(screen.getByRole('navigation', { name: '分组导航' })).toBeVisible();
    } finally {
      mediaSpy.mockRestore();
    }
  });

  it('抽屉显示可见分组并跳转，点击后关闭', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    render(<GroupNavigation groups={groups} onNavigate={navigate} />);
    await user.click(screen.getByRole('button', { name: '打开分组导航' }));
    expect(screen.getByRole('navigation', { name: '分组导航' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '工具 0' }));
    expect(navigate).toHaveBeenCalledWith(2);
    await waitFor(() => expect(screen.queryByRole('navigation')).not.toBeInTheDocument());
  });

  it('Esc 关闭，分组变更后不残留旧项', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<GroupNavigation groups={groups} onNavigate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: '打开分组导航' }));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('navigation')).not.toBeInTheDocument());
    rerender(<GroupNavigation groups={[groups[1]!]} onNavigate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: '打开分组导航' }));
    expect(screen.queryByText('个人网站')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '工具 0' })).toBeVisible();
  });

  it('页面滚动后高亮当前分组', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <>
        <section id='group-1' />
        <section id='group-2' />
        <GroupNavigation groups={groups} onNavigate={vi.fn()} />
      </>
    );
    const second = container.querySelector('#group-2')!;
    vi.spyOn(second, 'getBoundingClientRect').mockReturnValue({ top: 500 } as DOMRect);
    await user.click(screen.getByRole('button', { name: '打开分组导航' }));
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '个人网站 0' })).toHaveAttribute(
        'aria-current',
        'location'
      )
    );
    vi.spyOn(second, 'getBoundingClientRect').mockReturnValue({ top: 24 } as DOMRect);
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '工具 0' })).toHaveAttribute(
        'aria-current',
        'location'
      )
    );
  });
});
