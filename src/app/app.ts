import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { Footer } from './components/footer/footer';
import { NotificationsComponent } from './components/notifications/notifications';
import { DailyPopupComponent } from './components/daily-popup/daily-popup';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, NotificationsComponent, DailyPopupComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = 'IPI Kursevi';
}


