import { Component, ElementRef, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface BoardItem {
  id: number;
  type: 'note' | 'image' | 'quote';
  content: string;
  color?: string;
  x: number;
  y: number;
}

@Component({
  selector: 'app-visual-board',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './visual-board.html',
  styleUrl: './visual-board.css'
})
export class VisualBoard {
  @ViewChild('board', { static: false }) boardRef!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput', { static: false }) fileInputRef!: ElementRef<HTMLInputElement>;

  items: BoardItem[] = [];
  private nextId = 1;
  private draggedItem: BoardItem | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  predefinedImages = ['/slike/slika1.jpg', '/slike/slika2.jpg', '/slike/slika3.jpg', '/slike/slika4.jpg'];
  
  quotes = [
    'Svaka dovoljno napredna tehnologija jednaka je magiji. – Arthur C. Clarke',
    'Ne osnivajte zajednice. Zajednice već postoje. – Mark Zuckerberg',
    'Tehnologija je riječ koja opisuje nešto što još ne funkcioniše. – Douglas Adams',
    'Učenje nikad ne uništava um. – Leonardo da Vinci'
  ];

  colors = ['yellow', 'pink', 'green', 'blue'];

  addNote() {
    const color = this.colors[Math.floor(Math.random() * this.colors.length)];
    this.items.push({
      id: this.nextId++,
      type: 'note',
      content: '',
      color,
      x: Math.random() * 300,
      y: Math.random() * 200
    });
  }

  addImage() {
    const img = this.predefinedImages[Math.floor(Math.random() * this.predefinedImages.length)];
    this.items.push({
      id: this.nextId++,
      type: 'image',
      content: img,
      x: Math.random() * 300,
      y: Math.random() * 200
    });
  }

  addQuote() {
    const quote = this.quotes[Math.floor(Math.random() * this.quotes.length)];
    this.items.push({
      id: this.nextId++,
      type: 'quote',
      content: quote,
      x: Math.random() * 300,
      y: Math.random() * 200
    });
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.items.push({
        id: this.nextId++,
        type: 'image',
        content: e.target?.result as string,
        x: Math.random() * 300,
        y: Math.random() * 200
      });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  deleteItem(id: number, event: Event) {
    event.stopPropagation();
    this.items = this.items.filter(item => item.id !== id);
  }

  onMouseDown(item: BoardItem, event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('delete-btn')) return;
    if ((event.target as HTMLElement).tagName === 'TEXTAREA') return;
    
    this.draggedItem = item;
    const board = this.boardRef.nativeElement;
    const rect = board.getBoundingClientRect();
    this.dragOffsetX = event.clientX - rect.left - item.x;
    this.dragOffsetY = event.clientY - rect.top - item.y;
    event.preventDefault();
  }

  onMouseMove(event: MouseEvent) {
    if (!this.draggedItem) return;
    
    const board = this.boardRef.nativeElement;
    const rect = board.getBoundingClientRect();
    this.draggedItem.x = event.clientX - rect.left - this.dragOffsetX;
    this.draggedItem.y = event.clientY - rect.top - this.dragOffsetY;
  }

  onMouseUp() {
    this.draggedItem = null;
  }

  onTouchStart(item: BoardItem, event: TouchEvent) {
    if ((event.target as HTMLElement).classList.contains('delete-btn')) return;
    if ((event.target as HTMLElement).tagName === 'TEXTAREA') return;
    
    this.draggedItem = item;
    const board = this.boardRef.nativeElement;
    const rect = board.getBoundingClientRect();
    const touch = event.touches[0];
    this.dragOffsetX = touch.clientX - rect.left - item.x;
    this.dragOffsetY = touch.clientY - rect.top - item.y;
    event.preventDefault();
  }

  onTouchMove(event: TouchEvent) {
    if (!this.draggedItem) return;
    
    const board = this.boardRef.nativeElement;
    const rect = board.getBoundingClientRect();
    const touch = event.touches[0];
    this.draggedItem.x = touch.clientX - rect.left - this.dragOffsetX;
    this.draggedItem.y = touch.clientY - rect.top - this.dragOffsetY;
  }

  onTouchEnd() {
    this.draggedItem = null;
  }

  clear() {
    if (confirm('Obrisati sve sa ploče?')) {
      this.items = [];
    }
  }

  async save() {
    const board = this.boardRef.nativeElement;
    
    // Using html2canvas if available, otherwise just alert
    if (typeof (window as any).html2canvas === 'function') {
      const canvas = await (window as any).html2canvas(board);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'vision-board.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else {
      alert('Za sačuvavanje slike potrebna je html2canvas biblioteka. Možete instalirati: npm install html2canvas');
    }
  }
}
