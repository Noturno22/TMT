import { useTranslation } from 'react-i18next';
import { LegalDoc } from '@/components/LegalDoc';

export default function PrivacidadeScreen() {
  const { t } = useTranslation();
  return (
    <LegalDoc
      title={t('legal.privacidade')}
      icon="shield-checkmark-outline"
      sections={[
        {
          title: '1. Dados Recolhidos',
          body: 'Recolhemos apenas os dados necessários para o funcionamento da plataforma: endereço de email, nome de utilizador (quando fornecido via Google OAuth) e dados de pagamento processados diretamente pela Stripe.',
        },
        {
          title: '2. Uso dos Dados',
          body: 'Os seus dados são utilizados exclusivamente para: autenticação, gestão da sua subscrição, envio de notificações relacionadas com a sua conta, e melhoria da experiência na plataforma.',
        },
        {
          title: '3. Armazenamento',
          body: 'Os dados são armazenados de forma segura através do Supabase (PostgreSQL) com encriptação em trânsito e em repouso. Não armazenamos dados de pagamento diretamente.',
        },
        {
          title: '4. Partilha de Dados',
          body: 'Não partilhamos, vendemos ou transmitimos os seus dados pessoais a terceiros, exceto quando exigido por lei ou para o processamento de pagamentos através do Stripe.',
        },
        {
          title: '5. Cookies',
          body: 'Utilizamos cookies essenciais para o funcionamento da plataforma e cookies de autenticação geridos pelo Supabase. Não utilizamos cookies de rastreamento de terceiros.',
        },
        {
          title: '6. Os Seus Direitos',
          body: 'Pode solicitar a eliminação dos seus dados pessoais a qualquer momento contactando-nos. Tem direito de acesso, retificação e eliminação dos seus dados pessoais.',
        },
        {
          title: '7. Contacto',
          body: 'Para questões sobre privacidade, contacte-nos através do email de suporte da plataforma.',
        },
      ]}
    />
  );
}
