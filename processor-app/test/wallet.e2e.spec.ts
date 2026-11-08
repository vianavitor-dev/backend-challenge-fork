import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';

// A dedicated database keeps these checks separate from development data.
process.env.DATABASE_HOST = process.env.TEST_DATABASE_HOST ?? 'localhost';
process.env.DATABASE_PORT = process.env.TEST_DATABASE_PORT ?? '5433';
process.env.DATABASE_NAME =
  process.env.TEST_DATABASE_NAME ?? 'wallet_basics_test';
process.env.DATABASE_USERNAME =
  process.env.TEST_DATABASE_USERNAME ?? 'postgres';
process.env.DATABASE_PASSWORD = process.env.TEST_DATABASE_PASSWORD ?? '123';
delete process.env.OBSERVE_APP_KEY;
delete process.env.OBSERVE_APP_SECRET;
const { AppModule } = await import('../dist/app.module.js');
const { Wallet } = await import('../dist/wallet/domain/Wallet.js');
const { Money } = await import('../dist/wallet/domain/Money.js');
const { WALLET_REPOSITORY } =
  await import('../dist/wallet/repositories/WalletRepository.js');
const { InitialWallets1794000000000 } =
  await import('../dist/database/migrations/1794000000000-InitialWallets.js');

describe('Wallet API with real PostgreSQL', () => {
  let app: INestApplication;
  let db: DataSource;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(DataSource);
  });
  afterAll(async () => {
    if (app) await app.close();
  });

  it('creates and retrieves a wallet with an auditable opening balance', async () => {
    const playerId = randomUUID();
    const created = await request(app.getHttpServer())
      .post('/wallets')
      .send({ playerId, initialBalance: { amount: '100', currency: 'BRL' } })
      .expect(201);
    expect(created.body.balance).toEqual({ amount: '100.00', currency: 'BRL' });
    expect(created.body.version).toBe(1);
    const found = await request(app.getHttpServer())
      .get(`/wallets/${created.body.id}`)
      .expect(200);
    expect(found.body).toEqual(created.body);
    const entries = await db.query(
      'SELECT * FROM wallet_ledgers WHERE wallet_id=$1',
      [created.body.id],
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].balance_before).toBe('0.00');
    expect(entries[0].balance_after).toBe('100.00');
    const [tx] = await db.query(
      'SELECT * FROM wager_transactions WHERE id=$1',
      [entries[0].transaction_id],
    );
    expect(tx.kind).toBe('OPENING');
    expect(tx.status).toBe('PROCESSED');
    await expect(
      db.query('UPDATE wallet_ledgers SET money=money WHERE id=$1', [
        entries[0].id,
      ]),
    ).rejects.toThrow('append-only');
    await expect(
      db.query('DELETE FROM wallet_ledgers WHERE id=$1', [entries[0].id]),
    ).rejects.toThrow('append-only');
    await expect(
      db.query('UPDATE wallets SET balance=-1 WHERE id=$1', [created.body.id]),
    ).rejects.toThrow();
  });

  it('creates a zero balance wallet without a fictitious opening movement', async () => {
    const response = await request(app.getHttpServer())
      .post('/wallets')
      .send({
        playerId: randomUUID(),
        initialBalance: { amount: '0', currency: 'BRL' },
      })
      .expect(201);
    expect(response.body.version).toBe(1);
    const entries = await db.query(
      'SELECT id FROM wallet_ledgers WHERE wallet_id=$1',
      [response.body.id],
    );
    expect(entries).toHaveLength(0);
  });

  it('rejects concurrent duplicate wallets using the database constraint', async () => {
    const body = {
      playerId: randomUUID(),
      initialBalance: { amount: '10.00', currency: 'BRL' },
    };
    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app.getHttpServer()).post('/wallets').send(body),
      ),
    );
    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    expect(responses.filter((r) => r.status === 409)).toHaveLength(9);
  });

  it('responds with 400 for invalid input and 404 for an absent wallet', async () => {
    for (const amount of ['-1', '1.001', '1e3', 10]) {
      await request(app.getHttpServer())
        .post('/wallets')
        .send({
          playerId: 'player',
          initialBalance: { amount, currency: 'BRL' },
        })
        .expect(400);
    }
    await request(app.getHttpServer()).get('/wallets/invalid').expect(400);
    await request(app.getHttpServer())
      .get(`/wallets/${randomUUID()}`)
      .expect(404);
  });

  it('rolls back the wallet and OPENING transaction if the ledger insert fails', async () => {
    const wallet = Wallet.open({
      id: randomUUID(),
      playerId: randomUUID(),
      initialBalance: Money.from({ amount: '5', currency: 'BRL' }),
    });
    await db.query(`CREATE FUNCTION fail_test_ledger() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.wallet_id='${wallet.id}'::uuid THEN RAISE EXCEPTION 'simulated ledger failure'; END IF;
      RETURN NEW; END $$;
      CREATE TRIGGER fail_test_ledger BEFORE INSERT ON wallet_ledgers FOR EACH ROW EXECUTE FUNCTION fail_test_ledger();`);
    try {
      await expect(app.get(WALLET_REPOSITORY).create(wallet)).rejects.toThrow(
        'simulated ledger failure',
      );
      expect(
        await db.query('SELECT id FROM wallets WHERE id=$1', [wallet.id]),
      ).toHaveLength(0);
      expect(
        await db.query('SELECT id FROM wager_transactions WHERE wallet_id=$1', [
          wallet.id,
        ]),
      ).toHaveLength(0);
    } finally {
      await db.query(
        'DROP TRIGGER fail_test_ledger ON wallet_ledgers; DROP FUNCTION fail_test_ledger();',
      );
    }
  });

  it('can reverse and reapply the migration transactionally', async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const migration = new InitialWallets1794000000000();
      await migration.down(runner);
      await migration.up(runner);
      expect(await runner.query('SELECT * FROM wallets')).toHaveLength(0);
    } finally {
      // Restore the test data along with the original schema.
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
