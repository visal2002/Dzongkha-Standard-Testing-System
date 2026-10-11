import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { useNotifications } from './useNotifications';
const api=vi.hoisted(()=>({getUserNotifications:vi.fn(),getUnreadCount:vi.fn(),markAsRead:vi.fn(),markAllAsRead:vi.fn()}));
vi.mock('./api',()=>({notificationService:api}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'current-user'}})}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
it('uses the server count rather than the limited preview and fetches older pages',async()=>{
 api.getUnreadCount.mockResolvedValue({data:{unreadCount:52}});
 api.getUserNotifications.mockImplementation((id,limit,offset=0)=>Promise.resolve({data:Array.from({length:offset===0?100:2},(_,i)=>({id:String(offset+i),title:'Notice',readAt:null}))}));
 const {result}=renderHook(()=>useNotifications(100));
 await waitFor(()=>expect(result.current.notifications).toHaveLength(100));
 expect(result.current.unreadCount).toBe(52);
 await act(()=>result.current.loadMore());
 expect(api.getUserNotifications).toHaveBeenLastCalledWith('current-user',100,100);
 expect(result.current.notifications).toHaveLength(102);
 expect(result.current.hasMore).toBe(false);
});
it('does not report a successful mark-all when the server fails',async()=>{
 api.getUnreadCount.mockResolvedValue({data:{unreadCount:52}});
 api.getUserNotifications.mockResolvedValue({data:[]});
 api.markAllAsRead.mockRejectedValue(new Error('offline'));
 const {result}=renderHook(()=>useNotifications(100));
 await waitFor(()=>expect(result.current.unreadCount).toBe(52));
 let saved;await act(async()=>{saved=await result.current.markAllAsRead();});
 expect(saved).toBe(false);expect(result.current.unreadCount).toBe(52);expect(result.current.error).toMatch(/Could not mark/);
});
