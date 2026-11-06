import { DataSource } from "typeorm";
import { WalletEntity } from "../wallet/entities/WalletEntity.js";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DATABASE_HOST ?? "localhost",
    port: Number(process.env.DATABASE_PORT ?? 5432),
    username: process.env.DATABASE_USERNAME ?? "postgres",
    password: process.env.DATABASE_PASSWORD ?? "123",
    database: process.env.DATABASE_NAME ?? "postgres",
    synchronize: true,
    logging: true,
    entities: [WalletEntity],
    subscribers: [],
    migrations: [],
})