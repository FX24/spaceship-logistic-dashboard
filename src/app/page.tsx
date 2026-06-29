import { getDashboardData } from "@/lib/tools/kpis";
import KpiCard from "@/components/KpiCard";
import OrderVolumeChart from "@/components/charts/OrderVolumeChart";
import DeliveryPerformanceChart from "@/components/charts/DeliveryPerformanceChart";
import CarrierDelayChart from "@/components/charts/CarrierDelayChart";

// Server component — reads data directly from the in-memory DB; no API call needed.
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const data = getDashboardData();
  const { kpis } = data;
  // node:sqlite returns null-prototype objects; JSON round-trip produces plain objects
  // required for RSC → Client Component prop serialization.
  const charts = JSON.parse(JSON.stringify(data.charts)) as typeof data.charts;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Spaceship Logistics</h1>
            <p className="text-xs text-gray-500">AI-Powered Analytics Dashboard</p>
          </div>
          <nav className="flex gap-6 text-sm font-medium">
            <span className="text-blue-600">Dashboard</span>
            <a
              href="/chat"
              className="text-gray-500 transition-colors hover:text-gray-900"
            >
              Ask AI
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* ---------------------------------------------------------------- */}
        {/* KPI cards                                                         */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Key Metrics — Full Dataset (Jan – Dec 2025, 400 orders)
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard
              title="Total Orders"
              value={kpis.totalOrders.toLocaleString()}
              sub="all statuses"
            />
            <KpiCard
              title="Delivered"
              value={kpis.deliveredOrders.toLocaleString()}
              variant="good"
            />
            <KpiCard
              title="Delayed"
              value={kpis.delayedOrders.toLocaleString()}
              variant="warn"
              sub="status = 'delayed'"
            />
            <KpiCard
              title="On-Time Rate"
              value={`${kpis.onTimeRatePct}%`}
              variant="good"
              sub="delivered ÷ (delivered + delayed)"
            />
            <KpiCard
              title="Avg Delivery"
              value={`${kpis.avgDeliveryDays} days`}
              sub="orders with a delivery date"
            />
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Charts                                                            */}
        {/* ---------------------------------------------------------------- */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-sm font-semibold text-gray-700">
              Order Volume by Month
            </h3>
            <p className="mb-4 text-xs text-gray-400">
              Total orders placed per calendar month
            </p>
            <OrderVolumeChart data={charts.orderVolumeByMonth} />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-sm font-semibold text-gray-700">
              Delivery Performance by Month
            </h3>
            <p className="mb-4 text-xs text-gray-400">
              Concluded orders (delivered + delayed) — excludes in-transit, canceled, exception
            </p>
            <DeliveryPerformanceChart data={charts.deliveryPerformanceByMonth} />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h3 className="mb-1 text-sm font-semibold text-gray-700">
              On-Time Rate by Carrier
            </h3>
            <p className="mb-4 text-xs text-gray-400">
              delivered ÷ (delivered + delayed) per carrier · best to worst · green = 100%, red = 0%
            </p>
            <CarrierDelayChart data={charts.onTimeRateByCarrier} />
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Footer note                                                       */}
        {/* ---------------------------------------------------------------- */}
        <footer className="border-t border-gray-200 pt-4 text-xs text-gray-400">
          Data: mock_logistics_data.csv · 400 orders · Jan–Dec 2025 ·{" "}
          <a href="/chat" className="text-blue-400 hover:underline">
            Ask the AI a question →
          </a>
        </footer>
      </main>
    </div>
  );
}
