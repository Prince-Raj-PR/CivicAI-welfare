# CivicAI - AI-Powered Welfare Eligibility Engine

CivicAI is a full-stack web application that helps citizens discover and apply for welfare programs they qualify for using AI-powered eligibility assessment.

## 🚀 Project Status

### ✅ Completed Features

#### Frontend (React + JavaScript)
- ✅ Modern React application with Vite
- ✅ Responsive design with Tailwind CSS
- ✅ Complete UI component library (Button, Input, Card, Modal, etc.)
- ✅ Multi-page application with React Router
- ✅ Form validation with React Hook Form + Zod
- ✅ API integration layer
- ✅ Authentication pages (Login/Register)
- ✅ Email verification flow
- ✅ Programs browsing with search functionality
- ✅ Contact and About pages

#### Backend (Node.js + Express)
- ✅ RESTful API with Express.js
- ✅ Authentication system with JWT
- ✅ Email verification system with SMTP
- ✅ Password reset functionality
- ✅ Programs management endpoints
- ✅ Eligibility checking algorithm
- ✅ Input validation with express-validator
- ✅ Security middleware (CORS, Helmet, Rate Limiting)
- ✅ Error handling and logging
- ✅ Mock data for development

#### API Endpoints
- ✅ `POST /api/v1/auth/register` - User registration
- ✅ `POST /api/v1/auth/login` - User login
- ✅ `POST /api/v1/auth/verify-email` - Email verification
- ✅ `POST /api/v1/auth/resend-verification` - Resend verification email
- ✅ `POST /api/v1/auth/forgot-password` - Password reset request
- ✅ `PUT /api/v1/auth/reset-password/:token` - Password reset
- ✅ `GET /api/v1/auth/me` - Get current user
- ✅ `GET /api/v1/programs` - Get all programs
- ✅ `GET /api/v1/programs/search` - Search programs
- ✅ `POST /api/v1/eligibility/check` - Check eligibility
- ✅ `GET /api/v1/eligibility/history` - Get eligibility history

## 🛠 Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework
- **React Router** - Client-side routing
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Lucide React** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Nodemailer** - Email sending
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security headers
- **Morgan** - HTTP request logging

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Prince-Raj-PR/civicai-welfare.git
   cd civicai-welfare
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Configure SMTP settings in .env (see backend/SMTP_SETUP.md)
   npm run dev
   ```
   Backend runs on: http://localhost:8000

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend runs on: http://localhost:3000

### API Testing
- Health Check: http://localhost:8000/health
- Programs API: http://localhost:8000/api/v1/programs
- SMTP Test: http://localhost:8000/api/v1/test/email

### Email Configuration
See `backend/SMTP_SETUP.md` for detailed SMTP configuration instructions.

## 📁 Project Structure

```
civicai-welfare/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utilities and API calls
│   │   └── ...
│   └── package.json
├── backend/                 # Node.js backend API
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   └── server.js       # Main server file
│   └── package.json
├── design.md               # System design document
├── requirements.md         # Project requirements
└── README.md
```

## 🔄 Next Steps

### Immediate Tasks
- [ ] Connect authentication system between frontend and backend
- [ ] Implement eligibility checking UI
- [ ] Add user dashboard
- [ ] Implement application tracking

### Future Enhancements
- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] AI/ML model integration
- [ ] Email notifications
- [ ] Admin dashboard
- [ ] Real-time updates
- [ ] Mobile app

## 🤝 Contributing

This is a hackathon project. For development:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**CivicAI Team** - Making welfare programs accessible through AI