import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SiteCard from '../components/SiteCard';

vi.mock('../components/SiteSettingsModal', () => ({
  default: () => <div role='dialog' aria-label='网站设置对话框' />,
}));

const site = {
  id: 1,
  group_id: 1,
  name: '测试网站',
  url: 'https://example.com',
  icon: '',
  description: '说明',
  notes: '',
  order_num: 0,
};
const props = { site, onUpdate: vi.fn(), onDelete: vi.fn() };
afterEach(() => vi.restoreAllMocks());

describe('卡片固定点击区域', () => {
  it('图标懒加载和异步解码，加载失败恢复首字母占位', () => {
    render(<SiteCard {...props} site={{ ...site, icon: 'https://example.com/icon.png' }} />);
    const icon = screen.getByAltText(site.name);
    expect(icon).toHaveAttribute('loading', 'lazy');
    expect(icon).toHaveAttribute('decoding', 'async');
    fireEvent.error(icon);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('测')).toBeVisible();
  });
  it('外层底部区域及卡片内容点击均仅打开网站一次', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const user = userEvent.setup();
    const { container } = render(<SiteCard {...props} viewMode='readonly' />);
    await user.click(container.querySelector('.site-card-hover-root')!);
    expect(open).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: /测试网站/ }));
    expect(open).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenLastCalledWith(site.url, '_blank');
  });

  it('键盘 Enter 和空格均打开一次，设置按钮不会打开网站', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const user = userEvent.setup();
    render(<SiteCard {...props} />);
    screen.getByRole('button', { name: /测试网站/ }).focus();
    await user.keyboard('{Enter}');
    expect(open).toHaveBeenCalledTimes(1);
    await user.keyboard(' ');
    expect(open).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('button', { name: '网站设置' }));
    expect(await screen.findByRole('dialog', { name: '网站设置对话框' })).toBeVisible();
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('排序模式点击外层不会打开网站', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const user = userEvent.setup();
    const { container } = render(<SiteCard {...props} isEditMode />);
    await user.click(container.querySelector('.site-card-hover-root')!);
    expect(open).not.toHaveBeenCalled();
  });
});
