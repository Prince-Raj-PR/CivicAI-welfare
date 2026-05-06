import { useRef, useState } from 'react'
import PropTypes from 'prop-types'

export default function OTPInput({ length = 6, value, onChange, error }) {
  const [otp, setOtp] = useState(value || Array(length).fill(''))
  const inputRefs = useRef([])

  const handleChange = (index, digit) => {
    if (!/^\d*$/.test(digit)) return // Only allow digits

    const newOtp = [...otp]
    newOtp[index] = digit.slice(-1) // Only take last digit
    setOtp(newOtp)

    // Call onChange with complete OTP string
    onChange(newOtp.join(''))

    // Auto-focus next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }

    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, length)
    
    if (!/^\d+$/.test(pastedData)) return // Only allow digits

    const newOtp = pastedData.split('')
    while (newOtp.length < length) {
      newOtp.push('')
    }
    
    setOtp(newOtp)
    onChange(newOtp.join(''))

    // Focus last filled input or last input
    const lastFilledIndex = Math.min(pastedData.length, length - 1)
    inputRefs.current[lastFilledIndex]?.focus()
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 justify-center">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 transition-all ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
            } ${digit ? 'bg-blue-50' : 'bg-white'}`}
            autoComplete="off"
          />
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  )
}

OTPInput.propTypes = {
  length: PropTypes.number,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
}
