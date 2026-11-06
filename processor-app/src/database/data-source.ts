import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "root",
    password: "123",    
    database: "123",
    synchronize: true,
    logging: true,
    entities: [],
    subscribers: [],
    migrations: [],
})