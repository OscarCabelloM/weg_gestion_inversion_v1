import { LineChart, Wallet, PieChart, Bitcoin } from 'lucide-react';

export const TABS = [
  { id: 'distribution', label: 'Distribución de Cartera', icon: PieChart },
  { id: 'portfolio', label: 'Portfolio Nacional', icon: LineChart },
  { id: 'portfolio-crypto', label: 'Portfolio Crypto', icon: Bitcoin },
  { id: 'transactions', label: 'Registro Diario', icon: Wallet },
];
