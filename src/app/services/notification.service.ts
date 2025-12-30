import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

export interface Reminder {
  id: string;
  title: string;
  message: string;
  time: Date;
  recurring?: 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notifications.asObservable();

  private reminders = new BehaviorSubject<Reminder[]>([]);
  public reminders$ = this.reminders.asObservable();

  private checkInterval: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.loadFromStorage();
      this.requestNotificationPermission();
      this.startReminderChecker();
    }
  }

  private loadFromStorage() {
    const storedNotifications = localStorage.getItem('notifications');
    const storedReminders = localStorage.getItem('reminders');

    if (storedNotifications) {
      const notifications = JSON.parse(storedNotifications);
      this.notifications.next(notifications.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      })));
    }

    if (storedReminders) {
      const reminders = JSON.parse(storedReminders);
      this.reminders.next(reminders.map((r: any) => ({
        ...r,
        time: new Date(r.time)
      })));
    }
  }

  private saveToStorage() {
    localStorage.setItem('notifications', JSON.stringify(this.notifications.value));
    localStorage.setItem('reminders', JSON.stringify(this.reminders.value));
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  addNotification(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const notification: Notification = {
      id: Date.now().toString(),
      title,
      message,
      type,
      timestamp: new Date(),
      read: false
    };

    const current = this.notifications.value;
    this.notifications.next([notification, ...current]);
    this.saveToStorage();

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/slike/logo-ipi.png'
      });
    }
  }

  markAsRead(id: string) {
    const notifications = this.notifications.value.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    this.notifications.next(notifications);
    this.saveToStorage();
  }

  markAllAsRead() {
    const notifications = this.notifications.value.map(n => ({ ...n, read: true }));
    this.notifications.next(notifications);
    this.saveToStorage();
  }

  deleteNotification(id: string) {
    const notifications = this.notifications.value.filter(n => n.id !== id);
    this.notifications.next(notifications);
    this.saveToStorage();
  }

  clearAllNotifications() {
    this.notifications.next([]);
    this.saveToStorage();
  }

  getUnreadCount(): number {
    return this.notifications.value.filter(n => !n.read).length;
  }

  // Reminders
  addReminder(title: string, message: string, time: Date, recurring?: 'daily' | 'weekly' | 'monthly') {
    const reminder: Reminder = {
      id: Date.now().toString(),
      title,
      message,
      time,
      recurring,
      enabled: true
    };

    const current = this.reminders.value;
    this.reminders.next([...current, reminder]);
    this.saveToStorage();
  }

  updateReminder(id: string, updates: Partial<Reminder>) {
    const reminders = this.reminders.value.map(r =>
      r.id === id ? { ...r, ...updates } : r
    );
    this.reminders.next(reminders);
    this.saveToStorage();
  }

  deleteReminder(id: string) {
    const reminders = this.reminders.value.filter(r => r.id !== id);
    this.reminders.next(reminders);
    this.saveToStorage();
  }

  toggleReminder(id: string) {
    const reminders = this.reminders.value.map(r =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    this.reminders.next(reminders);
    this.saveToStorage();
  }

  private startReminderChecker() {
    // Check every minute
    this.checkInterval = setInterval(() => {
      this.checkReminders();
    }, 60000);

    // Check immediately
    this.checkReminders();
  }

  private checkReminders() {
    const now = new Date();
    const reminders = this.reminders.value;

    reminders.forEach(reminder => {
      if (!reminder.enabled) return;

      const reminderTime = new Date(reminder.time);
      const diffMinutes = Math.abs((now.getTime() - reminderTime.getTime()) / 60000);

      // Trigger if within 1 minute
      if (diffMinutes < 1) {
        this.addNotification(
          reminder.title,
          reminder.message,
          'info'
        );

        // Handle recurring reminders
        if (reminder.recurring) {
          const newTime = new Date(reminderTime);
          switch (reminder.recurring) {
            case 'daily':
              newTime.setDate(newTime.getDate() + 1);
              break;
            case 'weekly':
              newTime.setDate(newTime.getDate() + 7);
              break;
            case 'monthly':
              newTime.setMonth(newTime.getMonth() + 1);
              break;
          }
          this.updateReminder(reminder.id, { time: newTime });
        } else {
          // Disable one-time reminders after triggering
          this.updateReminder(reminder.id, { enabled: false });
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  // Predefined reminders for productivity
  setupProductivityReminders() {
    // Water reminder every 2 hours
    const waterTime = new Date();
    waterTime.setHours(waterTime.getHours() + 2);
    this.addReminder(
      '💧 Vrijeme za vodu',
      'Ne zaboravite popiti čašu vode!',
      waterTime,
      'daily'
    );

    // Study break reminder
    const breakTime = new Date();
    breakTime.setHours(breakTime.getHours() + 1);
    this.addReminder(
      '☕ Pauza za odmor',
      'Vrijeme je za kratku pauzu. Odmaknite se od računara!',
      breakTime,
      'daily'
    );

    // Evening reflection
    const reflectionTime = new Date();
    reflectionTime.setHours(20, 0, 0, 0);
    this.addReminder(
      '📝 Večernja refleksija',
      'Pregledajte današnje postignuće i planirajte sutra.',
      reflectionTime,
      'daily'
    );
  }
}
