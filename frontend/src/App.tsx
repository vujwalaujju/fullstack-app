import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/Navbar";

import LiveDataVisualization from "./pages/LiveDataVisualization";

import LiveDataTable from "./pages/LiveDataTable";

import AlarmDataTable from "./pages/AlarmDataTable";

import SqliteDashboard from "./pages/AlarmDataVisualization";

export default function App() {
  return (
    <div className="app">
      <BrowserRouter>
        <header>
          <NavBar />
        </header>

        <main className="content">
          <Routes>
            <Route path="/" element={<LiveDataVisualization />} />
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="/LiveDataTable" element={<LiveDataTable />} />
            <Route path="/alarmdatatable" element={<AlarmDataTable />} />
            <Route path="/sqlitedashboard" element={<SqliteDashboard />} />
          </Routes>
        </main>
      </BrowserRouter>
    </div>
  );
}
