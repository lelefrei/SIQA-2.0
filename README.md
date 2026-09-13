# SIQA — versão funcional com Supabase

Esta versão melhora o projeto original e mantém HTML + CSS + JavaScript, podendo continuar no GitHub Pages.

## O que foi melhorado

- Dashboard calculado a partir das leituras, em vez de números fixos.
- Gráficos corrigidos para serem responsivos e destruídos/recriados sem duplicação.
- Status dos ambientes calculado pelo limite de CO₂.
- Histórico com tabela, gráfico e exportação CSV.
- Cadastro de ambientes.
- Estrutura de banco Supabase para ambientes, leituras e alertas.
- Fallback para modo demonstração caso o Supabase ainda não esteja configurado.
- Indicador de conexão.
- Modo escuro preservado.
- Layout responsivo para celular.
- Página de Análises separada do dashboard.

## Como colocar no Supabase

1. Crie um projeto em https://supabase.com
2. Abra SQL Editor.
3. Execute o arquivo `supabase.sql`.
4. Em Project Settings > API, copie:
   - Project URL
   - anon/public key
5. Abra `config.js` e cole os dois valores.
6. Envie `index.html`, `style.css`, `script.js` e `config.js` para o GitHub Pages.

### Importante
Use somente a chave `anon/public` no frontend. Nunca coloque a `service_role` key no GitHub.

As policies do SQL estão abertas para leitura e inserção porque este projeto foi preparado como protótipo acadêmico. Para produção, o ideal é adicionar autenticação e restringir as policies com `auth.uid()`.

## Como inserir uma leitura real

Exemplo no Supabase:

```sql
insert into public.leituras (ambiente_id, co2, temperatura, umidade, pm25)
select id, 720, 23.4, 55, 11
from public.ambientes
where nome = 'Sala 01';
```

Ao recarregar o dashboard, a nova leitura será usada nos indicadores e gráficos.

## Próximo passo recomendado

Conectar o dispositivo IoT/API diretamente à tabela `leituras`. Depois podemos adicionar atualização em tempo real com Supabase Realtime, autenticação, cadastro/edição de ambientes e um modelo de Machine Learning de verdade.
