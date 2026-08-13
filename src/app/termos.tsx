import { LegalDoc } from '@/components/LegalDoc';

export default function TermosScreen() {
  return (
    <LegalDoc
      title="Termos de Uso"
      icon="document-text-outline"
      sections={[
        {
          title: '1. Aceitação dos Termos',
          body: 'Ao aceder e utilizar a plataforma The Magic Trader, o utilizador concorda com estes Termos de Uso. Se não concordar com algum dos termos, não deve utilizar a plataforma.',
        },
        {
          title: '2. Descrição do Serviço',
          body: 'The Magic Trader é uma plataforma de análise técnica do mercado Forex que utiliza inteligência artificial e indicadores técnicos para gerar análises educacionais. Os sinais fornecidos são baseados em modelos estatísticos e não devem ser considerados aconselhamento financeiro.',
        },
        {
          title: '3. Natureza Educacional',
          body: 'Todo o conteúdo disponibilizado na plataforma é de caráter exclusivamente educacional e informativo. Não nos responsabilizamos por decisões de investimento tomadas com base nas análises fornecidas.',
        },
        {
          title: '4. Conta de Utilizador',
          body: 'O utilizador é responsável por manter a confidencialidade das suas credenciais de acesso. Uma conta premium é pessoal e intransmissível.',
        },
        {
          title: '5. Pagamentos',
          body: 'As subscrições premium são processadas via Stripe. Os planos são renovados automaticamente ao final de cada período de faturação, a menos que sejam cancelados antes da data de renovação.',
        },
        {
          title: '6. Propriedade Intelectual',
          body: 'Todo o conteúdo da plataforma, incluindo mas não se limitando a textos, gráficos, logotipos, software e análises, é propriedade de The Magic Trader e é protegido por direitos de autor.',
        },
        {
          title: '7. Alterações',
          body: 'Reservamo-nos o direito de alterar estes termos a qualquer momento. As alterações entram em vigor imediatamente após a publicação na plataforma.',
        },
      ]}
    />
  );
}
