import { TmrCalculator } from '@/components/tmr-calculator/TmrCalculator';

export const metadata = {
  title: 'TMR Calculator | چارے کا فارمولا',
  description: 'Total Mixed Ration calculator for Pakistani livestock — concentrate + forage in one diet',
};

export default function TmrPage() {
  return <TmrCalculator />;
}
