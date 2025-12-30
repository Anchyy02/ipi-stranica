import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService, Notification, Reminder } from '../../services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.css']
})
export class NotificationsComponent implements OnInit {
  notifications: Notification[] = [];
  reminders: Reminder[] = [];
  unreadCount = 0;
  showNotificationPanel = false;
  activeTab: 'notifications' | 'reminders' = 'notifications';

  // New reminder form
  newReminder = {
    title: '',
    message: '',
    date: '',
    time: '',
    recurring: '' as '' | 'daily' | 'weekly' | 'monthly'
  };

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    public notificationService: NotificationService
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.notificationService.notifications$.subscribe(notifications => {
        this.notifications = notifications;
        this.unreadCount = this.notificationService.getUnreadCount();
      });

      this.notificationService.reminders$.subscribe(reminders => {
        this.reminders = reminders;
      });

      // Set default date/time for new reminder
      const now = new Date();
      this.newReminder.date = now.toISOString().split('T')[0];
      this.newReminder.time = now.toTimeString().slice(0, 5);
    }
  }

  togglePanel() {
    this.showNotificationPanel = !this.showNotificationPanel;
  }

  switchTab(tab: 'notifications' | 'reminders') {
    this.activeTab = tab;
  }

  markAsRead(id: string) {
    this.notificationService.markAsRead(id);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  deleteNotification(id: string) {
    this.notificationService.deleteNotification(id);
  }

  clearAll() {
    if (confirm('Da li ste sigurni da želite obrisati sve notifikacije?')) {
      this.notificationService.clearAllNotifications();
    }
  }

  addReminder() {
    if (!this.newReminder.title || !this.newReminder.message || !this.newReminder.date || !this.newReminder.time) {
      alert('Molimo popunite sva obavezna polja!');
      return;
    }

    const [year, month, day] = this.newReminder.date.split('-').map(Number);
    const [hours, minutes] = this.newReminder.time.split(':').map(Number);
    const reminderTime = new Date(year, month - 1, day, hours, minutes);

    this.notificationService.addReminder(
      this.newReminder.title,
      this.newReminder.message,
      reminderTime,
      this.newReminder.recurring || undefined
    );

    // Reset form
    this.newReminder = {
      title: '',
      message: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      recurring: ''
    };
  }

  toggleReminder(id: string) {
    this.notificationService.toggleReminder(id);
  }

  deleteReminder(id: string) {
    if (confirm('Da li ste sigurni da želite obrisati ovaj podsjetnik?')) {
      this.notificationService.deleteReminder(id);
    }
  }

  setupDefaultReminders() {
    if (confirm('Da li želite postaviti default podsjetike za produktivnost?')) {
      this.notificationService.setupProductivityReminders();
      this.notificationService.addNotification(
        'Podsjetnici postavljeni',
        'Uspješno ste postavili default podsjetnika za produktivnost!',
        'success'
      );
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  }

  formatTime(date: Date): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Upravo sada';
    if (diffMins < 60) return `Prije ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Prije ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Prije ${diffDays} dana`;
    
    return d.toLocaleDateString('bs-BA');
  }

  formatReminderTime(date: Date): string {
    const d = new Date(date);
    return d.toLocaleString('bs-BA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
