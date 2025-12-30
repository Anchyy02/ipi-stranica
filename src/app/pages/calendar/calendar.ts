import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CalendarEvent {
  id: string;
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
export class CalendarComponent implements OnInit {
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

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadEvents();
      this.generateCalendar();
      this.selectedDate = new Date();
      this.filterEventsByDate();
    }
  }

  loadEvents() {
    const stored = localStorage.getItem('calendarEvents');
    if (stored) {
      this.events = JSON.parse(stored).map((e: any) => ({
        ...e,
        date: new Date(e.date)
      }));
    } else {
      // Add some sample events
      this.events = [
        {
          id: Date.now().toString(),
          title: 'Ispit iz Web programiranja',
          description: 'Finalni ispit',
          date: new Date(new Date().setDate(new Date().getDate() + 7)),
          type: 'exam',
          completed: false
        }
      ];
      this.saveEvents();
    }
  }

  saveEvents() {
    localStorage.setItem('calendarEvents', JSON.stringify(this.events));
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

  addEvent() {
    if (!this.newEvent.title || !this.newEvent.date) {
      alert('Molimo unesite naslov i datum!');
      return;
    }

    const [year, month, day] = this.newEvent.date.split('-').map(Number);
    const [hours, minutes] = this.newEvent.time.split(':').map(Number);
    const eventDate = new Date(year, month - 1, day, hours, minutes);

    const event: CalendarEvent = {
      id: Date.now().toString(),
      title: this.newEvent.title,
      description: this.newEvent.description,
      date: eventDate,
      type: this.newEvent.type,
      completed: false
    };

    this.events.push(event);
    this.events.sort((a, b) => a.date.getTime() - b.date.getTime());
    this.saveEvents();
    this.filterEventsByDate();
    this.closeEventForm();
  }

  toggleEventCompleted(eventId: string) {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      event.completed = !event.completed;
      this.saveEvents();
      this.filterEventsByDate();
    }
  }

  deleteEvent(eventId: string) {
    if (confirm('Da li ste sigurni da želite obrisati ovaj događaj?')) {
      this.events = this.events.filter(e => e.id !== eventId);
      this.saveEvents();
      this.filterEventsByDate();
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
