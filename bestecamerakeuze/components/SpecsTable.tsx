export default function SpecsTable({ specs }: { specs: Record<string, string> }) {
  const entries = Object.entries(specs);
  if (entries.length === 0) {
    return <p className="text-sm text-ink-faint">Nog geen specificaties bekend.</p>;
  }

  return (
    <table className="w-full text-sm">
      <tbody>
        {entries.map(([label, value], index) => (
          <tr key={label} className={index % 2 === 1 ? "bg-page" : undefined}>
            <th scope="row" className="w-2/5 px-3 py-2.5 text-left font-semibold text-ink-muted">
              {label}
            </th>
            <td className="px-3 py-2.5 text-ink">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
