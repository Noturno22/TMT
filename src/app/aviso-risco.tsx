import { LegalDoc } from '@/components/LegalDoc';

export default function AvisoRiscoScreen() {
  return (
    <LegalDoc
      title="Aviso de Risco"
      icon="warning-outline"
      intro="O trading de produtos financeiros envolve riscos significativos e não é adequado para todos os investidores. Deve considerar cuidadosamente os seus objetivos de investimento, nível de experiência e tolerância ao risco."
      sections={[
        {
          title: 'Risco de Perda Financeira',
          body: 'O mercado Forex e outros mercados financeiros são altamente voláteis. Existe um risco significativo de perda parcial ou total do capital investido. Nunca invista dinheiro que não pode dar-se ao luxo de perder.',
        },
        {
          title: 'Natureza Educacional',
          body: 'As análises e sinais fornecidos pela plataforma The Magic Trader são de caráter exclusivamente educacional e informativo. Não constituem recomendação de compra, venda ou subscrição de qualquer instrumento financeiro.',
        },
        {
          title: 'Sem Garantias',
          body: 'Não garantimos a precisão, completitude ou atualidade das análises fornecidas. Os modelos de IA e indicadores técnicos podem gerar sinais incorretos. Resultados passados não são indicativos de resultados futuros.',
        },
        {
          title: 'Decisão de Investimento',
          body: 'Qualquer decisão de investimento é da exclusiva responsabilidade do utilizador. Recomendamos que consulte um consultor financeiro profissional antes de tomar qualquer decisão de investimento.',
        },
        {
          title: 'Alavancagem',
          body: 'O trading com alavancagem amplifica tanto os lucros como as perdas. Pode perder mais do que o capital investido inicialmente. Certifique-se de que compreende plenamente os riscos associados antes de operar.',
        },
        {
          title: 'Regulamentação',
          body: 'The Magic Trader não é uma corretora licenciada e não executa ordens de trading diretamente. Para operar no mercado Forex, deve utilizar um corretor regulamentado.',
        },
      ]}
    />
  );
}
