/** A round profile picture, Mac-login style. Falls back to the person's initials, or the Agent Desk mark. */
export default function ProfileCircle({ name, photo, size = 128, mark = false }: { name: string; photo: string | null; size?: number; mark?: boolean }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <span className="pc" style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden={mark ? true : undefined}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={name} width={size} height={size} decoding="async" />
      ) : mark ? (
        <span className="pc-mark" />
      ) : (
        <span className="pc-ini">{initials || "?"}</span>
      )}
    </span>
  );
}
