import { Injectable } from '@angular/core';
import { Firestore, collection, query, where, getDocs, Timestamp } from '@angular/fire/firestore';
import { AuthService } from './auth.service';

export interface ProductivityData {
  sleepHours: number[];
  studyHours: number[];
  waterGlasses: number[];
  exerciseMinutes: number[];
  mealCount: number[];
  labels: string[];
  activityDistribution: {
    study: number;
    sleep: number;
    rest: number;
    other: number;
  };

  totalStudyTimeHours: number;
  totalTimerHours: number;
}

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {}

  async getWeeklyData(endDateIso?: string): Promise<ProductivityData> {
    const user = this.authService.currentUserValue;
    if (!user) {
      return this.getEmptyData('week');
    }

    const endDate = endDateIso ? new Date(endDateIso + 'T23:59:59') : new Date();
    const startDate = new Date(endDate.getTime() - 6 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const startIso = this.formatIsoDate(startDate);
    const endIso = this.formatIsoDate(endDate);

    // Get time entries for study hours
    const timeEntriesQuery = query(
      collection(this.firestore, 'timeEntries'),
      where('userId', '==', user.id),
      where('startTime', '>=', Timestamp.fromDate(startDate)),
      where('startTime', '<=', Timestamp.fromDate(endDate))
    );

    const timeEntriesSnapshot = await getDocs(timeEntriesQuery);
    const timeEntries: any[] = [];
    timeEntriesSnapshot.forEach(doc => {
      const data = doc.data();
      timeEntries.push({
        startTime: (data['startTime'] as Timestamp).toDate(),
        duration: data['duration'] || 0,
        category: data['category']
      });
    });

    // Fetch daily trackers (by ISO date string)
    const [sleepMap, studyMap, waterMap, exerciseMap, mealMap] = await Promise.all([
      this.getDailyValueMap('sleepTracking', user.id, startIso, endIso, 'value'),
      this.getDailyValueMap('studyTracking', user.id, startIso, endIso, 'value'),
      this.getDailyValueMap('waterTracking', user.id, startIso, endIso, 'glasses'),
      this.getDailyValueMap('exerciseTracking', user.id, startIso, endIso, 'value'),
      this.getDailyValueMap('mealTracking', user.id, startIso, endIso, 'value')
    ]);

    // Organize data by day
    const days = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];
    const sleepHours: number[] = [];
    const studyHours: number[] = [];
    const waterGlasses: number[] = [];
    const exerciseMinutes: number[] = [];
    const mealCount: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const iso = this.formatIsoDate(date);

      sleepHours.push(this.round1(sleepMap.get(iso) ?? 0));
      studyHours.push(this.round1(studyMap.get(iso) ?? 0));
      waterGlasses.push(this.round1(waterMap.get(iso) ?? 0));
      exerciseMinutes.push(this.round1(exerciseMap.get(iso) ?? 0));
      mealCount.push(this.round1(mealMap.get(iso) ?? 0));
    }

    // Activity distribution
    const activityDistribution = {
      study: 0,
      sleep: 0,
      rest: 0,
      other: 0
    };

    let totalTimerHours = 0;
    let totalStudyTimeHours = 0;

    timeEntries.forEach(entry => {
      const hours = (entry.duration || 0) / (1000 * 60 * 60);
      totalTimerHours += hours;
      switch (entry.category) {
        case 'study':
          activityDistribution.study += hours;
          totalStudyTimeHours += hours;
          break;
        case 'exercise':
          activityDistribution.rest += hours;
          break;
        case 'work':
          activityDistribution.other += hours;
          break;
        default:
          activityDistribution.other += hours;
      }
    });

    activityDistribution.sleep = sleepHours.reduce((a, b) => a + b, 0);

    return {
      sleepHours,
      studyHours,
      waterGlasses,
      exerciseMinutes,
      mealCount,
      labels: days,
      activityDistribution,
      totalStudyTimeHours: this.round1(totalStudyTimeHours),
      totalTimerHours: this.round1(totalTimerHours)
    };
  }

  async getMonthlyData(endDateIso?: string): Promise<ProductivityData> {
    const user = this.authService.currentUserValue;
    if (!user) {
      return this.getEmptyData('month');
    }

    const endDate = endDateIso ? new Date(endDateIso + 'T23:59:59') : new Date();
    const startDate = new Date(endDate.getTime() - 28 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const startIso = this.formatIsoDate(startDate);
    const endIso = this.formatIsoDate(endDate);

    // Get time entries
    const timeEntriesQuery = query(
      collection(this.firestore, 'timeEntries'),
      where('userId', '==', user.id),
      where('startTime', '>=', Timestamp.fromDate(startDate)),
      where('startTime', '<=', Timestamp.fromDate(endDate))
    );

    const timeEntriesSnapshot = await getDocs(timeEntriesQuery);
    const timeEntries: any[] = [];
    timeEntriesSnapshot.forEach(doc => {
      const data = doc.data();
      timeEntries.push({
        startTime: (data['startTime'] as Timestamp).toDate(),
        duration: data['duration'] || 0,
        category: data['category']
      });
    });

    const [sleepMap, studyMap, waterMap, exerciseMap, mealMap] = await Promise.all([
      this.getDailyValueMap('sleepTracking', user.id, startIso, endIso, 'value'),
      this.getDailyValueMap('studyTracking', user.id, startIso, endIso, 'value'),
      this.getDailyValueMap('waterTracking', user.id, startIso, endIso, 'glasses'),
      this.getDailyValueMap('exerciseTracking', user.id, startIso, endIso, 'value'),
      this.getDailyValueMap('mealTracking', user.id, startIso, endIso, 'value')
    ]);

    // Organize data by week
    const weeks = ['Sedmica 1', 'Sedmica 2', 'Sedmica 3', 'Sedmica 4'];
    const sleepHours: number[] = [];
    const studyHours: number[] = [];
    const waterGlasses: number[] = [];
    const exerciseMinutes: number[] = [];
    const mealCount: number[] = [];
    
    for (let week = 0; week < 4; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + week * 7);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekEntriesStudy = timeEntries.filter(entry => {
        const entryTime = entry.startTime.getTime();
        return entryTime >= weekStart.getTime() && entryTime < weekEnd.getTime() && entry.category === 'study';
      });

      // For monthly view, show average per day for trackers
      const weekSleepVals: number[] = [];
      const weekStudyVals: number[] = [];
      const weekWaterVals: number[] = [];
      const weekExerciseVals: number[] = [];
      const weekMealVals: number[] = [];

      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + d);
        const iso = this.formatIsoDate(date);

        weekSleepVals.push(Number(sleepMap.get(iso) ?? 0));
        weekStudyVals.push(Number(studyMap.get(iso) ?? 0));
        weekWaterVals.push(Number(waterMap.get(iso) ?? 0));
        weekExerciseVals.push(Number(exerciseMap.get(iso) ?? 0));
        weekMealVals.push(Number(mealMap.get(iso) ?? 0));
      }

      const totalStudyMs = weekEntriesStudy.reduce((sum, entry) => sum + (entry.duration || 0), 0);
      // studyHours chart in month view follows the Study Tracker average (hours/day)
      studyHours.push(this.round1(this.average(weekStudyVals)));
      sleepHours.push(this.round1(this.average(weekSleepVals)));
      waterGlasses.push(this.round1(this.average(weekWaterVals)));
      exerciseMinutes.push(this.round1(this.average(weekExerciseVals)));
      mealCount.push(this.round1(this.average(weekMealVals)));
    }

    // Activity distribution
    const activityDistribution = {
      study: 0,
      sleep: 0,
      rest: 0,
      other: 0
    };

    let totalTimerHours = 0;
    let totalStudyTimeHours = 0;

    timeEntries.forEach(entry => {
      const hours = (entry.duration || 0) / (1000 * 60 * 60);
      totalTimerHours += hours;
      switch (entry.category) {
        case 'study':
          activityDistribution.study += hours;
          totalStudyTimeHours += hours;
          break;
        case 'exercise':
          activityDistribution.rest += hours;
          break;
        case 'work':
          activityDistribution.other += hours;
          break;
        default:
          activityDistribution.other += hours;
      }
    });

    // Use real sleep tracker sum for the selected month range (approx)
    activityDistribution.sleep = this.round1(
      Array.from(sleepMap.values()).reduce((a, b) => a + b, 0)
    );

    return {
      sleepHours,
      studyHours,
      waterGlasses,
      exerciseMinutes,
      mealCount,
      labels: weeks,
      activityDistribution,
      totalStudyTimeHours: this.round1(totalStudyTimeHours),
      totalTimerHours: this.round1(totalTimerHours)
    };
  }

  private getEmptyData(period: 'week' | 'month'): ProductivityData {
    if (period === 'week') {
      return {
        sleepHours: [0, 0, 0, 0, 0, 0, 0],
        studyHours: [0, 0, 0, 0, 0, 0, 0],
        waterGlasses: [0, 0, 0, 0, 0, 0, 0],
        exerciseMinutes: [0, 0, 0, 0, 0, 0, 0],
        mealCount: [0, 0, 0, 0, 0, 0, 0],
        labels: ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'],
        activityDistribution: { study: 0, sleep: 0, rest: 0, other: 0 },
        totalStudyTimeHours: 0,
        totalTimerHours: 0
      };
    } else {
      return {
        sleepHours: [0, 0, 0, 0],
        studyHours: [0, 0, 0, 0],
        waterGlasses: [0, 0, 0, 0],
        exerciseMinutes: [0, 0, 0, 0],
        mealCount: [0, 0, 0, 0],
        labels: ['Sedmica 1', 'Sedmica 2', 'Sedmica 3', 'Sedmica 4'],
        activityDistribution: { study: 0, sleep: 0, rest: 0, other: 0 },
        totalStudyTimeHours: 0,
        totalTimerHours: 0
      };
    }
  }

  private formatIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private round1(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private average(values: number[]): number {
    if (!values.length) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private async getDailyValueMap(
    collectionName: string,
    userId: string,
    startIso: string,
    endIso: string,
    valueField: string
  ): Promise<Map<string, number>> {
    const q = query(
      collection(this.firestore, collectionName),
      where('userId', '==', userId),
      where('date', '>=', startIso),
      where('date', '<=', endIso)
    );

    const snapshot = await getDocs(q);
    const result = new Map<string, number>();

    snapshot.forEach((d) => {
      const data: any = d.data();
      const date = String(data['date'] || '');
      if (!date) return;
      result.set(date, Number(data[valueField] || 0));
    });

    return result;
  }
}
