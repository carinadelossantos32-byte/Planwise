/*
    Shows a "top method" value as pill badges, one per method (several methods
    are listed when they are tied, comma-separated).

    A placeholder like "-" stays plain text. With pillSingle={false} a single
    method also stays plain text - used in the KPI cards, where one method is
    shown as the card's big value.
*/
function MethodBadges({ value, pillSingle = true }) {

    const names = String(value ?? "")
        .split(",")
        .map(name => name.trim())
        .filter(name => name && name !== "-");

    if (names.length === 0 || (names.length === 1 && !pillSingle)) return value;

    return (
        <span className="method-badges">
            {names.map(name => (
                <span className="method-badge" key={name}>{name}</span>
            ))}
        </span>
    );
}

export default MethodBadges;
