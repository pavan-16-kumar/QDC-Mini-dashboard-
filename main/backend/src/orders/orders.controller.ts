import { Controller, Get, Param, Put, Body, Post, BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService, Order } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  getOrders(): Order[] {
    return this.ordersService.findAll();
  }

  @Get('summary')
  getGarmentSummary(): { [status: string]: number } {
    return this.ordersService.getGarmentStatusSummary();
  }

  @Get(':id')
  getOrder(@Param('id') id: string): Order | { error: string } {
    const order = this.ordersService.findOne(id);
    if (!order) {
      return { error: `Order with id ${id} not found` };
    }
    return order;
  }

  @Put(':orderId/garments/:garmentId/status')
  updateGarmentStatus(
    @Param('orderId') orderId: string,
    @Param('garmentId') garmentId: string,
    @Body('status') status: any,
  ): Order {
    const updated = this.ordersService.updateGarmentStatus(orderId, garmentId, status);
    if (!updated) {
      throw new NotFoundException(`Order ${orderId} or garment ${garmentId} not found`);
    }
    return updated;
  }

  @Post()
  createOrder(
    @Body('customerName') customerName: any,
    @Body('customerPhone') customerPhone: any,
    @Body('garments') garments: any,
  ): Order {
    if (!customerName || typeof customerName !== 'string' || customerName.trim() === '') {
      throw new BadRequestException('Customer name is required and must be a valid string');
    }
    const phone = typeof customerPhone === 'string' ? customerPhone.trim() : '';
    if (!garments || !Array.isArray(garments) || garments.length === 0) {
      throw new BadRequestException('Garments array is required and must contain at least one item');
    }
    const cleanGarments = garments.map((g: any) => {
      if (!g || !g.description || typeof g.description !== 'string' || g.description.trim() === '') {
        throw new BadRequestException('Each garment must have a valid non-empty description');
      }
      return { description: g.description.trim() };
    });
    return this.ordersService.createOrder(customerName.trim(), phone, cleanGarments);
  }
}
