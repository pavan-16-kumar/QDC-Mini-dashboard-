import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export type GarmentStatus = 'received' | 'in_cleaning' | 'ready' | 'delivered';

export interface Garment {
  id: string;
  description: string;
  status: GarmentStatus;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  createdAt: string; // ISO string
  garments: Garment[];
}

const DEFAULT_ORDERS: Order[] = [
  {
    id: 'ORD-1001',
    customerName: 'Alice Johnson',
    customerPhone: '+1 (555) 019-8234',
    createdAt: new Date().toISOString(),
    garments: [
      { id: 'G-1', description: 'Blue Shirt', status: 'received' },
      { id: 'G-2', description: 'Black Trousers', status: 'in_cleaning' },
    ],
  },
  {
    id: 'ORD-1002',
    customerName: 'Bob Singh',
    customerPhone: '+1 (555) 014-9982',
    createdAt: new Date().toISOString(),
    garments: [
      { id: 'G-3', description: 'Wedding Gown', status: 'ready' },
    ],
  },
];

@Injectable()
export class OrdersService {
  private filePath = path.join(process.cwd(), 'orders.json');

  private loadOrders(): Order[] {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to read orders from file, returning default orders:', error);
    }
    
    // If file doesn't exist or failed to load, initialize with defaults
    this.saveOrders(DEFAULT_ORDERS);
    return DEFAULT_ORDERS;
  }

  private saveOrders(orders: Order[]): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(orders, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save orders to file:', error);
    }
  }

  findAll(): Order[] {
    return this.loadOrders();
  }

  findOne(id: string): Order | undefined {
    const orders = this.loadOrders();
    return orders.find((o) => o.id === id);
  }

  getGarmentStatusSummary(): { [status: string]: number } {
    const orders = this.loadOrders();
    const summary: { [status: string]: number } = {};
    for (const order of orders) {
      if (!order.garments) continue;
      for (const garment of order.garments) {
        summary[garment.status] = (summary[garment.status] || 0) + 1;
      }
    }
    return summary;
  }

  updateGarmentStatus(orderId: string, garmentId: string, newStatus: GarmentStatus): Order | undefined {
    const orders = this.loadOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return undefined;
    const garment = order.garments.find((g) => g.id === garmentId);
    if (!garment) return undefined;
    garment.status = newStatus;
    this.saveOrders(orders);
    return order;
  }

  createOrder(customerName: string, customerPhone: string, garments: { description: string }[]): Order {
    const orders = this.loadOrders();
    const nextOrderNumber = orders.length + 1001;
    const orderId = `ORD-${nextOrderNumber}`;
    
    // Find the max garment index to avoid duplicate IDs
    let maxGarmentNum = 0;
    for (const order of orders) {
      if (!order.garments) continue;
      for (const g of order.garments) {
        const num = parseInt(g.id.replace('G-', ''), 10);
        if (!isNaN(num) && num > maxGarmentNum) {
          maxGarmentNum = num;
        }
      }
    }
    
    const createdGarments: Garment[] = garments.map((g, index) => ({
      id: `G-${maxGarmentNum + index + 1}`,
      description: g.description,
      status: 'received',
    }));
    
    const newOrder: Order = {
      id: orderId,
      customerName,
      customerPhone,
      createdAt: new Date().toISOString(),
      garments: createdGarments,
    };
    
    orders.push(newOrder);
    this.saveOrders(orders);
    return newOrder;
  }
}

