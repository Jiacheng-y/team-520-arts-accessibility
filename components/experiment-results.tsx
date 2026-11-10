export type ExperimentResult = {variant: string; visitors: number; signups: number; museums: number; visitor_signups: number; educators: number; other: number; paid: number; very_interested: number; converted: number};
const labels: Record<string, string> = {worksheet: 'Worksheet + audio guide', mobile: 'Mobile phone RPG', device: 'Dedicated device RPG'};
const versions: Record<string, string> = {worksheet: 'A', mobile: 'B', device: 'C'};
const conversion = (result: ExperimentResult) => result.visitors ? `${(100 * result.converted / result.visitors).toFixed(1)}%` : '—';

export function ExperimentResults({results, totalSignups}: {results?: ExperimentResult[]; totalSignups: number}) {
  const unassigned = results ? totalSignups - results.reduce((sum, result) => sum + result.signups, 0) : null;
  return <section className="data-card experiment-results" aria-labelledby="experiment-heading">
    <p className="eyebrow">A / B / C · PRODUCT FORMAT EXPERIMENT</p>
    <h2 id="experiment-heading">Interest by concept</h2>
    <p>Compare interest in each product format for the selected dates and campaign. Each browser sees one randomly assigned concept.</p>
    {results ? <>
      <div className="concept-results-grid">
        {results.map(result => <article className="concept-result" key={result.variant}>
          <p className="eyebrow">VERSION {versions[result.variant] || result.variant}</p>
          <h3>{labels[result.variant] || result.variant}</h3>
          <div className="concept-signups"><strong>{result.signups}</strong><span>waitlist signups</span></div>
          <dl>
            <div><dt>Museum staff</dt><dd>{result.museums}</dd></div>
            <div><dt>Museum visitors</dt><dd>{result.visitor_signups}</dd></div>
            <div><dt>Educators / other</dt><dd>{result.educators} / {result.other}</dd></div>
            <div><dt>Very interested museums</dt><dd>{result.very_interested}</dd></div>
            <div><dt>Paid pilot: yes</dt><dd>{result.paid}</dd></div>
          </dl>
          <div className="concept-conversion"><strong>{conversion(result)}</strong><span>tracked conversion</span></div>
          <p className="muted">{result.visitors ? `${result.converted} of ${result.visitors} tracked browsers signed up.` : 'No tracked visits yet.'}</p>
        </article>)}
      </div>
      <p className="experiment-unassigned">{unassigned} signups without an experiment assignment. These remain in the overall totals below and are excluded from this comparison.</p>
      <details className="experiment-details"><summary>View detailed comparison</summary>
        <div className="experiment-scroll" role="region" aria-label="Detailed concept comparison" tabIndex={0}><table>
          <caption>Product-format-v1 results for the selected filters</caption>
          <thead><tr><th scope="col">Concept</th><th scope="col">Tracked browsers</th><th scope="col">Signups</th><th scope="col">Museum staff</th><th scope="col">Visitors</th><th scope="col">Educators</th><th scope="col">Other</th><th scope="col">Very interested museums</th><th scope="col">Paid pilot: yes</th><th scope="col">Tracked conversion</th></tr></thead>
          <tbody>{results.map(result => <tr key={result.variant}>
            <th scope="row">{labels[result.variant] || result.variant}</th>
            <td>{result.visitors}</td><td>{result.signups}</td><td>{result.museums}</td><td>{result.visitor_signups}</td><td>{result.educators}</td><td>{result.other}</td><td>{result.very_interested}</td><td>{result.paid}</td><td>{conversion(result)}</td>
          </tr>)}</tbody>
        </table></div>
      </details>
    </> : <p role="status">Experiment metrics unavailable. Apply the product experiment database migration.</p>}
    <p className="muted">Conversion uses matching consented browsers for the same concept and filters. Signup counts also include people who declined analytics. Audience is known only on signup, so audience counts are not audience-specific conversion rates. Interest is directional evidence, not purchases.</p>
  </section>;
}
