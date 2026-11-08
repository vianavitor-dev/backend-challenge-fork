import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Index,
  CreateDateColumn,
} from "typeorm";

import { WalletEntity } from "./WalletEntity.js";

export enum LedgerDirection {
  Debit = "DEBIT",
  Credit = "CREDIT",
}

@Entity("wallet_ledgers")
@Index(
  "uq_wallet_ledger_transaction",
  ["walletId", "transactionId"],
  { unique: true },
)
export class WalletLedgerEntryEntity {
  @PrimaryColumn("uuid")
  id: string;

  @Column({ name: "wallet_id", type: "uuid" })
  walletId: string;

  @ManyToOne(() => WalletEntity, { nullable: false })
  @JoinColumn({ name: "wallet_id" })
  wallet: WalletEntity;

  @Column({ name: "transaction_id", type: "uuid" })
  transactionId: string;

  @Column({
    type: "enum",
    enum: LedgerDirection,
    enumName: "ledger_direction",
  })
  direction: LedgerDirection;

  @Column({ type: "varchar", length: 3 })
  currency: string;

  @Column({ type: "numeric", precision: 20, scale: 2 })
  money: string;

  @Column({ name: "balance_before", type: "numeric", precision: 20, scale: 2 })
  balanceBefore: string;

  @Column({ name: "balance_after", type: "numeric", precision: 20, scale: 2 })
  balanceAfter: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}