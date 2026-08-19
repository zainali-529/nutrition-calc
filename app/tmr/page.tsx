import { TmrCalculator } from '@/components/tmr-calculator/TmrCalculator';

export const metadata = {
  title: 'RumiCalc TMR — Total Mixed Ration Calculator | رومی کیلک',
  description: 'RumiCalc Total Mixed Ration calculator for Pakistani livestock — concentrate + forage in one diet',
};

export default function TmrPage() {
  return <TmrCalculator />;
}
