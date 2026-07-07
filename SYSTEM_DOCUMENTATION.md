# Snack Attack System Documentation

## 1. Overview

Snack Attack is a restaurant point-of-sale (POS) web application built with Next.js and React. It supports:

- A customer-facing POS order flow
- A manager/admin dashboard experience
- Menu browsing with item customization
- Payment handling with a modal and printable receipt
- Mock manager views for dashboard, transactions, inventory, and staff management

This project is currently a front-end prototype with local UI state and mock data. It is designed to be expanded into a full production system later.

---

## 2. Project Purpose

The system is intended to help a small food business manage:

- Order taking
- Item customization
- Payment collection
- Cashier interaction
- Manager-side oversight of sales, inventory, staff, and transactions

---

## 3. Tech Stack

- Framework: Next.js 15
- UI: React 19
- Language: TypeScript
- Styling: Tailwind CSS
- Icons: lucide-react
- Routing: Next.js App Router
- Animation: motion (available in package.json but not heavily used in current screens)

---

## 4. Project Structure

```text
app/
  admin/                 # Admin login screen
  manager/
    dashboard/           # Manager dashboard UI
    inventory/           # Inventory monitoring UI
    staff/               # Staff and permission UI
    transactions/       # Transaction audit UI
  pos/                   # Main POS order screen
  start-order/          # Order type selection screen
  page.tsx              # PIN entry / entrance screen
components/
  payment-modal.tsx     # Payment UI and keypad
  receipt-template.tsx  # Printable receipt template
lib/
  menuData.ts           # Menu catalog and definitions
public/images/menu/     # Menu assets
```

---

## 5. Main User Flows

### A. Entrance / PIN Screen

Entry point: [app/page.tsx](app/page.tsx)

Responsibilities:
- Displays a simple PIN entry screen
- Lets the user enter a 4-digit PIN
- Redirects to the order-start flow when PIN is `0000`
- Provides a shortcut to the admin login page

Current behavior:
- PIN logic is UI-only and does not connect to real authentication
- A hardcoded success path exists for `0000`

### B. Start Order Flow

Entry point: [app/start-order/page.tsx](app/start-order/page.tsx)

Responsibilities:
- Welcomes the cashier or staff
- Lets the user choose an order type:
  - Dine In
  - Take Out
- Sends the user to the POS flow with a query parameter for order type

### C. POS Order Screen

Entry point: [app/pos/page.tsx](app/pos/page.tsx)

This is the primary ordering screen.

Responsibilities:
- Displays product categories on the left sidebar
- Shows products by category and supports searching
- Lets the user add products to cart
- Supports product customization for items with sizes, add-ons, shake flavors, burger add-ons, siomai options, and milk tea flavors
- Calculates item totals and displays the cart summary
- Opens the payment modal when the checkout action is triggered

Important implementation notes:
- Product data is generated from [lib/menuData.ts](lib/menuData.ts)
- Product categories are mapped from menu item categories into internal category IDs
- Cart state is maintained locally in component state
- The current system uses simple local state and does not persist orders to a database

### D. Payment Flow

Component: [components/payment-modal.tsx](components/payment-modal.tsx)

Responsibilities:
- Shows the current order total
- Lets the user enter the amount tendered using a keypad
- Calculates change due
- Supports quick-cash amounts and exact-payment selection
- Prints a receipt and closes the modal

### E. Receipt Generation

Component: [components/receipt-template.tsx](components/receipt-template.tsx)

Responsibilities:
- Renders a printable receipt layout
- Displays order number, order type, ordered items, and total due
- Uses CSS print styling to hide/show print content appropriately

---

## 6. Manager/Admin Experience

### A. Admin Login

Entry point: [app/admin/page.tsx](app/admin/page.tsx)

Responsibilities:
- Presents a simple login form
- Accepts a demo email/password combination
- Redirects to the manager dashboard on success

Current behavior:
- Authentication is mocked and not backed by a real auth system
- The login form is a UI prototype

### B. Manager Dashboard

Entry point: [app/manager/dashboard/page.tsx](app/manager/dashboard/page.tsx)

Responsibilities:
- Provides a dashboard-style overview of the restaurant operations
- Displays mocked KPIs such as revenue, orders, and inventory alerts
- Includes a mock chart area and recent activity feed

### C. Transactions Page

Entry point: [app/manager/transactions/page.tsx](app/manager/transactions/page.tsx)

Responsibilities:
- Shows transactions in a table-like list
- Includes mocked transaction records and a detail panel for selected orders
- Supports view-only audit-style inspection of completed and voided orders

### D. Inventory Page

Entry point: [app/manager/inventory/page.tsx](app/manager/inventory/page.tsx)

Responsibilities:
- Presents a mocked inventory management dashboard
- Tracks ingredient stock levels, thresholds, and mapping count
- Displays a switch for toggling ingredients online/offline in POS
- Includes an ingredient mapping panel and alert threshold input

### E. Staff Page

Entry point: [app/manager/staff/page.tsx](app/manager/staff/page.tsx)

Responsibilities:
- Displays mock staff performance and attendance data
- Shows role-based permission toggles
- Provides a visual layout for staffing and access control concepts

---

## 7. Menu Data Model

The menu data is centralized in [lib/menuData.ts](lib/menuData.ts).

### Main Menu Item Shape

Each item includes:
- id
- name
- category
- basePrice
- sizes (optional)
- addOns (optional)
- description (optional)
- comboItems (optional)
- image (optional)

### Important Note

The POS screen transforms this data into a local product structure with additional flags for:
- size-based products
- add-ons
- shake flavors
- burger addons
- siomai choice
- milk tea flavors

This transformation happens inside [app/pos/page.tsx](app/pos/page.tsx).

---

## 8. State and Data Flow

### Local Component State

The app uses React state heavily in the main screens:
- cart contents
- selected product customization options
- order type
- payment input
- sidebar navigation state
- modal visibility

### Routing Parameters

The order type is passed using URL query parameters:
- `/pos?orderType=dine-in`
- `/pos?orderType=take-out`

### Current Data Storage

At the moment, data is not persisted to a backend. The app relies on:
- local component state
- hardcoded mock arrays
- client-side navigation and rendering

---

## 9. Current Limitations

Developers should be aware of the following before extending the system:

- No real authentication backend is implemented
- No real database is connected
- Orders and transactions are not truly stored
- Inventory is mock data and not connected to live stock updates
- Payment processing is UI-only and does not integrate with real payment gateways
- Receipts are printable but not sent to an external service

---

## 10. Suggested Future Improvements

### High Priority

- Connect the app to a real backend or database
- Implement proper authentication and authorization
- Save orders, payments, and transactions to persistent storage
- Replace mock inventory logic with real stock management

### Medium Priority

- Add API endpoints for menu management
- Support role-based permissions for cashiers and managers
- Add reporting and export features
- Introduce real-time updates for inventory and sales

### Nice to Have

- Receipt email/SMS support
- Print server integration
- Kitchen display system
- Mobile-friendly enhancements
- Admin analytics dashboard

---

## 11. Development Commands

From the project root:

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run build
npm run lint
```

---

## 12. Suggested Mental Model for Future Developers

When working on this project, think of it in three layers:

1. Presentation Layer
   - Pages and components in [app/](app/) and [components/](components/)

2. Business Logic Layer
   - Product customization logic, cart calculations, and order state inside [app/pos/page.tsx](app/pos/page.tsx)

3. Data Layer
   - Menu definitions in [lib/menuData.ts](lib/menuData.ts)
   - Future backend/database integration should be added here

---

## 13. Notes for the Next Developer

If you are continuing this project, the most important place to understand first is the POS flow in [app/pos/page.tsx](app/pos/page.tsx). That file contains the core ordering logic, cart behavior, customization rules, and checkout handoff.

The second important area is [lib/menuData.ts](lib/menuData.ts), because it defines the menu catalog and the data shape used throughout the app.

---

## 14. Summary

Snack Attack is a polished front-end prototype for a food service POS system. It currently focuses on:

- order entry
- customization
- checkout
- mock manager/admin screens

It is well-structured for future expansion into a full restaurant management platform.
