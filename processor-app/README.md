# Entrega: Technical Challenge — Distributed Wagering Processor

## Agradecimentos

Agradeço pela oportunidade de participar deste processo seletivo. Este desafio foi uma experiência significativa de aprendizado, que me permitiu explorar novos conceitos e reconhecer pontos em que posso evoluir.

Pretendo aplicar os conhecimentos adquiridos em outros projetos e continuar desenvolvendo minhas habilidades para avançar na minha carreira.

Muito obrigado pela oportunidade e pelo tempo dedicado à avaliação do meu trabalho.

## O que funciona

- `POST /wallets`: cria uma carteira com saldo inicial zero ou positivo e versão 1.
- `GET /wallets/:walletId`: consulta uma carteira persistida.
- Saldo inicial positivo gera uma transação interna `OPENING` e um crédito no ledger, na mesma transação SQL da carteira. Se um insert falhar, nenhum dos três registros é confirmado.
- O banco impede carteira duplicada por jogador/moeda, saldo negativo, lançamento duplicado e alteração/exclusão do ledger.
- Valores monetários entram e saem como strings, com duas casas, usando `decimal.js` para os cálculos. Moedas suportadas: BRL, USD e EUR; operações entre moedas diferentes são rejeitadas.

## Executar

Requisitos: Docker Compose e, para desenvolvimento fora do container, Bun 1.x.

A partir de `processor-app`:

```bash
docker compose up --build -d
```

A API fica em `http://localhost:3000`. O PostgreSQL fica disponível localmente na porta `5433`. As migrations são aplicadas na inicialização e os dados ficam em um volume Docker.

Exemplo de criação:

```bash
curl -i http://localhost:3000/wallets \
  -H 'Content-Type: application/json' \
  -d '{"playerId":"player-1","initialBalance":{"amount":"100.00","currency":"BRL"}}'
```

Copie o `id` da resposta e consulte:

```bash
curl http://localhost:3000/wallets/COLE-O-ID-AQUI
```

Respostas: `201` na criação, `200` na consulta, `400` para entrada inválida, `404` para carteira ausente e `409` para jogador/moeda duplicados.

Para verificar o lançamento de abertura:

```bash
docker compose exec db psql -U postgres -c 'SELECT wallet_id, direction, money, balance_before, balance_after FROM wallet_ledgers;'
```

## Desenvolvimento e testes

```bash
bun install --frozen-lockfile
docker compose up -d db
cp .env.example .env
bun run start:dev
```

Se você já tem um `.env`, ajuste os valores manualmente usando `.env.example` como referência. NestJS Observe só é habilitado quando suas duas credenciais estão configuradas.

```bash
bun run build
bun run test
```

Os testes de integração usam PostgreSQL real em um banco separado:

```bash
docker compose exec db createdb -U postgres wallet_basics_test
bun run test:e2e
```

Crie esse banco apenas uma vez. Para outro ambiente, configure `TEST_DATABASE_HOST`, `TEST_DATABASE_PORT`, `TEST_DATABASE_NAME`, `TEST_DATABASE_USERNAME` e `TEST_DATABASE_PASSWORD`.

A suíte verifica criação/consulta HTTP, abertura com ledger, saldo zero, validação, conflito de criação em paralelo, constraints, imutabilidade, rollback após falha no ledger e reversibilidade da migration.

Migrations manuais, usando as variáveis do `.env`:

```bash
bun run migration:up
bun run migration:down
```

`migration:down` remove as tabelas desta entrega e seus dados. Use apenas em um banco de desenvolvimento descartável. A próxima inicialização aplica novamente a migration.

## Limitações da entrega

Não foram implementados BET, WIN, LOSS, REFUND, ROLLBACK pela API, idempotência de apostas, SQS, inbox/outbox, workers, reconciliação, paginação do ledger, métricas, health checks ou autenticação. As entidades de apostas são uma preparação de schema; não representam um fluxo de apostas funcional.

`Wallet.debit()` e `Wallet.credit()` são operações de domínio testadas, sem endpoints para movimentação. O repositório expõe apenas criação e consulta: um `save()` genérico permitiria alterar o saldo sem registrar o ledger. Esse contrato deverá ser ampliado junto com o caso de uso financeiro transacional.

A proteção testada contra concorrência cobre a criação duplicada de carteiras; não comprova o cenário de apostas concorrentes nem execução em três instâncias. Esta é uma base demonstrável, não uma solução completa dos requisitos do desafio.
