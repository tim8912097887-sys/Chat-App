import { vi } from 'vitest';
import { chatGroupModel } from '../common/query.js';

export function setupConcurrentFindByIdBarrier(): void {
  let calls = 0;
  let releaseBarrier!: () => void;
  const barrier = new Promise<void>((resolve) => {
    releaseBarrier = resolve;
  });

  const origFindById = chatGroupModel.findById.bind(chatGroupModel);

  const spy = vi.spyOn(chatGroupModel, 'findById').mockImplementation(((id: string) => {
    const query = origFindById(id);
    const origLean = query.lean.bind(query);
    query.lean = (() => {
      const leanQuery = origLean();
      const origExec = leanQuery.exec.bind(leanQuery);
      leanQuery.exec = async () => {
        const result = await origExec();
        calls += 1;
        if (calls === 1) {
          await barrier;
        } else if (calls === 2) {
          releaseBarrier();
          spy.mockRestore();
        }
        return result;
      };
      return leanQuery;
    }) as typeof query.lean;
    return query;
  }) as typeof chatGroupModel.findById);
}

export function interceptFirstFindByIdWithMutation(onAfterRead: () => Promise<void>): void {
  const origFindById = chatGroupModel.findById.bind(chatGroupModel);

  const spy = vi.spyOn(chatGroupModel, 'findById').mockImplementationOnce(((id: string) => {
    const query = origFindById(id);
    const origLean = query.lean.bind(query);
    query.lean = (() => {
      const leanQuery = origLean();
      const origExec = leanQuery.exec.bind(leanQuery);
      leanQuery.exec = async () => {
        const result = await origExec();
        spy.mockRestore();
        await onAfterRead();
        return result;
      };
      return leanQuery;
    }) as typeof query.lean;
    return query;
  }) as typeof chatGroupModel.findById);
}
