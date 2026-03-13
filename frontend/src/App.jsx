import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import ProgramsPage from './pages/ProgramsPage'
import ContactPage from './pages/ContactPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import EmailVerificationPendingPage from './pages/EmailVerificationPendingPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="programs" element={<ProgramsPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="email-verification-pending" element={<EmailVerificationPendingPage />} />
      </Route>
    </Routes>
  )
}

export default App