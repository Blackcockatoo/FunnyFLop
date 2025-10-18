import React, { useMemo, useState } from 'react';
import RitualDrop from './RitualDrop';
import VaultVisualization from './VaultVisualization';

const NAV_ITEMS = ['Bet', 'Skill', 'Drop', 'Vault', 'Journal', 'Map'];

const PlaceholderPanel = ({ title, description }) => (
  <div className="bg-slate-900 rounded-lg p-8 text-center text-slate-300">
    <h2 className="text-2xl font-semibold text-slate-100 mb-2">{title}</h2>
    <p className="text-sm max-w-md mx-auto">{description}</p>
  </div>
);

const PrimeCommandCenter = () => {
  const [activeTab, setActiveTab] = useState('Drop');

  const content = useMemo(() => {
    switch (activeTab) {
      case 'Drop':
        return <RitualDrop />;
      case 'Vault':
        return <VaultVisualization />;
      case 'Bet':
        return (
          <PlaceholderPanel
            title="Bet Wheel"
            description="The original wheel of entropy remains intact. Configure stakes, simulate spins, and feed the drop ritual with verified payouts."
          />
        );
      case 'Skill':
        return (
          <PlaceholderPanel
            title="Skill Trials"
            description="Parity, residue, XOR — your skill run logs appear here. Victories mint vouchers that convert to rotate/swap assists inside the Drop ritual."
          />
        );
      case 'Journal':
        return (
          <PlaceholderPanel
            title="Audit Journal"
            description="Seed commits, queue hashes, cascades, and payouts are archived here for provable fairness and player receipts."
          />
        );
      case 'Map':
      default:
        return (
          <PlaceholderPanel
            title="Vault Map"
            description="Prime corridors, vault attractors, and rune gates will live here. For now, use the Drop ritual to cultivate glyphs for the next update."
          />
        );
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Funny FLoP Command Center</h1>
            <p className="text-sm text-slate-400">
              Commit-reveal gaming stack with ritual drop, entropy analytics, and vault diagnostics.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActiveTab(item)}
                className={`px-4 py-2 rounded-full border transition-colors ${
                  activeTab === item
                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {content}
      </main>
    </div>
  );
};

export default PrimeCommandCenter;
