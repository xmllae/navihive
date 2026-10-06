import { useCallback, useState, type MutableRefObject } from 'react';
import type { BootstrapData } from '../API/http';

export function useBootstrap(
  api: { getBootstrap: () => Promise<BootstrapData> },
  onLoaded: (data: BootstrapData) => void,
  onError: (message: string) => void,
  session: MutableRefObject<number>
) {
  const [checking, setChecking] = useState(true);
  const load = useCallback(async () => {
    const current = ++session.current;
    setChecking(true);
    try {
      const data = await api.getBootstrap();
      if (session.current === current) onLoaded(data);
    } catch (error) {
      if (session.current === current) {
        onError('加载数据失败: ' + (error instanceof Error ? error.message : '未知错误'));
      }
    } finally {
      if (session.current === current) setChecking(false);
    }
  }, [api, onLoaded, onError, session]);
  return { checking, load };
}
