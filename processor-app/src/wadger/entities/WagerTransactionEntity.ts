import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  CreateDateColumn,
  Index,
} from "typeorm";

import { WalletEntity } from "../../wallet/entities/WalletEntity.js";

export enum WagerTransactionKind {
  Opening = "OPENING",
  Bet = "BET",
  Win = "WIN",
  Loss = "LOSS",
  Refund = "REFUND",
  Rollback = "ROLLBACK",
}

export enum WagerTransactionStatus {
  Pending = "PENDING",
  PendingReference = "PENDING_REFERENCE",
  Processed = "PROCESSED",
  Rejected = "REJECTED",
  Failed = "FAILED",
}

@Entity("wager_transactions")
@Index(
  "uq_wager_provider_external",
  ["providerId", "externalTransactionId"],
  { unique: true },
)
@Index(
  "uq_wager_provider_idempotency",
  ["providerId", "idempotencyKey"],
  { unique: true },
)
export class WagerTransactionEntity {
  @PrimaryColumn("uuid")
  id: string;

  @Column({ name: "provider_id", type: "varchar" })
  providerId: string;

  @Column({ name: "external_transaction_id", type: "varchar" })
  externalTransactionId: string;

  @Column({ name: "idempotency_key", type: "varchar" })
  idempotencyKey: string;

  @Column({ name: "payload_hash", type: "varchar", length: 64 })
  payloadHash: string;

  @Column({ type: "varchar", length: 3 })
  currency: string;

  @Column({ type: "numeric", precision: 20, scale: 2 })
  money: string;

  @Column({ name: "wallet_id", type: "uuid" })
  walletId: string;

  @ManyToOne(() => WalletEntity, { nullable: false })
  @JoinColumn({ name: "wallet_id" })
  wallet: WalletEntity;

  @Column({ name: "player_id", type: "varchar" })
  playerId: string;

  @Column({ name: "round_id", type: "varchar" })
  roundId: string;

  @Column({ name: "game_id", type: "varchar" })
  gameId: string;

  @Column({
    type: "enum",
    enum: WagerTransactionKind,
    enumName: "wager_transaction_kind",
  })
  kind: WagerTransactionKind;

  @Column({
    type: "enum",
    enum: WagerTransactionStatus,
    enumName: "wager_transaction_status",
  })
  status: WagerTransactionStatus;

  @Column({
    name: "reference_external_transaction_id",
    type: "varchar",
    nullable: true,
  })
  referenceExternalTransactionId: string | null;

  @Column({
    name: "reference_transaction_id",
    type: "uuid",
    nullable: true,
  })
  referenceTransactionId: string | null;

  @Column({
    name: "failure_code",
    type: "varchar",
    nullable: true,
  })
  failureCode: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @Column({
    name: "processed_at",
    type: "timestamptz",
    nullable: true,
  })
  processedAt: Date | null;
}