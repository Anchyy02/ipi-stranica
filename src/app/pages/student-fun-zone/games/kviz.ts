import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Question {
  q: string;
  a: string[];
  c: number;
  shuffledAnswers?: {text: string, originalIndex: number}[];
}

interface QuestionDisplay extends Question {
  userAnswer?: number;
  isCorrect?: boolean;
}

@Component({
  selector: 'app-kviz',
  imports: [RouterLink, CommonModule],
  templateUrl: './kviz.html',
  styleUrl: './kviz.css'
})
export class Kviz {
  questionBank: Question[] = [
    {q:'Šta znači skraćenica HTML?', a:['HyperText Markup Language','HighText Markdown Language','Home Tool Markup Language','Hyperlink Text Making Language'], c:0},
    {q:'Koji meta tag omogućava responzivan prikaz na mobilnim uređajima?', a:['<meta charset="utf-8">','<meta name="viewport" content="width=device-width, initial-scale=1">','<meta name="mobile" content="true">','<meta name="scale" content="1">'], c:1},
    {q:'Koji HTTP metod se koristi za dobijanje resursa bez izmjena?', a:['POST','PUT','GET','PATCH'], c:2},
    {q:'Koji CSS selektor ima najveću specifičnost?', a:['Klasa (.btn)','Element (div)','ID (#main)','Universalan (*)'], c:2},
    {q:'Koji je ispravan način dodavanja eksternog CSS-a?', a:['<style src="styles.css">','<link rel="stylesheet" href="styles.css">','<css href="styles.css">','<script href="styles.css">'], c:1},
    {q:'Koji tag je semantički pogodan za glavni sadržaj stranice?', a:['<section>','<article>','<main>','<div role="main">'], c:2},
    {q:'Šta vraća izraz typeof null u JavaScriptu?', a:['null','object','undefined','number'], c:1},
    {q:'Kako pristupiti prvom elementu sa klasom "item" u DOM-u?', a:['document.getElementById("item")','document.querySelector(".item")','document.querySelectorAll("#item")[0]','window.item[0]'], c:1},
    {q:'Koji atribut unutar a taga otvara link u novom tabu?', a:['rel="noopener"','target="_blank"','open','window="new"'], c:1},
    {q:'Koja CSS osobina postavlja raspored elemenata kao fleks-kontejner?', a:['display: grid;','display: flex;','position: flex;','flex: container;'], c:1},
    {q:'Koji način čuva podatke u browseru i ostaje nakon reload-a?', a:['sessionStorage','localStorage','var storage','cookiesession'], c:1},
    {q:'Šta je JSON?', a:['Baza podataka','Format za razmjenu podataka','Tip funkcije u JS','Sistem šablona'], c:1},
    {q:'Koji atribut poboljšava dostupnost za opis slike?', a:['title','alt','aria','label'], c:1},
    {q:'Koji HTTP status označava uspjeh sa sadržajem?', a:['200','301','401','500'], c:0},
    {q:'Kako spriječiti podrazumijevani submit forme u JS?', a:['event.stop()','return false','event.preventDefault()','form.reset()'], c:2},
    {q:'Koja direktiva u CSS-u definiše medijske upite?', a:['@use','@media','@import','@query'], c:1},
    {q:'Koja je razlika između let i var?', a:['Nema razlike','let ima blok-scope, var funkcijski','var ima blok-scope, let funkcijski','let je hoisted, var nije'], c:1},
    {q:'Koji element se koristi za navigaciju?', a:['<footer>','<nav>','<aside>','<header>'], c:1},
    {q:'Koja CSS osobina kontroliše razmak između linija teksta?', a:['letter-spacing','line-height','word-spacing','text-indent'], c:1},
    {q:'Kako se u JS pravilan niz kopira plitko?', a:['const b = a;','const b = a.clone();','const b = [...a];','copy(a,b);'], c:2},
    {q:'Koji je ispravan način za komentare u CSS-u?', a:['// komentar','<!-- komentar -->','/* komentar */','-- komentar'], c:2},
    {q:'Koji header je važan za CORS odgovore?', a:['Access-Control-Allow-Origin','Content-Type','Accept','Authorization'], c:0},
    {q:'Šta radi metoda Array.prototype.map?', a:['Filtrira elemente','Transformiše u novi niz','Brisanje elemenata','Sortira opadajuće'], c:1},
    {q:'Koji je semantički element za dno stranice?', a:['<footer>','<bottom>','<down>','<end>'], c:0},
    {q:'Šta znači DRY u programiranju?', a:['Don\'t Repeat Yourself','Do Repeat Yourself','Debugging Requires You','Dynamic Runtime YAML'], c:0},
    {q:'Koji CSS modul omogućava dvo-dimenzionalni raspored?', a:['Flexbox','Grid','Float','Position'], c:1},
    {q:'Koja je preporučena širina sadržaja za čitljivost teksta?', a:['20-30 znakova u redu','45-75 znakova u redu','120-160 znakova u redu','Nije bitno'], c:1},
    {q:'Koji HTML atribut označava obavezno polje?', a:['placeholder','required','pattern','minlength'], c:1},
    {q:'Šta je debounce u JS-u?', a:['Odgoda poziva funkcije dok se događaji ne smire','Brže izvršenje funkcije','Paralelno izvršenje','Keširanje rezultata'], c:0},
    {q:'Koji tag je prikladan za samostalan sadržaj (blog post, kartica)?', a:['<article>','<div>','<section>','<span>'], c:0}
  ];

  currentQuestions: QuestionDisplay[] = [];
  score: number | null = null;
  submitted = false;

  ngOnInit() {
    this.generateNewQuiz();
  }

  generateNewQuiz() {
    this.submitted = false;
    this.score = null;
    
    // Pick 10 random questions
    const shuffled = [...this.questionBank].sort(() => Math.random() - 0.5);
    this.currentQuestions = shuffled.slice(0, 10).map(q => {
      // Shuffle answers
      const shuffledAnswers = q.a.map((text, originalIndex) => ({text, originalIndex}))
        .sort(() => Math.random() - 0.5);
      
      return {
        ...q,
        shuffledAnswers,
        userAnswer: undefined,
        isCorrect: undefined
      };
    });
  }

  selectAnswer(questionIndex: number, answerOriginalIndex: number) {
    if (!this.submitted) {
      this.currentQuestions[questionIndex].userAnswer = answerOriginalIndex;
    }
  }

  submit() {
    this.submitted = true;
    let correctCount = 0;

    this.currentQuestions.forEach(q => {
      if (q.userAnswer === q.c) {
        q.isCorrect = true;
        correctCount++;
      } else {
        q.isCorrect = false;
      }
    });

    this.score = correctCount;
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  retry() {
    this.generateNewQuiz();
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
}
