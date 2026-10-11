import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import Header from './Header';
const state=vi.hoisted(()=>({unreadCount:125,notifications:[]}));
vi.mock('@/features/notifications/useNotifications',()=>({useNotifications:()=>state}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{role:'admin',name:'QA User'}})}));
vi.mock('@/contexts/ThemeContext',()=>({useTheme:()=>({theme:'dark',toggleTheme:vi.fn()})}));
vi.mock('@/components/LanguageToggle',()=>({default:()=>null}));
vi.mock('react-i18next',()=>({useTranslation:()=>({t:(key,options)=>key==='header.new_badge'?`${options.count} new`:key})}));
afterEach(cleanup);
const header=()=> <MemoryRouter><Header isDesktop collapsed={false} setCollapsed={()=>{}} onOpenMobileSidebar={()=>{}}/></MemoryRouter>;
it('shows the exact unread total, including counts above 99',()=>{
 state.unreadCount=125;render(header());
 expect(screen.getByRole('button',{name:'header.open_notifications: 125 new'})).toHaveTextContent('125');
});
it('hides the badge at zero and updates when the unread total changes',()=>{
 state.unreadCount=2;const {rerender}=render(header());
 expect(screen.getByRole('button',{name:'header.open_notifications: 2 new'})).toHaveTextContent('2');
 state.unreadCount=0;rerender(header());
 expect(screen.getByRole('button',{name:'header.open_notifications'})).toHaveTextContent('');
});
it('uses the full count in the panel rather than its six-item preview',()=>{
 state.unreadCount=125;state.notifications=[];render(header());
 fireEvent.click(screen.getByRole('button',{name:'header.open_notifications: 125 new'}));
 expect(screen.getByText('125 new')).toBeInTheDocument();
});
it('opens the full notification page when View all is clicked',()=>{
 const Location=()=> <div data-testid="location">{useLocation().pathname}</div>;
 render(<MemoryRouter initialEntries={['/dashboard']}><Header isDesktop collapsed={false} setCollapsed={()=>{}} onOpenMobileSidebar={()=>{}}/><Location/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'header.open_notifications: 125 new'}));
 fireEvent.click(screen.getByRole('button',{name:'header.view_all_notifications'}));
 expect(screen.getByTestId('location')).toHaveTextContent('/notifications');
});
