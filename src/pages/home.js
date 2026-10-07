import "../css/Feed.css";

const stories = [
    { username: "art.studio", image: "photo-1534528741775-53994a69daeb", fresh: true },
    { username: "travel.blog", image: "photo-1500648767791-00dcc994a43e" },
    { username: "kitchen.cre...", image: "photo-1494790108377-be9c29b29330" },
    { username: "aoa_studio", image: "photo-1531123897727-8f129e1688ce" },
    { username: "loretin_sha...", image: "photo-1506794778202-cad84cf45f1d" },
    { username: "sheeniarto", image: "photo-1524504388940-b1c1722653e1" },
    { username: "rommens_", image: "photo-1506794778202-cad84cf45f1d" },
    { username: "your studio", image: "photo-1517841905240-472988babdf9", own: true },
];

const suggestions = [
    { username: "urban_explorer", detail: "Followed by urban_explorer", image: "photo-1500530855697-b586d89ba3ee" },
    { username: "pixel_art", detail: "Followed by pixel_art", image: "photo-1531058020387-3be344556be6" },
    { username: "cozy_homes", detail: "Followed by cozy_homes", image: "photo-1616486338812-3dadae4b4ace" },
    { username: "nari_blog", detail: "Followed by nose.art", image: "photo-1517841905240-472988babdf9" },
    { username: "gran_atra", detail: "Followed by great_arroce", image: "photo-1506794778202-cad84cf45f1d" },
    { username: "pixel_art", detail: "Followed by pixel_art", image: "photo-1534528741775-53994a69daeb" },
    { username: "cozy_homes", detail: "Followed by cozy_homes", image: "photo-1494790108377-be9c29b29330" },
];

const posts = [
    {
        username: "creative_snaps",
        name: "Mila Harper",
        image: "photo-1498050108023-c5249f4df085",
        avatar: "photo-1534528741775-53994a69daeb",
        likes: "2,453",
        caption: "This setup is perfect! ❤️",
        comments: "View all 120 comments",
        time: "2 hours ago",
    },
    {
        username: "world_wanderer",
        name: "Evan Brooks",
        image: "photo-1464822759023-fed622ff2c3b",
        avatar: "photo-1500648767791-00dcc994a43e",
        likes: "8,109",
        caption: "A little further beyond the familiar. ⛰️",
        comments: "View all 86 comments",
        time: "5 hours ago",
    },
];

const photoUrl = (id, width = 160) =>
    `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;

function Icon({ name, size = 24 }) {
    const common = {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.9,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": true,
    };

    if (name === "heart") return <svg {...common}><path d="M20.8 8.7c0 4.3-8.8 10-8.8 10s-8.8-5.7-8.8-10A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z" /></svg>;
    if (name === "comment") return <svg {...common}><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" /></svg>;
    if (name === "send") return <svg {...common}><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>;
    if (name === "bookmark") return <svg {...common}><path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-4-6 4Z" /></svg>;
    if (name === "more") return <svg {...common}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>;
    if (name === "plus") return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    if (name === "smile") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>;
    return null;
}
function handleLike() {
    alert("You liked this post!");
}
function Feed() {
    let user = null;
    try {
        user = JSON.parse(localStorage.getItem("user"));
    } catch {
        user = null;
    }

    const username = user?.username || "your_username";
    const profilePhoto = user?.avatar || photoUrl("photo-1534528741775-53994a69daeb", 100);

    return (
        <main className="feed-page">
            <div className="feed-layout">
                <section className="feed-main" aria-label="Feed">
                    <section className="stories-panel" aria-labelledby="stories-title">
                        <div className="stories-heading">
                            <h1 id="stories-title">Stories</h1>
                            <span>Recent</span>
                        </div>
                        <div className="stories-list">
                            {stories.map((story) => (
                                <div className="story-item" key={story.username}>
                                    <div className={`story-ring${story.fresh ? " story-ring-fresh" : ""}`}>
                                        <img src={photoUrl(story.image, 120)} alt="" />
                                        {story.own && <span className="story-add"><Icon name="plus" size={13} /></span>}
                                    </div>
                                    <span className="story-name">{story.own ? "Your story" : story.username}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="post-list">
                        {posts.map((post) => (
                            <article className="feed-post" key={post.username}>
                                <header className="post-header">
                                    <div className="post-author">
                                        <img className="post-avatar" src={photoUrl(post.avatar, 96)} alt="" />
                                        <div className="post-author-copy">
                                            <strong>{post.username}</strong>
                                            <span>{post.name} <span className="post-dot">·</span> Following</span>
                                        </div>
                                    </div>
                                    <button className="icon-button post-more" type="button" aria-label="More post options">
                                        <Icon name="more" />
                                    </button>
                                </header>
                                <img className="post-image" src={photoUrl(post.image, 1200)} alt={post.caption} />
                                <div className="post-details">
                                    <div className="post-actions">
                                        <div className="post-actions-left">
                                            <button className="icon-button like-button" type="button" aria-label="Like post" onClick={handleLike}><Icon name="heart"  /></button>
                                            <button className="icon-button" type="button" aria-label="Comment on post"><Icon name="comment" /></button>
                                            <button className="icon-button" type="button" aria-label="Share post"><Icon name="send" /></button>
                                        </div>
                                        <button className="icon-button" type="button" aria-label="Save post"><Icon name="bookmark" /></button>
                                    </div>
                                    <strong className="post-likes">{post.likes} likes</strong>
                                    <p className="post-caption"><strong>{post.username}</strong> {post.caption}</p>
                                    <p className="post-comments">{post.comments}</p>
                                    <span className="post-time">{post.time}</span>
                                    <div className="comment-entry">
                                        <img src={profilePhoto} alt="" />
                                        <span>Add a comment...</span>
                                        <button className="icon-button comment-smile" type="button" aria-label="Add emoji"><Icon name="smile" size={21} /></button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                <aside className="feed-rail" aria-label="People to follow">
                    <div className="current-account">
                        <img src={profilePhoto} alt="" />
                        <div className="account-copy">
                            <strong>@{username}</strong>
                            <span>{user?.username || "Full name"}</span>
                        </div>
                        <span className="account-switch">Switch</span>
                    </div>

                    <section className="suggestions-panel">
                        <div className="suggestions-heading">
                            <h2>Suggestions for you</h2>
                            <span>See all</span>
                        </div>
                        <div className="suggestion-list">
                            {suggestions.map((suggestion, index) => (
                                <div className="suggestion-row" key={`${suggestion.username}-${index}`}>
                                    <img src={photoUrl(suggestion.image, 96)} alt="" />
                                    <div className="suggestion-copy">
                                        <strong>{suggestion.username}</strong>
                                        <span>{suggestion.detail}</span>
                                    </div>
                                    <span className="follow-label">Follow</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <footer className="feed-footer">
                        <div>About <span>Help</span> <span>Press</span> <span>API</span> <span>Jobs</span> <span>Privacy</span></div>
                        <div>Terms <span>Locations</span></div>
                        <p>© 2026 MORPHUES</p>
                    </footer>
                </aside>
            </div>
        </main>
    );
}

export default Feed;