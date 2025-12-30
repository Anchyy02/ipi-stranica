import { Component, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface WaterData {
  [date: string]: number;
}

interface GraphCell {
  date: string;
  glasses: number;
  level: number;
}

interface MonthLabel {
  text: string;
  position: number;
}

interface TimeEntry {
  id: string;
  title: string;
  category: 'study' | 'work' | 'exercise' | 'other';
  startTime: Date;
  endTime?: Date;
  duration?: number; // in milliseconds
  isRunning: boolean;
}

@Component({
  selector: 'app-trackers',
  imports: [CommonModule, FormsModule],
  templateUrl: './trackers.html',
  styleUrl: './trackers.css'
})
export class Trackers {
  private readonly STORAGE_KEY = 'waterIntakeData';
  private readonly TIMER_STORAGE_KEY = 'timeEntries';
  private readonly WEEKS_TO_SHOW = 12;
  
  showWaterModal = false;
  showTimerModal = false;
  waterData: WaterData = {};
  todayDate = '';
  todayGlasses = 0;
  graphCells: GraphCell[] = [];
  monthLabels: MonthLabel[] = [];
  weeklyAvg = '0.0';
  bestStreak = 0;
  totalDays = 0;

  // Timer data
  timeEntries: TimeEntry[] = [];
  activeEntry: TimeEntry | null = null;
  currentElapsedTime = '00:00:00';
  timerInterval: any;

  // New entry form
  newEntryTitle = '';
  newEntryCategory: 'study' | 'work' | 'exercise' | 'other' = 'study';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadData();
      this.loadTimeEntries();
      this.todayDate = this.getDisplayDate();
      this.updateTodayCount();
      this.renderGraph();
      this.updateStats();
      this.checkForActiveTimer();
    }
  }

  private loadData() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.waterData = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading water data:', e);
      this.waterData = {};
    }
  }

  private saveData() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.waterData));
    } catch (e) {
      console.error('Error saving water data:', e);
    }
  }

  // Timer methods
  private loadTimeEntries() {
    try {
      const stored = localStorage.getItem(this.TIMER_STORAGE_KEY);
      if (stored) {
        this.timeEntries = JSON.parse(stored).map((entry: any) => ({
          ...entry,
          startTime: new Date(entry.startTime),
          endTime: entry.endTime ? new Date(entry.endTime) : undefined
        }));
      }
    } catch (e) {
      console.error('Error loading time entries:', e);
      this.timeEntries = [];
    }
  }

  private saveTimeEntries() {
    try {
      localStorage.setItem(this.TIMER_STORAGE_KEY, JSON.stringify(this.timeEntries));
    } catch (e) {
      console.error('Error saving time entries:', e);
    }
  }

  private checkForActiveTimer() {
    this.activeEntry = this.timeEntries.find(e => e.isRunning) || null;
    if (this.activeEntry) {
      this.startTimerInterval();
    }
  }

  startNewTimer() {
    if (!this.newEntryTitle.trim()) {
      alert('Molimo unesite naslov zadatka!');
      return;
    }

    // Stop any active timer first
    if (this.activeEntry) {
      this.stopTimer(this.activeEntry.id);
    }

    const entry: TimeEntry = {
      id: Date.now().toString(),
      title: this.newEntryTitle,
      category: this.newEntryCategory,
      startTime: new Date(),
      isRunning: true
    };

    this.timeEntries.unshift(entry);
    this.activeEntry = entry;
    this.saveTimeEntries();
    this.startTimerInterval();

    // Reset form
    this.newEntryTitle = '';
    this.newEntryCategory = 'study';
  }

  stopTimer(entryId: string) {
    const entry = this.timeEntries.find(e => e.id === entryId);
    if (!entry || !entry.isRunning) return;

    entry.endTime = new Date();
    entry.duration = entry.endTime.getTime() - entry.startTime.getTime();
    entry.isRunning = false;

    if (this.activeEntry?.id === entryId) {
      this.activeEntry = null;
      this.stopTimerInterval();
    }

    this.saveTimeEntries();
  }

  resumeTimer(entryId: string) {
    // Stop any active timer first
    if (this.activeEntry) {
      this.stopTimer(this.activeEntry.id);
    }

    const entry = this.timeEntries.find(e => e.id === entryId);
    if (!entry) return;

    // Calculate the time that has already passed
    const previousDuration = entry.duration || 0;
    
    // Set new start time adjusted for previous duration
    entry.startTime = new Date(Date.now() - previousDuration);
    entry.endTime = undefined;
    entry.duration = undefined;
    entry.isRunning = true;

    this.activeEntry = entry;
    this.saveTimeEntries();
    this.startTimerInterval();
  }

  deleteEntry(entryId: string) {
    if (confirm('Da li ste sigurni da želite obrisati ovaj unos?')) {
      if (this.activeEntry?.id === entryId) {
        this.stopTimer(entryId);
      }
      this.timeEntries = this.timeEntries.filter(e => e.id !== entryId);
      this.saveTimeEntries();
    }
  }

  private startTimerInterval() {
    this.stopTimerInterval(); // Clear any existing interval
    this.updateElapsedTime();
    this.timerInterval = setInterval(() => {
      this.updateElapsedTime();
    }, 1000);
  }

  private stopTimerInterval() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateElapsedTime() {
    if (!this.activeEntry) {
      this.currentElapsedTime = '00:00:00';
      return;
    }

    const elapsed = Date.now() - this.activeEntry.startTime.getTime();
    this.currentElapsedTime = this.formatDuration(elapsed);
  }

  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getEntryDuration(entry: TimeEntry): string {
    if (entry.isRunning) {
      const elapsed = Date.now() - entry.startTime.getTime();
      return this.formatDuration(elapsed);
    } else if (entry.duration) {
      return this.formatDuration(entry.duration);
    }
    return '00:00:00';
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'study': return '📚';
      case 'work': return '💼';
      case 'exercise': return '🏃';
      default: return '📝';
    }
  }

  getCategoryLabel(category: string): string {
    switch (category) {
      case 'study': return 'Učenje';
      case 'work': return 'Posao';
      case 'exercise': return 'Vježbanje';
      default: return 'Ostalo';
    }
  }

  getTodayEntries(): TimeEntry[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.timeEntries.filter(entry => {
      const entryDate = new Date(entry.startTime);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    });
  }

  getTodayTotalTime(): string {
    const todayEntries = this.getTodayEntries();
    let totalMs = 0;

    todayEntries.forEach(entry => {
      if (entry.duration) {
        totalMs += entry.duration;
      } else if (entry.isRunning) {
        totalMs += Date.now() - entry.startTime.getTime();
      }
    });

    return this.formatDuration(totalMs);
  }

  openTimerModal() {
    this.showTimerModal = true;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  closeTimerModal() {
    this.showTimerModal = false;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'auto';
    }
  }

  ngOnDestroy() {
    this.stopTimerInterval();
  }

  private getTodayDate(): string {
    const today = new Date();
    return this.formatDate(today);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getDisplayDate(): string {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return today.toLocaleDateString('bs-BA', options);
  }

  private getWaterLevel(glasses: number): number {
    if (glasses === 0) return 0;
    if (glasses <= 2) return 1;
    if (glasses <= 4) return 2;
    if (glasses <= 6) return 3;
    return 4;
  }

  private updateTodayCount() {
    const today = this.getTodayDate();
    this.todayGlasses = this.waterData[today] || 0;
  }

  increaseGlasses() {
    const today = this.getTodayDate();
    const current = this.waterData[today] || 0;
    if (current < 20) {
      this.waterData[today] = current + 1;
      this.saveData();
      this.updateTodayCount();
      this.renderGraph();
      this.updateStats();
    }
  }

  decreaseGlasses() {
    const today = this.getTodayDate();
    const current = this.waterData[today] || 0;
    if (current > 0) {
      this.waterData[today] = current - 1;
      this.saveData();
      this.updateTodayCount();
      this.renderGraph();
      this.updateStats();
    }
  }

  private generateDates(): Date[] {
    const dates: Date[] = [];
    const today = new Date();
    const totalDays = this.WEEKS_TO_SHOW * 7;
    
    for (let i = totalDays - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
    
    return dates;
  }

  private getMonthLabels(dates: Date[]): MonthLabel[] {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'];
    const labels: MonthLabel[] = [];
    let lastMonth = -1;
    let weekCount = 0;

    dates.forEach((date, index) => {
      if (date.getDay() === 0 || index === 0) {
        const month = date.getMonth();
        if (month !== lastMonth) {
          labels.push({
            text: monthNames[month],
            position: weekCount
          });
          lastMonth = month;
        }
        weekCount++;
      }
    });

    return labels;
  }

  private renderGraph() {
    const dates = this.generateDates();
    this.monthLabels = this.getMonthLabels(dates);
    this.graphCells = [];

    dates.forEach(date => {
      const dateStr = this.formatDate(date);
      const glasses = this.waterData[dateStr] || 0;
      const level = this.getWaterLevel(glasses);
      
      this.graphCells.push({
        date: dateStr,
        glasses: glasses,
        level: level
      });
    });
  }

  private updateStats() {
    const dates = this.generateDates();
    const last7Days = dates.slice(-7);
    
    // Weekly average
    let weeklyTotal = 0;
    last7Days.forEach(date => {
      const dateStr = this.formatDate(date);
      weeklyTotal += this.waterData[dateStr] || 0;
    });
    this.weeklyAvg = (weeklyTotal / 7).toFixed(1);

    // Best streak
    let currentStreak = 0;
    let bestStreak = 0;
    dates.forEach(date => {
      const dateStr = this.formatDate(date);
      const glasses = this.waterData[dateStr] || 0;
      if (glasses >= 8) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });
    this.bestStreak = bestStreak;

    // Total active days
    let activeDays = 0;
    dates.forEach(date => {
      const dateStr = this.formatDate(date);
      if (this.waterData[dateStr] && this.waterData[dateStr] > 0) {
        activeDays++;
      }
    });
    this.totalDays = activeDays;
  }

  editDay(date: string, currentGlasses: number) {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const newCount = prompt(`Unesi broj čaša za ${date}:`, currentGlasses.toString());
    if (newCount !== null && !isNaN(Number(newCount))) {
      const count = parseInt(newCount);
      if (count >= 0 && count <= 20) {
        this.waterData[date] = count;
        this.saveData();
        this.renderGraph();
        this.updateTodayCount();
        this.updateStats();
      }
    }
  }

  openTracker(type: string) {
    if (type === 'water') {
      this.showWaterModal = true;
      if (isPlatformBrowser(this.platformId)) {
        document.body.style.overflow = 'hidden';
      }
    } else if (type === 'timer') {
      this.openTimerModal();
    }
  }

  closeTracker() {
    this.showWaterModal = false;
    this.closeTimerModal();
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'auto';
    }
  }

  onModalClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('tracker-modal')) {
      this.closeTracker();
    }
  }
}
