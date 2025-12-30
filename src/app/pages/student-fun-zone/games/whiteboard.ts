import { Component, ElementRef, ViewChild, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-whiteboard',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './whiteboard.html',
  styleUrl: './whiteboard.css'
})
export class Whiteboard implements AfterViewInit {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private ctx!: CanvasRenderingContext2D;
  private drawing = false;
  private lastX = 0;
  private lastY = 0;
  
  color = '#c30f10';
  size = 3;
  erasing = false;
  eraseBtnText = 'Briši';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      const canvas = this.canvasRef.nativeElement;
      this.ctx = canvas.getContext('2d')!;
      this.fitCanvas();
      window.addEventListener('resize', () => this.fitCanvas());
    }
  }

  fitCanvas() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.parentElement!.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = Math.max(400, window.innerHeight - 200);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  getPoint(e: MouseEvent | TouchEvent): {x: number, y: number} {
    if (!isPlatformBrowser(this.platformId)) return {x: 0, y: 0};
    
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  onStart(e: MouseEvent | TouchEvent) {
    if (!isPlatformBrowser(this.platformId)) return;
    
    this.drawing = true;
    const p = this.getPoint(e);
    this.lastX = p.x;
    this.lastY = p.y;
    e.preventDefault();
  }

  onMove(e: MouseEvent | TouchEvent) {
    if (!isPlatformBrowser(this.platformId) || !this.drawing) return;
    
    const p = this.getPoint(e);
    this.ctx.lineWidth = this.size;
    this.ctx.strokeStyle = this.erasing ? '#fff' : this.color;
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
    this.lastX = p.x;
    this.lastY = p.y;
    e.preventDefault();
  }

  onEnd() {
    this.drawing = false;
  }

  toggleErase() {
    this.erasing = !this.erasing;
    this.eraseBtnText = this.erasing ? 'Piši' : 'Briši';
  }

  clear() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.fitCanvas();
  }

  save() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const canvas = this.canvasRef.nativeElement;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'whiteboard.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}
