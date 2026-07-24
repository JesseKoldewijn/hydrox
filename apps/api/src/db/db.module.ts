import { Module } from "@nestjs/common";
import { createDb, type HydroxDb } from "@hydrox/db";

export const DB = Symbol("HYDROX_DB");

@Module({
  providers: [
    {
      provide: DB,
      useFactory: (): HydroxDb => {
        const url = process.env.DATABASE_URL ?? "mysql://hydrox:hydrox@127.0.0.1:3306/hydrox";
        return createDb(url);
      },
    },
  ],
  exports: [DB],
})
export class DbModule {}
