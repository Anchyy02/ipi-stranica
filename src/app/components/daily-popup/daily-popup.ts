import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { AuthService } from '../../services/auth.service';
import { StatisticsService } from '../../services/statistics.service';

interface ProductivityMetrics {
  userId: string;
  date: string;
  studyHours: number;
  sleepHours: number;
  waterGlasses: number;
  tasksCompleted: number;
  mood: 'great' | 'good' | 'okay' | 'bad';
}

@Component({
  selector: 'app-daily-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-popup.html',
  styleUrls: ['./daily-popup.css']
})
export class DailyPopupComponent implements OnInit {
  showPopup = false;
  metrics: ProductivityMetrics | null = null;
  analysis: {
    score: number;
    message: string;
    insights: string[];
    recommendations: string[];
  } | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private firestore: Firestore,
    private authService: AuthService,
    private statisticsService: StatisticsService
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Listen to auth state
      this.authService.currentUser.subscribe(user => {
        if (user) {
          this.checkAndShowPopup(user.id);
        }
      });
    }
  }

  async checkAndShowPopup(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if popup was shown today
    const popupDoc = await getDoc(doc(this.firestore, 'dailyPopups', userId));
    
    if (!popupDoc.exists() || popupDoc.data()['lastShown'] !== today) {
      // Generate metrics from actual data
      await this.generateMetrics(userId, today);
      this.analyzeProductivity();
      
      // Show popup after a short delay
      setTimeout(() => {
        this.showPopup = true;
      }, 2000);
    }
  }

  async generateMetrics(userId: string, date: string) {
    try {
      // Try to get existing metrics for today
      const metricsDoc = await getDoc(doc(this.firestore, 'productivityMetrics', `${userId}_${date}`));
      
      if (metricsDoc.exists()) {
        this.metrics = metricsDoc.data() as ProductivityMetrics;
      } else {
        // Get data from statistics service
        const weekData = await this.statisticsService.getWeeklyData();
        const todayIndex = new Date().getDay() - 1; // Monday = 0
        const studyHours = todayIndex >= 0 && todayIndex < 7 ? weekData.studyHours[todayIndex] : 0;
        
        // Create new metrics
        this.metrics = {
          userId,
          date,
          studyHours: Math.round(studyHours * 10) / 10,
          sleepHours: 7 + Math.random() * 2, // Placeholder - integrate with sleep tracker
          waterGlasses: Math.floor(Math.random() * 6) + 2, // Placeholder
          tasksCompleted: Math.floor(Math.random() * 10) + 3, // Placeholder
          mood: this.getRandomMood()
        };
        
        // Save to Firestore
        await setDoc(doc(this.firestore, 'productivityMetrics', `${userId}_${date}`), this.metrics);
      }
    } catch (error) {
      console.error('Error generating metrics:', error);
      // Fallback to sample data
      this.metrics = {
        userId,
        date,
        studyHours: 4,
        sleepHours: 7,
        waterGlasses: 5,
        tasksCompleted: 6,
        mood: 'good'
      };
    }
  }

  getRandomMood(): 'great' | 'good' | 'okay' | 'bad' {
    const moods: ('great' | 'good' | 'okay' | 'bad')[] = ['great', 'good', 'okay', 'bad'];
    return moods[Math.floor(Math.random() * moods.length)];
  }

  analyzeProductivity() {
    if (!this.metrics) return;

    const insights: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    // Analyze study hours
    if (this.metrics.studyHours >= 6) {
      score += 30;
      insights.push('Izvrsno učenje! Održavate odličan tempo.');
    } else if (this.metrics.studyHours >= 4) {
      score += 20;
      insights.push('Dobro učenje, ali možete malo više.');
    } else {
      score += 10;
      insights.push('Vrijeme učenja je ispod optimuma.');
      recommendations.push('Pokušajte povećati vrijeme učenja na 4-6 sati dnevno.');
    }

    // Analyze sleep
    if (this.metrics.sleepHours >= 7 && this.metrics.sleepHours <= 9) {
      score += 25;
      insights.push('Spavanje je u idealnom rangu!');
    } else if (this.metrics.sleepHours < 7) {
      score += 10;
      insights.push('Nedovoljno spavanja.');
      recommendations.push('Cilj: 7-9 sati sna za optimalnu produktivnost.');
    } else {
      score += 15;
      insights.push('Možda spavate previše.');
      recommendations.push('Održavajte 7-9 sati sna.');
    }

    // Analyze water intake
    if (this.metrics.waterGlasses >= 6) {
      score += 20;
      insights.push('Odlična hidratacija!');
    } else if (this.metrics.waterGlasses >= 4) {
      score += 15;
      insights.push('Dobra hidratacija.');
    } else {
      score += 5;
      insights.push('Premalo vode.');
      recommendations.push('Pijte najmanje 6-8 čaša vode dnevno.');
    }

    // Analyze tasks
    if (this.metrics.tasksCompleted >= 8) {
      score += 25;
      insights.push('Fantastična produktivnost zadataka!');
    } else if (this.metrics.tasksCompleted >= 5) {
      score += 15;
      insights.push('Dobro završavanje zadataka.');
    } else {
      score += 5;
      insights.push('Malo završenih zadataka.');
      recommendations.push('Postavite dnevni cilj od 5-8 zadataka.');
    }

    // Get personalized message
    let message = '';
    if (score >= 80) {
      message = 'Nevjerovatno! Vi ste produktivni šampion! 🏆';
    } else if (score >= 60) {
      message = 'Odličan dan! Nastavite ovim tempom! 🎯';
    } else if (score >= 40) {
      message = 'Solidno! Ima mjesta za poboljšanje. 💪';
    } else {
      message = 'Vrijeme je za reset! Možete bolje sutra! 🌟';
    }

    this.analysis = {
      score,
      message,
      insights,
      recommendations
    };
  }

  async closePopup() {
    this.showPopup = false;
    
    const user = this.authService.currentUserValue;
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      // Mark as shown for today
      await setDoc(doc(this.firestore, 'dailyPopups', user.id), {
        lastShown: today
      });
    }
  }

  getScoreClass(): string {
    if (!this.analysis) return '';
    if (this.analysis.score >= 80) return 'excellent';
    if (this.analysis.score >= 60) return 'good';
    if (this.analysis.score >= 40) return 'okay';
    return 'poor';
  }

  getMoodEmoji(): string {
    if (!this.metrics) return '😐';
    switch (this.metrics.mood) {
      case 'great': return '😄';
      case 'good': return '🙂';
      case 'okay': return '😐';
      case 'bad': return '😔';
      default: return '😐';
    }
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('bs-BA', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
}
