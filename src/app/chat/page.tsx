import ChatInterface from "@/components/ChatInterface";

export const metadata = {
  title: "Ask AI — Spaceship Logistics",
};

export default function ChatPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Spaceship Logistics</h1>
            <p className="text-xs text-gray-500">AI-Powered Analytics Dashboard</p>
          </div>
          <nav className="flex gap-6 text-sm font-medium">
            <a href="/" className="text-gray-500 transition-colors hover:text-gray-900">
              Dashboard
            </a>
            <span className="text-blue-600">Ask AI</span>
          </nav>
        </div>
      </header>

      {/* Chat takes the remaining height */}
      <div className="flex flex-1 flex-col">
        <ChatInterface />
      </div>
    </div>
  );
}
