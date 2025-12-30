import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ChartData {
  labels: string[];
  data: number[];
}

@Component({
  selector: 'app-statistika',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './statistika.html',
  styleUrls: ['./statistika.css']
})
export class StatistikaComponent implements OnInit {
  // Filter options
  filterPeriod: string = 'week'; // 'week' or 'month'
  selectedDate: string = new Date().toISOString().split('T')[0];

  // Sleep data (Chat chart)
  sleepData: ChartData = {
    labels: [],
    data: []
  };

  // Study time data (Line chart)
  studyData: ChartData = {
    labels: [],
    data: []
  };

  // Activity distribution (Pie chart)
  activityData = {
    labels: ['Učenje', 'Spavanje', 'Odmor', 'Ostalo'],
    data: [35, 30, 20, 15],
    colors: ['#207cf5', '#10b981', '#f59e0b', '#6b7280']
  };

  // Stats
  stats = {
    avgSleep: 0,
    avgStudy: 0,
    totalStudyTime: 0,
    productivityScore: 0
  };

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    if (this.filterPeriod === 'week') {
      this.loadWeekData();
    } else {
      this.loadMonthData();
    }
    this.calculateStats();
  }

  loadWeekData() {
    const days = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];
    this.sleepData = {
      labels: days,
      data: this.getRandomData(7, 5, 9)
    };
    this.studyData = {
      labels: days,
      data: this.getRandomData(7, 2, 8)
    };
  }

  loadMonthData() {
    const weeks = ['Sedmica 1', 'Sedmica 2', 'Sedmica 3', 'Sedmica 4'];
    this.sleepData = {
      labels: weeks,
      data: this.getRandomData(4, 6, 8)
    };
    this.studyData = {
      labels: weeks,
      data: this.getRandomData(4, 3, 7)
    };
  }

  getRandomData(count: number, min: number, max: number): number[] {
    return Array.from({ length: count }, () => 
      Math.floor(Math.random() * (max - min + 1)) + min
    );
  }

  calculateStats() {
    this.stats.avgSleep = this.calculateAverage(this.sleepData.data);
    this.stats.avgStudy = this.calculateAverage(this.studyData.data);
    this.stats.totalStudyTime = this.studyData.data.reduce((a, b) => a + b, 0);
    this.stats.productivityScore = Math.round(
      (this.stats.avgStudy / 8) * 100
    );
  }

  calculateAverage(data: number[]): number {
    return Math.round((data.reduce((a, b) => a + b, 0) / data.length) * 10) / 10;
  }

  onFilterChange() {
    this.loadData();
  }

  getBarHeight(value: number, max: number = 10): string {
    return `${(value / max) * 100}%`;
  }

  getLinePoints(): string {
    const width = 600;
    const height = 200;
    const max = Math.max(...this.studyData.data);
    const stepX = width / (this.studyData.data.length - 1);
    
    return this.studyData.data
      .map((val, i) => `${i * stepX},${height - (val / max) * height}`)
      .join(' ');
  }

  getPieSlices(): any[] {
    const total = this.activityData.data.reduce((a, b) => a + b, 0);
    let currentAngle = 0;
    
    return this.activityData.data.map((value, index) => {
      const percentage = value / total;
      const angle = percentage * 360;
      const largeArc = angle > 180 ? 1 : 0;
      
      const startX = 50 + 40 * Math.cos((currentAngle - 90) * Math.PI / 180);
      const startY = 50 + 40 * Math.sin((currentAngle - 90) * Math.PI / 180);
      
      currentAngle += angle;
      
      const endX = 50 + 40 * Math.cos((currentAngle - 90) * Math.PI / 180);
      const endY = 50 + 40 * Math.sin((currentAngle - 90) * Math.PI / 180);
      
      const path = `M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArc} 1 ${endX} ${endY} Z`;
      
      return {
        path,
        color: this.activityData.colors[index],
        label: this.activityData.labels[index],
        percentage: Math.round(percentage * 100)
      };
    });
  }

  // AI Insights - Simple logic-based insights
  getAISleepInsight(): string {
    const avgSleep = this.stats.avgSleep;
    if (avgSleep < 6) {
      return "Spavate premalo! Preporučuje se 7-9 sati sna za optimalnu produktivnost.";
    } else if (avgSleep >= 6 && avgSleep < 7) {
      return "Vaše spavanje je ispod optimalnog nivoa. Pokušajte dodati još sat vremena za spavanje.";
    } else if (avgSleep >= 7 && avgSleep <= 9) {
      return "Odlično! Vaši obrasci spavanja su idealni za maksimalnu produktivnost.";
    } else {
      return "Možda spavate previše. Pokušajte održavati 7-9 sati sna.";
    }
  }

  getAIStudyInsight(): string {
    const avgStudy = this.stats.avgStudy;
    if (avgStudy < 3) {
      return "Vrijeme učenja je ispod prosjeka. Pokušajte povećati na najmanje 4-5 sati dnevno.";
    } else if (avgStudy >= 3 && avgStudy < 5) {
      return "Dobro napredujete! Malo više fokusa bi vas dovelo do izvrsnosti.";
    } else if (avgStudy >= 5 && avgStudy < 7) {
      return "Odličan napredak! Održavate savršen balans učenja i odmora.";
    } else {
      return "Učite mnogo! Pazite da ne dođete do pregorelosti. Pravi­te pauze.";
    }
  }

  getAIProductivityInsight(): string {
    const score = this.stats.productivityScore;
    if (score < 40) {
      return "Vaša produktivnost je niska. Razmislite o organizovanju vremena i postavljanju ciljeva.";
    } else if (score >= 40 && score < 70) {
      return "Dobra produktivnost! Sa malim poboljšanjima možete postići još više.";
    } else {
      return "Izvrsna produktivnost! Nastavljate sjajno i održavate trenutni tempo.";
    }
  }

  // Export to PDF functionality
  exportToPDF() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Molimo dozvolite pop-up prozore za export u PDF');
      return;
    }

    const today = new Date().toLocaleDateString('bs-BA');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Statistika - ${today}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 1200px;
            margin: 0 auto;
          }
          h1 { color: #207cf5; margin-bottom: 10px; }
          .date { color: #6b7280; margin-bottom: 30px; }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 40px;
          }
          .stat-box {
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
          }
          .stat-icon { font-size: 2rem; margin-bottom: 10px; }
          .stat-value { font-size: 2rem; font-weight: bold; color: #207cf5; margin-bottom: 5px; }
          .stat-label { color: #6b7280; font-size: 0.9rem; }
          .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          .section h2 { color: #1f2937; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }
          th { background: #f9fafb; font-weight: 600; color: #374151; }
          .insight-box {
            background: #f0f7ff;
            border-left: 4px solid #207cf5;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 4px;
          }
          .insight-box h4 { color: #1f2937; margin-bottom: 8px; }
          .insight-box p { color: #6b7280; line-height: 1.6; }
          @media print {
            body { padding: 20px; }
            .stats-grid { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>📊 Statistika i Produktivnost</h1>
        <p class="date">Generisano: ${today}</p>
        
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-icon">😴</div>
            <div class="stat-value">${this.stats.avgSleep}h</div>
            <div class="stat-label">Prosječno spavanje</div>
          </div>
          <div class="stat-box">
            <div class="stat-icon">📚</div>
            <div class="stat-value">${this.stats.avgStudy}h</div>
            <div class="stat-label">Prosječno učenje</div>
          </div>
          <div class="stat-box">
            <div class="stat-icon">⏱️</div>
            <div class="stat-value">${this.stats.totalStudyTime}h</div>
            <div class="stat-label">Ukupno sati učenja</div>
          </div>
          <div class="stat-box">
            <div class="stat-icon">🎯</div>
            <div class="stat-value">${this.stats.productivityScore}%</div>
            <div class="stat-label">Skor produktivnosti</div>
          </div>
        </div>

        <div class="section">
          <h2>Sati spavanja (${this.filterPeriod === 'week' ? 'Sedmica' : 'Mjesec'})</h2>
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Sati</th>
              </tr>
            </thead>
            <tbody>
              ${this.sleepData.labels.map((label, i) => `
                <tr>
                  <td>${label}</td>
                  <td>${this.sleepData.data[i]}h</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Vrijeme učenja (${this.filterPeriod === 'week' ? 'Sedmica' : 'Mjesec'})</h2>
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Sati</th>
              </tr>
            </thead>
            <tbody>
              ${this.studyData.labels.map((label, i) => `
                <tr>
                  <td>${label}</td>
                  <td>${this.studyData.data[i]}h</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Raspodjela aktivnosti</h2>
          <table>
            <thead>
              <tr>
                <th>Aktivnost</th>
                <th>Procenat</th>
              </tr>
            </thead>
            <tbody>
              ${this.activityData.labels.map((label, i) => `
                <tr>
                  <td>${label}</td>
                  <td>${this.activityData.data[i]}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>🤖 AI Uvidi</h2>
          <div class="insight-box">
            <h4>💡 Preporuka za spavanje</h4>
            <p>${this.getAISleepInsight()}</p>
          </div>
          <div class="insight-box">
            <h4>📖 Učenje</h4>
            <p>${this.getAIStudyInsight()}</p>
          </div>
          <div class="insight-box">
            <h4>🎯 Produktivnost</h4>
            <p>${this.getAIProductivityInsight()}</p>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    
    // Wait for content to load then trigger print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
