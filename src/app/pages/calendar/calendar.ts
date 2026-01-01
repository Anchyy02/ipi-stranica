import { Component, OnInit, PLATFORM_ID, Inject, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from '@angular/fire/firestore';
import { AuthService } from '../../services/auth.service';

interface CalendarEvent {
  id?: string;
  userId: string;
  title: string;
  description: string;
  date: Date;
  type: 'task' | 'exam' | 'class' | 'other';
  completed: boolean;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.html',
  styleUrls: ['./calendar.css']
})
export class CalendarComponent implements OnInit, OnDestroy {
  currentDate = new Date();
  selectedDate: Date | null = null;
  calendarDays: Date[] = [];
  events: CalendarEvent[] = [];
  filteredEvents: CalendarEvent[] = [];
  
  // New event form
  showEventForm = false;
  newEvent = {
    title: '',
    description: '',
    date: '',
    time: '09:00',
    type: 'task' as 'task' | 'exam' | 'class' | 'other'
  };

  monthNames = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Juni', 'Juli', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];
  dayNames = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];

  private eventsUnsubscribe: any;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private firestore: Firestore,
    private authService: AuthService
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.generateCalendar();
      this.selectedDate = new Date();
      
      // Listen to auth state and load user's events
      this.authService.currentUser.subscribe(user => {
        if (user) {
          this.loadUserEvents(user.id);
        } else {
          // Unsubscribe from previous listeners
          if (this.eventsUnsubscribe) this.eventsUnsubscribe();
          
          this.events = [];
          this.filterEventsByDate();
        }
      });
    }
  }

  ngOnDestroy() {
    if (this.eventsUnsubscribe) {
      this.eventsUnsubscribe();
    }
  }

  private loadUserEvents(userId: string) {
    const q = query(
      collection(this.firestore, 'calendarEvents'),
      where('userId', '==', userId)
    );

    this.eventsUnsubscribe = onSnapshot(q, (snapshot) => {
      this.events = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        this.events.push({
          id: doc.id,
          userId: data['userId'],
          title: data['title'],
          description: data['description'],
          date: (data['date'] as Timestamp).toDate(),
          type: data['type'],
          completed: data['completed']
        });
      });
      
      // Sort by date
      this.events.sort((a, b) => a.date.getTime() - b.date.getTime());
      this.filterEventsByDate();
    });
  }

  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    
    // Get day of week for first day (0 = Sunday, need to adjust to Monday = 0)
    let startDay = firstDay.getDay() - 1;
    if (startDay === -1) startDay = 6; // Sunday becomes 6
    
    this.calendarDays = [];
    
    // Add previous month's days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      this.calendarDays.push(new Date(year, month - 1, prevMonthLastDay - i));
    }
    
    // Add current month's days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      this.calendarDays.push(new Date(year, month, day));
    }
    
    // Add next month's days to complete the grid
    const remainingDays = 42 - this.calendarDays.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      this.calendarDays.push(new Date(year, month + 1, day));
    }
  }

  previousMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1);
    this.generateCalendar();
  }

  nextMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1);
    this.generateCalendar();
  }

  selectDate(date: Date) {
    this.selectedDate = date;
    this.filterEventsByDate();
  }

  filterEventsByDate() {
    if (!this.selectedDate) {
      this.filteredEvents = [];
      return;
    }
    
    this.filteredEvents = this.events.filter(event => 
      this.isSameDay(event.date, this.selectedDate!)
    ).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  isToday(date: Date): boolean {
    return this.isSameDay(date, new Date());
  }

  isSelected(date: Date): boolean {
    return this.selectedDate ? this.isSameDay(date, this.selectedDate) : false;
  }

  isCurrentMonth(date: Date): boolean {
    return date.getMonth() === this.currentDate.getMonth();
  }

  hasEvents(date: Date): boolean {
    return this.events.some(event => this.isSameDay(event.date, date));
  }

  getEventsForDate(date: Date): CalendarEvent[] {
    return this.events.filter(event => this.isSameDay(event.date, date));
  }

  openEventForm() {
    this.showEventForm = true;
    if (this.selectedDate) {
      this.newEvent.date = this.selectedDate.toISOString().split('T')[0];
    } else {
      this.newEvent.date = new Date().toISOString().split('T')[0];
    }
  }

  closeEventForm() {
    this.showEventForm = false;
    this.resetForm();
  }

  resetForm() {
    this.newEvent = {
      title: '',
      description: '',
      date: '',
      time: '09:00',
      type: 'task'
    };
  }

  async addEvent() {
    const user = this.authService.currentUserValue;
    if (!user) {
      alert('Morate biti prijavljeni!');
      return;
    }

    if (!this.newEvent.title || !this.newEvent.date) {
      alert('Molimo unesite naslov i datum!');
      return;
    }

    const [year, month, day] = this.newEvent.date.split('-').map(Number);
    const [hours, minutes] = this.newEvent.time.split(':').map(Number);
    const eventDate = new Date(year, month - 1, day, hours, minutes);

    const event: Omit<CalendarEvent, 'id'> = {
      userId: user.id,
      title: this.newEvent.title,
      description: this.newEvent.description,
      date: eventDate,
      type: this.newEvent.type,
      completed: false
    };

    await addDoc(collection(this.firestore, 'calendarEvents'), {
      ...event,
      date: Timestamp.fromDate(event.date)
    });

    this.closeEventForm();
  }

  async toggleEventCompleted(eventId: string) {
    const event = this.events.find(e => e.id === eventId);
    if (event && event.id) {
      await updateDoc(doc(this.firestore, 'calendarEvents', event.id), {
        completed: !event.completed
      });
    }
  }

  async deleteEvent(eventId: string) {
    if (confirm('Da li ste sigurni da želite obrisati ovaj događaj?')) {
      await deleteDoc(doc(this.firestore, 'calendarEvents', eventId));
    }
  }

  getEventIcon(type: string): string {
    switch (type) {
      case 'task': return '📝';
      case 'exam': return '📚';
      case 'class': return '🎓';
      default: return '📅';
    }
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' });
  }

  getEventTypeLabel(type: string): string {
    switch (type) {
      case 'task': return 'Zadatak';
      case 'exam': return 'Ispit';
      case 'class': return 'Čas';
      default: return 'Ostalo';
    }
  }
}
