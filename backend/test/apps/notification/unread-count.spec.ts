import { IsNull, Repository } from 'typeorm';
import { NotificationService } from '../../../apps/notification-service/src/notification.service';
import { NotificationEntity } from '../../../apps/notification-service/src/entities';
describe('Notification unread total',()=>{
 it('paginates only the authenticated user notifications, newest first',async()=>{
  const find=jest.fn().mockResolvedValue([]);
  const service=new NotificationService({find} as unknown as Repository<NotificationEntity>);
  await service.list('authenticated-user',100,100);
  expect(find).toHaveBeenCalledWith({where:{userId:'authenticated-user',archivedAt:IsNull()},order:{createdAt:'DESC',id:'DESC'},take:100,skip:100});
  await service.list('authenticated-user',1000,-5);
  expect(find.mock.calls[1][0]).toMatchObject({take:100,skip:0});
 });
 it('counts every unarchived unread item for the authenticated user, without a list limit',async()=>{
  const count=jest.fn().mockResolvedValue(125);
  const service=new NotificationService({count} as unknown as Repository<NotificationEntity>);
  expect(await service.unreadCount('authenticated-user')).toEqual({unreadCount:125});
  expect(count).toHaveBeenCalledWith({where:{userId:'authenticated-user',readAt:IsNull(),archivedAt:IsNull()}});
 });
});
