import { Module } from "@nestjs/common";
import { createDb, type HydroxDb } from "@hydrox/db";

export const DB = Symbol("HYDROX_DB");

@Module({
  providers: [
    {
      provide: DB,
      useFactory: (): HydroxDb => {
        const url =
          process.env.DATABASE_URL ??
          "postgres://hydrox:hydrox@localhost:5432/hydrox";
        return createDb(url);
      },
    },
  ],
  exports: [DB],
})
export class DbModule {}
