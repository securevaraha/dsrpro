# DSR - Receipt & Payment Management System

A comprehensive ERP solution for managing receipts, payments, vendors, and generating detailed financial reports.

## Features

- **Dashboard**: Overview of business summary with key metrics
- **Vendor Management**: Complete vendor profiles with payment history
- **Receipt Management**: Digital receipt creation with document attachments
- **Payment Management**: Payment tracking with vendor association
- **Reports**: Advanced reporting with filtering and export capabilities
- **User Management**: Role-based access control (Admin, Agent, Vendor)
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

### Vendor Management
- CRUD operations for vendors
- Status management (Active/Inactive)
- Search and filter functionality

### Receipt & Payment Management
- Auto-generated receipt/payment numbers
- Multiple payment methods support
- Document attachment capability
- Print and download functionality

### Reports
- Multiple report types (Summary, Receipt, Payment, Vendor)
- Date range filtering
- Vendor and payment method filtering
- Excel and PDF export

### Authentication
- Secure user registration and login
- Role-based access control
- JWT token management
- Password hashing with bcrypt

## API Endpoints

- `POST /api/auth/signin` - User login
- `POST /api/auth/signup` - User registration
- `GET /api/vendors` - Get all vendors
- `POST /api/vendors` - Create vendor
- `GET /api/receipts` - Get all receipts
- `POST /api/receipts` - Create receipt
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Create payment

## Database Models

- **User**: Authentication and user management
- **Vendor**: Vendor information and settings
- **Receipt**: Receipt entries with payment details
- **Payment**: Payment entries with vendor association

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
