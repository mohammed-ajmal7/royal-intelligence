"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Layers3, MapPin, Medal, Percent, Shield, Trophy } from "lucide-react";
import type { Snapshot } from "../lib/model";
import { ProfileAvatar } from "./ProfileAvatar";

type RawProfile = {
  arena?: { id?: unknown; arenaId?: unknown; arenaID?: unknown; arena_id?: unknown };
  clan?: {
    tag?: unknown;
    badgeId?: unknown;
    badge?: { id?: unknown };
  };
};
type ArenaConstant = { id: number; arena_id: number };
type BadgeConstant = { id: number; name: string };

const ARENA_DATA_URL = "https://royaleapi.github.io/cr-api-data/json/arenas.json";
const BADGE_DATA_URL = "https://royaleapi.github.io/cr-api-data/json/alliance_badges.json";
const ASSET_BASE = "https://royaleapi.github.io/cr-api-assets";

let arenaDataPromise: Promise<ArenaConstant[]> | undefined;
let badgeDataPromise: Promise<BadgeConstant[]> | undefined;

function readConstantList<T>(url: string): Promise<T[]> {
  return fetch(url, { cache: "force-cache" }).then(async response => {
    if (!response.ok) throw new Error("Unable to load Clash Royale visual constants");
    const value: unknown = await response.json();
    if (!Array.isArray(value)) throw new Error("Invalid Clash Royale visual constants");
    return value as T[];
  });
}

function getArenaConstants() {
  if (!arenaDataPromise) {
    arenaDataPromise = readConstantList<ArenaConstant>(ARENA_DATA_URL).catch(error => {
      arenaDataPromise = undefined;
      throw error;
    });
  }
  return arenaDataPromise;
}

function getBadgeConstants() {
  if (!badgeDataPromise) {
    badgeDataPromise = readConstantList<BadgeConstant>(BADGE_DATA_URL).catch(error => {
      badgeDataPromise = undefined;
      throw error;
    });
  }
  return badgeDataPromise;
}

function numeric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function KingTowerIcon() {
  return (
    <svg className="ri-profile-king-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M7 27V13.5L10.5 10 13 13.5 16 8l3 5.5 2.5-3L25 13.5V27H7Z"
        fill="#3157A5" stroke="#23447F" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M5 27h22v2H5z" fill="#D5A84A"/>
      <path d="M12 27v-7a4 4 0 0 1 8 0v7" fill="#EAF0FC" stroke="#23447F" strokeWidth="1.3"/>
      <path d="m16 2 1.7 3.1 3.4.5-2.5 2.4.6 3.4L16 9.8l-3.2 1.6.6-3.4-2.5-2.4 3.4-.5L16 2Z"
        fill="#E7B94F" stroke="#C18E2E" strokeWidth=".8" strokeLinejoin="round"/>
    </svg>
  );
}

function MetaItem({
  className,
  label,
  title,
  icon,
  children,
}: {
  className: string;
  label: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={"ri-profile-meta-item " + className} title={title}>
      <span className="ri-profile-meta-icon" aria-hidden="true">{icon}</span>
      <span className="ri-profile-meta-copy">
        <small>{label}</small>
        <strong>{children}</strong>
      </span>
    </div>
  );
}

type ProfileMetrics = {
  trophies: string;
  personalBest: string;
  cardsOwned: number;
  cardsTotal: number;
  winRate: string;
};

function ProfileStat({
  Icon,
  label,
  value,
  hint,
}: {
  Icon: typeof Trophy;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="ri-profile-stat">
      <div className="ri-profile-stat-head">
        <span className="ri-profile-stat-icon"><Icon size={19} strokeWidth={2.2}/></span>
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function PlayerProfileHeader({
  player,
  metrics,
}: {
  player: Snapshot;
  metrics: ProfileMetrics;
}) {
  const raw = (player.raw && typeof player.raw === "object" ? player.raw : {}) as RawProfile;
  const arenaId = numeric(raw.arena?.id);
  const directArenaNumber = numeric(raw.arena?.arenaId ?? raw.arena?.arenaID ?? raw.arena?.arena_id);
  const clanBadgeId = numeric(raw.clan?.badgeId ?? raw.clan?.badge?.id);
  const clanTag = typeof raw.clan?.tag === "string" ? raw.clan.tag : "";
  const hasClan = player.clan.trim() !== "" && player.clan !== "No clan";
  const [arenaImage, setArenaImage] = useState<string | null>(null);
  const [clanImage, setClanImage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setArenaImage(null);
    setClanImage(null);

    const resolveImages = async () => {
      const [arenas, badges] = await Promise.all([
        arenaId !== null
          ? getArenaConstants().catch(() => [])
          : Promise.resolve([] as ArenaConstant[]),
        hasClan && clanBadgeId !== null
          ? getBadgeConstants().catch(() => [])
          : Promise.resolve([] as BadgeConstant[]),
      ]);

      const arena = arenaId !== null
        ? arenas.find(item => item.id === arenaId)
        : undefined;
      const arenaNumber = arena?.arena_id ?? directArenaNumber;
      const badge = clanBadgeId !== null
        ? badges.find(item => item.id === clanBadgeId)
        : undefined;

      if (!active) return;
      setArenaImage(arenaNumber !== null && arenaNumber !== undefined
        ? ASSET_BASE + "/arenas/arena" + arenaNumber + ".png"
        : null);
      setClanImage(badge
        ? ASSET_BASE + "/badges/" + badge.name + ".png"
        : null);
    };

    void resolveImages();
    return () => { active = false; };
  }, [arenaId, directArenaNumber, clanBadgeId, hasClan]);

  return (
    <section className="ri-profile" aria-label={player.name + " player profile"}>
      <ProfileAvatar playerTag={player.tag} playerName={player.name}/>

      <div className="ri-profile-title-row">
        <h2>{player.name}</h2>
        {player.stale && <span className="ri-profile-saved">Saved profile</span>}
      </div>

      <div className="ri-profile-meta" aria-label="Player details">
        <MetaItem
          className="ri-profile-king"
          label="King Tower"
          title={"King Tower level " + (player.kingLevel ?? "unavailable")}
          icon={<KingTowerIcon/>}
        >
          {player.kingLevel ?? "—"}
        </MetaItem>

        <MetaItem
          className="ri-profile-arena"
          label="Arena"
          title={player.arena || "Arena unavailable"}
          icon={arenaImage
            ? <img src={arenaImage} alt="" width={34} height={34} loading="lazy"/>
            : <MapPin size={25}/>}
        >
          {player.arena || "Arena unavailable"}
        </MetaItem>

        <MetaItem
          className={"ri-profile-clan" + (hasClan ? "" : " is-no-clan")}
          label="Clan"
          title={clanTag ? "Clan " + clanTag : "Clan"}
          icon={hasClan && clanImage
            ? <img src={clanImage} alt="" width={34} height={34} loading="lazy"/>
            : <Shield size={24}/>}
        >
          {hasClan ? player.clan : "No clan"}
        </MetaItem>
      </div>

      <div className="ri-profile-stats" aria-label="Player statistics">
        <ProfileStat Icon={Trophy} label="Trophies" value={metrics.trophies}/>
        <ProfileStat Icon={Medal} label="Personal best" value={metrics.personalBest}/>
        <ProfileStat Icon={Layers3} label="Cards" value={metrics.cardsOwned} hint={"of " + metrics.cardsTotal}/>
        <ProfileStat Icon={Percent} label="Win rate" value={metrics.winRate}/>
      </div>
    </section>
  );
}
