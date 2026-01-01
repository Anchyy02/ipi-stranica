import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { Firestore, collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, getDocs, Timestamp } from '@angular/fire/firestore';
import { AuthService } from './auth.service';

export interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

export interface Reminder {
  id?: string;
  userId: string;
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
  private notificationsUnsubscribe: any;
  private remindersUnsubscribe: any;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private firestore: Firestore,
    private authService: AuthService
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.requestNotificationPermission();
      this.startReminderChecker();

      // Listen to auth state and load user's data
      this.authService.currentUser.subscribe(user => {
        if (user) {
          this.loadUserNotifications(user.id);
          this.loadUserReminders(user.id);
        } else {
          // Unsubscribe from previous listeners
          if (this.notificationsUnsubscribe) this.notificationsUnsubscribe();
          if (this.remindersUnsubscribe) this.remindersUnsubscribe();
          
          this.notifications.next([]);
          this.reminders.next([]);
        }
      });
    }
  }

  private loadUserNotifications(userId: string) {
    const q = query(
      collection(this.firestore, 'notifications'),
      where('userId', '==', userId)
    );

    this.notificationsUnsubscribe = onSnapshot(q, (snapshot) => {
      const notifications: Notification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          userId: data['userId'],
          title: data['title'],
          message: data['message'],
          type: data['type'],
          timestamp: (data['timestamp'] as Timestamp).toDate(),
          read: data['read']
        });
      });
      
      // Sort by timestamp descending
      notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      this.notifications.next(notifications);
    });
  }

  private loadUserReminders(userId: string) {
    const q = query(
      collection(this.firestore, 'reminders'),
      where('userId', '==', userId)
    );

    this.remindersUnsubscribe = onSnapshot(q, (snapshot) => {
      const reminders: Reminder[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        reminders.push({
          id: doc.id,
          userId: data['userId'],
          title: data['title'],
          message: data['message'],
          time: (data['time'] as Timestamp).toDate(),
          recurring: data['recurring'],
          enabled: data['enabled']
        });
      });
      this.reminders.next(reminders);
    });
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  async addNotification(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const user = this.authService.currentUserValue;
    if (!user) return;

    const notification: Omit<Notification, 'id'> = {
      userId: user.id,
      title,
      message,
      type,
      timestamp: new Date(),
      read: false
    };

    await addDoc(collection(this.firestore, 'notifications'), {
      ...notification,
      timestamp: Timestamp.fromDate(notification.timestamp)
    });

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/slike/logo-ipi.png'
      });
    }
  }

  async markAsRead(id: string) {
    if (!id) return;
    await updateDoc(doc(this.firestore, 'notifications', id), {
      read: true
    });
  }

  async markAllAsRead() {
    const user = this.authService.currentUserValue;
    if (!user) return;

    const q = query(
      collection(this.firestore, 'notifications'),
      where('userId', '==', user.id),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const promises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { read: true })
    );
    await Promise.all(promises);
  }

  async deleteNotification(id: string) {
    if (!id) return;
    await deleteDoc(doc(this.firestore, 'notifications', id));
  }

  async clearAllNotifications() {
    const user = this.authService.currentUserValue;
    if (!user) return;

    const q = query(
      collection(this.firestore, 'notifications'),
      where('userId', '==', user.id)
    );

    const snapshot = await getDocs(q);
    const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(promises);
  }

  getUnreadCount(): number {
    return this.notifications.value.filter(n => !n.read).length;
  }

  // Reminders
  async addReminder(title: string, message: string, time: Date, recurring?: 'daily' | 'weekly' | 'monthly') {
    const user = this.authService.currentUserValue;
    if (!user) return;

    const reminder: Omit<Reminder, 'id'> = {
      userId: user.id,
      title,
      message,
      time,
      recurring,
      enabled: true
    };

    await addDoc(collection(this.firestore, 'reminders'), {
      ...reminder,
      time: Timestamp.fromDate(reminder.time)
    });
  }

  async updateReminder(id: string, updates: Partial<Reminder>) {
    if (!id) return;
    
    const updateData: any = { ...updates };
    if (updates.time) {
      updateData.time = Timestamp.fromDate(updates.time);
    }
    
    await updateDoc(doc(this.firestore, 'reminders', id), updateData);
  }

  async deleteReminder(id: string) {
    if (!id) return;
    await deleteDoc(doc(this.firestore, 'reminders', id));
  }

  async toggleReminder(id: string) {
    const reminder = this.reminders.value.find(r => r.id === id);
    if (reminder && reminder.id) {
      await this.updateReminder(reminder.id, { enabled: !reminder.enabled });
    }
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
      if (!reminder.enabled || !reminder.id) return;

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
    if (this.notificationsUnsubscribe) {
      this.notificationsUnsubscribe();
    }
    if (this.remindersUnsubscribe) {
      this.remindersUnsubscribe();
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
