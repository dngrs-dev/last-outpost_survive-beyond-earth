import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { SetupPage } from './pages/SetupPage';
import { GamePage } from './pages/GamePage';
import { ResultsPage } from './pages/ResultsPage';
import { MoonPage } from './pages/MoonPage';
import { StartPage } from './pages/StartPage';
import { CrewSelectionPage } from './pages/CrewSelectionPage';

function HomeRoute() {
  const [params] = useSearchParams();
  if (params.has('station') || params.has('lunar_site')) {
    return <Navigate to={`/crew/?${params.toString()}`} replace />;
  }
  return <StartPage />;
}

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/moon/" element={<MoonPage />} />
        <Route path="/" element={<HomeRoute />} />
        <Route path="/prepare/" element={<SetupPage />} />
        <Route path="/crew/" element={<CrewSelectionPage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
        <Route path="/results/:gameId" element={<ResultsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
