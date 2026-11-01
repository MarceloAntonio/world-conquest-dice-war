# Plano de implementação: campanhas e torcida

1. **Cenários e regras.** Preservar partidas clássicas v1; criar campanhas v2 com participantes regionais, corredores pela rede geográfica existente, conquista gradual, desgaste, rebeliões, alianças, rei da colina e caça ao líder. Favorito e todos iguais completam as opções.
2. **Interface de modos.** Prévia no mapa, contagem e população dos participantes; seleção personalizada salvável; regras combináveis, favorito e limite de campanha; desafios com seed e regras fixas.
3. **Torcida e progressão.** Previsões antes dos dados, pontos e sequências; missões, conquistas, álbum, rivalidades, cosméticos por nível e recordes de desafios. Recursos opcionais para preservar a simulação contínua.
4. **Persistência e consulta.** Perfil em LocalStorage; arquivos completos de campanhas no IndexedDB; sala de troféus com resumo, estatísticas, histórico e mapa por rodada; importação clássica e de campanhas.
5. **Verificação e entrega.** Testar combinações, conservação populacional, desgaste, independência de territórios, alianças, seleção por seed, migração de saves, previsões e telas móveis. Atualizar README, remover Netlify, fazer commits com a identidade Git configurada e push SSH. Não executar deploy.

Decisões e limites: alianças são blocos fixos de até três Estados; o desgaste altera recursos simulados, preservando os registros reais; rebeliões devolvem apenas o Estado original; campanhas longas encerram no limite configurado e identificam esse resultado, sem anunciar conquista inexistente. Rankings e progressão são locais, sem contas ou servidor.

## Entrega

- Etapas 1 a 4 implementadas: modos, regras, torcida, progresso e persistência integrados à partida.
- Etapa 5: base de 195 Estados validada, 49 testes automatizados aprovados e build de produção gerado.
- Testes no Chromium aprovaram regiões, seleção personalizada, previsões, retomada, troféus, replay arquivado, desafios, álbum móvel, níveis, cosméticos e recuperação pelo IndexedDB sem repetir recompensas.
- README atualizado para a versão 2.0.0. Instruções e configuração da Netlify removidas; configuração da Vercel preservada para publicação posterior.
- O artefato de produção também passou no Chromium: seis dados animados, 194 batalhas no modo combinado, uma facção final e conservação dos 8.177.227.025 habitantes da base, sem erros de navegador.
- Commits usam a identidade Git já configurada. Entrega pelo remoto SSH, sem deploy.
