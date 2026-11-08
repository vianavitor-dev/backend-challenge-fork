# Decisões

O escopo implementado é abertura e consulta de carteiras. A estrutura original foi mantida para que cada parte tenha uma responsabilidade pequena:

- `Money`: valida strings decimais e faz cálculos exatos, sem NestJS ou ORM. A precisão de 50 dígitos evita perda nos cálculos dentro da capacidade de `numeric(20,2)`.
- `Wallet`: encapsula saldo e versão. `open` cria em versão 1, inclusive com saldo zero; `rehydrate` recupera a versão persistida. Débitos e créditos de zero não incrementam a versão.
- `WalletService`: valida a entrada e coordena criação/consulta.
- `WalletRepository`: usa TypeORM e SQL parametrizado para persistir. A criação envolve três inserts: carteira, transação `OPENING` e ledger. Eles compartilham a mesma transação SQL.
- Entidades: descrevem o mapeamento do banco. A migration, com `up` e `down`, é responsável por criar efetivamente as constraints; `synchronize` fica desabilitado.

Uma constraint única em `(player_id,currency)` resolve a disputa entre criações simultâneas. A aplicação transforma essa violação específica em HTTP 409. Saldo e valores são `numeric(20,2)` no banco e strings no TypeScript. O ledger tem chave estrangeira para carteira e transação, unicidade por carteira/transação, check aritmético e trigger que impede UPDATE, DELETE e TRUNCATE.

A abertura usa o namespace reservado `__internal` como provedor. Seus identificadores internos são UUIDs; não há submissão externa de transações nesta versão. Saldo inicial zero não gera transação ou lançamento fictício.

Não há persistência pública de movimentações arbitrárias: o repositório não expõe `save`, `debit` ou `credit`. Implementar apostas futuramente exige um caso de uso que una controle de concorrência por carteira, idempotência, ledger e outbox na mesma transação. Os métodos do domínio, isoladamente, não garantem consistência distribuída.

Autenticação foi deixada fora do escopo. Uma evolução usaria um Identity Provider OIDC externo e um NestJS Guard para verificar tokens e vincular o provedor autenticado à operação. Esse ponto de extensão ainda não está implementado; os endpoints atuais são públicos e voltados à demonstração local.

Os testes de integração usam PostgreSQL real. Não há SQS nem evidência de processamento distribuído; essas limitações estão explícitas no [guia da aplicação](processor-app/README.md).
