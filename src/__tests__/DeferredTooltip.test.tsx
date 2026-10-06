import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import DeferredTooltip from '../components/DeferredTooltip';

it('首次悬停加载提示时保留按钮节点、点击和键盘焦点', async () => {
  const click = vi.fn();
  const user = userEvent.setup();
  render(
    <DeferredTooltip title='提示内容'>
      <button onClick={click}>操作</button>
    </DeferredTooltip>
  );
  const button = screen.getByRole('button', { name: '提示内容' });
  await user.hover(button);
  expect(await screen.findByRole('tooltip')).toHaveTextContent('提示内容');
  expect(screen.getByRole('button', { name: '提示内容' })).toBe(button);
  await user.click(button);
  expect(click).toHaveBeenCalledTimes(1);
  expect(button).toHaveFocus();
  await user.unhover(button);
  button.blur();
  await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
});
