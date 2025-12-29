import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

interface KanbanCard {
  id: number;
  text: string;
}

@Component({
  selector: 'app-kanban',
  imports: [RouterLink, CommonModule],
  templateUrl: './kanban.html',
  styleUrl: './kanban.css'
})
export class Kanban {
  private nextId = 4;
  
  todoCards: KanbanCard[] = [{id: 1, text: 'Nova kartica'}];
  doingCards: KanbanCard[] = [{id: 2, text: 'Nova kartica'}];
  doneCards: KanbanCard[] = [{id: 3, text: 'Nova kartica'}];
  
  draggedCard: KanbanCard | null = null;
  draggedFrom: 'todo' | 'doing' | 'done' | null = null;

  addCard(column: 'todo' | 'doing' | 'done') {
    const newCard: KanbanCard = {
      id: this.nextId++,
      text: 'Nova kartica'
    };
    this.getColumn(column).push(newCard);
  }

  deleteCard(column: 'todo' | 'doing' | 'done', card: KanbanCard, event: Event) {
    event.stopPropagation();
    if (confirm('Obrisati karticu?')) {
      const col = this.getColumn(column);
      const index = col.indexOf(card);
      if (index > -1) {
        col.splice(index, 1);
      }
    }
  }

  clearColumn(column: 'todo' | 'doing' | 'done') {
    if (confirm('Obrisati sve kartice u koloni?')) {
      this.getColumn(column).length = 0;
    }
  }

  onDragStart(card: KanbanCard, column: 'todo' | 'doing' | 'done', event: DragEvent) {
    this.draggedCard = card;
    this.draggedFrom = column;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', '');
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(targetColumn: 'todo' | 'doing' | 'done', event: DragEvent) {
    event.preventDefault();
    
    if (!this.draggedCard || !this.draggedFrom) return;

    // Remove from source column
    const sourceCol = this.getColumn(this.draggedFrom);
    const index = sourceCol.indexOf(this.draggedCard);
    if (index > -1) {
      sourceCol.splice(index, 1);
    }

    // Add to target column
    const targetCol = this.getColumn(targetColumn);
    
    // Find drop position
    const laneElement = (event.target as HTMLElement).closest('.lane');
    if (laneElement) {
      const cards = Array.from(laneElement.querySelectorAll('.card:not(.dragging)'));
      const dropIndex = cards.findIndex(cardEl => {
        const rect = cardEl.getBoundingClientRect();
        return event.clientY <= rect.top + rect.height / 2;
      });
      
      if (dropIndex === -1) {
        targetCol.push(this.draggedCard);
      } else {
        targetCol.splice(dropIndex, 0, this.draggedCard);
      }
    } else {
      targetCol.push(this.draggedCard);
    }

    this.draggedCard = null;
    this.draggedFrom = null;
  }

  onDragEnd() {
    this.draggedCard = null;
    this.draggedFrom = null;
  }

  private getColumn(column: 'todo' | 'doing' | 'done'): KanbanCard[] {
    switch (column) {
      case 'todo': return this.todoCards;
      case 'doing': return this.doingCards;
      case 'done': return this.doneCards;
    }
  }

  trackByCardId(index: number, card: KanbanCard): number {
    return card.id;
  }
}
