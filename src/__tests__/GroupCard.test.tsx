import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ComponentProps } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import GroupCard from '../components/GroupCard';
import { GroupWithSites } from '../types';
import { Site } from '../API/http';

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

const group: GroupWithSites = {
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

const props: ComponentProps<typeof GroupCard> = {
  group,
  sortMode: 'None',
  currentSortingGroupId: null,
  onUpdate: vi.fn(),
  onDelete: vi.fn(),
  onStartSiteSort: vi.fn(),
  onSaveSiteOrder: vi.fn(),
};

function moveFirstToLast() {
  act(() => {
    dragEnd?.({ active: { id: 'site-1' }, over: { id: 'site-3' } } as DragEndEvent);
  });
}

describe('分组卡片排序', () => {
  it('排序其他分组时仍显示本站点', () => {
    render(<GroupCard {...props} sortMode='SiteSort' currentSortingGroupId={2} />);
    expect(screen.getByText('网站 1')).toBeVisible();
    expect(screen.getByText('网站 3')).toBeVisible();
  });

  it('保存草稿顺序，取消后重新开始恢复服务器顺序', async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    const { rerender, container } = render(<GroupCard {...props} onSaveSiteOrder={save} />);
    await user.click(screen.getByRole('button', { name: '排序' }));
    rerender(
      <GroupCard {...props} onSaveSiteOrder={save} sortMode='SiteSort' currentSortingGroupId={1} />
    );
    moveFirstToLast();
    expect(
      [...container.querySelectorAll('[data-site-id]')].map((e) => e.getAttribute('data-site-id'))
    ).toEqual(['2', '3', '1']);
    await user.click(screen.getByRole('button', { name: '保存顺序' }));
    expect(save.mock.calls[0]?.[1].map((site: { id: number }) => site.id)).toEqual([2, 3, 1]);
    rerender(<GroupCard {...props} />);
    await user.click(screen.getByRole('button', { name: '排序' }));
    rerender(<GroupCard {...props} sortMode='SiteSort' currentSortingGroupId={1} />);
    expect(
      [...container.querySelectorAll('[data-site-id]')].map((e) => e.getAttribute('data-site-id'))
    ).toEqual(['1', '2', '3']);
  });

  it('重新排序使用最新卡片，折叠分组可由导航重复展开', async () => {
    localStorage.setItem('group-1-collapsed', 'true');
    const user = userEvent.setup();
    const { rerender } = render(<GroupCard {...props} />);
    rerender(<GroupCard {...props} expandRequest={1} />);
    expect(screen.getByText('网站 1')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '折叠分组 个人网站' }));
    rerender(<GroupCard {...props} expandRequest={2} />);
    expect(screen.getByText('网站 1')).toBeVisible();
    const updated = {
      ...group,
      sites: [...group.sites, { ...group.sites[0]!, id: 4, name: '新卡片' }],
    };
    rerender(<GroupCard {...props} group={updated} />);
    await user.click(screen.getByRole('button', { name: '排序' }));
    rerender(
      <GroupCard {...props} group={updated} sortMode='SiteSort' currentSortingGroupId={1} />
    );
    expect(screen.getByRole('button', { name: '拖动 新卡片' })).toBeVisible();
  });

  it('保存中防止重复提交，失败后保留草稿供重试', async () => {
    const user = userEvent.setup();
    let finishSave: (() => void) | undefined;
    const save = vi.fn<(groupId: number, sites: Site[]) => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          finishSave = resolve;
        })
    );
    render(
      <GroupCard {...props} sortMode='SiteSort' currentSortingGroupId={1} onSaveSiteOrder={save} />
    );
    moveFirstToLast();
    await user.click(screen.getByRole('button', { name: '保存顺序' }));
    expect(screen.getByRole('button', { name: '保存顺序' })).toBeDisabled();
    await act(async () => finishSave?.());
    expect(screen.getByRole('button', { name: '保存顺序' })).toBeEnabled();
    const card = screen.getByRole('button', { name: '拖动 网站 1' }).closest('[data-site-id]');
    expect(within(card as HTMLElement).getByText('网站 1')).toBeVisible();
    expect(save.mock.calls[0]?.[1].map((site: Site) => site.id)).toEqual([2, 3, 1]);
  });
});
