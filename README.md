# DSR - Receipt & Payment Management System

A comprehensive ERP solution for managing receipts, payments, POS machines, and generating detailed financial reports.

## Features

- **Dashboard**: Overview of business summary with key metrics
- **POS Machine Management**: Track and manage POS terminals assigned to agents
- **Receipt Management**: Digital receipt creation with document attachments
- **Payment Management**: Payment tracking with agent association
- **Reports**: Advanced reporting with filtering and export capabilities
- **User Management**: Role-based access control (Admin, Agent)
- **Authentication**: Secure login/signup with JWT tokens
- **Export**: Excel and PDF export functionality

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js, JWT, bcryptjs
- **UI Components**: Lucide React icons
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast
- **Export**: jsPDF, html2canvas, xlsx

## Setup Instructions

1. **Clone and Install**
   ```bash
   cd dsr-app
   npm install
   ```

2. **Environment Setup**
   Update `.env.local` with your MongoDB connection string:
   ```
   MONGODB_URI=mongodb://localhost:27017/dsr-app
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   JWT_SECRET=your-jwt-secret-here
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Access Application**
   Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js 13+ app directory
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard and main features
│   └── api/               # API routes
├── components/            # Reusable components
├── lib/                   # Utilities and configurations
├── models/                # MongoDB models
└── types/                 # TypeScript type definitions
```

## Key Features Implementation

### Dashboard
- Real-time statistics display
- Recent activity tracking
- Monthly/yearly overview

### POS Machine Management
- CRUD operations for POS terminals
- Track terminal assignments to agents
- Status management (Active/Inactive/Maintenance)

### Receipt & Payment Management
- Auto-generated receipt/payment numbers
- Multiple payment methods support
- Document attachment capability
- Print and download functionality

### Reports
- Multiple report types (Summary, Receipt, Payment, Agent)
- Date range filtering
- Agent and payment method filtering
- Excel and PDF export

### Authentication
- Secure user registration and login
- Role-based access control
- JWT token management
- Password hashing with bcrypt

## API Endpoints

- `POST /api/auth/signin` - User login
- `POST /api/auth/signup` - User registration
- `GET /api/pos-machines` - Get all POS machines
- `POST /api/pos-machines` - Create POS machine
- `GET /api/receipts` - Get all receipts
- `POST /api/receipts` - Create receipt
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Create payment

## Database Models

- **User**: Authentication and user management
- **POSMachine**: POS terminal tracking and assignment
- **Receipt**: Receipt entries with payment details
- **Payment**: Payment entries with agent association

## Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.# DSRPRO
