import { Injectable, signal } from '@angular/core';
import { NotificationPayload } from './notification'; // Updated import

export interface AppNotification extends NotificationPayload {
  onAction?: () => void;
}

@Injectable({ providedIn: 'root' })
export class NotificationManager {
  readonly notifications = signal<AppNotification[]>([]);
  private timeouts=new Map<string, any>();

  show(notification: Omit<AppNotification, 'id'>) {
    const id = crypto.randomUUID();
    const duration=notification.duration || 5000; // 5 seconds
    const newNotif={...notification, id, duration};

    this.notifications.update(current => {
      if(current.length>=3){
        const dropped=current.slice(0, current.length-2);
        dropped.forEach(d => this.clearTimer(d.id))
      }
      const queue=current.length >=3 ? current.slice(current.length - 2) : current;
      return [...queue, newNotif]
    });

    if (duration > 0) {
      const timer = setTimeout(() => this.remove(id), duration);
      this.timeouts.set(id, timer);
    }
  }


  triggerAction(id: string) {
    const notification = this.notifications().find(n => n.id === id);
    if (notification?.onAction) {
      notification.onAction();
    }
    this.remove(id);
  }

  remove(id: string) {
    this.clearTimer(id); // Clear timer if user manually dismisses it early
    this.notifications.update(current => current.filter(n => n.id !== id));
  }

  private clearTimer(id: string) {
    if(this.timeouts.has(id)) {
      clearTimeout(this.timeouts.get(id));
      this.timeouts.delete(id);
    }
  }
}
