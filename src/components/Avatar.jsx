function getInitials(name) {
  return name ? name.slice(0, 2).toUpperCase() : "?";
}

// A reusable avatar: shows the user's photo if they have one, otherwise colored initials.
// Usage: <Avatar src={user.avatar} name={user.username} className="inbox-avatar" />
export default function Avatar({ src, name, className = "", style }) {
  if (src) {
    return <img src={src} alt={name} className={`${className} avatar-img`} style={style} />;
  }
  return <div className={className} style={style}>{getInitials(name)}</div>;
}