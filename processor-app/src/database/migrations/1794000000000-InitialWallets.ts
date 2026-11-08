import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialWallets1794000000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TYPE ledger_direction AS ENUM ('DEBIT','CREDIT');
      CREATE TYPE wager_transaction_kind AS ENUM ('OPENING','BET','WIN','LOSS','REFUND','ROLLBACK');
      CREATE TYPE wager_transaction_status AS ENUM ('PENDING','PENDING_REFERENCE','PROCESSED','REJECTED','FAILED');
      CREATE TABLE wallets (
        id uuid PRIMARY KEY, player_id varchar NOT NULL, currency varchar(3) NOT NULL,
        balance numeric(20,2) NOT NULL CHECK (balance >= 0 AND balance <> 'NaN'::numeric),
        version integer NOT NULL CHECK (version >= 1),
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_wallets_player_currency UNIQUE(player_id,currency),
        UNIQUE(id,currency)
      );
      CREATE TABLE wager_transactions (
        id uuid PRIMARY KEY, provider_id varchar NOT NULL, external_transaction_id varchar NOT NULL,
        idempotency_key varchar NOT NULL UNIQUE, payload_hash varchar(64) NOT NULL,
        wallet_id uuid NOT NULL REFERENCES wallets(id), player_id varchar NOT NULL,
        round_id varchar NOT NULL, game_id varchar NOT NULL,
        kind wager_transaction_kind NOT NULL, status wager_transaction_status NOT NULL DEFAULT 'PENDING',
        currency varchar(3) NOT NULL, money numeric(20,2) NOT NULL CHECK(money >= 0 AND money <> 'NaN'::numeric),
        reference_external_transaction_id varchar, reference_transaction_id uuid REFERENCES wager_transactions(id),
        failure_code varchar, created_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz,
        CONSTRAINT uq_wager_provider_external UNIQUE(provider_id,external_transaction_id),
        CHECK(kind NOT IN ('REFUND','ROLLBACK') OR reference_external_transaction_id IS NOT NULL),
        CHECK(status NOT IN ('REJECTED','FAILED') OR failure_code IS NOT NULL)
      );
      CREATE TABLE wallet_ledgers (
        id uuid PRIMARY KEY, wallet_id uuid NOT NULL, transaction_id uuid NOT NULL REFERENCES wager_transactions(id),
        direction ledger_direction NOT NULL, currency varchar(3) NOT NULL,
        money numeric(20,2) NOT NULL CHECK(money > 0 AND money <> 'NaN'::numeric),
        balance_before numeric(20,2) NOT NULL CHECK(balance_before >= 0),
        balance_after numeric(20,2) NOT NULL CHECK(balance_after >= 0),
        created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        FOREIGN KEY(wallet_id,currency) REFERENCES wallets(id,currency),
        CONSTRAINT uq_wallet_ledger_transaction UNIQUE(wallet_id,transaction_id),
        CHECK(balance_after = balance_before + CASE direction WHEN 'CREDIT' THEN money ELSE -money END)
      );
      CREATE FUNCTION protect_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Ledger is append-only'; END $$;
      CREATE TRIGGER immutable_ledger BEFORE UPDATE OR DELETE OR TRUNCATE ON wallet_ledgers
        FOR EACH STATEMENT EXECUTE FUNCTION protect_ledger();
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      DROP TABLE wallet_ledgers,wager_transactions,wallets;
      DROP FUNCTION protect_ledger();
      DROP TYPE ledger_direction,wager_transaction_kind,wager_transaction_status;
    `);
  }
}
