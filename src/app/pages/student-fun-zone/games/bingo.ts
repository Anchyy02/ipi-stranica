import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Cell {
  text: string;
  signed: boolean;
  initials: string;
  win: boolean;
}

@Component({
  selector: 'app-bingo',
  imports: [CommonModule, RouterLink],
  templateUrl: './bingo.html',
  styleUrl: './bingo.css'
})
export class Bingo implements OnInit {
  cells: Cell[][] = [];
  counts: { [key: string]: number } = {};
  bingoMsg = '';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    this.initBoard();
  }

  initBoard() {
    const data = [
      ['Putovao je van zemlje.', 'Letio je avionom.', 'Ima više od troje braće i sestara', 'Ima pet kućnih ljubimaca', 'Voli jesti kisele krastavce'],
      ['Igra košarku', 'Voli Disney-eve crtane filmove', 'Voli crtati', 'Voli HTML', 'Zna roniti'],
      ['Omiljena boja je narandžasta', 'Ne voli plažu', 'SLOBODAN PROSTOR', 'Dobar je u matematici', 'Nema kućne ljubimce'],
      ['Ne voli čokoladu', 'Boji se pauka', 'Voli peći kolače', 'Svira instrument', 'Alergičan je na mačke ili pse'],
      ['Slavi rođendan u oktobru', 'Voli jesti sir', 'Igra online igre', 'Ne voli pizzu', 'Voli pjevati']
    ];

    this.cells = data.map(row => row.map(text => ({
      text,
      signed: false,
      initials: '',
      win: false
    })));

    // Middle cell is free
    this.cells[2][2].signed = true;
  }

  toggleCell(r: number, c: number) {
    if (!isPlatformBrowser(this.platformId)) return;

    const cell = this.cells[r][c];
    if (cell.text === 'SLOBODAN PROSTOR') return;

    if (!cell.signed) {
      const entered = prompt('Unesite inicijale (1-3 slova):');
      if (entered === null) return;
      const key = (entered || '').trim().toUpperCase().slice(0, 3);
      if (!key) return;
      if ((this.counts[key] || 0) >= 2) {
        alert('Ta osoba je već potpisala dva puta.');
        return;
      }
      cell.signed = true;
      cell.initials = key;
      this.counts[key] = (this.counts[key] || 0) + 1;
    } else {
      const key = cell.initials;
      if (key) {
        this.counts[key] = Math.max(0, (this.counts[key] || 0) - 1);
      }
      cell.signed = false;
      cell.initials = '';
    }

    this.checkWin();
  }

  checkWin() {
    // Clear previous wins
    this.cells.forEach(row => row.forEach(c => c.win = false));
    
    let foundWin = false;
    const size = 5;

    // Check rows
    for (let r = 0; r < size; r++) {
      if (this.cells[r].every(c => c.signed)) {
        this.cells[r].forEach(c => c.win = true);
        foundWin = true;
      }
    }

    // Check columns
    for (let c = 0; c < size; c++) {
      if (this.cells.every(row => row[c].signed)) {
        this.cells.forEach(row => row[c].win = true);
        foundWin = true;
      }
    }

    // Check diagonals
    if (this.cells.every((row, i) => row[i].signed)) {
      this.cells.forEach((row, i) => row[i].win = true);
      foundWin = true;
    }
    if (this.cells.every((row, i) => row[size - 1 - i].signed)) {
      this.cells.forEach((row, i) => row[size - 1 - i].win = true);
      foundWin = true;
    }

    this.bingoMsg = foundWin ? '🎉 BINGO! Čestitamo!' : '';
  }

  resetBoard() {
    this.counts = {};
    this.bingoMsg = '';
    this.initBoard();
  }
}

