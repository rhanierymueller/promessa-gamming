import { DATA_INVENTORY, TERMS_VERSION } from '../state/consent'

/**
 * Termos de uso e política de privacidade.
 *
 * A tabela de dados vem do INVENTÁRIO no código, não de um texto escrito à
 * parte: assim o que a pessoa lê aqui não descola do que o sistema realmente
 * guarda quando alguém acrescenta um campo novo.
 */

interface LegalProps {
  readonly onClose: () => void
}

export const Legal = ({ onClose }: LegalProps) => (
  <div className="legal-overlay" role="dialog" aria-modal="true" aria-label="Termos e privacidade">
    <div className="legal-box">
      <h2>Termos de uso e privacidade</h2>
      <p className="muted">Versão {TERMS_VERSION}</p>

      <h3>O que guardamos</h3>
      <table className="legal-table">
        <thead>
          <tr><th>Dado</th><th>Para quê</th><th>Onde fica</th></tr>
        </thead>
        <tbody>
          {DATA_INVENTORY.map((item) => (
            <tr key={item.what}>
              <td>{item.what}</td>
              <td>{item.why}</td>
              <td>{item.where === 'servidor' ? 'Servidor' : 'Seu aparelho'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Seus direitos</h3>
      <ul className="legal-list">
        <li><strong>Ver seus dados:</strong> o Perfil mostra tudo que guardamos sobre você.</li>
        <li><strong>Levar seus dados:</strong> dá para baixar sua carreira em arquivo, no Perfil.</li>
        <li><strong>Apagar tudo:</strong> "Excluir conta" remove a conta, a carreira do servidor e os dados deste aparelho. É definitivo.</li>
        <li><strong>Corrigir:</strong> nome do atleta, do clube e aparência são editáveis a qualquer momento.</li>
      </ul>

      <h3>O que NÃO fazemos</h3>
      <ul className="legal-list">
        <li>Não vendemos nem compartilhamos seus dados com anunciantes.</li>
        <li>Não usamos rastreadores de publicidade.</li>
        <li>Não pedimos dado que o jogo não precise para funcionar.</li>
      </ul>

      <h3>Menores de idade</h3>
      <p>
        Se você tem menos de 16 anos, precisa da autorização de um responsável para criar conta,
        como manda a LGPD.
      </p>

      <h3>Contato</h3>
      <p>
        Para pedir seus dados, corrigir ou apagar algo, fale com o responsável pelo tratamento
        pelo e-mail de suporte do jogo.
      </p>

      <button className="btn" onClick={onClose}>Fechar</button>
    </div>
  </div>
)
