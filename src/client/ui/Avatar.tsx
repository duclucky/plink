/** A redditor's snoovatar, or their initial when Reddit has none. */
export const Avatar = ({
  url,
  name,
  size = 28,
}: {
  url: string | null;
  name: string;
  size?: number;
}) =>
  url ? (
    <img
      className="avatar"
      src={url}
      alt=""
      width={size}
      height={size}
      loading="lazy"
    />
  ) : (
    <span
      className="avatar avatar-blank"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden="true"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );

/** A short row of the redditors who fixed a box. */
export const Faces = ({ urls }: { urls: readonly string[] }) =>
  urls.length === 0 ? null : (
    <span className="faces" aria-hidden="true">
      {urls.map((url) => (
        <Avatar key={url} url={url} name="" size={24} />
      ))}
    </span>
  );
