import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";
const record = (name: string) =>
  sqliteTable(
    name,
    {
      owner: text("owner").notNull(),
      tag: text("tag").notNull(),
      id: text("id").notNull(),
      observed: text("observed").notNull(),
      payload: text("payload").notNull(),
    },
    (t) => [
      primaryKey({ columns: [t.owner, t.tag, t.id] }),
      index(name + "_time").on(t.owner, t.tag, t.observed),
    ],
  );
export const snapshots = record("ri_snapshots");
export const battles = record("ri_battles");
export const choices = record("ri_choices");
export const limits = sqliteTable("ri_limits", {
  owner: text("owner").primaryKey(),
  window: integer("window").notNull(),
  count: integer("count").notNull(),
});
