import { Component, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from '@angular/fire/firestore';
import { AuthService } from '../../services/auth.service';

interface WaterData {
  id?: string;
  userId: string;
  date: string;
  glasses: number;
}

interface DailyMetricData {
  id?: string;
  userId: string;
  date: string;
  value: number;
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
  id?: string;
  userId: string;
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
  private readonly WEEKS_TO_SHOW = 12;
  readonly TIME_ADJUST_STEP_MINUTES = 5;
  
  showWaterModal = false;
  showTimerModal = false;
  showExerciseModal = false;
  showSleepModal = false;
  showStudyModal = false;
  showMealModal = false;

  waterDataMap: Map<string, WaterData> = new Map();
  exerciseDataMap: Map<string, DailyMetricData> = new Map();
  sleepDataMap: Map<string, DailyMetricData> = new Map();
  studyDataMap: Map<string, DailyMetricData> = new Map();
  mealDataMap: Map<string, DailyMetricData> = new Map();

  todayDate = '';
  todayGlasses = 0;

  todayExerciseMinutes = 0;
  todaySleepHours = 0;
  todayStudyHours = 0;
  todayMeals = 0;

  exerciseHistory: Array<{ date: string; value: number }> = [];
  sleepHistory: Array<{ date: string; value: number }> = [];
  studyHistory: Array<{ date: string; value: number }> = [];
  mealHistory: Array<{ date: string; value: number }> = [];

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

  private waterUnsubscribe: any;
  private timerUnsubscribe: any;
  private exerciseUnsubscribe: any;
  private sleepUnsubscribe: any;
  private studyUnsubscribe: any;
  private mealUnsubscribe: any;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private firestore: Firestore,
    private authService: AuthService
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.todayDate = this.getDisplayDate();
      
      // Listen to auth state and load user's data
      this.authService.currentUser.subscribe(user => {
        if (user) {
          this.loadUserWaterData(user.id);
          this.loadUserTimeEntries(user.id);
          this.loadUserDailyMetric('exerciseTracking', user.id, this.exerciseDataMap, () => {
            this.updateTodayExercise();
            this.exerciseHistory = this.getRecentHistory(this.exerciseDataMap);
          });
          this.loadUserDailyMetric('sleepTracking', user.id, this.sleepDataMap, () => {
            this.updateTodaySleep();
            this.sleepHistory = this.getRecentHistory(this.sleepDataMap);
          });
          this.loadUserDailyMetric('studyTracking', user.id, this.studyDataMap, () => {
            this.updateTodayStudy();
            this.studyHistory = this.getRecentHistory(this.studyDataMap);
          });
          this.loadUserDailyMetric('mealTracking', user.id, this.mealDataMap, () => {
            this.updateTodayMeals();
            this.mealHistory = this.getRecentHistory(this.mealDataMap);
          });
        } else {
          // Unsubscribe from previous listeners
          if (this.waterUnsubscribe) this.waterUnsubscribe();
          if (this.timerUnsubscribe) this.timerUnsubscribe();
          if (this.exerciseUnsubscribe) this.exerciseUnsubscribe();
          if (this.sleepUnsubscribe) this.sleepUnsubscribe();
          if (this.studyUnsubscribe) this.studyUnsubscribe();
          if (this.mealUnsubscribe) this.mealUnsubscribe();
          
          this.waterDataMap.clear();
          this.timeEntries = [];
          this.activeEntry = null;
          this.exerciseDataMap.clear();
          this.sleepDataMap.clear();
          this.studyDataMap.clear();
          this.mealDataMap.clear();
          this.todayExerciseMinutes = 0;
          this.todaySleepHours = 0;
          this.todayStudyHours = 0;
          this.todayMeals = 0;
          this.exerciseHistory = [];
          this.sleepHistory = [];
          this.studyHistory = [];
          this.mealHistory = [];
          this.renderGraph();
          this.updateStats();
        }
      });
    }
  }

  private loadUserDailyMetric(
    collectionName: string,
    userId: string,
    targetMap: Map<string, DailyMetricData>,
    onUpdated: () => void
  ) {
    const q = query(collection(this.firestore, collectionName), where('userId', '==', userId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      targetMap.clear();
      snapshot.forEach((d) => {
        const data: any = d.data();
        targetMap.set(data['date'], {
          id: d.id,
          userId: data['userId'],
          date: data['date'],
          value: Number(data['value'] || 0)
        });
      });
      onUpdated();
    });

    switch (collectionName) {
      case 'exerciseTracking':
        this.exerciseUnsubscribe = unsubscribe;
        break;
      case 'sleepTracking':
        this.sleepUnsubscribe = unsubscribe;
        break;
      case 'studyTracking':
        this.studyUnsubscribe = unsubscribe;
        break;
      case 'mealTracking':
        this.mealUnsubscribe = unsubscribe;
        break;
    }
  }

  private getRecentHistory(map: Map<string, DailyMetricData>): Array<{ date: string; value: number }> {
    const items = Array.from(map.values())
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 7)
      .map((x) => ({ date: x.date, value: x.value }));

    return items;
  }

  formatShortDate(isoDate: string): string {
    // isoDate: YYYY-MM-DD
    const [y, m, d] = isoDate.split('-');
    if (!y || !m || !d) return isoDate;
    return `${d}.${m}.`;
  }

  private loadUserWaterData(userId: string) {
    const q = query(
      collection(this.firestore, 'waterTracking'),
      where('userId', '==', userId)
    );

    this.waterUnsubscribe = onSnapshot(q, (snapshot) => {
      this.waterDataMap.clear();
      snapshot.forEach((doc) => {
        const data = doc.data();
        this.waterDataMap.set(data['date'], {
          id: doc.id,
          userId: data['userId'],
          date: data['date'],
          glasses: data['glasses']
        });
      });
      
      this.updateTodayCount();
      this.renderGraph();
      this.updateStats();
    });
  }

  private loadUserTimeEntries(userId: string) {
    const q = query(
      collection(this.firestore, 'timeEntries'),
      where('userId', '==', userId)
    );

    this.timerUnsubscribe = onSnapshot(q, (snapshot) => {
      this.timeEntries = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        this.timeEntries.push({
          id: doc.id,
          userId: data['userId'],
          title: data['title'],
          category: data['category'],
          startTime: (data['startTime'] as Timestamp).toDate(),
          endTime: data['endTime'] ? (data['endTime'] as Timestamp).toDate() : undefined,
          duration: data['duration'],
          isRunning: data['isRunning']
        });
      });
      
      // Sort by start time descending
      this.timeEntries.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      this.checkForActiveTimer();
    });
  }

  private checkForActiveTimer() {
    this.activeEntry = this.timeEntries.find(e => e.isRunning) || null;
    if (this.activeEntry) {
      this.startTimerInterval();
    }
  }

  async startNewTimer() {
    const user = this.authService.currentUserValue;
    if (!user) {
      alert('Morate biti prijavljeni!');
      return;
    }

    if (!this.newEntryTitle.trim()) {
      alert('Molimo unesite naslov zadatka!');
      return;
    }

    // Stop any active timer first
    if (this.activeEntry && this.activeEntry.id) {
      await this.stopTimer(this.activeEntry.id);
    }

    const entry: Omit<TimeEntry, 'id'> = {
      userId: user.id,
      title: this.newEntryTitle,
      category: this.newEntryCategory,
      startTime: new Date(),
      isRunning: true
    };

    await addDoc(collection(this.firestore, 'timeEntries'), {
      ...entry,
      startTime: Timestamp.fromDate(entry.startTime)
    });

    // Reset form
    this.newEntryTitle = '';
    this.newEntryCategory = 'study';
  }

  async stopTimer(entryId: string) {
    const entry = this.timeEntries.find(e => e.id === entryId);
    if (!entry || !entry.isRunning || !entry.id) return;

    const endTime = new Date();
    const duration = endTime.getTime() - entry.startTime.getTime();

    await updateDoc(doc(this.firestore, 'timeEntries', entry.id), {
      endTime: Timestamp.fromDate(endTime),
      duration: duration,
      isRunning: false
    });

    if (this.activeEntry?.id === entryId) {
      this.stopTimerInterval();
    }
  }

  async resumeTimer(entryId: string) {
    // Stop any active timer first
    if (this.activeEntry && this.activeEntry.id) {
      await this.stopTimer(this.activeEntry.id);
    }

    const entry = this.timeEntries.find(e => e.id === entryId);
    if (!entry || !entry.id) return;

    // Calculate the time that has already passed
    const previousDuration = entry.duration || 0;
    
    // Set new start time adjusted for previous duration
    const newStartTime = new Date(Date.now() - previousDuration);

    await updateDoc(doc(this.firestore, 'timeEntries', entry.id), {
      startTime: Timestamp.fromDate(newStartTime),
      endTime: null,
      duration: null,
      isRunning: true
    });
  }

  async deleteEntry(entryId: string) {
    if (confirm('Da li ste sigurni da želite obrisati ovaj unos?')) {
      if (this.activeEntry?.id === entryId) {
        await this.stopTimer(entryId);
      }
      await deleteDoc(doc(this.firestore, 'timeEntries', entryId));
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

  async increaseActiveTime() {
    await this.adjustActiveTimerByMinutes(this.TIME_ADJUST_STEP_MINUTES);
  }

  async decreaseActiveTime() {
    await this.adjustActiveTimerByMinutes(-this.TIME_ADJUST_STEP_MINUTES);
  }

  private async adjustActiveTimerByMinutes(deltaMinutes: number) {
    const entry = this.activeEntry;
    if (!entry?.id || !entry.isRunning) return;

    const deltaMs = Math.abs(deltaMinutes) * 60_000;
    const nowMs = Date.now();

    let newStartTimeMs = entry.startTime.getTime();
    if (deltaMinutes > 0) {
      // increase elapsed time => move start time earlier
      newStartTimeMs -= deltaMs;
    } else if (deltaMinutes < 0) {
      // decrease elapsed time => move start time later
      newStartTimeMs += deltaMs;
    }

    if (newStartTimeMs > nowMs) {
      newStartTimeMs = nowMs;
    }

    const newStartTime = new Date(newStartTimeMs);
    await updateDoc(doc(this.firestore, 'timeEntries', entry.id), {
      startTime: Timestamp.fromDate(newStartTime)
    });

    // optimistic UI update (snapshot will reconcile)
    this.activeEntry = { ...entry, startTime: newStartTime };
    this.updateElapsedTime();
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
    if (this.waterUnsubscribe) {
      this.waterUnsubscribe();
    }
    if (this.timerUnsubscribe) {
      this.timerUnsubscribe();
    }
    if (this.exerciseUnsubscribe) {
      this.exerciseUnsubscribe();
    }
    if (this.sleepUnsubscribe) {
      this.sleepUnsubscribe();
    }
    if (this.studyUnsubscribe) {
      this.studyUnsubscribe();
    }
    if (this.mealUnsubscribe) {
      this.mealUnsubscribe();
    }
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
    const waterData = this.waterDataMap.get(today);
    this.todayGlasses = waterData?.glasses || 0;
  }

  private updateTodayExercise() {
    const today = this.getTodayDate();
    const item = this.exerciseDataMap.get(today);
    this.todayExerciseMinutes = item?.value || 0;
  }

  private updateTodaySleep() {
    const today = this.getTodayDate();
    const item = this.sleepDataMap.get(today);
    this.todaySleepHours = item?.value || 0;
  }

  private updateTodayStudy() {
    const today = this.getTodayDate();
    const item = this.studyDataMap.get(today);
    this.todayStudyHours = item?.value || 0;
  }

  private updateTodayMeals() {
    const today = this.getTodayDate();
    const item = this.mealDataMap.get(today);
    this.todayMeals = item?.value || 0;
  }

  private async setDailyMetricValue(
    collectionName: string,
    map: Map<string, DailyMetricData>,
    date: string,
    value: number
  ) {
    const user = this.authService.currentUserValue;
    if (!user) {
      alert('Morate biti prijavljeni!');
      return;
    }

    const existing = map.get(date);
    if (existing?.id) {
      await updateDoc(doc(this.firestore, collectionName, existing.id), { value });
    } else {
      await addDoc(collection(this.firestore, collectionName), {
        userId: user.id,
        date,
        value
      });
    }
  }

  async increaseExercise() {
    const today = this.getTodayDate();
    const next = Math.min(600, this.todayExerciseMinutes + 5);
    await this.setDailyMetricValue('exerciseTracking', this.exerciseDataMap, today, next);
  }

  async decreaseExercise() {
    const today = this.getTodayDate();
    const next = Math.max(0, this.todayExerciseMinutes - 5);
    await this.setDailyMetricValue('exerciseTracking', this.exerciseDataMap, today, next);
  }

  async increaseSleep() {
    const today = this.getTodayDate();
    const next = Math.min(12, Math.round((this.todaySleepHours + 0.5) * 10) / 10);
    await this.setDailyMetricValue('sleepTracking', this.sleepDataMap, today, next);
  }

  async decreaseSleep() {
    const today = this.getTodayDate();
    const next = Math.max(0, Math.round((this.todaySleepHours - 0.5) * 10) / 10);
    await this.setDailyMetricValue('sleepTracking', this.sleepDataMap, today, next);
  }

  async increaseStudy() {
    const today = this.getTodayDate();
    const next = Math.min(16, Math.round((this.todayStudyHours + 0.5) * 10) / 10);
    await this.setDailyMetricValue('studyTracking', this.studyDataMap, today, next);
  }

  async decreaseStudy() {
    const today = this.getTodayDate();
    const next = Math.max(0, Math.round((this.todayStudyHours - 0.5) * 10) / 10);
    await this.setDailyMetricValue('studyTracking', this.studyDataMap, today, next);
  }

  async increaseMeals() {
    const today = this.getTodayDate();
    const next = Math.min(10, this.todayMeals + 1);
    await this.setDailyMetricValue('mealTracking', this.mealDataMap, today, next);
  }

  async decreaseMeals() {
    const today = this.getTodayDate();
    const next = Math.max(0, this.todayMeals - 1);
    await this.setDailyMetricValue('mealTracking', this.mealDataMap, today, next);
  }

  async increaseGlasses() {
    const user = this.authService.currentUserValue;
    if (!user) return;

    const today = this.getTodayDate();
    const waterData = this.waterDataMap.get(today);
    const current = waterData?.glasses || 0;
    
    if (current < 20) {
      if (waterData && waterData.id) {
        await updateDoc(doc(this.firestore, 'waterTracking', waterData.id), {
          glasses: current + 1
        });
      } else {
        await addDoc(collection(this.firestore, 'waterTracking'), {
          userId: user.id,
          date: today,
          glasses: current + 1
        });
      }
    }
  }

  async decreaseGlasses() {
    const user = this.authService.currentUserValue;
    if (!user) return;

    const today = this.getTodayDate();
    const waterData = this.waterDataMap.get(today);
    const current = waterData?.glasses || 0;
    
    if (current > 0 && waterData && waterData.id) {
      await updateDoc(doc(this.firestore, 'waterTracking', waterData.id), {
        glasses: current - 1
      });
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
      const waterData = this.waterDataMap.get(dateStr);
      const glasses = waterData?.glasses || 0;
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
      const waterData = this.waterDataMap.get(dateStr);
      weeklyTotal += waterData?.glasses || 0;
    });
    this.weeklyAvg = (weeklyTotal / 7).toFixed(1);

    // Best streak
    let currentStreak = 0;
    let bestStreak = 0;
    dates.forEach(date => {
      const dateStr = this.formatDate(date);
      const waterData = this.waterDataMap.get(dateStr);
      const glasses = waterData?.glasses || 0;
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
      const waterData = this.waterDataMap.get(dateStr);
      if (waterData && waterData.glasses > 0) {
        activeDays++;
      }
    });
    this.totalDays = activeDays;
  }

  async editDay(date: string, currentGlasses: number) {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const user = this.authService.currentUserValue;
    if (!user) return;
    
    const newCount = prompt(`Unesi broj čaša za ${date}:`, currentGlasses.toString());
    if (newCount !== null && !isNaN(Number(newCount))) {
      const count = parseInt(newCount);
      if (count >= 0 && count <= 20) {
        const waterData = this.waterDataMap.get(date);
        
        if (waterData && waterData.id) {
          await updateDoc(doc(this.firestore, 'waterTracking', waterData.id), {
            glasses: count
          });
        } else {
          await addDoc(collection(this.firestore, 'waterTracking'), {
            userId: user.id,
            date: date,
            glasses: count
          });
        }
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
    } else if (type === 'exercise') {
      this.showExerciseModal = true;
      if (isPlatformBrowser(this.platformId)) {
        document.body.style.overflow = 'hidden';
      }
    } else if (type === 'sleep') {
      this.showSleepModal = true;
      if (isPlatformBrowser(this.platformId)) {
        document.body.style.overflow = 'hidden';
      }
    } else if (type === 'study') {
      this.showStudyModal = true;
      if (isPlatformBrowser(this.platformId)) {
        document.body.style.overflow = 'hidden';
      }
    } else if (type === 'meal') {
      this.showMealModal = true;
      if (isPlatformBrowser(this.platformId)) {
        document.body.style.overflow = 'hidden';
      }
    }
  }

  closeTracker() {
    this.showWaterModal = false;
    this.showExerciseModal = false;
    this.showSleepModal = false;
    this.showStudyModal = false;
    this.showMealModal = false;
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
