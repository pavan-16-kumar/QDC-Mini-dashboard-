# QDC Mini Assignment: Theoretical Answers

This file contains detailed, reasoned answers to the theoretical questions on system design, database scaling, API patterns, frontend architectures, domain modeling, security/QA review, and real-time synchronization in a retail dry-cleaning software context.

---

## ## 1. Production Scaling of Data Access & Service Design

In the current NestJS backend, orders are stored as an in-memory array (`const ORDERS = [...]`) directly inside `orders.service.ts`. If evolved into a production Quick Dry Cleaning (QDC) platform processing thousands of active orders daily with hundreds of concurrent POS terminals and mobile clients, this in-memory architecture would cause severe data loss (on restarts), memory exhaustion, and race conditions.

### Recommended Architectural Evolution:
1. **Persistent Relational Database (DBMS)**:
   * We would transition to a robust relational database such as **PostgreSQL** or **MySQL**. Relational databases are highly suitable for QDC since dry-cleaning transactions involve strict tabular mappings with foreign key relations (e.g., an Order contains multiple Garments; a Garment transitions through sequential states; Customers map to Orders; Payments map to Orders).
2. **Object-Relational Mapping (ORM)**:
   * Implement **Prisma** or **TypeORM** in the NestJS application. This allows declarative schema definitions, migrations, and strict type safety across the database and service layers.
3. **Pagination & Query Optimization**:
   * The current `findAll()` method returns the entire dataset at once. In production, this must be refactored to support **cursor-based or offset-based pagination** (using limit/take and offset/skip parameters) to prevent transferring megabytes of JSON data over the network.
   * Add database-level indexes on frequently queried fields like `orders.id`, `orders.customer_id`, `orders.created_at`, and `garments.status`.
4. **Caching & Scaling State**:
   * Introduce a caching layer using **Redis** for read-heavy operations, such as displaying the daily active order board or lookups of master garments/service pricing catalogs.
   * Make the NestJS application instances stateless so they can scale horizontally behind a load balancer (e.g., NGINX or AWS ALB).

---

## ## 2. Tradeoffs of Return Unions vs. Standard API Error Design

The `GET /api/orders/:id` endpoint currently has the following signature:
```typescript
getOrder(@Param('id') id: string): Order | { error: string }
```
When an order is not found, the server returns `{ error: "Order with id ORD-XXXX not found" }` with an **HTTP Status Code of `200 OK`**.

### Tradeoffs of the Current Design:
*   **Downside (Non-Standard HTTP Status)**: Returning a `200 OK` for an operation that actually failed violates RESTful conventions. Client-side HTTP clients (like Axios, Fetch, or React Query) rely on HTTP response codes (e.g., `4xx` and `5xx`) to automatically trigger error states, retry loops, or display error banners.
*   **Downside (Fragile Client Integration)**: The client has to manually inspect the JSON structure (`if ('error' in data)`) to discover if a resource exists, which increases boilerplates and increases risks of bugs.
*   **Downside (Security & Monitoring)**: API Gateways and performance monitors (like Datadog or New Relic) count all `200 OK` responses as successful, masking critical integration failures or missing records.

### Real-World Improvements:
1. **NestJS Built-in Exceptions**:
   * Replace the return union with standard NestJS exceptions. If the service returns `undefined`, throw a `NotFoundException` from `@nestjs/common`.
   ```typescript
   @Get(':id')
   getOrder(@Param('id') id: string): Order {
     const order = this.ordersService.findOne(id);
     if (!order) {
       throw new NotFoundException(`Order with id ${id} not found`);
     }
     return order;
   }
   ```
2. **Consistent JSON Error Payloads**:
   * This automatically produces a standardized RFC-compliant error payload with a `404 Not Found` status:
   ```json
   {
     "statusCode": 404,
     "message": "Order with id ORD-XXXX not found",
     "error": "Not Found"
   }
   ```
   This is easily caught by frontend error boundaries and API interceptors.

---

## ## 3. Frontend Architecture for Complex & Scalable Dashboards

Currently, `App.tsx` directly performs a standard `fetch` call within a raw `useEffect` hook:
```typescript
const res = await fetch('http://localhost:3001/api/orders');
```
As the dashboard grows to include advanced filters, paginate through search results, handle multiple simultaneous API requests, and update states, this pattern will lead to state synchronization hell, double-fetching bugs, and tightly-coupled component code.

### Recommended Frontend Refactoring:
1. **Introduce a Data Fetching Library**:
   * Integrate **TanStack Query (React Query)** or **SWR**.
   * It handles automatic caching, background re-fetching, deduplication of concurrent requests, unified loading/error/success states, and out-of-the-box pagination/infinite-scroll helpers.
2. **Encapsulate APIs into a Service Layer**:
   * Create an API/client client using **Axios** with structured custom hook functions (e.g., `useOrders({ status, page, search })`).
   ```typescript
   // src/hooks/useOrders.ts
   export const useOrders = (filters: FilterParams) => {
     return useQuery(['orders', filters], () => ordersApi.getOrders(filters));
   };
   ```
3. **State Management Separation**:
   * Keep UI presentation components purely presentational.
   * Move complex dashboard states (like current active page, text query, custom status toggles) into lightweight, global state managers like **Zustand** or use React Context for dashboard-scoped states. This isolates routing/filtering state from UI rendering state.

---

## ## 4. Domain Modeling & Gaps in Dry-Cleaning Retail Workflows

In a laundry operations engine, dry cleaning orders are far more complex than standard e-commerce carts because garments undergo cyclical multi-step procedures, involve pricing adjustments, require tracking tags, and deal with payment/delivery logistics.

### Critical Missing Fields in the Current Models:
*   **Garment level**:
    *   `price: number`: Every specific garment type has a distinct processing rate (e.g., Coat dry cleaning vs. Shirt wash & press).
    *   `barcode / RfidTag: string`: Used to scan physical garments as they pass through sorting machines, wash drums, press stations, and bagging lines.
    *   `serviceType: 'dry_clean' | 'wash_and_fold' | 'ironing'`: The exact type of care required.
    *   `defects / Notes: string[]`: Standard retail dry cleaning inspects and logs pre-existing stains, loose buttons, or tears upon reception to protect the business from liability.
*   **Order level**:
    *   `paymentStatus: 'unpaid' | 'partial' | 'paid'`: POS terminals must know whether an order was paid at drop-off or requires settlement at pickup.
    *   `totalAmount: number`: Aggregated price of all garments + taxes - discounts.
    *   `dueAt: string (ISO)`: The scheduled completion time. A core SLA metric for dry cleaners.
    *   `customerPhone / customerEmail: string`: Essential for sending automated notifications when orders transition to `ready`.

### Evolved Domain Schema Example:
```typescript
export interface Garment {
  id: string;
  description: string;
  serviceType: 'dry_clean' | 'wash_fold' | 'press_only';
  status: GarmentStatus;
  price: number;
  rfidTag?: string;
  preExistingDefects?: string[];
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  dueAt: string;
  garments: Garment[];
  totalAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  deliveryMethod: 'pickup' | 'home_delivery';
  deliveryAddress?: string;
}
```

---

## ## 5. AI-Generated Code: Risks, Reviews, & Verification Protocols

Relying on code partially generated by AI tools introduces unique engineering risks that require rigorous software validation pipelines.

### Potential Risks in QDC Workflows:
*   **Silent Failures & Off-by-One Logic**: AI-generated code might write filtering or reduction logic that silently drops edge cases (e.g., treating garments with undefined statuses as empty rather than catching them).
*   **Security Vulnerabilities**: Potential for SQL Injection or insecure parameters if the AI writes raw database queries without parameterized inputs.
*   **Memory/Performance Gaps**: Inefficient looping or missing index constraints that work fine with 2 mock orders but crash the application with 10,000 active records in production.

### Essential QA & Review Practices:
1. **Strict Static Analysis & Linters**:
   * Enforce ESLint, Prettier, and TypeScript configuration flags (`strict: true`, `noImplicitAny: true`) to catch typings and syntax anomalies automatically.
2. **Automated Testing Matrix**:
   * Write **Unit Tests (Jest)** covering core business functions (e.g., checking status reduction logic, payment calculations, filter hooks).
   * Write **End-to-End Tests (Cypress/Playwright)** simulating the physical flow of standard dry cleaning operations.
3. **Rigorous Peer Reviews & Architecture Audits**:
   * Conduct human developer reviews focusing on complexity, edge cases, error codes, and compliance with the existing clean code conventions in the repo.

---

## ## 6. Real-Time Status Synchronization Architecture

Displaying active garments on a status board that updates in real-time as staff scans garments is critical for high-efficiency laundry operations.

### Proposed Implementation Approaches:

#### Option A: WebSockets (Recommended for highly interactive POS dashboards)
*   **Implementation**: Create a NestJS WebSocket Gateway (using Socket.io) in the backend. When a garment's status changes, the server broadcasts a lightweight event to connected clients.
*   **Tradeoffs**: 
    *   *Pros*: Ultra-low latency (millisecond updates), bi-directional socket connections.
    *   *Cons*: Stateful connections require load balancers to support sticky sessions; higher memory utilization per client.

#### Option B: Server-Sent Events (SSE) (Ideal for read-only displays/status boards)
*   **Implementation**: Expose an HTTP `/api/orders/status-stream` SSE endpoint in NestJS returning an observable event-stream. The frontend uses the standard `EventSource` API.
*   **Tradeoffs**:
    *   *Pros*: Lightweight, native browser support, operates over standard HTTP/2, automatically handles reconnects.
    *   *Cons*: One-way communication only (server to client), which is perfectly fine for display dashboards.

#### Option C: Short/Long Polling
*   **Implementation**: Frontend makes repeated HTTP GET requests every 5-10 seconds.
*   **Tradeoffs**:
    *   *Pros*: Extremely simple to code; requires no stateful connection servers.
    *   *Cons*: Creates massive unnecessary server overhead and network traffic, especially with thousands of active POS users. Not scalable.
