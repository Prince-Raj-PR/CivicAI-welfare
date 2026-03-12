export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">About CivicAI</h1>
        <p className="text-xl text-gray-600">
          Democratizing access to government assistance programs through AI
        </p>
      </div>

      <div className="prose prose-lg mx-auto">
        <p>
          CivicAI is an AI-powered platform designed to simplify and democratize access to 
          government assistance programs. Our mission is to help eligible citizens discover 
          and apply for welfare programs they qualify for.
        </p>

        <h2>Our Mission</h2>
        <p>
          We believe that everyone deserves access to the support they need. By leveraging 
          artificial intelligence, we're breaking down barriers and making it easier for 
          people to find the help they're entitled to.
        </p>

        <h2>How It Works</h2>
        <p>
          Our platform uses advanced AI algorithms to match your personal circumstances 
          with available programs, providing personalized recommendations and guidance 
          throughout the application process.
        </p>
      </div>
    </div>
  )
}