import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Notification, type NotificationPayload } from './notification';
import { NotificationManager } from './notification.manager';

describe('Notification', () => {
  let fixture: ComponentFixture<Notification>;

  const render = async (payload: Partial<NotificationPayload> = {}) => {
    fixture.componentRef.setInput('payload', {
      id: 'n1',
      variant: 'success',
      title: 'Đăng nhập thành công',
      message: 'Chào mừng trở lại!',
      duration: 5000,
      ...payload,
    } satisfies NotificationPayload);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Notification] }).compileComponents();
    fixture = TestBed.createComponent(Notification);
  });

  it('renders title, message and a time bar in the variant colour', async () => {
    const el = await render();
    expect(el.textContent).toContain('Đăng nhập thành công');
    expect(el.textContent).toContain('Chào mừng trở lại!');
    expect(el.querySelector('.animate-notification-shrink')?.className).toContain('bg-success');
  });

  it('uses role=alert for errors and shows the action only for functional', async () => {
    let el = await render({ variant: 'error', actionLabel: 'Thử lại' });
    expect(el.querySelector('[role="alert"]')).toBeTruthy();
    expect(el.textContent).not.toContain('Thử lại');

    el = await render({ variant: 'functional', actionLabel: 'Đăng nhập' });
    expect(el.textContent).toContain('Đăng nhập');
  });

  it('emits dismissed with its id', async () => {
    const el = await render();
    let dismissed = '';
    fixture.componentInstance.dismissed.subscribe((id) => (dismissed = id));
    el.querySelector<HTMLButtonElement>('button[aria-label="Đóng thông báo"]')!.click();
    expect(dismissed).toBe('n1');
  });
});

describe('NotificationManager', () => {
  it('keeps at most three notifications, dropping the oldest', () => {
    const m = TestBed.inject(NotificationManager);
    for (let i = 0; i < 4; i++) m.show({ variant: 'information', title: `t${i}`, message: '' });
    expect(m.notifications().map((n) => n.title)).toEqual(['t1', 't2', 't3']);
  });
});
