# 🚀 CivicAI – AI-Powered Welfare Eligibility & Government Scheme Discovery Platform

### Empowering Citizens Through Intelligent Access to Government Welfare Programs

CivicAI is an AI-powered welfare eligibility and government scheme discovery platform that helps citizens identify, understand, and access government benefits with ease. By leveraging Large Language Models (LLMs) through Groq AI, the platform analyzes user information, evaluates eligibility criteria, and recommends the most relevant welfare schemes tailored to individual needs.

Traditional government portals often require users to manually search through hundreds of schemes and interpret complex eligibility requirements. CivicAI simplifies this process by providing personalized recommendations, eligibility insights, document guidance, and direct access to official application portals—all through an intuitive and user-friendly experience.

---

## ✨ Features

### 🤖 AI-Powered Eligibility Engine
- Intelligent eligibility assessment using Groq LLMs
- Personalized welfare scheme recommendations
- Context-aware analysis of user information
- Transparent eligibility reasoning

### 🔍 Smart Government Scheme Discovery
- Browse and explore welfare programs
- Search and filter schemes efficiently
- Detailed scheme information and benefits
- Easy-to-understand eligibility criteria

### 🎯 Personalized Recommendations
- AI-generated welfare suggestions
- Priority-based scheme ranking
- Tailored recommendations based on user profile
- Improved discoverability of government benefits

### 📄 Application Assistance
- Required document guidance
- Eligibility requirement breakdown
- Direct access to official application portals
- Simplified application preparation

### 🔐 Secure Authentication
- JWT-based authentication system
- Secure user registration and login
- Protected routes and user dashboard
- Personalized user experience

### 📱 Modern Responsive Interface
- Mobile-first responsive design
- Fast and intuitive navigation
- Accessible user experience
- Clean and modern UI

---

## 🏗️ Architecture

```text
┌─────────────────────┐
│      User Input     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   React Frontend    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Express.js Backend  │
└──────────┬──────────┘
           │
   ┌───────┼────────┐
   │       │        │
   ▼       ▼        ▼
Authentication  Scheme DB  AI Eligibility Engine
   │                     │
   └─────────┬───────────┘
             ▼
         Groq AI API
             │
             ▼
      Personalized Results
```

---

## 🛠️ Tech Stack

### Frontend
- React.js
- Vite
- Tailwind CSS
- React Router DOM
- Axios
- Framer Motion

### Backend
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT Authentication

### AI Integration
- Groq API
- Llama Models
- AI-Powered Eligibility Analysis

### Deployment
- Vercel (Frontend)
- Render (Backend)
- MongoDB Atlas (Database)

---

## ⚡ How It Works

### Step 1: User Profile Submission
Users provide basic demographic and financial information.

### Step 2: Eligibility Analysis
The platform processes user details and prepares eligibility parameters.

### Step 3: AI Evaluation
Groq AI analyzes user information against welfare program criteria.

### Step 4: Scheme Matching
Relevant government schemes are identified and ranked.

### Step 5: Personalized Recommendations
Users receive tailored welfare suggestions along with eligibility insights.

### Step 6: Application Access
Users can directly navigate to official government portals to apply.

---

## 🎯 Problem Statement

Millions of eligible citizens miss out on government welfare benefits due to:

- Lack of awareness about available schemes
- Complex eligibility requirements
- Information scattered across multiple websites
- Difficult navigation and application processes

CivicAI addresses these challenges by creating a centralized AI-powered platform that simplifies welfare discovery and improves accessibility to public benefits.

---

## 🚀 Impact

- Simplifies access to welfare information
- Increases awareness of government programs
- Reduces information barriers for citizens
- Improves welfare scheme discoverability
- Enhances digital inclusion through AI

---

## 🔮 Future Enhancements

- Multilingual Support
- Voice-Based Eligibility Assistant
- OCR-Based Document Verification
- State-Specific Welfare Recommendations
- Real-Time Scheme Updates
- Agentic AI Welfare Advisor
- Personalized Benefit Tracking Dashboard

---

## 🌐 Live Demo

**Website:**  
https://civicai-welfare.vercel.app

**GitHub Repository:**  
https://github.com/Prince-Raj-PR/CivicAI-welfare

---

## 👨‍💻 Author

**Prince Raj**

B.Tech Computer Science Student | Full Stack Developer | AI & Cybersecurity Enthusiast

Building technology that makes government welfare programs more accessible, understandable, and impactful through Artificial Intelligence.
